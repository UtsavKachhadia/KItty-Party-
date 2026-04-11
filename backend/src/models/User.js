import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    validate: /.+\@.+\..+/,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  integrations: {
    github: {
      accessToken: String,
      encryptedToken: String,
      connectedAt: Date,
    },
    slack: {
      accessToken: String,
      encryptedToken: String,
      botToken: String,
      connectedAt: Date,
    },
    jira: {
      domain: String,
      email: String,
      apiToken: String, // encrypted
      connectedAt: Date,
    },
  },
  preferences: {
    defaultExecutionType: {
      type: String,
      enum: ['SELF', 'THIRD_PARTY'],
      default: 'SELF',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

/**
 * Returns a safe user object — strips passwordHash and __v.
 * Never expose password hashes to the client.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  
  // Safely strip secret tokens if they exist in integrations
  if (obj.integrations) {
    if (obj.integrations.github) {
      delete obj.integrations.github.accessToken;
      delete obj.integrations.github.encryptedToken;
    }
    if (obj.integrations.slack) {
      delete obj.integrations.slack.accessToken;
      delete obj.integrations.slack.encryptedToken;
      delete obj.integrations.slack.botToken;
    }
    if (obj.integrations.jira) {
      delete obj.integrations.jira.apiToken;
    }
  }

  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;

