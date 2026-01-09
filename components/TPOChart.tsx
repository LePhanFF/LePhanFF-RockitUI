
import React, { useState, useMemo, useRef } from 'react';
import { Grid, Info, AlertTriangle, ArrowUpFromLine, ArrowDownFromLine } from 'lucide-react';

interface TPOChartProps {
  tpoProfile: {
    current_poc: number;
    current_vah: number;
    current_val: number;
    tpo_shape: string;
    poor_high: number; // 0 or 1
    poor_low: number; // 0 or 1
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
  sessionHigh: number;
  sessionLow: number;
  currentPrice: number;
  currentTime: string;
}

const TPOChart: React.FC<TPOChartProps> = ({ tpoProfile, volumeProfile, sessionHigh, sessionLow, currentPrice, currentTime }) => {
  const [timeframe, setTimeframe] = useState<'30m' | '5m'>('30m');
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate ticks
  const tickSize = 0.5; // Every 2 ticks assuming ES roughly
  const minPrice = Math.floor(sessionLow / 10) * 10;
  const maxPrice = Math.ceil(sessionHigh / 10) * 10;
  
  const ticks = useMemo(() => {
    const t = [];
    for (let p = maxPrice; p >= minPrice; p -= tickSize) {
      t.push(p);
    }
    return t;
  }, [maxPrice, minPrice]);

  // Determine TPO Period Index from Time
  // 09:30 = Index 0 (A)
  const currentPeriodIndex = useMemo(() => {
    if (!currentTime) return 13; // Default to 'M' if missing
    const [hh, mm] = currentTime.split(':').map(Number);
    const totalMinutes = hh * 60 + mm;
    const startMinutes = 9 * 60 + 30; // 09:30
    
    // Minutes elapsed since open
    const diff = totalMinutes - startMinutes;
    if (diff < 0) return 0;
    
    // 30 min periods
    return Math.floor(diff / 30);
  }, [currentTime]);

  const getHeatmapColor = (periodIndex: number, isPOC: boolean, isVA: boolean) => {
    // Current Period (Active Auction)
    if (periodIndex === currentPeriodIndex) {
        return 'text-amber-300 font-black brightness-125 animate-pulse';
    }
    
    // Recent Past (Last 2 periods)
    if (periodIndex >= Math.max(0, currentPeriodIndex - 2)) {
        return 'text-orange-400 font-bold opacity-100';
    }

    // Early Morning (establishing)
    if (periodIndex < 4) {
        return 'text-slate-500 font-bold opacity-70';
    }

    // Mid Day
    return 'text-indigo-400/80 font-bold';
  };

  // Simulate TPO Data distribution based on POC/VA AND Time Constraint
  // Returns an array of objects { char: string, period: number }
  const getTPORow = (price: number) => {
    // Distance from POC
    const dist = Math.abs(price - tpoProfile.current_poc);
    // Ideal max width at POC (simulation of volume accumulation)
    let idealWidth = Math.max(1, 26 - (dist * 0.8));
    
    // Adjust for shape
    if (tpoProfile.tpo_shape === 'p_shape' && price > tpoProfile.current_poc) idealWidth += 2;
    if (tpoProfile.tpo_shape === 'b_shape' && price < tpoProfile.current_poc) idealWidth += 2;
    
    // IMPORTANT: The row width cannot physically exceed the number of periods that have occurred
    // We add 1 because Period 0 (A) has width 1.
    // However, price can visit a level multiple times in one period, but TPO counts 1 letter per period.
    // So max distinct TPO blocks = number of periods passed + 1
    const timeConstrainedMax = currentPeriodIndex + 1;

    // Simulation logic:
    // If we are early in the day (e.g. Period B, index 1), max width is 2.
    // We clamp the ideal width to the time constraint.
    let width = Math.min(idealWidth, timeConstrainedMax);
    
    // Ensure randomness doesn't break the constraint
    width = Math.max(1, Math.floor(width + (Math.random() * 2 - 1)));
    width = Math.min(width, timeConstrainedMax);
    
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const blocks = [];
    
    // Generate blocks
    // To show "Recent Acceptance", we want the letters to reflect distinct time periods.
    // In a real profile, prints are specific. Here we simulate.
    // If width is 3 and current period is 5 (F): 
    // We could have prints A, C, F.
    // To emphasize recent acceptance, we'll bias towards including the current period index 
    // if the ideal width was high (meaning high volume/activity).
    
    // Logic: Fill from latest backwards
    for(let i=0; i<width; i++) {
        // We simulate that the 'latest' print is the current period, 
        // and previous prints were recent.
        // This visualizes the "recent acceptance" user asked for.
        // We offset by 'i' to go back in time.
        
        let period = currentPeriodIndex - i;
        if (period < 0) period = 0; // Cap at A

        blocks.unshift({ 
            char: alphabet[period % alphabet.length], 
            period: period 
        });
    }
    
    // Volume simulation (HVN check)
    const isHVN = volumeProfile.hvn_nodes.some(n => Math.abs(n - price) < 1);
    const isLVN = volumeProfile.lvn_nodes.some(n => Math.abs(n - price) < 1);
    let volWidth = width * 10;
    if (isHVN) volWidth *= 1.5;
    if (isLVN) volWidth *= 0.4;

    return { blocks, volWidth, rawWidth: width };
  };

  const handleAutoFit = () => {
    if (scrollContainerRef.current && ticks.length > 0) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      // Base height is 16px now. 
      const fittedZoom = (containerHeight - 32) / (ticks.length * 16); 
      setZoom(Math.max(0.1, Math.min(3, fittedZoom)));
    }
  };

  const rowHeight = 16 * zoom; // Increased base height
  const fontSize = Math.max(10, 13 * zoom); // Increased base font size
  const priceFontSize = Math.max(10, 12 * zoom);

  return (
    <div className="h-full bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 flex flex-col relative overflow-hidden group">
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between mb-4 z-10 relative shrink-0">
            <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">TPO Matrix ({currentTime})</span>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
                    <button onClick={() => setTimeframe('5m')} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${timeframe === '5m' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>5M</button>
                    <button onClick={() => setTimeframe('30m')} className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${timeframe === '30m' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>30M</button>
                </div>
            </div>
        </div>

        {/* LEGEND BAR */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 px-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0 shadow-lg">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">POC</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500/20 border border-indigo-500 rounded"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Value Area (70%)</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Price ({currentPrice.toFixed(2)})</span>
            </div>
            <div className="w-px h-4 bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-500">ABC...</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Past</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-amber-300 animate-pulse">XYZ...</span>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Active (30m)</span>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 relative gap-2">
            {/* Y-Axis Zoom Control (Sidebar) */}
            <div className="w-8 flex flex-col items-center justify-center py-2 bg-slate-950/50 rounded-lg border border-slate-800/50 shrink-0">
                <div className="flex-1 flex items-center justify-center py-2 w-full h-full">
                     <input 
                       type="range" 
                       min="0.3" 
                       max="3.5" 
                       step="0.1" 
                       value={zoom} 
                       onChange={(e) => setZoom(parseFloat(e.target.value))}
                       onDoubleClick={handleAutoFit}
                       className="h-full w-1.5 appearance-none bg-slate-700 rounded-full cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                       style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                       title="Zoom Price Axis (Double-click to Auto Fit)"
                     />
                </div>
            </div>

            {/* Chart Scroll Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-950/30 rounded-xl border border-slate-800/50">
                <div className="w-full flex flex-col py-6 min-h-full px-2">
                    {ticks.map((price, i) => {
                        const { blocks, volWidth, rawWidth } = getTPORow(price);
                        
                        // --- Logic for Flags ---
                        const isPOC = Math.abs(price - tpoProfile.current_poc) < tickSize;
                        const isVA = price <= tpoProfile.current_vah && price >= tpoProfile.current_val;
                        const isCurrent = Math.abs(price - currentPrice) < tickSize;
                        
                        // Structure Detection
                        const isSessionHigh = Math.abs(price - sessionHigh) < tickSize * 2;
                        const isSessionLow = Math.abs(price - sessionLow) < tickSize * 2;
                        
                        const isPoorHigh = isSessionHigh && tpoProfile.poor_high === 1;
                        const isPoorLow = isSessionLow && tpoProfile.poor_low === 1;
                        
                        // Tails (Excess) - Usually single prints at extremes
                        const isSellingTail = isSessionHigh && rawWidth <= 2 && !isPoorHigh;
                        const isBuyingTail = isSessionLow && rawWidth <= 2 && !isPoorLow;

                        return (
                            <div 
                              key={price} 
                              className={`flex items-center font-mono transition-colors border-b border-white/5 ${isCurrent ? 'bg-rose-500/10' : 'hover:bg-slate-800/50'}`}
                              style={{ height: `${rowHeight}px` }}
                            >
                                {/* Price Axis */}
                                <div 
                                  className={`w-20 text-right pr-6 shrink-0 border-r-2 border-slate-800 ${isCurrent ? 'text-rose-400 font-black' : isPOC ? 'text-amber-400 font-black' : 'text-slate-500 font-bold'}`}
                                  style={{ fontSize: `${priceFontSize}px` }}
                                >
                                    {price.toFixed(2)}
                                </div>

                                {/* TPO Letters */}
                                <div className="flex-1 flex items-center h-full relative pl-4 overflow-visible">
                                    {/* Volume BG Bar */}
                                    <div 
                                        className={`absolute left-0 h-[80%] top-[10%] opacity-20 rounded-r-md transition-all ${isVA ? 'bg-indigo-500' : 'bg-slate-600'}`}
                                        style={{ width: `${Math.min(100, volWidth/3)}%` }}
                                    />
                                    
                                    {/* Letters (Heatmapped) */}
                                    <div className="relative z-10 flex gap-[1px]">
                                        {blocks.map((block, idx) => (
                                            <span 
                                                key={idx}
                                                className={`tracking-widest whitespace-nowrap select-none ${getHeatmapColor(block.period, isPOC, isVA)}`}
                                                style={{ fontSize: `${fontSize}px`, lineHeight: `${rowHeight}px`, textShadow: block.period === currentPeriodIndex ? '0 0 10px rgba(251,191,36,0.5)' : 'none' }}
                                            >
                                                {block.char}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* Structural Markers */}
                                    <div className="ml-6 flex items-center gap-3 opacity-100 z-20">
                                        {isPoorHigh && (
                                            <div className="flex items-center gap-1.5 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                                <span className="text-[10px] font-black text-rose-300 uppercase tracking-wide">Poor High</span>
                                            </div>
                                        )}
                                        {isPoorLow && (
                                            <div className="flex items-center gap-1.5 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                                <span className="text-[10px] font-black text-rose-300 uppercase tracking-wide">Poor Low</span>
                                            </div>
                                        )}
                                        {isSellingTail && (
                                            <div className="flex items-center gap-1.5 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/40">
                                                <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wide">Selling Tail</span>
                                            </div>
                                        )}
                                        {isBuyingTail && (
                                            <div className="flex items-center gap-1.5 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/40">
                                                <ArrowDownFromLine className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wide">Buying Tail</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Overlay Grid */}
                 <div className="absolute inset-0 pointer-events-none sticky top-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>
            </div>
        </div>
    </div>
  );
};

export default TPOChart;
