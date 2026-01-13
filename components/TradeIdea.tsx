
import React, { useState, useMemo, useEffect } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Lightbulb, 
  Target, 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Quote,
  BookOpen,
  Link2,
  Unlink,
  Loader2,
  Copy,
  ClipboardCheck,
  X,
  PlayCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  FileText,
  LayoutGrid,
  Zap,
  BarChart2,
  MousePointerClick,
  Ban,
  Flag
} from 'lucide-react';

interface TradeIdeaProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
}

const PLAYBOOK_URL = "https://storage.googleapis.com/rockit-data/inference/playbooks.md";

// --- ANIMATION STYLES & COMMON DEFS ---
const AnimStyles = () => (
  <style>{`
    @keyframes drawLine {
      from { stroke-dashoffset: 1000; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0); }
      70% { opacity: 1; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulseTarget {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 1; }
    }
    .path-draw { stroke-dasharray: 1000; animation: drawLine 8s ease-out forwards; }
    .marker-entry { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    .marker-stop { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    .marker-target { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    
    /* Delay Utility Classes for sequencing - Slowed down for digestion */
    .delay-0 { animation-delay: 0s; }
    .delay-1 { animation-delay: 1.5s; }
    .delay-2 { animation-delay: 3s; }  /* Setup Forming */
    .delay-3 { animation-delay: 4.5s; } /* Trigger / Entry 1 */
    .delay-3b { animation-delay: 6s; }  /* Entry 2 */
    .delay-4 { animation-delay: 7s; }  /* Stop Placement */
    .delay-5 { animation-delay: 8s; }  /* Move to Target */
  `}</style>
);

const CommonDefs = () => (
  <defs>
    <filter id="glow-entry" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="volGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
    </linearGradient>
    <linearGradient id="volGradientRed" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0"/>
    </linearGradient>
    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
    </pattern>
  </defs>
);

// --- VISUALIZATION COMPONENTS (SVG) ---

const PlayVisual_Trend = () => (
  <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
    <AnimStyles />
    <CommonDefs />
    <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />

    {/* Volume Profile (Trend - Thin/Elongated) */}
    <path d="M0 160 L 40 140 L 40 120 L 30 100 L 30 80 L 40 60 L 40 40 L 60 20 L 60 0 L 0 0 Z" fill="url(#volGradient)" />

    {/* IB Levels */}
    <line x1="0" y1="90" x2="300" y2="90" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
    <text x="295" y="85" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">IB HIGH</text>

    {/* EMA (Dynamic Support) */}
    <path d="M0 140 Q 100 120, 160 95 T 300 25" fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.5" strokeDasharray="2 2" />
    <text x="20" y="130" fill="#8b5cf6" fontSize="8" opacity="0.6" fontStyle="italic">20 EMA</text>

    {/* Price Path: Break IB -> Pullback to EMA -> Extend */}
    <path d="M20 130 L 80 80 L 120 95 L 200 40 L 230 50 L 290 10" 
          fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.1" />
    
    <path d="M20 130 L 80 80 L 120 95 L 200 40 L 230 50 L 290 10" 
          fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
          className="path-draw" />

    {/* 1. ENTRY: Pullback to Broken IB/EMA */}
    <g className="marker-entry delay-3" style={{ transformBox: 'fill-box' }}>
      <circle cx="120" cy="95" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" filter="url(#glow-entry)" />
      <text x="120" y="115" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">ENTRY 1</text>
    </g>

    {/* 2. SCALE-IN: Second Pullback */}
    <g className="marker-entry delay-3b" style={{ transformBox: 'fill-box' }}>
      <circle cx="230" cy="50" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <text x="230" y="68" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">ADD</text>
    </g>

    {/* 3. STOP: Trailing Below EMA */}
    <g className="marker-stop delay-4" style={{ transformBox: 'fill-box' }}>
      <line x1="100" y1="110" x2="140" y2="110" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
      <text x="145" y="112" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="start">STOP</text>
    </g>

    {/* 4. TARGET: Extension */}
    <g className="marker-target delay-5" style={{ transformBox: 'fill-box' }}>
      <circle cx="290" cy="10" r="8" fill="none" stroke="#10b981" strokeWidth="2" className="animate-[pulseTarget_2s_infinite]" />
      <text x="280" y="25" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">TP</text>
    </g>
  </svg>
);

const PlayVisual_Balance = () => (
  <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
    <AnimStyles />
    <CommonDefs />
    <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />

    {/* Volume Profile (Balance - D Shape) */}
    <path d="M0 140 Q 80 80, 0 20 Z" fill="url(#volGradient)" />
    <line x1="0" y1="80" x2="60" y2="80" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
    <text x="65" y="82" fill="#6366f1" fontSize="8" opacity="0.5">VPOC</text>

    {/* IB Levels - Defining the Range */}
    <line x1="0" y1="30" x2="300" y2="30" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
    <text x="295" y="25" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">IB HIGH</text>
    
    <line x1="0" y1="130" x2="300" y2="130" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
    <text x="295" y="145" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">IB LOW</text>

    {/* Price Action: Rotational */}
    <path d="M50 80 L 100 130 L 115 125 L 180 30 L 200 35 L 250 80" 
          fill="none" stroke="#64748b" strokeWidth="3" opacity="0.1" />
    
    <path d="M50 80 L 100 130 L 115 125 L 180 30 L 200 35 L 250 80" 
          fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
          className="path-draw" />

    {/* ENTRY 1: Fade Low */}
    <g className="marker-entry delay-2">
        <circle cx="115" cy="125" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
        <text x="130" y="135" fill="#3b82f6" fontSize="9" fontWeight="bold">BUY</text>
    </g>
    
    {/* ENTRY 2: Fade High */}
    <g className="marker-entry delay-4">
        <circle cx="200" cy="35" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
        <text x="200" y="20" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">SELL</text>
    </g>

    {/* TARGET: POC/Mid */}
    <g className="marker-target delay-5">
        <circle cx="250" cy="80" r="4" fill="#10b981" />
        <text x="265" y="85" fill="#10b981" fontSize="9" fontWeight="bold">TP</text>
    </g>
  </svg>
);

const PlayVisual_Trap = () => (
  <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
    <AnimStyles />
    <CommonDefs />
    <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />

    {/* Volume Profile (Bulge at top) */}
    <path d="M0 140 L 20 120 L 20 60 L 50 40 L 50 10 L 0 10 Z" fill="url(#volGradientRed)" />

    {/* Key Level (IBH/PDH) */}
    <line x1="0" y1="40" x2="300" y2="40" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" />
    <text x="295" y="35" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="end">LIQUIDITY (IBH/PDH)</text>

    {/* Price: Breakout -> Fail -> Retest -> Flush */}
    <path d="M30 80 L 80 40 L 120 15 L 140 25 L 130 50 L 150 50 L 180 100 L 250 140" 
          fill="none" stroke="#64748b" strokeWidth="3" opacity="0.1" />

    <path d="M30 80 L 80 40 L 120 15 L 140 25 L 130 50 L 150 50 L 180 100 L 250 140" 
          fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
          className="path-draw" />

    {/* The Trap Box */}
    <g className="delay-2 fade-in" style={{ opacity: 0, animation: 'fadeIn 0.5s forwards 2s' }}>
        <rect x="100" y="5" width="60" height="40" fill="#f43f5e" fillOpacity="0.1" stroke="#f43f5e" strokeDasharray="2 2" />
        <text x="130" y="25" fill="#f43f5e" fontSize="9" fontStyle="italic" textAnchor="middle" fontWeight="bold">TRAPPED LONGS</text>
    </g>

    {/* ENTRY: Re-acceptance inside */}
    <g className="marker-entry delay-3">
        <circle cx="150" cy="50" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
        <text x="165" y="55" fill="#3b82f6" fontSize="9" fontWeight="bold">ENTRY</text>
    </g>

    {/* STOP: Above Trap */}
    <g className="marker-stop delay-4">
        <line x1="120" y1="10" x2="160" y2="10" stroke="#f43f5e" strokeWidth="2" />
        <text x="175" y="12" fill="#f43f5e" fontSize="8" fontWeight="bold">STOP</text>
    </g>

    {/* TARGET: Flush */}
    <g className="marker-target delay-5">
        <circle cx="250" cy="140" r="6" fill="#10b981" />
        <text x="250" y="155" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">TP</text>
    </g>
  </svg>
);

const PlayVisual_Sweep = () => (
  <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
    <AnimStyles />
    <CommonDefs />
    <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />
    
    {/* Vol Profile */}
    <path d="M0 10 L 30 30 L 30 100 L 10 120 L 0 140 Z" fill="url(#volGradient)" />

    {/* Support Level (IBL/PDL) */}
    <line x1="0" y1="110" x2="300" y2="110" stroke="#94a3b8" strokeWidth="1" />
    <rect x="0" y="110" width="300" height="30" fill="#0f172a" opacity="0.5" />
    <text x="295" y="105" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="end">KEY SUPPORT (IBL)</text>

    {/* Price Path */}
    <path d="M40 70 L 80 100 L 100 110 L 130 135 L 160 105 L 180 110 L 260 40" 
          fill="none" stroke="#64748b" strokeWidth="3" opacity="0.1" />

    <path d="M40 70 L 80 100 L 100 110 L 130 135 L 160 105 L 180 110 L 260 40" 
          fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
          className="path-draw" />

    {/* Sweep Highlight */}
    <g className="delay-2 fade-in" style={{ opacity: 0, animation: 'fadeIn 0.5s forwards 2s' }}>
        <circle cx="130" cy="135" r="6" fill="#f59e0b" fillOpacity="0.8" />
        <text x="130" y="152" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">LIQ GRAB</text>
    </g>

    {/* ENTRY: Reclaim */}
    <g className="marker-entry delay-3">
        <circle cx="180" cy="110" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
        <text x="180" y="95" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">RECLAIM</text>
    </g>

    {/* STOP */}
    <g className="marker-stop delay-4">
        <line x1="110" y1="145" x2="150" y2="145" stroke="#f43f5e" strokeWidth="2" />
    </g>

    {/* TARGET */}
    <g className="marker-target delay-5">
        <circle cx="260" cy="40" r="6" fill="#10b981" />
    </g>
  </svg>
);

const PlayVisual_Compression = () => (
    <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
        <AnimStyles />
        <CommonDefs />
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />
        
        {/* IB Levels Constraining */}
        <line x1="0" y1="50" x2="300" y2="50" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />
        <line x1="0" y1="110" x2="300" y2="110" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />

        {/* Wedge Pattern */}
        <path d="M20 50 L 220 80" stroke="#64748b" strokeWidth="1" strokeDasharray="4 2" />
        <path d="M20 110 L 220 80" stroke="#64748b" strokeWidth="1" strokeDasharray="4 2" />
        
        {/* Coil Price Action */}
        <path d="M30 60 L 60 100 L 90 70 L 120 90 L 150 78 L 180 82 L 220 80 L 280 30" 
              fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
              className="path-draw" />

        <circle cx="220" cy="80" r="10" fill="none" stroke="#f59e0b" strokeWidth="1" className="delay-2 fade-in" style={{ opacity: 0, animation: 'fadeIn 0.5s forwards 2s' }} />

        {/* ENTRY */}
        <g className="marker-entry delay-3">
            <circle cx="220" cy="80" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
            <text x="220" y="105" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">BREAK</text>
        </g>

        {/* TARGET */}
        <g className="marker-target delay-5">
            <circle cx="280" cy="30" r="6" fill="#10b981" />
        </g>
    </svg>
);

const PlayVisual_GapGo = () => (
    <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
        <AnimStyles />
        <CommonDefs />
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />
        
        {/* Yesterday Close */}
        <rect x="20" y="100" width="20" height="40" fill="#475569" />
        <text x="30" y="150" fill="#64748b" fontSize="9" textAnchor="middle">Y'DAY</text>

        {/* Gap Zone */}
        <rect x="40" y="60" width="260" height="40" fill="#6366f1" fillOpacity="0.05" />
        <text x="150" y="85" fill="#6366f1" fontSize="10" fontWeight="bold" textAnchor="middle" opacity="0.3">GAP ZONE</text>
        
        {/* IB High Reference */}
        <line x1="0" y1="50" x2="300" y2="50" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
        <text x="295" y="45" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6">IBH</text>

        {/* Price: Open -> Pullback -> Go */}
        <path d="M60 40 L 80 20 L 100 50 L 120 50 L 140 10 L 180 0 L 260 -5" 
              fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
              className="path-draw" />

        {/* ENTRY */}
        <g className="marker-entry delay-3">
            <circle cx="120" cy="50" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
            <text x="120" y="70" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">GAP HOLD</text>
        </g>

        {/* STOP */}
        <g className="marker-stop delay-4">
            <line x1="100" y1="80" x2="140" y2="80" stroke="#f43f5e" strokeWidth="2" />
        </g>
    </svg>
);

const PlayVisual_Generic = () => (
    <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg">
        <AnimStyles />
        <CommonDefs />
        <rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" />
        <rect x="50" y="40" width="200" height="80" fill="#1e293b" rx="8" />
        <path d="M70 100 L 110 80 L 150 90 L 190 50" fill="none" stroke="#10b981" strokeWidth="3" className="path-draw" />
        <circle cx="110" cy="80" r="5" fill="#3b82f6" className="marker-entry delay-3" />
        <circle cx="190" cy="50" r="5" fill="#10b981" className="marker-target delay-5" />
    </svg>
);

// --- HELPER: MAP TITLE TO VISUAL ---
const getVisualForTitle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('trend') || t.includes('drive') || t.includes('go-with')) return PlayVisual_Trend;
    if (t.includes('balance') || t.includes('range') || t.includes('rotational') || t.includes('fade')) return PlayVisual_Balance;
    if (t.includes('trap') || t.includes('failed') || t.includes('fake') || t.includes('reject')) return PlayVisual_Trap;
    if (t.includes('sweep') || t.includes('liquidity') || t.includes('stop') || t.includes('reclaim')) return PlayVisual_Sweep;
    if (t.includes('coil') || t.includes('compress') || t.includes('squeeze') || t.includes('inside')) return PlayVisual_Compression;
    if (t.includes('gap')) return PlayVisual_GapGo;
    return PlayVisual_Generic;
};

// --- HELPER: PARSE MARKDOWN ---
const parsePlaybookMarkdown = (text: string) => {
    // Split by H2 or H3 headers
    const sections = text.split(/^#{2,3}\s+/m).slice(1);
    
    return sections.map(section => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        // Description is text before the first bullet point
        const descMatch = content.match(/^[^*-]+/);
        const desc = descMatch ? descMatch[0].replace(/\n/g, ' ').trim() : "";
        
        // Rules are bullet points
        const rules = content.match(/^[-*]\s+(.+)$/gm)?.map(r => r.replace(/^[-*]\s+/, '').trim()) || [];
        
        return {
            id: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            title,
            desc: desc || "Strategy execution details.",
            rules: rules.length > 0 ? rules : ["No specific rules found in markdown."],
            visual: getVisualForTitle(title)
        };
    });
};


const PlaybookCard = ({ item, onClick }: { item: any, onClick: () => void }) => {
  const Visual = item.visual;
  return (
    <div 
        onClick={onClick}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-indigo-500 transition-all group hover:bg-slate-800/80 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] cursor-pointer h-full flex flex-col"
    >
        {/* Visual Container */}
        <div className="aspect-[2/1] bg-slate-950 rounded-xl mb-4 overflow-hidden relative border border-slate-800 group-hover:border-indigo-500/30 transition-colors shadow-inner">
            <div className="absolute inset-0 p-2 opacity-90 group-hover:opacity-100 transition-all duration-500">
                <Visual />
            </div>
            {/* Legend Overlay (visible on hover) */}
            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-1 text-[8px] font-bold text-blue-400"><MousePointerClick className="w-3 h-3"/> Entry</div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-rose-400"><Ban className="w-3 h-3"/> Stop</div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400"><Flag className="w-3 h-3"/> TP</div>
            </div>
        </div>
        
        <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-black uppercase text-slate-200 group-hover:text-indigo-400 transition-colors">{item.title}</h3>
            <div className="p-1.5 rounded-lg bg-slate-950 text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                <Activity className="w-3.5 h-3.5" />
            </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-medium flex-1 line-clamp-3">{item.desc}</p>
        
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 group-hover:text-slate-300">
            <PlayCircle className="w-3 h-3 text-indigo-500" />
            <span>View Execution Rules</span>
            <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0 text-indigo-400" />
        </div>
    </div>
  );
};


const TradeIdea: React.FC<TradeIdeaProps> = ({ snapshots, currentSnapshot }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Playbook Data State
  const [playbookSource, setPlaybookSource] = useState<string | null>(null);
  const [playbookItems, setPlaybookItems] = useState<any[]>([]);
  const [playbookStatus, setPlaybookStatus] = useState<'loading' | 'active' | 'error'>('loading');
  
  const [copied, setCopied] = useState(false);
  
  // Library UI State
  const [showPlaybookLibrary, setShowPlaybookLibrary] = useState(false);
  const [libraryView, setLibraryView] = useState<'visual' | 'source'>('visual');
  const [selectedPlay, setSelectedPlay] = useState<any>(null);

  // Fetch Playbook on Mount
  useEffect(() => {
    const fetchPlaybook = async () => {
        setPlaybookStatus('loading');
        try {
            const res = await fetch(`${PLAYBOOK_URL}?cb=${Date.now()}`); // Add cache buster to URL, but React state will cache it for session
            if (res.ok) {
                const text = await res.text();
                if (text.length > 50) {
                    setPlaybookSource(text);
                    const parsedItems = parsePlaybookMarkdown(text);
                    setPlaybookItems(parsedItems);
                    setPlaybookStatus('active');
                } else {
                    console.warn("Playbook file empty or too short");
                    setPlaybookStatus('error');
                }
            } else {
                console.warn(`Playbook fetch failed: ${res.status}`);
                setPlaybookStatus('error');
            }
        } catch (e) {
            console.warn("Playbook fetch failed, network error:", e);
            setPlaybookStatus('error');
        }
    };
    fetchPlaybook();
  }, []);

  // Filter history to strictly ensure no look-ahead bias
  const historyPointInTime = useMemo(() => {
    if (!snapshots || !currentSnapshot) return [];
    const currentTime = currentSnapshot.input.current_et_time;
    // Sort by time just in case, then filter
    return snapshots
        .filter(s => s.input.current_et_time <= currentTime)
        .sort((a, b) => a.input.current_et_time.localeCompare(b.input.current_et_time));
  }, [snapshots, currentSnapshot]);

  const generateTradeIdeas = async () => {
    if (!historyPointInTime || historyPointInTime.length === 0) {
      setError("No data available for this timestamp.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');
    setCopied(false);

    try {
      const lastSnapshot = historyPointInTime[historyPointInTime.length - 1];
      const lastInput = lastSnapshot.input;
      
      const sessionTelemetry = historyPointInTime.map(s => ({
        time: s.input.current_et_time,
        price: s.input.intraday.ib.current_close,
        vwap: s.input.intraday.ib.current_vwap,
        ib_status: s.input.intraday.ib.ib_status,
        tpo_shape: s.input.intraday.tpo_profile.tpo_shape,
        dpoc: s.input.intraday.volume_profile.current_session.poc,
        logic_signals: {
            ib_acceptance: s.input.core_confluences.ib_acceptance,
            migration: s.input.core_confluences.migration?.net_direction
        },
        ai_bias: s.decoded?.bias || 'N/A',
        ai_narrative: s.decoded?.one_liner || ''
      }));

      const prompt = `
        Role: Senior Execution Strategist (Futures).
        
        TIMESTAMP FOR ANALYSIS: ${lastInput.current_et_time}
        (Strictly ignore any market data occurring after this time)

        ==================================================================================
        PART 1: THE PLAYBOOK (STRATEGIC RULES)
        ${playbookSource ? playbookSource : "NO PLAYBOOK FOUND. RELY ON STANDARD AUCTION THEORY."}
        ==================================================================================

        PART 2: TPO & PROFILE STRUCTURE (THE MAP)
        - Shape: ${lastInput.intraday.tpo_profile.tpo_shape}
        - Value Area: VAH ${lastInput.intraday.tpo_profile.current_vah} | POC ${lastInput.intraday.tpo_profile.current_poc} | VAL ${lastInput.intraday.tpo_profile.current_val}
        - Anomalies: 
          * Poor High: ${lastInput.intraday.tpo_profile.poor_high ? 'YES (Repair Target)' : 'NO'}
          * Poor Low: ${lastInput.intraday.tpo_profile.poor_low ? 'YES (Repair Target)' : 'NO'}
        - Single Prints (Rejection Zones):
          * Above VAH: ${lastInput.intraday.tpo_profile.single_prints_above_vah} ticks
          * Below VAL: ${lastInput.intraday.tpo_profile.single_prints_below_val} ticks
        - Fattening Zone: ${lastInput.intraday.tpo_profile.fattening_zone}

        PART 3: FULL SESSION TELEMETRY (THE STORY)
        ${JSON.stringify(sessionTelemetry)}

        PART 4: CURRENT CONFLUENCES (LOGIC TAB)
        ${JSON.stringify(lastInput.core_confluences)}
        ==================================================================================

        TASK:
        Based on the "Playbook" rules and the "Full Session Telemetry", generate the Daily Trade Plan.
        
        REQUIREMENTS:
        1. Compare the Bullish vs. Bearish Case.
        2. RATE which one is "Primary" vs "Hedge".
        3. Explain WHY based on TPO Structure.
        4. Identify precise levels for Entry, Stop, Targets based on price ${lastInput.intraday.ib.current_close}.

        OUTPUT FORMAT (Markdown):
        ## ⚖️ Probability Assessment
        - **Favored Bias:** [LONG / SHORT]
        - **Confidence Score:** [0-100%]
        - **The "Why":** (Synthesize context)

        ## 🥇 PRIMARY SETUP (Highest Likelihood)
        - **Playbook Play:** (Name of play)
        - **Trigger Condition:** (Specific event)
        - **Entry Zone:** [Price]
        - **Risk Exit (Stop):** [Price]
        - **Target 1:** [Price]
        - **Target 2:** [Price]
        - **⚠️ Caution:** (Risk factors)

        ## 🥈 HEDGE SETUP (Counter-Trend)
        - **Playbook Play:** (Name of play)
        - **Logic:** (Reversal condition)
        - **Entry Zone:** [Price]
        - **Risk Exit (Stop):** [Price]
        - **Target 1:** [Price]
        - **Target 2:** [Price]
        - **⚠️ Caution:** (Risk factors)

        ## 🛡 Execution Nuance
        - (Specific advice)
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.4,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          setReport(prev => prev + text);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate trade ideas.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    const time = currentSnapshot?.input?.current_et_time || 'N/A';
    const content = `**Trade Idea Analysis - ${time}**\n\n${report}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.includes('Probability Assessment')) {
        return <h2 key={i} className="text-xl font-black text-indigo-400 mt-10 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-indigo-500/30 pb-3"><Quote className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.includes('PRIMARY SETUP')) {
        return <h2 key={i} className="text-xl font-black text-emerald-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-emerald-500/30 pb-3"><Target className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.includes('HEDGE SETUP') || line.includes('Counter-Trend')) {
        return <h2 key={i} className="text-xl font-black text-amber-400 mt-12 mb-6 uppercase tracking-widest flex items-center gap-3 border-b-2 border-amber-500/30 pb-3"><Shield className="w-6 h-6" /> {line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.includes('Execution Nuance')) {
        return <h2 key={i} className="text-lg font-black text-slate-400 mt-10 mb-4 uppercase tracking-widest flex items-center gap-3 border-b border-slate-700 pb-2"><BookOpen className="w-5 h-5" /> {line.replace(/#+/g, '').trim()}</h2>;
      }
      if (line.trim().startsWith('- **') || line.trim().startsWith('* **')) {
        const content = line.replace(/^[-*] \*\*/, '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        let valColor = "text-slate-200";
        if (title.includes("Target")) valColor = "text-emerald-300";
        if (title.includes("Stop") || title.includes("Exit")) valColor = "text-rose-300";
        if (title.includes("Entry")) valColor = "text-blue-300";
        if (title.includes("Favored Bias")) valColor = "text-indigo-300";
        if (title.includes("Confidence")) valColor = "text-amber-300";
        if (title.includes("Trigger")) valColor = "text-sky-300";
        if (title.includes("Caution")) valColor = "text-orange-300";
        return <div key={i} className="flex gap-4 mb-3 ml-2 items-baseline text-base"><span className="text-slate-500 font-black uppercase tracking-wider shrink-0 w-36 text-right">{title}:</span><span className={`font-mono font-bold text-lg ${valColor}`}>{rest.join(':')}</span></div>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-8 list-disc text-slate-300 my-2 text-base leading-relaxed">{line.replace('- ', '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-slate-400 leading-relaxed mb-2 text-base font-medium">{line}</p>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Lightbulb className="w-8 h-8 text-amber-400" />
            </div>
            <div>
                <h2 className="text-base font-black uppercase tracking-widest text-slate-200">Trade Idea Generator</h2>
                <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                        TIME: {currentSnapshot?.input?.current_et_time}
                     </span>
                     {playbookStatus === 'loading' && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500 font-bold animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Linking Playbook...</span>}
                     {playbookStatus === 'active' && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold"><Link2 className="w-3 h-3" /> Playbook Linked</span>}
                     {playbookStatus === 'error' && <span title={`Failed to fetch: ${PLAYBOOK_URL}`} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 font-bold cursor-help"><Unlink className="w-3 h-3" /> Playbook Unlinked</span>}
                     
                     <button onClick={() => setShowPlaybookLibrary(true)} className="ml-2 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors border border-indigo-500/30" title="Open Playbook Library">
                         <BookOpen className="w-3.5 h-3.5" />
                     </button>
                </div>
            </div>
        </div>
        {!loading && (
             <button onClick={generateTradeIdeas} className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] group transform hover:-translate-y-0.5">
                <Lightbulb className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Generate Plan</span>
            </button>
        )}
      </div>

      {/* PLAYBOOK LIBRARY DRAWER */}
      {showPlaybookLibrary && (
          <div className="fixed inset-0 z-[200] flex justify-end">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setShowPlaybookLibrary(false)} />
              
              <div className="relative w-full md:w-[75%] lg:w-[66%] h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <BookOpen className="w-8 h-8 text-indigo-400" />
                          <div>
                              <h2 className="text-2xl font-black uppercase tracking-widest text-slate-100">The Rockit Playbook</h2>
                              <p className="text-xs text-slate-500 font-mono tracking-widest">STRATEGIC ARCHETYPES & EXECUTION PATTERNS</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center">
                              <button onClick={() => setLibraryView('visual')} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${libraryView === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                  <LayoutGrid className="w-3 h-3 inline-block mr-1.5" /> Visual Cards
                              </button>
                              <button onClick={() => setLibraryView('source')} className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${libraryView === 'source' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                  <FileText className="w-3 h-3 inline-block mr-1.5" /> Source Text
                              </button>
                          </div>
                          <button onClick={() => setShowPlaybookLibrary(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/50 border border-slate-700 transition-all">
                              <X className="w-6 h-6" />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950 relative">
                      {libraryView === 'visual' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                              {playbookItems.length > 0 ? playbookItems.map(item => (
                                  <div key={item.id} className="h-64 sm:h-80">
                                      <PlaybookCard item={item} onClick={() => setSelectedPlay(item)} />
                                  </div>
                              )) : (
                                  <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-600">
                                      <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                      <p className="text-sm font-black uppercase tracking-widest">Parsing Library...</p>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="max-w-4xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800 font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                              {playbookSource || "Loading playbook source..."}
                          </div>
                      )}
                  </div>

                  {/* DETAIL OVERLAY */}
                  {selectedPlay && (
                      <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
                           <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
                               <div className="flex items-center gap-3">
                                   <button onClick={() => setSelectedPlay(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                                       <ArrowRight className="w-5 h-5 rotate-180" />
                                   </button>
                                   <h2 className="text-xl font-black uppercase text-indigo-400">{selectedPlay.title}</h2>
                               </div>
                               <button onClick={() => setSelectedPlay(null)} className="p-2 text-slate-500 hover:text-white"><X className="w-6 h-6"/></button>
                           </div>
                           <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
                               <div className="lg:w-1/2 aspect-video bg-slate-900 rounded-2xl border border-slate-800 p-8 flex items-center justify-center shadow-2xl">
                                    <div className="w-full h-full transform scale-110">
                                        <selectedPlay.visual />
                                    </div>
                               </div>
                               <div className="lg:w-1/2 space-y-8">
                                   <div>
                                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Strategy Concept</h3>
                                       <p className="text-lg font-medium text-slate-200 leading-relaxed">{selectedPlay.desc}</p>
                                   </div>
                                   <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                                       <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                           <CheckCircle2 className="w-4 h-4" /> Execution Rules
                                       </h3>
                                       <ul className="space-y-4">
                                           {selectedPlay.rules.map((rule: string, i: number) => (
                                               <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                                                   <span className="text-indigo-500 font-bold select-none">{i+1}.</span>
                                                   <span>{rule}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                               </div>
                           </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Main Content (when library closed) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/50 relative z-10">
        {!report && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Shield className="w-32 h-32 text-slate-700 mb-8" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-500">No Active Trade Plan</p>
                <div className="flex items-center gap-3 mt-6 text-xs text-slate-400 font-mono bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                    Ready to scan market structure at {currentSnapshot?.input?.current_et_time}
                </div>
            </div>
        )}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative mb-10">
                    <div className="w-32 h-32 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-32 h-32 border-4 border-t-amber-500 rounded-full animate-spin"></div>
                    <Lightbulb className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-amber-400 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-400 animate-pulse">Scanning Playbook...</p>
                <div className="mt-6 flex flex-col items-center gap-2 w-72">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-progress-indeterminate"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Processing Full Session Telemetry...</span>
                </div>
            </div>
        )}
        {error && (
            <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5">
                <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wide">Analysis Error</h3>
                    <p className="text-sm text-rose-300/80 mt-2 font-mono">{error}</p>
                </div>
            </div>
        )}
        {report && (
            <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-4">
                     <div className="flex items-center gap-3 opacity-60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-mono text-emerald-500/70 uppercase tracking-widest">Actionable Intelligence • Valid for {currentSnapshot?.input?.current_et_time}</span>
                     </div>
                     <button onClick={handleCopy} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${copied ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'}`} title="Copy report to clipboard (Notion Ready)">
                        {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
                <div className="prose prose-invert prose-headings:font-black prose-p:text-slate-300 max-w-none">{renderMarkdown(report)}</div>
                <div className="mt-16 pt-10 border-t border-slate-800/50 flex items-center justify-center opacity-30"><Quote className="w-8 h-8 text-slate-500" /></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TradeIdea;
