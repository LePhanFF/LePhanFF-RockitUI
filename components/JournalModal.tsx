
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, BookOpen, History, Edit3, Check, AlertCircle, Loader2, DownloadCloud, Server, Wifi, WifiOff, Sparkles, Send, Brain, Microscope, Wand2, Mic, MicOff, Volume2, MessageSquare, StopCircle, ChevronDown, ChevronUp, Maximize2, Minimize2, BrainCircuit } from 'lucide-react';
import { GCS_BUCKET_BASE, API_BASE_URL, CRI_URL, PLAYBOOK_URL, TPO_ANALYSIS_URL } from '../utils/dataHelpers';
import { GoogleGenAI, Modality } from "@google/genai";
import { MarketSnapshot } from '../types';

interface JournalData {
  date: string;
  daily_remarks: {
    premarket: string;
    open_auction: string;
    post_ib: string;
    lunch_london: string;
    pm_session: string;
    power_hour: string;
  };
  time_slice_remarks: Record<string, string>; // timestamp -> note
  updated_at: string;
}

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDate: string;
  currentTime: string;
  currentSnapshot?: MarketSnapshot;
  allSnapshots?: MarketSnapshot[];
}

const EMPTY_JOURNAL: JournalData = {
  date: '',
  daily_remarks: {
    premarket: '',
    open_auction: '',
    post_ib: '',
    lunch_london: '',
    pm_session: '',
    power_hour: ''
  },
  time_slice_remarks: {},
  updated_at: ''
};

// --- AUDIO UTILS ---
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix
      resolve(base64String.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, sessionDate, currentTime, currentSnapshot, allSnapshots }) => {
  const [data, setData] = useState<JournalData>(EMPTY_JOURNAL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverErrorDetails, setServerErrorDetails] = useState<string | null>(null);
  
  // Use a Ref to track latest data state for async operations (prevents stale closures)
  const dataRef = useRef<JournalData>(data);
  useEffect(() => {
      dataRef.current = data;
  }, [data]);

  // Test Connection State
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // AI Scribe State
  const [scribeInput, setScribeInput] = useState('');
  const [isScribing, setIsScribing] = useState(false);
  const [isScribeOpen, setIsScribeOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Evaluation & Analysis State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Evaluation Chat State
  const [evalMessages, setEvalMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [evalInput, setEvalInput] = useState('');
  const [isEvalChatting, setIsEvalChatting] = useState(false);
  const evalChatSession = useRef<any>(null);

  // Chronology Expansion State
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  // Audio Context for TTS
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load Journal on Open or Date Change
  useEffect(() => {
    if (isOpen && sessionDate) {
      loadJournal(sessionDate);
    }
  }, [isOpen, sessionDate]);

  const loadJournal = async (date: string) => {
    setLoading(true);
    
    // 1. Try Local Storage first
    const localDataStr = localStorage.getItem(`journal_${date}`);
    let loadedData: JournalData | null = localDataStr ? JSON.parse(localDataStr) : null;

    try {
      // 2. Try Fetching from API
      const token = localStorage.getItem('rockit_token');
      const res = await fetch(`${API_BASE_URL}/journal/${date}`, {
          method: 'GET',
          headers: { 
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
          }
      });

      if (res.ok) {
        const cloudResponse = await res.json();
        
        // Handle both nested 'content' (from API wrapper) and flat (direct file) structures
        // Prioritize nested 'content' if it exists and has keys
        const hasNestedContent = cloudResponse.content && Object.keys(cloudResponse.content).length > 0;
        
        const extractedDaily = hasNestedContent 
            ? cloudResponse.content.daily_remarks 
            : cloudResponse.daily_remarks;
            
        const extractedTimeSlice = hasNestedContent 
            ? cloudResponse.content.time_slice_remarks 
            : cloudResponse.time_slice_remarks;

        const cloudJournalData: JournalData = {
            date: cloudResponse.date || date,
            daily_remarks: { ...EMPTY_JOURNAL.daily_remarks, ...extractedDaily },
            time_slice_remarks: extractedTimeSlice || {},
            updated_at: cloudResponse.updated_at || new Date().toISOString()
        };
        
        // Merge logic: Trust Cloud unless Local is explicitly newer
        if (loadedData) {
            const localTime = new Date(loadedData.updated_at).getTime();
            const cloudTime = new Date(cloudJournalData.updated_at).getTime();
            
            // Allow a small drift window (e.g. 5 seconds) where we prefer Cloud to ensure sync
            if (cloudTime >= localTime - 5000) {
                loadedData = cloudJournalData;
                console.log("[Journal] Synced from Cloud (Newer or Match)");
            } else {
                console.log("[Journal] Keeping Local (Newer unsaved changes)");
            }
        } else {
            loadedData = cloudJournalData;
        }
      }
    } catch (e) {
      console.warn("Journal load failed (API), relying on local.", e);
    } finally {
      if (loadedData) {
          setData(loadedData);
      } else {
          setData({ ...EMPTY_JOURNAL, date });
      }
      setLoading(false);
    }
  };

  const handleApiCheck = async () => {
    setTestStatus('testing');
    setTestMessage('Checking...');
    
    const endpoints = ['/health', '/welcome'];
    let success = false;
    let lastError = "";

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                success = true;
                break;
            } else {
                lastError = `HTTP ${res.status}`;
            }
        } catch (e: any) {
            lastError = e.message;
        }
    }

    if (success) {
        setTestStatus('success');
        setTestMessage('Connected');
        setTimeout(() => { setTestStatus('idle'); setTestMessage(''); }, 3000);
    } else {
        setTestStatus('error');
        setTestMessage('Offline');
        setTimeout(() => { setTestStatus('idle'); setTestMessage(''); }, 3000);
    }
  };

  const handleSave = async (silent = false, dataOverride?: JournalData) => {
    if (!silent) setSaving(true);
    setSaveStatus('idle');
    setServerErrorDetails(null);
    
    const now = new Date().toISOString();
    
    // Use override data if provided, otherwise use current reference state
    // Important: Use dataRef.current when no override is provided to ensure we grab latest state even in closures
    const baseData = dataOverride || dataRef.current;
    const currentData = { ...baseData, updated_at: now };
    
    // Update state
    setData(currentData);

    try {
        // 1. Local Storage
        localStorage.setItem(`journal_${sessionDate}`, JSON.stringify(currentData));

        // 2. Cloud Sync
        const token = localStorage.getItem('rockit_token');
        const apiPayload = {
            date: sessionDate,
            content: {
                daily_remarks: currentData.daily_remarks,
                time_slice_remarks: currentData.time_slice_remarks
            }
        };

        const response = await fetch(`${API_BASE_URL}/journal/${sessionDate}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(apiPayload)
        });

        if (response.ok) {
            setSaveStatus('success');
        } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `HTTP ${response.status}`);
        }
    } catch (e: any) {
        console.error("Save Error:", e);
        setSaveStatus('error');
        setServerErrorDetails(e.message);
    } finally {
        if (!silent) {
            setSaving(false);
            if (saveStatus !== 'error') setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }
  };

  const handleCloseWrapper = async () => {
      // Auto-save on close
      await handleSave(true); 
      onClose();
  };

  // --- AUDIO SCRIBE RECORDING ---
  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                      audioChunksRef.current.push(event.data);
                  }
              };

              mediaRecorder.onstop = async () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome default
                  // Automatically submit audio after stop
                  await processScribeAudio(audioBlob);
                  stream.getTracks().forEach(track => track.stop()); // Stop mic
              };

              mediaRecorder.start();
              setIsRecording(true);
          } catch (e) {
              console.error("Mic Error:", e);
              alert("Could not access microphone.");
          }
      }
  };

  const processScribeAudio = async (audioBlob: Blob) => {
      setIsScribing(true);
      try {
          const base64Audio = await blobToBase64(audioBlob);
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const prompt = `
            You are a Trading Journal Scribe.
            Listen to the user's voice notes.
            
            CURRENT TIME: ${currentTime}
            
            TASK:
            1. Transcribe the audio clearly.
            2. Analyze the content.
            3. Route the text to the correct journal section:
               - 'premarket', 'open_auction', 'post_ib', 'lunch_london', 'pm_session', 'power_hour'
               - 'current_slice' (The generic active timestamp: ${currentTime})
            
            4. If ambiguous, map to 'current_slice'.
            5. Clean up grammar.
            
            OUTPUT JSON ONLY:
            {
              "target_field": "string",
              "text": "string"
            }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview', // Multimodal capable
              contents: [{ 
                  role: 'user', 
                  parts: [
                      { text: prompt },
                      { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
                  ] 
              }],
              config: { responseMimeType: "application/json" }
          });

          // FIX: Access .text directly
          const result = JSON.parse(response.text || "{}");
          applyScribeResult(result);

      } catch (e) {
          console.error("Audio Scribe Error", e);
      } finally {
          setIsScribing(false);
      }
  };

  const handleScribeSubmit = async () => {
      if (!scribeInput.trim()) return;
      setIsScribing(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const prompt = `
            You are a Trading Journal Scribe.
            
            USER INPUT: "${scribeInput}"
            CURRENT TIME: ${currentTime}
            
            TASK:
            1. Analyze the user's input.
            2. Determine which journal section it belongs to:
               - 'premarket', 'open_auction', 'post_ib', 'lunch_london', 'pm_session', 'power_hour'
               - 'current_slice' (The generic active timestamp: ${currentTime})
            
            3. Output JSON ONLY:
            {
              "target_field": "string",
              "text": "string"
            }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: "application/json" }
          });

          // FIX: Access .text directly
          const result = JSON.parse(response.text || "{}");
          applyScribeResult(result);
          setScribeInput('');
      } catch (e) {
          console.error("Scribe Error", e);
      } finally {
          setIsScribing(false);
      }
  };

  const applyScribeResult = (result: any) => {
      if (result.target_field && result.text) {
          if (result.target_field === 'current_slice') {
              const existing = data.time_slice_remarks[currentTime] || '';
              updateTimeSlice(currentTime, existing ? existing + '\n' + result.text : result.text);
          } else if (result.target_field in data.daily_remarks) {
              const field = result.target_field as keyof typeof data.daily_remarks;
              const existing = data.daily_remarks[field] || '';
              updateDaily(field, existing ? existing + '\n' + result.text : result.text);
          }
      }
  };

  // --- GEMINI DEEP ANALYSIS (Trade Ideas + TPO) ---
  const runCoachAnalysis = async () => {
      if (!currentSnapshot || !allSnapshots) {
          alert("Snapshot data history unavailable. Cannot run analysis.");
          return;
      }
      
      setIsAnalyzing(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // 1. Fetch Contexts
          const [playbookRes, tpoRes] = await Promise.all([
              fetch(`${PLAYBOOK_URL}?cb=${Date.now()}`).then(r => r.text()),
              fetch(`${TPO_ANALYSIS_URL}?cb=${Date.now()}`).then(r => r.text())
          ]);

          // Build Historical Sequence (09:30 to Current Time)
          const sessionHistory = allSnapshots
            .filter(s => s.input.current_et_time >= "09:30" && s.input.current_et_time <= currentTime)
            .map(s => ({
                time: s.input.current_et_time,
                price: s.input.intraday.ib.current_close,
                vwap: s.input.intraday.ib.current_vwap,
                tpo_shape: s.input.intraday.tpo_profile.tpo_shape,
                vol: s.input.intraday.ib.current_volume,
                bias: s.decoded?.bias
            }));

          const marketContext = JSON.stringify({
              current_time: currentTime,
              current_state: {
                  price: currentSnapshot.input.intraday.ib.current_close,
                  tpo: currentSnapshot.input.intraday.tpo_profile,
                  vol: currentSnapshot.input.intraday.volume_profile.current_session,
                  bias: currentSnapshot.decoded?.bias
              },
              session_flow: sessionHistory
          }, null, 2);

          // 2. Parallel Generation Requests
          
          // --- Trade Idea Prompt ---
          const tradeIdeaPrompt = `
            ROLE: Execution Strategist & Trading Coach.
            CONTEXT: ${marketContext}
            PLAYBOOK RULES: ${playbookRes.substring(0, 5000)}
            
            TASK: Generate a concise Trade Plan (Markdown) for ${currentTime}, considering the FULL FLOW of the session from 09:30 AM.
            - Identify Primary & Hedge setups based on how the session has evolved.
            - Specify Entry, Stop, Target levels.
            - Keep it actionable.
          `;

          // --- TPO Analysis Prompt ---
          const tpoAnalysisPrompt = `
            ROLE: Market Profile Specialist.
            CONTEXT: ${marketContext}
            TPO RULES: ${tpoRes.substring(0, 5000)}
            
            TASK: Analyze the TPO Structure (Markdown) for ${currentTime}, considering the SEQUENCE of development since 09:30 AM.
            - Analyze the evolution of the shape (e.g. from b-shape to P-shape).
            - Comment on Value Area migration over time.
            - Identify structural anomalies (poor highs/lows) that persist.
          `;

          const [tradeRes, tpoAnalysisRes] = await Promise.all([
              ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: [{ role: 'user', parts: [{ text: tradeIdeaPrompt }] }],
                  config: { temperature: 0.4 }
              }),
              ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: [{ role: 'user', parts: [{ text: tpoAnalysisPrompt }] }],
                  config: { temperature: 0.3 }
              })
          ]);

          const tradeText = tradeRes.text || "Trade Analysis Failed.";
          const tpoText = tpoAnalysisRes.text || "TPO Analysis Failed.";

          // 3. Update State using Ref to avoid stale closures if user typed during generation
          const currentData = dataRef.current;
          const tradeKey = `${currentTime}_TRADE_IDEAS`;
          const tpoKey = `${currentTime}_TPO_TRADE_IDEAS`;

          const updatedData = {
              ...currentData,
              time_slice_remarks: {
                  ...currentData.time_slice_remarks,
                  [tradeKey]: tradeText,
                  [tpoKey]: tpoText
              }
          };

          setExpandedEntries(prev => ({ 
              ...prev, 
              [tradeKey]: true, 
              [tpoKey]: true 
          }));

          // Pass the freshly merged data to save
          await handleSave(true, updatedData);

      } catch (e: any) {
          console.error("Gemini Coach Analysis Error", e);
          alert(`Analysis Failed: ${e.message}`);
      } finally {
          setIsAnalyzing(false);
      }
  };

  // --- CRITICAL EVALUATION LOGIC ---
  const runCritique = async () => {
      setIsEvaluating(true);
      setShowEvaluation(true);
      setEvaluationReport('');
      setEvalMessages([]);
      setIsPlayingAudio(false);

      try {
          // 1. Fetch CRI Prompt
          const criRes = await fetch(`${CRI_URL}?cb=${Date.now()}`);
          if (!criRes.ok) throw new Error("Could not load CRI protocol.");
          const criPrompt = await criRes.text();

          // 2. Prepare Data using Ref for latest state
          const currentData = dataRef.current;
          const journalContext = JSON.stringify({
              date: sessionDate,
              notes: currentData.daily_remarks,
              chronology: currentData.time_slice_remarks
          }, null, 2);

          const systemInstruction = `
            ${criPrompt}
            You are analyzing the user's Journal Entry.
            Provide a detailed assessment (Markdown).
            Then, be ready to discuss it.
          `;

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Initialize Chat for subsequent conversation
          evalChatSession.current = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { systemInstruction },
          });

          const prompt = `
            --------------------------------------------------
            TRADER'S JOURNAL ENTRY (${sessionDate}):
            ${journalContext}
            --------------------------------------------------

            TASK:
            1. Evaluate this journal entry against the CRI (Cognitive Resonance Index).
            2. Identify the trader's profile (Knight, Scalper, Gambler, etc.).
            3. Assess alignment with market structure.
            
            IMPORTANT:
            Start your response with exactly "CRI SCORE: X/10" where X is an integer from 1 to 10 based on the quality of the journal.
            Then provide the breakdown.
          `;

          // FIX: Use { message: string }
          const result = await evalChatSession.current.sendMessage({ message: prompt });
          // FIX: Access .text directly
          const fullText = result.text || "Analysis generated, but text was empty.";
          setEvaluationReport(fullText);
          setEvalMessages([{ role: 'model', text: fullText }]);

          // --- SAVE TO CHRONOLOGY ---
          // Use a special key suffix to denote a Gemini entry
          const geminiKey = `${currentTime}_GEMINI`;
          const updatedData = {
              ...currentData,
              time_slice_remarks: {
                  ...currentData.time_slice_remarks,
                  [geminiKey]: fullText
              }
          };
          
          // Auto-expand the new entry
          setExpandedEntries(prev => ({ ...prev, [geminiKey]: true }));

          // Update state and persist immediately
          await handleSave(true, updatedData);

          // 3. Generate Audio Summary (TLDR)
          const tldrPrompt = "Give me a 2-sentence audio-friendly summary of your critique. Be direct.";
          // FIX: Use { message: string }
          const tldrResult = await evalChatSession.current.sendMessage({ message: tldrPrompt });
          // FIX: Access .text directly
          const tldrText = tldrResult.text || "Summary unavailable.";

          // 4. Call TTS
          const ttsResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-preview-tts',
              contents: [{ parts: [{ text: tldrText }] }],
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
              }
          });

          const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
              playAudio(audioData);
          }

      } catch (e: any) {
          console.error("Evaluation Error:", e);
          const errMsg = `Evaluation Failed: ${e.message}`;
          setEvaluationReport(errMsg);
          setEvalMessages([{ role: 'model', text: errMsg }]);
      } finally {
          setIsEvaluating(false);
      }
  };

  const playAudio = async (base64Data: string) => {
      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();

          // Decode base64 to array buffer then decode audio data
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
          
          // TTS model usually returns WAV/MP3 container, decodeAudioData handles it
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start(0);
          setIsPlayingAudio(true);
          source.onended = () => setIsPlayingAudio(false);
      } catch (e) {
          console.error("Audio Playback Error", e);
      }
  };

  const handleEvalChatSubmit = async () => {
      if (!evalInput.trim() || !evalChatSession.current) return;
      
      const userText = evalInput;
      setEvalInput('');
      setEvalMessages(prev => [...prev, { role: 'user', text: userText }]);
      setIsEvalChatting(true);

      try {
          // FIX: Use { message: string }
          const result = await evalChatSession.current.sendMessage({ message: userText });
          // FIX: Access .text directly
          const responseText = result.text || "No response received.";
          setEvalMessages(prev => [...prev, { role: 'model', text: responseText }]);
      } catch (e) {
          console.error("Eval Chat Error", e);
      } finally {
          setIsEvalChatting(false);
      }
  };

  const updateDaily = (field: keyof JournalData['daily_remarks'], value: string) => {
    setData(prev => ({
        ...prev,
        daily_remarks: { ...prev.daily_remarks, [field]: value }
    }));
  };

  const updateTimeSlice = (timeKey: string, value: string) => {
    setData(prev => ({
        ...prev,
        time_slice_remarks: { ...prev.time_slice_remarks, [timeKey]: value }
    }));
  };

  const toggleExpand = (key: string) => {
      setExpandedEntries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getScoreColor = (text: string) => {
      const match = text.match(/CRI SCORE:\s*(\d+)\/10/i);
      if (match) {
          const score = parseInt(match[1], 10);
          if (score >= 7) return { border: 'border-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
          if (score >= 5) return { border: 'border-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
          return { border: 'border-rose-500', bg: 'bg-rose-500/5', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' };
      }
      return { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', text: 'text-indigo-400', badge: 'bg-indigo-500/10' };
  };

  const extractScore = (text: string) => {
      const match = text.match(/CRI SCORE:\s*(\d+)\/10/i);
      return match ? match[1] : null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseWrapper} />

        {/* Modal Window - Expanded Size */}
        <div className="relative w-[95vw] h-[95vh] max-w-[1920px] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-200">Trader's Journal</h2>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                            <span>SESSION: {sessionDate}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-amber-400 font-bold">LIVE: {currentTime}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* SCRIBE TOGGLE */}
                    <button 
                        onClick={() => setIsScribeOpen(!isScribeOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isScribeOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">AI Scribe</span>
                    </button>

                    {/* EVALUATE BUTTON */}
                    <button 
                        onClick={runCritique}
                        disabled={isEvaluating}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Evaluate</span>
                    </button>

                    {/* COACH BUTTON */}
                    <button 
                        onClick={runCoachAnalysis}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-indigo-900/40 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                        title="Generate Trade Ideas & TPO Analysis for current time using historical session data"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Coach</span>
                    </button>

                    <div className="w-px h-6 bg-slate-800 mx-1"></div>

                    {/* Status Indicators */}
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 animate-in fade-in slide-in-from-right">
                            <Check className="w-3 h-3" /> Synced
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <div className="flex items-center gap-1" title={serverErrorDetails || "Failed to sync to cloud"}>
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 animate-in fade-in">
                                <AlertCircle className="w-3 h-3" /> Saved Locally
                            </span>
                        </div>
                    )}
                    
                    {/* API Check Button */}
                    <button 
                        onClick={handleApiCheck}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            testStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                            testStatus === 'error' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' :
                            'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                        }`}
                    >
                        {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                         testStatus === 'success' ? <Wifi className="w-4 h-4" /> : 
                         testStatus === 'error' ? <WifiOff className="w-4 h-4" /> : 
                         <Server className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                            {testMessage || 'API Check'}
                        </span>
                    </button>

                    <button 
                        onClick={() => handleSave()} 
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50 ml-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save Entry</span>
                    </button>
                    
                    <button onClick={handleCloseWrapper} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors ml-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* SCRIBE BAR */}
            {isScribeOpen && (
                <div className="bg-indigo-900/20 border-b border-indigo-500/30 p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <div className="p-2 bg-indigo-500/20 rounded-full border border-indigo-500/30">
                        <Wand2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    
                    {/* Audio Record Button */}
                    <button 
                        onClick={toggleRecording}
                        className={`p-2 rounded-lg transition-all border ${isRecording ? 'bg-rose-600 border-rose-500 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                        title={isRecording ? "Stop Recording" : "Record Audio Note"}
                        disabled={isScribing}
                    >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input 
                        type="text" 
                        value={scribeInput}
                        onChange={(e) => setScribeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScribeSubmit()}
                        placeholder={isRecording ? "Listening..." : "Talk to Gemini (e.g., 'Put in premarket that volume is low')..."}
                        className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-medium disabled:opacity-50"
                        autoFocus
                        disabled={isScribing || isRecording}
                    />
                    <button 
                        onClick={handleScribeSubmit}
                        disabled={!scribeInput.trim() || isScribing}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {isScribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-hidden flex divide-x divide-slate-800 relative">
                
                {/* LEFT: Daily Remarks (Scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/50 pb-20">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Daily Structure Notes
                    </h3>
                    
                    <div className="space-y-6">
                        <SectionArea 
                            label="1. Premarket Remarks" 
                            sub="Overnight inventory, key levels, news drivers."
                            value={data.daily_remarks.premarket}
                            onChange={(v) => updateDaily('premarket', v)}
                        />
                        <SectionArea 
                            label="2. Opening Market Auction Remarks" 
                            sub="IB formation, confidence, initial test."
                            value={data.daily_remarks.open_auction}
                            onChange={(v) => updateDaily('open_auction', v)}
                        />
                        <SectionArea 
                            label="3. Post IB Range Remarks" 
                            sub="Extension, rotation, or chop?"
                            value={data.daily_remarks.post_ib}
                            onChange={(v) => updateDaily('post_ib', v)}
                        />
                        <SectionArea 
                            label="4. Lunch / London Close Remarks" 
                            sub="Volume drop, fake-outs, stabilization."
                            value={data.daily_remarks.lunch_london}
                            onChange={(v) => updateDaily('lunch_london', v)}
                        />
                        <SectionArea 
                            label="5. PM Remarks" 
                            sub="Trend continuation or reversal?"
                            value={data.daily_remarks.pm_session}
                            onChange={(v) => updateDaily('pm_session', v)}
                        />
                        <SectionArea 
                            label="6. Power Hour Remarks" 
                            sub="Closing auction, MOC imbalance."
                            value={data.daily_remarks.power_hour}
                            onChange={(v) => updateDaily('power_hour', v)}
                        />
                    </div>
                </div>

                {/* RIGHT: Time Slice Remarks (Fixed width) */}
                <div className="w-[40%] flex flex-col bg-slate-950/30">
                    
                    {/* Current Slice Input - Expanded Height and Font */}
                    <div className="p-6 border-b border-slate-800 bg-slate-900/80 z-10 shadow-lg shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-amber-100">
                                Active Time Slice: {currentTime}
                            </span>
                        </div>
                        <textarea 
                            className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-lg font-medium text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all resize-none placeholder:text-slate-600 leading-relaxed"
                            placeholder={`Enter observations for ${currentTime}...`}
                            value={data.time_slice_remarks[currentTime] || ''}
                            onChange={(e) => updateTimeSlice(currentTime, e.target.value)}
                        />
                    </div>

                    {/* History List - Collapsible with Larger Font */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                            <History className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chronology</span>
                        </div>

                        <div className="space-y-4">
                            {/* Sort: Latest Time First. */}
                            {Object.entries(data.time_slice_remarks)
                                .sort((a, b) => b[0].localeCompare(a[0])) // Newest first
                                .map(([timeKey, note]) => {
                                    // Determine entry type
                                    const isGeminiCRI = timeKey.includes('_GEMINI');
                                    const isTradeIdea = timeKey.includes('_TRADE_IDEAS') && !timeKey.includes('_TPO_');
                                    const isTPO = timeKey.includes('_TPO_TRADE_IDEAS');
                                    
                                    const displayTime = timeKey.split('_')[0]; // Extract time prefix
                                    const isActive = displayTime === currentTime && !isGeminiCRI && !isTradeIdea && !isTPO; 
                                    
                                    const isExpanded = expandedEntries[timeKey] || isActive;
                                    
                                    // Style Logic
                                    let containerStyle = 'border-slate-800 bg-slate-900 hover:border-slate-600';
                                    let badgeStyle = 'text-indigo-400 bg-indigo-500/10';
                                    let labelText = isGeminiCRI ? 'GEMINI CRI' : isTradeIdea ? 'TRADE PLAN' : isTPO ? 'TPO STRUCT' : 'USER';
                                    let labelColor = 'text-indigo-400';
                                    let score = null;

                                    if (isActive) {
                                        containerStyle = 'border-amber-500/30 bg-amber-500/5';
                                        badgeStyle = 'text-amber-400 bg-amber-500/10';
                                        labelColor = 'text-amber-500';
                                        labelText = 'ACTIVE';
                                    } else if (isGeminiCRI) {
                                        const scoreStyles = getScoreColor(note);
                                        containerStyle = `${scoreStyles.border} ${scoreStyles.bg}`;
                                        badgeStyle = scoreStyles.badge; // Assuming this contains full class list
                                        labelColor = scoreStyles.text;
                                        score = extractScore(note);
                                    } else if (isTradeIdea) {
                                        containerStyle = 'border-cyan-500/30 bg-cyan-500/5';
                                        badgeStyle = 'text-cyan-400 bg-cyan-500/10';
                                        labelColor = 'text-cyan-400';
                                    } else if (isTPO) {
                                        containerStyle = 'border-purple-500/30 bg-purple-500/5';
                                        badgeStyle = 'text-purple-400 bg-purple-500/10';
                                        labelColor = 'text-purple-400';
                                    }

                                    return (
                                        <div key={timeKey} className={`group relative rounded-xl border transition-all ${containerStyle}`}>
                                            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleExpand(timeKey)}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-2 ${badgeStyle}`}>
                                                        {(isGeminiCRI || isTradeIdea || isTPO) && <Brain className="w-3 h-3" />}
                                                        {displayTime}
                                                    </span>
                                                    {score && (
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-current opacity-80 ${badgeStyle}`}>
                                                            {score}/10
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] uppercase font-black tracking-wider ${labelColor}`}>{labelText}</span>
                                                    <button className="p-1 text-slate-500 hover:text-white transition-colors">
                                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
                                                    <textarea
                                                        className={`w-full bg-transparent text-base outline-none resize-none h-auto min-h-[80px] font-medium p-2 rounded-lg leading-relaxed ${isGeminiCRI || isTradeIdea || isTPO ? 'text-slate-200 bg-black/20' : 'text-slate-300'}`}
                                                        value={note}
                                                        onChange={(e) => updateTimeSlice(timeKey, e.target.value)}
                                                        rows={note.split('\n').length > 5 ? 10 : 5}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                            {Object.keys(data.time_slice_remarks).length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <p className="text-xs font-mono">No timestamps recorded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* EVALUATION OVERLAY */}
                {showEvaluation && (
                    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <Brain className="w-6 h-6 text-purple-400" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">CRI Evaluation Engine</h2>
                                {isPlayingAudio && <div className="flex gap-1"><span className="w-1 h-3 bg-purple-500 animate-pulse"></span><span className="w-1 h-2 bg-purple-500 animate-pulse delay-75"></span><span className="w-1 h-4 bg-purple-500 animate-pulse delay-150"></span></div>}
                            </div>
                            <button onClick={() => setShowEvaluation(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Report Scroll Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                {isEvaluating ? (
                                    <div className="h-full flex flex-col items-center justify-center">
                                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest text-purple-400 animate-pulse">Profiling Trader Psychology...</p>
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        {/* Main Report */}
                                        <div className="prose prose-invert prose-headings:text-purple-300 prose-p:text-slate-300 mb-8">
                                            {evalMessages.length > 0 && evalMessages[0].text.split('\n').map((line, i) => (
                                                <p key={i} className="mb-2 font-medium">{line}</p>
                                            ))}
                                        </div>

                                        {/* Conversation Thread */}
                                        {evalMessages.slice(1).map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-purple-500/10 border border-purple-500/20 text-purple-100'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isEvalChatting && <div className="text-purple-400 text-xs animate-pulse">Assistant is typing...</div>}
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            {!isEvaluating && (
                                <div className="p-4 bg-slate-900/80 border-t border-slate-800">
                                    <div className="max-w-4xl mx-auto relative flex gap-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                                            placeholder="Discuss the critique (e.g. 'Why did you call me a Gambler?')..."
                                            value={evalInput}
                                            onChange={(e) => setEvalInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEvalChatSubmit()}
                                            disabled={isEvalChatting}
                                        />
                                        <button 
                                            onClick={handleEvalChatSubmit}
                                            disabled={!evalInput.trim() || isEvalChatting}
                                            className="px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const SectionArea = ({ label, sub, value, onChange }: { label: string, sub: string, value: string, onChange: (v: string) => void }) => (
    <div className="group">
        <div className="mb-2">
            <span className="text-sm font-bold text-slate-200 block">{label}</span>
            <span className="text-[10px] text-slate-500 font-mono">{sub}</span>
        </div>
        <textarea 
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-base text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none group-hover:border-slate-700 leading-relaxed"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="No remarks entered..."
        />
    </div>
);

export default JournalModal;
