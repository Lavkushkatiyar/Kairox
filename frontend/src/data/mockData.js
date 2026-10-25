// Mock data for Kairox frontend preview

export const mockThought = `Tomorrow I have a meeting at 11, finish the report before that, send it to Aman, check logs tonight, and draft a message to my manager about the project timeline.`;

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Check server logs',
    description: 'Review error logs and performance metrics from the dashboard.',
    dueTime: 'Tonight, 10:00 PM',
    priority: 'high',
    status: 'pending',
    type: 'technical',
    tags: ['logs', 'server'],
    dependsOn: [],
  },
  {
    id: 'task-2',
    title: 'Finish the Q3 report',
    description: 'Complete data analysis and write the executive summary section.',
    dueTime: 'Tomorrow, 9:00 AM',
    priority: 'critical',
    status: 'in_progress',
    type: 'document',
    tags: ['report', 'Q3'],
    dependsOn: [],
  },
  {
    id: 'task-3',
    title: 'Send report to Aman',
    description: 'Email the completed report to Aman before the meeting.',
    dueTime: 'Tomorrow, 10:30 AM',
    priority: 'high',
    status: 'pending',
    type: 'communication',
    tags: ['email', 'aman'],
    dependsOn: ['task-2'],
  },
  {
    id: 'task-4',
    title: 'Team meeting',
    description: 'Weekly sync — review project status, blockers, and next steps.',
    dueTime: 'Tomorrow, 11:00 AM',
    priority: 'medium',
    status: 'scheduled',
    type: 'meeting',
    tags: ['meeting', 'sync'],
    dependsOn: ['task-3'],
  },
  {
    id: 'task-5',
    title: 'Draft message to manager',
    description: 'Write a brief update about the project timeline and current status.',
    dueTime: 'Tomorrow, 12:00 PM',
    priority: 'medium',
    status: 'pending',
    type: 'draft',
    tags: ['manager', 'update'],
    dependsOn: ['task-4'],
    draft: `Hi [Manager],\n\nI wanted to give you a quick update on the project timeline. The Q3 report is nearly complete and will be ready before the 11 AM meeting tomorrow.\n\nBest regards`,
  },
];

export const mockTimeline = [
  {
    date: 'Tonight',
    dateLabel: 'Aug 16',
    tasks: [mockTasks[0]],
  },
  {
    date: 'Tomorrow',
    dateLabel: 'Aug 17',
    tasks: [mockTasks[1], mockTasks[2], mockTasks[3], mockTasks[4]],
  },
];

export const mockDependencyChain = [
  { from: 'task-2', to: 'task-3', label: 'then send' },
  { from: 'task-3', to: 'task-4', label: 'before meeting' },
  { from: 'task-4', to: 'task-5', label: 'then draft' },
];

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
  in_progress: { label: 'In Progress', color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
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
