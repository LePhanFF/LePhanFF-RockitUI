
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
  FileText,
  Upload
} from 'lucide-react';

interface HTFCoachProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
}

// Data Sources - Google Drive Export Links
const CSV_URLS = {
    'nq': 'https://drive.google.com/uc?id=17pcZ1QKq-XTf0WKCv8cG32_MhcJpO9Sg&export=download',
    'es': 'https://drive.google.com/uc?id=1tUe5jFHbPUF0IG7vnVo1rv9ARXRMFDoj&export=download',
    'ym': 'https://drive.google.com/uc?id=1CWh3hLNnZRjkfThbLRCqJphZQqtjEKoI&export=download'
};

const QUESTIONS_URL = "https://raw.githubusercontent.com/LePhanFF/LePhanFF-RockitUI/main/gemini-htf-questions.json";

// Aggregated Candle Interface
interface AggregatedCandle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const HTFCoach: React.FC<HTFCoachProps> = ({ snapshots, currentSnapshot }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [categorizedQuestions, setCategorizedQuestions] = useState<Record<string, string[]>>({});
  
  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualData, setManualData] = useState({ es: '', nq: '', ym: '' });

  // Historical Context State
  const [historyContext, setHistoryContext] = useState<{
      es: AggregatedCandle[];
      nq: AggregatedCandle[];
      ym: AggregatedCandle[];
  }>({ es: [], nq: [], ym: [] });

  // 1. Fetch Suggested Questions
  useEffect(() => {
    const loadQuestions = async () => {
        try {
            const res = await fetch(QUESTIONS_URL);
            if (res.ok) {
                const data = await res.json();
                setCategorizedQuestions(data);
            }
        } catch (e) {
            console.error("Error loading questions:", e);
        }
    };
    loadQuestions();
  }, []);

  // Parsing Logic (Shared)
  const parseCSV = (text: string): AggregatedCandle[] => {
      try {
        const lines = text.trim().split('\n');
        // Basic check if it looks like CSV
        if (lines.length < 2) return [];

        const dataRows = lines.slice(1); // Skip header
        const dailyMap = new Map<string, { o: number, h: number, l: number, c: number, v: number, count: number }>();
        
        dataRows.forEach(row => {
            const cols = row.split(',');
            if (cols.length < 5) return;
            
            const datePart = cols[0].split(' ')[0]; // Extract YYYY-MM-DD
            
            const open = parseFloat(cols[2]);
            const high = parseFloat(cols[3]);
            const low = parseFloat(cols[4]);
            const close = parseFloat(cols[5]);
            const vol = parseFloat(cols[6]);

            if (isNaN(close)) return;

            if (!dailyMap.has(datePart)) {
                dailyMap.set(datePart, { o: open, h: high, l: low, c: close, v: vol, count: 1 });
            } else {
                const existing = dailyMap.get(datePart)!;
                existing.h = Math.max(existing.h, high);
                existing.l = Math.min(existing.l, low);
                existing.c = close; 
                existing.v += vol;
                existing.count++;
            }
        });

        return Array.from(dailyMap.entries()).map(([date, val]) => ({
            date,
            open: val.o,
            high: val.h,
            low: val.l,
            close: val.c,
            volume: val.v
        })).sort((a, b) => a.date.localeCompare(b.date));
      } catch (e) {
          console.error("Parse Error", e);
          return [];
      }
  };

  // 2. Fetch and Parse CSV Data (Resampling to Daily/4H)
  useEffect(() => {
    const fetchAndParse = async (originalUrl: string): Promise<AggregatedCandle[]> => {
        try {
            const urlWithConfirm = originalUrl + '&confirm=t';
            
            // Proxy Ladder: CodeTabs -> CorsProxy -> AllOrigins
            const proxyOptions = [
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlWithConfirm)}`,
                `https://corsproxy.io/?${encodeURIComponent(urlWithConfirm)}`,
                `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}` // Try original URL for allorigins
            ];

            let text = '';
            let success = false;

            for (const proxyUrl of proxyOptions) {
                try {
                    const res = await fetch(proxyUrl);
                    if (res.ok) {
                        const content = await res.text();
                        if (!content.trim().startsWith('<!DOCTYPE') && !content.includes('<html') && content.length > 100) {
                            text = content;
                            success = true;
                            break; 
                        }
                    }
                } catch (e) {
                    console.warn(`Proxy failed: ${proxyUrl}`);
                }
            }

            if (!success) {
                console.error(`All proxies failed for: ${originalUrl}`);
                return [];
            }
            
            return parseCSV(text);

        } catch (e) {
            console.error("CSV Load Error:", e);
            return [];
        }
    };

    const loadHistory = async () => {
        setCsvLoading(true);
        try {
            const [esData, nqData, ymData] = await Promise.all([
                fetchAndParse(CSV_URLS.es),
                fetchAndParse(CSV_URLS.nq),
                fetchAndParse(CSV_URLS.ym)
            ]);
            
            if (esData.length === 0 && nqData.length === 0 && ymData.length === 0) {
                setShowManualInput(true); // Trigger fallback UI if automated fetch completely fails
                setError("Automated data link blocked by Google. Please use manual entry below.");
            } else {
                setHistoryContext({ es: esData, nq: nqData, ym: ymData });
                setShowManualInput(false);
            }
        } catch (err) {
            console.warn("Failed to load some HTF data context.");
            setShowManualInput(true);
        } finally {
            setCsvLoading(false);
        }
    };

    loadHistory();
  }, []);

  const handleManualProcess = () => {
      const esData = parseCSV(manualData.es);
      const nqData = parseCSV(manualData.nq);
      const ymData = parseCSV(manualData.ym);

      if (esData.length === 0 && nqData.length === 0 && ymData.length === 0) {
          setError("Could not parse pasted data. Ensure it is CSV format.");
          return;
      }

      setHistoryContext({ es: esData, nq: nqData, ym: ymData });
      setShowManualInput(false);
      setError(null);
  };

  // 3. Generate Analysis
  const generateAnalysis = async () => {
    // Check if we actually have data to send
    const hasData = historyContext.es.length > 0 || historyContext.nq.length > 0 || historyContext.ym.length > 0;
    
    if (!hasData) {
        setError("No HTF Data available. Please paste CSV data.");
        setShowManualInput(true);
        return;
    }

    setLoading(true);
    setError(null);
    setReport('');

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
        const internalHistory = snapshots
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
            .map(([date, snaps]) => {
                const isToday = date === currentDate;
                if (isToday) {
                    const samples = snaps.filter((_, i) => i % 6 === 0 || i === snaps.length - 1);
                    return `SESSION ${date} (TODAY): \n` + samples.map(s => 
                        `  [${s.input.current_et_time}] Px:${s.input.intraday.ib.current_close} | Bias:${s.decoded?.bias} | Narrative:"${s.decoded?.one_liner}"`
                    ).join('\n');
                } else {
                    const last = snaps[snaps.length - 1];
                    return `SESSION ${date} (PRIOR): Closed at ${last.input.intraday.ib.current_close} | Final Bias: ${last.decoded?.bias}`;
                }
            }).join('\n\n');


        // C. Prepare Prompt
        let prompt = `
            You are an expert Multi-Asset Derivatives Strategist (HTF Coach).
            
            CONTEXT:
            Current Session Date: ${currentDate}
            Current Time: ${currentTime}
            
            PART 1: INTERNAL INTELLIGENCE (ROCKIT LOGS)
            (This is what our intraday algo saw recently)
            ${internalSummary}
            
            PART 2: HIGH TIME FRAME DATA (EXTERNAL CSV - Last 20 Days)
            (I have extracted this data from the provided CSVs. Use it for daily chart structure, key levels, and inter-market divergence)
            
            ES (S&P 500 Daily Aggregates):
            ${JSON.stringify(esContext)}
            
            NQ (Nasdaq 100 Daily Aggregates):
            ${JSON.stringify(nqContext)}
            
            YM (Dow Daily Aggregates):
            ${JSON.stringify(ymContext)}
            
            PART 3: CURRENT MOMENT SNAPSHOT
            - Price: ${currentSnapshot.input.intraday.ib.current_close}
            - VWAP: ${currentSnapshot.input.intraday.ib.current_vwap}
            - Current Bias: ${currentSnapshot.decoded?.bias}
        `;

        if (customQuery.trim()) {
            prompt += `
                USER INQUIRY: "${customQuery}"
                
                INSTRUCTIONS:
                Answer the user's specific question by synthesizing the HTF (CSV) data with the Intraday (ROCKIT) context.
                Highlight if the internal intraday bias conflicts with the external daily trend.
                Format in clean Markdown.
            `;
        } else {
            prompt += `
                TASK:
                Perform a High Time Frame (HTF) Alignment Check.
                
                OUTPUT FORMAT (Markdown):
                
                ## 🗺️ Macro Landscape (${currentDate})
                - **Trend Status:** Is the 20-day trend Bullish, Bearish, or Balanced?
                - **Inter-Market Divergence:** How are NQ/YM acting relative to ES?
                
                ## 🔭 Structural Context
                - **Session Continuity:** How does today's intraday action (from ROCKIT Logs) fit into the Daily bars? (e.g., Inside Day, Breakout, Failed Auction).
                - **Key Levels:** Identify major levels from the Daily data that are in play right now.
                
                ## 🎯 Strategic Implication
                - **The Alignment:** Does the HTF Trend support the current "${currentSnapshot.decoded?.bias}" bias?
                - **The Risk:** What is the major HTF failure point to watch?
            `;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.6 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) setReport(prev => prev + chunk.text);
        }

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Analysis failed.");
    } finally {
        setLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/20 pb-2"><MapIcon className="w-6 h-6" />{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold text-slate-200 mt-8 mb-3 uppercase tracking-wider bg-slate-800/50 p-3 rounded-xl border-l-4 border-indigo-500 shadow-lg">{line.replace('### ', '')}</h3>;
      }
      if (line.trim().startsWith('*   **') || line.trim().startsWith('- **')) {
        const content = line.replace(/^[*-] \*\*/, '').replace('**', ':');
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
       {/* Background */}
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
       }}></div>

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-5 relative z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <MapIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-slate-200">HTF Context Coach</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono">MULTI-ASSET DATA LINK</span>
                        {csvLoading ? (
                             <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400 font-bold animate-pulse">
                                <DownloadCloud className="w-3 h-3" /> Fetching CSVs...
                             </span>
                        ) : (
                             <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                                 historyContext.es.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                             }`}>
                                <Layers className="w-3 h-3" /> 
                                {historyContext.es.length > 0 ? 'Data Linked' : 'Connection Error'}
                             </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-indigo-300 font-bold">
                            T: {currentSnapshot?.input?.current_et_time}
                        </span>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[10px] text-slate-500 font-mono hover:text-indigo-400 flex items-center gap-1"
            >
                <FileText className="w-3 h-3" />
                {showManualInput ? 'Hide Input' : 'Manual Input'}
            </button>
        </div>

        {/* Input Controls */}
        <div className="flex flex-col gap-4">
            <select
                className="w-full bg-slate-950/50 border border-slate-700/50 text-slate-300 text-sm font-medium rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all hover:bg-slate-900/80 cursor-pointer shadow-inner"
                onChange={(e) => setCustomQuery(e.target.value)}
                value=""
                disabled={csvLoading || showManualInput}
            >
                 <option value="" disabled>Select a High Time Frame question...</option>
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
                        onKeyDown={(e) => e.key === 'Enter' && !loading && !csvLoading && !showManualInput && generateAnalysis()}
                        placeholder={csvLoading ? "Initializing data streams..." : "Ask about the Daily/Weekly structure..."}
                        disabled={csvLoading || showManualInput}
                        className="w-full h-full bg-slate-950/50 border border-slate-700/50 text-slate-200 text-base rounded-xl pl-12 pr-4 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                {!loading && (
                    <button 
                        onClick={generateAnalysis}
                        disabled={csvLoading || showManualInput}
                        className="shrink-0 h-full flex items-center gap-2 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5"
                    >
                        {customQuery ? (
                            <>
                            <Send className="w-4 h-4" />
                            <span>Ask HTF</span>
                            </>
                        ) : (
                            <>
                            <Sparkles className="w-4 h-4 group-hover:animate-spin" />
                            <span>Full Scan</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Manual Input Fallback Overlay */}
      {showManualInput && (
          <div className="absolute inset-0 top-36 z-50 bg-slate-950/95 p-6 backdrop-blur-md flex flex-col overflow-y-auto">
              <div className="mb-6 border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-black text-rose-400 uppercase flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Manual Data Bridge
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                      Google Drive is blocking automated downloads (Error 403). To proceed, please open the CSV links manually, copy the text content, and paste it into the boxes below.
                  </p>
                  <div className="flex gap-4 mt-4">
                      {Object.entries(CSV_URLS).map(([key, url]) => (
                          <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline font-mono uppercase">
                              Open {key.toUpperCase()} CSV &rarr;
                          </a>
                      ))}
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
                  {['es', 'nq', 'ym'].map((asset) => (
                      <div key={asset} className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase text-slate-500">{asset.toUpperCase()} CSV Data</label>
                          <textarea
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-slate-300 outline-none focus:border-indigo-500 resize-none"
                              placeholder={`Paste ${asset.toUpperCase()} CSV content here...`}
                              value={(manualData as any)[asset]}
                              onChange={(e) => setManualData(prev => ({ ...prev, [asset]: e.target.value }))}
                          />
                      </div>
                  ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                  <button 
                      onClick={() => setShowManualInput(false)}
                      className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={handleManualProcess}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
                  >
                      <Upload className="w-4 h-4" /> Process Manual Data
                  </button>
              </div>
          </div>
      )}

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/30 relative z-10">
        
        {!report && !loading && !error && !showManualInput && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <CalendarDays className="w-32 h-32 text-slate-700 mb-8" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">Macro Lens Standby</p>
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 font-mono bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    Ready to correlate ES / NQ / YM Daily Structure
                </div>
            </div>
        )}

        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-24 h-24 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">
                    Parsing Macro Structure...
                </p>
            </div>
        )}

        {error && !showManualInput && (
            <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5">
                <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wide">Analysis Failed</h3>
                    <p className="text-sm text-rose-300/80 mt-2 font-mono">{error}</p>
                    <button 
                        onClick={() => setShowManualInput(true)}
                        className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg uppercase tracking-wider transition-colors"
                    >
                        Try Manual Import
                    </button>
                </div>
            </div>
        )}

        {report && (
            <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <div className="flex items-center gap-3 mb-10 opacity-60 border-b border-slate-800 pb-4">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">
                        HTF Analysis • {currentSnapshot?.input?.session_date}
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

export default HTFCoach;
