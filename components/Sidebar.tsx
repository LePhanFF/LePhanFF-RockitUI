
import React from 'react';
import { Cloud, RefreshCw, FileText, Cpu, Activity, Zap } from 'lucide-react';
import { calculateTrendStrength } from '../utils/dataHelpers';

interface SidebarProps {
  availableFiles: string[];
  selectedFile: string | null;
  isListLoading: boolean;
  fetchFileList: () => void;
  handleFileSelect: (f: string) => void;
  processedSnapshots: any[];
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  setAutoScroll: (enabled: boolean) => void;
}

const getStrengthColor = (s: string) => {
    switch(s) {
        case 'SUPER': return 'text-purple-400';
        case 'STRONG': return 'text-emerald-400';
        case 'MODERATE': return 'text-amber-400';
        case 'WEAK': return 'text-orange-400';
        default: return 'text-slate-500';
    }
};

export const Sidebar: React.FC<SidebarProps> = ({
  availableFiles,
  selectedFile,
  isListLoading,
  fetchFileList,
  handleFileSelect,
  processedSnapshots,
  selectedIndex,
  setSelectedIndex,
  setAutoScroll
}) => {
  return (
    <aside className="w-72 border-r border-border bg-surface/50 flex flex-col shrink-0 transition-colors duration-500">
      {/* Bucket Browser */}
      <div className="p-5 border-b border-border">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-muted">Bucket</span>
            </div>
            <button onClick={() => fetchFileList()} className="p-1.5 hover:bg-panel rounded-lg transition-all group">
              <RefreshCw className={`w-4 h-4 text-content-muted group-hover:text-accent ${isListLoading ? 'animate-spin' : ''}`} />
            </button>
         </div>
         
         <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {availableFiles.length === 0 && !isListLoading ? (
              <div className="text-[10px] text-content-muted font-mono text-center py-4 italic">No Files Found</div>
            ) : (
              availableFiles.map(f => (
                <button key={f} onClick={() => handleFileSelect(f)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-mono transition-all border ${
                    selectedFile === f ? 'bg-accent/20 text-accent border-accent/40 shadow-lg' : 'text-content-muted border-transparent hover:bg-panel'
                  }`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 opacity-50" />
                    {f}
                  </div>
                </button>
              ))
            )}
         </div>
      </div>

      {/* Snapshot Sequence */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Cpu className="w-3.5 h-3.5 text-content-muted" />
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-content-muted">Session Sequence</h3>
        </div>
        <div className="space-y-2.5">
          {processedSnapshots.map((s, idx) => {
            const active = idx === selectedIndex;
            
            // Decoded Values
            const bias = (s.decoded?.bias || 'NEUTRAL').toUpperCase();
            // Tracking day_type_morph, falling back to day_type.type
            const dayType = s.decoded?.day_type_morph || s.decoded?.day_type?.type || '---';
            const confidence = s.decoded?.confidence || '0%';
            const confVal = parseInt(confidence.replace(/\D/g, '')) || 0;
            const isHighConf = confVal > 80;
            
            // Derived Values - Strength
            const strength = calculateTrendStrength(s.input?.intraday?.ib);
            const [hh, mm] = (s.input.current_et_time || "00:00").split(':').map(Number);
            
            const isQuarterSession = !isNaN(hh) && !isNaN(mm) && 
                                     (hh > 9 || (hh === 9 && mm >= 30)) && 
                                     (mm % 15 === 0);
            
            const isPeriodClose = !isNaN(mm) && (mm === 0 || mm === 30);

            // Bias Color Logic
            let biasColorClass = 'text-content-muted bg-panel border border-border';
            if (bias.includes('LONG') || bias.includes('BULL')) {
                biasColorClass = 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20';
            } else if (bias.includes('SHORT') || bias.includes('BEAR')) {
                biasColorClass = 'text-rose-500 bg-rose-500/10 border border-rose-500/20';
            } else if (bias.includes('NEUTRAL')) {
                biasColorClass = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
            }

            return (
              <button key={idx} onClick={() => { setSelectedIndex(idx); setAutoScroll(idx === processedSnapshots.length-1); }}
                className={`w-full text-left p-3 rounded-2xl transition-all border group relative overflow-hidden ${
                  active 
                    ? 'bg-accent text-white border-accent shadow-xl scale-[1.02]' 
                    : isQuarterSession
                      ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
                      : 'bg-surface border-border hover:border-content-muted'
                }`}>
                
                {/* Top Row: Time & Strength */}
                <div className="flex items-center justify-between relative z-10 mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black font-mono ${active ? 'text-white' : isQuarterSession ? 'text-yellow-600' : 'text-content-muted'}`}>
                            {s.input.current_et_time}
                        </span>
                        {isPeriodClose && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                        )}
                    </div>
                    {strength !== "NA" && (
                        <div className="flex items-center gap-1">
                            <Zap className={`w-3 h-3 ${active ? 'text-white' : getStrengthColor(strength)}`} />
                            <span className={`text-[9px] font-black uppercase ${active ? 'text-white/90' : getStrengthColor(strength)}`}>
                                {strength}
                            </span>
                        </div>
                    )}
                </div>

                {/* Bottom Row: Day Type & Bias */}
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <Activity className={`w-3 h-3 shrink-0 ${active ? 'text-white/70' : 'text-slate-500'}`} />
                        <span className={`text-[9px] font-bold uppercase truncate max-w-[80px] ${active ? 'text-white/90' : 'text-slate-400'}`} title={dayType}>
                            {dayType}
                        </span>
                    </div>
                    
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight shrink-0 ${
                        active ? 'bg-white/20 text-white' : biasColorClass
                    }`}>
                        {bias}
                    </span>
                </div>
                
                {isHighConf && !active && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-bl shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                )}
              </button>
            );
          }).reverse()}
        </div>
      </div>
    </aside>
  );
};
