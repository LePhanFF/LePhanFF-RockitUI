
import React from 'react';
import { Code, Brain, FileJson, MessageSquare } from 'lucide-react';
import { MarketSnapshot } from '../types';

// --- JSON ANNOTATION MAPPING ---
const UI_MAP: Record<string, string> = {
  // --- META ---
  "current_et_time": "App Header > Clock / Sidebar List",
  "session_date": "App Header",

  // --- PREMARKET ---
  "asia_high": "Globex Tab > Asia Block",
  "asia_low": "Globex Tab > Asia Block",
  "london_high": "Globex Tab > London Block",
  "london_low": "Globex Tab > London Block",
  "london_range": "Globex Tab > London Block",
  "overnight_high": "Globex Tab > Overnight Range",
  "overnight_low": "Globex Tab > Overnight Range",
  "overnight_range": "Globex Tab > Overnight Range",
  "previous_day_high": "Globex Tab > Reference Levels",
  "previous_day_low": "Globex Tab > Reference Levels",
  "previous_week_high": "Globex Tab > Reference Levels",
  "previous_week_low": "Globex Tab > Reference Levels",
  "compression_flag": "Globex Tab > Compression",
  "compression_ratio": "Globex Tab > Compression",
  "smt_preopen": "Globex Tab > SMT",

  // --- INTRADAY ---
  "ib_high": "Intraday Tab > Initial Balance > High",
  "ib_low": "Intraday Tab > Initial Balance > Low",
  "ib_range": "Intraday Tab > Initial Balance > Range",
  "ib_mid": "Intraday Tab > Initial Balance > Mid",
  "ib_status": "Intraday Tab > Initial Balance > Status",
  
  "current_close": "Intraday Tab > Live Price / Chart",
  "current_open": "Chart > Candles",
  "current_high": "Chart > Candles",
  "current_low": "Chart > Candles",
  
  "rsi14": "Intraday Tab > Technicals",
  "atr14": "Intraday Tab > Technicals",
  "current_volume": "Intraday Tab > Technicals",
  "current_vwap": "Intraday Tab > Technicals",
  
  "price_vs_ib": "Intraday Tab > Context",
  "price_vs_vwap": "Intraday Tab > Context",
  "ema20": "Intraday Tab > Context",
  "ema50": "Intraday Tab > Context",
  "ema200": "Intraday Tab > Context",

  "bullish_wick_parade_count": "Intraday Tab > Wick Parade",
  "bearish_wick_parade_count": "Intraday Tab > Wick Parade",
  
  // --- DPOC MIGRATION ---
  "dpoc_slices": "Chart > Algo DPOC Line",
  "migration_direction": "DPOC Tab > Vector > Direction",
  "steps_since_1030": "DPOC Tab > Vector > Net Mig",
  "net_migration_pts": "DPOC Tab > Vector > Net Mig",
  "dpoc_regime": "DPOC Tab > Regime Banner",
  "avg_velocity_per_30min": "DPOC Tab > Vector > Velocity",
  "accelerating": "DPOC Tab > Dynamics > Momentum",
  "decelerating": "DPOC Tab > Dynamics > Momentum",
  "cluster_range_last_4": "DPOC Tab > Dynamics > Cluster Range",
  "relative_retain_percent": "DPOC Tab > Dynamics > Retain %",
  "is_stabilizing": "DPOC Tab > Signal State",
  "reclaiming_opposite": "DPOC Tab > Signal State",
  "prior_exhausted": "DPOC Tab > Signal State",
  "price_vs_dpoc_cluster": "DPOC Tab > Signal State",

  // --- VOLUME PROFILE ---
  "poc": "Profile Tab > Current Session > POC",
  "vah": "Profile Tab > Current Session > VAH",
  "val": "Profile Tab > Current Session > VAL",
  "hvn_nodes": "Profile Tab > HVN",
  "lvn_nodes": "Profile Tab > LVN",

  // --- TPO PROFILE ---
  "current_poc": "TPO Tab > Chart / Profile Tab",
  "current_vah": "TPO Tab > Chart / Profile Tab",
  "current_val": "TPO Tab > Chart / Profile Tab",
  "tpo_shape": "TPO Chart (implied shape)",
  "single_prints_above_vah": "TPO Tab > Single Prints",
  "single_prints_below_val": "TPO Tab > Single Prints",
  "fattening_zone": "TPO Tab (visualized)",

  // --- FVG ---
  "1h_fvg": "Intraday Tab > Active FVGs",
  "15min_fvg": "Intraday Tab > Active FVGs",
  "5min_fvg": "Intraday Tab > Active FVGs",

  // --- CORE CONFLUENCES (LOGIC TAB) ---
  "close_above_ibh": "Logic Tab > IB Acceptance",
  "close_below_ibl": "Logic Tab > IB Acceptance",
  "price_accepted_higher": "Logic Tab > IB Acceptance",
  "price_accepted_lower": "Logic Tab > IB Acceptance",
  
  "dpoc_above_ibh": "Logic Tab > DPOC Position",
  "dpoc_below_ibl": "Logic Tab > DPOC Position",
  
  "compressing_against_vah": "Logic Tab > Compression",
  "compressing_against_val": "Logic Tab > Compression",
  "compression_bias": "Logic Tab > Compression",
  
  "location_label": "Logic Tab > Location",
  "in_upper_third": "Logic Tab > Location",
  "in_middle": "Logic Tab > Location",
  "in_lower_third": "Logic Tab > Location",
  
  "single_prints_above": "Logic Tab > TPO Signals",
  "single_prints_below": "Logic Tab > TPO Signals",
  "fattening_upper": "Logic Tab > TPO Signals",
  "fattening_lower": "Logic Tab > TPO Signals",
  
  "net_direction": "Logic Tab > Vector",
  "pts_since_1030": "Logic Tab > Vector",

  // --- OUTPUTS ---
  "day_type": "Brief Tab > Header > Day Type",
  "type": "Brief Tab > Header > Day Type",
  "bias": "Header Banner > Bias Chip",
  "confidence": "Header Banner > Trust Score",
  "one_liner": "Header Banner / Brief Tab > Core Synthesis",
  "value_acceptance": "Brief Tab > Value Acceptance",
  "profile_signals": "Brief Tab > TPO Structure",
  "day_type_reasoning": "Brief Tab > Logic Driver",
  "thinking": "Thinking Tab / JSON Right Panel",
};

const AnnotatedJsonNode: React.FC<{ data: any; depth?: number; label?: string }> = ({ data, depth = 0, label }) => {
  const indent = depth * 1.5; 
  
  if (data === null) return <div style={{ paddingLeft: `${indent}rem` }} className="text-slate-500"><span className="text-purple-400">{label}:</span> null</div>;
  
  if (Array.isArray(data)) {
    if (data.length === 0) return <div style={{ paddingLeft: `${indent}rem` }} className="text-slate-500"><span className="text-purple-400">{label}:</span> []</div>;
    return (
      <div style={{ paddingLeft: `${indent}rem` }}>
        <span className="text-purple-400">{label}:</span> [
        {data.map((item, i) => (
          <div key={i}>
            <AnnotatedJsonNode data={item} depth={1} />
          </div>
        ))}
        ]
      </div>
    );
  }

  if (typeof data === 'object') {
    return (
      <div style={{ paddingLeft: `${indent}rem` }}>
        {label && <span className="text-purple-400 font-bold">{label}:</span>} {'{'}
        {Object.entries(data).map(([key, value]) => {
           const mapLabel = UI_MAP[key];
           if (typeof value !== 'object' || value === null) {
              let valColor = 'text-emerald-300';
              if (typeof value === 'string') valColor = 'text-amber-200';
              if (typeof value === 'boolean') valColor = 'text-rose-300';
              if (typeof value === 'number') valColor = 'text-sky-300';

              return (
                <div key={key} className="pl-6 hover:bg-slate-800/50 rounded flex items-center group">
                   <span className="text-indigo-300 mr-2">{key}:</span>
                   <span className={`${valColor} font-mono mr-4`}>
                      {typeof value === 'string' ? `"${value}"` : String(value)}
                   </span>
                   {mapLabel && (
                     <span className="text-[10px] text-slate-500 font-mono italic opacity-50 group-hover:opacity-100 transition-opacity border-l border-slate-700 pl-2">
                       // Mapped to: <span className="text-emerald-500/80 font-bold">{mapLabel}</span>
                     </span>
                   )}
                </div>
              );
           }
           return (
             <div key={key} className="group">
                <AnnotatedJsonNode data={value} depth={1} label={key} />
             </div>
           );
        })}
        {'}'}
      </div>
    );
  }

  let valColor = 'text-emerald-300';
  if (typeof data === 'string') valColor = 'text-amber-200';
  if (typeof data === 'boolean') valColor = 'text-rose-300';
  if (typeof data === 'number') valColor = 'text-sky-300';

  return (
      <span className={`${valColor} font-mono block`}>
          {typeof data === 'string' ? `"${data}"` : String(data)}
      </span>
  );
};

interface JsonExplorerProps {
  snapshot: MarketSnapshot;
  thinkingText?: string | null;
}

const JsonExplorer: React.FC<JsonExplorerProps> = ({ snapshot, thinkingText }) => {
  return (
    <div className="flex-1 flex gap-4 overflow-hidden min-h-0 h-full animate-in fade-in zoom-in-95 duration-300">
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                 <Code className="w-5 h-5 text-indigo-400" />
               </div>
               <div>
                 <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">System Input</h2>
                 <p className="text-[10px] text-slate-500 font-mono">RAW TELEMETRY SNAPSHOT</p>
               </div>
             </div>
             <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400">
                {snapshot.input.current_et_time}
             </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-slate-950/30 font-mono text-sm leading-relaxed">
             <AnnotatedJsonNode data={snapshot.input} />
          </div>
        </div>

        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
           <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                 <Brain className="w-5 h-5 text-emerald-400" />
               </div>
               <div>
                 <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Neural Output</h2>
                 <p className="text-[10px] text-slate-500 font-mono">DECODED SIGNAL & REASONING</p>
               </div>
             </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-slate-950/30 font-mono text-sm leading-relaxed space-y-8">
             <div>
                <div className="mb-2 flex items-center gap-2">
                   <FileJson className="w-4 h-4 text-emerald-500" />
                   <span className="text-xs font-black uppercase text-emerald-600">Final Schema</span>
                </div>
                <AnnotatedJsonNode data={(() => {
                    if (!snapshot.decoded) return null;
                    const { thinking, ...rest } = snapshot.decoded;
                    return rest;
                })()} />
             </div>

             {thinkingText && (
               <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 relative">
                  <div className="absolute -top-3 left-4 bg-slate-950 px-2 flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>Chain of Thought</span>
                  </div>
                  <p className="text-indigo-200/80 whitespace-pre-wrap text-xs">{thinkingText}</p>
               </div>
             )}
          </div>
        </div>
    </div>
  );
};

export default JsonExplorer;
