
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  ComposedChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Line,
  Area,
  Bar,
  Brush
} from 'recharts';

interface MigrationChartProps {
  data: any[];
  currentPrice?: number;
  showVWAP?: boolean;
  showEMA?: boolean;
  showInstitutional?: boolean;
  showIB?: boolean;
  showProfile?: boolean;
  showFVG?: boolean;
  showDPOC?: boolean;
  showComposite?: boolean; 
  compositeNodes?: { hvn: number[]; lvn: number[]; };
  levels?: any;
  profileLevels?: { vah: number; val: number; poc: number; };
  ibLevels?: { high: number; low: number; };
  fvgData?: any;
  
  // Drawing Props
  activeTool?: 'cursor' | 'line' | 'rect' | 'circle' | 'text';
  drawings?: any[];
  onUpdateDrawings?: (drawings: any[]) => void;
  onToolChange?: (tool: any) => void;
}

// Updated Tooltip to include Cursor Price in a dedicated row
const CustomTooltip = ({ active, payload, label, cursorPrice }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const open = d.open;
        const close = d.close;
        const isUp = close >= open;
        
        return (
            <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono z-50 pointer-events-none backdrop-blur-md min-w-[200px]">
                {/* Header with Timestamp */}
                <div className="mb-2 border-b border-slate-800 pb-1 flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-sm">{label}</span>
                </div>

                {/* Explicit Cursor Price Row */}
                <div className="flex justify-between items-center mb-3 bg-slate-900/80 p-2 rounded border border-slate-800 shadow-inner">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Cursor Price</span>
                    <span className="text-amber-400 font-black text-sm">{cursorPrice || '...'}</span>
                </div>

                {/* OHLC Data */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2 border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Open</span> <span className={isUp ? 'text-emerald-400 text-right' : 'text-rose-400 text-right'}>{d.open?.toFixed(2)}</span>
                    <span className="text-slate-500">High</span> <span className="text-slate-200 text-right">{d.high?.toFixed(2)}</span>
                    <span className="text-slate-500">Low</span> <span className="text-slate-200 text-right">{d.low?.toFixed(2)}</span>
                    <span className="text-slate-500">Close</span> <span className={isUp ? 'text-emerald-400 text-right' : 'text-rose-400 text-right'}>{d.close?.toFixed(2)}</span>
                </div>

                {/* Technicals */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <span className="text-slate-500">DPOC</span> <span className="text-indigo-400 text-right">{d.dpoc?.toFixed(2)}</span>
                    <span className="text-slate-500">VWAP</span> <span className="text-orange-400 text-right">{d.vwap?.toFixed(2)}</span>
                    <span className="text-slate-500">Vol</span> <span className="text-slate-300 text-right">{d.volume?.toLocaleString()}</span>
                </div>
            </div>
        );
    }
    return null;
};

// Custom Shape for Candlesticks
const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  if (!open || !close || !high || !low) return null;

  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';
  
  const range = high - low;
  const scale = range > 0 ? height / range : 0;
  
  const yHigh = y;
  const yLow = y + height;
  const yOpen = y + (high - open) * scale;
  const yClose = y + (high - close) * scale;
  
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
  
  return (
    <g>
      <line x1={x + width/2} y1={yHigh} x2={x + width/2} y2={yLow} stroke={color} strokeWidth={1} />
      <rect 
        x={x + width * 0.15} 
        y={bodyTop} 
        width={width * 0.7} 
        height={bodyHeight} 
        fill={color} 
        stroke={color} 
      />
    </g>
  );
};

const MigrationChart: React.FC<MigrationChartProps> = ({ 
  data, currentPrice = 0, showVWAP = false, showEMA = false, showInstitutional = false, showIB = false, showProfile = false, showFVG = false, showDPOC = false, showComposite = false, compositeNodes, levels, profileLevels, ibLevels, fvgData,
  activeTool = 'cursor', drawings = [], onUpdateDrawings, onToolChange
}) => {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDrawing, setCurrentDrawing] = useState<any>(null);
  const [editingText, setEditingText] = useState<{ x: number, y: number, value: string, targetId?: number } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number, y: number, time: string, price: string } | null>(null);

  // Keyboard Shortcuts (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (editingText) {
                setEditingText(null);
            } else if (currentDrawing) {
                setCurrentDrawing(null);
            } else if (activeTool !== 'cursor') {
                if (onToolChange) onToolChange('cursor');
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, currentDrawing, editingText, onToolChange]);

  const domain = useMemo(() => {
      if (!data || data.length === 0) return [0, 100];
      const allLow = Math.min(...data.map(d => (d.low > 0 ? d.low : d.close) || Infinity));
      const allHigh = Math.max(...data.map(d => d.high || d.close || -Infinity));
      if (allLow === Infinity || allHigh === -Infinity) return [0, 100];
      const padding = (allHigh - allLow) * 0.1;
      return [allLow - padding, allHigh + padding];
  }, [data]);

  const activeFvgs = useMemo(() => {
    if (!fvgData || !showFVG) return [];
    return [
      ...(fvgData["1h_fvg"] || []),
      ...(fvgData["15min_fvg"] || []),
      ...(fvgData["5min_fvg"] || [])
    ].filter(f => f && typeof f.bottom === 'number' && typeof f.top === 'number');
  }, [fvgData, showFVG]);

  const periodMarkers = useMemo(() => {
    if (!data) return [];
    return data.filter(d => {
       const t = d.time || "";
       return t.endsWith(":00") || t.endsWith(":30");
    });
  }, [data]);

  // --- Distance Helper for Snapping ---
  const getDistanceToShape = (x: number, y: number, shape: any) => {
      if (shape.type === 'line') {
          // Distance to segment
          const A = x - shape.x1;
          const B = y - shape.y1;
          const C = shape.x2 - shape.x1;
          const D = shape.y2 - shape.y1;
          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;
          if (lenSq !== 0) param = dot / lenSq;
          let xx, yy;
          if (param < 0) { xx = shape.x1; yy = shape.y1; }
          else if (param > 1) { xx = shape.x2; yy = shape.y2; }
          else { xx = shape.x1 + param * C; yy = shape.y1 + param * D; }
          const dx = x - xx;
          const dy = y - yy;
          return Math.sqrt(dx * dx + dy * dy);
      } else if (shape.type === 'rect') {
          // Distance to center (simplification)
          const cx = (shape.x1 + shape.x2) / 2;
          const cy = (shape.y1 + shape.y2) / 2;
          return Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      } else if (shape.type === 'circle') {
          // Distance to center
          return Math.sqrt(Math.pow(x - shape.x1, 2) + Math.pow(y - shape.y1, 2));
      }
      return Infinity;
  };

  // Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent interfering with existing input interaction
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    
    if (activeTool === 'cursor') return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'text') {
      if (editingText) {
        handleTextCommit();
      } else {
        // --- SNAP TO SHAPE LOGIC ---
        // If clicking "Text" tool near a shape, attach label to it.
        let targetShape = null;
        let minDist = 20; // Snapping threshold

        drawings?.forEach(d => {
            const dist = getDistanceToShape(x, y, d);
            if (dist < minDist) {
                minDist = dist;
                targetShape = d;
            }
        });

        if (targetShape) {
            // Position input at shape center/midpoint
            let tx = x, ty = y;
            if (targetShape.type === 'line' || targetShape.type === 'rect') {
                tx = (targetShape.x1 + targetShape.x2) / 2;
                ty = (targetShape.y1 + targetShape.y2) / 2;
            } else if (targetShape.type === 'circle') {
                tx = targetShape.x1;
                ty = targetShape.y1;
            }

            setEditingText({ 
                x: tx, 
                y: ty, 
                value: targetShape.label || '', 
                targetId: targetShape.id 
            });
        } else {
            setEditingText({ x, y, value: '' });
        }
      }
      return;
    }

    setCurrentDrawing({
      type: activeTool,
      x1: x, y1: y,
      x2: x, y2: y,
      id: Date.now()
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!currentDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentDrawing((prev: any) => ({
      ...prev,
      x2: x,
      y2: y
    }));
  };

  const handleMouseUp = () => {
    if (currentDrawing && onUpdateDrawings) {
      const dx = Math.abs(currentDrawing.x2 - currentDrawing.x1);
      const dy = Math.abs(currentDrawing.y2 - currentDrawing.y1);
      if (dx > 5 || dy > 5) {
        onUpdateDrawings([...drawings, currentDrawing]);
      }
    }
    setCurrentDrawing(null);
  };

  const handleTextCommit = () => {
    if (editingText && onUpdateDrawings) {
        if (editingText.targetId) {
            const updated = drawings?.map(d => 
                d.id === editingText.targetId ? { ...d, label: editingText.value } : d
            ) || [];
            onUpdateDrawings(updated);
        } else if (editingText.value.trim()) {
            onUpdateDrawings([...(drawings || []), { 
                type: 'text', 
                x: editingText.x, 
                y: editingText.y, 
                text: editingText.value, 
                id: Date.now() 
            }]);
        }
    }
    setEditingText(null);
  };

  const handleShapeDoubleClick = (e: React.MouseEvent, shape: any) => {
      e.stopPropagation();
      // Allow editing on double click regardless of active tool (User convenience)
      let cx = shape.x1;
      let cy = shape.y1;
      if (shape.type === 'rect' || shape.type === 'circle') {
          cx = (shape.x1 + shape.x2) / 2;
          cy = (shape.y1 + shape.y2) / 2;
      } else if (shape.type === 'line') {
          cx = (shape.x1 + shape.x2) / 2;
          cy = (shape.y1 + shape.y2) / 2;
      }
      setEditingText({
          x: cx,
          y: cy,
          value: shape.label || '',
          targetId: shape.id
      });
  };

  // Improved Crosshair Logic
  const handleChartMouseMove = (e: any) => {
    // If editing text, do not update crosshair to avoid render thrashing
    if (editingText) return; 
    
    if (activeTool !== 'cursor' || !containerRef.current) return;
    
    // Check if event has valid coordinates
    if (e && (e.chartX !== undefined || e.activeCoordinate?.x !== undefined)) {
        const height = containerRef.current.clientHeight;
        const verticalChrome = 10 + 5 + 30 + 30; 
        const drawHeight = Math.max(1, height - verticalChrome);
        const chartY = e.chartY ?? e.activeCoordinate?.y;

        if (typeof domain[0] === 'number' && typeof domain[1] === 'number' && chartY !== undefined) {
             const [min, max] = domain;
             const range = max - min;
             const relativeY = chartY - 10;
             const pct = Math.max(0, Math.min(1, relativeY / drawHeight));
             const price = max - (pct * range);
             
             setCrosshair({
                 x: e.activeCoordinate?.x ?? e.chartX ?? 0,
                 y: chartY,
                 time: e.activeLabel || '',
                 price: isNaN(price) ? '...' : price.toFixed(2)
             });
        }
    }
  };

  const renderShape = (shape: any, isCurrent = false) => {
    const stroke = "#fbbf24";
    const strokeWidth = 2;
    const fill = isCurrent ? "rgba(251, 191, 36, 0.1)" : "none";

    let element = null;
    let labelPos = { x: 0, y: 0 };

    switch(shape.type) {
      case 'line':
        const useMarker = !isCurrent || Math.hypot(shape.x2-shape.x1, shape.y2-shape.y1) > 10;
        element = <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={stroke} strokeWidth={strokeWidth} markerEnd={useMarker ? "url(#arrowhead)" : undefined} />;
        labelPos = { x: (shape.x1 + shape.x2)/2, y: (shape.y1 + shape.y2)/2 - 10 };
        break;
      case 'rect': {
        const x = Math.min(shape.x1, shape.x2);
        const y = Math.min(shape.y1, shape.y2);
        const w = Math.abs(shape.x2 - shape.x1);
        const h = Math.abs(shape.y2 - shape.y1);
        element = <rect x={x} y={y} width={w} height={h} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
        labelPos = { x: x + w/2, y: y + h/2 };
        break;
      }
      case 'circle': {
        const r = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
        element = <circle cx={shape.x1} cy={shape.y1} r={r} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
        labelPos = { x: shape.x1, y: shape.y1 };
        break;
      }
      case 'text':
        return (
          <text x={shape.x} y={shape.y} fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {shape.text}
          </text>
        );
      default: return null;
    }

    return (
        <g>
            {element}
            {shape.label && (
                <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="12" fontWeight="bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)', pointerEvents: 'none' }}>
                    {shape.label}
                </text>
            )}
        </g>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900/10 text-slate-700 text-[10px] font-black uppercase tracking-widest italic">
        Waiting for Data...
      </div>
    );
  }

  return (
    <div className="h-full w-full select-none relative" ref={containerRef}>
      {/* Drawing & Crosshair Layer (Higher Z-Index) */}
      <div 
        className={`absolute inset-0 z-30 ${activeTool === 'cursor' && !editingText ? 'pointer-events-none' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
            </marker>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {drawings?.map((shape) => (
              <g 
                key={shape.id} 
                pointerEvents='auto' // Allow interaction always
                onDoubleClick={(e) => handleShapeDoubleClick(e, shape)}
                className='cursor-pointer hover:opacity-80'
              >
                  {renderShape(shape)}
              </g>
          ))}
          
          {currentDrawing && renderShape(currentDrawing, true)}

          {/* Crosshair Overlay (Visible in Cursor Mode and NOT editing) */}
          {crosshair && activeTool === 'cursor' && !editingText && (
              <g className="pointer-events-none">
                  <line x1="0" y1={crosshair.y} x2="100%" y2={crosshair.y} stroke="#0ea5e9" strokeWidth="1" strokeDasharray="6 3" opacity="0.8" />
                  <line x1={crosshair.x} y1="0" x2={crosshair.x} y2="100%" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="6 3" opacity="0.8" />
                  <circle cx={crosshair.x} cy={crosshair.y} r="3" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
                  <g transform={`translate(${containerRef.current?.clientWidth ? containerRef.current.clientWidth - 65 : 0}, ${crosshair.y})`}>
                      <path d="M 0 0 L 10 -11 L 65 -11 L 65 11 L 10 11 L 0 0 Z" fill="#0ea5e9" />
                      <text x="38" y="4" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold" fontFamily="monospace">
                          {crosshair.price}
                      </text>
                  </g>
                  <g transform={`translate(${crosshair.x}, ${containerRef.current?.clientHeight ? containerRef.current.clientHeight - 35 : 0})`}>
                      <rect x="-30" y="0" width="60" height="20" fill="#0ea5e9" rx="4" />
                      <text x="0" y="14" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold" fontFamily="monospace">
                          {crosshair.time}
                      </text>
                  </g>
              </g>
          )}
        </svg>

        {editingText && (
          <input
            type="text"
            value={editingText.value}
            onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextCommit();
                e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()} // Stop propagation to prevent creating new text/shapes
            onBlur={handleTextCommit}
            autoFocus
            className="absolute bg-slate-900/90 text-white border border-white/50 rounded px-2 py-1 text-sm font-mono outline-none shadow-xl pointer-events-auto z-50"
            style={{ 
              left: editingText.x, 
              top: editingText.y, 
              transform: 'translate(-50%, -50%)',
              minWidth: '150px',
            }}
            placeholder={editingText.targetId ? "Enter label..." : "Annotation..."}
          />
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={() => setCrosshair(null)}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.1} />
            
            <XAxis 
               dataKey="time" 
               stroke="#475569" 
               fontSize={10} 
               axisLine={false} 
               tickLine={false} 
               fontWeight={700}
               minTickGap={30}
            />
            
            <YAxis 
              domain={domain} 
              allowDataOverflow={false} 
              orientation="right" 
              stroke="#475569" 
              fontSize={11} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={v => v.toFixed(0)} 
              type="number"
              fontWeight={700}
              width={50}
            />
            
            <Tooltip 
                content={(props: any) => <CustomTooltip {...props} cursorPrice={crosshair?.price} />} 
                cursor={{ strokeOpacity: 0 }} 
                isAnimationActive={false} 
                trigger="hover"
            />

            {/* CANDLESTICKS (Primary Price) */}
            <Bar 
              dataKey={(d) => [d.low, d.high]} 
              shape={<CandleStickShape />} 
              isAnimationActive={false} 
            />

            {showVWAP && <Line type="monotone" dataKey="vwap" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="6 2" isAnimationActive={false} />}
            
            {showEMA && (
               <>
                  <Line type="monotone" dataKey="ema20" stroke="#06b6d4" strokeWidth={1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ema50" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ema200" stroke="#8b5cf6" strokeWidth={1} dot={false} isAnimationActive={false} />
               </>
            )}

            {showDPOC && (
               <Area 
                   type="stepAfter" 
                   dataKey="dpoc" 
                   stroke="#6366f1" 
                   strokeWidth={2} 
                   fill="url(#areaGrad)" 
                   isAnimationActive={false} 
               />
            )}

            {showIB && (
                <>
                    <Line dataKey="ibh" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    <Line dataKey="ibl" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    
                    {ibLevels?.high && ibLevels.high > 0 && <ReferenceLine y={ibLevels.high} stroke="#f97316" strokeDasharray="2 2" strokeOpacity={0.6} label={{ value: 'IBH', position: 'insideRight', fill: '#f97316', fontSize: 10, fontWeight: 'bold' }} />}
                    {ibLevels?.low && ibLevels.low > 0 && <ReferenceLine y={ibLevels.low} stroke="#f97316" strokeDasharray="2 2" strokeOpacity={0.6} label={{ value: 'IBL', position: 'insideRight', fill: '#f97316', fontSize: 10, fontWeight: 'bold' }} />}
                </>
            )}

            {showInstitutional && levels && Object.entries(levels).map(([key, val]) => {
                // Filter only high/low keys and ensure value is valid
                if (typeof val === 'number' && val > 0 && (key.includes('high') || key.includes('low'))) {
                    return <ReferenceLine 
                        key={key} 
                        y={val} 
                        stroke="#fbbf24" 
                        strokeDasharray="2 4" 
                        strokeOpacity={0.5} 
                        label={{ 
                            value: key.replace(/_/g, ' ').toUpperCase().replace('PREVIOUS', 'PREV').replace('OVERNIGHT', 'ON'), 
                            position: 'insideRight', 
                            fontSize: 10, 
                            fill: '#fbbf24', 
                            opacity: 1,
                            fontWeight: 'bold'
                        }} 
                    />;
                }
                return null;
            })}

            {showProfile && (
                <>
                   {/* Static Session Levels */}
                   {profileLevels && (
                       <>
                           {profileLevels.vah > 0 && <ReferenceLine y={profileLevels.vah} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: 'VAH', position: 'insideRight', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold', opacity: 1 }} />}
                           {profileLevels.val > 0 && <ReferenceLine y={profileLevels.val} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: 'VAL', position: 'insideRight', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold', opacity: 1 }} />}
                           
                           {/* Current POC Reference - Made thinner/dimmer to emphasize the historical line */}
                           {profileLevels.poc > 0 && <ReferenceLine y={profileLevels.poc} stroke="#fbbf24" strokeWidth={1} strokeDasharray="2 2" strokeOpacity={0.5} label={{ value: 'CUR POC', position: 'insideRight', fill: '#fbbf24', fontSize: 10, fontWeight: 'bold', opacity: 0.7 }} />}
                       </>
                   )}

                   {/* Historical TPO POC Line (Moved AFTER ReferenceLines to draw ON TOP) */}
                   <Line 
                      type="stepAfter" 
                      dataKey="vol_poc" 
                      stroke="#fbbf24" 
                      strokeWidth={3} 
                      dot={false} 
                      isAnimationActive={false} 
                      connectNulls={true}
                      name="TPOC"
                   />
                </>
            )}

            {showComposite && compositeNodes && (
                <>
                    {compositeNodes.hvn?.map((lvl, i) => (
                        <ReferenceLine key={`hvn-${i}`} y={lvl} stroke="#ec4899" strokeOpacity={0.4} strokeWidth={4} label={{ value: 'HVN', position: 'insideRight', fontSize: 9, fontWeight: 'bold', fill: '#ec4899' }} />
                    ))}
                    {compositeNodes.lvn?.map((lvl, i) => (
                        <ReferenceLine key={`lvn-${i}`} y={lvl} stroke="#a855f7" strokeOpacity={0.6} strokeDasharray="2 2" label={{ value: 'LVN', position: 'insideRight', fontSize: 9, fontWeight: 'bold', fill: '#a855f7' }} />
                    ))}
                </>
            )}

            {showFVG && activeFvgs.map((f: any, i: number) => (
              <ReferenceArea key={i} y1={f.bottom} y2={f.top} fill={f.type === 'bullish' ? '#10b981' : '#f43f5e'} fillOpacity={0.1} />
            ))}

            {/* Blinking 30m Markers on DPOC Line */}
            {showDPOC && periodMarkers.map((marker, i) => (
               <ReferenceDot
                  key={`dpoc-marker-${i}`}
                  x={marker.time}
                  y={marker.dpoc}
                  r={0}
                  shape={(props: any) => {
                      const { cx, cy } = props;
                      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                      return (
                          <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
                              {/* Pulse Core */}
                              <circle r="4" fill="white" fillOpacity="1">
                                 <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                                 <animate attributeName="fill-opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
                              </circle>

                              {/* Strong Ripple 1 */}
                              <circle r="0" fill="none" stroke="white" strokeWidth="3">
                                  <animate attributeName="r" from="0" to="35" dur="1.5s" repeatCount="indefinite" begin="0s" />
                                  <animate attributeName="stroke-opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" begin="0s" />
                                  <animate attributeName="stroke-width" from="3" to="0" dur="1.5s" repeatCount="indefinite" begin="0s" />
                              </circle>
                              
                              {/* Strong Ripple 2 (Delayed) */}
                              <circle r="0" fill="none" stroke="white" strokeWidth="3">
                                  <animate attributeName="r" from="0" to="35" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                                  <animate attributeName="stroke-opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                                  <animate attributeName="stroke-width" from="3" to="0" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                              </circle>
                              
                              {/* Solid Center Anchor */}
                              <circle r="4" fill="white" stroke="#6366f1" strokeWidth="1.5" />
                          </g>
                      );
                  }}
               />
            ))}

            <ReferenceLine y={currentPrice} stroke="#f43f5e" strokeWidth={1} strokeDasharray="2 2" label={{ value: currentPrice.toFixed(2), position: 'insideRight', fill: '#f43f5e', fontSize: 11, fontWeight: '900', dx: -10 }} />

            <Brush 
                dataKey="time" 
                height={30} 
                stroke="#334155" 
                fill="#0f172a" 
                tickFormatter={() => ''}
            />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MigrationChart;
