import { diagnoseError } from './llm.js';
import { exponentialBackoff } from '../utils/retry.js';

/**
 * Checks if an error is transient (network timeout, 429, 503).
 */
function isTransientError(error) {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused')) {
    return true;
  }
  const status = error.status || error.statusCode || error.response?.status;
  return status === 429 || status === 503 || status === 502;
}

/**
 * Intelligent Failure Recovery engine.
 *
 * Tier 1: Retry once for transient errors
 * Tier 2: Send to LLM for diagnosis
 * Tier 3: Escalate with raw error
 *
 * @param {Error|string} error - The error that occurred
 * @param {Object} step - The DAG step that failed
 * @param {Function} retryFn - Function to retry the step (async)
 * @returns {{ tier, retried, retryResult?, diagnosis?, suggestion?, escalated }}
 */
export async function handleFailure(error, step, retryFn) {
  // ── Tier 1: Transient retry ──
  if (isTransientError(error)) {
    try {
      console.log(`♻️  IFR Tier 1: Transient error detected for ${step.id}, retrying after 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
      const retryResult = await retryFn();
      return { tier: 1, retried: true, retryResult, escalated: false };
    } catch (retryErr) {
      console.warn(`♻️  IFR Tier 1: Retry failed for ${step.id}: ${retryErr.message}`);
      // Fall through to Tier 2
    }
  }

  // ── Tier 2: LLM diagnosis ──
  try {
    console.log(`🔍 IFR Tier 2: Requesting LLM diagnosis for ${step.id}...`);
    const diagnosisResult = await diagnoseError(error, {
      connector: step.connector,
      action: step.action,
      params: step.params,
    });
    return {
      tier: 2,
      retried: false,
      diagnosis: diagnosisResult.rootCause,
      suggestion: diagnosisResult.suggestion,
      escalated: false,
    };
  } catch (diagErr) {
    console.error(`🔍 IFR Tier 2: Diagnosis failed for ${step.id}: ${diagErr.message}`);
  }

  // ── Tier 3: Escalate ──
  console.error(`🚨 IFR Tier 3: Escalating failure for ${step.id}`);
  return {
    tier: 3,
    retried: false,
    diagnosis: null,
    suggestion: null,
    escalated: true,
    rawError: typeof error === 'string' ? error : error.message || String(error),
  };
}
