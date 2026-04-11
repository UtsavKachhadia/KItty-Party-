import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  integrations: [{
    service:     { type: String, enum: ['github', 'slack', 'jira'] },
    maskedToken: { type: String },
    connectedAt: { type: Date, default: Date.now }
  }],
  createdAt:   { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

/**
 * Returns a safe user object — strips passwordHash and __v.
 * Never expose password hashes or raw encrypted tokens to the client.
 */
userSchema.methods.toSafeObject = function () {
  return {
    id:       this._id,
    username: this.username,
    email:    this.email,
    role:     this.role,
    services: (this.integrations || []).map(i => ({
      service:     i.service,
      maskedToken: i.maskedToken,
      connectedAt: i.connectedAt
    }))
  };
};

const User = mongoose.model('User', userSchema);
export default User;

