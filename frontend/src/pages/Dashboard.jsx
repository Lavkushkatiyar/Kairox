import { useState } from 'react';
import { Sparkles, Wand2, Mic, Image, ArrowRight, Clock, Layers, Copy, Check, CheckSquare } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PriorityBadge, TypeBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TaskGraph } from '../components/task/TaskGraph';
import { useThought } from '../hooks/useThought';
import { typeIcons } from '../data/mockData';

export function Dashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('capture');
  const [taskFilter, setTaskFilter] = useState('all');
  const [copiedTaskId, setCopiedTaskId] = useState(null);

  const {
    input,
    setInput,
    isProcessing,
    isStructured,
    isLoadingTasks,
    processingMessage,
    error,
    tasks,
    timeline,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
  } = useThought();

  const handleCopyDraft = (taskId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedTaskId(taskId);
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'critical') return task.priority === 'critical';
    return task.status === taskFilter;
  });

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      taskCount={tasks.length}
      user={user}
      onLogout={onLogout}
    >
      <div className="relative mx-auto w-full space-y-6 py-2">
        {/* Background Network Node Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 z-0">
          <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="300" r="8" fill="#0284c7" opacity="0.3" />
            <circle cx="700" cy="120" r="10" fill="#0284c7" opacity="0.25" />
            <circle cx="650" cy="380" r="7" fill="#0284c7" opacity="0.2" />
            <path d="M150 300 C 250 200, 450 420, 700 120" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.25" />
            <path d="M380 260 C 480 180, 580 320, 650 380" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.2" />
          </svg>
        </div>

        {error && (
          <div
            role="alert"
            className="relative z-10 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"
          >
            {error}
          </div>
        )}

        {/* VIEW 1: THOUGHT CAPTURE */}
        {activeView === 'capture' && (
          <div className="relative z-10 flex flex-col items-center justify-start space-y-5 animate-fade-in pt-3 md:pt-6">
            {/* Header Title & Subtitle */}
            <div className="text-center space-y-1.5 max-w-lg">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                What's on your mind?
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Dump your unstructured thoughts here. Kairox will organize them.
              </p>
            </div>

            {/* Main Neumorphic Inset Input Card */}
            <div className="w-full max-w-2xl neu-input-inset p-5 sm:p-6 flex flex-col justify-between space-y-3 relative min-h-[170px]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing || isStructured}
                placeholder="Finish report, send to Aman, check logs tonight, meeting tomorrow at 11..."
                className="w-full h-24 bg-transparent text-slate-800 placeholder-slate-400/80 text-xs sm:text-sm focus:outline-none resize-none font-medium leading-relaxed"
              />

              {/* Action Button inside Input Card (Bottom Right) */}
              <div className="flex items-center justify-between pt-1">
                {isStructured ? (
                  <button
                    onClick={handleReset}
                    className="neu-pill-btn-secondary text-[11px] px-3 py-1.5"
                  >
                    Reset Thought
                  </button>
                ) : (
                  <button
                    onClick={handleLoadDemo}
                    className="text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer"
                  >
                    Load Sample Demo
                  </button>
                )}

                <button
                  onClick={handleStructure}
                  disabled={!input.trim() || isProcessing}
                  className="neu-pill-btn px-5 py-2.5 text-xs font-bold text-sky-600 shadow-sm ml-auto"
                >
                  {isProcessing ? (
                    <>
                      <Wand2 size={16} className="animate-spin text-emerald-600" />
                      <span>Structuring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-sky-600" />
                      <span>Structure Thought</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isProcessing && (
              <p className="text-xs font-semibold text-emerald-600" role="status">
                {processingMessage}
              </p>
            )}

            {/* Bottom Action Pill Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => alert('Voice note feature active soon!')}
                className="neu-pill-btn-secondary px-4 py-2 text-[11px]"
              >
                <Mic size={13} className="text-slate-500" />
                <span>VOICE NOTE</span>
              </button>

              <button
                onClick={() => alert('Upload image feature active soon!')}
                className="neu-pill-btn-secondary px-4 py-2 text-[11px]"
              >
                <Image size={13} className="text-slate-500" />
                <span>UPLOAD IMAGE</span>
              </button>
            </div>

            {/* Structured Results Display */}
            {isStructured && !isProcessing && (
              <div className="w-full pt-6 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <CheckSquare size={18} className="text-sky-600" />
                    Structured Execution Plan ({tasks.length} Tasks)
                  </h3>
                  <button
                    onClick={() => setActiveView('tasks')}
                    className="neu-pill-btn text-xs px-3 py-1.5"
                  >
                    <span>View All Tasks</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <TaskGraph
                  tasks={tasks}
                  thought={input}
                  onUpdateStatus={updateTaskStatus}
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: STRUCTURED TASKS GRID */}
        {activeView === 'tasks' && (
          <div className="relative z-10 space-y-5 animate-fade-in pt-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Structured Tasks</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Your extracted tasks, ready for execution</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 neu-input-inset rounded-xl text-xs">
                {['all', 'todo', 'in_progress', 'critical', 'done', 'cancelled'].map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTaskFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all font-bold text-[11px] ${
                      taskFilter === filterKey
                        ? 'neu-pill-btn text-sky-600 text-[11px] py-0.5 px-2.5'
                        : 'text-slate-500 hover:text-sky-600'
                    }`}
                  >
                    {filterKey.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={<Layers size={24} className="text-sky-600" />}
                title={isLoadingTasks ? 'Loading tasks...' : 'No tasks match the filter'}
                description={isLoadingTasks
                  ? 'Fetching your tasks from Kairox.'
                  : tasks.length === 0
                    ? "You haven't structured any thoughts yet. Dump a thought to start."
                    : 'Try selecting a different filter above.'}
                action={
                  tasks.length === 0 && (
                    <button onClick={() => setActiveView('capture')} className="neu-pill-btn text-xs px-3 py-1.5">
                      Go to Thought Capture
                    </button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={updateTaskStatus}
                    onCopyDraft={handleCopyDraft}
                    copiedTaskId={copiedTaskId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: TIMELINE VIEW */}
        {activeView === 'timeline' && (
          <div className="relative z-10 space-y-5 animate-fade-in pt-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">Execution Timeline</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Chronological step-by-step timeline</p>
            </div>

            {timeline.length === 0 ? (
              <EmptyState
                icon={<Clock size={24} className="text-sky-600" />}
                title="Timeline empty"
                description="Input your thoughts to generate a chronological timeline."
                action={
                  <button onClick={() => setActiveView('capture')} className="neu-pill-btn text-xs px-3 py-1.5">
                    Go to Thought Capture
                  </button>
                }
              />
            ) : (
              <div className="relative pl-5 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-300">
                {timeline.map((group, groupIdx) => (
                  <div key={groupIdx} className="relative space-y-3">
                    {/* Date Marker Node */}
                    <div className="flex items-center gap-2.5 -ml-5">
                      <div className="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-sm flex items-center justify-center z-10">
                        <div className="w-1 h-1 rounded-full bg-white" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span>{group.date}</span>
                        <span className="text-[11px] font-normal text-slate-500">({group.dateLabel})</span>
                      </h3>
                    </div>

                    {/* Timeline Tasks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onUpdateStatus={updateTaskStatus}
                          onCopyDraft={handleCopyDraft}
                          copiedTaskId={copiedTaskId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

{/* Individual Task Card Component */}
function TaskCard({ task, onUpdateStatus, onCopyDraft, copiedTaskId }) {
  const taskType = task.task_type || task.type;
  const icon = typeIcons[taskType] || '📌';

  return (
    <div className="neu-card-extruded p-4 space-y-3 text-left">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">{icon}</span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              {task.title}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{task.description}</p>
          </div>
        </div>
      </div>

      {/* Draft Message Action Box */}
      {task.draft && (
        <div className="p-2.5 neu-input-inset rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
            <span>Generated Draft</span>
            <button
              onClick={() => onCopyDraft(task.id, task.draft)}
              className="flex items-center gap-1 text-sky-600 hover:underline cursor-pointer"
            >
              {copiedTaskId === task.id ? <Check size={11} /> : <Copy size={11} />}
              <span>{copiedTaskId === task.id ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-slate-700 font-mono whitespace-pre-wrap text-[10px] leading-tight">
            {task.draft}
          </p>
        </div>
      )}

      {/* Metadata Badges */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 flex-wrap gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityBadge priority={task.priority} />
          <TypeBadge type={taskType} />
          {(task.due_at || task.dueTime) && (
            <span className="inline-flex items-center gap-1 text-slate-500 text-[10px] font-medium">
              <Clock size={11} />
              {task.dueTime || new Date(task.due_at).toLocaleString()}
            </span>
          )}
        </div>

        {/* Status Selector */}
        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          className="bg-transparent border border-slate-300 rounded-md px-1.5 py-0.5 text-[11px] text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
