
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, DecodedOutput } from './types';
import Dashboard from './components/Dashboard';
import ChatPanel from './components/ChatPanel';
import JournalModal from './components/JournalModal';
import { useTheme } from './components/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { GCS_BUCKET_BASE, PLAYBOOK_URL, PSYCH_URL, TPO_ANALYSIS_URL, hardenedClean, salvageIntel } from './utils/dataHelpers';
import { Loader2, TerminalSquare, Activity, Network, AlertCircle } from 'lucide-react';

const REFRESH_INTERVAL_SEC = 10; 

const App: React.FC = () => {
  const { theme, cycleTheme } = useTheme();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // App Data State
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const [htfData, setHtfData] = useState<{es: any[], nq: any[], ym: any[]} | null>(null);

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
  const [urlCopied, setUrlCopied] = useState(false);

  // Global Chat State
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  
  const [playbookContent, setPlaybookContent] = useState<string>('');
  const [psychContent, setPsychContent] = useState<string>('');
  const [tpoAnalysisContent, setTpoAnalysisContent] = useState<string>('');

  const autoScrollEnabled = useRef(true);
  const lastLatestTimeRef = useRef<string | null>(null);

  // 1. Fetch Playbook
  useEffect(() => {
    fetch(`${PLAYBOOK_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPlaybookContent(t))
      .catch(e => console.warn("Global Chat: Playbook fetch failed", e));
  }, []);

  // 2. Fetch Psychology Protocol
  useEffect(() => {
    fetch(`${PSYCH_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPsychContent(t))
      .catch(e => console.warn("Global Chat: Psychology fetch failed", e));
  }, []);

  // 3. Fetch TPO Analysis Logic
  useEffect(() => {
    fetch(`${TPO_ANALYSIS_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setTpoAnalysisContent(t))
      .catch(e => console.warn("App: TPO Analysis fetch failed", e));
  }, []);

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
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const ctx = new AudioContextConstructor();
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

  const handleFileSelect = async (fileName: string, isUpdate = false, targetTime?: string) => {
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
            if (!targetTime) playUpdateSound(); 
            lastLatestTimeRef.current = latestTime;
        }

        setSnapshots(newSnapshots);
        
        if (targetTime) {
            const targetIdx = newSnapshots.findIndex(s => s.input.current_et_time === targetTime);
            if (targetIdx !== -1) {
                setSelectedIndex(targetIdx);
                autoScrollEnabled.current = false;
                addLog(`Deep Link: Jumped to ${targetTime}`);
            } else {
                addLog(`Deep Link Warning: Time ${targetTime} not found. Defaulting to latest.`);
                setSelectedIndex(newSnapshots.length - 1);
            }
        } else if (isUpdate || autoScrollEnabled.current) {
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
      const files: string[] = [];
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const contents = xmlDoc.getElementsByTagName("Contents");
      
      for (let i = 0; i < contents.length; i++) {
        const key = contents[i].getElementsByTagName("Key")[0]?.textContent;
        if (key && key.endsWith('.jsonl') && !key.includes('inference/') && !key.endsWith('/')) {
           files.push(key);
        }
      }

      files.sort().reverse();
      
      if (files.length === 0) throw new Error("No .jsonl files found in bucket root.");

      setAvailableFiles(files);
      setConnectionStatus('connected');
      
      const currentFile = selectedFileRef.current;
      if (!currentFile && files.length > 0) {
        handleFileSelect(files[0], true);
        setSelectedFile(files[0]);
      }

    } catch (err: any) {
      if (!isAutoRefresh) addLog(`ERROR: ${err.message}`);
      let displayMsg = err.message || "Failed to list bucket contents";
      setConnectionStatus('error');
      setErrorMsg(displayMsg);
    } finally {
      if (!isAutoRefresh) setIsListLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        const params = new URLSearchParams(window.location.search);
        const urlFile = params.get('file');
        const urlTime = params.get('time');

        if (urlFile) {
            addLog(`Deep Link Detected: File=${urlFile}, Time=${urlTime}`);
            setIsPaused(true);
            setSelectedFile(urlFile);
            handleFileSelect(urlFile, false, urlTime || undefined);
            fetchFileList(true);
        } else {
            fetchFileList();
        }
    }
  }, [isAuthenticated]); 

  useEffect(() => {
    if (isPaused || !isAuthenticated) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (selectedFileRef.current) {
              handleFileSelect(selectedFileRef.current, true);
          } else {
              fetchFileList(true);
          }
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isAuthenticated]);

  const handleShareUrl = () => {
      if (!selectedFile || !currentSnapshot) return;
      const currentTime = currentSnapshot.input.current_et_time;
      try {
        let urlString = window.location.href;
        if (urlString.startsWith('blob:')) urlString = urlString.slice(5);
        const httpRegex = /https?:\/\//g;
        const matches = [...urlString.matchAll(httpRegex)];
        if (matches.length > 1) {
             const lastMatchIndex = matches[matches.length - 1].index;
             if (lastMatchIndex !== undefined) urlString = urlString.substring(lastMatchIndex);
        }
        const url = new URL(urlString);
        url.searchParams.set('file', selectedFile);
        url.searchParams.set('time', currentTime);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
            addLog(`Link Copied: ${currentTime}`);
        }).catch(err => {
            console.error("Clipboard write failed", err);
            addLog("Clipboard Blocked - Check Console");
        });
      } catch (e) {
        console.error("URL Generation Failed", e);
        addLog("Link Gen Failed");
      }
  };

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

  // --- GLOBAL CONTEXT FOR AI ASSISTANT ---
  const globalContext = useMemo(() => {
    if (!currentSnapshot || processedSnapshots.length === 0) return '';

    const currentTime = currentSnapshot.input.current_et_time;
    
    // Create a chronological log of the FULL session up to the current timestamp
    // Removed .slice(-30) to allow full context visibility
    const sessionLog = processedSnapshots
      .filter(s => s.input.current_et_time <= currentTime)
      .map(s => {
          const bias = s.decoded?.bias || 'NEUTRAL';
          const price = s.input.intraday.ib.current_close;
          const narrative = s.decoded?.one_liner || '...';
          return `[${s.input.current_et_time}] Price:${price} | Bias:${bias} | "${narrative}"`;
      })
      .join('\n'); // Full history joined

    return `
      SYSTEM ROLE: ROCKIT GLOBAL SESSION ASSISTANT
      
      ==================================================
      1. CURRENT MARKET STATE (SNAPSHOT: ${currentTime})
      - Price: ${currentSnapshot.input.intraday.ib.current_close}
      - Bias: ${currentSnapshot.decoded?.bias}
      - Confidence: ${currentSnapshot.decoded?.confidence}
      - Day Type: ${currentSnapshot.decoded?.day_type?.type}
      - Narrative: ${currentSnapshot.decoded?.one_liner}
      
      2. FULL SESSION CHRONOLOGY
      ${sessionLog}

      3. STRATEGIC PLAYBOOK (REFERENCE)
      ${playbookContent ? playbookContent.substring(0, 6000) + "..." : "Playbook Not Loaded"}

      4. PSYCHOLOGY PROTOCOL (MINDSET)
      ${psychContent ? psychContent.substring(0, 3000) : "Psychology Not Loaded"}

      5. TPO ANALYSIS FRAMEWORK
      ${tpoAnalysisContent ? tpoAnalysisContent.substring(0, 4000) : "TPO Analysis Protocol Not Loaded"}
      ==================================================
      
      INSTRUCTIONS:
      - You are the central intelligence for this session.
      - You have awareness of the entire session history (Chronology) and the strategic rules (Playbook).
      - If asked about TPO structure specifically, reference the TPO ANALYSIS FRAMEWORK.
      - When the user asks "What happened?", summarize the Chronology.
      - When the user asks "What should I do?", refer to the Playbook and Current Bias.
      - Use the Psychology Protocol to keep the user calm and objective.
    `;
  }, [currentSnapshot, processedSnapshots, playbookContent, psychContent, tpoAnalysisContent]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-content overflow-hidden font-sans select-none antialiased relative transition-colors duration-500">
      
      <ChatPanel 
        isOpen={isGlobalChatOpen} 
        onClose={() => setIsGlobalChatOpen(false)} 
        title="Global Session Assistant" 
        contextData={globalContext} 
        initialReport={currentSnapshot?.decoded?.one_liner || "ROCKIT Engine Online."} 
      />

      <JournalModal 
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        sessionDate={currentSnapshot?.input?.session_date || ''}
        currentTime={currentSnapshot?.input?.current_et_time || ''}
      />

      <AppHeader 
        currentSnapshot={currentSnapshot}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        countdown={countdown}
        handleRefresh={() => { fetchFileList(true); setCountdown(REFRESH_INTERVAL_SEC); }}
        isGlobalChatOpen={isGlobalChatOpen}
        setIsGlobalChatOpen={setIsGlobalChatOpen}
        isJournalOpen={isJournalOpen}
        setIsJournalOpen={setIsJournalOpen}
        urlCopied={urlCopied}
        handleShareUrl={handleShareUrl}
        theme={theme}
        cycleTheme={cycleTheme}
        handleLogout={handleLogout}
        errorMsg={errorMsg}
      />

      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
            availableFiles={availableFiles}
            selectedFile={selectedFile}
            isListLoading={isListLoading}
            fetchFileList={() => fetchFileList(false)}
            handleFileSelect={(f) => handleFileSelect(f)}
            processedSnapshots={processedSnapshots}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            setAutoScroll={(enabled) => { autoScrollEnabled.current = enabled; }}
        />

        <section className="flex-1 bg-background p-6 overflow-hidden relative shadow-inner flex flex-col mb-8 transition-colors duration-500">
          {currentSnapshot ? (
            <Dashboard 
              snapshot={currentSnapshot} 
              output={currentSnapshot.decoded || null} 
              allSnapshots={processedSnapshots} 
              activeTab={activeTab}
              isGlobalChatOpen={isGlobalChatOpen} 
              htfData={htfData}
              tpoAnalysisContent={tpoAnalysisContent} // PASS PROP
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
