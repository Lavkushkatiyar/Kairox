import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ExecutionTimeline } from '../components/dashboard/ExecutionTimeline';
import { StructuredTasks } from '../components/dashboard/StructuredTasks';
import { ThoughtCapture } from '../components/dashboard/ThoughtCapture';
import { useThought } from '../hooks/useThought';

const viewByPath = {
  '/': 'capture',
  '/tasks': 'tasks',
  '/timeline': 'timeline',
};

const pathByView = {
  capture: '/',
  tasks: '/tasks',
  timeline: '/timeline',
};

export function Dashboard({ user, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeView = viewByPath[pathname] || 'capture';
  const {
    input,
    setInput,
    structuredThought,
    isProcessing,
    isStructured,
    processingMessage,
    error,
    tasks,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
  } = useThought();

  const handleViewChange = (view) => {
    navigate(pathByView[view] || '/');
  };

  return (
    <Layout
      activeView={activeView}
      onViewChange={handleViewChange}
      taskCount={tasks.length}
      user={user}
      onLogout={onLogout}
    >
      <div className="mx-auto w-full space-y-6 py-2">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"
          >
            {error}
          </div>
        )}

        {activeView === 'capture' && (
          <ThoughtCapture
            input={input}
            setInput={setInput}
            isProcessing={isProcessing}
            isStructured={isStructured}
            processingMessage={processingMessage}
            tasks={tasks}
            structuredThought={structuredThought}
            onStructure={handleStructure}
            onReset={handleReset}
            onLoadDemo={handleLoadDemo}
            onUpdateStatus={updateTaskStatus}
            onViewTasks={() => handleViewChange('tasks')}
          />
        )}

        {activeView === 'tasks' && (
          <StructuredTasks
            tasks={tasks}
            thought={structuredThought}
            onUpdateStatus={updateTaskStatus}
            onCapture={() => handleViewChange('capture')}
          />
        )}

        {activeView === 'timeline' && (
          <ExecutionTimeline
            tasks={tasks}
            thought={structuredThought}
            onUpdateStatus={updateTaskStatus}
            onCapture={() => handleViewChange('capture')}
          />
        )}
      </div>
    </Layout>
  );
}
