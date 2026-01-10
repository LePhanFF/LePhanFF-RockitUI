import React from 'react';
import { Info, Shield, GitCommit, Minimize2, Route, MapPin, BarChart3 } from 'lucide-react';

interface LogicTabProps {
  core: any;
}

const getBiasColor = (bias: string) => {
  if (!bias) return 'text-content-muted';
  const b = bias.toLowerCase();
  if (b.includes('bull') || b.includes('up') || b.includes('long') || b.includes('high') || b.includes('aggressive')) return 'text-emerald-400';
  if (b.includes('bear') || b.includes('down') || b.includes('short') || b.includes('low')) return 'text-rose-400';
  return 'text-content-muted';
};

const LogicTab: React.FC<LogicTabProps> = ({ core }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-4">
      {core?.note && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs font-mono font-medium text-indigo-200 leading-relaxed italic">"{core.note}"</p>
        </div>
      )}

      {/* Row 1: IB Acceptance & TPO Signals */}
      <div className="grid grid-cols-2 gap-4">
          {/* IB Acceptance */}
          <div className="bg-surface/60 border border-border p-5 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-orange-400" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-content">IB Acceptance</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-[10px] font-bold text-content-muted">Close &gt; IBH</span>
                    <span className={`text-[10px] font-mono font-black ${core?.ib_acceptance?.close_above_ibh ? 'text-emerald-400' : 'text-content-muted'}`}>
                      {core?.ib_acceptance?.close_above_ibh ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-[10px] font-bold text-content-muted">Close &lt; IBL</span>
                    <span className={`text-[10px] font-mono font-black ${core?.ib_acceptance?.close_below_ibl ? 'text-rose-400' : 'text-content-muted'}`}>
                      {core?.ib_acceptance?.close_below_ibl ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-content-muted">Acc. Higher</span>
                    <span className={`text-[10px] font-black uppercase ${core?.ib_acceptance?.price_accepted_higher === 'Yes' ? 'text-emerald-400' : 'text-content-muted'}`}>
                      {core?.ib_acceptance?.price_accepted_higher || 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-content-muted">Acc. Lower</span>
                    <span className={`text-[10px] font-black uppercase ${core?.ib_acceptance?.price_accepted_lower === 'Yes' ? 'text-rose-400' : 'text-content-muted'}`}>
                      {core?.ib_acceptance?.price_accepted_lower || 'NO'}
                    </span>
                </div>
              </div>
          </div>

          {/* TPO Signals */}
          <div className="bg-surface/60 border border-border p-5 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-content">TPO Signals</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-[10px] font-bold text-content-muted">Prints &gt; VAH</span>
                    <span className={`text-[10px] font-mono font-black ${core?.tpo_signals?.single_prints_above ? 'text-emerald-400' : 'text-content-muted'}`}>
                      {core?.tpo_signals?.single_prints_above ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-[10px] font-bold text-content-muted">Prints &lt; VAL</span>
                    <span className={`text-[10px] font-mono font-black ${core?.tpo_signals?.single_prints_below ? 'text-rose-400' : 'text-content-muted'}`}>
                      {core?.tpo_signals?.single_prints_below ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-content-muted">Fattening Up</span>
                    <span className={`text-[10px] font-black uppercase ${core?.tpo_signals?.fattening_upper ? 'text-emerald-400' : 'text-content-muted'}`}>
                      {core?.tpo_signals?.fattening_upper ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-content-muted">Fattening Down</span>
                    <span className={`text-[10px] font-black uppercase ${core?.tpo_signals?.fattening_lower ? 'text-rose-400' : 'text-content-muted'}`}>
                      {core?.tpo_signals?.fattening_lower ? 'YES' : 'NO'}
                    </span>
                </div>
              </div>
          </div>
      </div>

      {/* Row 2: DPOC & Compression */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface/60 border border-border p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <GitCommit className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-content-muted uppercase">DPOC Position</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-content-muted">Vs IBH</span>
                  <span className={`text-[10px] font-mono font-bold ${core?.dpoc_vs_ib?.dpoc_above_ibh ? 'text-emerald-400' : 'text-content-muted'}`}>
                    {core?.dpoc_vs_ib?.dpoc_above_ibh ? '> IBH' : '---'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-content-muted">Vs IBL</span>
                  <span className={`text-[10px] font-mono font-bold ${core?.dpoc_vs_ib?.dpoc_below_ibl ? 'text-rose-400' : 'text-content-muted'}`}>
                    {core?.dpoc_vs_ib?.dpoc_below_ibl ? '< IBL' : '---'}
                  </span>
                </div>
            </div>
        </div>
        <div className="bg-surface/60 border border-border p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
                <Minimize2 className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold text-content-muted uppercase">Compression</span>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-content-muted">Vs VAH</span>
                  <span className={`text-[10px] font-mono font-bold ${core?.dpoc_compression?.compressing_against_vah ? 'text-emerald-400' : 'text-content-muted'}`}>
                    {core?.dpoc_compression?.compressing_against_vah ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-content-muted">Vs VAL</span>
                  <span className={`text-[10px] font-mono font-bold ${core?.dpoc_compression?.compressing_against_val ? 'text-rose-400' : 'text-content-muted'}`}>
                    {core?.dpoc_compression?.compressing_against_val ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center">
                   <span className="text-[10px] text-content-muted font-bold">Bias</span>
                   <span className={`text-[10px] font-black uppercase ${getBiasColor(core?.dpoc_compression?.compression_bias)}`}>
                      {core?.dpoc_compression?.compression_bias || 'NONE'}
                   </span>
                </div>
            </div>
        </div>
      </div>

      {/* Row 3: Location & Migration */}
      <div className="grid grid-cols-2 gap-4">
        {/* Price Location */}
        <div className="bg-surface/60 border border-border p-5 rounded-3xl flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-pink-400" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-content">Location</h4>
            </div>
            <span className="text-sm font-black font-mono uppercase text-content tracking-tight mb-2 truncate">
                {core?.price_location?.location_label?.replace(/_/g, ' ') || 'UNKNOWN'}
            </span>
            <div className="flex gap-1 h-1.5 w-full bg-panel rounded-full overflow-hidden">
                <div className={`flex-1 transition-colors ${core?.price_location?.in_upper_third ? 'bg-emerald-500' : 'bg-transparent'}`} />
                <div className={`flex-1 transition-colors ${core?.price_location?.in_middle ? 'bg-amber-500' : 'bg-transparent'}`} />
                <div className={`flex-1 transition-colors ${core?.price_location?.in_lower_third ? 'bg-rose-500' : 'bg-transparent'}`} />
            </div>
        </div>

        {/* Migration Vector */}
        <div className="bg-surface/60 border border-border p-5 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
                <Route className="w-5 h-5 text-violet-400" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-content">Vector</h4>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                    <span className="text-[9px] text-content-muted block mb-1 uppercase font-bold">Direction</span>
                    <span className={`text-xs font-black uppercase ${
                    core?.migration?.net_direction === 'up' ? 'text-emerald-400' : 
                    core?.migration?.net_direction === 'down' ? 'text-rose-400' : 'text-content-muted'
                    }`}>{core?.migration?.net_direction || 'FLAT'}</span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                    <span className="text-[9px] text-content-muted block mb-1 uppercase font-bold">Since 10:30</span>
                    <span className={`text-xs font-mono font-black ${
                    (core?.migration?.pts_since_1030 || 0) > 0 ? 'text-emerald-400' : 
                    (core?.migration?.pts_since_1030 || 0) < 0 ? 'text-rose-400' : 'text-content-muted'
                    }`}>
                    {core?.migration?.pts_since_1030 ? `${core.migration.pts_since_1030 > 0 ? '+' : ''}${core.migration.pts_since_1030}` : '0'}
                    </span>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default LogicTab;