import mongoose from 'mongoose';

const IntegrationSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: ['github', 'slack', 'jira'],
      required: true,
    },
    encryptedToken: { type: String, required: true },
    encryptedMeta: { type: String, default: null }, // e.g. encrypted { owner, domain }
    connectedAt: { type: Date, default: Date.now },
    maskedToken: { type: String }, // e.g. "****a3f2" for display
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  integrations: { type: [IntegrationSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

/**
 * Returns a safe user object — strips passwordHash, encryptedToken, and __v.
 * Never expose password hashes or raw tokens to the client.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  // Strip encrypted tokens from integrations; keep only safe display data
  if (obj.integrations) {
    obj.services = obj.integrations.map((i) => ({
      service: i.service,
      maskedToken: i.maskedToken,
      connectedAt: i.connectedAt,
    }));
    delete obj.integrations;
  }
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
