import { useState } from 'react';
import { ArrowRight, Check, Clock, Copy, GitBranch } from 'lucide-react';
import { PriorityBadge, TypeBadge } from '../ui/Badge';
import { typeIcons } from '../../data/mockData';

function formatDueTime(task) {
  if (task.dueTime) return task.dueTime;
  if (!task.due_at) return null;

  const dueDate = new Date(task.due_at);
  return Number.isNaN(dueDate.getTime()) ? task.due_at : dueDate.toLocaleString();
}

export function TaskCard({ task, allTasks, taskNumber, onUpdateStatus }) {
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState(false);
  const taskType = task.task_type || task.type;
  const dependencies = (task.depends_on_ids || [])
    .map((dependencyId) => allTasks.find((item) => item.id === dependencyId))
    .filter(Boolean);
  const dependents = allTasks.filter((item) =>
    (item.depends_on_ids || []).includes(task.id)
  );

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(task.draft);
      setCopied(true);
      setCopyError('');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Could not copy the draft. Check clipboard permissions.');
    }
  };

  return (
    <article className={`neu-card-extruded relative overflow-hidden p-4 text-left ${
      task.status === 'in_progress' || task.status === 'done'
        ? 'border border-emerald-200/80'
        : 'border border-white/70'
    }`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${
        task.status === 'done'
          ? 'bg-emerald-500'
          : task.status === 'in_progress'
            ? 'bg-sky-500'
            : 'bg-slate-200'
      }`} />
      <div className="space-y-3 pl-1.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm">
            {typeIcons[taskType] || '📌'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-sky-600">
                Task {String(taskNumber).padStart(2, '0')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                {dependencies.length
                  ? <GitBranch size={10} />
                  : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                {dependencies.length ? 'Sequential' : 'Prerequisite'}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-800 sm:text-sm">{task.title}</h3>
            {task.description && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {task.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-1.5 rounded-xl bg-white/70 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
            <GitBranch size={12} className="mt-0.5 shrink-0 text-sky-600" />
            <span className="min-w-0">
              <span className="font-bold text-slate-600">Depends on </span>
              {dependencies.length
                ? dependencies.map((dependency) => dependency.title).join(', ')
                : 'No prerequisites'}
            </span>
          </div>
          {dependents.length > 0 && (
            <div className="flex min-w-0 flex-1 items-start gap-1.5 rounded-xl bg-white/70 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
              <ArrowRight size={12} className="mt-0.5 shrink-0 text-emerald-600" />
              <span className="min-w-0">
                <span className="font-bold text-slate-600">Unlocks </span>
                {dependents.map((dependent) => dependent.title).join(', ')}
              </span>
            </div>
          )}
        </div>

        {task.draft && (
          <div className="neu-input-inset space-y-1.5 rounded-xl p-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Generated Draft</span>
              <button
                type="button"
                onClick={handleCopyDraft}
                className="flex cursor-pointer items-center gap-1 text-sky-600 hover:underline"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="whitespace-pre-wrap font-mono text-[10px] leading-tight text-slate-700">
              {task.draft}
            </p>
            {copyError && (
              <p role="alert" className="text-[10px] font-medium text-red-600">
                {copyError}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/60 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {taskType && <TypeBadge type={taskType} />}
            {formatDueTime(task) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <Clock size={11} />
                {formatDueTime(task)}
              </span>
            )}
          </div>
          <select
            aria-label={`Status for ${task.title}`}
            value={task.status || 'todo'}
            onChange={(event) => onUpdateStatus(task.id, event.target.value)}
            className="cursor-pointer rounded-md border border-slate-300 bg-transparent px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 focus:border-sky-600 focus:outline-none"
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
}
