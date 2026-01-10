
import React from 'react';
import { Brain } from 'lucide-react';

interface ThinkingTabProps {
  thinkingText: string | null;
}

const ThinkingTab: React.FC<ThinkingTabProps> = ({ thinkingText }) => {
  return (
    <div className="h-full space-y-4 animate-in fade-in duration-500 flex flex-col">
        <div className="bg-slate-900/80 border-l-4 border-indigo-600 border border-slate-800 rounded-3xl p-6 font-mono text-xs leading-relaxed text-slate-300 overflow-y-auto whitespace-pre-wrap shadow-2xl custom-scrollbar flex-1">
        <div className="flex items-center gap-3 mb-5 text-indigo-400 border-b border-indigo-500/20 pb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <Brain className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em]">Neural Trace Path</span>
        </div>
        {thinkingText}
        </div>
    </div>
  );
};

export default ThinkingTab;
