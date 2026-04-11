import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  githubToken: { type: String, default: null }, // Stored encrypted
  slackToken: { type: String, default: null }, // Stored encrypted
  jiraToken: { type: String, default: null }, // Stored encrypted
  jiraDomain: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware to set updatedAt
tokenSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Token = mongoose.model('Token', tokenSchema);
export default Token;
