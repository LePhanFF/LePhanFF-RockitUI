
import React, { useState, useMemo } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Lightbulb, 
  Target, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Quote,
  Crosshair,
  TrendingDown,
  Gauge
} from 'lucide-react';

interface TradeIdeaProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
}

const TradeIdea: React.FC<TradeIdeaProps> = ({ snapshots, currentSnapshot }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter history to strictly ensure no look-ahead bias
  const historyPointInTime = useMemo(() => {
    if (!snapshots || !currentSnapshot) return [];
    const currentTime = currentSnapshot.input.current_et_time;
    // Sort by time just in case, then filter
    return snapshots
        .filter(s => s.input.current_et_time <= currentTime)
        .sort((a, b) => a.input.current_et_time.localeCompare(b.input.current_et_time));
  }, [snapshots, currentSnapshot]);

  const generateTradeIdeas = async () => {
    if (!historyPointInTime || historyPointInTime.length === 0) {
      setError("No data available for this timestamp.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');

    try {
      const lastSnapshot = historyPointInTime[historyPointInTime.length - 1];
      const lastInput = lastSnapshot.input;
      
      // Prepare context: Use last 10 frames for trend context + Current Deep Dive
      const recentContext = historyPointInTime.slice(-10).map(s => ({
        time: s.input.current_et_time,
        price: s.input.intraday.ib.current_close,
        vwap: s.input.intraday.ib.current_vwap,
        dpoc: s.input.intraday.volume_profile.current_session.poc,
        bias: s.decoded?.bias || 'N/A',
        narrative: s.decoded?.one_liner || ''
      }));

      const prompt = `
        Role: Senior Execution Strategist (Futures)
        
        TIMESTAMP FOR ANALYSIS: ${lastInput.current_et_time}
        (Strictly ignore any market data occurring after this time)

        DATA PACKET:
        
        1. LOCAL LLM SIGNAL (The "Raw Intelligence"):
           - Bias: ${lastSnapshot.decoded?.bias || "NEUTRAL"}
           - Confidence: ${lastSnapshot.decoded?.confidence || "N/A"}
           - Narrative: "${lastSnapshot.decoded?.one_liner || "N/A"}"
           - Reasoning: ${JSON.stringify(lastSnapshot.decoded?.day_type_reasoning || [])}

        2. MARKET STRUCTURE (The "Hard Data"):
           - Price: ${lastInput.intraday.ib.current_close}
           - VWAP: ${lastInput.intraday.ib.current_vwap}
           - IB Status: ${lastInput.intraday.ib.ib_status} (${lastInput.intraday.ib.ib_low} - ${lastInput.intraday.ib.ib_high})
           - TPO: ${lastInput.intraday.tpo_profile.tpo_shape} | SP Above: ${lastInput.intraday.tpo_profile.single_prints_above_vah} | SP Below: ${lastInput.intraday.tpo_profile.single_prints_below_val}
           - DPOC Migration: ${lastInput.intraday.dpoc_migration.migration_direction} (${lastInput.intraday.dpoc_migration.steps_since_1030} pts)
           - Volume Profile: VAH ${lastInput.intraday.volume_profile.current_session.vah} | POC ${lastInput.intraday.volume_profile.current_session.poc} | VAL ${lastInput.intraday.volume_profile.current_session.val}

        3. RECENT FLOW (Context):
           ${JSON.stringify(recentContext)}

        TASK:
        Synthesize the "Local LLM Signal" with the "Hard Data" to produce actionable trade setups. 
        If the Local LLM is highly confident, align with it. If technicals contradict, propose a counter-play.

        OUTPUT FORMAT (Markdown):

        ## 🧭 STRATEGY BIAS
        - **Direction:** [LONG / SHORT / NEUTRAL]
        - **Conviction:** [0-100%]
        - **The Synthesis:** (One sentence merging the Local LLM's view with specific price structure)

        ## 🟢 PRIMARY SETUP (High Probability)
        - **Trigger Condition:** (e.g. "Reclaim of VWAP", "Test of VAL")
        - **Entry Zone:** [Specific Price Range]
        - **Invalidation (Stop):** [Specific Price]
        - **Target 1:** [Specific Price]
        - **Target 2 (Runner):** [Specific Price]

        ## 🔴 ALTERNATIVE / HEDGE (Counter-Bias)
        - **Logic:** (What needs to fail for this to activate?)
        - **Entry Zone:** [Specific Price Range]
        - **Stop:** [Specific Price]
        - **Target:** [Specific Price]

        ## 🛡 EXECUTION NOTES
        - (Specific nuance, e.g., "Wait for candle close", "Volume spike required")
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.4, // Low temp for precise levels
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          setReport(prev => prev + text);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate trade ideas.");
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.includes('STRATEGY BIAS')) {
        return (
          <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/30 pb-3">
             <Gauge className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('PRIMARY SETUP')) {
        return (
          <h2 key={i} className="text-xl font-black text-emerald-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-emerald-500/30 pb-3">
             <Crosshair className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('ALTERNATIVE') || line.includes('HEDGE')) {
        return (
          <h2 key={i} className="text-xl font-black text-amber-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-amber-500/30 pb-3">
             <TrendingUp className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('EXECUTION NOTES')) {
        return (
            <h2 key={i} className="text-lg font-black text-slate-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b border-slate-700 pb-2">
                <Shield className="w-5 h-5" /> {line.replace(/#+/g, '').trim()}
            </h2>
        );
      }

      // Key-Value pairs (Bolded start)
      if (line.trim().startsWith('- **') || line.trim().startsWith('* **')) {
        const content = line.replace(/^[-*] \*\*/, '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        
        let valColor = "text-slate-200";
        if (title.includes("Target")) valColor = "text-emerald-300";
        if (title.includes("Stop") || title.includes("Invalidation")) valColor = "text-rose-300";
        if (title.includes("Entry")) valColor = "text-blue-300";
        if (title.includes("Direction")) valColor = "text-indigo-300";
        if (title.includes("Conviction")) valColor = "text-amber-300";

        return (
            <div key={i} className="flex gap-4 mb-3 ml-2 items-baseline text-base">
                <span className="text-slate-500 font-black uppercase tracking-wider shrink-0 w-32 text-right">{title}:</span>
                <span className={`font-mono font-bold text-lg ${valColor}`}>{rest.join(':')}</span>
            </div>
        );
      }
      
      // List Items
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-8 list-disc text-slate-300 my-2 text-base leading-relaxed">{line.replace('- ', '')}</li>;
      }
      
      // Empty Lines
      if (line.trim() === '') return <br key={i} />;
      
      // Normal Paragraphs
      return <p key={i} className="text-slate-400 leading-relaxed mb-2 text-base font-medium">{line}</p>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
       {/* Background Grid */}
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
       }}></div>

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Lightbulb className="w-8 h-8 text-amber-400" />
            </div>
            <div>
                <h2 className="text-base font-black uppercase tracking-widest text-slate-200">Trade Idea Generator</h2>
                <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                        TIME: {currentSnapshot?.input?.current_et_time}
                     </span>
                     <span className="text-[10px] text-slate-500 font-mono">
                        POINT-IN-TIME ANALYSIS
                     </span>
                </div>
            </div>
        </div>

        {!loading && (
             <button 
                onClick={generateTradeIdeas}
                className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] group transform hover:-translate-y-0.5"
            >
                <Lightbulb className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Generate Plan</span>
            </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50 relative z-10">
        
        {/* Empty State */}
        {!report && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Shield className="w-32 h-32 text-slate-700 mb-8" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">No Active Trade Plan</p>
                <div className="flex items-center gap-3 mt-6 text-xs text-slate-400 font-mono bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                    Ready to scan market structure at {currentSnapshot?.input?.current_et_time}
                </div>
            </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-10">
                    <div className="w-32 h-32 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-32 h-32 border-4 border-t-amber-500 rounded-full animate-spin"></div>
                    <Lightbulb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-amber-400 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-400 animate-pulse">
                    Synthesizing Strategy...
                </p>
                <div className="mt-6 flex flex-col items-center gap-2 w-72">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-progress-indeterminate"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Consulting Gemini 3 Pro...</span>
                </div>
            </div>
        )}

        {/* Error State */}
        {error && (
            <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5">
                <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wide">Analysis Error</h3>
                    <p className="text-sm text-rose-300/80 mt-2 font-mono">{error}</p>
                </div>
            </div>
        )}

        {/* Report Content */}
        {report && (
            <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <div className="flex items-center gap-3 mb-10 opacity-60 border-b border-slate-800 pb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">
                        Actionable Intelligence • Valid for {currentSnapshot?.input?.current_et_time}
                    </span>
                </div>
                
                <div className="prose prose-invert prose-headings:font-black prose-p:text-slate-300 max-w-none">
                    {renderMarkdown(report)}
                </div>

                <div className="mt-16 pt-10 border-t border-slate-800/50 flex items-center justify-center opacity-30">
                    <Quote className="w-8 h-8 text-slate-500" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TradeIdea;
