
import React, { useState, useMemo } from 'react';
import { MarketSnapshot, DecodedOutput, ProfileSet, DPOCSlice } from '../types';
import { 
  Activity, 
  Target, 
  ShieldCheck, 
  Zap, 
  ListTree,
  Cpu,
  Info,
  Layers,
  Fingerprint,
  TrendingUp,
  MessageSquareQuote,
  Flame,
  Binary,
  Globe,
  BarChart3,
  Compass,
  CheckCircle2,
  XCircle,
  Shrink,
  BarChartHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Brain,
  Moon,
  ZapOff,
  Maximize2,
  Anchor,
  BoxSelect,
  Terminal,
  Droplets,
  Microscope,
  CandlestickChart,
  LineChart,
  Maximize
} from 'lucide-react';
import MigrationChart from './MigrationChart';
import ProfileVisualizer from './ProfileVisualizer';

interface DashboardProps {
  snapshot: MarketSnapshot;
  output: DecodedOutput | null;
  allSnapshots?: MarketSnapshot[];
}

type TabType = 'summary' | 'intel' | 'premarket' | 'intraday' | 'core' | 'volume' | 'thinking';

const Dashboard: React.FC<DashboardProps> = ({ snapshot, output, allSnapshots = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showOHLC, setShowOHLC] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showVP, setShowVP] = useState(false);
  const [isWideView, setIsWideView] = useState(false);
  
  const { input } = snapshot;
  const intraday = input?.intraday;
  const core_confluences = input?.core_confluences;
  const premarket = input?.premarket;
  const ib = intraday?.ib;
  const wp = intraday?.wick_parade;
  const vol = intraday?.volume_profile;

  // Augment DPOC slices with historical OHLC and Technical data from previous snapshots
  const chartData = useMemo(() => {
    if (!intraday?.dpoc_migration?.dpoc_slices) return [];
    
    const dataMap = new Map();
    allSnapshots.forEach(s => {
      const time = s.input.current_et_time;
      const ibData = s.input.intraday.ib;
      if (time && ibData) {
        dataMap.set(time, {
          open: ibData.current_open,
          high: ibData.current_high,
          low: ibData.current_low,
          close: ibData.current_close,
          vwap: ibData.current_vwap,
          ema20: ibData.ema20,
          ema50: ibData.ema50,
          ema200: ibData.ema200
        });
      }
    });

    return intraday.dpoc_migration.dpoc_slices.map(slice => {
      const hist = dataMap.get(slice.time);
      return {
        ...slice,
        open: hist?.open ?? slice.dpoc,
        high: hist?.high ?? slice.dpoc,
        low: hist?.low ?? slice.dpoc,
        close: hist?.close ?? slice.dpoc,
        vwap: hist?.vwap,
        ema20: hist?.ema20,
        ema50: hist?.ema50,
        ema200: hist?.ema200
      };
    });
  }, [intraday?.dpoc_migration?.dpoc_slices, allSnapshots]);

  const getConfidenceValue = (confStr: string) => {
    if (!confStr) return 0;
    const match = confStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const formatValue = (val: any) => {
    if (val === undefined || val === null) return 'N/A';
    if (typeof val === 'number') return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return String(val).toUpperCase();
  };

  const BooleanPill = ({ val, label }: { val: boolean; label: string }) => (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${val ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-800/40 border-slate-700/50 text-slate-500'}`}>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {val ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-40" />}
    </div>
  );

  const StatusRow = ({ label, value, colorClass = "text-slate-300" }: { label: string; value: string; colorClass?: string }) => (
    <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-[11px] font-black uppercase tracking-tighter ${colorClass}`}>{value}</span>
    </div>
  );

  const ProfileCard = ({ title, data, colorClass }: { title: string; data: ProfileSet; colorClass: string }) => (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h5 className={`text-[10px] font-black uppercase tracking-[0.2em] ${colorClass}`}>{title}</h5>
        <div className="text-[10px] text-slate-500 font-mono">VAL - POC - VAH</div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-center">
          <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">VAL</span>
          <span className="text-xs font-mono font-bold text-slate-200">{formatValue(data.val)}</span>
        </div>
        <div className={`p-3 rounded-xl border text-center ${colorClass.includes('indigo') ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <span className={`text-[9px] font-black uppercase block mb-1 ${colorClass}`}>POC</span>
          <span className="text-xs font-mono font-bold text-slate-100">{formatValue(data.poc)}</span>
        </div>
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-center">
          <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">VAH</span>
          <span className="text-xs font-mono font-bold text-slate-200">{formatValue(data.vah)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
            <ArrowUpRight className="w-2.5 h-2.5" /> High
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">{formatValue(data.high)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
            <ArrowDownRight className="w-2.5 h-2.5" /> Low
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">{formatValue(data.low)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* LEFT ZONE: Interactive Charting (75%) */}
      <div className="flex-[3] flex flex-col gap-4 min-w-0">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col h-full shadow-2xl relative">
          <div className="flex items-start justify-between mb-6 shrink-0 gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0 mt-1">
                <Activity className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-1">
                  <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 shrink-0">
                    Migration Tracking
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black tracking-widest">CORE ENGINE</span>
                  </h2>
                  {output?.one_liner && (
                    <div className="flex items-start gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg max-w-xl">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide italic leading-tight whitespace-normal line-clamp-4">
                        {output.one_liner}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Final Arbiter for Bias Selection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsWideView(!isWideView)}
                className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${isWideView ? 'bg-slate-100 border-white text-slate-950 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                title="Zoom Out (Wide View)"
              >
                <Maximize className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Zoom</span>
              </button>
              <button 
                onClick={() => setShowOHLC(!showOHLC)}
                className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${showOHLC ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                title="Toggle OHLC"
              >
                <CandlestickChart className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">HLOC</span>
              </button>
              <button 
                onClick={() => setShowVWAP(!showVWAP)}
                className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${showVWAP ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                title="Toggle VWAP"
              >
                <Target className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">VWAP</span>
              </button>
              <button 
                onClick={() => setShowEMA(!showEMA)}
                className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${showEMA ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                title="Toggle EMAs"
              >
                <LineChart className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">EMA</span>
              </button>
              <button 
                onClick={() => setShowVP(!showVP)}
                className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${showVP ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                title="Toggle Volume Profile"
              >
                <BarChartHorizontal className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">VP</span>
              </button>
              <div className="px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-lg flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${intraday?.dpoc_migration?.migration_direction?.toLowerCase() === 'up' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></div>
                <span className="text-xs font-black text-slate-200 uppercase tracking-widest">
                  {intraday?.dpoc_migration?.migration_direction || 'N/A'} TREND
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-950/20 rounded-xl border border-slate-800/30">
            {intraday?.dpoc_migration && (
              <MigrationChart 
                data={chartData} 
                currentPrice={ib?.current_close || 0} 
                showOHLC={showOHLC}
                showVWAP={showVWAP}
                showEMA={showEMA}
                showVP={showVP}
                isWideView={isWideView}
                currentVP={vol?.current_session}
                levels={{
                  asia_high: premarket?.asia_high || 0,
                  asia_low: premarket?.asia_low || 0,
                  london_high: premarket?.london_high || 0,
                  london_low: premarket?.london_low || 0,
                  previous_day_high: premarket?.previous_day_high || 0,
                  previous_day_low: premarket?.previous_day_low || 0,
                  previous_week_high: premarket?.previous_week_high || 0,
                  previous_week_low: premarket?.previous_week_low || 0
                }}
              />
            )}
          </div>
          
          <div className="mt-4 flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl shrink-0">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-sm font-medium text-slate-300 italic">
              <span className="text-indigo-400 font-black uppercase not-italic mr-2">Arbiter Note:</span>
              {intraday?.dpoc_migration?.note || 'Monitoring order flow and profile development...'}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT ZONE: Multi-Tab Intelligence Hub (25%) */}
      <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-w-[420px]">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 p-2 gap-1.5 shrink-0 bg-slate-900/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'summary', label: 'Brief', icon: Info },
            { id: 'intel', label: 'Intel', icon: ListTree },
            { id: 'premarket', label: 'PREMARKET', icon: Globe },
            { id: 'intraday', label: 'Day', icon: BarChart3 },
            { id: 'core', label: 'CONF', icon: Compass },
            { id: 'volume', label: 'PROFILE', icon: BarChartHorizontal },
            { id: 'thinking', label: 'Think', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-none flex flex-col items-center justify-center gap-1.5 py-3 px-2 min-w-[54px] rounded-xl transition-all font-black text-[8px] uppercase tracking-widest ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/30">
          {activeTab === 'summary' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Primary Bias</span>
                  <Target className="w-4 h-4 text-indigo-500/50" />
                </div>
                <div className={`text-3xl font-black ${output?.bias?.toUpperCase()?.includes('LONG') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {output?.bias || 'N/A'}
                </div>
                {output?.value_acceptance && (
                  <div className="mt-4 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Value Acceptance</span>
                    <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed">{output.value_acceptance}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Confidence Index</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-black text-slate-100">{output?.confidence || '0%'}</span>
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-1000"
                      style={{ width: `${getConfidenceValue(output?.confidence || '0')}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-black text-slate-500 uppercase block mb-1">IB Range</span>
                  <span className="text-xl font-mono font-bold text-indigo-300">{ib?.ib_range?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-black text-slate-500 uppercase block mb-1">vs VWAP</span>
                  <span className={`text-xl font-bold uppercase ${ib && ib.current_close > ib.current_vwap ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ib?.price_vs_vwap || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Added RSI and ATR Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-black text-slate-500 uppercase block mb-1">RSI (14)</span>
                  <span className={`text-xl font-mono font-bold ${ib && ib.rsi14 > 70 ? 'text-rose-400' : ib && ib.rsi14 < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {ib?.rsi14?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-black text-slate-500 uppercase block mb-1">ATR (14)</span>
                  <span className="text-xl font-mono font-bold text-sky-300">{ib?.atr14?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-xl">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-2">Price Location</span>
                <span className="text-base font-bold text-slate-100 capitalize">
                  {core_confluences?.price_location?.location_label?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'thinking' && (
            <div className="h-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2 px-1">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Engine Reasoning</h4>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 font-mono text-xs leading-relaxed text-slate-300 overflow-y-auto max-h-[600px] border-l-4 border-l-indigo-500 shadow-xl whitespace-pre-wrap">
                {output?.thinking ? (
                  <div className="relative">
                    <div className="absolute top-0 right-0 p-1 opacity-20"><Cpu className="w-8 h-8" /></div>
                    {output.thinking}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30 italic">
                    <Binary className="w-12 h-12 mb-4" />
                    No internal reasoning captured for this slice.
                  </div>
                )}
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-normal">
                   <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                   Displaying raw logical progression from high-performance LLM core.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'premarket' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Session Ranges */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Session Highs / Lows</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Asia */}
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Moon className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asia Session</span>
                      </div>
                      <div className="font-mono text-sm font-bold">
                        <span className="text-slate-100">{formatValue(premarket?.asia_high)}</span>
                        <span className="mx-2 text-slate-700">|</span>
                        <span className="text-slate-100">{formatValue(premarket?.asia_low)}</span>
                      </div>
                    </div>
                  </div>

                  {/* London */}
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">London Session</span>
                      </div>
                      <div className="font-mono text-sm font-bold">
                        <span className="text-slate-100">{formatValue(premarket?.london_high)}</span>
                        <span className="mx-2 text-slate-700">|</span>
                        <span className="text-slate-100">{formatValue(premarket?.london_low)}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-800/30">
                      <span className="text-[9px] font-black text-slate-600 uppercase">Range:</span>
                      <span className="text-[10px] font-mono font-bold text-sky-400">{formatValue(premarket?.london_range)}</span>
                    </div>
                  </div>

                  {/* Overnight (Gloex) */}
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overnight Range</span>
                      </div>
                      <div className="font-mono text-sm font-bold">
                        <span className="text-slate-100">{formatValue(premarket?.overnight_high)}</span>
                        <span className="mx-2 text-slate-700">|</span>
                        <span className="text-slate-100">{formatValue(premarket?.overnight_low)}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-800/30">
                      <span className="text-[9px] font-black text-slate-600 uppercase">Extent:</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{formatValue(premarket?.overnight_range)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Context */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <History className="w-5 h-5 text-slate-400" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Historical Extremes</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-2">Previous Day High</span>
                    <span className="text-sm font-mono font-bold text-slate-100">{formatValue(premarket?.previous_day_high)}</span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-2">Previous Day Low</span>
                    <span className="text-sm font-mono font-bold text-slate-100">{formatValue(premarket?.previous_day_low)}</span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-2">Prev Week High</span>
                    <span className="text-sm font-mono font-bold text-slate-100">{formatValue(premarket?.previous_week_high)}</span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-2">Prev Week Low</span>
                    <span className="text-sm font-mono font-bold text-slate-100">{formatValue(premarket?.previous_week_low)}</span>
                  </div>
                </div>
              </div>

              {/* Market Context Flags */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <Cpu className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Contextual Indicators</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${premarket?.compression_flag ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                        {premarket?.compression_flag ? <Shrink className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Compression</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Ratio Index</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-mono font-bold ${premarket?.compression_flag ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {formatValue(premarket?.compression_ratio)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <ZapOff className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">SMT Status</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Pre-Open Divergence</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">
                        {premarket?.smt_preopen || 'NEUTRAL'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intraday' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Initial Balance (IB)</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/50 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                       <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${ib?.ib_status === 'complete' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                         {ib?.ib_status || 'INITIALIZING'}
                       </span>
                       <span className="text-xl font-black text-slate-100">{formatValue(ib?.ib_range)} <span className="text-[10px] text-slate-500">PTS</span></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800/40 pt-4">
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">High</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{formatValue(ib?.ib_high)}</span>
                      </div>
                      <div className="text-center border-x border-slate-800/40 px-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Mid</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{formatValue(ib?.ib_mid)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Low</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{formatValue(ib?.ib_low)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Wick Parade Analysis</h4>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/50">
                  <div className="flex gap-4 items-center mb-6">
                    <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                       <span className="text-[10px] font-black text-emerald-500 uppercase block mb-1">Bullish</span>
                       <span className="text-3xl font-black text-emerald-400">{wp?.bullish_wick_parade_count || 0}</span>
                    </div>
                    <div className="flex-1 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                       <span className="text-[10px] font-black text-rose-500 uppercase block mb-1">Bearish</span>
                       <span className="text-3xl font-black text-rose-400">{wp?.bearish_wick_parade_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'core' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* IB Acceptance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Compass className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">IB Acceptance Logic</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <BooleanPill val={core_confluences?.ib_acceptance?.close_above_ibh || false} label="Above IBH" />
                    <BooleanPill val={core_confluences?.ib_acceptance?.close_below_ibl || false} label="Below IBL" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <StatusRow 
                      label="Accepted Higher" 
                      value={core_confluences?.ib_acceptance?.price_accepted_higher || 'No'} 
                      colorClass={core_confluences?.ib_acceptance?.price_accepted_higher === 'Yes' ? 'text-emerald-400' : 'text-slate-500'}
                    />
                    <StatusRow 
                      label="Accepted Lower" 
                      value={core_confluences?.ib_acceptance?.price_accepted_lower || 'No'} 
                      colorClass={core_confluences?.ib_acceptance?.price_accepted_lower === 'Yes' ? 'text-rose-400' : 'text-slate-500'}
                    />
                  </div>
                </div>
              </div>

              {/* DPOC Compression */}
              <div className="space-y-4 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-2 px-1">
                  <BoxSelect className="w-5 h-5 text-sky-400" />
                  <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em]">DPOC Compression Flags</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <BooleanPill val={core_confluences?.dpoc_compression?.compressing_against_vah || false} label="Vs VAH" />
                    <BooleanPill val={core_confluences?.dpoc_compression?.compressing_against_val || false} label="Vs VAL" />
                  </div>
                  <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Compression Bias</span>
                    <span className="text-xs font-black text-slate-100 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
                      {core_confluences?.dpoc_compression?.compression_bias?.replace(/_/g, ' ') || 'NEUTRAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Position Context */}
              <div className="space-y-4 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-2 px-1">
                  <Anchor className="w-5 h-5 text-amber-500" />
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Positioning Context</h4>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-xl shadow-inner">
                  <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest block mb-2">Location Identity</span>
                  <div className="text-lg font-black text-slate-100 uppercase italic tracking-tighter">
                    {core_confluences?.price_location?.location_label?.replace(/_/g, ' ') || 'UNIDENTIFIED'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'volume' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Today's Session Profile */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChartHorizontal className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Current Session Profile</h4>
                </div>
                
                {vol?.current_session && (
                  <>
                    <ProfileCard title="Live Profile Area" data={vol.current_session} colorClass="text-indigo-400" />
                    
                    {/* HVN / LVN Nodes */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3 h-3" /> High Volume Nodes (HVN)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {vol.current_session.hvn_nodes.map((node, i) => (
                            <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-mono font-bold text-emerald-400">
                              {node.toFixed(2)}
                            </span>
                          ))}
                          {vol.current_session.hvn_nodes.length === 0 && <span className="text-[10px] text-slate-600 italic">None detected</span>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest flex items-center gap-2">
                          <Shrink className="w-3 h-3" /> Low Volume Nodes (LVN)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {vol.current_session.lvn_nodes.map((node, i) => (
                            <span key={i} className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-mono font-bold text-rose-400">
                              {node.toFixed(2)}
                            </span>
                          ))}
                          {vol.current_session.lvn_nodes.length === 0 && <span className="text-[10px] text-slate-600 italic">None detected</span>}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Historical Comparison */}
              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Historical Benchmarks</h4>
                </div>
                <div className="space-y-6">
                  {vol?.previous_day && <ProfileCard title="Previous Day (T-1)" data={vol.previous_day} colorClass="text-slate-400" />}
                  {vol?.previous_3_days && <ProfileCard title="Previous 3-Day Window" data={vol.previous_3_days} colorClass="text-slate-500" />}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'intel' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Framework Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">1. Market Framework</h4>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Fingerprint className="w-12 h-12" />
                  </div>
                  <span className="text-lg font-black text-slate-100 uppercase tracking-tight">{output?.day_type?.type || 'N/A'}</span>
                  <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-emerald-500/60" />
                    Verified: {output?.day_type?.timestamp || 'Waiting...'}
                  </p>
                </div>
              </div>

              {/* Liquidity Profile (Missing Field Integration) */}
              <div className="space-y-4 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-2 px-1">
                  <Droplets className="w-5 h-5 text-sky-400" />
                  <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em]">2. Liquidity Profile</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {output?.liquidity_sweeps && Object.entries(output.liquidity_sweeps).map(([key, value]) => (
                    <div key={key} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key} Sweep</span>
                        <Zap className={`w-3.5 h-3.5 ${value.status.toLowerCase().includes('reclaimed') ? 'text-amber-500' : 'text-slate-700'}`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={`text-[11px] font-black uppercase tracking-tight ${value.status.toLowerCase().includes('held') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {value.status}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic opacity-60">
                          Strength: {value.strength}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!output?.liquidity_sweeps && (
                    <div className="col-span-2 p-6 bg-slate-900/20 border border-slate-800/30 rounded-xl text-center">
                       <span className="text-[10px] font-black text-slate-600 uppercase italic">Awaiting Sweep Data...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Signals (Missing Field Integration) */}
              <div className="space-y-4 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-2 px-1">
                  <Microscope className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">3. Profile Logic (TPO Read)</h4>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-800/50 shadow-sm">
                  {output?.tpo_read ? (
                    <>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Profile Signals</span>
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-tight">{output.tpo_read.profile_signals}</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">DPOC Migration Read</span>
                        <span className="text-[11px] font-bold text-sky-400 uppercase tracking-tight">{output.tpo_read.dpoc_migration}</span>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Extreme/Compression</span>
                        <span className={`text-[11px] font-bold uppercase tracking-tight ${output.tpo_read.extreme_or_compression.includes('extreme') ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {output.tpo_read.extreme_or_compression}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center opacity-30 italic font-black text-[10px] uppercase">Profile Signal Buffer Empty</div>
                  )}
                </div>
              </div>

              {/* Strategic Breakdown */}
              <div className="space-y-4 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-2 px-1">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">4. Strategic Reasoning</h4>
                </div>
                
                <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl overflow-hidden shadow-inner">
                  {output?.day_type_reasoning && output.day_type_reasoning.length > 0 ? (
                    <div className="divide-y divide-slate-800/50">
                      {output.day_type_reasoning.map((reason, idx) => (
                        <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-900/40 transition-colors">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span className="text-[10px] font-black text-emerald-500">{idx + 1}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-relaxed">
                            {reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center opacity-30 italic flex flex-col items-center">
                      <ListTree className="w-10 h-10 mb-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Logic Stream Pending...</span>
                    </div>
                  )}
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
