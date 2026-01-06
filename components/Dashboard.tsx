
import React, { useState, useMemo } from 'react';
import { MarketSnapshot, DecodedOutput, ProfileSet, DPOCSlice, FVG, DPOCStep } from '../types';
import { 
  Activity, 
  Target, 
  Info,
  Globe,
  BarChartHorizontal,
  Brain,
  CandlestickChart,
  LineChart,
  ShieldCheck,
  Zap,
  Compass,
  Fingerprint,
  Route,
  CheckCircle2,
  Cpu,
  ZapOff,
  History,
  TrendingUp,
  Layers,
  SearchCode,
  Shield,
  ArrowUpToLine,
  ArrowDownToLine,
  Box,
  LayoutGrid,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Maximize2,
  ZapOff as Ghost,
  Gauge,
  Clock,
  ArrowRight,
  Wind,
  Share2,
  ChevronRight
} from 'lucide-react';
import MigrationChart from './MigrationChart';

interface DashboardProps {
  snapshot: MarketSnapshot & { thinking?: string };
  output: DecodedOutput | null;
  allSnapshots?: MarketSnapshot[];
}

type TabType = 'brief' | 'logic' | 'globex' | 'profile' | 'migration' | 'gaps' | 'thinking';

const StatBox = ({ label, value, colorClass = "text-slate-100", compact = false }: { label: string; value: string | number; colorClass?: string; compact?: boolean }) => (
  <div className={`bg-slate-900/40 border border-slate-800/40 rounded-xl hover:border-indigo-500/30 transition-all ${compact ? 'p-2' : 'p-4'}`}>
    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1 block leading-none">{label}</span>
    <div className={`font-black uppercase tracking-tighter leading-none ${compact ? 'text-xs' : 'text-base'} ${colorClass}`}>{value}</div>
  </div>
);

const ConfluenceCard = ({ title, icon: Icon, children }: { title: string; icon: any; children?: React.ReactNode }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-indigo-500/30 transition-all">
    <div className="flex items-center gap-2.5 mb-2">
      <Icon className="w-4 h-4 text-indigo-400" />
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{title}</h4>
    </div>
    <div className="space-y-2.5">
      {children}
    </div>
  </div>
);

const LogicBadge = ({ label, value, condition }: { label: string; value: string | boolean | number; condition?: boolean }) => {
  const isPositive = typeof value === 'boolean' ? value : condition;
  const displayValue = typeof value === 'boolean' ? (value ? 'YES' : 'NO') : value;
  
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
      <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
        isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
        isPositive === false ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
        'bg-slate-800 text-slate-400'
      }`}>
        {displayValue}
      </span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ snapshot, output, allSnapshots = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>('brief');
  
  const [showOHLC, setShowOHLC] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showInstitutional, setShowInstitutional] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [showIB, setShowIB] = useState(true);
  const [showMigrationTrace, setShowMigrationTrace] = useState(true);
  
  const input = snapshot?.input || {};
  const intraday = input?.intraday || {};
  const core = input?.core_confluences || {};
  const premarket = input?.premarket || {};
  const ib = intraday?.ib || {};
  const vol = intraday?.volume_profile || {};
  const tpo = intraday?.tpo_profile || {};
  const fvgs = intraday?.fvg_detection || {};
  const mig = intraday?.dpoc_migration || { note: '' };
  const wicks = intraday?.wick_parade || { bullish_wick_parade_count: 0, bearish_wick_parade_count: 0 };

  const chartData = useMemo(() => {
    if (allSnapshots.length === 0) return [];
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const visibleSnapshots = allSnapshots.slice(0, currentIndex + 1);
    const historicalSlices = mig.dpoc_slices || [];
    const traceHistory = mig.dpoc_history || [];

    return visibleSnapshots.map(s => {
      const inp = s.input || {};
      const intra = inp.intraday || {};
      const ibData = intra.ib || {};
      
      const matchedSlice = historicalSlices.find(sl => sl.time === inp.current_et_time);
      const fallbackSlice = [...historicalSlices].filter(sl => sl.time <= inp.current_et_time).sort((a, b) => b.time.localeCompare(a.time))[0];
      
      const traceMatch = traceHistory.find(th => th.slice === inp.current_et_time);

      return {
        time: inp.current_et_time,
        dpoc: matchedSlice?.dpoc || fallbackSlice?.dpoc || ibData.current_close,
        open: ibData.current_open,
        high: ibData.current_high,
        low: ibData.current_low,
        close: ibData.current_close,
        vwap: ibData.current_vwap,
        ema20: ibData.ema20,
        ema50: ibData.ema50,
        ibh: ibData.ib_high,
        ibl: ibData.ib_low,
        isMigrationStep: !!traceMatch,
        migrationValue: traceMatch ? traceMatch.dpoc : null,
        isJump: traceMatch?.jump || false,
        delta: traceMatch?.delta_pts || 0
      };
    }).filter(d => d.time);
  }, [allSnapshots, snapshot, mig]);

  const getReasoning = () => {
    if (!output) return [];
    const rawReasoning = output.day_type_reasoning || (output as any).evidence || (output as any).reasoning || (output as any).logic_points || (output as any).strategic_reasoning;
    if (Array.isArray(rawReasoning)) return rawReasoning;
    return [];
  };

  const reasoning = getReasoning();

  const getNarrative = () => {
    if (!output) return "Synchronizing Intelligence...";
    return output.one_liner || (output as any).narrative || "Context unavailable.";
  };

  const getDayType = () => {
    if (!output) return "N/A";
    const dt: any = output.day_type || (output as any).type;
    return typeof dt === 'object' ? dt.type : dt || "N/A";
  };

  const narrative = getNarrative();
  const dayType = getDayType();

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      <div className="flex-[2] flex flex-col gap-4 min-w-0">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col h-full shadow-2xl relative">
          <div className="flex items-start justify-between mb-4 shrink-0 gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0 mt-1"><Activity className="w-6 h-6 text-indigo-400" /></div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight">Migration Tracking</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Order Flow Context</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">{mig.migration_direction || mig.direction || 'STABLE'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/60">
              {[
                { active: showOHLC, setter: setShowOHLC, icon: CandlestickChart, color: 'text-emerald-400', label: 'OHLC' },
                { active: showMigrationTrace, setter: setShowMigrationTrace, icon: Share2, color: 'text-cyan-400', label: 'DPOC TRACE' },
                { active: showIB, setter: setShowIB, icon: Shield, color: 'text-orange-400', label: 'IB' },
                { active: showVWAP, setter: setShowVWAP, icon: Target, color: 'text-amber-400', label: 'VWAP' },
                { active: showEMA, setter: setShowEMA, icon: LineChart, color: 'text-cyan-400', label: 'EMA' },
                { active: showInstitutional, setter: setShowInstitutional, icon: Globe, color: 'text-sky-400', label: 'INST' },
                { active: showProfile, setter: setShowProfile, icon: Layers, color: 'text-indigo-400', label: 'PROF' },
                { active: showFVG, setter: setShowFVG, icon: Zap, color: 'text-rose-400', label: 'FVG' }
              ].map((btn, i) => (
                <button key={i} onClick={() => btn.setter(!btn.active)} className={`p-2 rounded-lg transition-all flex items-center gap-1 ${btn.active ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>
                  <btn.icon className={`w-3.5 h-3.5 ${btn.active ? btn.color : ''}`} />
                  <span className="text-[8px] font-black uppercase hidden lg:block">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-slate-950/20 rounded-xl border border-slate-800/30 overflow-hidden shadow-inner">
            <MigrationChart 
              data={chartData} 
              currentPrice={ib?.current_close || 0} 
              showOHLC={showOHLC} 
              showVWAP={showVWAP} 
              showEMA={showEMA}
              showInstitutional={showInstitutional}
              showIB={showIB}
              showProfile={showProfile}
              showFVG={showFVG}
              showMigrationTrace={showMigrationTrace}
              levels={premarket as any} 
              profileLevels={{ 
                vah: tpo?.current_vah || vol?.current_session?.vah || 0,
                poc: tpo?.current_poc || vol?.current_session?.poc || 0,
                val: tpo?.current_val || vol?.current_session?.val || 0
              }}
              fvgData={fvgs as any} 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-w-[460px]">
        <div className="flex border-b border-slate-800 p-1.5 gap-1 shrink-0 bg-slate-900/90 overflow-x-auto no-scrollbar">
          {[
            { id: 'brief', label: 'Brief', icon: Info },
            { id: 'logic', label: 'Logic', icon: Cpu },
            { id: 'migration', label: 'Migration', icon: Route },
            { id: 'globex', label: 'Globex', icon: Globe },
            { id: 'profile', label: 'Profile', icon: BarChartHorizontal },
            { id: 'gaps', label: 'Gaps', icon: SearchCode },
            { id: 'thinking', label: 'Think', icon: Brain }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/40">
          {activeTab === 'brief' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              {/* Narrative Section */}
              <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors rounded-2xl" />
                <div className="relative p-7 border border-indigo-500/30 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Fingerprint className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">One-Liner Narrative</span>
                  </div>
                  <p className="text-xl lg:text-2xl font-black italic text-slate-100 leading-[1.4] tracking-tight">"{narrative}"</p>
                </div>
              </div>

              {/* Bias & Confidence - Resized 1/3 smaller */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border transition-all ${output?.bias?.toUpperCase().includes('LONG') ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/5 border-rose-500/40 text-rose-400'}`}>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">System Bias</span>
                  <div className="text-xl font-black tracking-widest italic">{output?.bias?.toUpperCase() || 'NEUTRAL'}</div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">Confidence</span>
                  <div className="text-xl font-black text-slate-100 font-mono tracking-tighter">{output?.confidence || '0%'}</div>
                </div>
              </div>

              {/* Technical Data - MOVED ABOVE Strategic Evidence & Made More Compact */}
              <div className="bg-slate-900/20 border border-slate-800/40 rounded-2xl p-4">
                 <div className="flex items-center gap-2 mb-4">
                    <Wind className="w-3.5 h-3.5 text-indigo-400" />
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Terminal Technical Data</h4>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Day Type" value={dayType} compact />
                    <StatBox label="ATR (14)" value={ib?.atr14 ? ib.atr14.toFixed(2) : 'N/A'} colorClass="text-amber-400" compact />
                    <StatBox label="RSI (14)" value={ib?.rsi14 ? `${ib.rsi14.toFixed(1)}` : 'N/A'} colorClass={ib?.rsi14 > 70 ? 'text-rose-400' : ib?.rsi14 < 30 ? 'text-emerald-400' : 'text-slate-300'} compact />
                    <StatBox label="IB Range" value={ib?.ib_range ? ib.ib_range.toFixed(1) : 'N/A'} compact />
                    <StatBox label="Volume" value={ib?.current_volume ? (ib.current_volume / 1000).toFixed(1) + 'K' : 'N/A'} colorClass="text-indigo-400" compact />
                    <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-2 flex flex-col justify-center">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1 block leading-none">Wick Parade</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-400">B: {wicks.bullish_wick_parade_count || 0}</span>
                          <div className="h-3 w-px bg-slate-700" />
                          <span className="text-[10px] font-black text-rose-400">S: {wicks.bearish_wick_parade_count || 0}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Strategic Evidence Section */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-7">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20"><CheckCircle2 className="w-4 h-4 text-indigo-400" /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Strategic Intelligence Evidence</h4>
                 </div>
                 <div className="space-y-4">
                    {reasoning.length > 0 ? reasoning.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-4 group">
                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                        <p className="text-[14px] font-bold text-slate-400 leading-[1.5] tracking-tight group-hover:text-white transition-colors">{reason}</p>
                      </div>
                    )) : <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">Awaiting Analysis...</div>}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Route className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-200">DPOC Migration Engine</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                    (mig.direction || mig.migration_direction)?.toUpperCase().includes('UP') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                    (mig.direction || mig.migration_direction)?.toUpperCase().includes('DOWN') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
                    'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}>
                    {(mig.direction || mig.migration_direction)?.toUpperCase().includes('UP') ? <MoveUp className="w-4 h-4" /> : <MoveDown className="w-4 h-4" />}
                    <span className="text-xs font-black uppercase tracking-widest">{mig.direction || mig.migration_direction || 'FLAT'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/60 text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 block">Net Migration Points</span>
                    <div className="text-4xl font-mono font-black text-slate-100 tracking-tighter">
                      {mig.net_migration_pts?.toFixed(1) || mig.steps_since_1030?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/60 text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 block">Avg Velocity (30m)</span>
                    <div className="text-4xl font-mono font-black text-indigo-400 tracking-tighter">
                      {mig.avg_velocity_per_30min?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-6">
                   <div className="flex items-center gap-3 mb-4">
                      <Gauge className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Migration Regime</span>
                   </div>
                   <div className="text-xl font-black text-slate-100 uppercase italic tracking-tight mb-2">
                     {mig.dpoc_regime?.replace(/_/g, ' ') || 'STANDBY / EVALUATING'}
                   </div>
                   <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                     {mig.dpoc_regime?.includes('trending') ? 'High-confidence order flow expansion. Trend continuation is the primary arbiter.' : 
                      mig.dpoc_regime?.includes('stabilizing') ? 'Price is finding balance. DPOC is forming a significant floor or ceiling.' :
                      'Market in rotational balance. Expect mean reversion until DPOC breakout.'}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <ConfluenceCard title="Dynamic Status" icon={Activity}>
                    <LogicBadge label="Accelerating" value={mig.accelerating} />
                    <LogicBadge label="Decelerating" value={mig.decelerating} />
                    <LogicBadge label="Stabilizing" value={mig.is_stabilizing} />
                    <LogicBadge label="Prior Exhausted" value={mig.prior_exhausted} />
                  </ConfluenceCard>

                  <ConfluenceCard title="Flow Logic" icon={Maximize2}>
                    <LogicBadge label="Relative Retain %" value={mig.relative_retain_percent ? `${mig.relative_retain_percent}%` : '0%'} condition={(mig.relative_retain_percent || 0) > 70} />
                    <LogicBadge label="Cluster Range (L4)" value={mig.cluster_range_last_4 || '0.0'} condition={(mig.cluster_range_last_4 || 0) < 10} />
                    <LogicBadge label="Price vs DPOC cluster" value={mig.price_vs_dpoc_cluster || 'N/A'} condition={mig.price_vs_dpoc_cluster === 'above'} />
                    <LogicBadge label="Reclaiming Opposite" value={mig.reclaiming_opposite} />
                  </ConfluenceCard>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">30-Min DPOC Trace</h4>
                  </div>
                  <div className="space-y-3">
                    {(mig.dpoc_history || mig.dpoc_slices || []).slice(-6).reverse().map((step: any, i: number) => {
                      const isStep = step.slice !== undefined;
                      return (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/60 rounded-xl group hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-4">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[10px] font-mono font-black text-slate-400">{step.slice || step.time}</span>
                            <div className="h-4 w-px bg-slate-800" />
                            {isStep && step.jump && <Zap className="w-3 h-3 text-amber-400" />}
                            <span className="text-[11px] font-black text-slate-100 tracking-widest uppercase">
                              {isStep && step.delta_pts !== 0 ? (step.delta_pts > 0 ? 'Expansion Up' : 'Expansion Down') : 'Holding'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${step.developing ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                                {step.developing ? 'DEV' : 'SET'}
                             </span>
                             <span className="text-sm font-mono font-black text-indigo-400">{step.dpoc.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mig.note && (
                  <div className="mt-6 p-5 bg-slate-950 border border-indigo-500/20 rounded-2xl">
                    <p className="text-sm font-bold text-slate-300 italic leading-relaxed">"{mig.note}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logic' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <ConfluenceCard title="IB Acceptance" icon={Shield}>
                    <LogicBadge label="Above IBH" value={core.ib_acceptance?.close_above_ibh} />
                    <LogicBadge label="Below IBL" value={core.ib_acceptance?.close_below_ibl} />
                    <LogicBadge label="Acceptance H" value={core.ib_acceptance?.price_accepted_higher} condition={core.ib_acceptance?.price_accepted_higher === 'Yes'} />
                    <LogicBadge label="Acceptance L" value={core.ib_acceptance?.price_accepted_lower} condition={core.ib_acceptance?.price_accepted_lower === 'Yes'} />
                  </ConfluenceCard>

                  <ConfluenceCard title="DPOC vs IB" icon={Route}>
                    <LogicBadge label="DPOC > IBH" value={core.dpoc_vs_ib?.dpoc_above_ibh} />
                    <LogicBadge label="DPOC < IBL" value={core.dpoc_vs_ib?.dpoc_below_ibl} />
                    <LogicBadge label="Shift Status" value={core.dpoc_vs_ib?.dpoc_extreme_shift || 'NONE'} condition={core.dpoc_vs_ib?.dpoc_extreme_shift !== 'none'} />
                  </ConfluenceCard>

                  <ConfluenceCard title="Compression" icon={Maximize2}>
                    <LogicBadge label="Against VAH" value={core.dpoc_compression?.compressing_against_vah} />
                    <LogicBadge label="Against VAL" value={core.dpoc_compression?.compressing_against_val} />
                    <LogicBadge label="Bias" value={core.dpoc_compression?.compression_bias || 'NEUTRAL'} condition={!core.dpoc_compression?.compression_bias?.includes('none')} />
                  </ConfluenceCard>

                  <ConfluenceCard title="TPO Signals" icon={Fingerprint}>
                    <LogicBadge label="Single Prints H" value={core.tpo_signals?.single_prints_above} />
                    <LogicBadge label="Single Prints L" value={core.tpo_signals?.single_prints_below} />
                    <LogicBadge label="Fattening H" value={core.tpo_signals?.fattening_upper} />
                    <LogicBadge label="Fattening L" value={core.tpo_signals?.fattening_lower} />
                  </ConfluenceCard>

                  <ConfluenceCard title="Migration" icon={MoveUp}>
                    <LogicBadge label="Significant UP" value={core.migration?.significant_up} />
                    <LogicBadge label="Significant DOWN" value={core.migration?.significant_down} />
                    <LogicBadge label="Net Direction" value={core.migration?.net_direction || 'FLAT'} condition={core.migration?.net_direction !== 'flat'} />
                    <LogicBadge label="Pts From 10:30" value={core.migration?.pts_since_1030 || 0} condition={Math.abs(core.migration?.pts_since_1030 || 0) > 20} />
                  </ConfluenceCard>

                  <ConfluenceCard title="Price Location" icon={Target}>
                    <LogicBadge label="Label" value={core.price_location?.location_label || 'N/A'} condition={true} />
                    <LogicBadge label="Upper Third" value={core.price_location?.in_upper_third} />
                    <LogicBadge label="Lower Third" value={core.price_location?.in_lower_third} />
                    <LogicBadge label="Middle" value={core.price_location?.in_middle} />
                  </ConfluenceCard>
                </div>

                {core.note && (
                  <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Confluence Logic Note</span>
                    </div>
                    <p className="text-sm font-bold text-slate-400 italic leading-relaxed">"{core.note}"</p>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><LayoutGrid className="w-24 h-24" /></div>
                <div className="flex items-center gap-3 mb-6 relative">
                  <BarChartHorizontal className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-200">Authoritative TPO Fact Sheet</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-all text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Current VAH</span>
                    <div className="text-xl font-mono font-black text-slate-100 tracking-tighter">{tpo?.current_vah?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/40 shadow-lg text-center">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Current POC</span>
                    <div className="text-2xl font-mono font-black text-indigo-300 tracking-tighter">{tpo?.current_poc?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-all text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Current VAL</span>
                    <div className="text-xl font-mono font-black text-slate-100 tracking-tighter">{tpo?.current_val?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Box className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Structure Data</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">TPO Shape</span>
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{tpo?.tpo_shape || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Fattening Zone</span>
                        <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest">{tpo?.fattening_zone?.replace('_', ' ') || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Poor High Status</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${tpo?.poor_high ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-slate-600'}`}>
                          {tpo?.poor_high ? 'DETECTED' : 'STABLE'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Poor Low Status</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${tpo?.poor_low ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-slate-600'}`}>
                          {tpo?.poor_low ? 'DETECTED' : 'STABLE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rejection Signals</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Single Prints Above VAH</span>
                        </div>
                        <span className="text-2xl font-black text-emerald-400">+{tpo?.single_prints_above_vah || 0}</span>
                      </div>
                      <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Single Prints Below VAL</span>
                        </div>
                        <span className="text-2xl font-black text-rose-400">+{tpo?.single_prints_below_val || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {tpo?.note && (
                  <div className="mt-6 p-5 bg-slate-950 border border-indigo-500/20 rounded-2xl">
                    <p className="text-sm font-bold text-slate-300 italic leading-relaxed">"{tpo.note}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'globex' && (
            <div className="space-y-5 animate-in fade-in">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2"><Globe className="w-4 h-4" /> Overnight Profile</h4>
                   <div className="space-y-4">
                     {[
                       { label: 'Asia High', val: premarket?.asia_high, color: 'text-amber-400' },
                       { label: 'Asia Low', val: premarket?.asia_low, color: 'text-amber-600' },
                       { label: 'London High', val: premarket?.london_high, color: 'text-sky-400' },
                       { label: 'London Low', val: premarket?.london_low, color: 'text-sky-600' },
                       { label: 'ON High', val: premarket?.overnight_high, color: 'text-indigo-400' },
                       { label: 'ON Low', val: premarket?.overnight_low, color: 'text-indigo-600' }
                     ].map((lvl, i) => (
                       <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{lvl.label}</span>
                         <span className={`text-sm font-mono font-black ${lvl.color}`}>{lvl.val?.toFixed(2) || 'N/A'}</span>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2"><History className="w-4 h-4" /> Historical Levels</h4>
                   <div className="space-y-4">
                     {[
                       { label: 'Prev Day High', val: premarket?.previous_day_high, color: 'text-slate-300' },
                       { label: 'Prev Day Low', val: premarket?.previous_day_low, color: 'text-slate-300' },
                       { label: 'Prev Week High', val: premarket?.previous_week_high, color: 'text-slate-500' },
                       { label: 'Prev Week Low', val: premarket?.previous_week_low, color: 'text-slate-500' }
                     ].map((lvl, i) => (
                       <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{lvl.label}</span>
                         <span className={`text-sm font-mono font-black ${lvl.color}`}>{lvl.val?.toFixed(2) || 'N/A'}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'gaps' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Imbalance Detection (FVG)</h4>
                </div>
                <div className="space-y-4">
                  {['1h_fvg', '15min_fvg', '5min_fvg'].map((tf) => (
                    <div key={tf} className="space-y-2">
                      <h5 className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-2">{tf.replace('_', ' ')}</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {(fvgs as any)[tf]?.length > 0 ? (fvgs as any)[tf].map((fvg: FVG, idx: number) => (
                          <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${fvg.type === 'bullish' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${fvg.type === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{fvg.type}</span>
                              <span className="text-[9px] font-mono text-slate-500">{fvg.time}</span>
                            </div>
                            <div className="text-right font-mono text-xs font-black text-slate-200">
                              <div>{fvg.top.toFixed(2)}</div>
                              <div>{fvg.bottom.toFixed(2)}</div>
                            </div>
                          </div>
                        )) : <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">No Gaps Detected</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'thinking' && (
             <div className="h-full space-y-4 animate-in fade-in">
               <div className="bg-slate-900/90 border-l-4 border-indigo-600 border border-slate-800 rounded-2xl p-7 font-mono text-[12px] leading-relaxed text-slate-300 overflow-y-auto max-h-[650px] whitespace-pre-wrap shadow-2xl">
                 <div className="flex items-center gap-2 mb-6 text-indigo-400 border-b border-indigo-500/20 pb-4">
                   <Brain className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-[0.5em]">Internal Logic Stream Engine</span>
                 </div>
                 {output?.thinking || snapshot?.thinking || "Synchronizing logical pathways..."}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
