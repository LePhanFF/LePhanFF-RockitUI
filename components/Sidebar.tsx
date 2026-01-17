
import React from 'react';
import { Cloud, RefreshCw, FileText, Cpu } from 'lucide-react';

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
            const bias = (s.decoded?.bias || 'NEUTRAL').toUpperCase();
            const confidence = s.decoded?.confidence || '0%';
            const confVal = parseInt(confidence.replace(/\D/g, '')) || 0;
            const isHighConf = confVal > 80;
            const [hh, mm] = (s.input.current_et_time || "00:00").split(':').map(Number);
            
            // Logic for general quarter session styling (00, 15, 30, 45)
            const isQuarterSession = !isNaN(hh) && !isNaN(mm) && 
                                     (hh > 9 || (hh === 9 && mm >= 30)) && 
                                     (mm % 15 === 0);
            
            // Logic for 30-min specific indicator (00, 30)
            const isPeriodClose = !isNaN(mm) && (mm === 0 || mm === 30);

            return (
              <button key={idx} onClick={() => { setSelectedIndex(idx); setAutoScroll(idx === processedSnapshots.length-1); }}
                className={`w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden ${
                  active 
                    ? 'bg-accent text-white border-accent shadow-xl scale-[1.02]' 
                    : isQuarterSession
                      ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
                      : 'bg-surface border-border hover:border-content-muted'
                }`}>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-black font-mono ${active ? 'text-white' : isQuarterSession ? 'text-yellow-600' : 'text-content-muted'}`}>{s.input.current_et_time}</span>
                      
                      {/* 30m Period Indicator - Enhanced Visibility */}
                      {isPeriodClose && (
                         <div className="flex relative h-3 w-3 ml-2 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,1)]"></span>
                         </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold ${isHighConf ? 'animate-pulse text-emerald-500' : 'text-content-muted'}`}>
                       {confidence}
                    </span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter ${
                    active ? 'bg-white/20' : bias.includes('LONG') ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : bias.includes('SHORT') ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 'text-content-muted bg-panel'
                  }`}>
                    {bias}
                  </span>
                </div>
              </button>
            );
          }).reverse()}
        </div>
      </div>
    </aside>
  );
};
