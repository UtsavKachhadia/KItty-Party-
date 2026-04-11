import mongoose from 'mongoose';

const runStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    connector: { type: String, required: true },
    action: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    dependsOn: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    requiresApproval: { type: Boolean, default: false },
    autoExecute: { type: Boolean, default: true },
    description: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { _id: false }
);

const runSchema = new mongoose.Schema({
  initiatorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  executionType: {
    type: String,
    enum: ['SELF', 'THIRD_PARTY'],
    default: 'SELF',
  },
  requestRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowRequest',
    default: null,
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    default: null,
  },
  dag: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'awaiting_approval'],
    default: 'pending',
  },
  steps: { type: [runStepSchema], default: [] },
  userInput: { type: String, default: '' },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
});

runSchema.pre('validate', function(next) {
  if (this.executionType === 'THIRD_PARTY' && !this.targetUser) {
    next(new Error('Target user required'));
  } else {
    next();
  }
});

const Run = mongoose.model('Run', runSchema);
export default Run;
