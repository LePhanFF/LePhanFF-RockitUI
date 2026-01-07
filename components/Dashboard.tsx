
import React, { useState, useMemo } from 'react';
import { MarketSnapshot, DecodedOutput, ProfileSet, FVG, DPOCStep } from '../types';
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
  Gauge,
  Clock,
  ArrowRight,
  Wind,
  Share2,
  ChevronRight,
  Dna,
  Waves,
  Type as TypeIcon,
  Timer,
  Eye,
  Crosshair,
  BadgeInfo,
  Zap as Flash,
  Workflow,
  ListOrdered,
  IterationCcw,
  ZapOff as Ghost,
  TrendingUp as TrendUpIcon,
  Anchor,
  Terminal,
  CpuCore
} from 'lucide-react';
import MigrationChart from './MigrationChart';
import ProfileLadder from './ProfileLadder';

interface DashboardProps {
  snapshot: MarketSnapshot & { thinking?: string };
  output: DecodedOutput | null;
  allSnapshots?: MarketSnapshot[];
}

type TabType = 'brief' | 'pulse' | 'logic' | 'globex' | 'profile' | 'migration' | 'gaps' | 'thinking';

const StatBox = ({ label, value, colorClass = "text-slate-100", compact = false }: { label: string; value: string | number; colorClass?: string; compact?: boolean }) => (
  <div className={`bg-slate-900/40 border border-slate-800/40 rounded-xl hover:border-indigo-500/30 transition-all ${compact ? 'p-2' : 'p-4'}`}>
    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1 block leading-none">{label}</span>
    <div className={`font-black uppercase tracking-tighter leading-none ${compact ? 'text-xs' : 'text-base'} ${colorClass}`}>{value}</div>
  </div>
);

const ConfluenceCard = ({ title, icon: Icon, children, className = "" }: { title: string; icon: any; children?: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-indigo-500/30 transition-all ${className}`}>
    <div className="flex items-center gap-2.5 mb-2">
      <Icon className="w-4 h-4 text-indigo-400" />
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{title}</h4>
    </div>
    <div className="space-y-1.5">
      {children}
    </div>
  </div>
);

const LogicBadge = ({ label, value, condition }: { label: string; value: string | boolean | number; condition?: boolean }) => {
  const isPositive = typeof value === 'boolean' ? value : condition;
  const displayValue = typeof value === 'boolean' ? (value ? 'YES' : 'NO') : (value?.toString().toUpperCase() || 'N/A');
  
  const getColors = () => {
    const v = displayValue.toLowerCase();
    if (isPositive === true || v === 'yes' || v.includes('long') || v.includes('bullish') || v.includes('up') || v.includes('above') || v === 'aggressive_bullish' || v === 'complete') {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (isPositive === false || v === 'no' || v.includes('short') || v.includes('bearish') || v.includes('down') || v.includes('below') || v === 'aggressive_bearish') {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
    return 'bg-slate-800 text-slate-400 border border-slate-700';
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800/40 last:border-0">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getColors()}`}>
        {displayValue}
      </span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ snapshot, output, allSnapshots = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>('brief');
  const [showTPOPrints, setShowTPOPrints] = useState(true);
  const [showVolumeBars, setShowVolumeBars] = useState(true);
  const [tpoResolution, setTpoResolution] = useState<'5m' | '30m'>('30m');
  
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
  const migData = intraday?.dpoc_migration || { note: '' };
  const wicks = intraday?.wick_parade || { bullish_wick_parade_count: 0, bearish_wick_parade_count: 0 };

  const chartData = useMemo(() => {
    if (allSnapshots.length === 0) return [];
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const visibleSnapshots = allSnapshots.slice(0, currentIndex + 1);
    const historicalSlices = migData.dpoc_slices || [];
    const traceHistory = migData.dpoc_history || [];

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
  }, [allSnapshots, snapshot, migData]);

  const reasoning = useMemo(() => {
    if (!output) return [];
    const rawReasoning = output.day_type_reasoning || (output as any).evidence || (output as any).reasoning;
    return Array.isArray(rawReasoning) ? rawReasoning : [];
  }, [output]);

  const narrative = output?.one_liner || "Intelligence stream synchronized.";
  const dayTypeLabel = typeof output?.day_type === 'object' ? output.day_type.type : (output?.day_type || "N/A");

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* LEFT: MAIN CHART AREA */}
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
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">{migData.migration_direction || migData.direction || 'STABLE'}</span>
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

      {/* RIGHT: TABS / INTELLIGENCE PANEL */}
      <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-w-[580px]">
        <div className="flex border-b border-slate-800 p-1.5 gap-1 shrink-0 bg-slate-900/90 overflow-x-auto no-scrollbar">
          {[
            { id: 'brief', label: 'Brief', icon: Info },
            { id: 'pulse', label: 'Pulse', icon: Waves },
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

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${activeTab === 'thinking' ? 'p-0' : 'p-6'} bg-slate-950/40`}>
          {activeTab === 'brief' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors rounded-2xl" />
                <div className="relative p-7 border border-indigo-500/30 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">One-Liner Narrative</span>
                    </div>
                    <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                       <span className="text-[10px] font-black text-indigo-300 uppercase italic tracking-widest">{dayTypeLabel}</span>
                    </div>
                  </div>
                  <p className="text-xl lg:text-2xl font-black italic text-slate-100 leading-[1.4] tracking-tight">"{narrative}"</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border transition-all ${output?.bias?.toUpperCase().includes('LONG') ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/5 border-rose-500/40 text-rose-400'}`}>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">System Bias</span>
                  <div className="text-xl font-black tracking-widest italic">{output?.bias?.toUpperCase() || 'NEUTRAL'}</div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block">AI Confidence</span>
                  <div className="text-xl font-black text-slate-100 font-mono tracking-tighter">{output?.confidence || '0%'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                 {output?.liquidity_sweeps && (
                   <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 px-1 border-b border-slate-800 pb-2">
                         <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Liquidity Sweeps Analysis</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(output.liquidity_sweeps).map(([key, sweep]: [string, any]) => (
                          <div key={key} className="flex flex-col bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 group hover:border-indigo-500/30 transition-all shadow-sm">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">{key}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border leading-none ${
                                  sweep.status.toLowerCase().includes('reclaimed') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}>{sweep.status.toUpperCase()}</span>
                             </div>
                             <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-bold text-slate-300 truncate">{sweep.strength}</span>
                                {sweep.level && <span className="text-[10px] font-mono text-indigo-400/60 ml-auto tabular-nums">{sweep.level}</span>}
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-inner">
                       <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Structural State</h4>
                       </div>
                       <p className="text-[11px] font-bold text-slate-200 leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                         {output?.value_acceptance || "Structural shift analysis pending..."}
                       </p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-inner">
                       <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">TPO Signals Read</h4>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between items-center">
                             <span className="text-[8px] font-black text-slate-500 uppercase">Signals</span>
                             <span className="text-[10px] font-black text-slate-100 uppercase">{output?.tpo_read?.profile_signals || "N/A"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[8px] font-black text-slate-500 uppercase">Migration</span>
                             <span className="text-[10px] font-black text-indigo-400">{output?.tpo_read?.dpoc_migration || "STABLE"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[8px] font-black text-slate-500 uppercase">Extreme</span>
                             <span className="text-[10px] font-black text-amber-400 uppercase">{output?.tpo_read?.extreme_or_compression || "NONE"}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {reasoning.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-800/60">
                  <div className="flex items-center gap-2 mb-2">
                     <Share2 className="w-4 h-4 text-indigo-500" />
                     <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Core Intelligence Points</h4>
                  </div>
                  <div className="grid gap-3">
                    {reasoning.map((item, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-slate-900/30 border border-slate-800/60 rounded-2xl group hover:bg-slate-800/40 transition-all shadow-md">
                        <div className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] group-hover:scale-110 transition-transform" />
                        <p className="text-[13px] font-semibold text-slate-100 leading-[1.6] tracking-wide antialiased">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pulse' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                 <ConfluenceCard title="Momentum Engine" icon={Zap}>
                    <LogicBadge label="RSI (14)" value={ib.rsi14?.toFixed(1) || 'N/A'} condition={ib.rsi14 > 50} />
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                       <div className={`h-full transition-all duration-1000 ${ib.rsi14 > 70 ? 'bg-rose-500' : ib.rsi14 < 30 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${ib.rsi14}%` }} />
                    </div>
                 </ConfluenceCard>
                 <ConfluenceCard title="Volatility Context" icon={Wind}>
                    <LogicBadge label="ATR (14)" value={ib.atr14?.toFixed(2) || 'N/A'} condition={ib.atr14 > 15} />
                    <LogicBadge label="Volume (Raw)" value={ib.current_volume?.toLocaleString() || '0'} condition={ib.current_volume > 3000} />
                 </ConfluenceCard>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <ConfluenceCard title="IB Session Metrics" icon={Shield}>
                    <LogicBadge label="IB Status" value={ib.ib_status || 'OPEN'} />
                    <LogicBadge label="IB Range (Pts)" value={ib.ib_range?.toFixed(1) || '0.0'} />
                    <LogicBadge label="IB Mid" value={ib.ib_mid?.toFixed(1) || '0.0'} />
                    <LogicBadge label="Price vs IB" value={ib.price_vs_ib} />
                 </ConfluenceCard>
                 <ConfluenceCard title="Technical Anchors" icon={Anchor}>
                    <LogicBadge label="VWAP" value={ib.current_vwap?.toFixed(1) || '0.0'} />
                    <LogicBadge label="Price vs VWAP" value={ib.price_vs_vwap} />
                    <div className="pt-2 space-y-1">
                       <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase">
                          <span>EMA 20</span>
                          <span className="text-slate-200 tabular-nums">{ib.ema20?.toFixed(1)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase">
                          <span>EMA 50</span>
                          <span className="text-slate-200 tabular-nums">{ib.ema50?.toFixed(1)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase">
                          <span>EMA 200</span>
                          <span className="text-slate-200 tabular-nums">{ib.ema200?.toFixed(1)}</span>
                       </div>
                    </div>
                 </ConfluenceCard>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-inner">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Timer className="w-4 h-4 text-indigo-400" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Intraday Wick Profile</h4>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Window: 15m Lookback</span>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="text-center group p-4 rounded-xl hover:bg-emerald-500/5 transition-colors">
                       <span className="text-[48px] font-black text-emerald-400 block leading-none mb-2 tracking-tighter drop-shadow-sm">{wicks.bullish_wick_parade_count || 0}</span>
                       <span className="text-[9px] font-black uppercase text-emerald-500/60 tracking-[0.2em]">Bullish Pressure</span>
                    </div>
                    <div className="text-center border-l border-slate-800 group p-4 rounded-xl hover:bg-rose-500/5 transition-colors">
                       <span className="text-[48px] font-black text-rose-400 block leading-none mb-2 tracking-tighter drop-shadow-sm">{wicks.bearish_wick_parade_count || 0}</span>
                       <span className="text-[9px] font-black uppercase text-rose-500/60 tracking-[0.2em]">Bearish Pressure</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'logic' && (
             <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-4">
                  <ConfluenceCard title="IB Acceptance" icon={Shield}>
                    <LogicBadge label="Close > IB High" value={core.ib_acceptance?.close_above_ibh} />
                    <LogicBadge label="Close < IB Low" value={core.ib_acceptance?.close_below_ibl} />
                    <LogicBadge label="Accept Higher" value={core.ib_acceptance?.price_accepted_higher} />
                    <LogicBadge label="Accept Lower" value={core.ib_acceptance?.price_accepted_lower} />
                  </ConfluenceCard>
                  
                  <ConfluenceCard title="DPOC vs IB" icon={Crosshair}>
                    <LogicBadge label="DPOC > IB High" value={core.dpoc_vs_ib?.dpoc_above_ibh} />
                    <LogicBadge label="DPOC < IB Low" value={core.dpoc_vs_ib?.dpoc_below_ibl} />
                    <LogicBadge label="Extreme Shift" value={core.dpoc_vs_ib?.dpoc_extreme_shift || 'NONE'} />
                  </ConfluenceCard>

                  <ConfluenceCard title="DPOC Compression" icon={Maximize2}>
                    <LogicBadge label="Comp vs VAH" value={core.dpoc_compression?.compressing_against_vah} />
                    <LogicBadge label="Comp vs VAL" value={core.dpoc_compression?.compressing_against_val} />
                    <LogicBadge label="Compression Bias" value={core.dpoc_compression?.compression_bias || 'NONE'} />
                  </ConfluenceCard>
                </div>

                <div className="space-y-4">
                  <ConfluenceCard title="Price Location" icon={Target}>
                    <LogicBadge label="Upper Third" value={core.price_location?.in_upper_third} />
                    <LogicBadge label="Middle Third" value={core.price_location?.in_middle} />
                    <LogicBadge label="Lower Third" value={core.price_location?.in_lower_third} />
                    <LogicBadge label="Location Label" value={core.price_location?.location_label || 'N/A'} />
                  </ConfluenceCard>

                  <ConfluenceCard title="TPO Logic Signals" icon={Fingerprint}>
                    <LogicBadge label="Single Prints (U)" value={core.tpo_signals?.single_prints_above} />
                    <LogicBadge label="Single Prints (L)" value={core.tpo_signals?.single_prints_below} />
                    <LogicBadge label="Fattening Upper" value={core.tpo_signals?.fattening_upper} />
                    <LogicBadge label="Fattening Lower" value={core.tpo_signals?.fattening_lower} />
                  </ConfluenceCard>

                  <ConfluenceCard title="Tactical Migration" icon={Workflow}>
                    <LogicBadge label="Significant Up" value={core.migration?.significant_up} />
                    <LogicBadge label="Significant Down" value={core.migration?.significant_down} />
                    <LogicBadge label="Net Direction" value={core.migration?.net_direction || 'FLAT'} />
                    <LogicBadge label="Pts since 10:30" value={core.migration?.pts_since_1030 || 0} />
                  </ConfluenceCard>
                </div>

                {core.note && (
                  <div className="col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-xl shadow-inner border-l-4 border-indigo-500/60">
                     <h5 className="text-[9px] font-black text-slate-500 uppercase mb-2">Architectural Logic Note</h5>
                     <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">"{core.note}"</p>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                 <StatBox label="Net Shift (pts)" value={migData.net_migration_pts || migData.steps_since_1030 || '0'} colorClass="text-indigo-400" />
                 <StatBox label="Relative Retain %" value={`${(migData.relative_retain_percent || 0).toFixed(1)}%`} colorClass="text-cyan-400" />
              </div>
              <ConfluenceCard title="DPOC State Qualifiers" icon={Compass}>
                 <LogicBadge label="Stabilizing" value={migData.is_stabilizing} />
                 <LogicBadge label="Accelerating" value={migData.accelerating} />
                 <LogicBadge label="Prior Exhausted" value={migData.prior_exhausted} />
                 <LogicBadge label="Regime" value={migData.dpoc_regime || 'NEUTRAL'} />
              </ConfluenceCard>
              
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                 <div className="flex items-center gap-2 mb-4 px-1">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">DPOC Migration History Log</h4>
                 </div>
                 <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {migData.dpoc_history && migData.dpoc_history.length > 0 ? (
                      migData.dpoc_history.map((step: DPOCStep, i: number) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${step.jump ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-950/40 border-slate-800/60'}`}>
                           <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-slate-500 tabular-nums">{step.slice}</span>
                              <div className="flex flex-col">
                                 <span className="text-[12px] font-black font-mono text-slate-100 tabular-nums">{step.dpoc.toFixed(1)}</span>
                                 <span className="text-[8px] font-black text-slate-500 uppercase">{step.developing ? 'DEVELOPING' : 'SETTLED'}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black tabular-nums ${step.delta_pts > 0 ? 'text-emerald-400' : step.delta_pts < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                 {step.delta_pts > 0 ? '+' : ''}{step.delta_pts.toFixed(1)}
                              </span>
                              {step.jump && <Flash className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center opacity-20 italic">
                         <IterationCcw className="w-10 h-10 mx-auto mb-3" />
                         <span className="text-[10px] font-black uppercase tracking-widest">No migration steps recorded.</span>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'globex' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <ConfluenceCard title="Premarket Architecture" icon={Globe}>
                  <LogicBadge label="Asia High/Low" value={`${premarket.asia_high} / ${premarket.asia_low}`} />
                  <LogicBadge label="London High/Low" value={`${premarket.london_high} / ${premarket.london_low}`} />
                  <LogicBadge label="Overnight High/Low" value={`${premarket.overnight_high} / ${premarket.overnight_low}`} />
                  <LogicBadge label="Prev Day High/Low" value={`${premarket.previous_day_high} / ${premarket.previous_day_low}`} />
               </ConfluenceCard>
               <ConfluenceCard title="Structural Health" icon={Flash}>
                  <LogicBadge label="Compression Ratio" value={premarket.compression_ratio?.toFixed(3) || '0.000'} condition={premarket.compression_flag} />
                  <LogicBadge label="SMT Preopen" value={premarket.smt_preopen} />
                  <LogicBadge label="Range Status" value={premarket.compression_flag ? 'COMPRESSED' : 'EXPANDED'} condition={!premarket.compression_flag} />
               </ConfluenceCard>
            </div>
          )}

          {activeTab === 'gaps' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-2">
                   <SearchCode className="w-4 h-4 text-indigo-400" />
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-200">Active FVG Matrix</h4>
                </div>
                {Object.entries(fvgs).filter(([_, list]) => Array.isArray(list) && list.length > 0).length === 0 ? (
                  <div className="py-24 flex flex-col items-center opacity-30 select-none italic">
                     <Ghost className="w-16 h-16 mb-4 text-slate-600" />
                     <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500">Structural Gaps Empty</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(fvgs).map(([tf, list]) => {
                      if (!Array.isArray(list) || list.length === 0) return null;
                      const tfLabel = tf.replace('_', ' ').toUpperCase();
                      return (
                        <div key={tf} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm">
                           <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-2">
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{tfLabel} Array</span>
                             <BadgeInfo className="w-3.5 h-3.5 text-slate-600" />
                           </div>
                           <div className="space-y-2.5">
                              {list.map((gap: FVG, idx: number) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border group transition-all ${gap.type === 'bullish' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'}`}>
                                   <div className="flex items-center gap-4">
                                      {gap.type === 'bullish' ? <MoveUp className="w-3.5 h-3.5 text-emerald-400" /> : <MoveDown className="w-3.5 h-3.5 text-rose-400" />}
                                      <div className="flex flex-col">
                                         <span className="text-[12px] font-black font-mono text-slate-100 tabular-nums tracking-tighter">{gap.bottom.toFixed(1)} - {gap.top.toFixed(1)}</span>
                                         <span className="text-[8px] font-black text-slate-500 uppercase">{gap.time || 'ACTIVE'}</span>
                                      </div>
                                   </div>
                                   <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${gap.type === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {gap.type}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
          )}

          {activeTab === 'profile' && (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-sm"><BarChartHorizontal className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100">Structural Profile Analysis</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Composite TPO Distribution</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800/40 mr-2">
                      <button 
                        onClick={() => setTpoResolution('30m')}
                        className={`px-3 py-1 rounded text-[9px] font-black transition-all ${tpoResolution === '30m' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        30M
                      </button>
                      <button 
                        onClick={() => setTpoResolution('5m')}
                        className={`px-3 py-1 rounded text-[9px] font-black transition-all ${tpoResolution === '5m' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        5M
                      </button>
                    </div>
                   <button 
                     onClick={() => setShowTPOPrints(!showTPOPrints)} 
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${showTPOPrints ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <TypeIcon className="w-3.5 h-3.5" />
                     <span className="text-[9px] font-black uppercase">TPO</span>
                   </button>
                   <button 
                     onClick={() => setShowVolumeBars(!showVolumeBars)} 
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${showVolumeBars ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <Layers className="w-3.5 h-3.5" />
                     <span className="text-[9px] font-black uppercase">VOL</span>
                   </button>
                 </div>
              </div>
              
              <div className="flex-1 min-h-0 rounded-2xl border border-slate-800/40 overflow-hidden shadow-inner">
                <ProfileLadder 
                  allSnapshots={allSnapshots} 
                  currentSnapshot={snapshot} 
                  showTPO={showTPOPrints} 
                  showVolume={showVolumeBars}
                  resolution={tpoResolution}
                  profileData={{
                    tpo: { poc: tpo?.current_poc || 0, vah: tpo?.current_vah || 0, val: tpo?.current_val || 0 },
                    volume: vol?.current_session || {} as ProfileSet
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'thinking' && (
             <div className="h-full flex flex-col animate-in fade-in zoom-in-95">
               <div className="flex-1 bg-slate-900/95 border-l-4 border-indigo-600 font-mono text-[13px] leading-relaxed text-slate-300 overflow-y-auto whitespace-pre-wrap shadow-2xl selection:bg-indigo-500/30 selection:text-white p-10 custom-scrollbar flex flex-col">
                 <div className="flex items-center gap-4 mb-8 text-indigo-400 border-b border-indigo-500/20 pb-6 shrink-0">
                   <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Terminal className="w-6 h-6" /></div>
                   <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase tracking-[0.4em]">Intelligence Reasoning Engine</span>
                      <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest">Logic Trace Output [RAW]</span>
                   </div>
                 </div>
                 <div className="flex-1">
                   {output?.thinking || snapshot?.thinking || "Awaiting intelligence stream initialization..."}
                 </div>
                 <div className="mt-10 pt-6 border-t border-slate-800/40 text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0 flex justify-between items-center">
                    <span>Process ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                    <span>Status: LOG_STREAM_ACTIVE</span>
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
