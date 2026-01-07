import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import { rawSnapshots } from './mockData';
import { GoogleGenAI } from "@google/genai";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  LayoutDashboard, 
  Database, 
  Github, 
  RefreshCw, 
  Timer,
  BrainCircuit,
  Sparkles,
  Wifi,
  WifiOff,
  Activity,
  ChevronRight,
  Zap
} from 'lucide-react';

const GITHUB_REPO = "LePhanFF/RockitDataFeed";
const BASE_URL = "https://api.github.com/repos";
const RAW_URL = "https://raw.githubusercontent.com";
const LOCAL_PATH = "local-analysis-format";
const REFRESH_INTERVAL_SEC = 120; 

const hardenedClean = (raw: string): string => {
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  let firstBrace = text.indexOf('{');
  let lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return text;
  text = text.substring(firstBrace, lastBrace + 1);

  text = text.replace(/([^\\])"(?![ \n\t]*[:,\}\]])/g, '$1\\"');
  text = text.replace(/\n/g, " ");
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  text = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  return text.trim();
};

const salvageIntel = (raw: string): Partial<DecodedOutput> => {
  const salvaged: any = {};
  
  const dayTypeMatch = raw.match(/"(?:day_type|type|market_type)"\s*[:=]\s*(?:\{\s*"type"\s*:\s*)?"(.*?)"/i);
  if (dayTypeMatch) salvaged.day_type = { type: dayTypeMatch[1].trim() };

  const reasoningRegex = /"(?:day_type_reasoning|evidence|reasoning|logic_points|points|strategic_reasoning|analysis_points)"\s*[:=]\s*\[([\s\S]*?)\]/i;
  const rMatch = raw.match(reasoningRegex);
  if (rMatch) {
    const lines = rMatch[1].match(/"(.*?)"(?=\s*[,\]])/g);
    if (lines) {
      salvaged.day_type_reasoning = lines.map(l => l.replace(/^"|"$/g, '').trim());
    }
  }

  const oneLinerRegex = /"(?:one_liner|narrative|market_narrative|summary|conclusion)"\s*[:=]\s*"(.*?)"(?=\s*[,}])/i;
  const oMatch = raw.match(oneLinerRegex);
  if (oMatch) salvaged.one_liner = oMatch[1].trim();

  const biasMatch = raw.match(/"bias"\s*:\s*"(.*?)"/i);
  if (biasMatch) salvaged.bias = biasMatch[1].trim().toUpperCase();

  const confMatch = raw.match(/"confidence"\s*:\s*"(.*?)"/i);
  if (confMatch) salvaged.confidence = confMatch[1].trim();

  const vaMatch = raw.match(/"value_acceptance"\s*:\s*"(.*?)"/i);
  if (vaMatch) salvaged.value_acceptance = vaMatch[1].trim();

  // Liquidity Sweep salvaging with support for 'level'
  const sweepsMatch = raw.match(/"liquidity_sweeps"\s*:\s*(\{[\s\S]*?\})/i);
  if (sweepsMatch) {
    try {
      salvaged.liquidity_sweeps = JSON.parse(hardenedClean(sweepsMatch[1]));
    } catch (e) {
      const sessions = ["asia", "london", "overnight", "previous_day", "previous_week", "ib"];
      const sweeps: any = {};
      sessions.forEach(s => {
        // Try complex regex for status, strength, and optional level
        const sMatch = raw.match(new RegExp(`"${s}"\\s*:\\s*\\{\\s*(?:"level"\\s*:\\s*"(.*?)",?\\s*)?"status"\\s*:\\s*"(.*?)",?\\s*"strength"\\s*:\\s*"(.*?)"`, "i"));
        if (sMatch) {
          if (sMatch[1]) {
            sweeps[s] = { level: sMatch[1], status: sMatch[2], strength: sMatch[3] };
          } else {
            sweeps[s] = { status: sMatch[2], strength: sMatch[3] };
          }
        }
      });
      if (Object.keys(sweeps).length > 0) salvaged.liquidity_sweeps = sweeps;
    }
  }

  // TPO Read salvage
  const tpoRead: any = {};
  const sigMatch = raw.match(/"profile_signals"\s*:\s*"(.*?)"/i);
  if (sigMatch) tpoRead.profile_signals = sigMatch[1].trim();
  const migMatch = raw.match(/"dpoc_migration"\s*:\s*"(.*?)"/i);
  if (migMatch) tpoRead.dpoc_migration = migMatch[1].trim();
  const extMatch = raw.match(/"extreme_or_compression"\s*:\s*"(.*?)"/i);
  if (extMatch) tpoRead.extreme_or_compression = extMatch[1].trim();
  if (Object.keys(tpoRead).length > 0) salvaged.tpo_read = tpoRead;

  return salvaged;
};

const App: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiAudit, setAiAudit] = useState<{ summary: string; shifts: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  
  const slicesEndRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(true);

  const fetchFileList = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${GITHUB_REPO}/contents/${LOCAL_PATH}`);
      if (!res.ok) throw new Error(`Source connection failed: ${res.statusText}`);
      const data = await res.json();
      const files = data
        .filter((f: any) => f.name.endsWith('.json') || f.name.endsWith('.jsonl'))
        .map((f: any) => f.name)
        .sort((a: string, b: string) => b.localeCompare(a));
      setAvailableFiles(files);
      setConnectionStatus('online');
      if (files.length > 0) {
        if (!selectedFile || (autoScrollEnabled.current && selectedFile !== files[0])) {
          handleFileSelect(files[0], true);
        } else if (selectedFile) {
          handleFileSelect(selectedFile, true);
        }
      } else {
        setSnapshots(rawSnapshots);
        setError("No files found in repo. Showing mock data.");
      }
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('offline');
      if (snapshots.length === 0) setSnapshots(rawSnapshots);
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  };

  const handleFileSelect = async (fileName: string, isUpdate = false) => {
    if (!isUpdate) {
      setSelectedFile(fileName);
      setIsLoading(true);
      setAiAudit(null);
    }
    try {
      const res = await fetch(`${RAW_URL}/${GITHUB_REPO}/main/${LOCAL_PATH}/${fileName}?t=${Date.now()}`);
      if (!res.ok) throw new Error("Data stream interrupted");
      const text = await res.text();
      let newSnapshots: any[] = [];
      if (fileName.endsWith('.jsonl')) {
        newSnapshots = text.trim().split('\n').map(line => {
          try { return JSON.parse(line); } catch (e) { return null; }
        }).filter(Boolean);
      } else {
        const data = JSON.parse(text);
        newSnapshots = Array.isArray(data) ? data : [data];
      }
      setSnapshots(newSnapshots);
      setSelectedFile(fileName);
      if (isUpdate || autoScrollEnabled.current) setSelectedIndex(newSnapshots.length - 1);
    } catch (err: any) {
      setError(`Stream Error: ${err.message}`);
    } finally {
      if (!isUpdate) setIsLoading(false);
    }
  };

  const runAiAudit = async () => {
    if (!snapshots.length) return;
    setIsAuditing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const history = processedSnapshots.map(s => ({ t: s.input.current_et_time, b: s.decoded?.bias, d: s.decoded?.day_type?.type }));
      const prompt = `Review market evolution: ${JSON.stringify(history)}. Summarize shifts around 11:00 AM. Return JSON: {"summary": string, "shifts": string[]}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      setAiAudit(JSON.parse(response.text || '{}'));
    } catch (err) {
      setAiAudit({ summary: "Audit failed.", shifts: [] });
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    fetchFileList();
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchFileList(true);
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const processedSnapshots = useMemo(() => {
    return (snapshots || []).map(s => {
      let decoded: DecodedOutput | null = null;
      let thinking = '';
      const rawText = (typeof s.output === 'string' ? s.output : s.llm_output) || '';
      try {
        const tMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
        if (tMatch) thinking = tMatch[1].trim();
        const cleanedText = hardenedClean(rawText);
        try {
          decoded = JSON.parse(cleanedText);
        } catch (parseError) {
          const salvaged = salvageIntel(rawText);
          if (salvaged.day_type_reasoning || salvaged.one_liner || salvaged.day_type || salvaged.liquidity_sweeps) {
            decoded = salvaged as DecodedOutput;
          }
        }
      } catch (e) { console.warn("Extraction failed for " + s.input?.current_et_time); }

      const input = s.input || {
        session_date: s.session_date || 'N/A',
        current_et_time: s.current_et_time || 'N/A',
        premarket: s.premarket || {},
        intraday: s.intraday || { ib: { current_close: s.current_close || 0 } },
        core_confluences: s.core_confluences || {}
      };

      return { 
        ...s, 
        input, 
        decoded: decoded ? { ...decoded, thinking: thinking || decoded.thinking } : null,
        thinking: thinking || (typeof s.output === 'string' ? s.output : '') 
      } as MarketSnapshot & { decoded: DecodedOutput | null, thinking?: string };
    });
  }, [snapshots]);

  const slicesByHour = useMemo(() => {
    const groups: Record<string, { idx: number; s: any }[]> = {};
    processedSnapshots.forEach((s, idx) => {
      const time = s.input?.current_et_time || '00:00';
      const hour = time.split(':')[0] + ':00';
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push({ idx, s });
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [processedSnapshots]);

  const currentSnapshot = processedSnapshots[selectedIndex] || null;
  const decodedOutput = currentSnapshot?.decoded || null;
  const reasoning = decodedOutput?.day_type_reasoning || [];

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-200 font-sans">
      <style>{`
        @keyframes ticker-scroll-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-header {
          animation: ticker-scroll-horizontal 40s linear infinite;
        }
        .animate-ticker-header:hover {
          animation-play-state: paused;
        }
      `}</style>

      <header className="shrink-0 z-[60] bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800/60 px-6 py-4 flex items-center shadow-2xl relative">
        <div className="flex items-center gap-4 shrink-0 mr-6">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xl border border-indigo-400/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic leading-none">ROCKIT <span className="text-indigo-400 not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">v7.6</p>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black border transition-colors ${
                  connectionStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {connectionStatus === 'online' ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {connectionStatus.toUpperCase()}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-400">
                  <Timer className="w-2.5 h-2.5" />
                  RE-POLL: {countdown}s
                </div>
              </div>
            </div>
          </div>
        </div>

        {reasoning.length > 0 && (
          <div className="flex-1 h-14 bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden group flex items-center relative mx-4 shadow-inner">
            <div className="absolute left-0 top-0 bottom-0 z-20 bg-slate-900 border-r border-indigo-500/30 px-4 flex items-center gap-3">
              <div className="relative">
                <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                <Zap className="w-2 h-2 text-indigo-300 absolute -top-1 -right-1" />
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] hidden xl:block">Strategic Intelligence</span>
            </div>
            <div className="flex-1 relative overflow-hidden h-full">
              <div className="animate-ticker-header flex items-center h-full whitespace-nowrap gap-12 pl-[160px]">
                {[...reasoning, ...reasoning, ...reasoning].map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-4 shrink-0">
                    <span className="p-1 rounded bg-indigo-500/10"><ChevronRight className="w-3 h-3 text-indigo-400" /></span>
                    <span className="text-sm font-black text-slate-100 uppercase tracking-wide">
                      {reason}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 left-[140px] w-24 bg-gradient-to-r from-slate-950/80 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950/80 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        )}

        {currentSnapshot && (
          <div className="flex items-center gap-6 shrink-0 ml-4 pl-6 border-l border-slate-800/60">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">Clock</span>
              <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/50 shadow-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-base font-mono font-black text-slate-100">{currentSnapshot.input?.current_et_time || '--:--'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-5 py-2 rounded-2xl flex flex-col items-center justify-center border transition-all shadow-xl ${
                decodedOutput?.bias?.toUpperCase().includes('LONG') 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : decodedOutput?.bias?.toUpperCase().includes('SHORT')
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
              }`}>
                <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">System Bias</span>
                <div className="flex items-center gap-2">
                  {decodedOutput?.bias?.toUpperCase().includes('LONG') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-black text-sm tracking-[0.1em] uppercase italic">{decodedOutput?.bias || 'NEUTRAL'}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 leading-none">Confidence</span>
                <div className="text-3xl font-black font-mono px-4 py-1 rounded-xl border border-slate-700/50 text-slate-100 bg-slate-800/40 shadow-inner">
                  {decodedOutput?.confidence || '0%'}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-800/60 bg-slate-900/30 overflow-hidden flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800/60">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Log Catalog</h2>
                </div>
                {isLoading && <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {availableFiles.map(file => (
                  <button key={file} onClick={() => handleFileSelect(file)}
                    className={`w-full text-left px-3 py-1.5 rounded text-[10px] font-mono transition-all flex items-center justify-between ${
                      selectedFile === file ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'
                    }`}>
                    <span className="truncate">{file}</span>
                  </button>
                ))}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/10">
            <div className="space-y-6">
              {slicesByHour.map(([hour, items]) => (
                <div key={hour} className="space-y-1.5">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{hour}</span>
                  </div>
                  {items.map(({ idx, s }) => {
                    const active = idx === selectedIndex;
                    const biasVal = s.decoded?.bias || 'NEUTRAL';
                    return (
                      <button key={idx} onClick={() => { setSelectedIndex(idx); autoScrollEnabled.current = (idx === processedSnapshots.length - 1); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border group flex items-center justify-between gap-1 ${
                          active ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg scale-[1.02]' : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-800/40'
                        }`}>
                        <span className={`text-[11px] font-black font-mono tracking-widest ${active ? 'text-white' : 'text-slate-400'}`}>
                          {s.input?.current_et_time || '--:--'}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase border ${
                          active ? 'bg-white/20 border-white/30 text-white' : biasVal.includes('LONG') ? 'text-emerald-400 border-emerald-500/20' : biasVal.includes('SHORT') ? 'text-rose-400 border-rose-500/20' : 'text-slate-600 border-slate-800'
                        }`}>
                          {biasVal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div ref={slicesEndRef} className="h-4" />
            </div>
          </div>

          <div className="p-4 border-t border-slate-800/60 bg-slate-900/50">
             <button onClick={runAiAudit} disabled={isAuditing}
               className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg border border-white/10">
                {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                {isAuditing ? 'Auditing session...' : 'Run Session AI Audit'}
             </button>
          </div>
        </aside>

        <section className="flex-1 bg-slate-950 p-6 overflow-hidden relative shadow-inner">
          {aiAudit && (
            <div className="absolute top-6 left-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4">
              <div className="bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                   <div className="flex items-center gap-3">
                     <span className="p-1.5 bg-indigo-500/10 rounded-lg"><Sparkles className="w-5 h-5 text-indigo-400" /></span>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Temporal Strategic Audit</h4>
                   </div>
                   <button onClick={() => setAiAudit(null)} className="text-slate-500 hover:text-white transition-all">✕</button>
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1"><span className="text-[9px] text-slate-500 uppercase block mb-2 font-black">Summary</span><p className="text-sm font-bold text-slate-200 italic leading-relaxed">{aiAudit.summary}</p></div>
                  <div className="lg:max-w-[280px] border-l border-slate-800 pl-6"><span className="text-[9px] text-slate-500 uppercase block mb-3 font-black">Key Shifts</span><div className="space-y-2">{aiAudit.shifts.map((s, i) => <div key={i} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1.5 rounded border border-indigo-500/20">{s}</div>)}</div></div>
                </div>
              </div>
            </div>
          )}
          {currentSnapshot ? (
            <Dashboard 
              snapshot={currentSnapshot} 
              output={decodedOutput} 
              allSnapshots={processedSnapshots} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
              <Database className="w-16 h-16 mb-6 text-indigo-500 animate-pulse" />
              <h3 className="italic font-black uppercase tracking-[0.5em] text-2xl">Terminal Standby</h3>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;