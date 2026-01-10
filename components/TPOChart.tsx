
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Grid, ZoomIn, ZoomOut, AlertOctagon, BarChart2 } from 'lucide-react';

interface TPOChartProps {
  tpoProfile: {
    current_poc: number;
    current_vah: number;
    current_val: number;
    poor_high: boolean | number;
    poor_low: boolean | number;
    single_prints_above_vah: number;
    single_prints_below_val: number;
  };
  volumeProfile: {
    poc: number;
    vah: number;
    val: number;
    hvn_nodes: number[];
    lvn_nodes: number[];
  };
  history: any[];
  currentPrice: number;
  timeframe?: '30m' | '5m';
}

const TPOChart: React.FC<TPOChartProps> = ({ tpoProfile, volumeProfile, history, currentPrice, timeframe = '30m' }) => {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- TPO & VOLUME CALCULATION ENGINE ---
  const { tpoRows, minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (!history || history.length === 0) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

    const tickSize = 0.50; // ES Tick Size
    const tpoMap = new Map<number, Set<string>>();
    const volumeMap = new Map<number, number>();
    
    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;

    // Sort history by time to ensure proper delta volume calculation
    const sortedHistory = [...history].sort((a, b) => 
       (a.input?.current_et_time || '').localeCompare(b.input?.current_et_time || '')
    );

    let previousCumulativeVol = 0;

    // Helper: Map time to TPO Letter
    const getLetter = (timeStr: string) => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const minutesFromOpen = (hh * 60 + mm) - (9 * 60 + 30); // relative to 9:30
      
      if (minutesFromOpen < 0) return 'P'; // Pre-market

      let periodIndex = 0;
      if (timeframe === '5m') {
         periodIndex = Math.floor(minutesFromOpen / 5);
      } else {
         periodIndex = Math.floor(minutesFromOpen / 30);
      }
      
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      return letters[periodIndex] || '?';
    };

    sortedHistory.forEach(snap => {
      const time = snap.input?.current_et_time;
      if (!time) return;
      
      const letter = getLetter(time);
      const ib = snap.input?.intraday?.ib;
      if (!ib) return;

      const p1 = ib.current_open;
      const p2 = ib.current_close;
      
      const rangeHigh = Math.max(p1, p2);
      const rangeLow = Math.min(p1, p2);

      // Expand Global Range
      if (rangeHigh > maxP) maxP = rangeHigh;
      if (rangeLow < minP) minP = rangeLow;

      // --- Volume Distribution ---
      const currentCumulativeVol = ib.current_volume || 0;
      const snapshotVol = Math.max(0, currentCumulativeVol - previousCumulativeVol);
      previousCumulativeVol = currentCumulativeVol;

      // Determine ticks in range
      // We add +1 because the range includes both endpoints in our loop
      const tickCount = Math.floor((rangeHigh - rangeLow) / tickSize) + 1;
      const volPerTick = tickCount > 0 ? snapshotVol / tickCount : 0;

      // Bucket prices
      for (let p = rangeLow; p <= rangeHigh; p += tickSize) {
        const tickPrice = Math.round(p * 2) / 2;
        
        // TPO Letter
        if (!tpoMap.has(tickPrice)) {
            tpoMap.set(tickPrice, new Set());
        }
        tpoMap.get(tickPrice)?.add(letter);

        // Volume Profile
        const currentVol = volumeMap.get(tickPrice) || 0;
        const newVol = currentVol + volPerTick;
        volumeMap.set(tickPrice, newVol);
        if (newVol > maxVol) maxVol = newVol;
      }
    });

    if (minP === Infinity) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

    // Pad Range
    minP = Math.floor(minP) - 2;
    maxP = Math.ceil(maxP) + 2;

    // Convert Map to Sorted Rows
    const rows = [];
    for (let p = maxP; p >= minP; p -= tickSize) {
        const price = Math.round(p * 2) / 2;
        const lettersSet = tpoMap.get(price);
        const letterStr = lettersSet ? Array.from(lettersSet).sort().join('') : '';
        const volume = volumeMap.get(price) || 0;
        
        rows.push({ price, letters: letterStr, volume });
    }

    return { tpoRows: rows, minPrice: minP, maxPrice: maxP, maxVolume: maxVol };

  }, [history, timeframe]);

  // Auto-scroll
  useEffect(() => {
     if (scrollRef.current && tpoRows.length > 0) {
        const centerRatio = (maxPrice - currentPrice) / (maxPrice - minPrice);
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight * centerRatio - (scrollRef.current.clientHeight / 2);
     }
  }, [tpoRows, currentPrice, maxPrice, minPrice]);

  const rowHeight = 14 * zoom;
  const fontSize = 10 * zoom;
  const priceColWidth = 70 * zoom;

  const hasPoorHigh = tpoProfile?.poor_high === 1 || tpoProfile?.poor_high === true;
  const hasPoorLow = tpoProfile?.poor_low === 1 || tpoProfile?.poor_low === true;

  if (tpoRows.length === 0) {
      return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No TPO Data for Timeframe</div>;
  }

  return (
    <div className="h-full flex flex-col relative group">
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} className="p-1 hover:bg-slate-700 rounded text-slate-400"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-1 hover:bg-slate-700 rounded text-slate-400"><ZoomOut className="w-4 h-4" /></button>
        </div>

        {/* Header Info */}
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-10 flex justify-between items-start bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent">
             <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TPO Matrix</span>
             </div>
             <div className="flex gap-4">
                 <div className="text-right">
                     <span className="text-[9px] text-slate-500 font-bold block">VAH</span>
                     <span className="text-[10px] font-mono text-indigo-400">{tpoProfile?.current_vah?.toFixed(2)}</span>
                 </div>
                 <div className="text-right">
                     <span className="text-[9px] text-slate-500 font-bold block">POC</span>
                     <span className="text-[10px] font-mono text-amber-400">{tpoProfile?.current_poc?.toFixed(2)}</span>
                 </div>
                 <div className="text-right">
                     <span className="text-[9px] text-slate-500 font-bold block">VAL</span>
                     <span className="text-[10px] font-mono text-indigo-400">{tpoProfile?.current_val?.toFixed(2)}</span>
                 </div>
             </div>
        </div>

        {/* Scrollable Chart */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar pt-16 relative">
            {tpoRows.map((row) => {
                const isCurrent = Math.abs(row.price - currentPrice) < 0.25;
                const isPOC = Math.abs(row.price - tpoProfile?.current_poc) < 0.25;
                const isVAH = Math.abs(row.price - tpoProfile?.current_vah) < 0.25;
                const isVAL = Math.abs(row.price - tpoProfile?.current_val) < 0.25;
                
                // Volume Bar Calculation
                const volPercent = maxVolume > 0 ? (row.volume / maxVolume) * 100 : 0;

                const isSinglePrintZone = (tpoProfile?.single_prints_above_vah > 0 && row.price > tpoProfile.current_vah && row.letters.length === 1) ||
                                          (tpoProfile?.single_prints_below_val > 0 && row.price < tpoProfile.current_val && row.letters.length === 1);

                return (
                    <div 
                        key={row.price} 
                        className={`flex items-center hover:bg-slate-800/30 transition-colors relative ${
                            isCurrent ? 'bg-rose-500/10' : ''
                        }`}
                        style={{ height: `${rowHeight}px` }}
                    >
                        {/* Price Column */}
                        <div 
                            className={`text-right pr-3 shrink-0 font-mono border-r border-slate-800 flex items-center justify-end gap-2 relative z-10 bg-slate-950/20 backdrop-blur-[1px]
                                ${isCurrent ? 'text-rose-400 font-bold' : isPOC ? 'text-amber-400 font-bold' : 'text-slate-500'}
                            `}
                            style={{ fontSize: `${fontSize}px`, width: `${priceColWidth}px` }}
                        >
                            {isVAH && <span className="text-indigo-500 font-bold mr-1" style={{ fontSize: `${fontSize * 0.8}px` }}>VAH</span>}
                            {isVAL && <span className="text-indigo-500 font-bold mr-1" style={{ fontSize: `${fontSize * 0.8}px` }}>VAL</span>}
                            {row.price.toFixed(2)}
                        </div>

                        {/* Letters & Volume Column */}
                        <div className="flex-1 flex items-center px-2 relative font-mono tracking-widest leading-none h-full">
                            {/* Volume Background Bar */}
                            <div 
                                className="absolute left-0 top-0.5 bottom-0.5 bg-indigo-500/10 rounded-r-sm transition-all duration-500 border-r border-indigo-500/20"
                                style={{ width: `${volPercent}%` }}
                            />
                            
                            {/* POC Line */}
                            {isPOC && <div className="absolute left-0 w-full h-px bg-amber-500/30 top-1/2 -translate-y-1/2 z-0"></div>}
                            
                            {/* Letters */}
                            <span 
                                className={`relative z-10
                                    ${isPOC ? 'text-amber-400 font-black' : isSinglePrintZone ? 'text-pink-400' : 'text-slate-400'}
                                    ${isCurrent ? 'text-rose-400' : ''}
                                `}
                                style={{ fontSize: `${fontSize}px` }}
                            >
                                {row.letters}
                            </span>

                            {/* Poor High/Low Indicators */}
                            {row.price === maxPrice && hasPoorHigh && (
                                <div className="ml-2 flex items-center gap-1 font-black uppercase text-rose-500 bg-rose-500/10 px-1 rounded border border-rose-500/20 relative z-10"
                                     style={{ fontSize: `${fontSize * 0.8}px` }}>
                                    <AlertOctagon style={{ width: fontSize, height: fontSize }} /> Poor High
                                </div>
                            )}
                             {row.price === minPrice && hasPoorLow && (
                                <div className="ml-2 flex items-center gap-1 font-black uppercase text-rose-500 bg-rose-500/10 px-1 rounded border border-rose-500/20 relative z-10"
                                     style={{ fontSize: `${fontSize * 0.8}px` }}>
                                    <AlertOctagon style={{ width: fontSize, height: fontSize }} /> Poor Low
                                </div>
                            )}
                             {isSinglePrintZone && (
                                <span className="ml-2 font-bold text-pink-500/50 uppercase whitespace-nowrap relative z-10"
                                      style={{ fontSize: `${fontSize * 0.7}px` }}>
                                    Single Print
                                </span>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default TPOChart;
