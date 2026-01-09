
import React, { useState, useMemo, useRef } from 'react';
import { Settings2, BarChart2, Grid } from 'lucide-react';

interface TPOChartProps {
  tpoProfile: {
    current_poc: number;
    current_vah: number;
    current_val: number;
    tpo_shape: string;
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
}

const TPOChart: React.FC<TPOChartProps> = ({ tpoProfile, volumeProfile, sessionHigh, sessionLow, currentPrice }) => {
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

  // Simulate TPO Data distribution based on POC/VA
  const getTPORow = (price: number) => {
    // Distance from POC
    const dist = Math.abs(price - tpoProfile.current_poc);
    // Max width at POC
    let width = Math.max(1, 26 - (dist * 0.8)); // Simulated curve
    
    // Adjust for shape
    if (tpoProfile.tpo_shape === 'p_shape' && price > tpoProfile.current_poc) width += 2;
    if (tpoProfile.tpo_shape === 'b_shape' && price < tpoProfile.current_poc) width += 2;
    
    // Randomize slightly
    width = Math.max(1, Math.floor(width + (Math.random() * 2 - 1)));
    
    // Generate letters
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let letters = "";
    const startChar = timeframe === '30m' ? 0 : 0; // In 5m we might use numbers or granular, keeping letters for visual style
    for(let i=0; i<width; i++) {
        letters += alphabet[i % 26];
    }
    
    // Volume simulation (HVN check)
    const isHVN = volumeProfile.hvn_nodes.some(n => Math.abs(n - price) < 1);
    const isLVN = volumeProfile.lvn_nodes.some(n => Math.abs(n - price) < 1);
    let volWidth = width * 10;
    if (isHVN) volWidth *= 1.5;
    if (isLVN) volWidth *= 0.4;

    return { letters, volWidth };
  };

  const handleAutoFit = () => {
    if (scrollContainerRef.current && ticks.length > 0) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      // Base height is 12px. We want ticks.length * 12 * zoom <= containerHeight
      const fittedZoom = (containerHeight - 32) / (ticks.length * 12); // -32 for padding
      setZoom(Math.max(0.1, Math.min(3, fittedZoom)));
    }
  };

  const rowHeight = 12 * zoom;
  const fontSize = Math.max(2, 10 * zoom);
  
  return (
    <div className="h-full bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 flex flex-col relative overflow-hidden group">
        {/* Controls Header */}
        <div className="flex items-center justify-between mb-4 z-10 relative shrink-0">
            <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">TPO / Volume Matrix</span>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
                    <button onClick={() => setTimeframe('5m')} className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${timeframe === '5m' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>5M</button>
                    <button onClick={() => setTimeframe('30m')} className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${timeframe === '30m' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>30M</button>
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 relative gap-2">
            {/* Y-Axis Zoom Control (Sidebar) */}
            <div className="w-6 flex flex-col items-center justify-center py-2 bg-slate-950/30 rounded-lg border border-slate-800/50 shrink-0">
                <div className="flex-1 flex items-center justify-center py-2 w-full h-full">
                     <input 
                       type="range" 
                       min="0.1" 
                       max="3" 
                       step="0.05" 
                       value={zoom} 
                       onChange={(e) => setZoom(parseFloat(e.target.value))}
                       onDoubleClick={handleAutoFit}
                       className="h-full w-1 appearance-none bg-slate-800 rounded-full cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                       style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                       title="Zoom Price Axis (Double-click to Auto Fit)"
                     />
                </div>
            </div>

            {/* Chart Scroll Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-950/30 rounded-xl border border-slate-800/50">
                <div className="w-full flex flex-col py-4 min-h-full">
                    {ticks.map((price, i) => {
                        const { letters, volWidth } = getTPORow(price);
                        const isPOC = Math.abs(price - tpoProfile.current_poc) < tickSize;
                        const isVA = price <= tpoProfile.current_vah && price >= tpoProfile.current_val;
                        const isCurrent = Math.abs(price - currentPrice) < tickSize;
                        
                        return (
                            <div 
                              key={price} 
                              className={`flex items-center font-mono hover:bg-slate-800/30 transition-colors ${isCurrent ? 'bg-rose-500/10' : ''}`}
                              style={{ height: `${rowHeight}px` }}
                            >
                                {/* Price Axis */}
                                <div 
                                  className={`w-16 text-right pr-4 shrink-0 border-r border-slate-800 ${isCurrent ? 'text-rose-400 font-bold' : isPOC ? 'text-amber-400 font-bold' : 'text-slate-600'}`}
                                  style={{ fontSize: `${fontSize}px` }}
                                >
                                    {price.toFixed(2)}
                                </div>

                                {/* TPO Letters */}
                                <div className="flex-1 flex items-center h-full relative pl-2 overflow-hidden">
                                    {/* Volume BG Bar */}
                                    <div 
                                        className={`absolute left-0 h-full opacity-10 ${isVA ? 'bg-indigo-500' : 'bg-slate-500'}`}
                                        style={{ width: `${Math.min(100, volWidth/3)}%` }}
                                    />
                                    
                                    {/* Letters */}
                                    <span 
                                      className={`tracking-widest z-10 whitespace-nowrap ${isPOC ? 'text-amber-400 font-black' : isVA ? 'text-indigo-300' : 'text-slate-600'} ${isCurrent ? 'text-rose-400' : ''}`} 
                                      style={{ fontSize: `${Math.max(2, fontSize - 1)}px`, lineHeight: `${rowHeight}px` }}
                                    >
                                        {letters}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Overlay Grid */}
                 <div className="absolute inset-0 pointer-events-none sticky top-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>
            </div>
        </div>
    </div>
  );
};

export default TPOChart;
