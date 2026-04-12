'use strict';

import mongoose from 'mongoose';

const WorkflowRequestSchema = new mongoose.Schema({
  requestingUser: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true
  },
  targetUser: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true
  },
  workflowPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type:    String,
    enum:    ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED'],
    default: 'PENDING'
  },
  requestMessage: {
    type:    String,
    default: ''
  },
  responseMessage: {
    type:    String,
    default: ''
  },
  requestedAt: {
    type:    Date,
    default: Date.now
  },
  responseAt: {
    type:    Date,
    default: null
  },
  expiresAt: {
    type:    Date,
    // Default to 48 hours for flexibility, but can be overridden
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000)
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Workflow',
    default: null
  },
  metadata: {
    type:    Object,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for manual cleanup queries
WorkflowRequestSchema.index({ status: 1, expiresAt: 1 });

// TTL index to automatically delete or trigger cleanup — expireAfterSeconds 0 
// means Mongo will delete the doc when current time > expiresAt.
// Note: This makes "EXPIRED" status records volatile. 
// If persistent history is needed, remove this and use the cron job only.
WorkflowRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook: Auto-set responseAt when status changes
WorkflowRequestSchema.pre('save', function (next) {
  if (this.isModified('status') && ['APPROVED', 'REJECTED', 'EXPIRED'].includes(this.status)) {
    this.responseAt = new Date();
  }
  next();
});

// Static methods for cleaner controller logic
WorkflowRequestSchema.statics.findPendingFor = function (userId) {
  return this.find({
    targetUser: userId,
    status: 'PENDING',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

WorkflowRequestSchema.statics.expireStale = async function () {
  return this.updateMany(
    {
      status: 'PENDING',
      expiresAt: { $lte: new Date() },
    },
    {
      $set: { status: 'EXPIRED', responseAt: new Date() },
    }
  );
};

const WorkflowRequest = mongoose.model('WorkflowRequest', WorkflowRequestSchema);
export default WorkflowRequest;
