import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  GitBranch,
  Mail,
  MessageSquareText,
  TerminalSquare,
} from 'lucide-react';

const taskTypeIcons = {
  action: CheckCircle2,
  communication: Mail,
  document: FileText,
  event: CalendarDays,
  meeting: CalendarDays,
  review: FileText,
  technical: TerminalSquare,
};

const statusStyles = {
  todo: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-emerald-50 text-emerald-700',
  done: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

const statusLabels = {
  todo: 'Scheduled',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

function formatDueTime(task) {
  if (task.status === 'done' && task.completed_at) {
    const completedAt = new Date(task.completed_at);
    if (!Number.isNaN(completedAt.getTime())) {
      return {
        label: `Completed ${completedAt.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}`,
        completed: true,
      };
    }
  }

  if (!task.due_at) return { label: 'No due date', completed: false };

  const dueDate = new Date(task.due_at);
  return {
    label: Number.isNaN(dueDate.getTime())
      ? task.due_at
      : dueDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
    completed: false,
  };
}

export function TaskCard({
  task,
  allTasks,
  taskNumber,
  onUpdateStatus,
  className = '',
  style,
}) {
  const dependencies = (task.depends_on_ids || [])
    .map((dependencyId) => allTasks.find((item) => item.id === dependencyId))
    .filter(Boolean);
  const TaskIcon = taskTypeIcons[task.task_type || task.type] || MessageSquareText;
  const status = task.status || 'todo';
  const statusStyle = statusStyles[status] || statusStyles.todo;
  const dueTime = formatDueTime(task);
  const hoverStyle = className.includes('absolute')
    ? 'hover:shadow-[9px_12px_22px_#cbd5e1,-8px_-8px_20px_#ffffff]'
    : 'hover:-translate-y-0.5 hover:shadow-[9px_12px_22px_#cbd5e1,-8px_-8px_20px_#ffffff]';

  return (
    <article
      className={`relative rounded-2xl border bg-[var(--bg-color)] p-4 text-left shadow-[7px_9px_18px_#d1d9e6,-7px_-7px_18px_#ffffff] transition duration-200 ${hoverStyle} ${
        status === 'in_progress' || status === 'done'
          ? 'border-emerald-200/80'
          : 'border-white/80'
      } ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
          <TaskIcon size={17} />
        </span>
        <label className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${statusStyle}`}>
          {status === 'done' || status === 'in_progress'
            ? <CheckCircle2 size={10} />
            : <Circle size={9} />}
          <span>{statusLabels[status] || statusLabels.todo}</span>
          <select
            aria-label={`Status for ${task.title}`}
            value={status}
            onChange={(event) => onUpdateStatus(task.id, event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
          Task {String(taskNumber).padStart(2, '0')}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-800">
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
            {task.description}
          </p>
        )}
      </div>

      {dependencies.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
          <GitBranch size={11} className="mt-0.5 shrink-0 text-slate-400" />
          <p
            className="min-w-0 break-words line-clamp-2"
            title={dependencies.map(({ title }) => title).join(', ')}
          >
            <span className="font-semibold text-slate-600">Depends on: </span>
            {dependencies.map(({ title }) => title).join(', ')}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5">
        <span className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] ${
          dueTime.completed ? 'text-emerald-700' : 'text-slate-500'
        }`}>
          {dueTime.completed
            ? <CheckCircle2 size={11} className="shrink-0" />
            : task.due_at
              ? <CalendarDays size={11} className="shrink-0 text-slate-400" />
              : <Clock3 size={11} className="shrink-0 text-slate-400" />}
          <span className="truncate">{dueTime.label}</span>
        </span>
        {task.priority && (
          <span className="shrink-0 text-[9px] font-semibold capitalize text-slate-400">
            {task.priority} priority
          </span>
        )}
      </div>
    </article>
  );
}
