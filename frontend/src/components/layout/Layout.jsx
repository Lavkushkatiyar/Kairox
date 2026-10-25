import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout({ children, activeView, onViewChange, taskCount, user, onLogout }) {
  return (
    <div className="mx-auto flex h-screen w-full max-w-[1640px] flex-col overflow-hidden bg-[var(--bg-color)] font-sans text-slate-800">
      {/* Topbar Header */}
      <Topbar user={user} onLogout={onLogout} />

      {/* Main Container with Floating Left Sidebar + Content */}
      <div className="relative flex min-h-0 flex-1 items-start gap-4 overflow-hidden px-4 pb-4 sm:px-6 lg:px-8">
        {/* Floating Left Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={onViewChange}
          taskCount={taskCount}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-2 md:px-6 py-2 h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
