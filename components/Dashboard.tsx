
import React, { useState, useMemo } from 'react';
import { MarketSnapshot, DecodedOutput } from '../types';
import { 
  Activity, 
  Target, 
  Info,
  Globe,
  BarChartHorizontal,
  Brain,
  Zap,
  Fingerprint,
  Route,
  CheckCircle2,
  Cpu,
  Layers,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Terminal,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  Minus,
  ScanBarcode,
  History,
  Grid3X3,
  Timer,
  TrendingDown,
  TrendingUp,
  Move,
  LineChart,
  GitCommit,
  Maximize2,
  Minimize2,
  BarChart2,
  Waypoints,
  Gauge
} from 'lucide-react';
import MigrationChart from './MigrationChart';
import TPOChart from './TPOChart';

interface DashboardProps {
  snapshot: MarketSnapshot;
  output: DecodedOutput | null;
  allSnapshots?: MarketSnapshot[];
}

type TabType = 'brief' | 'logic' | 'intraday' | 'dpoc' | 'globex' | 'profile' | 'tpo' | 'thinking';

const Dashboard: React.FC<DashboardProps> = ({ snapshot, output, allSnapshots = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>('brief');
  
  const [showVWAP, setShowVWAP] = useState(true);
  const [showIB, setShowIB] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [showGlobex, setShowGlobex] = useState(false);
  const [showEMAs, setShowEMAs] = useState(false);
  const [showDPOC, setShowDPOC] = useState(true);
  const [showOHLC, setShowOHLC] = useState(true);
  
  const input = snapshot?.input;
  const intraday = input?.intraday;
  const core = input?.core_confluences;
  const premarket = input?.premarket;
  const ib = intraday?.ib;
  const vol = intraday?.volume_profile;
  const tpo = intraday?.tpo_profile;
  const fvgs = intraday?.fvg_detection;
  const wicks = intraday?.wick_parade;
  const dpocData = intraday?.dpoc_migration;
  
  // Prefer dpoc_history from dpoc_migration, fall back to intraday direct property
  const dpocHistory = dpocData?.dpoc_history || intraday?.dpoc_history;

  // Calculate or retrieve DPOC slices (Accumulate from history to ensure no drops)
  const derivedSlices = useMemo(() => {
    // 1. Priority: Use explicit dpoc_history from the current snapshot
    if (dpocHistory && dpocHistory.length > 0) {
      return dpocHistory.map(h => ({ time: h.slice, dpoc: h.dpoc })).sort((a, b) => a.time.localeCompare(b.time));
    }

    // 2. Fallback: Collect slices from historical snapshots
    const sliceMap = new Map<string, number>();
    
    // Determine the range of snapshots to consider (up to current)
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const relevant = currentIndex >= 0 ? allSnapshots.slice(0, currentIndex + 1) : [snapshot];

    // Iterate through history to build comprehensive slice list
    relevant.forEach(s => {
        const slices = s.input?.intraday?.dpoc_migration?.dpoc_slices;
        if (Array.isArray(slices)) {
            slices.forEach(slice => {
                if (slice.time && typeof slice.dpoc === 'number') {
                    sliceMap.set(slice.time, slice.dpoc);
                }
            });
        }
    });

    if (sliceMap.size > 0) {
        return Array.from(sliceMap.entries())
            .map(([time, dpoc]) => ({ time, dpoc }))
            .sort((a, b) => a.time.localeCompare(b.time));
    }

    // 3. Fallback to computed if no explicit slices found
    const computed: { time: string; dpoc: number }[] = [];
    let lastPoc: number | null = null;
    
    relevant.forEach(s => {
        const poc = s.input?.intraday?.volume_profile?.current_session?.poc;
        const time = s.input?.current_et_time;
        
        if (typeof poc === 'number' && poc > 0 && time) {
            // Add if changed from previous
            if (lastPoc === null || Math.abs(poc - lastPoc) > 0.01) {
                computed.push({ time, dpoc: poc });
                lastPoc = poc;
            }
        }
    });
    return computed;
  }, [allSnapshots, snapshot, dpocHistory]);

  const chartData = useMemo(() => {
    if (!allSnapshots || allSnapshots.length === 0) return [];
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const visibleSnapshots = allSnapshots.slice(0, Math.max(0, currentIndex + 1));
    const historicalSlices = derivedSlices;

    return visibleSnapshots.map(s => {
      const inp = s.input;
      const ibData = inp?.intraday?.ib;
      const t = inp?.current_et_time || '00:00';
      const isPostIB = t >= "10:30";

      let activeDPOC = inp?.intraday?.volume_profile?.current_session?.poc || ibData?.current_close || 0;
      
      const applicableSlices = historicalSlices.filter(slice => slice.time <= t);
      if (applicableSlices.length > 0) {
        activeDPOC = applicableSlices[applicableSlices.length - 1].dpoc;
      }

      const matchingSlice = historicalSlices.find(slice => slice.time === t);

      return {
        time: t,
        dpoc: activeDPOC,
        dpoc_marker: matchingSlice ? matchingSlice.dpoc : null, 
        open: ibData?.current_open || 0,
        high: ibData?.current_high || 0,
        low: ibData?.current_low || 0,
        close: ibData?.current_close || 0,
        vwap: ibData?.current_vwap || 0,
        ema20: ibData?.ema20 || 0,
        ema50: ibData?.ema50 || 0,
        ema200: ibData?.ema200 || 0,
        ibh: isPostIB ? (ibData?.ib_high || null) : null,
        ibl: isPostIB ? (ibData?.ib_low || null) : null
      };
    });
  }, [allSnapshots, snapshot, intraday, derivedSlices]);

  const reasoning = output?.day_type_reasoning || [];
  const narrative = output?.one_liner || "Processing Signal Flux...";
  const bias = (output?.bias || 'NEUTRAL').toUpperCase();
  const isLong = bias.includes('LONG');
  const isShort = bias.includes('SHORT');
  const dayType = output?.day_type?.type || "ANALYZING";
  const valueAcceptance = output?.value_acceptance || "Calculating...";
  const tpoRead = output?.tpo_read;
  
  const thinkingText = output?.thinking || 
    snapshot?.decoded?.thinking || 
    (typeof snapshot?.output === 'string' && snapshot.output.includes('<think>') 
      ? snapshot.output.split('<think>')[1].split('</think>')[0] 
      : null);

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-2 py-3.5 rounded-xl transition-all border ${
        activeTab === id 
          ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' 
          : 'bg-slate-900/40 text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
      }`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  const ToggleButton = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label, 
    activeClass 
  }: { 
    active: boolean; 
    onClick: () => void; 
    icon: any; 
    label: string; 
    activeClass: string;
  }) => (
    <button 
      onClick={onClick} 
      className={`p-2 rounded-lg transition-all relative group ${
        active ? activeClass : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-[9px] font-black uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
        {label}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
      </div>
    </button>
  );

  const getRegimeColor = (regime: string = '') => {
    if (regime.includes('trending_on_the_move')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (regime.includes('potential_bpr_reversal')) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    if (regime.includes('stabilizing_hold')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (regime.includes('trending_fading_momentum')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Strategic Banner */}
      <div className={`shrink-0 border p-5 rounded-[2rem] flex items-center justify-between gap-6 shadow-2xl relative overflow-hidden transition-all duration-700 ${
        isLong ? 'bg-emerald-500/10 border-emerald-500/30' : 
        isShort ? 'bg-rose-500/10 border-rose-500/30' : 
        'bg-indigo-500/10 border-indigo-500/30'
      }`}>
        <div className="flex items-center gap-5 relative z-10 overflow-hidden">
          <div className={`p-3.5 rounded-2xl border flex items-center justify-center shadow-lg shrink-0 ${
            isLong ? 'bg-emerald-500 text-white border-emerald-400' : 
            isShort ? 'bg-rose-500 text-white border-rose-400' : 
            'bg-indigo-600 text-white border-indigo-400'
          }`}>
            {isLong ? <ArrowUpRight className="w-6 h-6" /> : isShort ? <ArrowDownRight className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
             <span className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-1.5 block ${isLong ? 'text-emerald-400' : isShort ? 'text-rose-400' : 'text-indigo-400'}`}>
               Intelligence Protocol
             </span>
             <h3 className="text-xl font-black text-white italic tracking-tight uppercase leading-none truncate" title={narrative}>"{narrative}"</h3>
          </div>
        </div>
        <div className="flex items-center gap-6 pr-2 relative z-10 shrink-0">
           <div className="text-right hidden xl:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Trust Score</span>
              <div className="text-2xl font-mono font-black text-slate-100 tracking-tighter">{output?.confidence || '0%'}</div>
           </div>
           <div className={`px-8 py-3.5 rounded-xl border font-black text-lg tracking-[0.2em] shadow-xl ${
             isLong ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' : 
             isShort ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20' : 
             'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
           }`}>
             {bias}
           </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left Side: Chart (Takes remaining space) */}
        <div className="flex-1 min-w-0 bg-slate-900/40 border border-slate-800 rounded-[2rem] p-5 flex flex-col shadow-inner relative group min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
             <div className="flex items-center gap-3">
               <Terminal className="w-4 h-4 text-indigo-400" />
               <h2 className="text-xs font-black uppercase tracking-widest text-white">Migration Matrix</h2>
             </div>
             <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-xl scale-90">
                <ToggleButton active={showGlobex} onClick={() => setShowGlobex(!showGlobex)} icon={Globe} label="Globex" activeClass="bg-amber-600 text-white shadow-lg" />
                <ToggleButton active={showProfile} onClick={() => setShowProfile(!showProfile)} icon={Layers} label="Profile" activeClass="bg-sky-600 text-white shadow-lg" />
                <ToggleButton active={showDPOC} onClick={() => setShowDPOC(!showDPOC)} icon={GitCommit} label="DPOC Trace" activeClass="bg-indigo-600 text-white shadow-lg" />
                <div className="w-px h-5 bg-slate-700/50 mx-1"></div>
                <ToggleButton active={showEMAs} onClick={() => setShowEMAs(!showEMAs)} icon={LineChart} label="EMAs" activeClass="bg-violet-600 text-white shadow-lg" />
                <ToggleButton active={showVWAP} onClick={() => setShowVWAP(!showVWAP)} icon={Target} label="VWAP" activeClass="bg-amber-400/80 text-white shadow-lg" />
                <ToggleButton active={showIB} onClick={() => setShowIB(!showIB)} icon={Shield} label="IB Levels" activeClass="bg-orange-600 text-white shadow-lg" />
                <ToggleButton active={showFVG} onClick={() => setShowFVG(!showFVG)} icon={Zap} label="FVG Zones" activeClass="bg-rose-600 text-white shadow-lg" />
                <div className="w-px h-5 bg-slate-700/50 mx-1"></div>
                <ToggleButton active={showOHLC} onClick={() => setShowOHLC(!showOHLC)} icon={BarChart2} label="Candles" activeClass="bg-emerald-600 text-white shadow-lg" />
             </div>
          </div>
          <div className="flex-1 bg-slate-950/60 rounded-2xl overflow-hidden border border-slate-800/60 shadow-inner min-h-0">
            <MigrationChart 
              data={chartData} 
              currentPrice={Number(ib?.current_close) || 0} 
              showOHLC={showOHLC} 
              showVWAP={showVWAP} 
              showEMA={showEMAs}
              showInstitutional={showGlobex}
              showIB={showIB}
              showProfile={showProfile}
              showFVG={showFVG}
              showDPOC={showDPOC}
              levels={{
                ...premarket as any,
                previous_week_high: premarket?.previous_week_high,
                previous_week_low: premarket?.previous_week_low
              }} 
              profileLevels={{ 
                vah: Number(tpo?.current_vah) || Number(vol?.current_session?.vah) || 0,
                poc: Number(tpo?.current_poc) || Number(vol?.current_session?.poc) || 0,
                val: Number(tpo?.current_val) || Number(vol?.current_session?.val) || 0
              }}
              fvgData={fvgs as any} 
            />
          </div>
        </div>

        {/* Right Side: Analytical Matrix (FIXED WIDTH) */}
        <div className="w-[480px] xl:w-[540px] shrink-0 flex flex-col bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl min-h-0">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 shrink-0 overflow-x-auto custom-scrollbar">
             <div className="flex gap-2 min-w-max">
                <TabButton id="brief" label="Brief" icon={Info} />
                <TabButton id="logic" label="Logic" icon={Cpu} />
                <TabButton id="intraday" label="Intraday" icon={Timer} />
                <TabButton id="dpoc" label="DPOC" icon={Waypoints} />
                <TabButton id="globex" label="Globex" icon={Globe} />
                <TabButton id="profile" label="Profile" icon={BarChartHorizontal} />
                <TabButton id="tpo" label="TPO" icon={Grid3X3} />
                {thinkingText && <TabButton id="thinking" label="Think" icon={Brain} />}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/20">
            {activeTab === 'brief' && (
              <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                {/* 1. Header Grid: Day Type, Confidence */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* 2. One Liner (Core Synthesis) */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-3 text-indigo-400">
                     <Fingerprint className="w-5 h-5" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Core Synthesis</span>
                   </div>
                   <p className="text-lg font-bold italic text-white leading-relaxed tracking-tight opacity-90">"{narrative}"</p>
                </div>

                {/* 3. Value Acceptance */}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
                   <div className="flex items-center gap-2 mb-3 text-sky-400">
                     <AlignJustify className="w-5 h-5" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Value Acceptance</span>
                   </div>
                   <p className="text-sm font-mono font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
                     {valueAcceptance}
                   </p>
                </div>

                {/* 4. TPO Read */}
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

                {/* 5. Reasoning (Confluence Matrix) */}
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
            )}

            {activeTab === 'logic' && (
              <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                 {/* Logic Note */}
                 {core?.note && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-mono font-medium text-indigo-200 leading-relaxed italic">"{core.note}"</p>
                    </div>
                 )}
                 <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                     <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-orange-400" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">IB Acceptance</h4>
                     </div>
                     <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                           <span className="text-[11px] font-bold text-slate-500">Close Above IBH</span>
                           <span className={`text-xs font-mono font-black ${core?.ib_acceptance?.close_above_ibh ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {core?.ib_acceptance?.close_above_ibh ? 'YES' : 'NO'}
                           </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                           <span className="text-[11px] font-bold text-slate-500">Close Below IBL</span>
                           <span className={`text-xs font-mono font-black ${core?.ib_acceptance?.close_below_ibl ? 'text-rose-400' : 'text-slate-600'}`}>
                              {core?.ib_acceptance?.close_below_ibl ? 'YES' : 'NO'}
                           </span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-bold text-slate-500">Accepted Higher</span>
                           <span className={`text-[10px] font-black uppercase ${core?.ib_acceptance?.price_accepted_higher === 'Yes' ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {core?.ib_acceptance?.price_accepted_higher || 'NO'}
                           </span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[11px] font-bold text-slate-500">Accepted Lower</span>
                           <span className={`text-[10px] font-black uppercase ${core?.ib_acceptance?.price_accepted_lower === 'Yes' ? 'text-rose-400' : 'text-slate-600'}`}>
                              {core?.ib_acceptance?.price_accepted_lower || 'NO'}
                           </span>
                        </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                           <GitCommit className="w-4 h-4 text-indigo-400" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase">DPOC Position</span>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">Vs IBH</span>
                              <span className={`text-[10px] font-mono font-bold ${core?.dpoc_vs_ib?.dpoc_above_ibh ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {core?.dpoc_vs_ib?.dpoc_above_ibh ? '> IBH' : '---'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">Vs IBL</span>
                              <span className={`text-[10px] font-mono font-bold ${core?.dpoc_vs_ib?.dpoc_below_ibl ? 'text-rose-400' : 'text-slate-600'}`}>
                                {core?.dpoc_vs_ib?.dpoc_below_ibl ? '< IBL' : '---'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center border-t border-slate-800/50 pt-1.5">
                              <span className="text-[10px] text-slate-400">Shift</span>
                              <span className="text-[10px] font-mono text-slate-300 uppercase">{core?.dpoc_vs_ib?.dpoc_extreme_shift}</span>
                           </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                           <Minimize2 className="w-4 h-4 text-amber-400" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase">Compression</span>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">Vs VAH</span>
                              <span className={`text-[10px] font-mono font-bold ${core?.dpoc_compression?.compressing_against_vah ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {core?.dpoc_compression?.compressing_against_vah ? 'YES' : 'NO'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">Vs VAL</span>
                              <span className={`text-[10px] font-mono font-bold ${core?.dpoc_compression?.compressing_against_val ? 'text-rose-400' : 'text-slate-600'}`}>
                                {core?.dpoc_compression?.compressing_against_val ? 'YES' : 'NO'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center border-t border-slate-800/50 pt-1.5">
                              <span className="text-[10px] text-slate-400">Bias</span>
                              <span className="text-[9px] font-mono text-slate-300 uppercase truncate max-w-[80px]" title={core?.dpoc_compression?.compression_bias}>
                                {core?.dpoc_compression?.compression_bias}
                              </span>
                           </div>
                        </div>
                    </div>
                 </div>

                 <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                     <div className="flex items-center gap-3 mb-4">
                        <Route className="w-5 h-5 text-violet-400" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Migration Vector</h4>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="text-center">
                           <span className="text-[10px] text-slate-500 block mb-1">Net Direction</span>
                           <span className={`text-sm font-black uppercase ${
                             core?.migration?.net_direction === 'up' ? 'text-emerald-400' : 
                             core?.migration?.net_direction === 'down' ? 'text-rose-400' : 'text-slate-400'
                           }`}>{core?.migration?.net_direction}</span>
                        </div>
                         <div className="w-px h-8 bg-slate-800" />
                        <div className="text-center">
                           <span className="text-[10px] text-slate-500 block mb-1">Delta Pts</span>
                           <span className="text-sm font-mono font-bold text-white">{core?.migration?.pts_since_1030}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div className="text-center">
                           <span className="text-[10px] text-slate-500 block mb-1">Significant</span>
                           <span className={`text-sm font-black ${
                             core?.migration?.significant_up || core?.migration?.significant_down ? 'text-amber-400' : 'text-slate-600'
                           }`}>{core?.migration?.significant_up || core?.migration?.significant_down ? 'YES' : 'NO'}</span>
                        </div>
                     </div>
                 </div>
              </div>
            )}

            {activeTab === 'intraday' && (
               <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                  {/* IB Section */}
                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                     <div className="flex items-center gap-3 mb-5 border-b border-slate-800/50 pb-3">
                        <Shield className="w-5 h-5 text-orange-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initial Balance</span>
                     </div>
                     <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                         <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB High</span>
                            <span className="text-base font-mono font-black text-white">{Number(ib?.ib_high).toFixed(2)}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB Low</span>
                            <span className="text-base font-mono font-black text-white">{Number(ib?.ib_low).toFixed(2)}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Mid</span>
                            <span className="text-base font-mono font-black text-indigo-400">{Number(ib?.ib_mid).toFixed(2)}</span>
                         </div>
                         <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Range</span>
                            <span className="text-base font-mono font-black text-slate-300">{Number(ib?.ib_range).toFixed(2)} pts</span>
                         </div>
                         <div className="col-span-2 pt-2 border-t border-slate-800/50 flex items-center justify-between">
                             <span className="text-[10px] text-slate-500 font-bold uppercase">Status</span>
                             <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{ib?.ib_status}</span>
                         </div>
                     </div>
                  </div>

                  {/* Technicals Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                        <div className="flex items-center gap-2 mb-4">
                           <Activity className="w-4 h-4 text-sky-400" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Technicals</span>
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-500 font-bold">RSI (14)</span>
                              <span className={`text-sm font-mono font-black ${Number(ib?.rsi14) > 70 ? 'text-rose-400' : Number(ib?.rsi14) < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>{Number(ib?.rsi14).toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-500 font-bold">ATR (14)</span>
                              <span className="text-sm font-mono font-black text-slate-300">{Number(ib?.atr14).toFixed(2)}</span>
                           </div>
                           <div className="h-px bg-slate-800/50 my-2" />
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-sky-500/70 font-bold">EMA 20</span>
                              <span className="text-xs font-mono font-bold text-slate-400">{Number(ib?.ema20).toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-indigo-500/70 font-bold">EMA 50</span>
                              <span className="text-xs font-mono font-bold text-slate-400">{Number(ib?.ema50).toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-violet-500/70 font-bold">EMA 200</span>
                              <span className="text-xs font-mono font-bold text-slate-400">{Number(ib?.ema200).toFixed(2)}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                         <div className="flex items-center gap-2 mb-4">
                            <Move className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Context</span>
                         </div>
                         <div className="space-y-4">
                            <div>
                               <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Price vs IB</span>
                               <span className="text-xs font-black uppercase text-white tracking-tight">{ib?.price_vs_ib?.replace(/_/g, ' ')}</span>
                            </div>
                            <div>
                               <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Price vs VWAP</span>
                               <span className={`text-xs font-black uppercase tracking-tight ${ib?.price_vs_vwap === 'above' ? 'text-emerald-400' : 'text-rose-400'}`}>{ib?.price_vs_vwap}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-800/50">
                               <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Steps (10:30)</span>
                               <span className={`text-sm font-mono font-black ${Number(intraday?.dpoc_migration?.steps_since_1030) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {Number(intraday?.dpoc_migration?.steps_since_1030).toFixed(2)}
                               </span>
                            </div>
                         </div>
                     </div>
                  </div>

                  {/* Wick Parade */}
                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg">
                     <div className="flex items-center justify-between mb-5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Wick Parade ({wicks?.window_minutes || 60}m)</span>
                        <Zap className="w-5 h-5 text-amber-400" />
                     </div>
                     <div className="flex items-center gap-6 mb-5">
                        <div className="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center">
                           <span className="text-[10px] font-black uppercase text-emerald-600 mb-1">Bullish</span>
                           <span className="text-3xl font-black text-emerald-400">{wicks?.bullish_wick_parade_count}</span>
                        </div>
                        <div className="flex-1 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center">
                           <span className="text-[10px] font-black uppercase text-rose-600 mb-1">Bearish</span>
                           <span className="text-3xl font-black text-rose-400">{wicks?.bearish_wick_parade_count}</span>
                        </div>
                     </div>
                     {wicks?.note && (
                        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                           <p className="text-[10px] text-slate-500 font-mono leading-relaxed italic">"{wicks.note}"</p>
                        </div>
                     )}
                  </div>

                  {/* FVGs */}
                  <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                       <div className="flex items-center gap-2 mb-4">
                         <Zap className="w-4 h-4 text-amber-400" />
                         <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Active FVGs</span>
                      </div>
                      <div className="space-y-2">
                        {['1h_fvg', '15min_fvg', '5min_fvg'].map((key) => {
                             const list = (fvgs as any)?.[key] || [];
                             return (
                                 <div key={key} className="flex items-start gap-3 border-b border-slate-800/50 pb-2 last:border-0">
                                    <span className="text-[10px] font-mono text-slate-500 w-12 shrink-0">{key.replace('_fvg', '').toUpperCase()}</span>
                                    <div className="flex-1 flex flex-wrap gap-1">
                                       {list.length > 0 ? list.map((f: any, i: number) => (
                                           <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${f.type === 'bullish' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                              {f.bottom}-{f.top}
                                           </span>
                                       )) : <span className="text-[9px] text-slate-700 italic">None</span>}
                                    </div>
                                 </div>
                             );
                        })}
                      </div>
                  </div>
               </div>
            )}
            
            {/* ... rest of component ... */}
            {activeTab === 'dpoc' && (
               <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                  {/* Regime Banner */}
                  <div className={`p-5 rounded-3xl border text-center ${getRegimeColor(dpocData?.dpoc_regime)}`}>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">DPOC Regime</span>
                     <h2 className="text-lg font-black uppercase tracking-tight leading-none">
                       {dpocData?.dpoc_regime?.replace(/_/g, ' ') || 'ANALYZING...'}
                     </h2>
                  </div>

                  {/* Primary Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                         <div className="flex items-center gap-2 mb-3">
                            <Route className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vector</span>
                         </div>
                         <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Direction</span>
                                <span className={`text-sm font-black uppercase ${
                                   dpocData?.direction === 'up' ? 'text-emerald-400' : dpocData?.direction === 'down' ? 'text-rose-400' : 'text-slate-300'
                                }`}>{dpocData?.direction || 'FLAT'}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Net Mig.</span>
                                <span className="text-sm font-mono font-black text-white">{dpocData?.net_migration_pts} pts</span>
                             </div>
                             <div className="h-px bg-slate-800/50" />
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Velocity (Avg)</span>
                                <span className="text-xs font-mono font-bold text-slate-300">{dpocData?.avg_velocity_per_30min}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Velocity (Abs)</span>
                                <span className="text-xs font-mono font-bold text-slate-300">{dpocData?.abs_velocity}</span>
                             </div>
                         </div>
                     </div>

                     <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                         <div className="flex items-center gap-2 mb-3">
                            <Gauge className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Dynamics</span>
                         </div>
                         <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Retain %</span>
                                <span className="text-sm font-mono font-black text-white">{dpocData?.relative_retain_percent}%</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Cluster Rng</span>
                                <span className="text-xs font-mono font-bold text-slate-300">{dpocData?.cluster_range_last_4} pts</span>
                             </div>
                             <div className="h-px bg-slate-800/50" />
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Price vs Cluster</span>
                                <span className={`text-[10px] font-black uppercase ${
                                   dpocData?.price_vs_dpoc_cluster === 'above' ? 'text-emerald-400' : 
                                   dpocData?.price_vs_dpoc_cluster === 'below' ? 'text-rose-400' : 'text-slate-300'
                                }`}>{dpocData?.price_vs_dpoc_cluster}</span>
                             </div>
                         </div>
                     </div>
                  </div>

                  {/* Status Flags */}
                  <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Signal State</span>
                     <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
                           dpocData?.accelerating ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}>Accelerating</span>
                        <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
                           dpocData?.decelerating ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}>Decelerating</span>
                        <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
                           dpocData?.is_stabilizing ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}>Stabilizing</span>
                        <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
                           dpocData?.reclaiming_opposite ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}>Reclaiming Opp</span>
                        <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase ${
                           dpocData?.prior_exhausted ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}>Prior Exhausted</span>
                     </div>
                  </div>

                  {/* Note */}
                  {dpocData?.note && (
                     <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                        <p className="text-[10px] text-slate-400 italic leading-relaxed">"{dpocData.note}"</p>
                     </div>
                  )}

                  {/* History Table */}
                  {dpocHistory && dpocHistory.length > 0 && (
                      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg mt-4">
                          <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">DPOC History</span>
                              <History className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="overflow-y-auto max-h-60 custom-scrollbar rounded-xl border border-slate-800/50">
                              <table className="w-full text-left">
                                  <thead className="bg-slate-950/50 sticky top-0 z-10 backdrop-blur-sm">
                                      <tr>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">Slice</th>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider text-right">DPOC</th>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider text-right">Delta</th>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">Jump</th>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">Dev</th>
                                          <th className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 tracking-wider text-right">Bars</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/30">
                                      {dpocHistory.map((row, idx) => (
                                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                              <td className="px-4 py-2 text-[10px] font-mono font-bold text-slate-300">{row.slice}</td>
                                              <td className="px-4 py-2 text-[10px] font-mono font-bold text-indigo-400 text-right">{row.dpoc.toFixed(2)}</td>
                                              <td className={`px-4 py-2 text-[10px] font-mono font-bold text-right ${row.delta_pts > 0 ? 'text-emerald-400' : row.delta_pts < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                  {row.delta_pts !== 0 ? (row.delta_pts > 0 ? '+' : '') + row.delta_pts.toFixed(2) : '-'}
                                              </td>
                                              <td className="px-4 py-2 text-center">
                                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${row.jump ? 'bg-amber-500/20 text-amber-400' : 'text-slate-600'}`}>
                                                      {row.jump ? 'YES' : '-'}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-2 text-center">
                                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${row.developing ? 'bg-sky-500/20 text-sky-400' : 'text-slate-600'}`}>
                                                      {row.developing ? 'YES' : '-'}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-2 text-[10px] font-mono font-bold text-slate-400 text-right">{row.bar_count}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
               </div>
            )}
            
            {activeTab === 'globex' && (
               <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                  {[
                    { label: 'Asia Block', high: premarket?.asia_high, low: premarket?.asia_low, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
                    { label: 'London Block', high: premarket?.london_high, low: premarket?.london_low, color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/20' },
                    { label: 'Overnight Range', high: premarket?.overnight_high, low: premarket?.overnight_low, color: 'text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-500/20' }
                  ].map((s, i) => (
                    <div key={i} className={`border p-6 rounded-3xl flex items-center justify-between shadow-xl ${s.bg}`}>
                       <div className="flex items-center gap-3">
                          <Globe className={`w-4 h-4 ${s.color}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</span>
                       </div>
                       <div className="flex gap-8">
                          <div className="text-right">
                             <span className="text-[8px] text-slate-500 uppercase block font-black mb-0.5">High</span>
                             <span className="text-base font-mono font-black text-white">{Number(s.high).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-[8px] text-slate-500 uppercase block font-black mb-0.5">Low</span>
                             <span className="text-base font-mono font-black text-white">{Number(s.low).toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10"><Globe className="w-12 h-12 text-slate-100" /></div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Previous Day</span>
                          <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold">HIGH</span>
                                <span className="text-sm font-mono font-black text-white">{Number(premarket?.previous_day_high).toFixed(2)}</span>
                             </div>
                             <div className="h-px bg-slate-800/50" />
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold">LOW</span>
                                <span className="text-sm font-mono font-black text-white">{Number(premarket?.previous_day_low).toFixed(2)}</span>
                             </div>
                          </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10"><Globe className="w-12 h-12 text-slate-100" /></div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Previous Week</span>
                          <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold">HIGH</span>
                                <span className="text-sm font-mono font-black text-white">{Number(premarket?.previous_week_high).toFixed(2)}</span>
                             </div>
                             <div className="h-px bg-slate-800/50" />
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-bold">LOW</span>
                                <span className="text-sm font-mono font-black text-white">{Number(premarket?.previous_week_low).toFixed(2)}</span>
                             </div>
                          </div>
                      </div>
                  </div>
                  
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Compression</span>
                           <span className={`text-xs font-black uppercase tracking-wider ${premarket?.compression_flag ? 'text-amber-400' : 'text-slate-400'}`}>
                             {premarket?.compression_flag ? 'ACTIVE' : 'NONE'}
                           </span>
                        </div>
                        <div className="text-right">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Ratio</span>
                           <span className="text-sm font-mono font-black text-white">{premarket?.compression_ratio}</span>
                        </div>
                     </div>
                     
                     <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">SMT Divergence</span>
                           <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                             {premarket?.smt_preopen || 'N/A'}
                           </span>
                        </div>
                        <Activity className="w-5 h-5 text-slate-700" />
                     </div>
                  </div>
               </div>
            )}
            
            {/* ... rest of component ... */}
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-in fade-in duration-500 h-full flex flex-col">
                <div className="grid grid-cols-1 gap-5">
                   {[
                     { title: "Current Session", data: vol?.current_session, color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
                     { title: "Previous Day", data: vol?.previous_day, color: "text-slate-400", border: "border-slate-800", bg: "bg-slate-900/40" },
                     { title: "Previous 3 Days", data: vol?.previous_3_days, color: "text-slate-400", border: "border-slate-800", bg: "bg-slate-900/40" }
                   ].map((section, idx) => (
                     <div key={idx} className={`rounded-3xl border ${section.border} ${section.bg} p-6 shadow-xl relative overflow-hidden group`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Layers className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                           <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-5 ${section.color}`}>{section.title}</h3>
                           <div className="grid grid-cols-3 gap-6 mb-6">
                              <div>
                                 <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">POC</span>
                                 <span className="text-sm font-mono font-black text-white bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50 block w-fit">{Number(section.data?.poc).toFixed(2)}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">VAH</span>
                                 <span className="text-sm font-mono font-black text-slate-300 block">{Number(section.data?.vah).toFixed(2)}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">VAL</span>
                                 <span className="text-sm font-mono font-black text-slate-300 block">{Number(section.data?.val).toFixed(2)}</span>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                              <div>
                                 <span className="text-[9px] text-emerald-500/70 font-black uppercase tracking-wider block mb-2">HVN Nodes</span>
                                 <div className="flex flex-wrap gap-1.5">
                                    {(section.data?.hvn_nodes || []).map((n, i) => (
                                       <span key={i} className="text-[10px] font-mono font-bold text-slate-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">{n}</span>
                                    ))}
                                 </div>
                              </div>
                              <div>
                                 <span className="text-[9px] text-rose-500/70 font-black uppercase tracking-wider block mb-2">LVN Nodes</span>
                                 <div className="flex flex-wrap gap-1.5">
                                    {(section.data?.lvn_nodes || []).map((n, i) => (
                                       <span key={i} className="text-[10px] font-mono font-bold text-slate-300 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">{n}</span>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'tpo' && (
               <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
                  {/* ... tpo summary stats ... */}
                  <div className="grid grid-cols-2 gap-4 shrink-0">
                     <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Current POC</span>
                              <span className="text-sm font-mono font-black text-white">{Number(tpo?.current_poc).toFixed(2)}</span>
                           </div>
                           <div>
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Shape</span>
                              <span className="text-sm font-black text-indigo-400 uppercase">{tpo?.tpo_shape || "N/A"}</span>
                           </div>
                           <div className="col-span-2 pt-2 border-t border-slate-800/50 flex gap-4">
                              <div>
                                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">VAH</span>
                                 <span className="text-xs font-mono font-bold text-slate-300">{Number(tpo?.current_vah).toFixed(2)}</span>
                              </div>
                              <div>
                                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">VAL</span>
                                 <span className="text-xs font-mono font-bold text-slate-300">{Number(tpo?.current_val).toFixed(2)}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl shadow-lg">
                        <div className="grid grid-cols-2 gap-4 h-full">
                           <div className="flex flex-col justify-between">
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Single Prints</span>
                              <div className="space-y-1">
                                 <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Above</span>
                                    <span className="text-[10px] font-mono font-bold text-white">{tpo?.single_prints_above_vah || 0}</span>
                                 </div>
                                 <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Below</span>
                                    <span className="text-[10px] font-mono font-bold text-white">{tpo?.single_prints_below_val || 0}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col justify-between border-l border-slate-800 pl-4">
                              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Poor High/Low</span>
                              <div className="space-y-1">
                                 <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">High</span>
                                    <span className={`text-[10px] font-mono font-bold ${tpo?.poor_high ? 'text-rose-400' : 'text-slate-600'}`}>{tpo?.poor_high ? 'YES' : 'NO'}</span>
                                 </div>
                                 <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Low</span>
                                    <span className={`text-[10px] font-mono font-bold ${tpo?.poor_low ? 'text-rose-400' : 'text-slate-600'}`}>{tpo?.poor_low ? 'YES' : 'NO'}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* TPO Chart */}
                  <div className="flex-1 min-h-[400px]">
                     <TPOChart 
                        tpoProfile={tpo as any}
                        volumeProfile={vol?.current_session as any}
                        sessionHigh={Math.max(Number(ib?.current_high), Number(tpo?.current_vah) + 20)}
                        sessionLow={Math.min(Number(ib?.current_low), Number(tpo?.current_val) - 20)}
                        currentPrice={Number(ib?.current_close)}
                     />
                  </div>
               </div>
            )}
            
            {activeTab === 'thinking' && (
               <div className="h-full space-y-4 animate-in fade-in duration-500 flex flex-col">
                 <div className="bg-slate-900/80 border-l-4 border-indigo-600 border border-slate-800 rounded-3xl p-6 font-mono text-xs leading-relaxed text-slate-300 overflow-y-auto whitespace-pre-wrap shadow-2xl custom-scrollbar flex-1">
                   <div className="flex items-center gap-3 mb-5 text-indigo-400 border-b border-indigo-500/20 pb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                     <Brain className="w-4 h-4" />
                     <span className="text-[9px] font-black uppercase tracking-[0.5em]">Neural Trace Path</span>
                   </div>
                   {thinkingText}
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
