
import React from 'react';
import { ProfileSet } from '../types';

interface ProfileVisualizerProps {
  tpo: {
    current_poc: number;
    current_vah: number;
    current_val: number;
  };
  volume: ProfileSet;
  ib: {
    ib_high: number;
    ib_low: number;
    current_close: number;
  };
  premarket: {
    asia_high: number;
    asia_low: number;
    london_high: number;
    london_low: number;
    previous_day_high: number;
    previous_day_low: number;
  };
}

const ProfileVisualizer: React.FC<ProfileVisualizerProps> = ({ tpo, volume, ib, premarket }) => {
  // Hardened data safety to prevent NaN coordinates
  const safeNum = (v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const min = Math.min(
    safeNum(volume?.low), 
    safeNum(ib?.ib_low), 
    safeNum(tpo?.current_val), 
    safeNum(premarket?.asia_low), 
    safeNum(premarket?.london_low), 
    safeNum(premarket?.previous_day_low)
  ) - 40;
  
  const max = Math.max(
    safeNum(volume?.high), 
    safeNum(ib?.ib_high), 
    safeNum(tpo?.current_vah), 
    safeNum(premarket?.asia_high), 
    safeNum(premarket?.london_high), 
    safeNum(premarket?.previous_day_high)
  ) + 40;
  
  const range = Math.max(1, max - min);

  const getPos = (price: number) => {
    return ((max - safeNum(price)) / range) * 100;
  };

  const getH = (h: number, l: number) => {
    return Math.max(2, ((safeNum(h) - safeNum(l)) / range) * 100);
  };

  return (
    <div className="relative h-full min-h-[400px] bg-slate-950/60 rounded-[2rem] overflow-hidden border border-slate-800/80 shadow-2xl group p-4">
      {/* Dynamic Grid */}
      {[0.1, 0.25, 0.5, 0.75, 0.9].map(p => (
        <div 
          key={p} 
          className="absolute w-full border-t border-slate-800/30 left-0" 
          style={{ top: `${p * 100}%` }}
        />
      ))}

      {/* Extreme Historical Ticks (Left) */}
      <div className="absolute left-1 h-full w-4 flex flex-col justify-between py-2 z-0 opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="absolute w-full h-0.5 bg-slate-600 rounded-full" style={{ top: `${getPos(premarket.previous_day_high)}%` }} />
        <div className="absolute w-full h-0.5 bg-slate-600 rounded-full" style={{ top: `${getPos(premarket.previous_day_low)}%` }} />
      </div>

      {/* Globex Ticks (Right) */}
      <div className="absolute right-1 h-full w-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="absolute w-full h-0.5 bg-amber-500/60 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ top: `${getPos(premarket.asia_high)}%` }} />
        <div className="absolute w-full h-0.5 bg-amber-500/60 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ top: `${getPos(premarket.asia_low)}%` }} />
        <div className="absolute w-full h-0.5 bg-sky-400/60 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" style={{ top: `${getPos(premarket.london_high)}%` }} />
        <div className="absolute w-full h-0.5 bg-sky-400/60 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" style={{ top: `${getPos(premarket.london_low)}%` }} />
      </div>

      {/* IB Band */}
      <div 
        className="absolute left-6 w-3 bg-amber-500/10 border-x border-amber-500/40 rounded-full"
        style={{ 
          top: `${getPos(ib.ib_high)}%`, 
          height: `${getH(ib.ib_high, ib.ib_low)}%` 
        }}
      />

      {/* Volume VA Column */}
      <div 
        className="absolute left-1/4 w-24 bg-indigo-500/10 border-x border-indigo-500/30 rounded-3xl"
        style={{ 
          top: `${getPos(volume.vah)}%`, 
          height: `${getH(volume.vah, volume.val)}%` 
        }}
      >
        <div className="absolute w-full h-px bg-indigo-500/20 top-1/2" />
      </div>

      {/* Volume POC Neon */}
      <div 
        className="absolute left-[15%] w-[35%] h-1 bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,1)] z-10 rounded-full"
        style={{ top: `${getPos(volume.poc)}%` }}
      />

      {/* TPO VA Column */}
      <div 
        className="absolute right-1/4 w-24 bg-slate-400/5 border-x border-slate-700/20 rounded-3xl"
        style={{ 
          top: `${getPos(tpo.current_vah)}%`, 
          height: `${getH(tpo.current_vah, tpo.current_val)}%` 
        }}
      />

      {/* TPO POC Marker */}
      <div 
        className="absolute right-[15%] w-[35%] h-1 bg-slate-500/60 z-10 rounded-full border border-slate-400/20"
        style={{ top: `${getPos(tpo.current_poc)}%` }}
      />

      {/* Real-time Price Engine Marker */}
      <div 
        className="absolute left-0 w-full flex items-center z-20 pointer-events-none"
        style={{ top: `${getPos(ib.current_close)}%` }}
      >
        <div className="h-px flex-1 bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
        <div className="bg-rose-600 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-2xl text-white border border-rose-400/30 transform -translate-y-1/2">
          LIVE: {safeNum(ib.current_close).toFixed(1)}
        </div>
      </div>

      {/* Semantic Labels */}
      <div className="absolute top-6 left-8 text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic">Market_Structure_Visualizer</div>
      <div className="absolute bottom-6 left-1/4 -translate-x-1/2 text-[9px] font-black text-indigo-500/80 uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded-lg">Vol VA</div>
      <div className="absolute bottom-6 right-1/4 translate-x-1/2 text-[9px] font-black text-slate-500/80 uppercase tracking-widest bg-slate-500/5 px-2 py-1 rounded-lg">TPO VA</div>
    </div>
  );
};

export default ProfileVisualizer;
