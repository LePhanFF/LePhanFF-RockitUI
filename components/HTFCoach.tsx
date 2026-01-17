
import React, { useState, useEffect, useMemo } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Map as MapIcon, 
  AlertTriangle, 
  Clock, 
  Brain, 
  Quote, 
  MessageSquare,
  Send,
  DownloadCloud,
  Layers,
  CalendarDays,
  Copy,
  ClipboardCheck,
  Ban
} from 'lucide-react';
import ChatPanel from './ChatPanel';

interface HTFCoachProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
  isGlobalChatOpen?: boolean;
  externalHtfData?: { es: any[], nq: any[], ym: any[] } | null;
}

const QUESTIONS_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-htf-questions.json";
const PSYCH_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-psychology.md";

const DEFAULT_HTF_QUESTIONS = {
  "Macro Landscape": [
    "Analyze the Daily timeframe trend.",
    "Check Weekly profile balance.",
    "Is the market inside or outside prior day range?",
    "Identify major swing levels nearby."
  ],
  "Inter-Market": [
    "Correlate ES structure with NQ.",
    "Check for divergences between indices.",
    "Analyze volume flow on the daily chart."
  ],
  "Strategic": [
    "Is the intraday action supported by HTF?",
    "Where is the major HTF rejection level?",
    "What is the risk of a multi-day reversal?"
  ]
};

// Aggregated Candle Interface
interface AggregatedCandle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const HTFCoach: React.FC<HTFCoachProps> = ({ snapshots, currentSnapshot, isGlobalChatOpen, externalHtfData }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [categorizedQuestions, setCategorizedQuestions] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);
  
  // Historical Context State
  const [historyContext, setHistoryContext] = useState<{
      es: AggregatedCandle[];
      nq: AggregatedCandle[];
      ym: AggregatedCandle[];
  }>({ es: [], nq: [], ym: [] });

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastContext, setLastContext] = useState<string>('');
  const [psychContent, setPsychContent] = useState<string>('');

  // 1. Fetch Suggested Questions with Fallback
  useEffect(() => {
    const loadQuestions = async () => {
        try {
            // Add cache buster to prevent stale data
            const res = await fetch(`${QUESTIONS_URL}?cb=${Date.now()}`);

            if (res.ok) {
                const data = await res.json();
                if (Object.keys(data).length > 0) {
                    setCategorizedQuestions(data);
                    return;
                }
            }
            throw new Error("Fetch failed or empty");
        } catch (e) {
            console.warn("Using default HTF questions due to load error:", e);
            setCategorizedQuestions(DEFAULT_HTF_QUESTIONS);
        }
    };
    loadQuestions();
  }, []);

  // Fetch Psychology Protocol
  useEffect(() => {
    fetch(`${PSYCH_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPsychContent(t))
      .catch(e => console.warn("HTFCoach: Psychology fetch failed", e));
  }, []);

  // 2. Load Data (From Props)
  useEffect(() => {
    if (externalHtfData) {
        setHistoryContext(externalHtfData);
        setCsvLoading(false);
    } else {
        setCsvLoading(false);
    }
  }, [externalHtfData]);

  // 3. Generate Analysis
  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);
    setReport('');
    setCopied(false);
    setIsChatOpen(false); // Reset chat

    try {
        const currentDate = currentSnapshot.input.session_date;
        const currentTime = currentSnapshot.input.current_et_time;

        // A. Filter External CSV HTF Context (Last 20 Days)
        const filterHistory = (data: AggregatedCandle[]) => {
            return data.filter(d => d.date <= currentDate).slice(-20);
        };

        const esContext = filterHistory(historyContext.es);
        const nqContext = filterHistory(historyContext.nq);
        const ymContext = filterHistory(historyContext.ym);

        // B. Summarize Internal JSONL Context (Rockit Analysis History)
        const internalHistory: Record<string, MarketSnapshot[]> = snapshots
            .filter(s => s.input.current_et_time <= currentTime || s.input.session_date < currentDate)
            .reduce((acc, s) => {
                const d = s.input.session_date;
                if (!acc[d]) acc[d] = [];
                acc[d].push(s);
                return acc;
            }, {} as Record<string, MarketSnapshot[]>);

        const internalSummary = Object.entries(internalHistory)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-3) // Last 3 sessions from internal data
            .map(([date, snaps]: [string, MarketSnapshot[]]) => {
                const isToday = date === currentDate;
                if (isToday) {
                    const samples = snaps.filter((_, i) => i % 6 === 0 || i === snaps.length - 1);
                    return `SESSION ${date} (TODAY): \n` + samples.map(s => 
                        `  [${s.input.current_et_time}]: ${s.input.intraday.ib.current_close} (Vol: ${s.input.intraday.ib.current_volume})`
                    ).join('\n');
                } else {
                     const lastSnap = snaps[snaps.length-1];
                     return `SESSION ${date}: High ${lastSnap.input.premarket.previous_day_high} / Low ${lastSnap.input.premarket.previous_day_low} (Recorded)`;
                }
            }).join('\n\n');

        // C. Construct Prompt
        let prompt = `
            You are a Multi-Timeframe (MTF) Market Strategist.
            
            OBJECTIVE:
            Analyze the relationship between the Intraday Price Action and the Higher Timeframe (Daily/Weekly) Structure.
            
            --------------------------------------------------------
            1. HIGHER TIMEFRAME CONTEXT (DAILY CHART - LAST 20 DAYS):
            ES (S&P 500): ${esContext.length > 0 ? JSON.stringify(esContext) : "DATA UNAVAILABLE - RELY ON INTERNAL MEMORY"}
            NQ (Nasdaq): ${nqContext.length > 0 ? JSON.stringify(nqContext) : "DATA UNAVAILABLE"}
            YM (Dow): ${ymContext.length > 0 ? JSON.stringify(ymContext) : "DATA UNAVAILABLE"}

            2. RECENT SESSION NARRATIVES (INTERNAL MEMORY):
            ${internalSummary}

            3. CURRENT SESSION SNAPSHOT:
            Time: ${currentTime}
            Price: ${currentSnapshot.input.intraday.ib.current_close}
            Bias: ${currentSnapshot.decoded?.bias}
            --------------------------------------------------------

            --------------------------------------------------------
            PSYCHOLOGY PROTOCOL (TRADER SUPPORT):
            ${psychContent || "No Psychology Protocol Loaded."}
            --------------------------------------------------------

            ${customQuery ? `USER QUESTION: "${customQuery}"` : "TASK: Provide a comprehensive Top-Down Analysis."}

            OUTPUT REQUIREMENTS (Markdown):
            
            ## 🌍 Macro Landscape (Daily/Weekly)
            - **Trend Status:** (Bullish/Bearish/Balance on Daily)
            - **Key Levels:** Identify major support/resistance.
            - **Inter-market Divergence:** Are ES, NQ, YM aligned?

            ## 🔬 Intraday Alignment
            - Does today's action confirm or fail the HTF trend?
            - Are we inside or outside the previous day's range?

            ## 🛡 Strategic Outlook
            - **Bull Case:** (What needs to hold?)
            - **Bear Case:** (What needs to break?)
            - **Risk Factor:** (Volatile events or levels)
        `;

        setLastContext(prompt);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents: [
                { role: 'user', parts: [{ text: prompt }] }
            ],
            config: {
                temperature: 0.5,
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
        setError(err.message || "Failed to generate HTF analysis.");
    } finally {
        setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Markdown Render Helper
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.includes('Macro Landscape')) {
        return <h2 key={i} className="text-xl font-black text-sky-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b-2 border-sky-500/20 pb-2"><MapIcon className="w-6 h-6" />{line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.includes('Intraday Alignment')) {
        return <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/20 pb-2"><Layers className="w-6 h-6" />{line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.includes('Strategic Outlook')) {
        return <h2 key={i} className="text-xl font-black text-emerald-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b-2 border-emerald-500/20 pb-2"><Brain className="w-6 h-6" />{line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.trim().startsWith('- **')) {
        const content = line.replace('- **', '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        return (
            <div key={i} className="flex gap-3 mb-3 ml-4 items-baseline">
                <span className="text-slate-300 font-bold shrink-0 text-base">{title}:</span>
                <span className="text-slate-400 text-base leading-relaxed">{rest.join(':')}</span>
            </div>
        );
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-6 list-disc text-slate-300 my-2 text-base leading-relaxed pl-2">{line.replace('- ', '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-slate-300 leading-relaxed mb-2 text-base font-medium">{line}</p>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
       {/* Background Grid */}
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
       }}></div>

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-5 relative z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                    <MapIcon className="w-8 h-8 text-sky-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-slate-200">HTF Strategist</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono">MULTI-TIMEFRAME CONTEXT</span>
                        {csvLoading ? (
                             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 font-bold animate-pulse"><DownloadCloud className="w-3 h-3" /> Fetching CSVs...</span>
                        ) : error ? (
                             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 font-bold cursor-help" title={error}><AlertTriangle className="w-3 h-3" /> Data Error</span>
                        ) : (
                             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold"><CalendarDays className="w-3 h-3" /> Context Active</span>
                        )}
                    </div>
                </div>
            </div>
            {!loading && report && (
                <button 
                    onClick={() => !isGlobalChatOpen && setIsChatOpen(!isChatOpen)}
                    disabled={isGlobalChatOpen}
                    className={`flex items-center gap-2 px-4 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${
                        isGlobalChatOpen 
                            ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                            : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                    title={isGlobalChatOpen ? "Disabled: Global Chat Active" : "Open Local Chat"}
                >
                    {isGlobalChatOpen ? <Ban className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    <span>Chat</span>
                </button>
            )}
        </div>

        {/* Question Input */}
        <div className="flex flex-col gap-4">
            <select
                className="w-full bg-slate-950/50 border border-slate-700/50 text-slate-300 text-sm font-medium rounded-xl py-3 px-4 outline-none focus:border-sky-500 transition-all hover:bg-slate-900/80 cursor-pointer shadow-inner"
                onChange={(e) => setCustomQuery(e.target.value)}
                value=""
            >
                 <option value="" disabled>Select a strategic question...</option>
                 {Object.entries(categorizedQuestions).map(([category, questions]) => (
                    <optgroup key={category} label={category} className="bg-slate-900 text-sky-400 font-black uppercase tracking-widest text-xs">
                        {Array.isArray(questions) && questions.map((q, idx) => (
                            <option key={idx} value={q} className="bg-slate-950 text-slate-300 font-sans normal-case text-sm py-1">
                                {q}
                            </option>
                        ))}
                    </optgroup>
                 ))}
            </select>

            <div className="flex gap-3 h-12">
                <div className="relative flex-1 group h-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <MessageSquare className="w-5 h-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && generateAnalysis()}
                        placeholder="Ask about weekly levels, daily trend, or inter-market correlation..."
                        className="w-full h-full bg-slate-950/50 border border-slate-700/50 text-slate-200 text-base rounded-xl pl-12 pr-4 outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 font-medium shadow-inner"
                    />
                </div>
                {!loading && (
                    <button 
                        onClick={generateAnalysis}
                        className="shrink-0 h-full flex items-center gap-2 px-8 bg-sky-600 hover:bg-sky-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transform hover:-translate-y-0.5"
                    >
                        {customQuery ? (
                            <>
                            <Send className="w-4 h-4" />
                            <span>Ask</span>
                            </>
                        ) : (
                            <>
                            <Sparkles className="w-4 h-4 group-hover:animate-spin" />
                            <span>Analyze</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* CHAT PANEL */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title="HTF Strategist"
        contextData={lastContext}
        initialReport={report}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50 relative z-10">
        
        {/* Empty State */}
        {!report && !loading && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Layers className="w-32 h-32 text-slate-700 mb-8" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">Awaiting Strategic Input</p>
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 font-mono bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></div>
                    HTF Context System Ready
                </div>
            </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-sky-500 rounded-full animate-spin"></div>
                    <MapIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-sky-400 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-sky-400 animate-pulse">
                    Scanning Macro Structure...
                </p>
            </div>
        )}

        {/* Report Content */}
        {report && (
            <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3 opacity-60">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">
                            HTF Analysis • {currentSnapshot?.input?.current_et_time}
                        </span>
                    </div>
                    
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            copied 
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                : 'bg-sky-500/20 border-sky-500/50 text-sky-400 hover:bg-sky-500/30'
                        }`}
                        title="Copy report to clipboard"
                    >
                        {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {copied ? 'Copied' : 'Copy'}
                        </span>
                    </button>
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

export default HTFCoach;
