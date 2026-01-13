
import React, { useState, useMemo, useEffect } from 'react';
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
  Gauge,
  BookOpen,
  Link2,
  Unlink,
  Loader2
} from 'lucide-react';

interface TradeIdeaProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
}

// Updated to plural 'playbooks.md' based on user feedback
const PLAYBOOK_URL = "https://storage.googleapis.com/rockit-data/inference/playbooks.md";

const TradeIdea: React.FC<TradeIdeaProps> = ({ snapshots, currentSnapshot }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<string | null>(null);
  const [playbookStatus, setPlaybookStatus] = useState<'loading' | 'active' | 'error'>('loading');

  // Fetch Playbook on Mount
  useEffect(() => {
    const fetchPlaybook = async () => {
        setPlaybookStatus('loading');
        try {
            const res = await fetch(`${PLAYBOOK_URL}?cb=${Date.now()}`);
            if (res.ok) {
                const text = await res.text();
                if (text.length > 50) {
                    setPlaybook(text);
                    setPlaybookStatus('active');
                } else {
                    console.warn("Playbook file empty or too short");
                    setPlaybookStatus('error');
                }
            } else {
                console.warn(`Playbook fetch failed: ${res.status}`);
                setPlaybookStatus('error');
            }
        } catch (e) {
            console.warn("Playbook fetch failed, network error:", e);
            setPlaybookStatus('error');
        }
    };
    fetchPlaybook();
  }, []);

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
      
      // 1. Full Session Telemetry (Input + Output History)
      // We map the entire history to give the model the "flow" of the session.
      const sessionTelemetry = historyPointInTime.map(s => ({
        time: s.input.current_et_time,
        // Deterministic Data
        price: s.input.intraday.ib.current_close,
        vwap: s.input.intraday.ib.current_vwap,
        ib_status: s.input.intraday.ib.ib_status,
        tpo_shape: s.input.intraday.tpo_profile.tpo_shape,
        dpoc: s.input.intraday.volume_profile.current_session.poc,
        logic_signals: {
            ib_acceptance: s.input.core_confluences.ib_acceptance,
            migration: s.input.core_confluences.migration?.net_direction
        },
        // LLM Output Data (The "Chain of Thought" so far)
        ai_bias: s.decoded?.bias || 'N/A',
        ai_narrative: s.decoded?.one_liner || ''
      }));

      const prompt = `
        Role: Senior Execution Strategist (Futures).
        
        TIMESTAMP FOR ANALYSIS: ${lastInput.current_et_time}
        (Strictly ignore any market data occurring after this time)

        ==================================================================================
        PART 1: THE PLAYBOOK (STRATEGIC RULES)
        (Strictly adhere to the specific entry/exit criteria defined here)
        ${playbook ? playbook : "NO PLAYBOOK FOUND. RELY ON STANDARD AUCTION THEORY."}
        ==================================================================================

        PART 2: TPO & PROFILE STRUCTURE (THE MAP)
        (Visual Structure Analysis)
        - Shape: ${lastInput.intraday.tpo_profile.tpo_shape}
        - Value Area: VAH ${lastInput.intraday.tpo_profile.current_vah} | POC ${lastInput.intraday.tpo_profile.current_poc} | VAL ${lastInput.intraday.tpo_profile.current_val}
        - Anomalies: 
          * Poor High: ${lastInput.intraday.tpo_profile.poor_high ? 'YES (Repair Target)' : 'NO'}
          * Poor Low: ${lastInput.intraday.tpo_profile.poor_low ? 'YES (Repair Target)' : 'NO'}
        - Single Prints (Rejection Zones):
          * Above VAH: ${lastInput.intraday.tpo_profile.single_prints_above_vah} ticks
          * Below VAL: ${lastInput.intraday.tpo_profile.single_prints_below_val} ticks
        - Fattening Zone: ${lastInput.intraday.tpo_profile.fattening_zone}

        PART 3: FULL SESSION TELEMETRY (THE STORY)
        (Chronological sequence of Price, Algo Logic, and previous AI Assessments)
        ${JSON.stringify(sessionTelemetry)}

        PART 4: CURRENT CONFLUENCES (LOGIC TAB)
        ${JSON.stringify(lastInput.core_confluences)}
        ==================================================================================

        TASK:
        Based on the "Playbook" rules and the "Full Session Telemetry", generate the Daily Trade Plan.
        
        REQUIREMENTS:
        1. Compare the Bullish Case vs. Bearish Case.
        2. Explicitly RATE which one is the "Primary Setup" (Higher Probability) and which is the "Counter/Hedge".
        3. Explain WHY based on the TPO Structure (e.g., "Primary is Long because we have Poor Highs to repair and Single Prints holding below").
        4. For the defined plays, you MUST identify precise levels for Entry, Risk Exit (Stop), and Targets based on the current price of ${lastInput.intraday.ib.current_close}.

        OUTPUT FORMAT (Markdown):

        ## ⚖️ Probability Assessment
        - **Favored Bias:** [LONG / SHORT]
        - **Confidence Score:** [0-100%]
        - **The "Why":** (Synthesize the TPO anomalies, Playbook rules, and recent flow)

        ## 🥇 PRIMARY SETUP (Highest Likelihood)
        - **Playbook Play:** (Name of the specific play from Playbook)
        - **Trigger Condition:** (Specific event, e.g. "Reclaim VWAP")
        - **Entry Zone:** [Specific Price Range]
        - **Risk Exit (Stop):** [Specific Price]
        - **Target 1:** [Specific Price]
        - **Target 2:** [Specific Price]
        - **⚠️ Caution:** (Specific risk factors to watch)

        ## 🥈 HEDGE SETUP (Counter-Trend / Alternative)
        - **Playbook Play:** (Name of the specific play from Playbook)
        - **Logic:** (What needs to fail for this to activate?)
        - **Entry Zone:** [Specific Price Range]
        - **Risk Exit (Stop):** [Specific Price]
        - **Target 1:** [Specific Price]
        - **Target 2:** [Specific Price]
        - **⚠️ Caution:** (Specific risk factors to watch)

        ## 🛡 Execution Nuance
        - (Specific advice from the Playbook or TPO context regarding sizing or timing)
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.4, // Low temp for precision
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
      if (line.includes('Probability Assessment')) {
        return (
          <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/30 pb-3">
             <Gauge className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('PRIMARY SETUP')) {
        return (
          <h2 key={i} className="text-xl font-black text-emerald-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-emerald-500/30 pb-3">
             <Target className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('HEDGE SETUP') || line.includes('Counter-Trend')) {
        return (
          <h2 key={i} className="text-xl font-black text-amber-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-amber-500/30 pb-3">
             <Shield className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}
          </h2>
        );
      }
      if (line.includes('Execution Nuance')) {
        return (
            <h2 key={i} className="text-lg font-black text-slate-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b border-slate-700 pb-2">
                <BookOpen className="w-5 h-5" /> {line.replace(/#+/g, '').trim()}
            </h2>
        );
      }

      // Key-Value pairs (Bolded start)
      if (line.trim().startsWith('- **') || line.trim().startsWith('* **')) {
        const content = line.replace(/^[-*] \*\*/, '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        
        let valColor = "text-slate-200";
        if (title.includes("Target")) valColor = "text-emerald-300";
        if (title.includes("Stop") || title.includes("Exit")) valColor = "text-rose-300";
        if (title.includes("Entry")) valColor = "text-blue-300";
        if (title.includes("Favored Bias")) valColor = "text-indigo-300";
        if (title.includes("Confidence")) valColor = "text-amber-300";
        if (title.includes("Trigger")) valColor = "text-sky-300";
        if (title.includes("Caution")) valColor = "text-orange-300";

        return (
            <div key={i} className="flex gap-4 mb-3 ml-2 items-baseline text-base">
                <span className="text-slate-500 font-black uppercase tracking-wider shrink-0 w-36 text-right">{title}:</span>
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
                     
                     {/* Playbook Status */}
                     {playbookStatus === 'loading' && (
                         <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500 font-bold animate-pulse">
                             <Loader2 className="w-3 h-3 animate-spin" /> Linking Playbook...
                         </span>
                     )}
                     {playbookStatus === 'active' && (
                         <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
                             <Link2 className="w-3 h-3" /> Playbook Linked
                         </span>
                     )}
                     {playbookStatus === 'error' && (
                         <span title={`Failed to fetch: ${PLAYBOOK_URL}`} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 font-bold cursor-help">
                             <Unlink className="w-3 h-3" /> Playbook Unlinked
                         </span>
                     )}
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
                    Scanning Playbook...
                </p>
                <div className="mt-6 flex flex-col items-center gap-2 w-72">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-progress-indeterminate"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Processing Full Session Telemetry...</span>
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
