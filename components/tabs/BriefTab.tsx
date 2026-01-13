
import React, { useState } from 'react';
import { Activity, Target, Fingerprint, AlignJustify, ScanBarcode, CheckCircle2, Copy, ClipboardCheck } from 'lucide-react';
import { DecodedOutput } from '../../types';

interface BriefTabProps {
  output: DecodedOutput | null;
  time: string;
}

const BriefTab: React.FC<BriefTabProps> = ({ output, time }) => {
  const [copied, setCopied] = useState(false);
  const dayType = output?.day_type?.type || "ANALYZING";
  const narrative = output?.one_liner || "Processing Signal Flux...";
  const valueAcceptance = output?.value_acceptance || "Calculating...";
  const tpoRead = output?.tpo_read;
  const reasoning = output?.day_type_reasoning || [];

  const handleCopy = () => {
    const text = `
**Brief Summary - ${time}**

* **Day Type:** ${dayType}
* **Confidence:** ${output?.confidence || '0%'}
* **Narrative:** ${narrative}
* **Value Acceptance:** ${valueAcceptance}
* **TPO Structure:**
  - Signal: ${tpoRead?.profile_signals || "N/A"}
  - Migration: ${tpoRead?.dpoc_migration || "N/A"}
  - State: ${tpoRead?.extreme_or_compression || "N/A"}
* **Logic Drivers:**
${reasoning.map(r => `  - ${r}`).join('\n')}
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
        title="Copy Brief"
      >
        {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Day Type</span>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span className="text-base font-black text-slate-200 tracking-tight">{dayType}</span>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confidence</span>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-base font-black text-slate-200 tracking-tight">{output?.confidence || '0%'}</span>
            </div>
          </div>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <Fingerprint className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Core Synthesis</span>
          </div>
          <p className="text-lg font-bold italic text-white leading-relaxed tracking-tight opacity-90">"{narrative}"</p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-3 text-sky-400">
            <AlignJustify className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Value Acceptance</span>
          </div>
          <p className="text-sm font-mono font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
            {valueAcceptance}
          </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-4 text-violet-400">
            <ScanBarcode className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">TPO Structure</span>
          </div>
          <div className="grid gap-4">
            <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-1">Profile Signal</span>
                <span className="text-sm font-mono font-medium text-slate-300 block">{tpoRead?.profile_signals || "N/A"}</span>
            </div>
            <div className="h-px bg-slate-800/50" />
            <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-1">Migration</span>
                <span className="text-sm font-mono font-medium text-slate-300 block">{tpoRead?.dpoc_migration || "N/A"}</span>
            </div>
            <div className="h-px bg-slate-800/50" />
            <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-1">State</span>
                <span className="text-sm font-mono font-medium text-slate-300 block">{tpoRead?.extreme_or_compression || "N/A"}</span>
            </div>
          </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-[1.5rem] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20"><CheckCircle2 className="w-4 h-4 text-indigo-400" /></div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logic Driver</h4>
          </div>
          <div className="space-y-3">
            {reasoning.length > 0 ? reasoning.map((r, i) => (
              <div key={i} className="flex gap-3 items-start group">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors leading-relaxed">{r}</p>
              </div>
            )) : (
              <div className="text-center py-6 opacity-30 text-[10px] font-mono">NO DATA</div>
            )}
          </div>
      </div>
    </div>
  );
};

export default BriefTab;
