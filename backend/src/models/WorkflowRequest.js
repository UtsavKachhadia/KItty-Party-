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
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000)  // 48 hours from creation
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

// Compound index for the cleanup job — fast queries on status + expiresAt
WorkflowRequestSchema.index({ status: 1, expiresAt: 1 });

const WorkflowRequest = mongoose.model('WorkflowRequest', WorkflowRequestSchema);
export default WorkflowRequest;
