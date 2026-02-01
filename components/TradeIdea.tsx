
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { PLAYBOOK_URL, PSYCH_URL } from '../utils/dataHelpers';
import { appendJournalEntry } from '../utils/journalService';
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
  Flag, 
  MessageSquare, 
  History, 
  FlaskConical, 
  XCircle, 
  CheckCircle, 
  Clock, 
  ArrowRightLeft, 
  Footprints, 
  Info, 
  Maximize2, 
  RefreshCw, 
  Camera, 
  ImagePlus, 
  Trash2
} from 'lucide-react';
import ChatPanel from './ChatPanel';

interface TradeIdeaProps {
  snapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
  isGlobalChatOpen?: boolean;
  tpoAnalysisContent?: string;
  sessionDate: string;
  snapshotTime: string;
}

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
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .path-draw { stroke-dasharray: 1000; animation: drawLine 12s ease-out forwards; }
    .path-draw-fast { stroke-dasharray: 1000; animation: drawLine 8s ease-out forwards; }
    .marker-entry { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    .marker-stop { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    .marker-target { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform-origin: center; }
    .delay-1 { animation-delay: 2s; }
    .delay-2 { animation-delay: 4s; }
    .delay-3 { animation-delay: 6s; }
    .delay-4 { animation-delay: 8s; }
    .delay-5 { animation-delay: 10s; }
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

// ... (Keeping existing SVG components: PlayVisual_TrendBull, PlayVisual_TrendBear, etc. omitted for brevity but assumed present) ...
const PlayVisual_TrendBull = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><path d="M0 160 L 40 140 L 40 120 L 30 100 L 30 80 L 40 60 L 40 40 L 60 20 L 60 0 L 0 0 Z" fill="url(#volGradient)" /><line x1="0" y1="90" x2="300" y2="90" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" /><text x="295" y="85" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">IB HIGH</text><path d="M20 120 L 60 100 L 90 110 L 140 80 L 170 90 L 250 20" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-3"><circle cx="170" cy="90" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="170" y="105" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">RETEST</text></g><g className="marker-stop delay-2"><line x1="150" y1="115" x2="190" y2="115" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" /><text x="195" y="118" fill="#f43f5e" fontSize="7" fontWeight="bold">STOP</text></g><g className="marker-target delay-5"><circle cx="250" cy="20" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="240" y="30" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">TP</text></g></svg>);
const PlayVisual_TrendBear = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><path d="M0 0 L 30 20 L 30 40 L 50 60 L 50 80 L 30 100 L 30 120 L 20 140 L 20 160 L 0 160 Z" fill="url(#volGradientRed)" /><line x1="0" y1="70" x2="300" y2="70" stroke="#f97316" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" /><text x="295" y="65" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">IB LOW</text><path d="M20 40 L 60 55 L 100 30 L 140 75 L 170 65 L 260 140" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-3"><circle cx="170" cy="65" r="4" fill="#f43f5e" stroke="white" strokeWidth="1.5" /><text x="170" y="55" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle">SHORT</text></g><g className="marker-stop delay-2"><line x1="150" y1="45" x2="190" y2="45" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" /><text x="195" y="48" fill="#f43f5e" fontSize="7" fontWeight="bold">STOP</text></g><g className="marker-target delay-5"><circle cx="260" cy="140" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="270" y="150" fill="#10b981" fontSize="9" fontWeight="bold">TP</text></g></svg>);
const PlayVisual_Balance = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><path d="M0 140 Q 80 80, 0 20 Z" fill="url(#volGradient)" /><line x1="0" y1="30" x2="300" y2="30" stroke="#f97316" strokeWidth="1" opacity="0.4" /><text x="295" y="25" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">VAH / RES</text><line x1="0" y1="130" x2="300" y2="130" stroke="#f97316" strokeWidth="1" opacity="0.4" /><text x="295" y="145" fill="#f97316" fontSize="8" textAnchor="end" opacity="0.6" fontWeight="bold">VAL / SUP</text><path d="M30 80 L 70 120 L 100 125 L 150 40 L 180 35 L 240 120" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-2"><circle cx="100" cy="125" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="100" y="140" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">BUY FADE</text></g><g className="marker-entry delay-4"><circle cx="180" cy="35" r="4" fill="#f43f5e" stroke="white" strokeWidth="1.5" /><text x="180" y="25" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle">SELL FADE</text></g></svg>);
const PlayVisual_WeeklyTPO = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><path d="M0 20 L 40 20 L 40 50 L 80 50 L 80 80 L 100 80 L 100 100 L 60 100 L 60 140 L 0 140 Z" fill="#6366f1" fillOpacity="0.1" stroke="#6366f1" strokeOpacity="0.2" /><line x1="0" y1="50" x2="300" y2="50" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 2" /><text x="295" y="45" fill="#a855f7" fontSize="8" textAnchor="end" fontWeight="bold">WEEKLY VAH</text><line x1="0" y1="90" x2="300" y2="90" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" /><text x="110" y="85" fill="#f59e0b" fontSize="8" fontWeight="bold">COMPOSITE POC</text><path d="M200 140 L 220 110 L 210 90 L 230 88 L 220 92 L 240 50" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-3"><circle cx="230" cy="88" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="230" y="105" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">ACC/REJ</text></g><g className="marker-target delay-5"><circle cx="240" cy="50" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="250" y="45" fill="#10b981" fontSize="9" fontWeight="bold">TARGET</text></g></svg>);
const PlayVisual_IBBreak = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><rect x="0" y="60" width="300" height="40" fill="#f97316" fillOpacity="0.05" /><line x1="0" y1="60" x2="300" y2="60" stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" /><text x="295" y="55" fill="#f97316" fontSize="8" textAnchor="end" fontWeight="bold">IB HIGH</text><path d="M20 80 L 60 70 L 100 50 L 120 45 L 140 70 L 160 90" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" className="delay-1 fade-in" style={{opacity:0, animation: 'fadeIn 1s forwards 1s'}} /><text x="120" y="35" fill="#64748b" fontSize="8" textAnchor="middle" className="delay-1 fade-in" style={{opacity:0, animation: 'fadeIn 1s forwards 1s'}}>TRAP?</text><path d="M20 80 L 60 70 L 100 50 L 130 55 L 160 30 L 220 10" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-3"><circle cx="130" cy="55" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="130" y="70" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">FLIP/HOLD</text></g><g className="marker-target delay-5"><circle cx="220" cy="10" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="210" y="20" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">EXT</text></g></svg>);
const PlayVisual_Trap = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><line x1="0" y1="60" x2="300" y2="60" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 2" /><text x="295" y="55" fill="#f43f5e" fontSize="8" textAnchor="end" fontWeight="bold">RESISTANCE / HOD</text><path d="M20 100 L 60 80 L 100 70 L 130 50 L 150 55 L 180 90 L 240 130" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><rect x="110" y="40" width="50" height="30" fill="#f43f5e" fillOpacity="0.1" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="2 2" className="delay-1 fade-in" style={{opacity:0, animation: 'fadeIn 1s forwards 2s'}} /><text x="135" y="35" fill="#f43f5e" fontSize="8" textAnchor="middle" className="delay-1 fade-in" style={{opacity:0, animation: 'fadeIn 1s forwards 2s'}}>TRAP ZONE</text><g className="marker-entry delay-3"><circle cx="165" cy="75" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="175" y="70" fill="#3b82f6" fontSize="8" fontWeight="bold">SHORT</text></g><g className="marker-target delay-5"><circle cx="240" cy="130" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="250" y="140" fill="#10b981" fontSize="9" fontWeight="bold">TP</text></g></svg>);
const PlayVisual_Sweep = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><line x1="0" y1="120" x2="300" y2="120" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" /><text x="295" y="115" fill="#38bdf8" fontSize="8" textAnchor="end" fontWeight="bold">OLD LOW / LIQ</text><path d="M20 80 L 60 100 L 100 115 L 130 135 L 150 125 L 180 80 L 250 40" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><circle cx="130" cy="135" r="15" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="0.5" className="delay-1 fade-in" style={{opacity:0, animation: 'fadeIn 1s forwards 1.5s'}} /><g className="marker-entry delay-3"><circle cx="165" cy="100" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="175" y="105" fill="#3b82f6" fontSize="8" fontWeight="bold">RECLAIM</text></g><g className="marker-target delay-5"><circle cx="250" cy="40" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="260" y="35" fill="#10b981" fontSize="9" fontWeight="bold">TP</text></g></svg>);
const PlayVisual_Compression = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><line x1="20" y="40" x2="200" y2="80" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" /><line x1="20" y1="140" x2="200" y2="90" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" /><path d="M20 50 L 50 130 L 90 60 L 130 110 L 160 80 L 190 95 L 220 30" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-3"><circle cx="190" cy="95" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="190" y="115" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">BREAK</text></g><g className="marker-target delay-5"><circle cx="220" cy="30" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="230" y="25" fill="#10b981" fontSize="9" fontWeight="bold">EXPANSION</text></g></svg>);
const PlayVisual_GapGo = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><rect x="20" y="100" width="40" height="40" fill="#64748b" fillOpacity="0.2" /><text x="40" y="150" fill="#64748b" fontSize="8" textAnchor="middle">PRIOR RANGE</text><rect x="60" y="60" width="40" height="40" fill="url(#volGradient)" opacity="0.5" /><text x="80" y="70" fill="#6366f1" fontSize="8" textAnchor="middle" fontWeight="bold">GAP</text><path d="M100 60 L 120 75 L 140 65 L 180 30 L 250 10" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="path-draw" /><g className="marker-entry delay-2"><circle cx="120" cy="75" r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" /><text x="120" y="90" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">DIP BUY</text></g><g className="marker-target delay-5"><circle cx="250" cy="10" r="6" fill="none" stroke="#10b981" strokeWidth="2" /><text x="240" y="20" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">GO</text></g></svg>);
const PlayVisual_Generic = () => ( <svg viewBox="0 0 300 160" className="w-full h-full bg-slate-950/50 rounded-lg"><AnimStyles /><CommonDefs /><rect width="100%" height="100%" fill="url(#gridPattern)" opacity="0.3" /><rect x="50" y="40" width="200" height="80" fill="#1e293b" rx="8" /><path d="M70 100 L 110 80 L 150 90 L 190 50" fill="none" stroke="#10b981" strokeWidth="3" className="path-draw" /><circle cx="110" cy="80" r="5" fill="#3b82f6" className="marker-entry delay-3" /><circle cx="190" cy="50" r="5" fill="#10b981" className="marker-target delay-5" /></svg>);

// --- HELPER ---
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

// --- LOGIC MAPPING ---
const getVisualForTitle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('opening range')) return null;
    if (t.includes('weekly') || t.includes('composite')) return PlayVisual_WeeklyTPO;
    if (t.includes('ib extreme') || t.includes('break play')) return PlayVisual_IBBreak;
    if (t.includes('bear') || t.includes('down') || t.includes('short')) return PlayVisual_TrendBear;
    if (t.includes('trend') || t.includes('drive') || t.includes('go-with')) return PlayVisual_TrendBull;
    if (t.includes('balance') || t.includes('range') || t.includes('rotational') || t.includes('fade') || t.includes('skew') || t.includes('p-day') || t.includes('b-day')) return PlayVisual_Balance;
    if (t.includes('trap') || t.includes('failed') || t.includes('fake') || t.includes('reject')) return PlayVisual_Trap; 
    if (t.includes('sweep') || t.includes('liquidity') || t.includes('stop') || t.includes('reclaim')) return PlayVisual_Sweep;
    if (t.includes('coil') || t.includes('compress') || t.includes('squeeze') || t.includes('inside')) return PlayVisual_Compression;
    if (t.includes('gap')) return PlayVisual_GapGo;
    return PlayVisual_Generic;
};

// ... (Playbook Parsing logic remains same) ...
const parsePlaybookMarkdown = (text: string) => {
    const sections = text.split(/^#{2,3}\s+/m).slice(1);
    return sections.map(section => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        const extractField = (header: string) => {
            const regex = new RegExp(`(?:\\*\\*|###)\\s*${header}.*?(?:\\n|:)(.*?)(?=(?:\\*\\*|###)|$)`, 'is');
            const match = content.match(regex);
            return match ? match[1].trim() : null;
        };
        const bias = extractField('Bias');
        const clues = extractField('Clues');
        const entryModel = extractField('Entry Model') || extractField('Entry');
        const stop = extractField('Stop') || extractField('Invalidation');
        const target = extractField('Target') || extractField('Targets');
        const caution = extractField('Caution') || extractField('Risk');
        const notes = extractField('Note') || extractField('Notes');
        const descMatch = content.match(/^[^*-]+/);
        const desc = descMatch ? descMatch[0].replace(/\n/g, ' ').trim() : "Execution Protocol";
        const genericRules = content.match(/^[-*]\s+(.+)$/gm)?.map(r => r.replace(/^[-*]\s+/, '').trim()) || [];
        return {
            id: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            title,
            desc,
            structured: { bias, clues, entryModel, stop, target, caution, notes },
            genericRules,
            visual: getVisualForTitle(title)
        };
    });
};

const PlaybookCard = ({ item, onClick }: { item: any, onClick: () => void }) => {
  const Visual = item.visual;
  return (
    <div onClick={onClick} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-indigo-500 transition-all group hover:bg-slate-800/80 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] cursor-pointer h-full flex flex-col relative overflow-hidden">
        {Visual ? (
            <div className="aspect-[2/1] bg-slate-950 rounded-xl mb-4 overflow-hidden relative border border-slate-800 group-hover:border-indigo-500/30 transition-colors shadow-inner">
                <div className="absolute inset-0 p-2 opacity-90 group-hover:opacity-100 transition-all duration-500"><Visual /></div>
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-blue-400"><MousePointerClick className="w-3 h-3"/> Entry</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-rose-400"><Ban className="w-3 h-3"/> Stop</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400"><Flag className="w-3 h-3"/> TP</div>
                </div>
            </div>
        ) : (
            <div className="aspect-[2/1] bg-slate-950 rounded-xl mb-4 flex items-center justify-center border border-slate-800 text-slate-700">
                <FileText className="w-8 h-8 opacity-20" />
            </div>
        )}
        <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-black uppercase text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-2">{item.title}</h3>
            {item.structured.bias && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${item.structured.bias.toLowerCase().includes('bull') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : item.structured.bias.toLowerCase().includes('bear') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {item.structured.bias.toUpperCase()}
                </span>
            )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-medium flex-1 line-clamp-3 mb-4">{item.structured.clues || item.desc}</p>
        <div className="mt-auto pt-3 border-t border-slate-800 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 group-hover:text-slate-300">
            <PlayCircle className="w-3 h-3 text-indigo-500" /><span>View Execution Rules</span>
            <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0 text-indigo-400" />
        </div>
    </div>
  );
};

// ... (Backtest functions runBacktest, extractLevels, etc. assumed present) ...
const extractLevels = (text: string) => {
    const extract = (str: string, pattern: RegExp) => {
        const match = str.match(pattern);
        if (match && match[1]) {
            const raw = match[1].replace(/,/g, '');
            return parseFloat(raw);
        }
        return null;
    };
    const parseBlock = (block: string) => ({
        entry: extract(block, /Entry Zone:\*\*.*?[\[\(]([\d,.]+)[\]\)]/i) || extract(block, /Entry Zone:\*\*.*?([\d,.]+)/i),
        stop: extract(block, /Risk Exit.*?[\[\(]([\d,.]+)[\]\)]/i) || extract(block, /Risk Exit.*?:.*?([\d,.]+)/i) || extract(block, /Stop.*?:.*?([\d,.]+)/i),
        tp1: extract(block, /Target 1.*?[\[\(]([\d,.]+)[\]\)]/i) || extract(block, /Target 1.*?:.*?([\d,.]+)/i),
        tp2: extract(block, /Target 2.*?[\[\(]([\d,.]+)[\]\)]/i) || extract(block, /Target 2.*?:.*?([\d,.]+)/i)
    });
    let primary = null;
    let hedge = null;
    if (text.includes('🥇 PRIMARY SETUP')) {
        const block = text.split('🥇 PRIMARY SETUP')[1].split('##')[0];
        const data = parseBlock(block);
        if (data.entry && (data.stop || data.tp1)) primary = data;
    }
    if (text.includes('🥈 HEDGE SETUP')) {
        const block = text.split('🥈 HEDGE SETUP')[1].split('##')[0];
        const data = parseBlock(block);
        if (data.entry && (data.stop || data.tp1)) hedge = data;
    }
    if (!primary) {
        const data = parseBlock(text);
        if (data.entry && data.stop) primary = data;
    }
    return { primary, hedge };
};

interface SimResult {
    result: string;
    entryTime: string;
    exitTime: string;
    exitPrice: number;
    maxFavorable: number;
    realizedPnL: number;
    realizedRR: number;
    status: string;
    beTriggered?: boolean;
}

const runBacktest = (setup: any, futureSnapshots: MarketSnapshot[]) => {
    if (!setup || !futureSnapshots.length) return null;
    const { entry, stop, tp1 } = setup;
    if (!entry || !stop || !tp1) return null;
    const isLong = tp1 > entry;
    const initialRisk = Math.abs(entry - stop);
    const safeRisk = initialRisk < 0.25 ? 1 : initialRisk;
    let fixed = { status: 'PENDING', result: 'NEUTRAL', exitPrice: 0, exitTime: '', entryTime: '', maxFavorable: 0, realizedPnL: 0, realizedRR: 0 };
    let smart = { status: 'PENDING', result: 'NEUTRAL', exitPrice: 0, exitTime: '', entryTime: '', maxFavorable: 0, realizedPnL: 0, realizedRR: 0, stopPrice: stop, beTriggered: false };
    let trail = { status: 'PENDING', result: 'NEUTRAL', exitPrice: 0, exitTime: '', entryTime: '', maxFavorable: 0, realizedPnL: 0, realizedRR: 0, stopPrice: stop, current5mHigh: -Infinity, current5mLow: Infinity, last5mPeriod: '' };
    const finalize = (state: any, exitP: number, time: string, reason: string) => {
        state.status = 'CLOSED';
        state.exitPrice = exitP;
        state.exitTime = time;
        state.result = reason;
        const diff = state.exitPrice - entry;
        state.realizedPnL = isLong ? diff : -diff;
        state.realizedRR = state.realizedPnL / safeRisk;
    };
    for (const snap of futureSnapshots) {
        const price = snap.input.intraday.ib.current_close;
        const time = snap.input.current_et_time;
        const [hh, mm] = time.split(':').map(Number);
        const current5mPeriod = `${hh}:${Math.floor(mm / 5)}`;
        const entryTriggered = (fixed.status === 'PENDING') && ((isLong && price <= entry * 1.0005 && price >= entry * 0.9995) || (isLong && price < entry) || (!isLong && price >= entry * 0.9995 && price <= entry * 1.0005) || (!isLong && price > entry));
        if (entryTriggered) {
            [fixed, smart, trail].forEach(s => { if (s.status === 'PENDING') { s.status = 'OPEN'; s.entryTime = time; } });
        }
        if (fixed.status === 'OPEN') {
            const diff = price - entry;
            const curPnL = isLong ? diff : -diff;
            fixed.maxFavorable = Math.max(fixed.maxFavorable, curPnL);
            smart.maxFavorable = Math.max(smart.maxFavorable, curPnL);
            trail.maxFavorable = Math.max(trail.maxFavorable, curPnL);
        }
        if (fixed.status === 'OPEN') {
            if ((isLong && price <= stop) || (!isLong && price >= stop)) { finalize(fixed, stop, time, 'LOSS'); } else if ((isLong && price >= tp1) || (!isLong && price <= tp1)) { finalize(fixed, tp1, time, 'WIN (TP1)'); }
        }
        if (smart.status === 'OPEN') {
            if ((isLong && price <= smart.stopPrice) || (!isLong && price >= smart.stopPrice)) { const res = Math.abs(smart.stopPrice - entry) < 0.5 ? 'BE (SCRATCH)' : 'LOSS'; finalize(smart, smart.stopPrice, time, res); } else if ((isLong && price >= tp1) || (!isLong && price <= tp1)) { finalize(smart, tp1, time, 'WIN (TP1)'); } else if (!smart.beTriggered) { const currentProfit = isLong ? price - entry : entry - price; if (currentProfit > 4.0) { smart.stopPrice = entry; smart.beTriggered = true; } }
        }
        if (trail.status === 'OPEN') {
            trail.current5mHigh = Math.max(trail.current5mHigh, price);
            trail.current5mLow = Math.min(trail.current5mLow, price);
            if ((isLong && price <= trail.stopPrice) || (!isLong && price >= trail.stopPrice)) { const pnl = isLong ? trail.stopPrice - entry : entry - trail.stopPrice; const label = pnl > 0 ? 'TRAIL WIN' : pnl > -0.5 && pnl < 0.5 ? 'TRAIL BE' : 'TRAIL LOSS'; finalize(trail, trail.stopPrice, time, label); } else if ((isLong && price >= tp1) || (!isLong && price <= tp1)) { finalize(trail, tp1, time, 'WIN (TP1)'); }
            if (trail.last5mPeriod && trail.last5mPeriod !== current5mPeriod) { if (isLong) { if (trail.current5mLow > trail.stopPrice) trail.stopPrice = trail.current5mLow; } else { if (trail.current5mHigh < trail.stopPrice) trail.stopPrice = trail.current5mHigh; } trail.current5mHigh = -Infinity; trail.current5mLow = Infinity; } trail.last5mPeriod = current5mPeriod;
        }
        if (fixed.status === 'CLOSED' && smart.status === 'CLOSED' && trail.status === 'CLOSED') break;
    }
    const eodPrice = futureSnapshots[futureSnapshots.length - 1].input.intraday.ib.current_close;
    const eodTime = futureSnapshots[futureSnapshots.length - 1].input.current_et_time;
    [fixed, smart, trail].forEach(s => { if (s.status === 'OPEN') { const diff = eodPrice - entry; const finalPnL = isLong ? diff : -diff; finalize(s, eodPrice, eodTime, finalPnL > 0 ? 'OPEN (PROFIT)' : 'OPEN (DRAWDOWN)'); } });
    return { fixed: fixed as SimResult, smart: smart as SimResult, trail: trail as SimResult, direction: isLong ? 'LONG' : 'SHORT', entryPrice: entry };
};

const StrategyComparisonRow = ({ label, data, icon: Icon }: any) => (
    <div className="grid grid-cols-4 gap-2 items-center text-[10px] font-mono border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
        <div className="col-span-1 flex items-center gap-1.5 text-slate-400 font-bold uppercase"><Icon className="w-3 h-3 opacity-70" />{label}</div>
        <div className={`col-span-1 font-black ${data.result.includes('WIN') || data.result.includes('PROFIT') ? 'text-emerald-400' : data.result.includes('BE') ? 'text-amber-400' : 'text-rose-400'}`}>{data.result}</div>
        <div className="col-span-1 text-right text-slate-300">{data.realizedPnL > 0 ? '+' : ''}{data.realizedPnL.toFixed(2)} pts</div>
        <div className="col-span-1 text-right font-black text-indigo-300">{data.realizedRR.toFixed(2)}R</div>
    </div>
);

const TradeIdea: React.FC<TradeIdeaProps> = ({ snapshots, currentSnapshot, isGlobalChatOpen, tpoAnalysisContent, sessionDate, snapshotTime }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Playbook Data State
  const [playbookSource, setPlaybookSource] = useState<string | null>(null);
  const [playbookItems, setPlaybookItems] = useState<any[]>([]);
  const [playbookStatus, setPlaybookStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [psychContent, setPsychContent] = useState<string>('');
  
  const [copied, setCopied] = useState(false);
  
  // Library UI State
  const [showPlaybookLibrary, setShowPlaybookLibrary] = useState(false);
  const [libraryView, setLibraryView] = useState<'visual' | 'source'>('visual');
  const [selectedPlay, setSelectedPlay] = useState<any>(null);

  // Backtest State
  const [isBacktestMode, setIsBacktestMode] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastContext, setLastContext] = useState<string>('');

  // Image Upload State
  const [userImage, setUserImage] = useState<{ data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlaybook = async () => {
    setPlaybookStatus('loading');
    try {
        const res = await fetch(`${PLAYBOOK_URL}?cb=${Date.now()}`);
        if (res.ok) {
            const text = await res.text();
            if (text.length > 50) {
                setPlaybookSource(text);
                const parsedItems = parsePlaybookMarkdown(text);
                setPlaybookItems(parsedItems);
                setPlaybookStatus('active');
            } else {
                setPlaybookStatus('error');
            }
        } else {
            setPlaybookStatus('error');
        }
    } catch (e) {
        setPlaybookStatus('error');
    }
  };

  useEffect(() => {
    fetchPlaybook();
  }, []);

  // Fetch Psychology Protocol
  useEffect(() => {
    fetch(`${PSYCH_URL}?cb=${Date.now()}`)
      .then(r => r.text())
      .then(t => setPsychContent(t))
      .catch(e => console.warn("TradeIdea: Psychology fetch failed", e));
  }, []);

  const historyPointInTime = useMemo(() => {
    if (!snapshots || !currentSnapshot) return [];
    const currentTime = currentSnapshot.input.current_et_time;
    return snapshots
        .filter(s => s.input.current_et_time <= currentTime)
        .sort((a, b) => a.input.current_et_time.localeCompare(b.input.current_et_time));
  }, [snapshots, currentSnapshot]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
            const base64 = await blobToBase64(file);
            setUserImage({ data: base64, mimeType: file.type });
        } catch (err) {
            console.error("Image load failed", err);
        }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateTradeIdeas = async () => {
    if (!historyPointInTime || historyPointInTime.length === 0) {
      setError("No data available for this timestamp.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');
    setCopied(false);
    setIsChatOpen(false); // Reset chat on new generation
    setBacktestResults(null);

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
        ${playbookSource ? playbookSource : "CRITICAL WARNING: NO PLAYBOOK SOURCE LOADED. RELY ON STANDARD AUCTION THEORY AND TPO STRUCTURE."}
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

        ---------------------------------------------------------
        🔍 TPO ANALYSIS GUIDELINES (FOR STRUCTURE):
        ${tpoAnalysisContent || "Standard TPO Principles Apply."}
        ---------------------------------------------------------

        PSYCHOLOGY PROTOCOL (TRADER SUPPORT):
        ${psychContent || "No Psychology Protocol Loaded."}
        ==================================================================================

        ${userImage ? "USER HAS PROVIDED A VISUAL CHART CONTEXT (ATTACHED IMAGE). INTEGRATE THIS VISUAL INTO YOUR ANALYSIS." : ""}

        TASK:
        Based on the "Playbook" rules (specifically reference the Playbook entry names if applicable, e.g. "Trend Day", "Balance Fade") and the "Full Session Telemetry", generate the Daily Trade Plan.
        
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
        - **Playbook Play:** (Name of play found in Playbook)
        - **Trigger Condition:** (Specific event)
        - **Entry Zone:** [Price]
        - **Risk Exit (Stop):** [Price]
        - **Target 1:** [Price]
        - **Target 2:** [Price]
        - **⚠️ Caution:** (Risk factors)

        ## 🥈 HEDGE SETUP (Counter-Trend)
        - **Playbook Play:** (Name of play found in Playbook)
        - **Logic:** (Reversal condition)
        - **Entry Zone:** [Price]
        - **Risk Exit (Stop):** [Price]
        - **Target 1:** [Price]
        - **Target 2:** [Price]
        - **⚠️ Caution:** (Risk factors)

        ## 🛡 Execution Nuance
        - (Specific advice)
      `;

      // Save context for Chat
      setLastContext(prompt);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let fullText = "";
      
      const contents = [];
      const parts: any[] = [{ text: prompt }];
      
      // Attach image if present
      if (userImage) {
          parts.push({
              inlineData: {
                  mimeType: userImage.mimeType,
                  data: userImage.data
              }
          });
      }
      contents.push({ role: 'user', parts });

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
            temperature: 0.4,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setReport(prev => prev + text);
        }
      }

      // --- SAVE TO JOURNAL ---
      if (fullText) {
          await appendJournalEntry(sessionDate, snapshotTime, "_main_trade_ideas", fullText);
      }

      // --- RUN BACKTEST IF ENABLED ---
      if (isBacktestMode && fullText) {
          const { primary, hedge } = extractLevels(fullText);
          const currentTime = lastInput.current_et_time;
          const futureSnapshots = snapshots.filter(s => s.input.current_et_time > currentTime).sort((a,b) => a.input.current_et_time.localeCompare(b.input.current_et_time));
          
          const primaryRes = primary ? runBacktest(primary, futureSnapshots) : null;
          const hedgeRes = hedge ? runBacktest(hedge, futureSnapshots) : null;
          
          setBacktestResults({ primary: primaryRes, hedge: hedgeRes });
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
      
      {/* Hidden Upload Input */}
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                <Lightbulb className="w-8 h-8 text-amber-400" />
            </div>
            <div className="min-w-0 overflow-hidden">
                <h2 className="text-base font-black uppercase tracking-widest text-slate-200 truncate">Trade Idea Generator</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                     <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                        TIME: {currentSnapshot?.input?.current_et_time}
                     </span>
                     {playbookStatus === 'loading' && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500 font-bold animate-pulse whitespace-nowrap"><Loader2 className="w-3 h-3 animate-spin" /> Linking Playbook...</span>}
                     {playbookStatus === 'active' && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold whitespace-nowrap"><Link2 className="w-3 h-3" /> Playbook Linked</span>}
                     {playbookStatus === 'error' && (
                        <div className="flex items-center gap-2">
                            <span title={`Failed to fetch: ${PLAYBOOK_URL}`} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 font-bold cursor-help whitespace-nowrap"><Unlink className="w-3 h-3" /> Playbook Unlinked</span>
                            <button onClick={fetchPlaybook} className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700" title="Retry Connection">
                                <RefreshCw className="w-3 h-3" />
                            </button>
                        </div>
                     )}
                     
                     <button onClick={() => setShowPlaybookLibrary(true)} className="ml-2 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors border border-indigo-500/30" title="Open Playbook Library">
                         <BookOpen className="w-3.5 h-3.5" />
                     </button>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
            {/* Image Upload Button */}
            {!loading && (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                        userImage 
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' 
                            : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                    title={userImage ? "Chart Attached" : "Upload Chart Screenshot"}
                >
                    {userImage ? <ImagePlus className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">
                        {userImage ? "Chart Ready" : "Add Chart"}
                    </span>
                    {userImage && (
                        <span onClick={(e) => { e.stopPropagation(); setUserImage(null); }} className="ml-1 p-1 hover:bg-sky-500/20 rounded-full">
                            <X className="w-3 h-3" />
                        </span>
                    )}
                </button>
            )}

            {/* Backtest Toggle */}
            {!loading && (
                <button 
                    onClick={() => setIsBacktestMode(!isBacktestMode)} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                        isBacktestMode 
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                            : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                    title="Run forward simulation on generated plan"
                >
                    <FlaskConical className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Backtest</span>
                </button>
            )}

            {/* Chat Button */}
            {!loading && report && (
                <button 
                    onClick={() => !isGlobalChatOpen && setIsChatOpen(!isChatOpen)}
                    disabled={isGlobalChatOpen}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                        isChatOpen 
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' 
                            : isGlobalChatOpen
                                ? 'opacity-50 cursor-not-allowed border-transparent text-slate-600 bg-slate-950/30'
                                : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-white hover:bg-slate-900'
                    }`}
                    title={isGlobalChatOpen ? "Disabled: Global Chat Active" : "Open Local Chat"}
                >
                    {isGlobalChatOpen ? <Ban className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Chat</span>
                </button>
            )}

            {/* Main Action */}
            {!loading && (
                <button onClick={generateTradeIdeas} className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] group transform hover:-translate-y-0.5 whitespace-nowrap ml-2">
                    <Lightbulb className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Generate Plan</span>
                </button>
            )}
        </div>
      </div>

      {/* CHAT PANEL */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title="Trade Idea Assistant"
        contextData={lastContext}
        initialReport={report}
        sessionDate={sessionDate}
        snapshotTime={snapshotTime}
      />

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
                                   <div>
                                       <h2 className="text-xl font-black uppercase text-indigo-400">{selectedPlay.title}</h2>
                                       {selectedPlay.structured.bias && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ml-2 ${selectedPlay.structured.bias.toLowerCase().includes('bull') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{selectedPlay.structured.bias}</span>}
                                   </div>
                               </div>
                               <button onClick={() => setSelectedPlay(null)} className="p-2 text-slate-500 hover:text-white"><X className="w-6 h-6"/></button>
                           </div>
                           <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
                               <div className="lg:w-5/12 flex flex-col gap-6">
                                   <div className="aspect-video bg-slate-900 rounded-2xl border border-slate-800 p-8 flex items-center justify-center shadow-2xl relative overflow-hidden">
                                        <div className="w-full h-full transform scale-110">
                                            {selectedPlay.visual ? <selectedPlay.visual /> : <Activity className="w-16 h-16 text-slate-800"/>}
                                        </div>
                                   </div>
                                   
                                   {/* Structured Details */}
                                   <div className="grid grid-cols-2 gap-3">
                                       <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                           <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase"><MousePointerClick className="w-3 h-3" /> Entry Model</div>
                                           <p className="text-sm text-slate-300 font-medium leading-snug">{selectedPlay.structured.entryModel || 'N/A'}</p>
                                       </div>
                                       <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                           <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-xs uppercase"><Ban className="w-3 h-3" /> Invalid (Stop)</div>
                                           <p className="text-sm text-slate-300 font-medium leading-snug">{selectedPlay.structured.stop || 'N/A'}</p>
                                       </div>
                                       <div className="col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                           <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs uppercase"><Flag className="w-3 h-3" /> Targets</div>
                                           <p className="text-sm text-slate-300 font-medium leading-snug">{selectedPlay.structured.target || 'N/A'}</p>
                                       </div>
                                   </div>
                               </div>

                               <div className="lg:w-7/12 space-y-6">
                                   <div>
                                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Strategy Concept</h3>
                                       <p className="text-base font-medium text-slate-200 leading-relaxed bg-slate-900/30 p-4 rounded-xl border border-slate-800">{selectedPlay.desc}</p>
                                   </div>

                                   {selectedPlay.structured.clues && (
                                       <div>
                                           <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2"><Info className="w-4 h-4"/> Key Clues</h3>
                                           <p className="text-sm text-slate-300 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 leading-relaxed">{selectedPlay.structured.clues}</p>
                                       </div>
                                   )}

                                   <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                                       <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                                           <CheckCircle2 className="w-4 h-4" /> Execution Checklist
                                       </h3>
                                       <ul className="space-y-3">
                                           {selectedPlay.genericRules.map((rule: string, i: number) => (
                                               <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                                                   <span className="text-indigo-500 font-bold select-none">{i+1}.</span>
                                                   <span>{rule}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   </div>

                                   {selectedPlay.structured.caution && (
                                       <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 flex gap-3">
                                           <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                                           <div>
                                               <h4 className="text-xs font-black uppercase text-rose-400 mb-1">Caution</h4>
                                               <p className="text-sm text-rose-200/80">{selectedPlay.structured.caution}</p>
                                           </div>
                                       </div>
                                   )}
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
                
                {/* BACKTEST RESULTS SECTION */}
                {backtestResults && (
                    <div className="mt-12 bg-slate-900/80 border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <FlaskConical className="w-5 h-5 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-widest text-purple-200">Simulation Report</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Primary Result */}
                            {backtestResults.primary ? (
                                <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 relative group hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-purple-400 transition-colors">Primary Setup</span>
                                         <div className={`flex items-center gap-2 text-xs font-bold ${backtestResults.primary.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                             <span>{backtestResults.primary.direction}</span>
                                             <span className="text-slate-500 text-[10px] font-mono">@ {backtestResults.primary.entryPrice.toFixed(2)}</span>
                                         </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="bg-slate-900 p-2 rounded-xl">
                                            {backtestResults.primary.fixed.result.includes('WIN') ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                            ) : backtestResults.primary.fixed.result.includes('LOSS') ? (
                                                <XCircle className="w-6 h-6 text-rose-400" />
                                            ) : (
                                                <History className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">{backtestResults.primary.fixed.entryTime || 'N/A'}</div>
                                            <div className="text-[10px] font-mono text-slate-500">Entry Trigger Time</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-2">
                                        <StrategyComparisonRow label="Fixed" data={backtestResults.primary.fixed} icon={Shield} />
                                        <StrategyComparisonRow label="Smart BE" data={backtestResults.primary.smart} icon={ArrowRightLeft} />
                                        <StrategyComparisonRow label="Trail 5m" data={backtestResults.primary.trail} icon={Footprints} />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-950/30 rounded-2xl p-5 border border-slate-800 border-dashed flex items-center justify-center text-slate-600 text-xs font-mono">
                                    No actionable Primary Setup detected.
                                </div>
                            )}

                            {/* Hedge Result */}
                            {backtestResults.hedge ? (
                                <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 relative group hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-purple-400 transition-colors">Hedge Setup</span>
                                         <div className={`flex items-center gap-2 text-xs font-bold ${backtestResults.hedge.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                             <span>{backtestResults.hedge.direction}</span>
                                             <span className="text-slate-500 text-[10px] font-mono">@ {backtestResults.hedge.entryPrice.toFixed(2)}</span>
                                         </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="bg-slate-900 p-2 rounded-xl">
                                            {backtestResults.hedge.fixed.result.includes('WIN') ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                            ) : backtestResults.hedge.fixed.result.includes('LOSS') ? (
                                                <XCircle className="w-6 h-6 text-rose-400" />
                                            ) : (
                                                <History className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">{backtestResults.hedge.fixed.entryTime || 'N/A'}</div>
                                            <div className="text-[10px] font-mono text-slate-500">Entry Trigger Time</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-2">
                                        <StrategyComparisonRow label="Fixed" data={backtestResults.hedge.fixed} icon={Shield} />
                                        <StrategyComparisonRow label="Smart BE" data={backtestResults.hedge.smart} icon={ArrowRightLeft} />
                                        <StrategyComparisonRow label="Trail 5m" data={backtestResults.hedge.trail} icon={Footprints} />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-950/30 rounded-2xl p-5 border border-slate-800 border-dashed flex items-center justify-center text-slate-600 text-xs font-mono">
                                    No actionable Hedge Setup detected.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-16 pt-10 border-t border-slate-800/50 flex items-center justify-center opacity-30"><Quote className="w-8 h-8 text-slate-500" /></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TradeIdea;
