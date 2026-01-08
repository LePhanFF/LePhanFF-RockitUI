
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import { 
  Clock, 
  LayoutDashboard, 
  Cloud, 
  RefreshCw, 
  Timer,
  Server,
  AlertCircle,
  Cpu,
  FileText,
  Loader2,
  TerminalSquare,
  Activity,
  Network,
  Pause
} from 'lucide-react';

// Public GCS Bucket
const GCS_BUCKET_BASE = "https://storage.googleapis.com/rockit-data"; 
const REFRESH_INTERVAL_SEC = 120; 

const hardenedClean = (raw: string): string => {
  if (!raw) return "";
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, ""); // Remove thinking tags for JSON parse
  
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return text;
  text = text.substring(firstBrace, lastBrace + 1);
  return text.replace(/\n/g, " ").trim();
};

const salvageIntel = (raw: string): Partial<DecodedOutput> => {
  const salvaged: any = {
    bias: "NEUTRAL",
    confidence: "0%",
    one_liner: "Decoding market stream...",
    day_type_reasoning: []
  };
  
  try {
    const biasMatch = raw.match(/"bias"\s*:\s*"(.*?)"/i);
    if (biasMatch) salvaged.bias = biasMatch[1].trim().toUpperCase();
    const narrativeMatch = raw.match(/"(?:one_liner|narrative|summary)"\s*:\s*"(.*?)"/i);
    if (narrativeMatch) salvaged.one_liner = narrativeMatch[1].trim();
    const reasonMatch = raw.match(/"(?:day_type_reasoning|evidence|reasoning)"\s*:\s*\[([\s\S]*?)\]/i);
    if (reasonMatch) {
      const items = reasonMatch[1].match(/"(.*?)"/g);
      if (items) salvaged.day_type_reasoning = items.map(i => i.replace(/"/g, ''));
    }
    const confMatch = raw.match(/"confidence"\s*:\s*"(.*?)"/i);
    if (confMatch) salvaged.confidence = confMatch[1].trim();
  } catch (e) {
    console.warn("Salvage failed");
  }
  return salvaged;
};

const App: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [lastFetchUrl, setLastFetchUrl] = useState<string>("");
  const [lastFetchStatus, setLastFetchStatus] = useState<string>("");

  const autoScrollEnabled = useRef(true);

  const addLog = (msg: string) => {
    console.log(`[ROCKIT] ${msg}`);
    setLogs(prev => [`> ${msg}`, ...prev].slice(0, 10));
  };

  const fetchFileList = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsListLoading(true);
    setErrorMsg(null);
    
    const listUrl = GCS_BUCKET_BASE;
    setLastFetchUrl(listUrl);
    setLastFetchStatus("Pending...");
    if (!isAutoRefresh) addLog(`Fetching Bucket: ${listUrl}`);

    try {
      const res = await fetch(listUrl);
      setLastFetchStatus(`${res.status} ${res.statusText}`);
      
      if (!res.ok) {
        throw new Error(`Bucket Access Failed: ${res.status} ${res.statusText}`);
      }

      const text = await res.text();
      
      if (text.trim().startsWith("<!DOCTYPE html") || text.includes("<html")) {
        addLog("WARN: Response appears to be HTML (Auth/UI page?)");
      }

      const files: string[] = [];
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const contents = xmlDoc.getElementsByTagName("Contents");
      
      for (let i = 0; i < contents.length; i++) {
        const key = contents[i].getElementsByTagName("Key")[0]?.textContent;
        if (key && (key.endsWith('.json') || key.endsWith('.jsonl')) && !key.endsWith('/')) {
           files.push(key);
        }
      }

      files.sort().reverse();
      
      if (files.length === 0) {
        if (contents.length === 0 && (text.includes("<html") || text.includes("<!DOCTYPE"))) {
           throw new Error("Received HTML instead of XML bucket listing.");
        }
        throw new Error("No .json/.jsonl files found in bucket.");
      }

      setAvailableFiles(files);
      setConnectionStatus('connected');
      
      if (!selectedFile && files.length > 0) {
        handleFileSelect(files[0], true);
      }

    } catch (err: any) {
      if (!isAutoRefresh) addLog(`ERROR: ${err.message}`);
      
      let displayMsg = err.message || "Failed to list bucket contents";
      if (displayMsg === "Failed to fetch") {
        displayMsg = "CORS/Network Error. Bucket likely blocks this origin.";
      }

      setConnectionStatus('error');
      setErrorMsg(displayMsg);
    } finally {
      if (!isAutoRefresh) setIsListLoading(false);
    }
  };

  const handleFileSelect = async (fileName: string, isUpdate = false) => {
    setSelectedFile(fileName);
    setIsLoading(true);
    
    const cleanBase = GCS_BUCKET_BASE.replace(/\/$/, '');
    const fileUrl = `${cleanBase}/${fileName}`;
    // Cache bust
    const fetchUrl = `${fileUrl}?cb=${Date.now()}`;

    setLastFetchUrl(fetchUrl);
    setLastFetchStatus("Pending...");
    addLog(`Fetching Data: ${fileName}`);
    
    try {
      const res = await fetch(fetchUrl);
      setLastFetchStatus(`${res.status} ${res.statusText}`);
      
      if (!res.ok) throw new Error(`File Fetch Error: ${res.status}`);
      
      const text = await res.text();
      addLog(`Payload: ${text.length} bytes`);

      if (text.trim().startsWith("<!DOCTYPE html") || text.includes("<html")) {
        throw new Error("Received HTML content instead of JSON.");
      }

      let newSnapshots: any[] = [];
      
      if (fileName.endsWith('.jsonl')) {
        newSnapshots = text.trim().split('\n').map(line => {
          try { return JSON.parse(line); } catch (e) { return null; }
        }).filter(Boolean);
      } else {
        const data = JSON.parse(text);
        newSnapshots = Array.isArray(data) ? data : [data];
      }
      
      addLog(`Records Parsed: ${newSnapshots.length}`);

      if (newSnapshots.length > 0) {
        setSnapshots(newSnapshots);
        if (isUpdate || autoScrollEnabled.current) {
          setSelectedIndex(newSnapshots.length - 1);
        }
        setErrorMsg(null);
      } else {
        setErrorMsg("Selected file is empty");
      }
    } catch (err: any) {
      addLog(`Stream Error: ${err.message}`);
      setErrorMsg(`Failed to load: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchFileList();
  }, []);

  // Countdown Timer
  useEffect(() => {
    if (isPaused) return;

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
  }, [isPaused]);

  const processedSnapshots = useMemo(() => {
    return snapshots.map(s => {
      let decoded: DecodedOutput | null = null;
      const rawOutput = s.output || s.llm_output || '';
      const rawText = (typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput)) || '';
      
      // Extract thinking content *before* cleaning
      const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
      const extractedThinking = thinkMatch ? thinkMatch[1].trim() : null;

      try {
        const cleanedText = hardenedClean(rawText);
        decoded = JSON.parse(cleanedText);
      } catch (e) {
        decoded = salvageIntel(rawText) as DecodedOutput;
      }

      // Re-attach thinking if it was found but missing in JSON
      if (decoded && extractedThinking && !decoded.thinking) {
        decoded.thinking = extractedThinking;
      }

      const input = {
        session_date: s.input?.session_date || 'N/A',
        current_et_time: s.input?.current_et_time || 'N/A',
        premarket: { 
          asia_high: 0, asia_low: 0, london_high: 0, london_low: 0, 
          overnight_high: 0, overnight_low: 0, previous_day_high: 0, 
          previous_day_low: 0, ...s.input?.premarket 
        },
        intraday: {
          ib: { current_close: 0, current_vwap: 0, ib_high: 0, ib_low: 0, current_open: 0, current_high: 0, current_low: 0, ema20: 0, ema50: 0, ...s.input?.intraday?.ib },
          volume_profile: { current_session: { poc: 0, vah: 0, val: 0, high: 0, low: 0 }, ...s.input?.intraday?.volume_profile },
          tpo_profile: { current_poc: 0, current_vah: 0, current_val: 0, tpo_shape: 'N/A', fattening_zone: 'N/A', ...s.input?.intraday?.tpo_profile },
          dpoc_migration: { dpoc_slices: [], migration_direction: 'STABLE', ...s.input?.intraday?.dpoc_migration },
          fvg_detection: { "1h_fvg": [], "15min_fvg": [], "5min_fvg": [], ...s.input?.intraday?.fvg_detection }
        },
        core_confluences: {
          ib_acceptance: { close_above_ibh: false, close_below_ibl: false },
          ...s.input?.core_confluences
        }
      };
      return { ...s, input, decoded };
    });
  }, [snapshots]);

  const currentSnapshot = processedSnapshots[selectedIndex] || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans select-none antialiased relative">
      {/* Header */}
      <header className="shrink-0 bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur-xl z-[100]">
        <div className="flex items-center gap-5">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">ROCKIT <span className="text-indigo-400 not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-[8px] font-black uppercase tracking-[0.2em] ${
                connectionStatus === 'connected' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 
                connectionStatus === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <Server className="w-2.5 h-2.5" />
                {connectionStatus === 'connected' ? 'GCS: LIVE' : connectionStatus === 'error' ? 'GCS: ERROR' : 'GCS: INIT'}
              </div>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                  isPaused ? 'text-amber-400 animate-pulse' : 'text-slate-500 hover:text-indigo-400'
                }`}
                title={isPaused ? "Resume Auto-Refresh" : "Pause Auto-Refresh"}
              >
                {isPaused ? <Pause className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                {isPaused ? 'PAUSED' : `${countdown}S`}
              </button>
            </div>
          </div>
        </div>

        {currentSnapshot && (
          <div className="flex items-center gap-4">
             {errorMsg && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-400 font-black uppercase animate-pulse">
                 <AlertCircle className="w-3 h-3" /> {errorMsg}
               </div>
             )}
            <div className="flex items-center gap-3 bg-slate-800/80 px-5 py-2.5 rounded-2xl border border-slate-700/50 shadow-inner">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-base font-mono font-black text-white tracking-tighter">{currentSnapshot.input.current_et_time}</span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: File Listing */}
        <aside className="w-72 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800/80">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bucket</span>
                </div>
                <button onClick={() => fetchFileList()} className="p-1.5 hover:bg-slate-800 rounded-lg transition-all group">
                  <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-indigo-400 ${isListLoading ? 'animate-spin' : ''}`} />
                </button>
             </div>
             
             {/* File List */}
             <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {availableFiles.length === 0 && !isListLoading ? (
                  <div className="text-[10px] text-slate-600 font-mono text-center py-4 italic">No Files Found</div>
                ) : (
                  availableFiles.map(f => (
                    <button key={f} onClick={() => handleFileSelect(f)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-mono transition-all border ${
                        selectedFile === f ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-lg' : 'text-slate-500 border-transparent hover:bg-slate-800/40'
                      }`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 opacity-50" />
                        {f}
                      </div>
                    </button>
                  ))
                )}
             </div>
          </div>

          {/* Session History (Intraday) */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Cpu className="w-3.5 h-3.5 text-slate-600" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Session Sequence</h3>
            </div>
            <div className="space-y-2.5">
              {processedSnapshots.map((s, idx) => {
                const active = idx === selectedIndex;
                const bias = (s.decoded?.bias || 'NEUTRAL').toUpperCase();
                return (
                  <button key={idx} onClick={() => { setSelectedIndex(idx); autoScrollEnabled.current = (idx === processedSnapshots.length-1); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden ${
                      active ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl scale-[1.02]' : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-600'
                    }`}>
                    <div className="flex items-center justify-between relative z-10">
                      <span className={`text-[11px] font-black font-mono ${active ? 'text-white' : 'text-slate-400'}`}>{s.input.current_et_time}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter ${
                        active ? 'bg-white/20' : bias.includes('LONG') ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : bias.includes('SHORT') ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-slate-600 bg-slate-800'
                      }`}>
                        {bias}
                      </span>
                    </div>
                  </button>
                );
              }).reverse()}
            </div>
          </div>
        </aside>

        {/* Main Dashboard Area */}
        <section className="flex-1 bg-slate-950 p-6 overflow-hidden relative shadow-inner flex flex-col mb-8">
          {currentSnapshot ? (
            <Dashboard 
              snapshot={currentSnapshot} 
              output={currentSnapshot.decoded || null} 
              allSnapshots={processedSnapshots} 
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
               {connectionStatus === 'error' ? (
                 <>
                   <AlertCircle className="w-16 h-16 mb-4 text-rose-500/50" />
                   <span className="text-sm font-black uppercase tracking-[0.3em] text-rose-400">Connection Failed</span>
                   <p className="text-[10px] mt-2 font-mono text-rose-500/60 max-w-md text-center">{errorMsg}</p>
                 </>
               ) : (
                 <>
                   <Loader2 className="w-12 h-12 mb-4 animate-spin text-indigo-500/50" />
                   <span className="text-sm font-black uppercase tracking-[0.5em] italic animate-pulse">Establishing Uplink...</span>
                 </>
               )}
               
               {/* DEBUG LOG CONSOLE */}
               <div className="mt-8 w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden font-mono text-[10px] shadow-2xl">
                 <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                       <TerminalSquare className="w-3 h-3" />
                       <span className="uppercase tracking-widest font-black">Debug Log</span>
                    </div>
                    <Activity className="w-3 h-3 animate-pulse text-indigo-500" />
                 </div>
                 <div className="p-3 space-y-1.5 h-32 overflow-y-auto custom-scrollbar">
                    {logs.map((log, i) => (
                      <div key={i} className="text-slate-400 border-b border-slate-800/30 pb-1 last:border-0 last:pb-0 break-all">
                        {log}
                      </div>
                    ))}
                    {logs.length === 0 && <span className="text-slate-600 italic">Initializing network handlers...</span>}
                 </div>
               </div>
            </div>
          )}
        </section>
      </main>

      {/* PERSISTENT NETWORK DEBUG BAR */}
      <div className="absolute bottom-0 w-full bg-slate-900 border-t border-slate-800 h-8 flex items-center px-4 justify-between z-[200]">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <Network className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Stream</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
             <span className="text-indigo-500 font-bold">[GET]</span>
             <span className="opacity-70 text-ellipsis overflow-hidden">{lastFetchUrl || "Waiting..."}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
           <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
             lastFetchStatus.startsWith('200') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
           }`}>
             {lastFetchStatus || "IDLE"}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
