
import React, { useState } from 'react';
import { Shield, Activity, Move, Zap, Copy, ClipboardCheck } from 'lucide-react';

interface IntradayTabProps {
  intraday: any;
  time: string;
}

const IntradayTab: React.FC<IntradayTabProps> = ({ intraday, time }) => {
  const [copied, setCopied] = useState(false);
  const ib = intraday?.ib;
  const wicks = intraday?.wick_parade;
  const fvgs = intraday?.fvg_detection;

  const formatNum = (val: any) => typeof val === 'number' ? val.toFixed(2) : '0.00';
  const formatVol = (val: any) => typeof val === 'number' ? val.toLocaleString() : '0';

  const handleCopy = () => {
    const activeFvgs = [
        ...(fvgs?.['1h_fvg'] || []),
        ...(fvgs?.['15min_fvg'] || []),
        ...(fvgs?.['5min_fvg'] || [])
    ].map((f: any) => `[${f.bottom}-${f.top} ${f.type}]`).join(', ') || 'None';

    const text = `
**Intraday Stats - ${time}**

* **Initial Balance:**
  - High: ${formatNum(ib?.ib_high)}
  - Low: ${formatNum(ib?.ib_low)}
  - Status: ${ib?.ib_status}

* **Context:**
  - Vs IB: ${ib?.price_vs_ib}
  - Vs VWAP: ${ib?.price_vs_vwap}
  - EMA20: ${formatNum(ib?.ema20)} | EMA50: ${formatNum(ib?.ema50)}

* **Technicals:**
  - RSI: ${formatNum(ib?.rsi14)}
  - ATR: ${formatNum(ib?.atr14)}
  - Volume: ${formatVol(ib?.current_volume)}

* **Wick Parade:**
  - Bull: ${wicks?.bullish_wick_parade_count}
  - Bear: ${wicks?.bearish_wick_parade_count}

* **Active FVGs:** ${activeFvgs}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-4 relative">
        <button 
            onClick={handleCopy}
            className={`absolute -top-2 right-0 p-1.5 rounded-lg transition-all ${
                copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
            title="Copy Intraday Data"
        >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden mt-2">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-800/50 pb-3">
            <Shield className="w-5 h-5 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initial Balance</span>
            </div>
            <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB High</span>
                <span className="text-base font-mono font-black text-white">{formatNum(ib?.ib_high)}</span>
                </div>
                <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB Low</span>
                <span className="text-base font-mono font-black text-white">{formatNum(ib?.ib_low)}</span>
                </div>
                <div>
                   <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB Range</span>
                   <span className="text-sm font-mono font-bold text-slate-300">{formatNum(ib?.ib_range)}</span>
                </div>
                 <div>
                   <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IB Mid</span>
                   <span className="text-sm font-mono font-bold text-slate-300">{formatNum(ib?.ib_mid)}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Status</span>
                    <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{ib?.ib_status}</span>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Technicals</span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold">RSI (14)</span>
                    <span className={`text-sm font-mono font-black ${Number(ib?.rsi14) > 70 ? 'text-rose-400' : Number(ib?.rsi14) < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>{formatNum(ib?.rsi14)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold">ATR (14)</span>
                    <span className="text-sm font-mono font-bold text-slate-300">{formatNum(ib?.atr14)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold">Volume</span>
                    <span className="text-sm font-mono font-bold text-slate-300">{formatVol(ib?.current_volume)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-bold">VWAP</span>
                    <span className="text-sm font-mono font-bold text-amber-400">{formatNum(ib?.current_vwap)}</span>
                </div>
            </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                <div className="flex items-center gap-2 mb-4">
                <Move className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Context</span>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                        <span className="text-[10px] text-slate-500 font-bold">Price vs IB</span>
                        <span className="text-[9px] font-black uppercase text-indigo-300">{ib?.price_vs_ib?.replace(/_/g, ' ')}</span>
                    </div>
                     <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                        <span className="text-[10px] text-slate-500 font-bold">Price vs VWAP</span>
                        <span className={`text-[9px] font-black uppercase ${ib?.price_vs_vwap === 'above' ? 'text-emerald-400' : 'text-rose-400'}`}>{ib?.price_vs_vwap}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-slate-950/30 rounded p-1">
                            <span className="text-[8px] text-slate-600 block">EMA 20</span>
                            <span className="text-[9px] font-mono text-cyan-400">{formatNum(ib?.ema20)}</span>
                        </div>
                        <div className="text-center bg-slate-950/30 rounded p-1">
                            <span className="text-[8px] text-slate-600 block">EMA 50</span>
                            <span className="text-[9px] font-mono text-blue-400">{formatNum(ib?.ema50)}</span>
                        </div>
                        <div className="text-center bg-slate-950/30 rounded p-1">
                            <span className="text-[8px] text-slate-600 block">EMA 200</span>
                            <span className="text-[9px] font-mono text-violet-400">{formatNum(ib?.ema200)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {wicks && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Wick Parade ({wicks.window_minutes || 60}m)</span>
                <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex items-center gap-6 mb-5">
                <div className="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-600 mb-1">Bullish</span>
                    <span className="text-3xl font-black text-emerald-400">{wicks.bullish_wick_parade_count}</span>
                </div>
                <div className="flex-1 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase text-rose-600 mb-1">Bearish</span>
                    <span className="text-3xl font-black text-rose-400">{wicks.bearish_wick_parade_count}</span>
                </div>
            </div>
        </div>
        )}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Active FVGs</span>
            </div>
            <div className="space-y-2">
            {['1h_fvg', '15min_fvg', '5min_fvg'].map((key) => {
                    const list = (fvgs as any)?.[key] || [];
                    return (
                        <div key={key} className="flex items-start gap-3 border-b border-slate-800/50 pb-2 last:border-0">
                        <span className="text-[10px] font-mono text-slate-500 w-12 shrink-0">{key.replace('_fvg', '').toUpperCase()}</span>
                        <div className="flex-1 flex flex-wrap gap-1">
                            {list.length > 0 ? list.map((f: any, i: number) => (
                                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${f.type === 'bullish' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                    {f.bottom}-{f.top}
                                </span>
                            )) : <span className="text-[9px] text-slate-700 italic">None</span>}
                        </div>
                        </div>
                    );
            })}
            </div>
        </div>
    </div>
  );
};

export default IntradayTab;
