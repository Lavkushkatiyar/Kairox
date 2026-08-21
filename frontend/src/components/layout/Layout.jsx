import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout({ children, activeView, onViewChange, onCapture, taskCount, isStructured, user, onLogout }) {
  return (
    <div className="flex flex-col h-screen bg-[var(--bg-color)] text-slate-800 overflow-hidden font-sans">
      {/* Topbar Header */}
      <Topbar
        activeView={activeView}
        onCapture={onCapture}
        isStructured={isStructured}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Container with Floating Left Sidebar + Content */}
      <div className="flex flex-1 min-h-0 relative px-3 sm:px-6 pb-4 overflow-hidden items-start gap-4">
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
