import {
  ArrowRight,
  Sparkles,
  Wand2,
  CheckSquare,
} from 'lucide-react';
import { TaskGraph } from '../task/TaskGraph';

export function ThoughtCapture({
  input,
  setInput,
  isProcessing,
  isStructured,
  processingMessage,
  tasks,
  structuredThought,
  onStructure,
  onReset,
  onLoadDemo,
  onUpdateStatus,
  onViewTasks,
}) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-start space-y-5 pt-3 md:pt-6">
      <div className="max-w-lg space-y-1.5 text-center">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          What&apos;s on your mind?
        </h1>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          Capture a thought and turn it into an execution plan.
        </p>
      </div>

      <form
        className="neu-input-inset relative flex min-h-[170px] w-full max-w-2xl flex-col justify-between space-y-3 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onStructure();
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isProcessing || isStructured}
          placeholder="Finish the report, send it to Aman, and check the logs tonight..."
          aria-label="Thought to structure"
          className="h-24 w-full resize-none bg-transparent text-xs font-medium leading-relaxed text-slate-800 placeholder-slate-400/80 focus:outline-none sm:text-sm"
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          {isStructured ? (
            <button
              type="button"
              onClick={onReset}
              className="neu-pill-btn-secondary px-3 py-1.5 text-[11px]"
            >
              Reset Thought
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoadDemo}
              disabled={isProcessing}
              className="cursor-pointer text-[11px] font-semibold text-sky-600 hover:underline disabled:cursor-not-allowed"
            >
              Load Sample
            </button>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="neu-pill-btn ml-auto px-5 py-2.5 text-xs font-bold text-sky-600 shadow-sm"
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
      </form>

      {isProcessing && (
        <p className="text-xs font-semibold text-emerald-600" role="status">
          {processingMessage}
        </p>
      )}

      {isStructured && (
        <section className="w-full space-y-4 pt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <CheckSquare size={18} className="text-sky-600" />
              Structured Execution Plan
            </h2>
            <button
              type="button"
              onClick={onViewTasks}
              className="neu-pill-btn px-3 py-1.5 text-xs"
            >
              <span>View All Tasks</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <TaskGraph
            tasks={tasks}
            thought={structuredThought}
            onUpdateStatus={onUpdateStatus}
          />
        </section>
      )}
    </div>
  );
}
