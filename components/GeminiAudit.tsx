
import React, { useState, useEffect, useMemo } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Brain, 
  Quote, 
  ChevronRight,
  MessageSquare,
  Send,
  Rocket,
  GraduationCap,
  HardDrive,
  Database,
  Check,
  Copy,
  ClipboardCheck,
  Ban
} from 'lucide-react';
import ChatPanel from './ChatPanel';

interface GeminiAuditProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
  isGlobalChatOpen?: boolean;
  tpoAnalysisContent?: string;
}

// URLs
const QUESTIONS_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-questions.json";
const GROK_MEMORY_URL = "https://storage.googleapis.com/rockit-data/inference/grok-memory.md";
const PSYCH_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-psychology.md";

const DEFAULT_QUESTIONS = {
  "Session Structure": [
    "Identify the Day Type based on current structure.",
    "Is the Initial Balance (IB) statistically significant?",
    "Analyze the TPO distribution shape.",
    "Are there any single prints or anomalies?"
  ],
  "Strategic Alignment": [
    "What is the current bias confidence?",
    "Where is the invalidation point for the current trend?",
    "Is value migrating with price?",
    "Check for volume divergences."
  ],
  "Psychology Check": [
    "Am I fighting the dominant auction?",
    "Is the market rotational or trending?",
    "What is the risk of a reversal here?"
  ]
};

const GeminiAudit: React.FC<GeminiAuditProps> = ({ snapshots, currentSnapshot, isGlobalChatOpen, tpoAnalysisContent }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Data State
  const [categorizedQuestions, setCategorizedQuestions] = useState<Record<string, string[]>>({});
  const [grokMemory, setGrokMemory] = useState<string | null>(null);
  const [psychContent, setPsychContent] = useState<string>('');
  
  // Control State
  const [useGrokMemory, setUseGrokMemory] = useState(false); // Default OFF

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastContext, setLastContext] = useState<string>('');

  // Point-in-time logic: Filter snapshots to only include data up to current time
  const historyPointInTime = useMemo(() => {
    if (!snapshots || !currentSnapshot) return [];
    const currentTime = currentSnapshot.input.current_et_time;
    // Sort by time just in case, then filter
    return snapshots
        .filter(s => s.input.current_et_time <= currentTime)
        .sort((a, b) => a.input.current_et_time.localeCompare(b.input.current_et_time));
  }, [snapshots, currentSnapshot]);

  // Fetch data on mount
  useEffect(() => {
    const initData = async () => {
        const cacheBuster = Date.now();
        
        // 1. Fetch Questions
        try {
            const res = await fetch(`${QUESTIONS_URL}?cb=${cacheBuster}`);
            if (res.ok) {
                const data = await res.json();
                if (Object.keys(data).length > 0) setCategorizedQuestions(data);
            }
        } catch (e) {
            console.warn("Using default questions:", e);
            setCategorizedQuestions(DEFAULT_QUESTIONS);
        }

        // 2. Fetch Grok Memory
        try {
            const memRes = await fetch(`${GROK_MEMORY_URL}?cb=${cacheBuster}`);
            if (memRes.ok) {
                const text = await memRes.text();
                if (text.length > 50) setGrokMemory(text);
            }
        } catch (e) {
            console.warn("No Grok memory found (optional).");
        }

        // 3. Fetch Psychology Protocol
        try {
            const psychRes = await fetch(`${PSYCH_URL}?cb=${cacheBuster}`);
            if (psychRes.ok) {
                const text = await psychRes.text();
                if (text.length > 50) setPsychContent(text);
            }
        } catch (e) {
            console.warn("No Psychology Protocol found.");
        }
    };
    initData();
  }, []);

  const generateAudit = async () => {
    if (!historyPointInTime || historyPointInTime.length === 0) {
      setError("No session data available up to this timestamp.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');
    setCopied(false);
    setIsChatOpen(false); // Reset chat context

    try {
      // 1. Condense Data for Context Window (Using strictly history up to now)
      const contextData = historyPointInTime.map(s => ({
        time: s.input.current_et_time,
        price: s.input.intraday.ib.current_close,
        bias: s.decoded?.bias || 'N/A',
        narrative: s.decoded?.one_liner || '',
        dpoc: s.input.intraday.volume_profile.current_session.poc,
        migration: s.input.intraday.dpoc_migration.migration_direction,
        tpo_shape: s.input.intraday.tpo_profile.tpo_shape
      }));

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 3. Construct Prompt (Psychology moved to END)
      let prompt = `
        You are a master Market Profile trading coach and psychologist.
        
        ---------------------------------------------------------
        🧠 LONG-TERM MEMORY (GROK EXPERIENCE - LAST 75 DAYS):
        ${(useGrokMemory && grokMemory) ? grokMemory : "Memory Module Disabled. Rely on standard principles."}
        ---------------------------------------------------------
        
        📍 CURRENT SESSION CONTEXT:
        Current Time: ${currentSnapshot?.input?.current_et_time}
        
        (Analyze only the provided data history up to this point. Do not use future knowledge.)

        SESSION DATA HISTORY:
        ${JSON.stringify(contextData)}

        ---------------------------------------------------------
        🔍 TPO ANALYSIS GUIDELINES:
        ${tpoAnalysisContent || "Standard TPO Principles Apply."}
        ---------------------------------------------------------

        ---------------------------------------------------------
        🧘 PSYCHOLOGY PROTOCOL (TRADER SUPPORT):
        ${psychContent || "No Psychology Protocol Loaded."}
        ---------------------------------------------------------
      `;

      if (customQuery.trim()) {
        prompt += `
          USER QUESTION: "${customQuery}"

          INSTRUCTIONS:
          1. Reference the "Grok Experience" memory if relevant patterns exist.
          2. Use the "Psychology Protocol" to detect signs of tilt, fear, or greed in the user's question or market conditions.
          3. If the question relates to TPO, strictly adhere to the "TPO ANALYSIS GUIDELINES".
          4. Answer specifically based on the SESSION DATA up to ${currentSnapshot?.input?.current_et_time}.
          5. Format the response in clear Markdown with bold key terms.
        `;
      } else {
        prompt += `
          OBJECTIVE:
          Generate a "Session Coach" report. Compare the current session behavior against your Long-Term Memory (Grok Experience) to identify recurring patterns or deviations.

          FORMAT REQUIREMENTS (Markdown):

          ## ⚡ Situational Awareness (${currentSnapshot?.input?.current_et_time})
          (A concise summary of the session's character SO FAR)

          ## 🧠 Memory Recall (Pattern Matching)
          (Does today resemble any specific days or setups from the Grok Memory? If so, how did those resolve?)

          ## 🕰 Chronological Progression
          (Break down the key rotations provided in the data)

          ## 🛡 Coach's Corner
          *   **The "Morph":** Did the day type change recently?
          *   **The Trap:** Where might traders be getting offsides right now?
          *   **Actionable Insight:** One key thing to watch for in the next 30 minutes.
        `;
      }

      setLastContext(prompt);

      // 4. Call API
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.7,
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
      setError(err.message || "Failed to generate audit. Check API Key configuration.");
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

  // Improved Markdown Renderer with Larger Fonts
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/20 pb-2"><Sparkles className="w-6 h-6" />{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold text-slate-200 mt-8 mb-3 uppercase tracking-wider bg-slate-800/50 p-3 rounded-xl border-l-4 border-indigo-500 shadow-lg">{line.replace('### ', '')}</h3>;
      }
      if (line.trim().startsWith('*   **')) {
        const content = line.replace('*   **', '').replace('**', ':');
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
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-5">
        {/* Top Row: Title */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <GraduationCap className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-slate-200">Gemini Coach</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono">POINT-IN-TIME ANALYSIS</span>
                        <button
                            onClick={() => grokMemory && setUseGrokMemory(!useGrokMemory)}
                            disabled={!grokMemory}
                            title={!grokMemory ? "Grok Memory file not found" : "Toggle Long-Term Memory"}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                                useGrokMemory 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                            } ${!grokMemory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className={`w-3 h-3 rounded-[2px] border flex items-center justify-center transition-colors ${
                                useGrokMemory ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 bg-transparent'
                            }`}>
                                {useGrokMemory && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[4]" />}
                            </div>
                            <span className="flex items-center gap-1.5">
                                <Database className="w-3 h-3" />
                                Grok Memory
                            </span>
                        </button>
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

        {/* Question Selector & Input Row */}
        <div className="flex flex-col gap-4">
            {/* Suggestions Dropdown */}
            <select
                className="w-full bg-slate-950/50 border border-slate-700/50 text-slate-300 text-sm font-medium rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all hover:bg-slate-900/80 cursor-pointer shadow-inner"
                onChange={(e) => setCustomQuery(e.target.value)}
                value=""
            >
                 <option value="" disabled>Select a suggested question...</option>
                 {Object.keys(categorizedQuestions).length > 0 ? (
                    Object.entries(categorizedQuestions).map(([category, questions]) => (
                        <optgroup key={category} label={category} className="bg-slate-900 text-indigo-400 font-black uppercase tracking-widest text-xs">
                            {Array.isArray(questions) && questions.map((q, idx) => (
                                <option key={idx} value={q} className="bg-slate-950 text-slate-300 font-sans normal-case text-sm py-1">
                                    {q}
                                </option>
                            ))}
                        </optgroup>
                    ))
                 ) : (
                    <option disabled className="text-slate-500">Loading suggested questions...</option>
                 )}
            </select>

            <div className="flex gap-3 h-12">
                <div className="relative flex-1 group h-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <MessageSquare className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && generateAudit()}
                        placeholder={useGrokMemory ? "Ask with Grok context..." : "Ask your coach anything..."}
                        className="w-full h-full bg-slate-950/50 border border-slate-700/50 text-slate-200 text-base rounded-xl pl-12 pr-4 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-medium shadow-inner"
                    />
                </div>
                {!loading && (
                    <button 
                        onClick={generateAudit}
                        className="shrink-0 h-full flex items-center gap-2 px-8 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5"
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
        title="Coach's Corner"
        contextData={lastContext}
        initialReport={report}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/30 relative">
        
        {/* Empty State */}
        {!report && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Brain className="w-32 h-32 text-slate-700 mb-8" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">Coach is Ready</p>
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 font-mono bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    Monitoring Session up to {currentSnapshot?.input?.current_et_time}
                </div>
            </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">
                    {customQuery ? 'Consulting Coach...' : 'Reviewing Tape...'}
                </p>
                {useGrokMemory && grokMemory && (
                    <p className="text-[10px] text-emerald-400/70 font-mono mt-2 animate-pulse">
                        Accessing Grok Long-Term Memory...
                    </p>
                )}
            </div>
        )}

        {/* Error State */}
        {error && (
            <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5">
                <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wide">Analysis Failed</h3>
                    <p className="text-sm text-rose-300/80 mt-2 font-mono">{error}</p>
                </div>
            </div>
        )}

        {/* Report Content */}
        {report && (
            <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3 opacity-60">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">
                            {customQuery ? 'Custom Query Response' : `Session Review • ${currentSnapshot?.input?.current_et_time}`}
                        </span>
                    </div>
                    
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            copied 
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/30'
                        }`}
                        title="Copy report to clipboard (Notion Ready)"
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

export default GeminiAudit;