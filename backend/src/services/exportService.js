import { stringify } from 'csv-stringify/sync';
import Run from '../models/Run.js';

export async function exportToCSV(executionId) {
  const execution = await Run.findById(executionId);
  if (!execution) throw new Error('Execution not found');

  const steps = execution.steps || execution.dag?.steps || [];
  
  const records = steps.map(step => ({
    stepName: step.id || step.action,
    status: step.status,
    startedAt: step.startedAt ? new Date(step.startedAt).toISOString() : '',
    completedAt: step.endedAt ? new Date(step.endedAt).toISOString() : '',
    output: typeof step.result === 'object' ? JSON.stringify(step.result) : step.result || '',
    error: step.error || ''
  }));

  return stringify(records, {
    header: true,
    columns: ['stepName', 'status', 'startedAt', 'completedAt', 'output', 'error']
  });
}

export async function exportToMarkdown(executionId) {
  const execution = await Run.findById(executionId).populate('initiatorUser').populate('targetUser');
  if (!execution) throw new Error('Execution not found');

  const initiator = execution.initiatorUser?.email || execution.initiatorUser?.username || execution.initiatorUser || 'Unknown';
  const target = execution.targetUser?.email || execution.targetUser?.username || execution.targetUser || 'Unknown';
  const date = execution.createdAt ? new Date(execution.createdAt).toISOString() : 'Unknown';

  let md = `# Workflow Execution Report\n\n`;
  md += `- **Execution ID**: ${execution._id}\n`;
  md += `- **Initiator**: ${initiator}\n`;
  md += `- **Target User**: ${target}\n`;
  md += `- **Date**: ${date}\n\n`;
  md += `## Steps\n\n`;

  const steps = execution.steps || execution.dag?.steps || [];
  let successCount = 0;
  let failCount = 0;

  steps.forEach((step, i) => {
    md += `### Step ${i + 1} — ${step.id || step.action}\n`;
    md += `Status: ${step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : step.status}\n`;
    const output = typeof step.result === 'object' ? JSON.stringify(step.result, null, 2) : step.result || 'None';
    md += `Output:\n\`\`\`json\n${output}\n\`\`\`\n`;
    if (step.error) {
      md += `Error:\n\`\`\`\n${step.error}\n\`\`\`\n`;
    }
    md += `\n`;

    if (step.status === 'completed') successCount++;
    else if (step.status === 'failed') failCount++;
  });

  md += `## Summary\n\n`;
  md += `| Total Steps | Successful | Failed |\n`;
  md += `|-------------|------------|--------|\n`;
  md += `| ${steps.length} | ${successCount} | ${failCount} |\n`;

  return md;
}

export async function exportHistory(userId, format, limit = 10) {
  const executions = await Run.find({
    $or: [{ initiatorUser: userId }, { targetUser: userId }]
  }).sort({ createdAt: -1 }).limit(limit).populate('initiatorUser targetUser');

  if (format === 'csv') {
    let allRecords = [];
    executions.forEach(execution => {
      const steps = execution.steps || execution.dag?.steps || [];
      steps.forEach(step => {
        allRecords.push({
          executionId: execution._id.toString(),
          stepName: step.id || step.action,
          status: step.status,
          startedAt: step.startedAt ? new Date(step.startedAt).toISOString() : '',
          completedAt: step.endedAt ? new Date(step.endedAt).toISOString() : '',
          output: typeof step.result === 'object' ? JSON.stringify(step.result) : step.result || '',
          error: step.error || ''
        });
      });
    });

    return stringify(allRecords, {
      header: true,
      columns: ['executionId', 'stepName', 'status', 'startedAt', 'completedAt', 'output', 'error']
    });
  } else if (format === 'md') {
    let md = `# Execution History\n\n`;
    executions.forEach(exe => {
      md += `## Execution: ${exe._id} (${exe.status})\n`;
      md += `- Date: ${new Date(exe.createdAt).toISOString()}\n`;
      const steps = exe.steps || exe.dag?.steps || [];
      md += `- Steps: ${steps.length}\n\n`;
    });
    return md;
  }

  throw new Error('Unsupported format');
}
