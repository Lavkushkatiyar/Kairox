const NODE_WIDTH = 278;
const NODE_HEIGHT = 220;
const COLUMN_GAP = NODE_WIDTH + 48;
const ROW_GAP = NODE_HEIGHT + 36;
const GRAPH_MARGIN = 24;
const INDEPENDENT_COLUMNS = 3;

export function getTaskLayout(tasks) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]));
  const levels = new Map();
  const visiting = new Set();

  const getLevel = (task) => {
    if (levels.has(task.id)) return levels.get(task.id);
    if (visiting.has(task.id)) return 0;

    visiting.add(task.id);
    const parents = (task.depends_on_ids || [])
      .map((id) => taskById.get(id))
      .filter(Boolean);
    const level = parents.length
      ? Math.max(...parents.map((parent) => getLevel(parent) + 1))
      : 0;
    visiting.delete(task.id);
    levels.set(task.id, level);
    return level;
  };

  tasks.forEach(getLevel);

  const columns = new Map();
  tasks.forEach((task) => {
    const level = levels.get(task.id);
    columns.set(level, [...(columns.get(level) || []), task]);
  });

  if (!tasks.some((task) => (task.depends_on_ids || []).some((id) => taskById.has(id)))) {
    const columnCount = Math.min(INDEPENDENT_COLUMNS, tasks.length);
    columns.clear();
    tasks.forEach((task, index) => {
      const column = index % columnCount;
      columns.set(column, [...(columns.get(column) || []), task]);
    });
  } else {
    const maxLevel = Math.max(0, ...columns.keys());
    const rowById = new Map();

    const sortColumns = (columnLevel, neighbors, reverse = false) => {
      const column = columns.get(columnLevel);
      if (!column || column.length < 2) {
        column?.forEach((task, index) => rowById.set(task.id, index));
        return;
      }

      const reordered = [...column].sort((first, second) => {
        const getNeighborPosition = (task) => {
          const adjacentTasks = neighbors(task)
            .map((id) => rowById.get(id))
            .filter(Number.isFinite);
          if (!adjacentTasks.length) return taskIndex.get(task.id);
          return adjacentTasks.reduce((sum, row) => sum + row, 0) / adjacentTasks.length;
        };
        const firstPosition = getNeighborPosition(first);
        const secondPosition = getNeighborPosition(second);
        const difference = firstPosition - secondPosition;
        return (reverse ? -difference : difference)
          || taskIndex.get(first.id) - taskIndex.get(second.id);
      });

      columns.set(columnLevel, reordered);
      reordered.forEach((task, index) => rowById.set(task.id, index));
    };

    for (let pass = 0; pass < 4; pass += 1) {
      for (let level = 0; level <= maxLevel; level += 1) {
        sortColumns(
          level,
          (task) => (task.depends_on_ids || []).filter((id) => taskById.has(id))
        );
      }

      for (let level = maxLevel - 1; level >= 0; level -= 1) {
        sortColumns(
          level,
          (task) => tasks
            .filter((candidate) => (candidate.depends_on_ids || []).includes(task.id))
            .map((candidate) => candidate.id),
          true
        );
      }
    }
  }

  const maxColumn = Math.max(0, ...columns.keys());
  const maxRows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const contentWidth = NODE_WIDTH + maxColumn * COLUMN_GAP;
  const width = contentWidth + GRAPH_MARGIN * 2;
  const height = NODE_HEIGHT + (maxRows - 1) * ROW_GAP + GRAPH_MARGIN * 2;
  const positions = new Map();

  columns.forEach((columnTasks, level) => {
    const firstRow = (maxRows - columnTasks.length) / 2;
    columnTasks.forEach((task, index) => {
      positions.set(task.id, {
        x: GRAPH_MARGIN + NODE_WIDTH / 2 + level * COLUMN_GAP,
        y: GRAPH_MARGIN + NODE_HEIGHT / 2 + (firstRow + index) * ROW_GAP,
      });
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
          source,
          target,
          targetTaskId: task.id,
        });
      }
    });
  });

  return { width, height, positions, edges, taskById };
}

export const taskGraphDimensions = {
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
};
