'use strict';

import mongoose from 'mongoose';

const CredentialAuditLogSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true
  },
  service: {
    type:     String,
    enum:     ['github', 'slack', 'jira'],
    required: true
  },
  action: {
    type:     String,
    enum:     ['read', 'write', 'delete'],
    required: true
  },
  ip: {
    type:    String,
    default: 'unknown'
  },
  userAgent: {
    type:    String,
    default: 'unknown'
  },
  timestamp: {
    type:    Date,
    default: Date.now,
    index:   true
  },
  metadata: {
    // Optional extra context — e.g. { triggeredBy: 'dagRunner', runId: '...' }
    // Never populate with token values
    type:    Object,
    default: null
  }
}, {
  // Prevent accidental updates to audit records
  // (enforced at application layer — MongoDB has no built-in append-only)
  strict: true
});

// Compound index for admin queries: "all write actions in the last 24h"
CredentialAuditLogSchema.index({ action: 1, timestamp: -1 });

// Compound index for per-user audit trail: "all of user X's credential actions"
CredentialAuditLogSchema.index({ userId: 1, timestamp: -1 });

// TTL index — auto-delete audit logs older than 90 days to control Atlas storage
// Remove this if compliance requires longer retention
CredentialAuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const CredentialAuditLog = mongoose.model('CredentialAuditLog', CredentialAuditLogSchema);
export default CredentialAuditLog;
