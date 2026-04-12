import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  service: String,
  action: String,
  timestamp: { type: Date, default: Date.now },
});
export default mongoose.model("CredentialAuditLog", schema);
