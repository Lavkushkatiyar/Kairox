const NODE_WIDTH = 278;
const NODE_HEIGHT = 220;
const HORIZONTAL_GAP = NODE_WIDTH + 48;
const ROW_OFFSET = NODE_HEIGHT + 20;
const GRAPH_MARGIN = 24;

export function getTaskLayout(tasks, visibleCount = tasks.length) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]));
  const indegree = new Map(tasks.map((task) => [task.id, 0]));
  const dependents = new Map(tasks.map((task) => [task.id, []]));

  tasks.forEach((task) => {
    (task.depends_on_ids || []).forEach((dependencyId) => {
      if (!taskById.has(dependencyId)) return;
      indegree.set(task.id, indegree.get(task.id) + 1);
      dependents.get(dependencyId).push(task.id);
    });
  });

  const available = tasks
    .filter((task) => indegree.get(task.id) === 0)
    .map((task) => task.id);
  const orderedIds = [];

  while (available.length) {
    available.sort((firstId, secondId) => taskIndex.get(firstId) - taskIndex.get(secondId));
    const taskId = available.shift();
    orderedIds.push(taskId);

    dependents.get(taskId).forEach((dependentId) => {
      indegree.set(dependentId, indegree.get(dependentId) - 1);
      if (indegree.get(dependentId) === 0) available.push(dependentId);
    });
  }

  if (orderedIds.length < tasks.length) {
    tasks.forEach((task) => {
      if (!orderedIds.includes(task.id)) orderedIds.push(task.id);
    });
  }

  const positions = new Map();
  orderedIds.forEach((taskId, index) => {
    const row = index % 2;
    positions.set(taskId, {
      x: GRAPH_MARGIN + NODE_WIDTH / 2 + index * HORIZONTAL_GAP,
      y: GRAPH_MARGIN + NODE_HEIGHT / 2 + row * ROW_OFFSET,
    });
  });

  const edges = [];
  tasks.forEach((task) => {
    (task.depends_on_ids || []).forEach((dependencyId) => {
      const source = positions.get(dependencyId);
      const target = positions.get(task.id);
      if (source && target) {
        edges.push({
          id: `${dependencyId}-${task.id}`,
          dependencyId,
          dependentId: task.id,
          source,
          target,
          targetTaskId: task.id,
        });
      }
    });
  });

  const nodeCount = Math.min(visibleCount, orderedIds.length);
  const width = GRAPH_MARGIN * 2
    + NODE_WIDTH
    + Math.max(0, nodeCount - 1) * HORIZONTAL_GAP;
  const height = GRAPH_MARGIN * 2
    + NODE_HEIGHT
    + (nodeCount > 1 ? ROW_OFFSET : 0);

  return { width, height, positions, edges, taskById, orderedIds };
}

export const taskGraphDimensions = {
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
};
