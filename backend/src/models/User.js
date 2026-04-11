import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },       // bcrypt hashed
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  connectors: {
    github: {
      token:       { type: String, default: '' },
      isConnected: { type: Boolean, default: false },
    },
    slack: {
      token:       { type: String, default: '' },
      isConnected: { type: Boolean, default: false },
    },
    jira: {
      apiKey:      { type: String, default: '' },
      domain:      { type: String, default: '' },
      isConnected: { type: Boolean, default: false },
    },
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
