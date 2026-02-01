
import React, { useState, useEffect } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Rocket, 
  AlertTriangle, 
  Quote, 
  FileJson,
  CheckCircle2,
  Terminal,
  Copy,
  ClipboardCheck,
  Ban,
  MessageSquare,
  Server,
  RefreshCw,
  Wifi,
  Laptop
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import { API_BASE_URL } from '../utils/dataHelpers';
import { appendJournalEntry } from '../utils/journalService';

interface RockitAuditProps {
  snapshots: MarketSnapshot[];
  isGlobalChatOpen?: boolean;
  sessionDate: string;
  snapshotTime: string;
}

const PSYCH_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-psychology.md";

const RockitAudit: React.FC<RockitAuditProps> = ({ snapshots, isGlobalChatOpen, sessionDate, snapshotTime }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [psychContent, setPsychContent] = useState<string>('');

  // Server Hello State
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'live' | 'simulated'>('idle');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastContext, setLastContext] = useState<string>('');

  // Fetch Psychology Protocol
  useEffect(() => {
    fetch(`${PSYCH_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPsychContent(t))
      .catch(e => console.warn("RockitAudit: Psychology fetch failed", e));
  }, []);

  // Auto-Ping Server on Mount
  useEffect(() => {
    callServerHello();
  }, []);

  const callServerHello = async () => {
    setServerStatus('checking');
    setServerMessage("Handshaking...");
    
    try {
      // Attempt to fetch from external backend using relative proxy path /api
      // Try /welcome first as per requirements
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API_BASE_URL}/welcome`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Welcome endpoint might return JSON or Text
      if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              setServerMessage(data.message || "Connected to Rockit API");
              setSessionId(data.sessionId || "SESSION-ACTIVE");
          } else {
              const text = await res.text();
              setServerMessage(text.substring(0, 50) || "Connected");
              setSessionId("WEB-SESSION");
          }
          setServerStatus('live');
      } else {
         throw new Error(`Backend Unavailable (HTTP ${res.status})`);
      }

    } catch (e: any) {
      console.warn("Server Check Failed (Switching to Simulation):", e);
      // Fallback simulation
      setServerStatus('simulated');
      setServerMessage("Backend Unreachable - Offline Mode");
      setSessionId("local-" + Math.random().toString(36).substring(2, 10));
    }
  };

  const generateRockitAnalysis = async () => {
    if (!snapshots || snapshots.length === 0) {
      setError("No session data available to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');
    setCopied(false);
    setIsChatOpen(false); // Reset chat
    setStatus('Initializing ROCKIT Protocol...');

    try {
      // 1. Fetch Inference Logic
      setStatus('Fetching Inference Logic (ROCKIT Knowledge Base)...');
      let inferenceContext = "";
      try {
        const res = await fetch("https://storage.googleapis.com/rockit-data/inference/inference-json.md");
        if (res.ok) {
            inferenceContext = await res.text();
        } else {
            throw new Error(`Failed to load inference logic: ${res.status}`);
        }
      } catch (e: any) {
        throw new Error(`Knowledge Base Connection Failed: ${e.message}`);
      }

      // 2. Prepare Data (Strictly Inputs, Ignoring existing outputs)
      setStatus('Sanitizing Session Data inputs...');
      const contextData = snapshots.map(s => ({
        timestamp: s.input.current_et_time,
        market_state: {
            price: s.input.intraday.ib.current_close,
            vwap_dist: s.input.intraday.ib.price_vs_vwap,
            ib_status: s.input.intraday.ib.ib_status,
            ib_location: s.input.intraday.ib.price_vs_ib
        },
        structure: {
            dpoc: s.input.intraday.volume_profile.current_session.poc,
            dpoc_migration: s.input.intraday.dpoc_migration.migration_direction,
            tpo_shape: s.input.intraday.tpo_profile.tpo_shape,
            single_prints: {
                above: s.input.intraday.tpo_profile.single_prints_above_vah,
                below: s.input.intraday.tpo_profile.single_prints_below_val
            }
        },
        confluences: s.input.core_confluences
      }));

      // 3. Initialize Gemini
      setStatus('Connecting to Neural Engine...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 4. Construct Prompt (Psychology at END)
      const prompt = `
        You are a Senior Trading Analyst utilizing the ROCKIT Market Profile Framework.
        
        Your task is to provide a "Second Opinion" TLDR Audit of the session based STRICTLY on the provided raw input data and the Reference Logic.
        Ignore any prior analysis found in the source files. Re-evaluate the structure from scratch.

        -----------------------------------------
        REFERENCE LOGIC (THE RULES):
        ${inferenceContext}
        -----------------------------------------

        SESSION DATA (TIME-SERIES):
        ${JSON.stringify(contextData)}

        -----------------------------------------
        PSYCHOLOGY PROTOCOL (TRADER SUPPORT):
        ${psychContent || "No Psychology Protocol Loaded."}
        -----------------------------------------

        OUTPUT REQUIREMENTS:
        Generate a Markdown report with the following specific sections:

        ## 🚀 ROCKIT Second Opinion (TLDR)
        - **Day Type Verdict:** Explicitly state the Day Type (e.g., Trend Day, Neutral Extreme) based on the Reference Logic rules.
        - **The Morph:** Identify the specific time/event where the day "morphed" or confirmed its type.
        - **Structural Validation:** Cite 2-3 specific data points (e.g., "DPOC migration > 20pts", "Single Prints > 100") that confirm this verdict.

        ## 🔬 Structural Dissection
        - **Auction Integrity:** Is the auction healthy or broken? (Reference TPO Shape/Single Prints).
        - **Value Migration:** Analyze the DPOC movement vs Price. Are they aligned or divergent?
        - **Trapped Traders:** Identify where the "Gotcha" moment occurred.

        ## 🔮 Forward Watch
        - **Key Level:** One price level to watch for the next session based on today's close.
        - **Bias:** Bullish/Bearish/Neutral going forward.
      `;

      setLastContext(prompt);

      // 5. Call API
      setStatus('Synthesizing Analysis...');
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.5, // Lower temperature for more analytical adherence
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setReport(prev => prev + text);
        }
      }

      // Save to Journal
      if (fullText) {
          await appendJournalEntry(sessionDate, snapshotTime, "_audit_rockit", fullText);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Audit failed.");
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 mt-8 mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-2"><Rocket className="w-5 h-5 text-emerald-400" />{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-bold text-slate-200 mt-6 mb-2 uppercase tracking-wider bg-slate-800/50 p-2 rounded-lg border-l-2 border-emerald-500">{line.replace('### ', '')}</h3>;
      }
      if (line.trim().startsWith('- **')) {
        const content = line.replace('- **', '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        return (
            <div key={i} className="flex gap-2 mb-2 ml-4">
                <span className="text-slate-400 font-bold shrink-0">{title}:</span>
                <span className="text-slate-300">{rest.join(':')}</span>
            </div>
        );
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-6 list-disc text-slate-300 my-1">{line.replace('- ', '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      
      return <p key={i} className="text-slate-400 leading-relaxed mb-1">{line}</p>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
       {/* Background Grid */}
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
       }}></div>

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Rocket className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">ROCKIT Framework Audit</h2>
                <p className="text-[10px] text-slate-500 font-mono">SECOND OPINION PROTOCOL • KNOWLEDGE BASE ACTIVE</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {!loading && report && (
                <button 
                    onClick={() => !isGlobalChatOpen && setIsChatOpen(!isChatOpen)}
                    disabled={isGlobalChatOpen}
                    className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${
                        isGlobalChatOpen 
                            ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                            : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                    title={isGlobalChatOpen ? "Disabled: Global Chat Active" : "Open Local Chat"}
                >
                    {isGlobalChatOpen ? <Ban className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    <span>Chat</span>
                </button>
            )}
            
            <button 
                onClick={callServerHello}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg border border-indigo-500/50"
            >
                {serverStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                <span>Check Server</span>
            </button>

            {!loading && (
                <button 
                    onClick={generateRockitAnalysis}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] group"
                >
                    <FileJson className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Run Logic</span>
                </button>
            )}
        </div>
      </div>

      {/* Server Status Bar */}
      <div className={`px-6 py-3 border-b font-mono text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1 relative z-10 ${
          serverStatus === 'live' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' :
          serverStatus === 'simulated' ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-300' :
          'bg-slate-950/50 border-slate-800 text-slate-400'
      }`}>
          <div className="flex items-center gap-3">
              {serverStatus === 'checking' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {serverStatus === 'live' && <Wifi className="w-4 h-4" />}
              {serverStatus === 'simulated' && <Laptop className="w-4 h-4" />}
              
              <span className="font-bold tracking-wider uppercase">
                  {serverStatus === 'idle' && "Ready"}
                  {serverStatus === 'checking' && "Connecting..."}
                  {serverStatus === 'live' && "System Online"}
                  {serverStatus === 'simulated' && "Offline"}
              </span>
          </div>
          
          <div className="flex items-center gap-4">
              <span className="opacity-70">{serverMessage || "Waiting for check..."}</span>
              {sessionId && (
                  <span className="px-2 py-0.5 rounded bg-black/20 border border-white/10 text-[10px]">
                      ID: {sessionId}
                  </span>
              )}
          </div>
      </div>

      {/* CHAT PANEL */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title="ROCKIT Audit"
        contextData={lastContext}
        initialReport={report}
        sessionDate={sessionDate}
        snapshotTime={snapshotTime}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50 relative z-10">
        
        {/* Empty State */}
        {!report && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Terminal className="w-24 h-24 text-slate-700 mb-6" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-600">Awaiting Sequence Start</p>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500 font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Knowledge Base Link Ready
                </div>
            </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                    <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-400 animate-bounce" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 animate-pulse">
                    {status || 'Processing...'}
                </p>
                <div className="mt-4 flex flex-col items-center gap-1.5 w-64">
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-progress-indeterminate"></div>
                    </div>
                </div>
            </div>
        )}

        {/* Error State */}
        {error && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Protocol Failure</h3>
                    <p className="text-xs text-rose-300/80 mt-1 font-mono">{error}</p>
                </div>
            </div>
        )}

        {/* Report Content */}
        {report && (
            <div className="max-w-4xl mx-auto space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2 opacity-50">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-mono text-emerald-500/70 uppercase">
                            Analysis Complete • Generated by ROCKIT Logic
                        </span>
                    </div>

                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            copied 
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                        title="Copy report to clipboard (Notion Ready)"
                    >
                        {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {copied ? 'Copied' : 'Copy'}
                        </span>
                    </button>
                </div>
                
                <div className="prose prose-invert prose-headings:font-black prose-p:text-slate-400 max-w-none">
                    {renderMarkdown(report)}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-800/50 flex items-center justify-center">
                    <Quote className="w-6 h-6 text-slate-700" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default RockitAudit;
