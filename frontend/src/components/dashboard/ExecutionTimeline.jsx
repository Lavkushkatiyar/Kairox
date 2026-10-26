import { Clock } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { SourceThought } from '../task/SourceThought';
import { TaskCard } from '../task/TaskCard';

function groupTasksByDueDate(tasks) {
  const groups = new Map();

  tasks.forEach((task) => {
    const dueDate = task.due_at ? new Date(task.due_at) : null;
    const hasValidDate = dueDate && !Number.isNaN(dueDate.getTime());
    const key = hasValidDate
      ? `${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`
      : 'unscheduled';

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: hasValidDate
          ? dueDate.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
          : 'Unscheduled',
        sortAt: hasValidDate ? dueDate.setHours(0, 0, 0, 0) : Number.MAX_SAFE_INTEGER,
        tasks: [],
      });
    }

    groups.get(key).tasks.push(task);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort((first, second) => {
        const firstDue = new Date(first.due_at).getTime();
        const secondDue = new Date(second.due_at).getTime();
        const firstSort = Number.isNaN(firstDue) ? Number.MAX_SAFE_INTEGER : firstDue;
        const secondSort = Number.isNaN(secondDue) ? Number.MAX_SAFE_INTEGER : secondDue;
        return firstSort - secondSort;
      }),
    }))
    .sort((first, second) => first.sortAt - second.sortAt);
}

export function ExecutionTimeline({ tasks, thought, onUpdateStatus, onCapture }) {
  const groups = groupTasksByDueDate(tasks);

  return (
    <section className="relative z-10 space-y-5 pt-3">
      <div>
        <h1 className="text-xl font-black text-slate-900">Execution Timeline</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          Tasks ordered by their due dates
        </p>
      </div>

      <SourceThought thought={thought} taskCount={tasks.length} />

      {!tasks.length ? (
        <EmptyState
          icon={<Clock size={24} className="text-sky-600" />}
          title="No tasks to schedule"
          description="Capture a thought to create tasks for your timeline."
          action={
            <button
              type="button"
              onClick={onCapture}
              className="neu-pill-btn px-3 py-1.5 text-xs"
            >
              Go to Thought Capture
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="relative space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-600 ring-4 ring-sky-100" />
                {group.label}
              </h2>
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
        </div>
      )}
    </section>
  );
}
