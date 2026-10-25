import { useMemo } from 'react';
import { Check, Clock3, Circle, ListChecks } from 'lucide-react';
import { PriorityBadge } from '../ui/Badge';
import { statusConfig } from '../../data/mockData';

const NODE_WIDTH = 248;
const NODE_HEIGHT = 170;
const COLUMN_GAP = 310;
const ROW_GAP = 210;
const EDGE_GAP = 110;

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
    tasks.map((task) => {
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
  const width = Math.max(760, 300 + maxColumn * COLUMN_GAP);
  const tallestColumn = Math.max(1, ...[...columns.values()].map((items) => items.length));
  const height = Math.max(480, 220 + (tallestColumn - 1) * ROW_GAP);
  const positions = new Map();

  columns.forEach((columnTasks, level) => {
    columnTasks.forEach((task, index) => {
      const offset = (index - (columnTasks.length - 1) / 2) * ROW_GAP;
      const baseY = height / 2;
      const dependentParent = (task.depends_on_ids || [])
        .map((id) => positions.get(id))
        .find(Boolean);
      const y = dependentParent && columnTasks.length === 1
        ? dependentParent.y + ROW_GAP / 2
        : baseY + offset;

      positions.set(task.id, {
        x: EDGE_GAP + level * COLUMN_GAP,
        y: Math.max(NODE_HEIGHT / 2 + 12, Math.min(height - NODE_HEIGHT / 2 - 12, y)),
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

function formatDueTime(value) {
  if (!value) return 'No due time';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function TaskGraph({ tasks, thought, onUpdateStatus }) {
  const layout = useMemo(() => getTaskLayout(tasks), [tasks]);

  if (!tasks.length) return null;

  return (
    <section className="w-full space-y-4" aria-label="Task dependency graph">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ListChecks size={18} className="text-sky-600" />
            Execution graph
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Follow each task and its prerequisites through the plan.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active / completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            To do
          </span>
        </div>
      </div>

      {thought && (
        <div className="rounded-2xl border border-slate-200/70 bg-[var(--bg-color)] px-4 py-3 shadow-[inset_3px_3px_8px_#d1d9e6,inset_-3px_-3px_8px_#ffffff]">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Original thought
          </p>
          <p className="mt-1 text-xs italic leading-relaxed text-slate-600">
            “{thought}”
          </p>
        </div>
      )}

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
            const dependencies = (task.depends_on_ids || [])
              .map((id) => layout.taskById.get(id)?.title)
              .filter(Boolean);
            const status = statusConfig[task.status] || statusConfig.todo;
            const isExecuting = task.status === 'in_progress' || task.status === 'done';

            return (
              <article
                key={task.id}
                className={`absolute -translate-y-1/2 rounded-2xl border bg-[var(--bg-color)] p-4 text-left shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] ${
                  isExecuting ? 'border-emerald-300/80' : 'border-slate-200/70'
                }`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: NODE_WIDTH,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-sky-600">
                      Task {String(tasks.indexOf(task) + 1).padStart(2, '0')}
                      {dependencies.length
                        ? ' · Sequential'
                        : ' · Parallel branch'}
                    </span>
                    <h4 className="mt-1 text-sm font-bold leading-snug text-slate-800">
                      {task.title}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${status.color} ${status.bg}`}
                  >
                    {isExecuting ? <Check size={10} /> : <Circle size={9} />}
                    {status.label}
                  </span>
                </div>

                {task.description && (
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                    {task.description}
                  </p>
                )}

                <div className="mt-3 space-y-2 border-t border-slate-200/70 pt-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 size={11} className="shrink-0 text-sky-600" />
                    <span>{formatDueTime(task.due_at)}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
                    <span className="shrink-0 font-bold text-slate-400">Depends on:</span>
                    <span className="min-w-0 truncate">
                      {dependencies.length ? dependencies.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      onChange={(event) => onUpdateStatus(task.id, event.target.value)}
                      className="max-w-[112px] rounded-md border border-slate-300 bg-transparent px-1.5 py-1 text-[10px] font-semibold text-slate-700 focus:border-sky-600 focus:outline-none"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
