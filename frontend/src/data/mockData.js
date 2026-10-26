// Mock data for Kairox frontend preview

export const mockThought = `Tomorrow I have a meeting at 11, finish the report before that, send it to Aman, check logs tonight, and draft a message to my manager about the project timeline.`;

export const priorityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
    glow: 'shadow-[0_0_8px_rgba(249,115,22,0.4)]',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-400',
    glow: '',
  },
  low: {
    label: 'Low',
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    glow: '',
  },
};

export const statusConfig = {
  todo: { label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-500/15' },
  in_progress: { label: 'In Progress', color: 'text-emerald-600', bg: 'bg-emerald-500/15' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bg: 'bg-slate-500/15' },
};

export const typeIcons = {
  technical: '⚙️',
  document: '📄',
  communication: '📤',
  meeting: '🗓️',
  draft: '✏️',
};
