import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run',
    required: true,
    index: true,
  },
  stepId: { type: String, required: true },
  connector: { type: String, required: true },
  action: { type: String, required: true },
  request: { type: mongoose.Schema.Types.Mixed, default: {} },
  response: { type: mongoose.Schema.Types.Mixed, default: {} },
  success: { type: Boolean, required: true },
  errorMessage: { type: String, default: null },
  durationMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
