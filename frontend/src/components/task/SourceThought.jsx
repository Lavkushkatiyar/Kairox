import { MessageSquareText } from 'lucide-react';

export function SourceThought({ thought, taskCount }) {
  if (!thought) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-white/90 via-sky-50/80 to-emerald-50/70 px-4 py-4 shadow-[0_8px_24px_rgba(148,163,184,0.14)] sm:px-5">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-emerald-400" />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
            <MessageSquareText size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              Tasks generated from this thought
            </p>
            <p className="mt-1 text-xs font-semibold italic leading-relaxed text-slate-700 sm:text-sm">
              “{thought}”
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-emerald-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </section>
  );
}
