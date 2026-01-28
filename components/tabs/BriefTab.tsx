
import React, { useState, useMemo } from 'react';
import { Activity, Target, Fingerprint, ScanBarcode, CheckCircle2, Copy, ClipboardCheck, History, Zap } from 'lucide-react';
import { DecodedOutput, MarketSnapshot } from '../../types';
import { calculateTrendStrength } from '../../utils/dataHelpers';

interface BriefTabProps {
  output: DecodedOutput | null;
  time: string;
  allSnapshots?: MarketSnapshot[];
  currentSnapshot?: MarketSnapshot;
}

const getStrengthColor = (strength: string) => {
    switch (strength) {
        case "SUPER": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
        case "STRONG": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        case "MODERATE": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        case "WEAK": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
        default: return "text-slate-500 bg-slate-800 border-slate-700";
    }
};

const BriefTab: React.FC<BriefTabProps> = ({ output, time, allSnapshots = [], currentSnapshot }) => {
  const [copied, setCopied] = useState(false);
  
  // Primary: neural output.day_type.type
  const dayType = output?.day_type?.type || output?.day_type_morph || "ANALYZING";
  
  const narrative = output?.one_liner || "Processing Signal Flux...";
  const valueAcceptance = output?.value_acceptance || "Calculating...";
  const tpoRead = output?.tpo_read;
  const reasoning = output?.day_type_reasoning || [];

  // Calculate current strength using shared util
  const currentIB = currentSnapshot?.input?.intraday?.ib;
  const currentStrength = useMemo(() => calculateTrendStrength(currentIB), [currentIB]);

  // Generate Morph History
  const morphHistory = useMemo(() => {
      // Filter snapshots up to current display time (Point-in-Time view)
      // "Since selected" in this context means showing the history leading up to this moment
      const relevantSnapshots = allSnapshots
        .filter(s => s.input.current_et_time <= time)
        .sort((a, b) => b.input.current_et_time.localeCompare(a.input.current_et_time)); // Newest first

      return relevantSnapshots.map(s => ({
          time: s.input.current_et_time,
          // Tracking neural output.day_type_morph preferentially for history tracking
          dayType: s.decoded?.day_type_morph || s.decoded?.day_type?.type || 'N/A',
          strength: calculateTrendStrength(s.input.intraday.ib)
      }));
  }, [allSnapshots, time]);

  const handleCopy = () => {
    const text = `
**Brief Summary - ${time}**

* **Day Type:** ${dayType}
* **Trend Strength:** ${currentStrength}
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
        className={`absolute -top-2 right-0 p-1.5 rounded-lg transition-all z-10 ${
            copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'
        }`}
        title="Copy Brief"
      >
        {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mt-2">
          {/* Day Type */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl flex flex-col justify-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Day Type</span>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-black text-slate-200 tracking-tight truncate" title={dayType}>{dayType}</span>
            </div>
          </div>

          {/* Trend Strength */}
          <div className={`border p-4 rounded-3xl flex flex-col justify-center ${getStrengthColor(currentStrength)}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest mb-1.5 opacity-80">Trend Strength</span>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-black tracking-tight">{currentStrength}</span>
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl flex flex-col justify-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confidence</span>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-black text-slate-200 tracking-tight">{output?.confidence || '0%'}</span>
            </div>
          </div>
      </div>

      {/* Narrative */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <Fingerprint className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Core Synthesis</span>
          </div>
          <p className="text-lg font-bold italic text-white leading-relaxed tracking-tight opacity-90">"{narrative}"</p>
      </div>

      {/* Session Morph Tracker (Scrollable Box) */}
      {morphHistory.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[1.5rem] overflow-hidden shadow-lg">
              <div className="px-6 py-3 border-b border-slate-800/50 flex items-center justify-between bg-slate-950/30">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Session Morph Tracker</h4>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">{morphHistory.length} Slices</span>
              </div>
              
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                      <thead className="bg-slate-950/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                          <tr>
                              <th className="px-6 py-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Time</th>
                              <th className="px-6 py-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Day Type Morph</th>
                              <th className="px-6 py-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider text-right">Strength</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                          {morphHistory.map((entry, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-6 py-2 text-[10px] font-mono text-slate-400 font-bold group-hover:text-slate-300">{entry.time}</td>
                                  <td className="px-6 py-2 text-[10px] font-bold text-slate-300 uppercase group-hover:text-white truncate max-w-[150px]" title={entry.dayType}>{entry.dayType}</td>
                                  <td className="px-6 py-2 text-right">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border inline-block min-w-[60px] text-center ${getStrengthColor(entry.strength)}`}>
                                          {entry.strength}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* TPO Structure */}
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

      {/* Logic Driver */}
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
