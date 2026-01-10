
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
  ComposedChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Line,
  Brush,
  Bar
} from 'recharts';
import { FVG } from '../types';

interface MigrationChartProps {
  data: any[];
  currentPrice: number;
  showOHLC: boolean;
  showVWAP: boolean;
  showEMA: boolean;
  showInstitutional: boolean;
  showIB: boolean;
  showProfile: boolean;
  showFVG: boolean;
  showDPOC: boolean;
  showVolPOC: boolean; // NEW Prop
  levels: {
    asia_high: number;
    asia_low: number;
    london_high: number;
    london_low: number;
    overnight_high: number;
    overnight_low: number;
    previous_day_high: number;
    previous_day_low: number;
    previous_week_high: number;
    previous_week_low: number;
  };
  profileLevels: {
    vah: number;
    poc: number;
    val: number;
  };
  fvgData?: {
    "1h_fvg": FVG[];
    "15min_fvg": FVG[];
    "5min_fvg": FVG[];
  };
}

const PulsingDot = (props: any) => {
    const { cx, cy, stroke, index, data } = props;
    if (index === data.length - 1) {
        return (
            <svg x={cx - 6} y={cy - 6} width={12} height={12}>
                <circle cx="6" cy="6" r="4" fill={stroke} className="animate-ping opacity-75" />
                <circle cx="6" cy="6" r="3" fill={stroke} />
            </svg>
        );
    }
    return null;
};

// Custom Dot for DPOC Slices (Bright Circle)
const DPOCSliceDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload && payload.dpoc_marker !== null && payload.dpoc_marker !== undefined) {
        return (
            <svg x={cx - 10} y={cy - 10} width={20} height={20} className="overflow-visible">
                {/* Bright Glow effect */}
                <circle cx="10" cy="10" r="8" fill="#22d3ee" fillOpacity="0.6" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle cx="10" cy="10" r="6" fill="#22d3ee" fillOpacity="0.3" className="animate-pulse" />
                <circle cx="10" cy="10" r="3.5" fill="#fff" stroke="#0891b2" strokeWidth={1.5} />
            </svg>
        );
    }
    return null;
};

// Custom Dot for Volume POC Steps (Distinct Ping - Amber)
const POCStepDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload && payload.vol_poc_marker) {
        return (
             <svg x={cx - 10} y={cy - 10} width={20} height={12} className="overflow-visible">
                <circle cx="10" cy="10" r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                {/* Critical Blink Effect - Faster and larger */}
                <circle cx="10" cy="10" r="8" stroke="#f59e0b" strokeWidth="2" fill="none" className="animate-ping" style={{ animationDuration: '1s' }}/>
                <circle cx="10" cy="10" r="12" stroke="#f59e0b" strokeWidth="1" fill="none" opacity="0.5" className="animate-pulse" />
            </svg>
        );
    }
    return null;
};


const CandleShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;
    
    // Validate data
    if (!open || !close || !high || !low) return null;

    // Determine direction
    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e'; // Emerald-500 : Rose-500
    
    // Calculate scaling ratio: height (pixels) / range (value)
    // Note: Recharts 'y' is the top pixel (corresponding to 'high' value here because we map [low, high])
    // 'height' is the total pixel height of the range
    const range = high - low;
    if (range <= 0) return null;
    
    const ratio = height / range;
    
    // Calculate y positions relative to 'y' (top)
    const yOpen = y + (high - open) * ratio;
    const yClose = y + (high - close) * ratio;
    const yHigh = y;
    const yLow = y + height;
    
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

    return (
        <g>
            {/* Wick */}
            <line x1={x + width / 2} y1={yHigh} x2={x + width / 2} y2={yLow} stroke={color} strokeWidth={1.5} opacity={0.8} />
            {/* Body */}
            <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} stroke="none" rx={1} />
        </g>
    );
};

const MigrationChart: React.FC<MigrationChartProps> = ({ 
  data, currentPrice, showOHLC, showVWAP, showEMA, showInstitutional, showIB, showProfile, showFVG, showDPOC, showVolPOC, levels, profileLevels, fvgData 
}) => {
  // --- State ---
  // Brush (X-Axis) State: indices of the full dataset
  const [brushRange, setBrushRange] = useState<{ start: number, end: number } | null>(null);
  
  // Y-Axis State: [min, max]
  const [yDomain, setYDomain] = useState<[number, number] | null>(null);

  // Selection Box State (for visual feedback during drag)
  const [selection, setSelection] = useState<{
    xLabel1: string | null;
    xLabel2: string | null;
    y1: number | null;
    y2: number | null;
    isDragging: boolean;
  }>({ xLabel1: null, xLabel2: null, y1: null, y2: null, isDragging: false });

  // Chart Layout State (for pixel-to-value conversion)
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  // Measure container for coordinate mapping
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize Brush on data load
  useEffect(() => {
    if (data && data.length > 0 && brushRange === null) {
       setBrushRange({ start: 0, end: data.length - 1 });
    }
  }, [data]);

  const activeFvgs = useMemo(() => {
    if (!fvgData || !showFVG) return [];
    return [
      ...(fvgData["1h_fvg"] || []),
      ...(fvgData["15min_fvg"] || []),
      ...(fvgData["5min_fvg"] || [])
    ].filter(f => f && typeof f.bottom === 'number' && typeof f.top === 'number');
  }, [fvgData, showFVG]);

  // Determine current IB levels from data for labeling
  const lastIBH = useMemo(() => {
    if (!data) return null;
    const valid = data.filter(d => d.ibh !== null && d.ibh !== undefined);
    return valid.length > 0 ? valid[valid.length - 1].ibh : null;
  }, [data]);

  const lastIBL = useMemo(() => {
    if (!data) return null;
    const valid = data.filter(d => d.ibl !== null && d.ibl !== undefined);
    return valid.length > 0 ? valid[valid.length - 1].ibl : null;
  }, [data]);

  // Calculate default Y domain based on ALL data
  const defaultYDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 100] as [number, number];
    
    // Collect all relevant price points
    const prices = data.flatMap(d => [d.dpoc, d.high, d.low, d.close, d.ibh, d.ibl])
                       .filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    const all = [...prices, currentPrice];
    
    // NOTE: Intentionally EXCLUDING Globex/Institutional levels from default domain calc
    // to ensure the chart stays focused on the intraday/current session range.
    // If showInstitutional is true, the lines will still render, but won't force zoom out.
    
    if (showProfile && profileLevels) {
      Object.values(profileLevels).forEach(v => { if (typeof v === 'number' && v > 0) all.push(v); });
    }
    if (showEMA) {
       data.forEach(d => {
         if (d.ema20) all.push(d.ema20);
         if (d.ema50) all.push(d.ema50);
         if (d.ema200) all.push(d.ema200);
       });
    }

    const valid = all.filter(v => typeof v === 'number' && v > 0);
    if (valid.length === 0) return [0, 100] as [number, number];
    
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const span = max - min;
    const padding = span * 0.1; // 10% padding
    
    return [min - padding, max + padding] as [number, number];
  }, [data, currentPrice, profileLevels, showProfile, showEMA]);

  // Active Y Domain
  const activeYDomain = yDomain || defaultYDomain;

  // Convert Pixel Y to Value Y
  const getYValue = useCallback((chartY: number) => {
    // Recharts Margins: top 20, bottom 5
    const marginTop = 20;
    const marginBottom = 5;
    const drawHeight = containerHeight - marginTop - marginBottom;
    
    if (drawHeight <= 0) return activeYDomain[0];

    // Relative Y from top of drawing area
    // Clamp to drawing area
    const relY = Math.max(0, Math.min(drawHeight, chartY - marginTop));
    
    // Pixel 0 (top) = Max Value
    // Pixel H (bottom) = Min Value
    const ratio = relY / drawHeight;
    const [min, max] = activeYDomain;
    
    // Value = Max - ratio * (Max - Min)
    return max - ratio * (max - min);
  }, [containerHeight, activeYDomain]);

  // --- Handlers ---

  const handleMouseDown = (e: any) => {
    if (!e) return;
    const { activeLabel, chartY } = e;
    if (!activeLabel || chartY === undefined) return;
    
    setSelection({
      xLabel1: activeLabel,
      xLabel2: activeLabel,
      y1: getYValue(chartY),
      y2: getYValue(chartY),
      isDragging: true
    });
  };

  const handleMouseMove = (e: any) => {
    if (!selection.isDragging || !e) return;
    const { activeLabel, chartY } = e;
    
    if (activeLabel) {
      setSelection(prev => ({
        ...prev,
        xLabel2: activeLabel,
        y2: chartY !== undefined ? getYValue(chartY) : prev.y2
      }));
    }
  };

  const handleMouseUp = () => {
    if (!selection.isDragging) return;
    
    const { xLabel1, xLabel2, y1, y2 } = selection;
    setSelection(prev => ({ ...prev, isDragging: false, xLabel1: null, xLabel2: null, y1: null, y2: null }));

    if (!xLabel1 || !xLabel2 || y1 === null || y2 === null) return;
    if (xLabel1 === xLabel2 && Math.abs(y1 - y2) < 0.5) return; // Prevent accidental clicks

    // Calculate X Range Indices
    const idx1 = data.findIndex(d => d.time === xLabel1);
    const idx2 = data.findIndex(d => d.time === xLabel2);
    
    if (idx1 === -1 || idx2 === -1) return;

    const start = Math.min(idx1, idx2);
    const end = Math.max(idx1, idx2);

    // Calculate Y Range
    const newYMin = Math.min(y1, y2);
    const newYMax = Math.max(y1, y2);

    // Apply Zoom
    setBrushRange({ start, end });
    setYDomain([newYMin, newYMax]);
  };

  const handleReset = () => {
    setBrushRange({ start: 0, end: data.length - 1 });
    setYDomain(null); // Reset to default calculated
  };

  // Zoom slider on the left (adjusts Y scale relative to center)
  const handleLeftSliderChange = (val: number) => {
    // val is magnification factor (0.5 to 5)
    // 1 = default domain
    const [defMin, defMax] = defaultYDomain;
    const defCenter = (defMin + defMax) / 2;
    const defSpan = defMax - defMin;
    
    const newSpan = defSpan / val;
    const newMin = defCenter - newSpan / 2;
    const newMax = defCenter + newSpan / 2;
    
    setYDomain([newMin, newMax]);
  };

  // Compute current zoom level for slider sync
  const currentZoomLevel = useMemo(() => {
    if (!yDomain) return 1;
    const [defMin, defMax] = defaultYDomain;
    const [currMin, currMax] = yDomain;
    const defSpan = defMax - defMin;
    const currSpan = currMax - currMin;
    if (currSpan === 0) return 1;
    return defSpan / currSpan;
  }, [yDomain, defaultYDomain]);


  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900/10 text-slate-700 text-[10px] font-black uppercase tracking-widest italic">
        Awaiting Temporal Data Flow...
      </div>
    );
  }

  // Ensure Brush range is valid
  const safeBrushRange = brushRange || { start: 0, end: data.length - 1 };

  return (
    <div className="h-full w-full flex gap-3" ref={containerRef}>
      
      {/* Left Sidebar Control (Y-Axis Zoom Slider) */}
      <div className="w-8 flex flex-col items-center justify-center py-3 bg-slate-950/40 rounded-xl border border-slate-800/50 shrink-0 z-10 backdrop-blur-sm shadow-xl">
           <div className="h-full flex items-center justify-center w-full">
               <input 
                 type="range" 
                 min="0.5" 
                 max="10" 
                 step="0.1" 
                 value={currentZoomLevel} 
                 onChange={(e) => handleLeftSliderChange(parseFloat(e.target.value))}
                 onDoubleClick={handleReset}
                 className="h-full w-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                 style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                 title="Zoom Y Axis (Double-click to Auto Fit)"
               />
           </div>
      </div>

      <div className="flex-1 min-w-0 relative group select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data} 
            margin={{ top: 20, right: 60, left: 0, bottom: 5 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleReset}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.1} />
            
            <XAxis 
               dataKey="time" 
               stroke="#475569" 
               fontSize={11} 
               axisLine={false} 
               tickLine={false} 
               fontWeight={700}
            />
            
            <YAxis 
              domain={activeYDomain} 
              allowDataOverflow={true}
              orientation="right" 
              stroke="#475569" 
              fontSize={12} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={v => v.toFixed(0)} 
              type="number"
              fontWeight={700}
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px', color: '#f8fafc' }}
              itemStyle={{ fontWeight: 900 }}
              isAnimationActive={false}
            />

            {showFVG && activeFvgs.map((f, i) => (
              <ReferenceArea key={i} y1={f.bottom} y2={f.top} fill={f.type === 'bullish' ? '#10b981' : '#f43f5e'} fillOpacity={0.08} />
            ))}

            {showInstitutional && levels && (
              <>
                {levels.asia_high > 0 && <ReferenceLine y={levels.asia_high} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'AH', position: 'right', fill: '#fbbf24', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                {levels.asia_low > 0 && <ReferenceLine y={levels.asia_low} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'AL', position: 'right', fill: '#fbbf24', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                
                {levels.london_high > 0 && <ReferenceLine y={levels.london_high} stroke="#38bdf8" strokeDasharray="5 5" label={{ value: 'LH', position: 'right', fill: '#38bdf8', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                {levels.london_low > 0 && <ReferenceLine y={levels.london_low} stroke="#38bdf8" strokeDasharray="5 5" label={{ value: 'LL', position: 'right', fill: '#38bdf8', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                
                {levels.overnight_high > 0 && <ReferenceLine y={levels.overnight_high} stroke="#6366f1" strokeDasharray="10 5" label={{ value: 'ONH', position: 'right', fill: '#6366f1', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                {levels.overnight_low > 0 && <ReferenceLine y={levels.overnight_low} stroke="#6366f1" strokeDasharray="10 5" label={{ value: 'ONL', position: 'right', fill: '#6366f1', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                
                {levels.previous_day_high > 0 && <ReferenceLine y={levels.previous_day_high} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" label={{ value: 'PDH', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                {levels.previous_day_low > 0 && <ReferenceLine y={levels.previous_day_low} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" label={{ value: 'PDL', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                
                {levels.previous_week_high > 0 && <ReferenceLine y={levels.previous_week_high} stroke="#a78bfa" strokeWidth={1} strokeDasharray="10 10" label={{ value: 'PWH', position: 'right', fill: '#a78bfa', fontSize: 10, fontWeight: 900, dx: 10 }} />}
                {levels.previous_week_low > 0 && <ReferenceLine y={levels.previous_week_low} stroke="#a78bfa" strokeWidth={1} strokeDasharray="10 10" label={{ value: 'PWL', position: 'right', fill: '#a78bfa', fontSize: 10, fontWeight: 900, dx: 10 }} />}
              </>
            )}

            {showIB && (
              <>
                {/* Initial Balance Lines with Slow Pulse Animation */}
                <Line 
                  dataKey="ibh" 
                  stroke="#f97316" 
                  strokeWidth={2} 
                  strokeDasharray="3 3" 
                  dot={false} 
                  isAnimationActive={false} 
                  connectNulls={false} 
                  className="animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
                <Line 
                  dataKey="ibl" 
                  stroke="#f97316" 
                  strokeWidth={2} 
                  strokeDasharray="3 3" 
                  dot={false} 
                  isAnimationActive={false} 
                  connectNulls={false}
                  className="animate-pulse"
                  style={{ animationDuration: '3s' }}
                />

                {/* Labels for IB */}
                {lastIBH !== null && (
                    <ReferenceLine y={lastIBH} stroke="none" label={{ value: 'IBH', position: 'right', fill: '#f97316', fontSize: 10, fontWeight: 900 }} />
                )}
                {lastIBL !== null && (
                    <ReferenceLine y={lastIBL} stroke="none" label={{ value: 'IBL', position: 'right', fill: '#f97316', fontSize: 10, fontWeight: 900 }} />
                )}
              </>
            )}

            {showProfile && profileLevels && (
              <>
                {profileLevels.vah > 0 && <ReferenceLine y={profileLevels.vah} stroke="#0ea5e9" strokeWidth={1} label={{ value: 'VAH', position: 'right', fill: '#0ea5e9', fontSize: 10, fontWeight: 900 }} />}
                {profileLevels.poc > 0 && <ReferenceLine y={profileLevels.poc} stroke="#f59e0b" strokeWidth={2} label={{ value: 'POC', position: 'right', fill: '#f59e0b', fontSize: 10, fontWeight: 900 }} />}
                {profileLevels.val > 0 && <ReferenceLine y={profileLevels.val} stroke="#0ea5e9" strokeWidth={1} label={{ value: 'VAL', position: 'right', fill: '#0ea5e9', fontSize: 10, fontWeight: 900 }} />}
              </>
            )}

            {showVWAP && <Line type="monotone" dataKey="vwap" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="6 2 2 2" isAnimationActive={false} />}
            
            {showEMA && (
               <>
                  <Line type="monotone" dataKey="ema20" stroke="#06b6d4" strokeWidth={1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ema50" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ema200" stroke="#8b5cf6" strokeWidth={1} dot={false} isAnimationActive={false} />
               </>
            )}

            {showOHLC && (
              <Bar 
                 dataKey={(d) => [d.low, d.high]} 
                 shape={<CandleShape />} 
                 barSize={8} 
                 isAnimationActive={false}
              />
            )}
            
            {showDPOC && (
               <>
                 {/* Explicit DPOC Slice Markers */}
                 <Line 
                    dataKey="dpoc_marker" 
                    stroke="none" 
                    isAnimationActive={false}
                    dot={<DPOCSliceDot />}
                    connectNulls={false}
                 />

                 {/* Algorithm DPOC Area */}
                 <Area 
                   type="stepAfter" 
                   dataKey="dpoc" 
                   stroke="#6366f1" 
                   strokeWidth={3} 
                   fill="url(#areaGrad)" 
                   isAnimationActive={false} 
                   dot={(props) => <PulsingDot {...props} data={data} />}
                 />
               </>
            )}

            {showVolPOC && (
               <>
                 {/* NEW: Historical Volume POC Trace (Dashed Line) */}
                 <Line 
                    type="stepAfter" 
                    dataKey="vol_poc" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                    name="Volume POC History"
                    opacity={1}
                    className="animate-pulse" // Pulsing Line
                  />
                  
                  {/* NEW: Volume POC Step Markers (Blinking Dots) */}
                  <Line
                    dataKey="vol_poc_marker"
                    stroke="none"
                    dot={<POCStepDot />}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
               </>
            )}
            
            <ReferenceLine y={currentPrice} stroke="#f43f5e" strokeWidth={2} label={{ value: currentPrice.toFixed(1), fill: '#f43f5e', fontSize: 12, position: 'right', fontWeight: 900 }} />
            
            {/* Zoom Selection Visual */}
            {selection.isDragging && selection.xLabel1 && selection.xLabel2 && selection.y1 !== null && selection.y2 !== null && (
               <ReferenceArea 
                 x1={selection.xLabel1} 
                 x2={selection.xLabel2} 
                 y1={selection.y1} 
                 y2={selection.y2}
                 stroke="#6366f1"
                 strokeOpacity={0.8}
                 strokeDasharray="3 3"
                 fill="#6366f1" 
                 fillOpacity={0.15} 
               />
            )}

            <Brush 
                dataKey="time" 
                height={20} 
                stroke="#4f46e5" 
                fill="#0f172a" 
                startIndex={safeBrushRange.start}
                endIndex={safeBrushRange.end}
                onChange={(range: any) => {
                    // Sync Brush changes back to state (e.g. user dragged brush handles)
                    setBrushRange({ start: range.startIndex, end: range.endIndex });
                }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MigrationChart;
