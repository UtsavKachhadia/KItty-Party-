import mongoose from 'mongoose';

const WorkflowRequestSchema = new mongoose.Schema({
  requestingUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalPrompt: {
    type: String,
    required: true,
  },
  requestMessage: {
    type: String, // LLM-generated human-readable summary
    required: true,
  },
  dag: {
    type: Object,
    default: null, // null until approved and planned
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'],
    default: 'PENDING',
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run',
    default: null, // set when execution begins
  },
  requestedAt: { type: Date, default: Date.now },
  responseAt: { type: Date, default: null },
  executedAt: { type: Date, default: null },
});

// Index for fast lookup of pending requests per user
WorkflowRequestSchema.index({ targetUser: 1, status: 1 });
WorkflowRequestSchema.index({ requestingUser: 1, requestedAt: -1 });

const WorkflowRequest = mongoose.model('WorkflowRequest', WorkflowRequestSchema);
export default WorkflowRequest;
