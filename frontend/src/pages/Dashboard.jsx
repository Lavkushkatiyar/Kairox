import { useEffect } from 'react';
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
    allTasks,
    rawInputs,
    isLoadingAllTasks,
    loadAllTasks,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
    updateTaskDetails,
    removeRawInput,
    removeTask,
  } = useThought();

  const handleViewChange = (view) => {
    navigate(pathByView[view] || '/');
  };

  useEffect(() => {
    if (activeView === 'tasks' || activeView === 'timeline') {
      loadAllTasks();
    }
  }, [activeView, loadAllTasks]);

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
            onUpdateTask={updateTaskDetails}
            onDeleteTask={removeTask}
            error={error}
            onViewTasks={() => handleViewChange('tasks')}
          />
        )}

        {activeView === 'tasks' && (
          <StructuredTasks
            tasks={allTasks}
            rawInputs={rawInputs}
            isLoading={isLoadingAllTasks}
            onUpdateStatus={updateTaskStatus}
            onUpdateTask={updateTaskDetails}
            onDeleteInput={removeRawInput}
            onDeleteTask={removeTask}
            error={error}
            onCapture={() => handleViewChange('capture')}
            onViewTimeline={() => handleViewChange('timeline')}
          />
        )}

        {activeView === 'timeline' && (
          <ExecutionTimeline
            tasks={allTasks}
            onUpdateStatus={updateTaskStatus}
            onCapture={() => handleViewChange('capture')}
          />
        )}
      </div>
    </Layout>
  );
}
