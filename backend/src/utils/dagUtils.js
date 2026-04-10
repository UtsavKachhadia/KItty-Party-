/**
 * Kahn's algorithm — returns an ordered array of step IDs respecting dependsOn.
 * Throws if the graph contains a cycle.
 */
export function topologicalSort(steps) {
  const inDegree = {};
  const adjacency = {};
  const stepMap = {};

  for (const step of steps) {
    inDegree[step.id] = 0;
    adjacency[step.id] = [];
    stepMap[step.id] = step;
  }

  for (const step of steps) {
    for (const dep of step.dependsOn || []) {
      if (!adjacency[dep]) {
        throw new Error(`Step "${step.id}" depends on unknown step "${dep}"`);
      }
      adjacency[dep].push(step.id);
      inDegree[step.id]++;
    }
  }

  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  const sorted = [];

  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    for (const neighbor of adjacency[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== steps.length) {
    throw new Error('DAG contains a cycle — topological sort impossible');
  }

  return sorted;
}

/**
 * Validates DAG structure: checks for cycles and missing dependency references.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateDAG(steps) {
  const errors = [];
  const ids = new Set(steps.map((s) => s.id));

  for (const step of steps) {
    if (!step.id) errors.push('A step is missing an "id" field');
    if (!step.connector) errors.push(`Step "${step.id}" is missing "connector"`);
    if (!step.action) errors.push(`Step "${step.id}" is missing "action"`);
    for (const dep of step.dependsOn || []) {
      if (!ids.has(dep)) {
        errors.push(`Step "${step.id}" depends on unknown step "${dep}"`);
      }
    }
  }

  // Cycle detection via topological sort
  if (errors.length === 0) {
    try {
      topologicalSort(steps);
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates raw JSON from LLM and returns a clean dag object with defaults.
 */
export function buildDAGFromJSON(json) {
  if (!json || !Array.isArray(json.steps)) {
    throw new Error('Invalid DAG JSON: missing "steps" array');
  }

  const steps = json.steps.map((s, i) => ({
    id: s.id || `step_${i + 1}`,
    connector: s.connector || 'unknown',
    action: s.action || 'unknown',
    params: s.params || {},
    dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn : [],
    confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
    description: s.description || '',
  }));

  const validation = validateDAG(steps);
  if (!validation.valid) {
    throw new Error(`DAG validation failed:\n  ${validation.errors.join('\n  ')}`);
  }

  return {
    workflowName: json.workflowName || 'Untitled Workflow',
    steps,
  };
}
