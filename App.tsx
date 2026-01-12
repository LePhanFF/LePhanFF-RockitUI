
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import { useTheme } from './components/ThemeContext';
import { 
  Clock, 
  LayoutDashboard, 
  Cloud, 
  RefreshCw, 
  Timer,
  AlertCircle,
  Cpu,
  FileText,
  Loader2,
  TerminalSquare,
  Activity,
  Network,
  Pause,
  Info,
  Waypoints,
  Globe,
  BarChartHorizontal,
  Grid3X3,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  LogOut,
  Lock,
  ChevronRight,
  User,
  FileSearch,
  Rocket,
  FileJson,
  Palette,
  Key,
  Lightbulb,
  GraduationCap,
  Map
} from 'lucide-react';

// --- CONFIGURATION ---
const GCS_BUCKET_BASE = "https://storage.googleapis.com/rockit-data"; 
const REFRESH_INTERVAL_SEC = 30; 
const ACCESS_CODE = "hello123";

const hardenedClean = (raw: string): string => {
  if (!raw) return "";
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, ""); 
  
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

const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_CODE) {
      onLogin();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>
      
      <div className="relative z-10 bg-surface/60 border border-border p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl flex flex-col items-center max-w-md w-full text-center">
        <div className="p-4 bg-background rounded-2xl border border-border mb-8 shadow-xl">
           <LayoutDashboard className="w-12 h-12 text-accent" />
        </div>
        
        <h1 className="text-3xl font-black italic tracking-tighter text-content uppercase mb-2">
          ROCKIT <span className="text-accent">ENGINE</span>
        </h1>
        <p className="text-xs font-mono text-content-muted tracking-[0.3em] uppercase mb-10">
          Intelligence Protocol Access
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
           <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Key className={`w-4 h-4 ${error ? 'text-rose-500' : 'text-content-muted group-focus-within:text-accent'} transition-colors`} />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className={`w-full bg-background/50 border ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-border focus:border-accent'} text-content text-sm rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-content-muted font-mono tracking-widest`}
                placeholder="ENTER ACCESS CODE"
                autoFocus
              />
           </div>
           
           <button 
             type="submit"
             className="w-full bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-all shadow-[0_0_20px_var(--accent-glow)] flex items-center justify-center gap-2 group"
           >
             <span>Initialize Uplink</span>
             <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
           </button>
        </form>
        
        {error && (
           <div className="mt-4 flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-3 h-3" />
              <span>Access Denied: Invalid Credentials</span>
           </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-content-muted font-bold uppercase tracking-widest mt-8">
          <Lock className="w-3 h-3" />
          <span>Restricted Environment</span>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { theme, cycleTheme } = useTheme();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // App Data State
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const selectedFileRef = useRef<string | null>(null);
  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [lastFetchUrl, setLastFetchUrl] = useState<string>("");
  const [lastFetchStatus, setLastFetchStatus] = useState<string>("");

  const [activeTab, setActiveTab] = useState<string>('brief');

  const autoScrollEnabled = useRef(true);
  const lastLatestTimeRef = useRef<string | null>(null);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSnapshots([]);
  };

  const addLog = (msg: string) => {
    console.log(`[ROCKIT] ${msg}`);
    setLogs(prev => [`> ${msg}`, ...prev].slice(0, 10));
  };

  const playUpdateSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const handleFileSelect = async (fileName: string, isUpdate = false) => {
    if (!isUpdate) setSelectedFile(fileName);
    setIsLoading(true);
    
    const cleanBase = GCS_BUCKET_BASE.replace(/\/$/, '');
    const fileUrl = `${cleanBase}/${fileName}`;
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
        const latestItem = newSnapshots[newSnapshots.length - 1];
        const latestTime = latestItem?.input?.current_et_time;

        if (latestTime && latestTime !== lastLatestTimeRef.current) {
            playUpdateSound();
            lastLatestTimeRef.current = latestTime;
        }

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
      
      const currentFile = selectedFileRef.current;
      
      if (!currentFile && files.length > 0) {
        handleFileSelect(files[0], true);
        setSelectedFile(files[0]);
      } else if (currentFile) {
        handleFileSelect(currentFile, true);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchFileList();
    }
  }, [isAuthenticated]); 

  useEffect(() => {
    if (isPaused || !isAuthenticated) return;

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
  }, [isPaused, isAuthenticated]);

  const processedSnapshots = useMemo(() => {
    return snapshots.map(s => {
      let decoded: DecodedOutput | null = null;
      const rawOutput = s.output || s.llm_output || '';
      const rawText = (typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput)) || '';
      const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
      const extractedThinking = thinkMatch ? thinkMatch[1].trim() : null;

      try {
        const cleanedText = hardenedClean(rawText);
        decoded = JSON.parse(cleanedText);
      } catch (e) {
        decoded = salvageIntel(rawText) as DecodedOutput;
      }

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

  const bias = (currentSnapshot?.decoded?.bias || 'NEUTRAL').toUpperCase();
  const narrative = currentSnapshot?.decoded?.one_liner || "Initializing Protocol...";
  const isLong = bias.includes('LONG');
  const isShort = bias.includes('SHORT');
  
  const thinkingText = currentSnapshot?.decoded?.thinking || 
  currentSnapshot?.decoded?.thinking || 
  (typeof currentSnapshot?.output === 'string' && currentSnapshot.output.includes('<think>') 
    ? currentSnapshot.output.split('<think>')[1].split('</think>')[0] 
    : null);

  const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg transition-all border min-w-[50px] ${
        activeTab === id 
          ? 'bg-surface text-content border-border shadow-xl transform scale-105 z-10' 
          : 'bg-background/20 text-content-muted border-transparent hover:bg-background/40 hover:text-content'
      }`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-content overflow-hidden font-sans select-none antialiased relative transition-colors duration-500">
      {/* Header */}
      <header className="shrink-0 bg-surface/95 border-b border-border px-4 py-2 flex items-center justify-between shadow-2xl backdrop-blur-xl z-[100] h-20">
        
        {/* Left: Brand & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-accent rounded-xl shadow-[0_0_20px_var(--accent-glow)] border border-white/10">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-tighter text-content uppercase italic leading-none">ROCKIT <span className="text-accent not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-2 mt-1">
                 <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                    isPaused ? 'text-amber-400' : 'text-content-muted hover:text-accent'
                  }`}
                  title={isPaused ? "Resume Auto-Refresh" : "Pause Auto-Refresh"}
                >
                  {isPaused ? <Pause className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                  {isPaused ? 'PAUSED' : `${countdown}S`}
                </button>
                <div className="w-0.5 h-0.5 rounded-full bg-border"></div>
                <button 
                  onClick={() => { fetchFileList(true); setCountdown(REFRESH_INTERVAL_SEC); }}
                  className="group flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-content-muted hover:text-content transition-colors"
                  title="Refresh Now"
                >
                  <RefreshCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform" />
                </button>
            </div>
          </div>
        </div>

        {/* Center: Intelligence Protocol Banner */}
        {currentSnapshot ? (
           <div className={`flex-1 mx-6 h-full rounded-2xl border flex items-center justify-between px-4 gap-4 overflow-hidden transition-all duration-700 shadow-inner ${
             isLong ? 'bg-emerald-500/5 border-emerald-500/20' : 
             isShort ? 'bg-rose-500/5 border-rose-500/20' : 
             'bg-accent/5 border-accent/20'
           }`}>
             
             {/* Narrative */}
             <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                <div className={`p-2 rounded-xl shrink-0 ${
                   isLong ? 'bg-emerald-500/20 text-emerald-400' : 
                   isShort ? 'bg-rose-500/20 text-rose-400' : 
                   'bg-accent/20 text-accent'
                }`}>
                   {isLong ? <ArrowUpRight className="w-4 h-4" /> : isShort ? <ArrowDownRight className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5 ${isLong ? 'text-emerald-500/70' : isShort ? 'text-rose-500/70' : 'text-accent'}`}>
                     Intelligence Protocol
                   </span>
                   <h3 className="text-xs font-bold text-content italic tracking-tight truncate max-w-lg xl:max-w-2xl" title={narrative}>
                     "{narrative}"
                   </h3>
                </div>
             </div>

             {/* Navigation Tabs */}
             <div className="flex items-center gap-1 shrink-0">
                <TabButton id="brief" label="Brief" icon={Info} />
                <TabButton id="logic" label="Logic" icon={Cpu} />
                <TabButton id="intraday" label="Intraday" icon={Timer} />
                <TabButton id="dpoc" label="DPOC" icon={Waypoints} />
                <TabButton id="globex" label="Globex" icon={Globe} />
                <TabButton id="profile" label="Profile" icon={BarChartHorizontal} />
                <TabButton id="tpo" label="TPO" icon={Grid3X3} />
                {thinkingText && <TabButton id="thinking" label="Think" icon={Brain} />}
                <div className="w-px h-6 bg-border mx-1"></div>
                <TabButton id="coach" label="Coach" icon={GraduationCap} />
                <TabButton id="htf-coach" label="HTF Coach" icon={Map} />
                <TabButton id="rk-audit" label="RK Audit" icon={Rocket} />
                <TabButton id="trade-idea" label="Trade Idea" icon={Lightbulb} />
                <TabButton id="json" label="JSON" icon={FileJson} />
             </div>

             {/* Metrics */}
             <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-border">
                <div className="text-right">
                    <span className="text-[8px] font-bold text-content-muted uppercase tracking-widest block">Trust</span>
                    <div className="flex items-center justify-end gap-1 text-content font-mono font-black">
                       <Target className="w-3 h-3 text-accent" />
                       {currentSnapshot?.decoded?.confidence || '0%'}
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border font-black text-xs tracking-wider ${
                    isLong ? 'bg-emerald-500 text-emerald-950 border-emerald-400' : 
                    isShort ? 'bg-rose-500 text-rose-950 border-rose-400' : 
                    'bg-accent text-white border-accent'
                }`}>
                  {bias}
                </div>
             </div>
           </div>
        ) : <div className="flex-1" />}

        {/* Right: Clock & User */}
        <div className="flex items-center gap-4 shrink-0">
           {errorMsg && (
               <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] text-rose-400 font-black uppercase animate-pulse">
                 <AlertCircle className="w-3 h-3" /> {errorMsg}
               </div>
           )}
           
           <div className="flex items-center gap-2">
               {/* THEME TOGGLE */}
               <button onClick={cycleTheme} className="p-2 rounded-full bg-surface border border-border text-content-muted hover:text-accent transition-colors" title={`Theme: ${theme.toUpperCase()}`}>
                  <Palette className="w-4 h-4" />
               </button>

               {currentSnapshot && (
                 <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-inner">
                   <Clock className="w-4 h-4 text-accent" />
                   <span className="text-sm font-mono font-black text-content tracking-tighter">{currentSnapshot.input.current_et_time}</span>
                 </div>
               )}

               <div className="group relative flex items-center">
                 <button onClick={handleLogout} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-surface hover:bg-panel border border-border transition-all hover:pr-3">
                   <div className="w-7 h-7 rounded-full bg-panel flex items-center justify-center border border-border">
                      <User className="w-4 h-4 text-content-muted" />
                   </div>
                   <div className="w-0 overflow-hidden group-hover:w-auto transition-all duration-300 whitespace-nowrap">
                     <span className="text-[10px] font-bold text-content-muted uppercase mr-1">Logout</span>
                   </div>
                   <div className="p-1 bg-background rounded-full group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                      <LogOut className="w-3 h-3 text-content-muted group-hover:text-rose-400" />
                   </div>
                 </button>
               </div>
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border bg-surface/50 flex flex-col shrink-0 transition-colors duration-500">
          <div className="p-5 border-b border-border">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-muted">Bucket</span>
                </div>
                <button onClick={() => fetchFileList()} className="p-1.5 hover:bg-panel rounded-lg transition-all group">
                  <RefreshCw className={`w-4 h-4 text-content-muted group-hover:text-accent ${isListLoading ? 'animate-spin' : ''}`} />
                </button>
             </div>
             
             <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {availableFiles.length === 0 && !isListLoading ? (
                  <div className="text-[10px] text-content-muted font-mono text-center py-4 italic">No Files Found</div>
                ) : (
                  availableFiles.map(f => (
                    <button key={f} onClick={() => handleFileSelect(f)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-mono transition-all border ${
                        selectedFile === f ? 'bg-accent/20 text-accent border-accent/40 shadow-lg' : 'text-content-muted border-transparent hover:bg-panel'
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

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Cpu className="w-3.5 h-3.5 text-content-muted" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-content-muted">Session Sequence</h3>
            </div>
            <div className="space-y-2.5">
              {processedSnapshots.map((s, idx) => {
                const active = idx === selectedIndex;
                const bias = (s.decoded?.bias || 'NEUTRAL').toUpperCase();
                const confidence = s.decoded?.confidence || '0%';
                const confVal = parseInt(confidence.replace(/\D/g, '')) || 0;
                const isHighConf = confVal > 80;
                const [hh, mm] = (s.input.current_et_time || "00:00").split(':').map(Number);
                const isQuarterSession = !isNaN(hh) && !isNaN(mm) && 
                                         (hh > 9 || (hh === 9 && mm >= 30)) && 
                                         (mm % 15 === 0);

                return (
                  <button key={idx} onClick={() => { setSelectedIndex(idx); autoScrollEnabled.current = (idx === processedSnapshots.length-1); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border group relative overflow-hidden ${
                      active 
                        ? 'bg-accent text-white border-accent shadow-xl scale-[1.02]' 
                        : isQuarterSession
                          ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
                          : 'bg-surface border-border hover:border-content-muted'
                    }`}>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[11px] font-black font-mono ${active ? 'text-white' : isQuarterSession ? 'text-yellow-600' : 'text-content-muted'}`}>{s.input.current_et_time}</span>
                        <span className={`text-[9px] font-bold ${isHighConf ? 'animate-pulse text-emerald-500' : 'text-content-muted'}`}>
                           {confidence}
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter ${
                        active ? 'bg-white/20' : bias.includes('LONG') ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : bias.includes('SHORT') ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' : 'text-content-muted bg-panel'
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

        <section className="flex-1 bg-background p-6 overflow-hidden relative shadow-inner flex flex-col mb-8 transition-colors duration-500">
          {currentSnapshot ? (
            <Dashboard 
              snapshot={currentSnapshot} 
              output={currentSnapshot.decoded || null} 
              allSnapshots={processedSnapshots} 
              activeTab={activeTab}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-content-muted">
               {connectionStatus === 'error' ? (
                 <>
                   <AlertCircle className="w-16 h-16 mb-4 text-rose-500/50" />
                   <span className="text-sm font-black uppercase tracking-[0.3em] text-rose-400">Connection Failed</span>
                   <p className="text-[10px] mt-2 font-mono text-rose-500/60 max-w-md text-center">{errorMsg}</p>
                 </>
               ) : (
                 <>
                   <Loader2 className="w-12 h-12 mb-4 animate-spin text-accent/50" />
                   <span className="text-sm font-black uppercase tracking-[0.5em] italic animate-pulse">Establishing Uplink...</span>
                 </>
               )}
               
               <div className="mt-8 w-full max-w-2xl bg-surface/80 border border-border rounded-xl overflow-hidden font-mono text-[10px] shadow-2xl">
                 <div className="bg-surface border-b border-border px-3 py-1.5 flex items-center justify-between text-content-muted">
                    <div className="flex items-center gap-2">
                       <TerminalSquare className="w-3 h-3" />
                       <span className="uppercase tracking-widest font-black">Debug Log</span>
                    </div>
                    <Activity className="w-3 h-3 animate-pulse text-accent" />
                 </div>
                 <div className="p-3 space-y-1.5 h-32 overflow-y-auto custom-scrollbar">
                    {logs.map((log, i) => (
                      <div key={i} className="text-content-muted border-b border-border pb-1 last:border-0 last:pb-0 break-all">
                        {log}
                      </div>
                    ))}
                    {logs.length === 0 && <span className="text-content-muted italic">Initializing network handlers...</span>}
                 </div>
               </div>
            </div>
          )}
        </section>
      </main>

      <div className="absolute bottom-0 w-full bg-surface border-t border-border h-8 flex items-center px-4 justify-between z-[200]">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <Network className="w-3 h-3 text-accent" />
            <span className="text-[9px] font-black text-content-muted uppercase tracking-widest">Network Stream</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-content overflow-hidden text-ellipsis whitespace-nowrap">
             <span className="text-accent font-bold">[GET]</span>
             <span className="opacity-70 text-ellipsis overflow-hidden">{lastFetchUrl || "Waiting..."}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
           <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
             lastFetchStatus.startsWith('200') ? 'bg-emerald-500/20 text-emerald-500' : 'bg-panel text-content-muted'
           }`}>
             {lastFetchStatus || "IDLE"}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
