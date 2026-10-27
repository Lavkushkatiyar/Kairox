import { ChevronDown, MessageSquareText } from 'lucide-react';

export function SourceThought({
  thought,
  taskCount,
  expanded,
  onToggle,
  status,
}) {
  if (!thought) return null;

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
        <MessageSquareText size={16} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block line-clamp-2 text-xs font-semibold leading-relaxed text-slate-700 sm:text-sm">
          {thought}
        </span>
        {status && status !== 'completed' && (
          <span className="mt-1 block text-[10px] font-medium capitalize text-slate-400">
            {status}
          </span>
        )}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-emerald-700 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </span>
      <ChevronDown
        size={16}
        className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
      />
    </>
  );

  const className = 'flex w-full items-center gap-3 rounded-2xl border border-sky-100 bg-[var(--bg-color)] px-4 py-3 text-left shadow-[6px_7px_16px_#d1d9e6,-6px_-6px_16px_#ffffff]';

  if (!onToggle) {
    return <section className={className}>{content}</section>;
  }

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={`${className} transition hover:shadow-[8px_9px_20px_#cbd5e1,-7px_-7px_18px_#ffffff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500`}
    >
      {content}
    </button>
  );
}
