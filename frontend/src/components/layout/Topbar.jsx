import { LogOut } from 'lucide-react';

export function Topbar({ user, onLogout }) {
  return (
    <header className="flex w-full shrink-0 select-none items-center justify-between border-b border-slate-200/40 px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold tracking-tight text-sky-600">
          Kairox
        </span>
      </div>

      <div className="hidden items-center text-xs font-semibold tracking-wide text-sky-600/90 md:flex">
        Thought → Execution
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3 border-l border-slate-300/60 pl-3">
            <span className="hidden max-w-48 truncate text-xs font-semibold text-slate-600 sm:inline">
              {user.name || user.email}
            </span>
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign out"
              className="w-8 h-8 neu-pill-btn p-0 text-red-500 hover:text-red-600"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
