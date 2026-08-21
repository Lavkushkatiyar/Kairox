import { Mic, Image, Wand2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export function InputActions({ onVoice, onImage, onDemo, onReset, isStructured }) {
  if (isStructured) {
    return (
      <div className="flex items-center gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={onReset} className="text-slate-500">
          <RotateCcw size={14} />
          Clear & Reset
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-4 flex-wrap">
      <button
        id="action-voice"
        onClick={onVoice}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/8 border border-white/[0.08] hover:border-white/15 transition-all duration-200"
      >
        <Mic size={13} />
        Voice Note
      </button>
      <button
        id="action-image"
        onClick={onImage}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/8 border border-white/[0.08] hover:border-white/15 transition-all duration-200"
      >
        <Image size={13} />
        Upload Image
      </button>
      <button
        id="action-demo"
        onClick={onDemo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/35 transition-all duration-200"
      >
        <Wand2 size={13} />
        Try Demo
      </button>
    </div>
  );
}
