
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
  ReferenceArea,
  Bar,
  Cell,
  Line,
  Brush
} from 'recharts';
import { DPOCSlice, FVG } from '../types';

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
    daily_fvg: FVG[];
    "4h_fvg": FVG[];
    "1h_fvg": FVG[];
    "15min_fvg": FVG[];
    "5min_fvg": FVG[];
  };
}

const MigrationChart: React.FC<MigrationChartProps> = ({ 
  data, 
  currentPrice, 
  showOHLC, 
  showVWAP, 
  showEMA,
  showInstitutional,
  showIB,
  showProfile,
  showFVG,
  levels,
  profileLevels,
  fvgData 
}) => {
  const sessionData = useMemo(() => {
    return (data || [])
      .filter(d => {
        if (!d.time) return false;
        const [hours] = d.time.split(':').map(Number);
        return hours >= 8; // Session Focus
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data]);

  const yDomain = useMemo(() => {
    const allValues: number[] = [
      ...sessionData.map(d => d.dpoc),
      ...sessionData.map(d => d.high || d.dpoc),
      ...sessionData.map(d => d.low || d.dpoc),
      currentPrice,
    ].filter(v => typeof v === 'number' && !isNaN(v) && v !== 0);
    
    if (showInstitutional) {
      const inst = [levels.asia_high, levels.asia_low, levels.london_high, levels.london_low, levels.overnight_high, levels.overnight_low];
      allValues.push(...inst.filter(v => typeof v === 'number' && !isNaN(v) && v !== 0));
    }

    if (showIB) {
       allValues.push(...sessionData.map(d => d.ibh).filter(v => typeof v === 'number' && !isNaN(v) && v !== 0));
       allValues.push(...sessionData.map(d => d.ibl).filter(v => typeof v === 'number' && !isNaN(v) && v !== 0));
    }
    
    if (showProfile) {
      const prof = [profileLevels.vah, profileLevels.poc, profileLevels.val];
      allValues.push(...prof.filter(v => typeof v === 'number' && !isNaN(v) && v !== 0));
    }

    if (allValues.length === 0) return [0, 100];
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 20;
    return [min - padding, max + padding];
  }, [sessionData, currentPrice, levels, profileLevels, showInstitutional, showIB, showProfile]);

  const activeFvgs = useMemo(() => {
    if (!fvgData || !showFVG) return [];
    return [
      ...(fvgData["1h_fvg"] || []).map(f => ({ ...f, timeframe: '1H' })),
      ...(fvgData["15min_fvg"] || []).map(f => ({ ...f, timeframe: '15M' })),
      ...(fvgData["5min_fvg"] || []).map(f => ({ ...f, timeframe: '5M' }))
    ];
  }, [fvgData, showFVG]);

  if (sessionData.length === 0) return (
    <div className="h-full w-full flex items-center justify-center italic text-slate-700 font-black uppercase tracking-widest bg-slate-950/20">
      Awaiting Market Intelligence...
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col p-1">
      <div className="flex-1 select-none relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sessionData} margin={{ top: 10, right: 80, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDpoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.08} />
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={9} 
              fontWeight={900} 
              axisLine={false} 
              tickLine={false} 
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="right" 
              domain={yDomain} 
              stroke="#94a3b8" 
              fontSize={11} 
              fontWeight={900} 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => val.toFixed(0)} 
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}
              itemStyle={{ fontWeight: 900 }}
            />

            {showFVG && activeFvgs.map((fvg, i) => (
              <ReferenceArea 
                key={`fvg-${i}`} 
                yAxisId="right" 
                y1={fvg.bottom} 
                y2={fvg.top} 
                fill={fvg.type === 'bullish' ? '#10b981' : '#f43f5e'} 
                fillOpacity={0.5} 
                stroke={fvg.type === 'bullish' ? '#10b981' : '#f43f5e'}
                strokeOpacity={0.9}
                strokeWidth={2}
              />
            ))}

            {showInstitutional && (
              <>
                <ReferenceLine yAxisId="right" y={levels.asia_high} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: 'ASIA H', position: 'insideRight', fill: '#fbbf24', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={levels.asia_low} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: 'ASIA L', position: 'insideRight', fill: '#fbbf24', fontSize: 8, fontWeight: 900 }} />
                
                <ReferenceLine yAxisId="right" y={levels.london_high} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: 'LON H', position: 'insideRight', fill: '#38bdf8', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={levels.london_low} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: 'LON L', position: 'insideRight', fill: '#38bdf8', fontSize: 8, fontWeight: 900 }} />

                <ReferenceLine yAxisId="right" y={levels.overnight_high} stroke="#818cf8" strokeWidth={1} strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: 'ON H', position: 'insideRight', fill: '#818cf8', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={levels.overnight_low} stroke="#818cf8" strokeWidth={1} strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: 'ON L', position: 'insideRight', fill: '#818cf8', fontSize: 8, fontWeight: 900 }} />
              </>
            )}

            {showIB && (
              <>
                <Line yAxisId="right" type="stepAfter" dataKey="ibh" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} strokeOpacity={0.8} />
                <Line yAxisId="right" type="stepAfter" dataKey="ibl" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} strokeOpacity={0.8} />
                <ReferenceLine yAxisId="right" y={sessionData[sessionData.length-1]?.ibh} stroke="transparent" label={{ value: 'IBH', position: 'insideRight', fill: '#f59e0b', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={sessionData[sessionData.length-1]?.ibl} stroke="transparent" label={{ value: 'IBL', position: 'insideRight', fill: '#f59e0b', fontSize: 8, fontWeight: 900 }} />
              </>
            )}

            {showProfile && (
              <>
                <ReferenceLine yAxisId="right" y={profileLevels.vah} stroke="#a5b4fc" strokeWidth={2} strokeOpacity={0.8} label={{ value: 'VAH', position: 'insideLeft', fill: '#a5b4fc', fontSize: 9, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={profileLevels.poc} stroke="#6366f1" strokeWidth={3} strokeOpacity={0.9} label={{ value: 'POC', position: 'insideLeft', fill: '#818cf8', fontSize: 10, fontWeight: 900 }} />
                <ReferenceLine yAxisId="right" y={profileLevels.val} stroke="#a5b4fc" strokeWidth={2} strokeOpacity={0.8} label={{ value: 'VAL', position: 'insideLeft', fill: '#a5b4fc', fontSize: 9, fontWeight: 900 }} />
              </>
            )}

            {showVWAP && (
              <Line yAxisId="right" type="monotone" dataKey="vwap" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="3 3" strokeOpacity={0.9} />
            )}
            
            {showEMA && (
              <>
                <Line yAxisId="right" type="monotone" dataKey="ema20" stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="ema50" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
              </>
            )}

            {showOHLC && (
              <Bar yAxisId="right" dataKey={(d: any) => [d.open, d.close]} barSize={6}>
                {sessionData.map((e, i) => (
                  <Cell key={`cell-${i}`} fill={(e.close || 0) >= (e.open || 0) ? '#10b981' : '#f43f5e'} fillOpacity={0.8} />
                ))}
              </Bar>
            )}

            {/* DPOC Step Area - Corrected to use stepAfter for the 'Migration' look */}
            <Area 
              yAxisId="right" 
              type="stepAfter" 
              dataKey="dpoc" 
              stroke="#6366f1" 
              strokeWidth={3} 
              fill="url(#colorDpoc)" 
              dot={false} 
              isAnimationActive={false}
              connectNulls={true}
            />

            <ReferenceLine 
              yAxisId="right" 
              y={currentPrice} 
              stroke="#f43f5e" 
              strokeWidth={3} 
              label={{ 
                value: `P: ${currentPrice.toFixed(1)}`, 
                fill: '#fff', 
                fontSize: 10, 
                position: 'insideRight', 
                fontWeight: '950',
                backgroundColor: '#f43f5e',
                padding: 4
              }} 
            />

            <Brush 
              dataKey="time" 
              height={20} 
              stroke="#334155" 
              fill="#020617" 
              travellerWidth={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MigrationChart;
