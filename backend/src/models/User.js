import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

/**
 * Returns a safe user object — strips passwordHash and __v.
 * Never expose password hashes to the client.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;

