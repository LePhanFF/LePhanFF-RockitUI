import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Grid, ZoomIn, ZoomOut, AlertOctagon, Layers, LocateFixed } from 'lucide-react';
import { generateTPOData } from '../utils/tpoHelpers';

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

  // --- TPO & VOLUME CALCULATION ENGINE (Extracted) ---
  const { tpoRows, minPrice, maxPrice, maxVolume } = useMemo(() => {
    return generateTPOData(history, timeframe as '30m' | '5m', tickSize, ibLevels);
  }, [history, timeframe, ibLevels, tickSize]);

  // Auto-scroll logic
  useEffect(() => {
     if (autoScroll && scrollRef.current && tpoRows.length > 0) {
        const centerRatio = (maxPrice - currentPrice) / (maxPrice - minPrice);
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight * centerRatio - (scrollRef.current.clientHeight / 2);
     }
  }, [tpoRows, currentPrice, maxPrice, minPrice, tickSize, autoScroll]);

  const rowHeight = 16 * zoom;
  const fontSize = 11 * zoom;
  const priceColWidth = 80 * zoom; 
  
  // Header Config
  const HEADER_HEIGHT = 160; 

  const hasPoorHigh = tpoProfile?.poor_high === 1 || tpoProfile?.poor_high === true;
  const hasPoorLow = tpoProfile?.poor_low === 1 || tpoProfile?.poor_low === true;
  const singlePrintsUp = tpoProfile?.single_prints_above_vah || 0;
  const singlePrintsDown = tpoProfile?.single_prints_below_val || 0;

  if (tpoRows.length === 0) {
      return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No TPO Data for Timeframe</div>;
  }

  const isLevelInRow = (rowPrice: number, level: number | undefined) => {
      if (level === undefined || level === null) return false;
      return level >= rowPrice && level < (rowPrice + tickSize - 0.001);
  };

  const totalSvgHeight = (tpoRows.length * rowHeight) + HEADER_HEIGHT + 20;

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
        <div className="absolute top-4 right-4 z-40 flex items-center gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-700 backdrop-blur-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Scrollable SVG Chart */}
        <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0f172a]" // Ensure dark bg for scroll area
            onWheel={() => setAutoScroll(false)}
            onTouchMove={() => setAutoScroll(false)}
        >
            <svg 
                width="100%" 
                height={totalSvgHeight} 
                className="block tpo-main-svg"
                // xmlns is added dynamically during export, not needed here to keep React DOM clean
            >
                <defs>
                    <linearGradient id="headerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0"/>
                    </linearGradient>
                </defs>

                {/* --- HEADER SECTION INSIDE SVG --- */}
                <g>
                    {/* Background for Header */}
                    <rect x="0" y="0" width="100%" height={HEADER_HEIGHT} fill="url(#headerGrad)" />
                    <line x1="0" y1={HEADER_HEIGHT} x2="100%" y2={HEADER_HEIGHT} stroke="#334155" strokeWidth="1" />

                    {/* Title */}
                    <text x="20" y="30" fill="#94a3b8" fontSize="14" fontWeight="900" fontFamily="sans-serif" letterSpacing="2">MARKET STRUCTURE MATRIX</text>
                    <text x="20" y="50" fill="#64748b" fontSize="10" fontFamily="monospace">TIMEFRAME: {timeframe.toUpperCase()}</text>

                    {/* Col 1: Structure */}
                    <g transform="translate(20, 80)">
                        <text x="0" y="0" fill="#64748b" fontSize="10" fontWeight="bold">POOR HIGH</text>
                        <text x="0" y="15" fill={hasPoorHigh ? "#f43f5e" : "#10b981"} fontSize="12" fontWeight="900">
                            {hasPoorHigh ? "DETECTED ⚠️" : "CLEAN"}
                        </text>

                        <text x="0" y="40" fill="#64748b" fontSize="10" fontWeight="bold">POOR LOW</text>
                        <text x="0" y="55" fill={hasPoorLow ? "#f43f5e" : "#10b981"} fontSize="12" fontWeight="900">
                            {hasPoorLow ? "DETECTED ⚠️" : "CLEAN"}
                        </text>
                    </g>

                    {/* Col 2: Single Prints */}
                    <g transform="translate(150, 80)">
                        <text x="0" y="0" fill="#64748b" fontSize="10" fontWeight="bold">SP ABOVE VAH</text>
                        <text x="0" y="15" fill={singlePrintsUp > 0 ? "#34d399" : "#64748b"} fontSize="12" fontWeight="900" fontFamily="monospace">
                            {singlePrintsUp} Ticks
                        </text>

                        <text x="0" y="40" fill="#64748b" fontSize="10" fontWeight="bold">SP BELOW VAL</text>
                        <text x="0" y="55" fill={singlePrintsDown > 0 ? "#f43f5e" : "#64748b"} fontSize="12" fontWeight="900" fontFamily="monospace">
                            {singlePrintsDown} Ticks
                        </text>
                    </g>

                    {/* Col 3: Profile Values */}
                    <g transform="translate(280, 80)">
                        <text x="0" y="0" fill="#6366f1" fontSize="10" fontWeight="bold">VAH</text>
                        <text x="30" y="0" fill="#818cf8" fontSize="12" fontWeight="900" fontFamily="monospace">{tpoProfile?.current_vah?.toFixed(2)}</text>

                        <text x="0" y="25" fill="#f59e0b" fontSize="10" fontWeight="bold">POC</text>
                        <text x="30" y="25" fill="#fbbf24" fontSize="12" fontWeight="900" fontFamily="monospace">{tpoProfile?.current_poc?.toFixed(2)}</text>

                        <text x="0" y="50" fill="#6366f1" fontSize="10" fontWeight="bold">VAL</text>
                        <text x="30" y="50" fill="#818cf8" fontSize="12" fontWeight="900" fontFamily="monospace">{tpoProfile?.current_val?.toFixed(2)}</text>
                    </g>
                </g>

                {/* --- TPO ROWS --- */}
                <g transform={`translate(0, ${HEADER_HEIGHT + 10})`}>
                    {tpoRows.map((row, i) => {
                        const y = i * rowHeight;
                        const isCurrent = isLevelInRow(row.price, currentPrice);
                        const isTpoPOC = isLevelInRow(row.price, tpoProfile?.current_poc);
                        const isDPOC = isLevelInRow(row.price, volumeProfile?.poc);
                        const isVAH = isLevelInRow(row.price, tpoProfile?.current_vah);
                        const isVAL = isLevelInRow(row.price, tpoProfile?.current_val);
                        const inValueArea = row.price <= (tpoProfile?.current_vah || 0) && row.price >= (tpoProfile?.current_val || 0);
                        const isIBH = isLevelInRow(row.price, ibLevels?.high);
                        const isIBL = isLevelInRow(row.price, ibLevels?.low);
                        const volPercent = maxVolume > 0 ? (row.volume / maxVolume) * 100 : 0;
                        
                        const isSinglePrintZone = (tpoProfile?.single_prints_above_vah > 0 && row.price > tpoProfile.current_vah && row.letters.length === 1) ||
                                                (tpoProfile?.single_prints_below_val > 0 && row.price < tpoProfile.current_val && row.letters.length === 1);

                        // Colors
                        const priceColor = isCurrent ? '#f43f5e' : isTpoPOC ? '#fbbf24' : isDPOC ? '#c084fc' : '#64748b';
                        const letterColor = isCurrent ? '#f43f5e' : isTpoPOC ? '#fbbf24' : isDPOC ? '#c084fc' : isSinglePrintZone ? '#f472b6' : '#94a3b8';
                        const letterWeight = (isTpoPOC || isDPOC || isCurrent) ? '900' : '500';
                        const rowBg = isCurrent ? '#f43f5e1a' : inValueArea ? '#6366f10d' : 'transparent';

                        return (
                            <g key={row.price} transform={`translate(0, ${y})`}>
                                {/* Row Background */}
                                <rect x="0" y="0" width="100%" height={rowHeight} fill={rowBg} />
                                
                                {/* Volume Bar (Background) */}
                                <rect x={priceColWidth} y="2" width={`${volPercent * 0.8}%`} height={Math.max(0, rowHeight - 4)} fill="#6366f1" fillOpacity="0.1" rx="2" />

                                {/* Price Label */}
                                <text 
                                    x={priceColWidth - 10} 
                                    y={rowHeight / 2} 
                                    textAnchor="end" 
                                    dominantBaseline="middle" 
                                    fill={priceColor} 
                                    fontSize={fontSize} 
                                    fontWeight={isCurrent || isTpoPOC ? "900" : "500"} 
                                    fontFamily="monospace"
                                >
                                    {row.price.toFixed(2)}
                                </text>

                                {/* Divider Line */}
                                <line x1={priceColWidth} y1="0" x2={priceColWidth} y2={rowHeight} stroke="#1e293b" strokeWidth="1" />

                                {/* Lines (Indicators) */}
                                {isTpoPOC && <line x1="0" y1={rowHeight/2} x2="100%" y2={rowHeight/2} stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />}
                                {isDPOC && !isTpoPOC && <line x1="0" y1={rowHeight/2} x2="100%" y2={rowHeight/2} stroke="#a855f7" strokeWidth="1.5" opacity="0.5" />}
                                {(isIBH || isIBL) && <line x1="0" y1={rowHeight/2} x2="100%" y2={rowHeight/2} stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />}
                                {isVAH && <line x1="0" y1="0" x2="100%" y2="0" stroke="#6366f1" strokeWidth="1" opacity="0.4" />}
                                {isVAL && <line x1="0" y1={rowHeight} x2="100%" y2={rowHeight} stroke="#6366f1" strokeWidth="1" opacity="0.4" />}

                                {/* Labels (IBH, IBL etc) */}
                                <g transform={`translate(${priceColWidth + 10}, ${rowHeight/2})`}>
                                    {(isIBH || isIBL || isVAH || isVAL || isDPOC || isTpoPOC) ? (
                                        <>
                                            {isIBH && <text x="0" y="0" fill="#f97316" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">IBH</text>}
                                            {isIBL && <text x="0" y="0" fill="#f97316" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">IBL</text>}
                                            {isVAH && <text x="0" y="0" fill="#6366f1" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">VAH</text>}
                                            {isVAL && <text x="0" y="0" fill="#6366f1" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">VAL</text>}
                                            {isTpoPOC && <text x="0" y="0" fill="#fbbf24" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">POC</text>}
                                        </>
                                    ) : null}
                                    
                                    {/* TPO Letters */}
                                    <text 
                                        x={(isIBH || isIBL || isVAH || isVAL || isDPOC || isTpoPOC) ? 35 : 0} 
                                        y="1" // tiny offset
                                        fill={letterColor} 
                                        fontSize={fontSize} 
                                        fontWeight={letterWeight} 
                                        fontFamily="monospace"
                                        dominantBaseline="middle"
                                        letterSpacing="0.1em"
                                    >
                                        {row.letters}
                                    </text>
                                </g>

                                {/* Poor High/Low Markers */}
                                {row.price === maxPrice && hasPoorHigh && (
                                    <g transform={`translate(${priceColWidth + 20 + (row.letters.length * fontSize * 0.7)}, ${rowHeight/2})`}>
                                        <text fill="#f43f5e" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">⚠️ POOR HIGH</text>
                                    </g>
                                )}
                                {row.price === minPrice && hasPoorLow && (
                                    <g transform={`translate(${priceColWidth + 20 + (row.letters.length * fontSize * 0.7)}, ${rowHeight/2})`}>
                                        <text fill="#f43f5e" fontSize={fontSize*0.8} fontWeight="900" dominantBaseline="middle">⚠️ POOR LOW</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    </div>
  );
};

export default TPOChart;