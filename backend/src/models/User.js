import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, default: '' },
  credentials: {
    github: {
      accessToken: { type: String, default: null },
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
    },
    slack: {
      botToken: { type: String, default: null },
      workspaceId: { type: String, default: null },
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
    },
    jira: {
      baseUrl: { type: String, default: null },
      email: { type: String, default: null },
      apiToken: { type: String, default: null },
      connected: { type: Boolean, default: false },
      connectedAt: { type: Date, default: null },
    },
  },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

/**
 * Returns a safe representation of the user object — no passwordHash,
 * no raw credential tokens. Only connection status is revealed.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;

  // Strip encrypted tokens — only expose connection status
  if (obj.credentials) {
    if (obj.credentials.github) {
      delete obj.credentials.github.accessToken;
    }
    if (obj.credentials.slack) {
      delete obj.credentials.slack.botToken;
    }
    if (obj.credentials.jira) {
      delete obj.credentials.jira.apiToken;
    }
  }

  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
