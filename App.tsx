
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import { rawSnapshots } from './mockData';
import { GoogleGenAI } from "@google/genai";
import { 
  Clock, 
  LayoutDashboard, 
  Database, 
  RefreshCw, 
  Timer,
  BrainCircuit,
  Sparkles,
  Wifi, 
  WifiOff,
  Activity,
  Zap,
  Calendar,
  Layers,
  FileJson,
  Cpu,
  AlertCircle,
  ShieldAlert,
  PlayCircle
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

  const sweepsMatch = raw.match(/"liquidity_sweeps"\s*:\s*(\{[\s\S]*?\})/i);
  if (sweepsMatch) {
    try {
      salvaged.liquidity_sweeps = JSON.parse(hardenedClean(sweepsMatch[1]));
    } catch (e) {
      const sessions = ["asia", "london", "overnight", "previous_day", "previous_week", "ib"];
      const sweeps: any = {};
      sessions.forEach(s => {
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

  const tpoRead: any = {};
  const sigMatch = raw.match(/"profile_signals"\s*:\s*"(.*?)"/i);
  if (sigMatch) tpoRead.profile_signals = sigMatch[1].trim();
  const migMatch = raw.match(/"dpoc_migration"\s*:\s*"(.*?)"/i);
  if (sigMatch) tpoRead.dpoc_migration = migMatch[1].trim();
  const extMatch = raw.match(/"extreme_or_compression"\s*:\s*"(.*?)"/i);
  if (extMatch) tpoRead.extreme_or_compression = extMatch[1].trim();
  if (Object.keys(tpoRead).length > 0) salvaged.tpo_read = tpoRead;

  return salvaged;
};

const App: React.FC = () => {
  // Persistence initialization
  const savedFiles = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('rockit_available_files') || '[]');
    } catch { return []; }
  }, []);

  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(() => {
    return parseInt(localStorage.getItem('rockit_selected_index') || '0');
  });
  const [availableFiles, setAvailableFiles] = useState<string[]>(savedFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(() => {
    return localStorage.getItem('rockit_selected_file');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiAudit, setAiAudit] = useState<{ summary: string; shifts: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const slicesEndRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(true);

  // Persistence side effects
  useEffect(() => {
    if (availableFiles.length > 0 && !isDemoMode) {
      localStorage.setItem('rockit_available_files', JSON.stringify(availableFiles));
    }
  }, [availableFiles, isDemoMode]);

  useEffect(() => {
    if (selectedFile && !isDemoMode) localStorage.setItem('rockit_selected_file', selectedFile);
  }, [selectedFile, isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) localStorage.setItem('rockit_selected_index', selectedIndex.toString());
  }, [selectedIndex, isDemoMode]);

  const fetchFileList = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${GITHUB_REPO}/contents/${LOCAL_PATH}?t=${Date.now()}`);
      
      if (res.status === 403 || res.status === 429) {
        setIsRateLimited(true);
        throw new Error("GitHub Rate Limit Active");
      }

      if (!res.ok) throw new Error(`Source connection failed: ${res.statusText}`);
      
      const data = await res.json();
      const files = data
        .filter((f: any) => f.name.endsWith('.json') || f.name.endsWith('.jsonl'))
        .map((f: any) => f.name)
        .sort((a: string, b: string) => b.localeCompare(a));
      
      setAvailableFiles(files);
      setConnectionStatus('online');
      setIsRateLimited(false);
      setError(null);

      if (files.length > 0 && !isDemoMode) {
        if (!selectedFile || !files.includes(selectedFile)) {
          handleFileSelect(files[0], false);
        } else {
          handleFileSelect(selectedFile, true);
        }
      }
    } catch (err: any) {
      console.warn("Fetch Error:", err.message);
      setError(err.message);
      setConnectionStatus('offline');
      
      if (err.message.includes("Rate Limit")) {
        setIsRateLimited(true);
      }
      
      if (selectedFile && !isDemoMode) {
        handleFileSelect(selectedFile, true);
      } else if (snapshots.length === 0 && !isDemoMode && availableFiles.length === 0) {
        // Only load mock as fallback if absolutely no cache exists
        loadDemoMode();
      }
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  };

  const loadDemoMode = () => {
    setIsDemoMode(true);
    setSelectedFile("DEMO_2025_MOCK.json");
    setAvailableFiles(["DEMO_2025_MOCK.json"]);
    setSnapshots(rawSnapshots);
    setSelectedIndex(rawSnapshots.length - 1);
  };

  const handleFileSelect = async (fileName: string, isUpdate = false) => {
    if (fileName === "DEMO_2025_MOCK.json") {
       loadDemoMode();
       return;
    }
    
    setIsDemoMode(false);
    setSelectedFile(fileName);
    if (!isUpdate) {
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
      
      if (!isUpdate) {
        setSelectedIndex(newSnapshots.length - 1);
      } else if (selectedIndex >= newSnapshots.length) {
        setSelectedIndex(newSnapshots.length - 1);
      }
    } catch (err: any) {
      console.error("Stream Error:", err.message);
      if (!isUpdate) setError(`Stream Error: ${err.message}`);
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
      const prompt = `Review market evolution: ${JSON.stringify(history)}. Summarize shifts. Return JSON: {"summary": string, "shifts": string[]}`;
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

  const reasoningPoints = useMemo(() => {
    const points = decodedOutput?.day_type_reasoning || [];
    if (points.length === 0) return ["Synchronizing core intelligence stream..."];
    return [...points, ...points];
  }, [decodedOutput]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-200 font-sans">
      <header className="shrink-0 z-[60] bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800/60 px-6 py-5 flex items-center shadow-2xl relative">
        <div className="flex items-center gap-5 shrink-0 mr-8">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-xl border border-indigo-400/20">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic leading-none">ROCKIT <span className="text-indigo-400 not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">v7.8</p>
              <div className="flex items-center gap-5">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-black border transition-colors ${
                  connectionStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {connectionStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {connectionStatus.toUpperCase()}
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] font-black text-indigo-400">
                  <Timer className="w-3 h-3" />
                  {isRateLimited ? "WAITING..." : `RE-POLL: ${countdown}s`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 h-16 bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden group flex items-center relative mx-4 shadow-inner">
          <div className="absolute left-0 top-0 bottom-0 z-20 bg-slate-900 border-r border-indigo-500/30 px-6 flex items-center gap-4">
            <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
            <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] hidden xl:block">Core Intelligence</span>
          </div>
          <div className="flex-1 relative overflow-hidden h-full ml-[190px]">
             <div className="absolute inset-x-0 top-0 animate-scroll-up-slow flex flex-col items-start justify-start py-5">
                {reasoningPoints.map((point, i) => (
                  <div key={i} className="h-7 flex items-center shrink-0 w-full px-10">
                     <span className="text-sm font-black text-slate-200 uppercase tracking-[0.1em] whitespace-nowrap">
                        <span className="text-indigo-500 mr-4 font-mono font-bold">//</span> {point}
                     </span>
                  </div>
                ))}
             </div>
             <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-slate-950/60 to-transparent z-10" />
             <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950/60 to-transparent z-10" />
          </div>
        </div>

        {currentSnapshot && (
          <div className="flex items-center gap-8 shrink-0 ml-4 pl-8 border-l border-slate-800/60">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">Clock</span>
              <div className="flex items-center gap-2.5 bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-700/50 shadow-lg">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-lg font-mono font-black text-slate-100">{currentSnapshot.input?.current_et_time || '--:--'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className={`px-6 py-2.5 rounded-2xl flex flex-col items-center justify-center border transition-all shadow-xl ${
                decodedOutput?.bias?.toUpperCase().includes('LONG') 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60">System Bias</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base tracking-[0.1em] uppercase italic">{decodedOutput?.bias || 'NEUTRAL'}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1.5 leading-none">Confidence</span>
                <div className="text-4xl font-black font-mono px-5 py-1.5 rounded-xl border border-slate-700/50 text-slate-100 bg-slate-800/40 shadow-inner leading-none">
                  {decodedOutput?.confidence || '0%'}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-800/60 bg-slate-900/30 overflow-hidden flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800/60 bg-slate-900/50">
             <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3 text-indigo-400">
                  <Calendar className="w-5 h-5" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em]">Select Session</h2>
                </div>
                <button 
                  onClick={() => fetchFileList(false)} 
                  disabled={isLoading}
                  className="p-1 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-500 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isRateLimited && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Rate Limit Reached</span>
                  </div>
                  <p className="text-[9px] font-bold text-amber-200/60 leading-relaxed italic">
                    GitHub's hourly API limit reached. App is using Offline Cache Mode. New sessions will appear once the limit resets.
                  </p>
                </div>
              )}

              {error && !isRateLimited && (
                <div className="mb-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-[9px] font-bold text-rose-200/80 leading-tight">{error}</span>
                </div>
              )}

              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {availableFiles.length > 0 ? (
                  availableFiles.map(file => {
                    const isActive = selectedFile === file;
                    const displayName = file.replace(/\.jsonl?$/, '');
                    const isDemo = file === "DEMO_2025_MOCK.json";
                    return (
                      <button 
                        key={file} 
                        onClick={() => handleFileSelect(file)}
                        className={`w-full group text-left px-5 py-4 rounded-xl transition-all border flex items-center justify-center relative ${
                          isActive 
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                            : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                           {isDemo ? <Sparkles className="w-4 h-4 text-amber-400" /> : <FileJson className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />}
                           <span className="text-xs font-mono font-black tracking-widest">{displayName}</span>
                        </div>
                        {isActive && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 text-center bg-slate-950/30 border border-dashed border-slate-800 rounded-xl space-y-4">
                    <Database className="w-6 h-6 text-slate-700 mx-auto" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                      Session stream is throttled by GitHub API.
                    </p>
                    <button 
                      onClick={loadDemoMode}
                      className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Launch Demo Session
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 px-1 flex justify-between items-center opacity-40">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{availableFiles.length} Days Sync'd</span>
                 <div className="h-px flex-1 mx-4 bg-slate-800" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">v7.8</span>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-900/10">
            <div className="flex items-center gap-3 mb-5 px-2 opacity-60">
               <Layers className="w-4 h-4 text-slate-400" />
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Log History</h2>
            </div>
            <div className="space-y-8">
              {slicesByHour.map(([hour, items]) => (
                <div key={hour} className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{hour}</span>
                  </div>
                  {items.map(({ idx, s }) => {
                    const active = idx === selectedIndex;
                    const biasVal = s.decoded?.bias || 'NEUTRAL';
                    return (
                      <button key={idx} onClick={() => { setSelectedIndex(idx); autoScrollEnabled.current = (idx === processedSnapshots.length - 1); }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all border group flex items-center justify-between gap-2 ${
                          active ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-800/40'
                        }`}>
                        <span className={`text-xs font-black font-mono tracking-widest ${active ? 'text-white' : 'text-slate-400'}`}>
                          {s.input?.current_et_time || '--:--'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border ${
                          active 
                            ? 'bg-white/20 border-white/30 text-white' 
                            : biasVal.includes('LONG') ? 'text-emerald-400 border-emerald-500/20' : 'text-rose-400 border-rose-500/20'
                        }`}>
                          {biasVal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div ref={slicesEndRef} className="h-5" />
            </div>
          </div>

          <div className="p-5 border-t border-slate-800/60 bg-slate-900/50">
             <button onClick={runAiAudit} disabled={isAuditing}
               className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 rounded-xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg border border-white/10">
                {isAuditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {isAuditing ? 'Auditing session...' : 'Run Session AI Audit'}
             </button>
          </div>
        </aside>

        <section className="flex-1 bg-slate-950 p-8 overflow-hidden relative shadow-inner">
          {aiAudit && (
            <div className="absolute top-8 left-8 right-8 z-[100] animate-in fade-in slide-in-from-top-4">
              <div className="bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                   <div className="flex items-center gap-4">
                     <span className="p-2 bg-indigo-500/10 rounded-lg"><Sparkles className="w-6 h-6 text-indigo-400" /></span>
                     <h4 className="text-xs font-black uppercase tracking-[0.2em]">Session Audit</h4>
                   </div>
                   <button onClick={() => setAiAudit(null)} className="text-slate-500 hover:text-white transition-all text-xl">✕</button>
                </div>
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1"><span className="text-[11px] text-slate-500 uppercase block mb-3 font-black">Summary</span><p className="text-base font-bold text-slate-200 italic leading-relaxed">{aiAudit.summary}</p></div>
                  <div className="lg:max-w-[320px] border-l border-slate-800 pl-8"><span className="text-[11px] text-slate-500 uppercase block mb-4 font-black">Key Shifts</span><div className="space-y-3">{aiAudit.shifts.map((s, i) => <div key={i} className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-2 rounded border border-indigo-500/20">{s}</div>)}</div></div>
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
              <Database className="w-20 h-20 mb-8 text-indigo-500 animate-pulse" />
              <h3 className="italic font-black uppercase tracking-[0.5em] text-3xl text-center">
                {isLoading ? 'Synchronizing Stream...' : 'Terminal Standby'}
              </h3>
              {error && <p className="mt-4 text-rose-500 font-mono text-xs uppercase tracking-widest">{error}</p>}
              {isRateLimited && availableFiles.length === 0 && (
                <button 
                  onClick={loadDemoMode}
                  className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl"
                >
                  Start Demo Mode
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
