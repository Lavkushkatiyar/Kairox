import { useId, useMemo } from 'react';
import {
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { getTaskLayout, taskGraphDimensions } from './taskGraphLayout';

export function TaskGraph({ tasks, allTasks = tasks, thought, onUpdateStatus }) {
  const layout = useMemo(() => getTaskLayout(tasks), [tasks]);
  const graphId = useId().replaceAll(':', '');
  const { nodeWidth, nodeHeight } = taskGraphDimensions;

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

      <div className="w-full overflow-x-auto rounded-2xl pb-3">
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
                id={`${graphId}-task-graph-arrow`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
              </marker>
              <marker
                id={`${graphId}-task-graph-arrow-active`}
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
              const startX = source.x + nodeWidth / 2;
              const startY = source.y;
              const endX = target.x - nodeWidth / 2 - 8;
              const endY = target.y;
              const curve = Math.max(16, (endX - startX) * 0.45);
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
                  markerEnd={`url(#${graphId}-task-graph-arrow${isExecuting ? '-active' : ''})`}
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
                  left: position.x - nodeWidth / 2,
                  top: position.y,
                  width: nodeWidth,
                  minHeight: nodeHeight,
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
