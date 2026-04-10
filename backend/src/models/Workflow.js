import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    connector: {
      type: String,
      required: true,
      enum: ['github', 'slack', 'jira'],
    },
    action: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    dependsOn: { type: [String], default: [] },
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  steps: { type: [stepSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const Workflow = mongoose.model('Workflow', workflowSchema);
export default Workflow;
