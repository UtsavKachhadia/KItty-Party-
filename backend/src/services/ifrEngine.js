import env from '../../config/env.js';
import AuditLog from '../models/AuditLog.js';
import connectors from '../connectors/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TRANSIENT_PATTERNS = [
  'econnreset',
  'etimedout',
  'enotfound',
  'socket hang up',
  'rate limit',
  'too many requests',
  'timeout',
  'network',
  'econnrefused',
  'fetch failed',
];

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const MAX_RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────────────────────────────────────
// Exported Helper: isTransientError
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines whether an error is transient (network hiccup, rate-limit, etc.)
 * and therefore worth retrying automatically.
 *
 * @param {Error|string|Object} error - The error to classify
 * @returns {boolean} true if the error is transient
 */
export function isTransientError(error) {
  if (!error) return false;

  const msg = (
    typeof error === 'string' ? error : error.message || ''
  ).toLowerCase();

  for (const pattern of TRANSIENT_PATTERNS) {
    if (msg.includes(pattern)) return true;
  }

  const status =
    error.status ||
    error.statusCode ||
    error.response?.status ||
    error.response?.statusCode;

  if (status && TRANSIENT_STATUS_CODES.has(Number(status))) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Helper: classifyError
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies an error into a semantic category used for routing IFR tiers
 * and for the UI to display contextual messaging.
 *
 * @param {Error|string|Object} error - The error to classify
 * @returns {"transient"|"auth"|"permissions"|"not_found"|"invalid_params"|"quota"|"unknown"}
 */
export function classifyError(error) {
  if (isTransientError(error)) return 'transient';

  const msg = (
    typeof error === 'string' ? error : error.message || ''
  ).toLowerCase();
  const status =
    error.status ||
    error.statusCode ||
    error.response?.status ||
    error.response?.statusCode;

  // Auth errors
  if (
    status === 401 ||
    msg.includes('bad credentials') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid_auth') ||
    msg.includes('not_authed') ||
    msg.includes('token')
  ) {
    return 'auth';
  }

  // Permission errors
  if (
    status === 403 ||
    msg.includes('forbidden') ||
    msg.includes('missing_scope') ||
    msg.includes('not_in_channel') ||
    msg.includes('permission')
  ) {
    return 'permissions';
  }

  // Not found
  if (
    status === 404 ||
    msg.includes('not found') ||
    msg.includes('channel_not_found') ||
    msg.includes('does not exist')
  ) {
    return 'not_found';
  }

  // Invalid parameters
  if (
    status === 400 ||
    status === 422 ||
    msg.includes('invalid') ||
    msg.includes('unprocessable') ||
    msg.includes('validation') ||
    msg.includes('required')
  ) {
    return 'invalid_params';
  }

  // Quota / billing
  if (
    msg.includes('quota') ||
    msg.includes('billing') ||
    msg.includes('limit exceeded') ||
    msg.includes('plan')
  ) {
    return 'quota';
  }

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Helper: buildDiagnosisPrompt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constructs the system and user prompts sent to Groq for LLM-powered
 * failure diagnosis in Tier 2.
 *
 * @param {Error|string|Object} error - The error that occurred
 * @param {Object} step  - The DAG step that failed
 * @param {Object} run   - The Run document (contains userInput)
 * @returns {{ system: string, user: string }}
 */
export function buildDiagnosisPrompt(error, step, run) {
  const errorMsg = typeof error === 'string' ? error : error.message || String(error);
  const httpStatus =
    error.status ||
    error.statusCode ||
    error.response?.status ||
    'unknown';

  const system = `You are an expert DevOps engineer diagnosing API integration failures.
You will receive a failed workflow step and must respond ONLY with valid JSON.
No markdown, no explanation outside the JSON.`;

  const user = `A workflow step failed. Analyze the error and provide recovery guidance.

Step details:
- Connector: ${step.connector}
- Action: ${step.action}
- Params used: ${JSON.stringify(step.params, null, 2)}
- Error received: ${errorMsg}
- HTTP Status: ${httpStatus}
- User's original intent: ${run.userInput || 'N/A'}

Respond with ONLY this JSON:
{
  "rootCause": "One sentence explaining exactly why this failed",
  "suggestion": "One sentence telling the user exactly how to fix it",
  "isFixable": true | false,
  "fixedParams": { ...corrected params object if params were wrong, else null },
  "errorCategory": "auth" | "permissions" | "not_found" | "invalid_params" | "quota" | "unknown",
  "severity": "low" | "medium" | "high"
}`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Helper: formatEscalationMessage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a human-readable escalation message for the frontend UI
 * from the Tier 2 diagnosis result.
 *
 * @param {Object|null} tier2Result - Result object from tier2Diagnose
 * @returns {string} Human-readable one-line message
 */
export function formatEscalationMessage(tier2Result) {
  if (!tier2Result || (!tier2Result.diagnosis && !tier2Result.suggestion)) {
    return 'Step failed: Automatic diagnosis was unavailable. Please check your API credentials and connector configuration manually.';
  }

  const parts = [];
  if (tier2Result.diagnosis) {
    parts.push(`Step failed: ${tier2Result.diagnosis}`);
  }
  if (tier2Result.suggestion) {
    parts.push(`Fix: ${tier2Result.suggestion}`);
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: writeAuditLog  (never throws — failures are swallowed)
// ─────────────────────────────────────────────────────────────────────────────

async function writeAuditLog(payload) {
  try {
    await AuditLog.create(payload);
  } catch (auditErr) {
    console.error('⚠️  IFR AuditLog write failed (non-blocking):', auditErr.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: callGroq
// ─────────────────────────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userPrompt) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty content');

  // Strip markdown fences if present
  content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  return JSON.parse(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Transient Error Auto-Retry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts exponential-backoff retries for transient errors.
 * Emits socket events for each retry attempt.
 *
 * @param {Error|string|Object} error     - The original error
 * @param {Object}              step      - The failed DAG step
 * @param {Object}              run       - The Run document
 * @param {Object}              io        - Socket.io server instance
 * @returns {Promise<Object>} Tier 1 result object
 */
async function tier1Retry(error, step, run, io) {
  const runId = run._id.toString();
  const startTime = Date.now();
  const connector = connectors[step.connector];

  if (!connector) {
    return { tier: 1, resolved: false, retried: false, diagnosis: null, suggestion: null };
  }

  let lastError = error;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
    console.log(
      `♻️  IFR Tier 1: Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} ` +
        `for ${step.id} in ${delay}ms...`
    );

    // Emit retrying event
    if (io) {
      io.emit('ifr:event', {
        runId,
        stepId: step.id,
        tier: 1,
        attempt,
        status: 'retrying',
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise((r) => setTimeout(r, delay));

    try {
      const result = await connector.execute(step.action, step.params);

      if (result.success) {
        console.log(`✅ IFR Tier 1: Retry ${attempt} succeeded for ${step.id}`);

        if (io) {
          io.emit('ifr:event', {
            runId,
            stepId: step.id,
            tier: 1,
            attempt,
            status: 'retry_success',
            timestamp: new Date().toISOString(),
          });
        }

        await writeAuditLog({
          runId: run._id,
          stepId: step.id,
          connector: step.connector,
          action: 'ifr_tier1_retry_success',
          request: { params: step.params, error: typeof error === 'string' ? error : error.message },
          response: { result: { tier: 1, resolved: true, attempt } },
          success: true,
          errorMessage: null,
          durationMs: Date.now() - startTime,
          timestamp: new Date(),
        });

        return {
          tier: 1,
          resolved: true,
          retried: true,
          retryResult: result,
          diagnosis: null,
          suggestion: null,
          fixedParams: null,
          escalated: false,
          finalError: null,
        };
      }

      // Connector returned { success: false }
      lastError = result.error || result;
    } catch (retryErr) {
      lastError = retryErr;
    }

    // Emit retry_failed for this attempt
    if (io) {
      io.emit('ifr:event', {
        runId,
        stepId: step.id,
        tier: 1,
        attempt,
        status: 'retry_failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.warn(`♻️  IFR Tier 1: All ${MAX_RETRY_ATTEMPTS} retries exhausted for ${step.id}`);

  await writeAuditLog({
    runId: run._id,
    stepId: step.id,
    connector: step.connector,
    action: 'ifr_tier1_retry_failed',
    request: { params: step.params, error: typeof error === 'string' ? error : error.message },
    response: { result: { tier: 1, resolved: false, attempts: MAX_RETRY_ATTEMPTS } },
    success: false,
    errorMessage: typeof lastError === 'string' ? lastError : lastError?.message || String(lastError),
    durationMs: Date.now() - startTime,
    timestamp: new Date(),
  });

  return {
    tier: 1,
    resolved: false,
    retried: true,
    diagnosis: null,
    suggestion: null,
    fixedParams: null,
    escalated: false,
    finalError: typeof lastError === 'string' ? lastError : lastError?.message || String(lastError),
    lastError,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: LLM-Powered Diagnosis + Auto-Fix Attempt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends the failure context to Groq for LLM-powered root cause analysis.
 * If the LLM says the error is fixable and provides corrected params,
 * attempts ONE re-execution with those params.
 *
 * @param {Error|string|Object} error    - The error (possibly updated from Tier 1)
 * @param {Object}              step     - The failed DAG step
 * @param {Object}              run      - The Run document
 * @param {Object}              io       - Socket.io server instance
 * @returns {Promise<Object>} Tier 2 result object
 */
async function tier2Diagnose(error, step, run, io) {
  const runId = run._id.toString();
  const startTime = Date.now();

  console.log(`🔍 IFR Tier 2: Requesting LLM diagnosis for ${step.id}...`);

  let groqResult;
  try {
    const { system, user } = buildDiagnosisPrompt(error, step, run);
    groqResult = await callGroq(system, user);
  } catch (groqErr) {
    console.error(`🔍 IFR Tier 2: Groq call failed for ${step.id}:`, groqErr.message);

    await writeAuditLog({
      runId: run._id,
      stepId: step.id,
      connector: step.connector,
      action: 'ifr_tier2_groq_failed',
      request: { params: step.params, error: typeof error === 'string' ? error : error.message },
      response: { groqError: groqErr.message },
      success: false,
      errorMessage: groqErr.message,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    });

    // Return a partial result — Tier 3 will handle the rest
    return {
      tier: 2,
      resolved: false,
      retried: false,
      diagnosis: null,
      suggestion: null,
      fixedParams: null,
      escalated: false,
      errorCategory: classifyError(error),
      severity: 'high',
      fixAttempted: false,
      fixSucceeded: false,
      finalError: typeof error === 'string' ? error : error?.message || String(error),
    };
  }

  // Extract fields from the LLM response
  const {
    rootCause = null,
    suggestion = null,
    isFixable = false,
    fixedParams = null,
    errorCategory = classifyError(error),
    severity = 'medium',
  } = groqResult;

  let fixAttempted = false;
  let fixSucceeded = false;

  // If the LLM says we can fix it and provides new params, try once
  if (isFixable && fixedParams && typeof fixedParams === 'object') {
    fixAttempted = true;
    console.log(`🔧 IFR Tier 2: Attempting auto-fix for ${step.id} with corrected params...`);

    const connector = connectors[step.connector];
    if (connector) {
      try {
        const fixResult = await connector.execute(step.action, fixedParams);
        if (fixResult.success) {
          fixSucceeded = true;
          console.log(`✅ IFR Tier 2: Auto-fix succeeded for ${step.id}`);

          if (io) {
            io.emit('ifr:event', {
              runId,
              stepId: step.id,
              tier: 2,
              diagnosis: rootCause,
              suggestion,
              errorCategory,
              severity,
              fixAttempted: true,
              fixSucceeded: true,
              timestamp: new Date().toISOString(),
            });
          }

          await writeAuditLog({
            runId: run._id,
            stepId: step.id,
            connector: step.connector,
            action: 'ifr_tier2_fix_success',
            request: { originalParams: step.params, fixedParams, error: typeof error === 'string' ? error : error.message },
            response: { result: { tier: 2, resolved: true, rootCause, suggestion } },
            success: true,
            errorMessage: null,
            durationMs: Date.now() - startTime,
            timestamp: new Date(),
          });

          return {
            tier: 2,
            resolved: true,
            retried: true,
            retryResult: fixResult,
            diagnosis: rootCause,
            suggestion,
            fixedParams,
            escalated: false,
            errorCategory,
            severity,
            fixAttempted: true,
            fixSucceeded: true,
            finalError: null,
          };
        }
      } catch (fixErr) {
        console.warn(`🔧 IFR Tier 2: Auto-fix execution failed for ${step.id}:`, fixErr.message);
      }
    }
  }

  // Diagnosis complete but not resolved
  if (io) {
    io.emit('ifr:event', {
      runId,
      stepId: step.id,
      tier: 2,
      diagnosis: rootCause,
      suggestion,
      errorCategory,
      severity,
      fixAttempted,
      fixSucceeded: false,
      timestamp: new Date().toISOString(),
    });
  }

  await writeAuditLog({
    runId: run._id,
    stepId: step.id,
    connector: step.connector,
    action: fixAttempted ? 'ifr_tier2_fix_failed' : 'ifr_tier2_diagnosed',
    request: { params: step.params, error: typeof error === 'string' ? error : error.message },
    response: { rootCause, suggestion, errorCategory, severity, isFixable, fixedParams },
    success: false,
    errorMessage: typeof error === 'string' ? error : error?.message || String(error),
    durationMs: Date.now() - startTime,
    timestamp: new Date(),
  });

  return {
    tier: 2,
    resolved: false,
    retried: fixAttempted,
    diagnosis: rootCause,
    suggestion,
    fixedParams: fixAttempted ? fixedParams : null,
    escalated: false,
    errorCategory,
    severity,
    fixAttempted,
    fixSucceeded: false,
    finalError: typeof error === 'string' ? error : error?.message || String(error),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: Human Escalation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a full escalation report, persists it to MongoDB, and emits a
 * step:failed socket event so the frontend can display the final verdict.
 *
 * @param {Error|string|Object} error       - The original error
 * @param {Object}              step        - The failed DAG step
 * @param {Object}              run         - The Run document
 * @param {Object}              io          - Socket.io server instance
 * @param {Object|null}         tier1Result - Result from Tier 1 (null if skipped)
 * @param {Object|null}         tier2Result - Result from Tier 2 (null if skipped)
 * @returns {Promise<Object>} Tier 3 result object
 */
async function tier3Escalate(error, step, run, io, tier1Result, tier2Result) {
  const runId = run._id.toString();
  const errorMsg = typeof error === 'string' ? error : error?.message || String(error);
  const startTime = Date.now();

  console.error(`🚨 IFR Tier 3: Escalating failure for ${step.id}`);

  // Build the complete escalation report
  const escalationReport = {
    runId: run._id,
    stepId: step.id,
    connector: step.connector,
    action: step.action,
    originalParams: step.params,
    originalError: errorMsg,
    tier1Attempted: !!tier1Result,
    tier1Result: tier1Result || null,
    tier2Attempted: !!tier2Result,
    tier2Diagnosis: tier2Result?.diagnosis || null,
    tier2Suggestion: tier2Result?.suggestion || null,
    tier2ErrorCategory: tier2Result?.errorCategory || null,
    allAttemptsExhausted: true,
    timestamp: new Date().toISOString(),
  };

  // Write escalation to AuditLog with escalated flag
  await writeAuditLog({
    runId: run._id,
    stepId: step.id,
    connector: step.connector,
    action: 'ifr_tier3_escalated',
    request: { params: step.params, error: errorMsg },
    response: { result: escalationReport },
    success: false,
    errorMessage: errorMsg,
    durationMs: Date.now() - startTime,
    timestamp: new Date(),
    escalated: true,
  });

  // Emit step:failed — the frontend listens for this
  if (io) {
    io.emit('step:failed', {
      runId,
      stepId: step.id,
      tier: 3,
      escalated: true,
      diagnosis: tier2Result?.diagnosis || null,
      suggestion: tier2Result?.suggestion || null,
      rawError: errorMsg,
      message: 'All recovery attempts exhausted. Human intervention required.',
      timestamp: new Date().toISOString(),
    });
  }

  return {
    tier: 3,
    resolved: false,
    retried: false,
    diagnosis: tier2Result?.diagnosis || 'Automatic diagnosis unavailable',
    suggestion:
      tier2Result?.suggestion ||
      'Please check your API credentials and connector configuration',
    fixedParams: null,
    escalated: true,
    finalError: errorMsg,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export: handleFailure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the 3-tier Intelligent Failure Recovery pipeline.
 *
 * Tier 1 — Transient auto-retry with exponential backoff (up to 3 attempts).
 * Tier 2 — LLM-powered diagnosis via Groq + optional auto-fix re-execution.
 * Tier 3 — Human escalation with full audit trail.
 *
 * This function NEVER throws. All errors are caught and returned in the
 * result object so the caller (dagRunner) can continue safely.
 *
 * @param {Error|string|Object} error - The error that caused the step to fail
 * @param {Object}              step  - The DAG step object
 * @param {Object}              run   - The Run Mongoose document
 * @param {Object}              io    - Socket.io server instance
 * @returns {Promise<{
 *   tier: 1|2|3,
 *   resolved: boolean,
 *   retried: boolean,
 *   diagnosis: string|null,
 *   suggestion: string|null,
 *   fixedParams: Object|null,
 *   escalated: boolean,
 *   finalError: string|null
 * }>}
 */
export async function handleFailure(error, step, run, io) {
  const errorCategory = classifyError(error);
  let tier1Result = null;
  let tier2Result = null;

  // ── Tier 1: Transient retry ──────────────────────────────────────────────
  if (errorCategory === 'transient') {
    try {
      tier1Result = await tier1Retry(error, step, run, io);
      if (tier1Result.resolved) {
        return tier1Result;
      }
    } catch (t1Err) {
      console.error(`♻️  IFR Tier 1 unexpected error for ${step.id}:`, t1Err.message);
      tier1Result = {
        tier: 1,
        resolved: false,
        retried: false,
        finalError: t1Err.message,
      };
    }
  }

  // ── Tier 2: LLM diagnosis + auto-fix ─────────────────────────────────────
  // Use the latest error (from Tier 1 if it ran, otherwise original)
  const currentError = tier1Result?.lastError || error;

  try {
    tier2Result = await tier2Diagnose(currentError, step, run, io);
    if (tier2Result.resolved) {
      return tier2Result;
    }
  } catch (t2Err) {
    console.error(`🔍 IFR Tier 2 unexpected error for ${step.id}:`, t2Err.message);
    tier2Result = {
      tier: 2,
      resolved: false,
      diagnosis: null,
      suggestion: null,
      finalError: t2Err.message,
    };
  }

  // ── Tier 3: Human escalation ─────────────────────────────────────────────
  try {
    return await tier3Escalate(error, step, run, io, tier1Result, tier2Result);
  } catch (t3Err) {
    // Absolute last resort — should never realistically happen
    console.error(`🚨 IFR Tier 3 unexpected error for ${step.id}:`, t3Err.message);
    return {
      tier: 3,
      resolved: false,
      retried: false,
      diagnosis: tier2Result?.diagnosis || 'Automatic diagnosis unavailable',
      suggestion: 'Please check your API credentials and connector configuration',
      fixedParams: null,
      escalated: true,
      finalError: typeof error === 'string' ? error : error?.message || String(error),
    };
  }
}
