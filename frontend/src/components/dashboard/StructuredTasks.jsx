import { useState } from 'react';
import { Layers } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { SourceThought } from '../task/SourceThought';
import { TaskCard } from '../task/TaskCard';

const filters = ['all', 'todo', 'in_progress', 'critical', 'done', 'cancelled'];

export function StructuredTasks({
  tasks,
  rawInputs,
  isLoading,
  onUpdateStatus,
  onCapture,
}) {
  const [filter, setFilter] = useState('all');
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return task.priority === 'critical';
    return task.status === filter;
  });
  const taskGroups = rawInputs
    .map((rawInput) => ({
      id: rawInput.id,
      thought: rawInput.text,
      tasks: filteredTasks.filter((task) => task.input_id === rawInput.id),
    }))
    .filter((group) => group.tasks.length);
  const unlinkedTasks = filteredTasks.filter(
    (task) => !rawInputs.some((rawInput) => rawInput.id === task.input_id)
  );

  return (
    <section className="relative z-10 space-y-5 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Structured Tasks</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Tasks and prerequisites from all your thoughts
          </p>
        </div>
        <div className="neu-input-inset flex items-center gap-1.5 rounded-xl p-1 text-xs">
          {filters.map((filterName) => (
            <button
              key={filterName}
              type="button"
              onClick={() => setFilter(filterName)}
              aria-pressed={filter === filterName}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                filter === filterName
                  ? 'neu-pill-btn px-2.5 py-0.5 text-sky-600'
                  : 'text-slate-500 hover:text-sky-600'
              }`}
            >
              {filterName.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm font-medium text-slate-500" role="status">
          Loading tasks from your thoughts...
        </p>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<Layers size={24} className="text-sky-600" />}
          title={tasks.length ? 'No tasks match this filter' : 'No structured tasks yet'}
          description={tasks.length
            ? 'Choose another filter to see more tasks.'
            : 'Capture a thought to create its task plan.'}
          action={!tasks.length && (
            <button
              type="button"
              onClick={onCapture}
              className="neu-pill-btn px-3 py-1.5 text-xs"
            >
              Go to Thought Capture
            </button>
          )}
        />
      ) : (
        <div className="space-y-6">
          {taskGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <SourceThought thought={group.thought} taskCount={group.tasks.length} />
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    taskNumber={tasks.indexOf(task) + 1}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            </section>
          ))}
          {unlinkedTasks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-700">Other tasks</h2>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {unlinkedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    taskNumber={tasks.indexOf(task) + 1}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
