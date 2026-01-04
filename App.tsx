
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  LayoutDashboard, 
  Database, 
  Github, 
  RefreshCw, 
  AlertCircle,
  ChevronRight,
  FileJson,
  CalendarDays,
  ShieldCheck,
  Radio,
  Timer
} from 'lucide-react';

const GITHUB_REPO = "LePhanFF/RockitDataFeed";
const BASE_URL = "https://api.github.com/repos";
const RAW_URL = "https://raw.githubusercontent.com";
const LOCAL_PATH = "local-analysis-format";
const REFRESH_INTERVAL_MS = 120000; // 2 minutes

const App: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [nextRefreshSeconds, setNextRefreshSeconds] = useState(120);
  
  const slicesEndRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio & Speech Utilities
  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context failed to initialize:", e);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Market Alerts Logic (5min beep, 15/60min voice)
  useEffect(() => {
    const alertTimer = setInterval(() => {
      const now = new Date();
      const mins = now.getMinutes();
      const secs = now.getSeconds();

      if (secs === 0) {
        // 5 Min Beep
        if (mins % 5 === 0) {
          playBeep();
        }

        // Voice Alerts
        if (mins === 0) {
          speak("Hourly candle close");
        } else if (mins % 15 === 0) {
          speak("15 minute candle close");
        }
      }
    }, 1000);
    
    return () => clearInterval(alertTimer);
  }, []);

  // Sync Countdown Logic
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setNextRefreshSeconds(prev => {
        if (prev <= 1) return 120;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  const scrollToBottom = () => {
    if (slicesEndRef.current) {
      slicesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchFileList = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/${GITHUB_REPO}/contents/${LOCAL_PATH}`);
      if (!res.ok) throw new Error("Failed to fetch protocol logs");
      const data = await res.json();
      
      const files = data
        .filter((f: any) => f.name.endsWith('.json') || f.name.endsWith('.jsonl'))
        .map((f: any) => f.name)
        .sort((a: string, b: string) => b.localeCompare(a)); 

      setAvailableFiles(files);
      
      if (files.length > 0 && (!selectedFile || (autoScrollEnabled.current && selectedFile !== files[0]))) {
        handleFileSelect(files[0], true);
      } else if (selectedFile) {
        handleFileSelect(selectedFile, true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
      setLastRefreshed(new Date());
      setNextRefreshSeconds(120);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchFileList(true);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [selectedFile]);

  const handleFileSelect = async (fileName: string, isUpdate = false) => {
    if (!isUpdate) {
      setSelectedFile(fileName);
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const res = await fetch(`${RAW_URL}/${GITHUB_REPO}/main/${LOCAL_PATH}/${fileName}?t=${Date.now()}`);
      if (!res.ok) throw new Error("Connection lost to RAW protocol");
      
      const text = await res.text();
      let newSnapshots: any[] = [];

      if (fileName.endsWith('.jsonl')) {
        newSnapshots = text.trim().split('\n').map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
      } else {
        const data = JSON.parse(text);
        newSnapshots = Array.isArray(data) ? data : [data];
      }

      setSnapshots(newSnapshots);
      setSelectedFile(fileName);
      
      if (isUpdate || autoScrollEnabled.current) {
        setSelectedIndex(newSnapshots.length - 1);
      }
    } catch (err: any) {
      setError(`Stream Error: ${err.message}`);
    } finally {
      if (!isUpdate) setIsLoading(false);
    }
  };

  const processedSnapshots = useMemo(() => {
    return (snapshots || []).map(s => {
      let decoded: DecodedOutput | null = null;
      let thinking = '';
      
      try {
        const rawOutput = s.output || (s.input && s.input.output) || s.decoded || (s.input && s.input.decoded) || s.llm_output;
        
        if (typeof rawOutput === 'string') {
          const thinkMatch = rawOutput.match(/<think>([\s\S]*?)<\/think>/i);
          if (thinkMatch) thinking = thinkMatch[1].trim();

          let cleaned = rawOutput
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          
          if (cleaned) {
            decoded = JSON.parse(cleaned) as DecodedOutput;
            decoded.thinking = thinking;
          }
        } else if (typeof rawOutput === 'object' && rawOutput !== null) {
          decoded = rawOutput as DecodedOutput;
        }
      } catch (e) {
        console.warn("Normalization Error:", e);
      }

      const finalSnapshot = s.input ? s : {
        ...s,
        input: {
          session_date: s.session_date || (decoded?.day_type?.timestamp?.split(' / ')[0]) || 'N/A',
          current_et_time: s.current_et_time || s.timestamp || (decoded?.day_type?.timestamp?.split(' / ')[1]) || 'N/A',
          premarket: s.premarket || {},
          intraday: s.intraday || {},
          core_confluences: s.core_confluences || {}
        }
      };

      return { ...finalSnapshot, decoded } as MarketSnapshot & { decoded: DecodedOutput | null };
    });
  }, [snapshots]);

  useEffect(() => {
    if (autoScrollEnabled.current) scrollToBottom();
  }, [processedSnapshots]);

  const currentSnapshot = processedSnapshots[selectedIndex] || null;
  const decodedOutput = currentSnapshot?.decoded || null;
  const confidenceNum = useMemo(() => {
    if (!decodedOutput?.confidence) return 0;
    return parseInt(decodedOutput.confidence.replace('%', ''), 10) || 0;
  }, [decodedOutput]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      <header className="shrink-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">ROCKIT <span className="text-indigo-400 not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Terminal v5.6</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  LIVE SYNC
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-400">
                  <Timer className="w-2.5 h-2.5" />
                  REFRESH IN {formatCountdown(nextRefreshSeconds)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {currentSnapshot && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Session Log</span>
              <span className="text-sm font-mono font-bold text-slate-100 flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-md border border-slate-700">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                {currentSnapshot.input?.session_date || 'N/A'}
              </span>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Market Clock</span>
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-md border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-sm font-mono font-bold text-slate-100">{currentSnapshot.input?.current_et_time || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
              <div className={`px-5 py-2.5 rounded-xl flex items-center gap-3 border transition-all shadow-xl ${
                decodedOutput?.bias?.toUpperCase().includes('LONG') 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10' 
                  : decodedOutput?.bias?.toUpperCase().includes('SHORT')
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
              }`}>
                {decodedOutput?.bias?.toUpperCase().includes('LONG') ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span className="font-black text-sm tracking-widest uppercase italic whitespace-nowrap">{decodedOutput?.bias || 'NEUTRAL'}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-0.5">Confidence</span>
                <div className={`text-4xl font-black font-mono px-4 py-1 rounded-xl border transition-all duration-500 flex items-center gap-2 ${
                  confidenceNum >= 80 
                    ? 'text-white bg-indigo-600 border-indigo-400 shadow-[0_0_25px_rgba(79,70,229,0.6)] animate-pulse' 
                    : 'text-slate-400 bg-slate-800/40 border-slate-700/50'
                }`}>
                  <ShieldCheck className={`w-6 h-6 ${confidenceNum >= 80 ? 'text-white' : 'text-slate-600'}`} />
                  {confidenceNum}%
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-84 border-r border-slate-800 bg-slate-900/40 overflow-hidden flex flex-col shrink-0">
          <div className="p-4 bg-slate-900/60 border-b border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Source Protocol</h2>
              </div>
              <span className="text-[8px] font-mono text-slate-600 uppercase">Ref: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">LOCAL-ANALYSIS</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            </div>
          </div>

          <div className="flex-none max-h-48 overflow-y-auto border-b border-slate-800 bg-slate-950/40 custom-scrollbar">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-transparent z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Log Catalog</h2>
                </div>
                {isLoading && <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />}
              </div>
              
              {error ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex gap-2 items-start">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-400 font-bold leading-tight uppercase">{error}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableFiles.map(file => (
                    <button
                      key={file}
                      onClick={() => {
                        autoScrollEnabled.current = (file === availableFiles[0]);
                        handleFileSelect(file);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-mono transition-all flex items-center justify-between group ${
                        selectedFile === file 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{file}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${selectedFile === file ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 text-indigo-400'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/10 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-slate-900 z-10 py-1">
              <div className="flex items-center gap-2">
                <FileJson className="w-3.5 h-3.5 text-slate-600" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Intelligence Slices</h2>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${autoScrollEnabled.current ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                <span className="text-[8px] font-black text-slate-600 uppercase">Live Lock</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-1.5">
              {!isLoading && processedSnapshots.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Database className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-[11px] font-black uppercase tracking-widest">No Intelligence Decoded</p>
                </div>
              ) : (
                processedSnapshots.map((s, idx) => {
                  const active = idx === selectedIndex;
                  const biasVal = s.decoded?.bias || 'N/A';
                  const isBull = biasVal.toUpperCase().includes('LONG');
                  const isBear = biasVal.toUpperCase().includes('SHORT');
                  
                  const confidenceStr = s.decoded?.confidence || '0%';
                  const confidenceNum = parseInt(confidenceStr.replace('%', ''), 10) || 0;
                  const isHighConf = confidenceNum >= 80;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedIndex(idx);
                        autoScrollEnabled.current = (idx === processedSnapshots.length - 1);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border group flex items-center justify-between gap-1 ${
                        active 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20 scale-[1.02]' 
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`text-[11px] font-black font-mono tracking-widest shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}>
                        {s.input?.current_et_time || '--:--'}
                      </span>
                      
                      <div className={`flex items-baseline gap-0.5 text-[11px] font-black transition-all px-2 py-0.5 rounded-md ${
                        active 
                          ? 'text-white' 
                          : isHighConf 
                            ? 'text-white bg-indigo-500 border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                            : 'text-slate-500 bg-slate-800/50 border border-slate-700/50'
                      }`}>
                        <span className="opacity-60 text-[7px] font-bold mr-0.5">C</span>
                        <span className="font-mono tracking-tighter">{confidenceNum}%</span>
                      </div>

                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm border shrink-0 min-w-[62px] text-center ${
                        active 
                          ? 'bg-white/20 border-white/30 text-white'
                          : isBull 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : isBear 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {biasVal}
                      </span>
                    </button>
                  );
                })
              )}
              <div ref={slicesEndRef} className="h-4" />
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-slate-950 p-6 overflow-hidden relative shadow-inner">
          {isLoading && snapshots.length > 0 && (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3 px-4 py-2 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-pulse shadow-2xl shadow-indigo-500/40 border border-white/10">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Decoding Logic...
            </div>
          )}
          {currentSnapshot ? (
            <Dashboard 
              snapshot={currentSnapshot} 
              output={decodedOutput} 
              allSnapshots={processedSnapshots} 
            />
          ) : !isLoading && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
              <Database className="w-16 h-16 mb-6 text-indigo-500" />
              <h3 className="italic font-black uppercase tracking-[0.5em] text-xl">System Standby</h3>
              <p className="text-[10px] mt-2 font-mono uppercase tracking-widest">Awaiting Local Analysis Sync...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
