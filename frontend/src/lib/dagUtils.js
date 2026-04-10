/**
 * Converts backend DAG steps into ReactFlow nodes and edges.
 * Uses a simple layered layout based on dependency depth.
 */

const STATUS_BORDER_COLORS = {
  pending: '#414755',
  running: '#007AFF',
  completed: '#28A745',
  failed: '#DC3545',
  skipped: '#6C757D',
  awaiting_approval: '#FFBF00',
};

/**
 * Compute the dependency depth of each step.
 */
function computeDepths(steps) {
  const stepMap = {};
  for (const step of steps) {
    stepMap[step.id] = step;
  }

  const depthMap = {};

  function getDepth(stepId) {
    if (depthMap[stepId] !== undefined) return depthMap[stepId];
    const step = stepMap[stepId];
    if (!step || !step.dependsOn || step.dependsOn.length === 0) {
      depthMap[stepId] = 0;
      return 0;
    }
    const maxParent = Math.max(...step.dependsOn.map((d) => getDepth(d)));
    depthMap[stepId] = maxParent + 1;
    return depthMap[stepId];
  }

  steps.forEach((s) => getDepth(s.id));
  return depthMap;
}

/**
 * Transform backend steps into { nodes, edges } for ReactFlow.
 */
export function stepsToReactFlow(steps) {
  if (!steps || steps.length === 0) return { nodes: [], edges: [] };

  const depthMap = computeDepths(steps);
  const nodes = [];
  const edges = [];

  // Group steps by depth for vertical spreading
  const depthGroups = {};
  steps.forEach((s) => {
    const d = depthMap[s.id];
    if (!depthGroups[d]) depthGroups[d] = [];
    depthGroups[d].push(s);
  });

  for (const step of steps) {
    const depth = depthMap[step.id];
    const siblings = depthGroups[depth];
    const idx = siblings.indexOf(step);
    const yOffset = (idx - (siblings.length - 1) / 2) * 140;

    nodes.push({
      id: step.id,
      type: 'dagNode',
      position: { x: depth * 320 + 80, y: 250 + yOffset },
      data: {
        label:
          step.description || `${step.connector}.${step.action}`,
        connector: step.connector,
        action: step.action,
        confidence: step.confidence ?? 1,
        status: step.status || 'pending',
        description: step.description || '',
        requiresApproval: step.requiresApproval || false,
      },
    });

    for (const dep of step.dependsOn || []) {
      edges.push({
        id: `${dep}->${step.id}`,
        source: dep,
        target: step.id,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: STATUS_BORDER_COLORS.pending,
          strokeWidth: 1,
        },
      });
    }
  }

  return { nodes, edges };
}

/**
 * Get the border color for a given status.
 */
export function getStatusColor(status) {
  return STATUS_BORDER_COLORS[status] || STATUS_BORDER_COLORS.pending;
}

export { STATUS_BORDER_COLORS };
