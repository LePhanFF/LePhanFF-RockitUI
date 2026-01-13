
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Grid, ZoomIn, ZoomOut, AlertOctagon, Layers, LocateFixed } from 'lucide-react';

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
  ibLevels?: {
    high: number;
    low: number;
  };
  history: any[];
  currentPrice: number;
  timeframe?: '30m' | '5m';
}

const TPOChart: React.FC<TPOChartProps> = ({ tpoProfile, volumeProfile, ibLevels, history, currentPrice, timeframe = '30m' }) => {
  const [zoom, setZoom] = useState(1);
  const [tickSize, setTickSize] = useState(0.5); // Aggregation Level
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- TPO & VOLUME CALCULATION ENGINE ---
  const { tpoRows, minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (!history || history.length === 0) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

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

      // Determine Buckets based on selected tickSize
      // We floor to the nearest tickSize grid
      const startBucket = Math.floor(rangeLow / tickSize) * tickSize;
      const endBucket = Math.floor(rangeHigh / tickSize) * tickSize;
      
      // Calculate how many buckets this candle touches
      // +1 because if start==end, we still touch 1 bucket
      const numBuckets = Math.round((endBucket - startBucket) / tickSize) + 1;
      const volPerBucket = numBuckets > 0 ? snapshotVol / numBuckets : 0;

      // Fill Buckets
      for (let p = startBucket; p <= endBucket + (tickSize/10); p += tickSize) { // Small buffer for float precision
        const bucketPrice = parseFloat(p.toFixed(2));
        
        // TPO Letter
        if (!tpoMap.has(bucketPrice)) {
            tpoMap.set(bucketPrice, new Set());
        }
        tpoMap.get(bucketPrice)?.add(letter);

        // Volume Profile
        const currentVol = volumeMap.get(bucketPrice) || 0;
        const newVol = currentVol + volPerBucket;
        volumeMap.set(bucketPrice, newVol);
        if (newVol > maxVol) maxVol = newVol;
      }
    });

    if (minP === Infinity) return { tpoRows: [], minPrice: 0, maxPrice: 0, maxVolume: 0 };

    // Pad Range to include IB levels if they exist
    if (ibLevels?.high) maxP = Math.max(maxP, ibLevels.high);
    if (ibLevels?.low) minP = Math.min(minP, ibLevels.low);

    // Snap Global Range to Grid
    minP = Math.floor(minP / tickSize) * tickSize;
    maxP = Math.ceil(maxP / tickSize) * tickSize;

    // Add padding buckets (2 rows above/below)
    minP -= (tickSize * 2);
    maxP += (tickSize * 2);

    // Convert Map to Sorted Rows
    const rows = [];
    // Iterate high to low
    for (let p = maxP; p >= minP; p -= tickSize) {
        const price = parseFloat(p.toFixed(2));
        const lettersSet = tpoMap.get(price);
        const letterStr = lettersSet ? Array.from(lettersSet).sort().join('') : '';
        const volume = volumeMap.get(price) || 0;
        
        // Only push rows that make sense (within reasonable bounds or have data)
        // For visual continuity we push all within range
        rows.push({ price, letters: letterStr, volume });
    }

    return { tpoRows: rows, minPrice: minP, maxPrice: maxP, maxVolume: maxVol };

  }, [history, timeframe, ibLevels, tickSize]); // Re-run when tickSize changes

  // Auto-scroll logic
  useEffect(() => {
     if (autoScroll && scrollRef.current && tpoRows.length > 0) {
        const centerRatio = (maxPrice - currentPrice) / (maxPrice - minPrice);
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight * centerRatio - (scrollRef.current.clientHeight / 2);
     }
  }, [tpoRows, currentPrice, maxPrice, minPrice, tickSize, autoScroll]);

  const rowHeight = 14 * zoom;
  const fontSize = 10 * zoom;
  const priceColWidth = 70 * zoom; 

  const hasPoorHigh = tpoProfile?.poor_high === 1 || tpoProfile?.poor_high === true;
  const hasPoorLow = tpoProfile?.poor_low === 1 || tpoProfile?.poor_low === true;

  if (tpoRows.length === 0) {
      return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No TPO Data for Timeframe</div>;
  }

  // Helper to check if a level is inside a bucket
  // Bucket [price, price + tickSize)
  const isLevelInRow = (rowPrice: number, level: number | undefined) => {
      if (level === undefined || level === null) return false;
      return level >= rowPrice && level < (rowPrice + tickSize - 0.001);
  };

  return (
    <div className="h-full flex flex-col relative group">
        {/* Zoom & Recenter Controls - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 bg-slate-900/90 p-1.5 rounded-lg border border-slate-700 backdrop-blur-md shadow-2xl opacity-50 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setAutoScroll(true); }} className={`p-2 rounded transition-colors ${autoScroll ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300 hover:bg-slate-700'}`} title="Auto-Scroll / Recenter">
                <LocateFixed className="w-4 h-4" />
            </button>
            <div className="h-px bg-slate-700/50 w-full" />
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
        </div>
        
        {/* Aggregation Slider - Top Right */}
        <div className="absolute top-16 right-4 z-40 flex items-center gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-700 backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 border-r border-slate-700 pr-3">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <div className="flex flex-col leading-none">
                    <span className="text-[8px] text-slate-500">BLOCK SIZE</span>
                    <span className="text-indigo-300">{tickSize.toFixed(1)} pts</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-[8px] font-mono text-slate-600">0.5</span>
                 <input 
                    type="range"
                    min="0.5"
                    max="25"
                    step="0.5"
                    value={tickSize}
                    onChange={(e) => setTickSize(parseFloat(e.target.value))}
                    className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                 />
                 <span className="text-[8px] font-mono text-slate-600">25</span>
            </div>
        </div>

        {/* Header Info - Clean layout */}
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-20 flex justify-between items-start bg-gradient-to-b from-slate-950 via-slate-900/90 to-transparent pb-8">
             <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TPO Matrix</span>
             </div>
             <div className="flex gap-4 bg-slate-950/50 p-2 rounded-xl backdrop-blur-sm border border-slate-800/50 shadow-lg">
                 <div className="text-right">
                     <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">VAH</span>
                     <span className="text-[10px] font-mono text-indigo-400 font-bold">{tpoProfile?.current_vah?.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-full bg-slate-800" />
                 <div className="text-right">
                     <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">POC</span>
                     <span className="text-[10px] font-mono text-amber-400 font-bold">{tpoProfile?.current_poc?.toFixed(2)}</span>
                 </div>
                 <div className="w-px h-full bg-slate-800" />
                 <div className="text-right">
                     <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">VAL</span>
                     <span className="text-[10px] font-mono text-indigo-400 font-bold">{tpoProfile?.current_val?.toFixed(2)}</span>
                 </div>
             </div>
        </div>

        {/* Scrollable Chart */}
        <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto custom-scrollbar pt-20 relative"
            onWheel={() => setAutoScroll(false)}
            onTouchMove={() => setAutoScroll(false)}
        >
            {tpoRows.map((row) => {
                const isCurrent = isLevelInRow(row.price, currentPrice);
                const isTpoPOC = isLevelInRow(row.price, tpoProfile?.current_poc);
                const isDPOC = isLevelInRow(row.price, volumeProfile?.poc);
                
                const isVAH = isLevelInRow(row.price, tpoProfile?.current_vah);
                const isVAL = isLevelInRow(row.price, tpoProfile?.current_val);
                
                // Value Area shading
                const inValueArea = row.price <= (tpoProfile?.current_vah || 0) && row.price >= (tpoProfile?.current_val || 0);

                const isIBH = isLevelInRow(row.price, ibLevels?.high);
                const isIBL = isLevelInRow(row.price, ibLevels?.low);
                
                // Volume Bar Calculation
                const volPercent = maxVolume > 0 ? (row.volume / maxVolume) * 100 : 0;

                const isSinglePrintZone = (tpoProfile?.single_prints_above_vah > 0 && row.price > tpoProfile.current_vah && row.letters.length === 1) ||
                                          (tpoProfile?.single_prints_below_val > 0 && row.price < tpoProfile.current_val && row.letters.length === 1);

                return (
                    <div 
                        key={row.price} 
                        className={`flex items-center hover:bg-slate-800/30 transition-colors relative group
                            ${isCurrent ? 'bg-rose-500/10' : inValueArea ? 'bg-indigo-500/5' : ''}
                        `}
                        style={{ height: `${rowHeight}px` }}
                    >
                        {/* Price Column */}
                        <div 
                            className={`text-right pr-3 shrink-0 font-mono border-r border-slate-800 flex items-center justify-end gap-2 relative z-20 bg-slate-950/20 backdrop-blur-[1px]
                                ${isCurrent ? 'text-rose-400 font-bold' : isTpoPOC ? 'text-amber-400 font-bold' : isDPOC ? 'text-purple-400 font-bold' : 'text-slate-500'}
                            `}
                            style={{ fontSize: `${fontSize}px`, width: `${priceColWidth}px` }}
                        >
                            {row.price.toFixed(2)}
                        </div>

                        {/* Letters & Volume Column */}
                        <div className="flex-1 flex items-center relative font-mono tracking-widest leading-none h-full overflow-hidden">
                            
                            {/* Volume Background Bar */}
                            <div 
                                className="absolute left-0 top-0.5 bottom-0.5 bg-indigo-500/10 rounded-r-sm transition-all duration-500 border-r border-indigo-500/20 z-0"
                                style={{ width: `${volPercent}%` }}
                            />
                            
                            {/* VISIBLE LABELS (Moved inside the chart area) */}
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex gap-1 pointer-events-none">
                                {isIBH && <span className="text-[8px] font-black bg-orange-500 text-slate-950 px-1 rounded shadow-lg border border-orange-400/50">IBH</span>}
                                {isIBL && <span className="text-[8px] font-black bg-orange-500 text-slate-950 px-1 rounded shadow-lg border border-orange-400/50">IBL</span>}
                                {isVAH && <span className="text-[8px] font-black bg-indigo-500 text-white px-1 rounded shadow-lg border border-indigo-400/50">VAH</span>}
                                {isVAL && <span className="text-[8px] font-black bg-indigo-500 text-white px-1 rounded shadow-lg border border-indigo-400/50">VAL</span>}
                                {isDPOC && !isTpoPOC && <span className="text-[8px] font-black bg-purple-500 text-white px-1 rounded shadow-lg border border-purple-400/50">DPOC</span>}
                                {isTpoPOC && <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded shadow-lg border border-amber-400/50">POC</span>}
                            </div>

                            {/* LINES (Enhanced Visibility) */}
                            {isTpoPOC && <div className="absolute left-0 w-full h-[2px] bg-amber-500 top-1/2 -translate-y-1/2 z-10 opacity-60"></div>}
                            {isDPOC && !isTpoPOC && <div className="absolute left-0 w-full h-[2px] bg-purple-500 top-1/2 -translate-y-1/2 z-10 opacity-50"></div>}
                            {(isIBH || isIBL) && <div className="absolute left-0 w-full h-[2px] border-t-2 border-dashed border-orange-500 top-1/2 -translate-y-1/2 z-10 opacity-60"></div>}
                            {isVAH && <div className="absolute left-0 w-full h-[1px] bg-indigo-500 top-0 z-10 opacity-30"></div>}
                            {isVAL && <div className="absolute left-0 w-full h-[1px] bg-indigo-500 bottom-0 z-10 opacity-30"></div>}
                            
                            {/* Letters */}
                            <span 
                                className={`relative z-20 pl-2
                                    ${isTpoPOC ? 'text-amber-400 font-black' : isDPOC ? 'text-purple-400 font-bold' : isSinglePrintZone ? 'text-pink-400' : 'text-slate-400'}
                                    ${isCurrent ? 'text-rose-400' : ''}
                                `}
                                style={{ fontSize: `${fontSize}px`, marginLeft: (isIBH || isIBL || isVAH || isVAL || isDPOC || isTpoPOC) ? '30px' : '0px' }} // Shift text if label exists
                            >
                                {row.letters}
                            </span>

                            {/* Poor High/Low Indicators */}
                            {row.price === maxPrice && hasPoorHigh && (
                                <div className="ml-2 flex items-center gap-1 font-black uppercase text-rose-500 bg-rose-500/10 px-1 rounded border border-rose-500/20 relative z-20"
                                     style={{ fontSize: `${fontSize * 0.8}px` }}>
                                    <AlertOctagon style={{ width: fontSize, height: fontSize }} /> Poor High
                                </div>
                            )}
                             {row.price === minPrice && hasPoorLow && (
                                <div className="ml-2 flex items-center gap-1 font-black uppercase text-rose-500 bg-rose-500/10 px-1 rounded border border-rose-500/20 relative z-20"
                                     style={{ fontSize: `${fontSize * 0.8}px` }}>
                                    <AlertOctagon style={{ width: fontSize, height: fontSize }} /> Poor Low
                                </div>
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
