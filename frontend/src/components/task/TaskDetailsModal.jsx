import { createElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Flag,
  GitBranch,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { getTaskIcon } from './taskIcons';

const statusNames = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const statusStyles = {
  todo: 'text-slate-600',
  in_progress: 'text-emerald-700',
  done: 'text-emerald-700',
  cancelled: 'text-slate-500',
};

const priorityNames = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const typeNames = {
  action: 'Action',
  event: 'Event',
  communication: 'Communication',
  review: 'Review',
};

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getEditValues(task) {
  return {
    title: task.title || '',
    description: task.description || '',
    due_at: toDateTimeInput(task.due_at),
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    task_type: task.task_type || 'action',
  };
}

function formatDueDate(task) {
  if (task.status === 'done' && task.completed_at) {
    const completedAt = new Date(task.completed_at);
    if (!Number.isNaN(completedAt.getTime())) {
      return `Completed ${completedAt.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`;
    }
  }
  if (!task.due_at) return 'No due date';

  const dueAt = new Date(task.due_at);
  return Number.isNaN(dueAt.getTime())
    ? task.due_at
    : dueAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function SummaryCard({ label, icon: Icon, children, className = '' }) {
  return (
    <div className={`min-w-0 rounded-xl bg-[var(--bg-color)] p-3 shadow-[inset_3px_3px_7px_#d1d9e6,inset_-3px_-3px_7px_#ffffff] ${className}`}>
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-700">
        {Icon && <Icon size={13} className="shrink-0 text-slate-400" />}
        <span className="min-w-0 truncate">{children}</span>
      </div>
    </div>
  );
}

function RelatedTask({ task, onSelect, clickable }) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
        {createElement(getTaskIcon(task.task_type), { size: 14 })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-bold text-slate-700">
          {task.title}
        </span>
        <span className={`mt-0.5 block text-[9px] font-semibold ${statusStyles[task.status] || statusStyles.todo}`}>
          {statusNames[task.status] || statusNames.todo}
        </span>
      </span>
      {task.status === 'done'
        ? <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
        : <Circle size={11} className="shrink-0 text-slate-400" />}
    </>
  );

  const className = 'flex w-full items-center gap-2 rounded-xl border border-white/80 bg-[var(--bg-color)] p-2 text-left shadow-[3px_4px_9px_#d1d9e6,-3px_-3px_9px_#ffffff]';

  return clickable ? (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      className={`${className} transition hover:-translate-y-0.5`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function TaskDetailsModal({
  task,
  allTasks,
  taskNumber,
  onClose,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
  error,
}) {
  const closeButtonRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState(() => getEditValues(task));
  const taskIcon = createElement(getTaskIcon(task.task_type), { size: 18 });
  const dependencies = (task.depends_on_ids || [])
    .map((id) => allTasks.find((item) => item.id === id))
    .filter(Boolean);
  const blockers = allTasks.filter((item) =>
    (item.depends_on_ids || []).includes(task.id)
  );
  const typeName = typeNames[task.task_type];

  useEffect(() => {
    const previousFocus = document.activeElement;
    document.body.classList.add('overflow-hidden');
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const handleSave = async (event) => {
    event.preventDefault();
    const updatedTask = await onUpdateTask(task.id, {
      ...editValues,
      due_at: editValues.due_at ? new Date(editValues.due_at).toISOString() : null,
    });
    if (updatedTask) setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    const deleted = await onDeleteTask(task.id);
    if (deleted) onClose();
  };

  const handleRelatedTaskSelect = (taskId) => {
    const relatedTask = allTasks.find((item) => item.id === taskId);
    if (!relatedTask) return;
    setIsEditing(false);
    setEditValues(getEditValues(relatedTask));
    onSelectTask(taskId);
  };

  const updateField = (field) => (event) => {
    setEditValues((values) => ({ ...values, [field]: event.target.value }));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/80 bg-[var(--bg-color)] p-5 shadow-[12px_16px_40px_rgba(51,65,85,0.28),-6px_-6px_20px_rgba(255,255,255,0.65)] sm:p-6"
      >
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            {taskIcon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                Task {String(taskNumber).padStart(2, '0')}
              </span>
              {task.id && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  ID · {String(task.id).slice(0, 8)}
                </span>
              )}
            </div>
            <h2 id="task-details-title" className="mt-1 text-lg font-extrabold leading-snug text-slate-800">
              {task.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-color)] text-slate-400 shadow-[4px_4px_9px_#d1d9e6,-4px_-4px_9px_#ffffff] transition hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </header>

        <div className={`mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 ${isEditing ? 'hidden' : ''}`}>
          <SummaryCard label="Status" icon={task.status === 'done' ? CheckCircle2 : Circle}>
            <span className={statusStyles[task.status] || statusStyles.todo}>
              {statusNames[task.status] || task.status}
            </span>
          </SummaryCard>
          <SummaryCard label={task.status === 'done' && task.completed_at ? 'Completed' : 'Due time'} icon={task.status === 'done' ? CheckCircle2 : CalendarDays}>
            {formatDueDate(task)}
          </SummaryCard>
          <SummaryCard label="Priority" icon={Flag}>
            {priorityNames[task.priority] || task.priority}
          </SummaryCard>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="mt-5 space-y-3">
            <label className="block space-y-1 text-[10px] font-bold text-slate-500">
              Title
              <input
                required
                maxLength={255}
                value={editValues.title}
                onChange={updateField('title')}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block space-y-1 text-[10px] font-bold text-slate-500">
              Description
              <textarea
                maxLength={1000}
                value={editValues.description}
                onChange={updateField('description')}
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 outline-none focus:border-sky-400"
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-[10px] font-bold text-slate-500">
                Due time
                <input
                  type="datetime-local"
                  value={editValues.due_at}
                  onChange={updateField('due_at')}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400"
                />
              </label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500">
                Status
                <select
                  value={editValues.status}
                  onChange={updateField('status')}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400"
                >
                  {Object.entries(statusNames).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500">
                Priority
                <select
                  value={editValues.priority}
                  onChange={updateField('priority')}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400"
                >
                  {Object.entries(priorityNames).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-bold text-slate-500">
                Task type
                <select
                  value={editValues.task_type}
                  onChange={updateField('task_type')}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400"
                >
                  {Object.entries(typeNames).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button type="submit" className="neu-pill-btn px-4 py-2 text-xs">
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  Description
                </h3>
                {typeName && (
                  <span className="text-[10px] font-semibold text-sky-600">
                    Type: {typeName}
                  </span>
                )}
              </div>
              <div className="mt-2 rounded-xl bg-[var(--bg-color)] p-3 text-xs leading-relaxed text-slate-600 shadow-[inset_3px_3px_7px_#d1d9e6,inset_-3px_-3px_7px_#ffffff]">
                {task.description || 'No description available.'}
              </div>
            </section>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  <GitBranch size={12} className="text-emerald-600" />
                  Depends on
                </h3>
                {dependencies.length ? (
                  <div className="space-y-2">
                    {dependencies.map((relatedTask) => (
                      <RelatedTask
                        key={relatedTask.id}
                        task={relatedTask}
                        clickable
                        onSelect={handleRelatedTaskSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-white/50 px-3 py-3 text-[10px] text-slate-400">
                    No prerequisite tasks.
                  </p>
                )}
              </section>
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  <GitBranch size={12} className="text-slate-400" />
                  Blocking
                </h3>
                {blockers.length ? (
                  <div className="space-y-2">
                    {blockers.map((relatedTask) => (
                      <RelatedTask
                        key={relatedTask.id}
                        task={relatedTask}
                        clickable
                        onSelect={handleRelatedTaskSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-white/50 px-3 py-3 text-[10px] text-slate-400">
                    No downstream tasks.
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            {error}
          </p>
        )}

        {!isEditing && (
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditValues(getEditValues(task));
                  setIsEditing(true);
                }}
                aria-label="Edit task"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-color)] text-slate-500 shadow-[4px_4px_9px_#d1d9e6,-4px_-4px_9px_#ffffff] hover:text-sky-600"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Delete task"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-color)] text-slate-500 shadow-[4px_4px_9px_#d1d9e6,-4px_-4px_9px_#ffffff] hover:text-slate-800"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[var(--bg-color)] px-4 py-2 text-xs font-bold text-slate-600 shadow-[4px_4px_9px_#d1d9e6,-4px_-4px_9px_#ffffff]"
              >
                Dismiss
              </button>
              {task.status !== 'done' && task.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onUpdateTask(task.id, { status: 'done' })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm"
                >
                  <CheckCircle2 size={13} />
                  Mark as Complete
                </button>
              )}
            </div>
          </footer>
        )}
      </section>
    </div>,
    document.body
  );
}
