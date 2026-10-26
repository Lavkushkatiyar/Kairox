import { createElement } from 'react';
import {
  Share2,
  LayoutGrid,
  History,
} from 'lucide-react';

const navItems = [
  { id: 'capture', icon: Share2, label: 'Thought Capture' },
  { id: 'tasks', icon: LayoutGrid, label: 'Structured Tasks' },
  { id: 'timeline', icon: History, label: 'Timeline View' },
];

export function Sidebar({ activeView, onViewChange, taskCount }) {
  return (
    <aside className="neu-floating-bar z-20 ml-2 mt-3 h-fit w-12 shrink-0 rounded-2xl px-1.5 py-4">
      <nav aria-label="Main navigation" className="flex w-full flex-col items-center gap-4">
        {navItems.map(({ id, icon, label }) => {
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
              {createElement(icon, { size: 18, strokeWidth: isActive ? 2.2 : 1.8 })}

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
    </aside>
  );
}
