
import React, { useState } from 'react';
import { Route, Gauge, History, ArrowUpRight, ArrowDownRight, Activity, Copy, ClipboardCheck } from 'lucide-react';

interface DPOCTabProps {
  dpocData: any;
  dpocHistory: any[];
  time: string;
}

const getRegimeColor = (regime: string = '') => {
  if (regime.includes('trending_on_the_move')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (regime.includes('potential_bpr_reversal')) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  if (regime.includes('stabilizing_hold')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  if (regime.includes('trending_fading_momentum')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-content-muted bg-surface border-border';
};

const DPOCTab: React.FC<DPOCTabProps> = ({ dpocData, dpocHistory, time }) => {
  const [copied, setCopied] = useState(false);
  // Helpers for display
  const direction = dpocData?.direction || dpocData?.migration_direction || 'N/A';
  const netPts = dpocData?.net_migration_pts ?? dpocData?.steps_since_1030 ?? 0;
  const velocity = dpocData?.avg_velocity_per_30min ?? 0;

  const handleCopy = () => {
    const text = `
**DPOC Analysis - ${time}**

* **Regime:** ${dpocData?.dpoc_regime?.replace(/_/g, ' ') || 'ANALYZING...'}

* **Vector:**
  - Direction: ${direction}
  - Net Migration: ${Number(netPts).toFixed(2)} pts
  - Velocity: ${Number(velocity).toFixed(2)} / 30m

* **Dynamics:**
  - Momentum: ${dpocData?.accelerating ? 'Accelerating' : dpocData?.decelerating ? 'Decelerating' : 'Steady'}
  - Retain %: ${dpocData?.relative_retain_percent || 0}%

* **Signals:**
  - Stabilizing: ${dpocData?.is_stabilizing ? 'YES' : 'NO'}
  - Exhausted: ${dpocData?.prior_exhausted ? 'YES' : 'NO'}
  - Reclaiming Opposite: ${dpocData?.reclaiming_opposite ? 'YES' : 'NO'}
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
            title="Copy DPOC Data"
        >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <div className={`p-5 rounded-3xl border text-center mt-2 ${getRegimeColor(dpocData?.dpoc_regime)}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">DPOC Regime</span>
            <h2 className="text-lg font-black uppercase tracking-tight leading-none">
            {dpocData?.dpoc_regime?.replace(/_/g, ' ') || 'ANALYZING...'}
            </h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            {/* Vector Panel */}
            <div className="bg-surface/60 border border-border p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                    <Route className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-content-muted">Vector</span>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Direction</span>
                        <div className={`flex items-center gap-1 text-xs font-black uppercase ${
                            direction.toLowerCase().includes('up') ? 'text-emerald-400' : 
                            direction.toLowerCase().includes('down') ? 'text-rose-400' : 'text-content'
                        }`}>
                            {direction.toLowerCase().includes('up') && <ArrowUpRight className="w-3 h-3" />}
                            {direction.toLowerCase().includes('down') && <ArrowDownRight className="w-3 h-3" />}
                            {direction}
                        </div>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Net Migration</span>
                        <span className={`text-xs font-mono font-bold ${netPts > 0 ? 'text-emerald-400' : netPts < 0 ? 'text-rose-400' : 'text-content'}`}>
                            {netPts > 0 ? '+' : ''}{Number(netPts).toFixed(2)} pts
                        </span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Velocity / 30m</span>
                        <span className="text-xs font-mono font-bold text-accent">
                            {Number(velocity).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Dynamics Panel */}
            <div className="bg-surface/60 border border-border p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-content-muted">Dynamics</span>
                </div>
                <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Momentum</span>
                        <span className={`text-[10px] font-black uppercase ${
                            dpocData?.accelerating ? 'text-emerald-400' : 
                            dpocData?.decelerating ? 'text-rose-400' : 'text-content-muted'
                        }`}>
                            {dpocData?.accelerating ? 'Accelerating' : dpocData?.decelerating ? 'Decelerating' : 'Steady'}
                        </span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Cluster Range (4)</span>
                        <span className="text-xs font-mono font-bold text-content">
                            {Number(dpocData?.cluster_range_last_4 || 0).toFixed(2)}
                        </span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-content-muted">Retain %</span>
                        <span className="text-xs font-mono font-bold text-content">
                             {dpocData?.relative_retain_percent ? `${dpocData.relative_retain_percent}%` : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Signal State Chips */}
        <div className="bg-surface/60 border border-border p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-content-muted">Signal State</span>
            </div>
            <div className="flex flex-wrap gap-2">
                 <StateChip label="Stabilizing" active={dpocData?.is_stabilizing} color="sky" />
                 <StateChip label="Reclaiming Opposite" active={dpocData?.reclaiming_opposite} color="emerald" />
                 <StateChip label="Prior Exhausted" active={dpocData?.prior_exhausted} color="rose" />
                 <div className="px-2 py-1 rounded bg-panel border border-border text-[9px] font-mono text-content-muted uppercase">
                    Vs Cluster: <span className="text-content font-bold">{dpocData?.price_vs_dpoc_cluster || 'N/A'}</span>
                 </div>
            </div>
        </div>

        {dpocData?.note && (
            <div className="p-4 bg-surface/40 border border-border rounded-2xl">
            <p className="text-[10px] text-content-muted italic leading-relaxed">"{dpocData.note}"</p>
            </div>
        )}

        {/* History Table */}
        {dpocHistory && dpocHistory.length > 0 && (
            <div className="bg-surface/60 border border-border p-6 rounded-3xl shadow-lg mt-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-content-muted">DPOC History</span>
                    <History className="w-5 h-5 text-accent" />
                </div>
                <div className="rounded-xl border border-border/50">
                    <table className="w-full text-left">
                        <thead className="bg-panel">
                            <tr>
                                <th className="px-6 py-3 text-xs font-black uppercase text-content-muted tracking-wider">Slice</th>
                                <th className="px-6 py-3 text-xs font-black uppercase text-content-muted tracking-wider text-right">DPOC Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {dpocHistory.map((row, idx) => (
                                <tr key={idx} className="hover:bg-panel/50 transition-colors group">
                                    <td className="px-6 py-3 text-sm font-mono font-bold text-content group-hover:text-accent transition-colors">{row.slice}</td>
                                    <td className="px-6 py-3 text-sm font-mono font-bold text-accent text-right">{row.dpoc.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};

const StateChip = ({ label, active, color }: { label: string, active: boolean, color: string }) => {
    if (!active) return null;
    
    // Simple color mapping for tailwind
    const colorClasses: Record<string, string> = {
        sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };

    return (
        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${colorClasses[color] || 'bg-panel text-content'}`}>
            {label}
        </span>
    );
};

export default DPOCTab;
