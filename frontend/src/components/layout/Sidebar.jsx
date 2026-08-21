import {
  Share2,
  LayoutGrid,
  History,
  Settings,
} from 'lucide-react';

const navItems = [
  { id: 'capture', icon: Share2, label: 'Thought Capture' },
  { id: 'tasks', icon: LayoutGrid, label: 'Structured Tasks' },
  { id: 'timeline', icon: History, label: 'Timeline View' },
];

export function Sidebar({ activeView, onViewChange, taskCount }) {
  return (
    <aside className="w-12 py-4 px-1.5 flex flex-col items-center justify-between neu-floating-bar h-[360px] shrink-0 z-20 mt-3 ml-2">
      {/* Top Nav items */}
      <nav className="flex flex-col items-center gap-4 w-full">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              title={label}
              onClick={() => onViewChange(id)}
              className={`
                group relative w-9 h-9 rounded-xl flex items-center justify-center
                transition-all duration-200 focus:outline-none
                ${isActive
                  ? 'neu-icon-active'
                  : 'neu-icon-idle hover:text-sky-600'
                }
              `}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />

              {/* Task count badge */}
              {id === 'tasks' && taskCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sky-500 text-[8px] font-bold text-white flex items-center justify-center">
                  {taskCount > 9 ? '9+' : taskCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings Button */}
      <button
        id="nav-settings"
        title="Settings"
        onClick={() => alert('Settings coming soon!')}
        className="w-9 h-9 rounded-xl flex items-center justify-center neu-icon-idle hover:text-sky-600 focus:outline-none"
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </aside>
  );
}
