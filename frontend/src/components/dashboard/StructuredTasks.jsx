import { useState } from 'react';
import { Layers } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { SourceThought } from '../task/SourceThought';
import { TaskGraph } from '../task/TaskGraph';

const filters = ['all', 'todo', 'in_progress', 'critical', 'done', 'cancelled'];

export function StructuredTasks({
  tasks,
  rawInputs,
  isLoading,
  onUpdateStatus,
  onCapture,
}) {
  const [filter, setFilter] = useState('all');
  const [expandedInputIds, setExpandedInputIds] = useState(() => new Set());
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return task.priority === 'critical';
    return task.status === filter;
  });
  const taskGroups = rawInputs.map((rawInput) => {
    const inputTasks = tasks.filter((task) => task.input_id === rawInput.id);
    return {
      ...rawInput,
      tasks: inputTasks,
      filteredTasks: inputTasks.filter((task) => filteredTasks.includes(task)),
    };
  });
  const unlinkedTasks = filteredTasks.filter(
    (task) => !rawInputs.some((rawInput) => rawInput.id === task.input_id)
  );
  const toggleInput = (inputId) => {
    setExpandedInputIds((expandedIds) => {
      const nextExpandedIds = new Set(expandedIds);
      if (nextExpandedIds.has(inputId)) {
        nextExpandedIds.delete(inputId);
      } else {
        nextExpandedIds.add(inputId);
      }
      return nextExpandedIds;
    });
  };

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
      ) : rawInputs.length === 0 && unlinkedTasks.length === 0 ? (
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
        <div className="space-y-5">
          {taskGroups.map((rawInput) => {
            const expanded = expandedInputIds.has(rawInput.id);
            return (
              <section key={rawInput.id} className="space-y-3">
                <SourceThought
                  thought={rawInput.text}
                  taskCount={rawInput.tasks.length}
                  status={rawInput.status}
                  expanded={expanded}
                  onToggle={() => toggleInput(rawInput.id)}
                />
                {expanded && (
                  rawInput.filteredTasks.length > 0 ? (
                    <TaskGraph
                      tasks={rawInput.filteredTasks}
                      allTasks={rawInput.tasks}
                      onUpdateStatus={onUpdateStatus}
                    />
                  ) : (
                    <p className="px-4 py-2 text-xs font-medium text-slate-400">
                      {rawInput.tasks.length
                        ? 'No tasks from this thought match the selected filter.'
                        : 'No tasks have been generated from this thought yet.'}
                    </p>
                  )
                )}
              </section>
            );
          })}
          {unlinkedTasks.length > 0 && (
            <section className="space-y-3">
              <SourceThought
                thought="Tasks without an available raw input"
                taskCount={unlinkedTasks.length}
                expanded={expandedInputIds.has('unlinked')}
                onToggle={() => toggleInput('unlinked')}
              />
              {expandedInputIds.has('unlinked') && (
                <TaskGraph
                  tasks={unlinkedTasks}
                  allTasks={tasks.filter((task) => !task.input_id)}
                  onUpdateStatus={onUpdateStatus}
                />
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
