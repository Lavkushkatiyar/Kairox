import { useMemo } from 'react';
import {
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { TaskCard } from './TaskCard';

const NODE_WIDTH = 278;
const NODE_HEIGHT = 220;
const COLUMN_GAP = 340;
const ROW_GAP = 260;
const EDGE_GAP = NODE_WIDTH / 2 + 24;

function getTaskLayout(tasks) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const levels = new Map();

  const getLevel = (task, visited = new Set()) => {
    if (levels.has(task.id)) return levels.get(task.id);
    if (visited.has(task.id)) return 0;

    const nextVisited = new Set(visited).add(task.id);
    const parents = (task.depends_on_ids || [])
      .map((id) => taskById.get(id))
      .filter(Boolean);
    const level = parents.length
      ? Math.max(...parents.map((parent) => getLevel(parent, nextVisited) + 1))
      : 0;
    levels.set(task.id, level);
    return level;
  };

  tasks.forEach((task) => getLevel(task));

  const maxLevel = Math.max(0, ...levels.values());
  const hasDependencies = tasks.some((task) => (task.depends_on_ids || []).length);
  const positionedLevels = new Map(
    tasks.map((task, index) => {
      if (!hasDependencies) {
        const independentLevel = tasks.length === 1
          ? 1
          : tasks.length === 2
            ? index * 2
            : index % 3;
        return [task.id, independentLevel];
      }

      const level = levels.get(task.id);
      const hasDependents = tasks.some((candidate) =>
        (candidate.depends_on_ids || []).includes(task.id)
      );
      const isIndependentLeaf = hasDependencies && level === 0 && !hasDependents;
      return [task.id, isIndependentLeaf ? Math.min(1, maxLevel) : level];
    })
  );

  const columns = new Map();
  tasks.forEach((task) => {
    const level = positionedLevels.get(task.id);
    columns.set(level, [...(columns.get(level) || []), task]);
  });

  const maxColumn = Math.max(0, ...positionedLevels.values());
  const width = Math.max(
    760,
    EDGE_GAP + maxColumn * COLUMN_GAP + NODE_WIDTH / 2 + 24
  );
  const tallestColumn = Math.max(1, ...[...columns.values()].map((items) => items.length));
  const rowCount = Math.max(3, tallestColumn);
  const height = Math.max(600, NODE_HEIGHT + (rowCount - 1) * ROW_GAP + 24);
  const positions = new Map();

  columns.forEach((columnTasks, level) => {
    columnTasks.forEach((task, index) => {
      const previousColumnBranches = (columns.get(level - 1)?.length || 0) > 1;
      const row = columnTasks.length === 1
        ? previousColumnBranches
          ? 1
          : [1, 0, 2, 0, 2, 1][level % 6]
        : (rowCount - columnTasks.length) / 2 + index;

      positions.set(task.id, {
        x: EDGE_GAP + level * COLUMN_GAP,
        y: NODE_HEIGHT / 2 + 12 + row * ROW_GAP,
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

export function TaskGraph({ tasks, allTasks = tasks, thought, onUpdateStatus }) {
  const layout = useMemo(() => getTaskLayout(tasks), [tasks]);

  if (!tasks.length) return null;

  return (
    <section className="w-full space-y-4" aria-label="Task dependency graph">
      {thought && (
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-white/90 via-sky-50/80 to-emerald-50/70 px-4 py-4 shadow-[0_8px_24px_rgba(148,163,184,0.14)] sm:px-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-emerald-400" />
          <div className="flex flex-wrap items-start justify-between gap-3 pl-1">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Original thought / prompt
                </p>
                <p className="mt-1 text-xs font-semibold italic leading-relaxed text-slate-700 sm:text-sm">
                  “{thought}”
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-emerald-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Parsed · {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ListChecks size={18} className="text-sky-600" />
            Your execution plan
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Explore your tasks and how they connect.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active / completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Scheduled / awaiting
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl">
        <div
          className="relative mx-auto"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            <defs>
              <marker
                id="task-graph-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
              </marker>
              <marker
                id="task-graph-arrow-active"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#10b981" />
              </marker>
            </defs>
            {layout.edges.map(({ id, source, target, targetTaskId }) => {
              const startX = source.x + NODE_WIDTH / 2;
              const startY = source.y;
              const endX = target.x - NODE_WIDTH / 2;
              const endY = target.y;
              const curve = Math.max(48, (endX - startX) * 0.45);
              const targetTask = layout.taskById.get(targetTaskId);
              const isExecuting = targetTask?.status === 'in_progress' || targetTask?.status === 'done';

              return (
                <path
                  key={id}
                  d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={isExecuting ? '#10b981' : '#94a3b8'}
                  strokeOpacity={isExecuting ? '0.75' : '0.7'}
                  strokeWidth={isExecuting ? '2.5' : '2'}
                  markerEnd={`url(#task-graph-arrow${isExecuting ? '-active' : ''})`}
                />
              );
            })}
          </svg>

          {tasks.map((task) => {
            const position = layout.positions.get(task.id);

            return (
              <TaskCard
                key={task.id}
                task={task}
                allTasks={allTasks}
                taskNumber={allTasks.findIndex((item) => item.id === task.id) + 1}
                onUpdateStatus={onUpdateStatus}
                className="absolute -translate-y-1/2"
                style={{
                  left: position.x - NODE_WIDTH / 2,
                  top: position.y,
                  width: NODE_WIDTH,
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
