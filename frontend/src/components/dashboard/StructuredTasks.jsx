import { useState } from 'react';
import { Layers } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { SourceThought } from '../task/SourceThought';
import { TaskCard } from '../task/TaskCard';

const filters = ['all', 'todo', 'in_progress', 'critical', 'done', 'cancelled'];

export function StructuredTasks({
  tasks,
  thought,
  onUpdateStatus,
  onCapture,
}) {
  const [filter, setFilter] = useState('all');
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return task.priority === 'critical';
    return task.status === filter;
  });

  return (
    <section className="relative z-10 space-y-5 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Structured Tasks</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Tasks and prerequisites from your thought
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

      <SourceThought thought={thought} taskCount={tasks.length} />

      {filteredTasks.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={tasks}
              taskNumber={tasks.indexOf(task) + 1}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}
