import mongoose from 'mongoose';

const workflowRequestSchema = new mongoose.Schema({
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
  workflowPayload: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
    default: 'PENDING',
  },
  expiresAt: Date,
  requestMessage: String,
  responseAt: Date,
}, { timestamps: true });

// TTL index to automatically delete or trigger expiration cleanly
workflowRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to auto-set expiresAt = Date.now() + 24h for new documents
workflowRequestSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Static methods
workflowRequestSchema.statics.findPendingFor = function (userId) {
  return this.find({
    targetUser: userId,
    status: 'PENDING',
    expiresAt: { $gt: new Date() } // Ensure they are not expired
  }).sort({ createdAt: -1 });
};

workflowRequestSchema.statics.expireStale = async function () {
  const result = await this.updateMany(
    {
      status: 'PENDING',
      expiresAt: { $lte: new Date() },
    },
    {
      $set: { status: 'EXPIRED' },
    }
  );
  return result;
};

const WorkflowRequest = mongoose.model('WorkflowRequest', workflowRequestSchema);
export default WorkflowRequest;
