
import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Bar,
  Cell,
  Line
} from 'recharts';
import { DPOCSlice, ProfileSet } from '../types';

interface MigrationChartProps {
  data: DPOCSlice[];
  currentPrice: number;
  showOHLC: boolean;
  showVWAP: boolean;
  showEMA: boolean;
  showVP: boolean;
  isWideView: boolean;
  currentVP?: ProfileSet;
  levels: {
    asia_high: number;
    asia_low: number;
    london_high: number;
    london_low: number;
    previous_day_high: number;
    previous_day_low: number;
    previous_week_high: number;
    previous_week_low: number;
  };
}

const MigrationChart: React.FC<MigrationChartProps> = ({ 
  data, 
  currentPrice, 
  showOHLC, 
  showVWAP, 
  showEMA, 
  showVP,
  isWideView,
  currentVP,
  levels 
}) => {
  const sessionData = useMemo(() => {
    return data
      .filter(d => {
        const [hours, minutes] = d.time.split(':').map(Number);
        return hours > 9 || (hours === 9 && minutes >= 30);
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data]);

  const yDomain = useMemo(() => {
    const allValues = [
      ...sessionData.map(d => d.dpoc),
      ...sessionData.map(d => d.high || d.dpoc),
      ...sessionData.map(d => d.low || d.dpoc),
      currentPrice,
      levels.asia_high, levels.asia_low,
      levels.london_high, levels.london_low,
      levels.previous_day_high, levels.previous_day_low
    ];

    if (isWideView) {
      allValues.push(levels.previous_week_high, levels.previous_week_low);
    }

    if (showVWAP) sessionData.forEach(d => d.vwap && allValues.push(d.vwap));
    if (showEMA) {
      sessionData.forEach(d => {
        if (d.ema20) allValues.push(d.ema20);
        if (d.ema50) allValues.push(d.ema50);
        if (d.ema200) allValues.push(d.ema200);
      });
    }
    if (showVP && currentVP) {
      allValues.push(currentVP.poc, currentVP.vah, currentVP.val);
      currentVP.hvn_nodes.forEach(v => allValues.push(v));
      currentVP.lvn_nodes.forEach(v => allValues.push(v));
    }

    const validValues = allValues.filter(v => v !== undefined && !isNaN(v) && v !== 0);
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min;
    
    // Zoom behavior: If Wide View is on, we double the padding percentage
    const paddingMult = isWideView ? 0.4 : 0.1;
    const padding = range * paddingMult || 20;
    
    return [min - padding, max + padding];
  }, [sessionData, currentPrice, levels, showVWAP, showEMA, showVP, isWideView, currentVP]);

  if (sessionData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center italic text-slate-500 font-black uppercase tracking-[0.3em] text-lg bg-slate-900/10">
        Engine Initializing (09:30 AM)...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-2">
      <div className="flex-1 group select-none relative">
        <div className="absolute top-2 right-16 z-10 flex flex-wrap gap-3 bg-slate-950/80 backdrop-blur-xl p-2 rounded-xl border border-slate-800 text-[9px] font-black uppercase tracking-[0.1em] shadow-2xl max-w-[280px] sm:max-w-none">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-amber-500 rounded-full"></div><span className="text-amber-500/80">Asia</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-sky-400 rounded-full"></div><span className="text-sky-400/80">London</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-slate-500 rounded-full"></div><span className="text-slate-500">PDH/L</span></div>
          {isWideView && (
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-rose-400 rounded-full"></div><span className="text-rose-400">PWH/L</span></div>
          )}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3"><div className="w-2.5 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div><span className="text-indigo-400">DPOC</span></div>
          
          {showVWAP && (
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <div className="w-2.5 h-0.5 bg-amber-400 rounded-full"></div>
              <span className="text-amber-400/80">VWAP</span>
            </div>
          )}
          
          {showEMA && (
            <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
              <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-cyan-400"></div><span className="text-cyan-400/70">20</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-indigo-400"></div><span className="text-indigo-400/70">50</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-fuchsia-400"></div><span className="text-fuchsia-400/70">200</span></div>
            </div>
          )}

          {showVP && (
            <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
               <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-indigo-500"></div><span className="text-indigo-400/70">VA/POC</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-emerald-500"></div><span className="text-emerald-400/70">HVN</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-0.5 bg-rose-500"></div><span className="text-rose-400/70">LVN</span></div>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sessionData} margin={{ top: 60, right: 80, left: 60, bottom: 10 }}>
            <defs>
              <linearGradient id="colorDpoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
            
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={11} 
              fontWeight={800}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis 
              yAxisId="right"
              domain={yDomain} 
              stroke="#94a3b8" 
              fontSize={12} 
              fontWeight={900}
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => val.toLocaleString()}
            />

            <YAxis 
              yAxisId="left"
              domain={yDomain} 
              stroke="transparent" 
              fontSize={11} 
              fontWeight={900}
              orientation="left"
              axisLine={false}
              tickLine={false}
              tickFormatter={() => ""}
            />

            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#020617', 
                border: '1px solid #1e293b',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '800',
                padding: '12px',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)'
              }}
              itemStyle={{ padding: '1px 0' }}
              labelStyle={{ color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              cursor={{ stroke: '#334155', strokeWidth: 1 }}
            />

            {/* Session Levels - Labels moved to LEFT */}
            <ReferenceLine yAxisId="right" y={levels.asia_high} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} label={{ position: 'left', value: 'AH', fill: '#f59e0b', fontSize: 10, fontWeight: 900, dx: -5 }} />
            <ReferenceLine yAxisId="right" y={levels.asia_low} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} label={{ position: 'left', value: 'AL', fill: '#f59e0b', fontSize: 10, fontWeight: 900, dx: -5 }} />
            <ReferenceLine yAxisId="right" y={levels.london_high} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} label={{ position: 'left', value: 'LH', fill: '#38bdf8', fontSize: 10, fontWeight: 900, dx: -5 }} />
            <ReferenceLine yAxisId="right" y={levels.london_low} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} label={{ position: 'left', value: 'LL', fill: '#38bdf8', fontSize: 10, fontWeight: 900, dx: -5 }} />
            <ReferenceLine yAxisId="right" y={levels.previous_day_high} stroke="#94a3b8" strokeWidth={1.5} strokeOpacity={0.5} label={{ position: 'left', value: 'PDH', fill: '#cbd5e1', fontSize: 10, fontWeight: 900, dx: -5 }} />
            <ReferenceLine yAxisId="right" y={levels.previous_day_low} stroke="#94a3b8" strokeWidth={1.5} strokeOpacity={0.5} label={{ position: 'left', value: 'PDL', fill: '#cbd5e1', fontSize: 10, fontWeight: 900, dx: -5 }} />

            {/* Weekly Footprints (Only in Wide View) */}
            {isWideView && (
              <>
                <ReferenceLine yAxisId="right" y={levels.previous_week_high} stroke="#fb7185" strokeWidth={1.5} strokeOpacity={0.6} label={{ position: 'left', value: 'PWH', fill: '#fb7185', fontSize: 10, fontWeight: 900, dx: -5 }} />
                <ReferenceLine yAxisId="right" y={levels.previous_week_low} stroke="#fb7185" strokeWidth={1.5} strokeOpacity={0.6} label={{ position: 'left', value: 'PWL', fill: '#fb7185', fontSize: 10, fontWeight: 900, dx: -5 }} />
              </>
            )}

            {/* Volume Profile Levels - Labels moved to LEFT */}
            {showVP && currentVP && (
              <>
                <ReferenceLine yAxisId="right" y={currentVP.vah} stroke="#6366f1" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'left', value: 'VAH', fill: '#818cf8', fontSize: 10, fontWeight: 900, dx: -5 }} />
                <ReferenceLine yAxisId="right" y={currentVP.poc} stroke="#6366f1" strokeWidth={2} label={{ position: 'left', value: 'VPOC', fill: '#818cf8', fontSize: 10, fontWeight: 900, dx: -5 }} />
                <ReferenceLine yAxisId="right" y={currentVP.val} stroke="#6366f1" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'left', value: 'VAL', fill: '#818cf8', fontSize: 10, fontWeight: 900, dx: -5 }} />
                {currentVP.hvn_nodes.map((hvn, i) => (
                  <ReferenceLine yAxisId="right" key={`hvn-${i}`} y={hvn} stroke="#10b981" strokeWidth={0.75} strokeDasharray="8 4 1 4" strokeOpacity={0.8} />
                ))}
                {currentVP.lvn_nodes.map((lvn, i) => (
                  <ReferenceLine yAxisId="right" key={`lvn-${i}`} y={lvn} stroke="#f43f5e" strokeWidth={0.75} strokeDasharray="8 4 1 4" strokeOpacity={0.8} />
                ))}
              </>
            )}

            {showVWAP && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="vwap" 
                stroke="#fbbf24" 
                strokeWidth={2} 
                dot={false} 
                animationDuration={500}
                strokeDasharray="5 5"
              />
            )}

            {showEMA && (
              <>
                <Line yAxisId="right" type="monotone" dataKey="ema20" stroke="#22d3ee" strokeWidth={1.5} dot={false} animationDuration={600} />
                <Line yAxisId="right" type="monotone" dataKey="ema50" stroke="#818cf8" strokeWidth={1.5} dot={false} animationDuration={700} />
                <Line yAxisId="right" type="monotone" dataKey="ema200" stroke="#e879f9" strokeWidth={2} dot={false} animationDuration={800} />
              </>
            )}

            {showOHLC && (
              <>
                <Bar 
                  yAxisId="right"
                  dataKey={(d: any) => [d.low, d.high]} 
                  fill="#475569" 
                  barSize={1} 
                  isAnimationActive={false}
                  tooltipType="none"
                />
                <Bar 
                  yAxisId="right"
                  dataKey={(d: any) => [d.open, d.close]} 
                  isAnimationActive={true}
                  barSize={8}
                >
                  {sessionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={(entry.close || 0) >= (entry.open || 0) ? '#10b981' : '#f43f5e'} 
                      stroke={(entry.close || 0) >= (entry.open || 0) ? '#34d399' : '#fb7185'}
                      strokeWidth={0.5}
                    />
                  ))}
                </Bar>
              </>
            )}

            <Area 
              yAxisId="right"
              type="stepAfter" 
              dataKey="dpoc" 
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorDpoc)"
              dot={false}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#6366f1' }}
              animationDuration={1000}
            />
            
            {/* Fix: Removed 'backgroundColor' which is not supported in ReferenceLine label object */}
            <ReferenceLine 
              yAxisId="right"
              y={currentPrice} 
              stroke="#f43f5e" 
              strokeWidth={2}
              label={{ 
                value: `LTP: ${currentPrice.toFixed(1)}`, 
                fill: '#fff', 
                fontSize: 12, 
                position: 'insideRight',
                fontWeight: '900',
                dy: -10
              }} 
            />

            <Brush 
              dataKey="time" 
              height={40} 
              stroke="#1e293b" 
              fill="#020617"
              travellerWidth={15}
            >
              <ComposedChart>
                <Area type="monotone" dataKey="dpoc" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
              </ComposedChart>
            </Brush>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MigrationChart;
