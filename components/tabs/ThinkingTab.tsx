
import React, { useState } from 'react';
import { Brain, Copy, ClipboardCheck } from 'lucide-react';

interface ThinkingTabProps {
  thinkingText: string | null;
  time: string;
}

const ThinkingTab: React.FC<ThinkingTabProps> = ({ thinkingText, time }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!thinkingText) return;
    const text = `
**Neural Thinking Trace - ${time}**

${thinkingText}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full space-y-4 animate-in fade-in duration-500 flex flex-col relative">
        <div className="bg-slate-900/80 border-l-4 border-indigo-600 border border-slate-800 rounded-3xl p-6 font-mono text-xs leading-relaxed text-slate-300 overflow-y-auto whitespace-pre-wrap shadow-2xl custom-scrollbar flex-1 relative">
            <div className="flex items-center justify-between mb-5 border-b border-indigo-500/20 pb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 -mx-6 -mt-6 px-6 pt-6">
                <div className="flex items-center gap-3 text-indigo-400">
                    <Brain className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.5em]">Neural Trace Path</span>
                </div>
                <button 
                    onClick={handleCopy}
                    className={`p-1.5 rounded-lg transition-all ${
                        copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Copy Thinking Trace"
                >
                    {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
            {thinkingText || <span className="opacity-30 italic">No thinking trace available for this timestamp.</span>}
        </div>
    </div>
  );
};

export default ThinkingTab;
