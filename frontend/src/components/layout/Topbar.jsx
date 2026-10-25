import { LogOut, UserRound } from 'lucide-react';

export function Topbar({ user, onLogout }) {
  return (
    <header className="flex w-full shrink-0 select-none items-center justify-between border-b border-slate-200/40 px-4 py-3.5 sm:px-6 lg:px-8">
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

      {/* Right: Profile and sign-out */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-300/60">
            <button
              type="button"
              title={user.name || user.email}
              aria-label={`Profile: ${user.name || user.email}`}
              className="w-8 h-8 neu-pill-btn p-0 text-slate-600"
            >
              <UserRound size={15} />
            </button>
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
