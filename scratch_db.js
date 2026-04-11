import mongoose from 'mongoose';
import WorkflowRequest from './backend/src/models/WorkflowRequest.js';
import Run from './backend/src/models/Run.js';
import env from './backend/config/env.js';

async function diagnose() {
  await mongoose.connect(env.MONGO_URI || env.MONGODB_URI);
  console.log('Connected.');
  const id1 = '69dac3c7b383782b0b1db1eb';
  const id2 = '69dac1f0b2a0e6f2dd756522';
  
  const docs = await WorkflowRequest.find({ _id: { $in: [id1, id2] } });
  console.log(JSON.stringify(docs, null, 2));

  for (const doc of docs) {
    if (doc.workflowPayload && doc.workflowPayload.runId) {
      const runDoc = await Run.findById(doc.workflowPayload.runId);
      console.log('Associated Run:', JSON.stringify(runDoc, null, 2));
    }
  }

  process.exit(0);
}
diagnose();
