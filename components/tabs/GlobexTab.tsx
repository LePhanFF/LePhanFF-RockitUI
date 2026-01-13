
import React, { useState } from 'react';
import { Globe, Maximize2, Minimize2, ArrowLeftRight, Layers, Copy, ClipboardCheck } from 'lucide-react';

interface GlobexTabProps {
  premarket: any;
  time: string;
}

const GlobexTab: React.FC<GlobexTabProps> = ({ premarket, time }) => {
  const [copied, setCopied] = useState(false);
  const formatNum = (n: any) => typeof n === 'number' ? n.toFixed(2) : '0.00';

  const handleCopy = () => {
    const text = `
**Globex Levels - ${time}**

* **Asia Block:** ${formatNum(premarket?.asia_low)} - ${formatNum(premarket?.asia_high)}
* **London Block:** ${formatNum(premarket?.london_low)} - ${formatNum(premarket?.london_high)} (Range: ${formatNum(premarket?.london_range)})
* **Overnight:** ${formatNum(premarket?.overnight_low)} - ${formatNum(premarket?.overnight_high)} (Range: ${formatNum(premarket?.overnight_range)})

* **Metrics:**
  - Compression: ${premarket?.compression_flag ? 'TRUE' : 'FALSE'} (Ratio: ${formatNum(premarket?.compression_ratio)})
  - SMT: ${premarket?.smt_preopen || 'NEUTRAL'}

* **Reference:**
  - PDH: ${formatNum(premarket?.previous_day_high)} | PDL: ${formatNum(premarket?.previous_day_low)}
  - PWH: ${formatNum(premarket?.previous_week_high)} | PWL: ${formatNum(premarket?.previous_week_low)}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-4 relative">
        <button 
            onClick={handleCopy}
            className={`absolute -top-2 right-0 p-1.5 rounded-lg transition-all ${
                copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
            title="Copy Globex Data"
        >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Session Blocks */}
        <div className="grid gap-3 mt-2">
             {/* Asia */}
             <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                         <Globe className="w-4 h-4 text-amber-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Asia Block</span>
                    </div>
                </div>
                <div className="flex justify-between items-end relative z-10">
                     <div className="text-left">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">High</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.asia_high)}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">Low</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.asia_low)}</span>
                     </div>
                </div>
             </div>

             {/* London */}
             <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                         <Globe className="w-4 h-4 text-sky-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">London Block</span>
                    </div>
                    <span className="text-[9px] font-mono text-sky-400/60 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">R: {formatNum(premarket?.london_range)}</span>
                </div>
                <div className="flex justify-between items-end relative z-10">
                     <div className="text-left">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">High</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.london_high)}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">Low</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.london_low)}</span>
                     </div>
                </div>
             </div>

             {/* Overnight */}
             <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                         <Globe className="w-4 h-4 text-indigo-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Overnight (ON)</span>
                    </div>
                    <span className="text-[9px] font-mono text-indigo-400/60 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">R: {formatNum(premarket?.overnight_range)}</span>
                </div>
                <div className="flex justify-between items-end relative z-10">
                     <div className="text-left">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">High</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.overnight_high)}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[8px] text-slate-500 font-bold uppercase block">Low</span>
                        <span className="text-sm font-mono font-black text-slate-200">{formatNum(premarket?.overnight_low)}</span>
                     </div>
                </div>
             </div>
        </div>

        {/* Structural Metrics */}
        <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-3">
                    <Minimize2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Compression</span>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">Flag</span>
                        <span className={`text-[10px] font-black uppercase ${premarket?.compression_flag ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {premarket?.compression_flag ? 'TRUE' : 'FALSE'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">Ratio</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{formatNum(premarket?.compression_ratio)}</span>
                    </div>
                 </div>
             </div>

             <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-3">
                    <ArrowLeftRight className="w-4 h-4 text-rose-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">SMT Divergence</span>
                 </div>
                 <div className="flex flex-col justify-center h-12">
                     <span className={`text-xs font-black uppercase text-center ${
                         premarket?.smt_preopen === 'neutral' ? 'text-slate-500' : 
                         premarket?.smt_preopen?.includes('bull') ? 'text-emerald-400' : 'text-rose-400'
                     }`}>
                        {premarket?.smt_preopen || 'NEUTRAL'}
                     </span>
                 </div>
             </div>
        </div>

        {/* Reference Levels */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
             <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reference Levels</span>
             </div>
             <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                 <div className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                    <span className="text-[9px] font-bold text-slate-500">PDH</span>
                    <span className="text-[10px] font-mono font-bold text-slate-300">{formatNum(premarket?.previous_day_high)}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                    <span className="text-[9px] font-bold text-slate-500">PDL</span>
                    <span className="text-[10px] font-mono font-bold text-slate-300">{formatNum(premarket?.previous_day_low)}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                    <span className="text-[9px] font-bold text-slate-500">PWH</span>
                    <span className="text-[10px] font-mono font-bold text-violet-300">{formatNum(premarket?.previous_week_high)}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                    <span className="text-[9px] font-bold text-slate-500">PWL</span>
                    <span className="text-[10px] font-mono font-bold text-violet-300">{formatNum(premarket?.previous_week_low)}</span>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default GlobexTab;
