import { Plus, LogOut } from 'lucide-react';

export function Topbar({ onCapture, user, onLogout }) {
  return (
    <header className="w-full px-6 py-3.5 flex items-center justify-between shrink-0 select-none border-b border-slate-200/40">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold text-sky-600 tracking-tight cursor-pointer">
          Kairox
        </span>
      </div>

      {/* Center: Brand Tagline */}
      <div className="hidden md:flex items-center text-xs font-semibold text-sky-600/90 tracking-wide">
        Thought → Execution
      </div>

      {/* Right: Actions (Add Thought & User/Logout) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCapture}
          className="neu-pill-btn px-4 py-2 text-xs font-bold text-sky-600 hover:text-sky-700"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add Thought</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-300/60">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[11px] font-bold text-slate-700">{user.name || user.email}</span>
              <span className="text-[9px] text-slate-400">{user.email}</span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
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
