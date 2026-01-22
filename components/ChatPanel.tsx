
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Send, X, MessageSquare, Bot, User, Loader2, Sparkles, Copy, Check, Mic, MicOff, Volume2, Camera, CameraOff, Eye, Activity, ShieldCheck, Paperclip, Image as ImageIcon, Trash2 } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  contextData: string; 
  initialReport: string; 
}

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 string for display
  isStreaming?: boolean;
  timestamp: string;
}

// Ensure this matches the requested URL exactly
const PSYCH_VIDEO_URL = "https://storage.googleapis.com/rockit-data/inference/gemini-psychology-video.mcd";

// --- AUDIO HELPERS ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const smartTruncate = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    const half = Math.floor(maxLength / 2);
    // Prioritize the end of the string where recent data usually lives, but keep headers
    return text.substring(0, half * 0.2) + "\n... [DATA TRUNCATED] ...\n" + text.substring(text.length - (half * 1.8));
};

const getCurrentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, title, contextData, initialReport }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Image Upload State
  const [pendingImage, setPendingImage] = useState<{ data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for individual message copy feedback
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Chat Session Reference (Text)
  const chatSession = useRef<any>(null);

  // --- LIVE STATE ---
  const [isLive, setIsLive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false); 
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0); 
  const [isSendingFrame, setIsSendingFrame] = useState(false);
  
  // --- RESOURCES ---
  const liveSession = useRef<Promise<any> | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const inputSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const nextStartTime = useRef<number>(0);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const [psychVideoContent, setPsychVideoContent] = useState<string>('');

  useEffect(() => {
    fetch(`${PSYCH_VIDEO_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPsychVideoContent(t))
      .catch(e => console.warn("ChatPanel: Video Psych fetch failed", e));
  }, []);

  // Initialize Text Chat Session
  useEffect(() => {
    if (initialReport && contextData && isOpen && !chatSession.current) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const truncatedContext = smartTruncate(contextData, 100000); // Expanded context window
            const systemInstruction = `
                You are an expert trading assistant.
                
                IMPORTANT: The user is looking at a specific report titled "ACTIVE REPORT" below.
                Your responses MUST align with the bias and analysis in that report. Do not contradict it.
                
                ACTIVE REPORT:
                ${initialReport}

                PRIOR CONTEXT (Data):
                ${truncatedContext}
                
                INSTRUCTIONS: Answer specific follow-up questions. Be concise.
            `;

            chatSession.current = ai.chats.create({
                model: 'gemini-3-flash-preview', 
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                }
            });

            setMessages([{ role: 'model', text: "I'm ready to discuss the analysis. What's on your mind?", timestamp: getCurrentTime() }]);
        } catch (e) {
            console.error("Chat Init Error", e);
            setMessages([{ role: 'model', text: "System Error: Could not initialize chat context.", timestamp: getCurrentTime() }]);
        }
    } else if (isOpen && chatSession.current && messages.length === 0) {
         setMessages([{ role: 'model', text: "I'm ready to discuss the analysis. What's on your mind?", timestamp: getCurrentTime() }]);
    }
  }, [initialReport, contextData, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping, pendingImage]);

  // Clean up when panel closes
  useEffect(() => {
      if (!isOpen) {
          stopLiveSession();
      }
      return () => {
          stopLiveSession();
      };
  }, [isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
            const base64 = await blobToBase64(file);
            setPendingImage({ data: base64, mimeType: file.type });
        } catch (err) {
            console.error("Image load failed", err);
        }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) {
                const base64 = await blobToBase64(blob);
                setPendingImage({ data: base64, mimeType: blob.type });
            }
            return;
        }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingImage) || !chatSession.current) return;
    
    const userText = input;
    const currentImage = pendingImage; // Capture reference
    
    // Clear Input
    setInput('');
    setPendingImage(null);

    // Optimistic Update
    setMessages(prev => [...prev, { 
        role: 'user', 
        text: userText, 
        image: currentImage ? `data:${currentImage.mimeType};base64,${currentImage.data}` : undefined,
        timestamp: getCurrentTime() 
    }]);
    
    setIsTyping(true);
    
    try {
        let result;
        if (currentImage) {
            // Multimodal Send
            const parts: any[] = [];
            if (userText) parts.push({ text: userText });
            parts.push({ inlineData: { mimeType: currentImage.mimeType, data: currentImage.data } });
            
            result = await chatSession.current.sendMessage({ message: parts });
        } else {
            // Text Only Send
            result = await chatSession.current.sendMessage({ message: userText });
        }
        
        setMessages(prev => [...prev, { role: 'model', text: result.text, timestamp: getCurrentTime() }]);
    } catch (e) {
        console.error("Chat Error", e);
        setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again.", timestamp: getCurrentTime() }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleCopyChat = () => {
      const text = messages.map(m => `[${m.timestamp}] ${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMessage = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(index);
      setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const stopLiveSession = async () => {
      // 1. Update State immediately
      setIsLive(false);
      setIsVideoActive(false);
      setIsLiveConnecting(false);
      setLiveVolume(0);
      setIsSendingFrame(false);

      // 2. Stop Video Stream (Release Camera Hardware)
      if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
          videoStreamRef.current = null;
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
      if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
      }

      // 3. Close Audio Processing Nodes
      if (inputSource.current) {
          try { inputSource.current.disconnect(); } catch (e) {}
          inputSource.current = null;
      }
      if (processor.current) {
          try { processor.current.disconnect(); } catch (e) {}
          processor.current = null;
      }
      
      // 4. Close Audio Contexts (Critical for re-enabling later)
      const closePromises = [];
      if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
          closePromises.push(inputAudioContext.current.close().catch(() => {}));
      }
      if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
          closePromises.push(outputAudioContext.current.close().catch(() => {}));
      }
      
      await Promise.all(closePromises);
      inputAudioContext.current = null;
      outputAudioContext.current = null;

      // 5. Clear Audio Buffers
      if (audioSources.current) {
          audioSources.current.forEach(s => { try { s.stop(); } catch(e) {} });
          audioSources.current.clear();
      }

      // 6. Close API Session
      if (liveSession.current) {
          liveSession.current.then(session => {
              try { session.close(); } catch(e) { console.warn("Session close error", e); }
          }).catch(() => {});
          liveSession.current = null;
      }
  };

  const startLiveSession = async (useVideo: boolean = false) => {
      // Prevent double clicking
      if (isLiveConnecting) return;

      // Force cleanup of any previous state
      if (isLive || liveSession.current) {
          await stopLiveSession();
      }

      setIsLiveConnecting(true);
      setIsVideoActive(useVideo);

      try {
          // --- 1. Initialize Audio Contexts ---
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          inputAudioContext.current = inputCtx;
          await inputCtx.resume(); 
          
          const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          outputAudioContext.current = outputCtx;
          await outputCtx.resume(); 
          nextStartTime.current = outputCtx.currentTime;

          // --- 2. Get Media Streams ---
          const constraints = { 
              audio: true, 
              video: useVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } } : false 
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (useVideo && videoRef.current) {
              videoRef.current.srcObject = stream;
              videoStreamRef.current = stream;
              await videoRef.current.play();
          }

          // --- 3. Prepare Prompt ---
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          // Increased context limit to prevent data loss that causes hallucinations
          const truncatedVoiceContext = smartTruncate(contextData, 100000); // Expanded context window

          const standardPrompt = `
                You are a trading assistant participating in a verbal debrief.
                
                CRITICAL INSTRUCTION:
                You must strictly adhere to the market analysis provided in the "CURRENT REPORT" below.
                The user has this report open. If the report says "Failed Trend" or "Balance", do NOT say we are "Trending".
                Your job is to vocalize and expand on the report, not re-analyze from scratch.

                CURRENT REPORT (GROUND TRUTH):
                ${initialReport}

                SUPPORTING CONTEXT (DATA):
                ${truncatedVoiceContext}
                
                Answer their questions specifically regarding the session.
          `;

          // STRICT VISUAL PROMPT
          const videoPrompt = `
                ${psychVideoContent || "You are a specialized Trading Performance Coach."}
                
                CRITICAL MISSION:
                The user has explicitly requested TILT MONITORING.
                They cannot see themselves, so YOU are their mirror.
                
                YOUR BEHAVIOR:
                1. CONTINUOUS MONITORING: Watch the feed constantly.
                2. AGGRESSIVE INTERVENTION: If you see signs of distress (hands on face, rubbing eyes, slamming desk, angry expression), STOP the user immediately.
                3. VERBAL CONFIRMATION: Periodically confirm you are watching (e.g., "Scanning... posture looks okay." or "I see movement.").
                
                ALIGNMENT:
                Refer to the CURRENT REPORT for market context. Do not hallucinate a different market state.
                CURRENT REPORT: ${initialReport}

                CONTEXT: ${truncatedVoiceContext}
          `;

          // --- 4. Connect Live Client ---
          const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-12-2025',
              callbacks: {
                  onopen: () => {
                      console.log("Live Session Open");
                      setIsLive(true);
                      setIsLiveConnecting(false);
                      setMessages(prev => [...prev, { 
                          role: 'model', 
                          text: useVideo ? "👁️ STEALTH MODE ACTIVE. Video feed encrypted. I am watching for tilt..." : "🔴 Voice Link Established.",
                          timestamp: getCurrentTime()
                      }]);

                      // Audio Input Handling
                      if (!inputAudioContext.current) return;
                      const source = inputAudioContext.current.createMediaStreamSource(stream);
                      const scriptProcessor = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
                      
                      scriptProcessor.onaudioprocess = (e) => {
                          const inputData = e.inputBuffer.getChannelData(0);
                          // Calculate volume for visualizer
                          let sum = 0;
                          for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                          setLiveVolume(Math.min(Math.sqrt(sum / inputData.length) * 10, 1)); 

                          // Send Audio Data
                          const pcmBlob = createBlob(inputData);
                          sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                      };

                      source.connect(scriptProcessor);
                      scriptProcessor.connect(inputAudioContext.current.destination);
                      inputSource.current = source;
                      processor.current = scriptProcessor;

                      // Video Input Handling
                      if (useVideo) {
                          // 3 FPS (330ms) for better gesture detection sensitivity
                          videoIntervalRef.current = window.setInterval(() => {
                              if (canvasRef.current && videoRef.current) {
                                  const ctx = canvasRef.current.getContext('2d');
                                  if (ctx) {
                                      canvasRef.current.width = videoRef.current.videoWidth * 0.5; 
                                      canvasRef.current.height = videoRef.current.videoHeight * 0.5;
                                      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                                      
                                      canvasRef.current.toBlob(async (blob) => {
                                          if (blob) {
                                              setIsSendingFrame(true);
                                              const base64 = await blobToBase64(blob);
                                              sessionPromise.then(session => {
                                                  session.sendRealtimeInput({ 
                                                      media: { mimeType: 'image/jpeg', data: base64 } 
                                                  });
                                                  setTimeout(() => setIsSendingFrame(false), 100);
                                              });
                                          }
                                      }, 'image/jpeg', 0.7);
                                  }
                              }
                          }, 330); 
                      }
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      const serverContent = msg.serverContent;
                      const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      
                      // Audio Output
                      if (audioData && outputAudioContext.current) {
                          const ctx = outputAudioContext.current;
                          if(ctx.state === 'suspended') await ctx.resume();

                          nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
                          const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                          const source = ctx.createBufferSource();
                          source.buffer = buffer;
                          source.connect(ctx.destination);
                          source.addEventListener('ended', () => { audioSources.current.delete(source); });
                          source.start(nextStartTime.current);
                          nextStartTime.current += buffer.duration;
                          audioSources.current.add(source);
                      }
                      
                      // Text Transcription
                      if (serverContent?.turnComplete && serverContent?.modelTurn?.parts?.[0]?.text) {
                           setMessages(prev => [...prev, { role: 'model', text: serverContent.modelTurn.parts[0].text, timestamp: getCurrentTime() }]);
                      }
                  },
                  onclose: () => { 
                      console.log("Session Closed via Server");
                      stopLiveSession(); 
                  },
                  onerror: (e) => {
                      console.error("Live Error", e);
                      stopLiveSession();
                      setMessages(prev => [...prev, { role: 'model', text: "⚠️ Connection Interrupted.", timestamp: getCurrentTime() }]);
                  }
              },
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                  systemInstruction: useVideo ? videoPrompt : standardPrompt
              }
          });
          liveSession.current = sessionPromise;

      } catch (e: any) {
          console.error("Start Live Error", e);
          setIsLiveConnecting(false);
          let errorMsg = "Connection Failed.";
          if (e.name === 'NotAllowedError') errorMsg = "Microphone/Camera access denied.";
          else if (e.name === 'NotFoundError') errorMsg = "Device not found.";
          else if (e.name === 'NotReadableError' || (e.message && e.message.includes('Device in use'))) errorMsg = "Device in use. Close other apps.";
          setMessages(prev => [...prev, { role: 'model', text: `⚠️ ${errorMsg}`, timestamp: getCurrentTime() }]);
      }
  };

  const toggleVideo = async () => {
      if (isLiveConnecting) return;
      if (isVideoActive && isLive) {
          await stopLiveSession();
      } else {
          await startLiveSession(true);
      }
  };

  const toggleAudio = async () => {
      if (isLiveConnecting) return;
      if (!isVideoActive && isLive) {
          await stopLiveSession();
      } else {
          await startLiveSession(false);
      }
  };

  if (!isOpen) return null;

  return (
    <>
        {/* Hidden video element for stream capture */}
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
        />

        <div className="fixed top-24 left-4 bottom-4 w-[480px] max-w-[90vw] bg-slate-950 border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[160] rounded-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 rounded-t-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border transition-colors ${isLive ? 'bg-rose-500/20 border-rose-500/50' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                        {isLive ? <Volume2 className="w-5 h-5 text-rose-400 animate-pulse" /> : <MessageSquare className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">{title}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                {isVideoActive ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Eye className="w-3 h-3"/> TILT MONITOR</span> 
                                ) : isLive ? (
                                    <span className="text-rose-400 font-bold">VOICE ACTIVE</span>
                                ) : (
                                    'GEMINI FLASH 3.0'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* VIDEO BTN */}
                    <button 
                        onClick={toggleVideo}
                        disabled={isLiveConnecting}
                        className={`p-2 rounded-lg border transition-all ${
                            isVideoActive && isLive
                                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700 disabled:opacity-50'
                        }`}
                        title="Start Video Monitor"
                    >
                        {isVideoActive && isLive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                    </button>

                    {/* AUDIO BTN */}
                    <button 
                        onClick={toggleAudio}
                        disabled={isLiveConnecting}
                        className={`p-2 rounded-lg border transition-all ${
                            !isVideoActive && isLive
                                ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700 shadow-[0_0_15px_rgba(225,29,72,0.4)]' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700 disabled:opacity-50'
                        }`}
                        title="Start Voice Chat"
                    >
                        {isLiveConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : !isVideoActive && isLive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    
                    <button onClick={handleCopyChat} className={`p-2 rounded-lg border transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`} title="Copy Full Chat Log">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* STEALTH VIDEO STATUS INDICATOR */}
            {isVideoActive && isLive && (
                <div className="bg-slate-900/90 border-b border-emerald-500/30 p-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            {isSendingFrame && <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20"></div>}
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                                TILT GUARD ACTIVE
                                {isSendingFrame && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-600/80">Video Stream Active (Hidden)</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-0.5 h-4">
                         {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-1 bg-emerald-500/50 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, liveVolume * 100 * (Math.random() + 0.5))}%` }} />
                        ))}
                    </div>
                </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/80 relative">
                {isLive && !isVideoActive && (
                    <div className="sticky top-0 left-0 right-0 z-20 flex justify-center mb-4">
                        <div className="bg-slate-900/90 backdrop-blur-md border border-rose-500/30 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xl">
                            <div className="flex gap-1 h-6 items-center">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-1 bg-rose-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, liveVolume * 100 * (Math.random() + 0.5))}%` }} />
                                ))}
                            </div>
                            <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest animate-pulse">Live Link Open</span>
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-lg ${m.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-indigo-600 border-indigo-500'}`}>
                            {m.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed font-medium shadow-inner flex flex-col gap-1 ${m.role === 'user' ? 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700' : 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-tl-none'}`}>
                            {/* Message Header */}
                            <div className={`flex items-center gap-2 border-b border-white/5 pb-1 mb-1 opacity-60 ${m.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                                {m.role === 'model' && <span className="text-[10px] font-mono font-bold tracking-tight">{m.timestamp}</span>}
                                
                                <div className="flex items-center gap-2">
                                    {m.role === 'user' && <span className="text-[10px] font-mono font-bold tracking-tight">{m.timestamp}</span>}
                                    <button 
                                        onClick={() => handleCopyMessage(m.text, i)} 
                                        className={`hover:text-white transition-colors ${copiedMessageId === i ? 'text-emerald-400' : 'text-current'}`}
                                        title="Copy message"
                                    >
                                        {copiedMessageId === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Attached Image (if any) */}
                            {m.image && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                    <img src={m.image} alt="User upload" className="max-w-full max-h-48 object-cover" />
                                </div>
                            )}

                            {/* Message Body */}
                            <div>{m.text}</div>
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500">
                            <Sparkles className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-0"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
                {/* Image Preview Stage */}
                {pendingImage && (
                    <div className="mb-3 flex items-start gap-2 bg-slate-950 p-2 rounded-xl border border-indigo-500/30">
                        <div className="relative group">
                            <img src={`data:${pendingImage.mimeType};base64,${pendingImage.data}`} className="h-16 w-16 object-cover rounded-lg border border-slate-700" alt="Preview" />
                            <button onClick={() => setPendingImage(null)} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-lg hover:bg-rose-600">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] text-indigo-300 font-bold uppercase block">Image Staged</span>
                            <span className="text-[9px] text-slate-500">Will be sent with next message</span>
                        </div>
                    </div>
                )}

                <div className="relative">
                    <button 
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Image"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>

                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        onPaste={handlePaste}
                        placeholder={isLive ? "Listening mode active..." : "Ask follow-up (Paste image supported)..."}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-12 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors shadow-inner placeholder:text-slate-600"
                        disabled={isTyping || isLive} 
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!input.trim() && !pendingImage) || isTyping || isLive}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors shadow-lg"
                    >
                        {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

export default ChatPanel;
