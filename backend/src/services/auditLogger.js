'use strict';

import CredentialAuditLog from '../models/CredentialAuditLog.js';

/**
 * Sensitive key names that must NEVER appear in audit metadata.
 * If any of these keys are found, they are stripped before persisting.
 */
const BLOCKED_META_KEYS = ['token', 'password', 'secret', 'encryptedToken', 'apiKey', 'credentials'];

/**
 * Log a credential access event to the CredentialAuditLog collection.
 *
 * @param {Object} params
 * @param {string} params.userId    - ID of the user performing the action
 * @param {string} params.service   - 'github' | 'slack' | 'jira'
 * @param {string} params.action    - 'read' | 'write' | 'delete'
 * @param {string} params.ip        - Request IP address (use req.ip or req.headers['x-forwarded-for'])
 * @param {string} [params.userAgent] - User-Agent header value
 * @param {Object} [params.metadata]  - Non-sensitive extra context
 *
 * NEVER pass token values in any field, including metadata.
 * This function is fire-and-forget — it does not throw; errors are logged internally.
 */
export async function logCredentialAccess({ userId, service, action, ip, userAgent, metadata }) {
  // Defensive strip — if somehow a token-shaped value arrives, remove it
  let safeMetadata = null;
  if (metadata && typeof metadata === 'object') {
    safeMetadata = { ...metadata };
    for (const key of BLOCKED_META_KEYS) {
      if (key in safeMetadata) {
        console.warn(`[auditLogger] Blocked sensitive key '${key}' from audit metadata`);
        delete safeMetadata[key];
      }
    }
  }

  try {
    await CredentialAuditLog.create({
      userId,
      service,
      action,
      ip:        ip        || 'unknown',
      userAgent: userAgent || 'unknown',
      timestamp: new Date(),
      metadata:  safeMetadata
    });
  } catch (err) {
    // Audit failure must never interrupt the primary operation
    // Log the error internally — do not surface to the caller
    console.error('[auditLogger] Failed to write audit log entry:', err.message, {
      userId, service, action  // safe to log — no token values
    });
  }
}

/**
 * Extract the real client IP from the request, handling proxy headers.
 * Railway and most cloud providers set X-Forwarded-For.
 */
export function extractIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
