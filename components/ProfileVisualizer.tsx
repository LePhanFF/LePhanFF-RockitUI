
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
  // We normalize everything relative to the full session range including historical extremes
  const min = Math.min(
    volume.low, 
    ib.ib_low, 
    tpo.current_val, 
    premarket.asia_low, 
    premarket.london_low, 
    premarket.previous_day_low
  ) - 40;
  
  const max = Math.max(
    volume.high, 
    ib.ib_high, 
    tpo.current_vah, 
    premarket.asia_high, 
    premarket.london_high, 
    premarket.previous_day_high
  ) + 40;
  
  const range = max - min;

  const getPos = (price: number) => {
    return ((max - price) / range) * 100;
  };

  return (
    <div className="relative h-[350px] bg-slate-950/40 rounded-xl overflow-hidden border border-slate-800/60 shadow-inner group">
      {/* Grid Lines */}
      {[0.2, 0.4, 0.6, 0.8].map(p => (
        <div 
          key={p} 
          className="absolute w-full border-t border-slate-800/20" 
          style={{ top: `${p * 100}%` }}
        />
      ))}

      {/* Historical Side Ticks (Left Side) */}
      <div className="absolute left-0.5 h-full w-4 flex flex-col justify-between py-1 z-0 opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="absolute w-full h-px bg-slate-400" style={{ top: `${getPos(premarket.previous_day_high)}%` }} />
        <div className="absolute w-full h-px bg-slate-400" style={{ top: `${getPos(premarket.previous_day_low)}%` }} />
      </div>

      {/* Asia/London Markers (Right Side) */}
      <div className="absolute right-0.5 h-full w-4 z-0 opacity-30 group-hover:opacity-100 transition-opacity">
        <div className="absolute w-full h-px bg-amber-500" style={{ top: `${getPos(premarket.asia_high)}%` }} />
        <div className="absolute w-full h-px bg-amber-500" style={{ top: `${getPos(premarket.asia_low)}%` }} />
        <div className="absolute w-full h-px bg-sky-400" style={{ top: `${getPos(premarket.london_high)}%` }} />
        <div className="absolute w-full h-px bg-sky-400" style={{ top: `${getPos(premarket.london_low)}%` }} />
      </div>

      {/* IB Range Band */}
      <div 
        className="absolute left-1 w-2 bg-amber-500/10 border-r border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
        style={{ 
          top: `${getPos(ib.ib_high)}%`, 
          height: `${Math.max(2, ((ib.ib_high - ib.ib_low) / range) * 100)}%` 
        }}
      />

      {/* Volume Value Area (VA) */}
      <div 
        className="absolute left-6 w-14 bg-indigo-500/10 border-x border-indigo-500/20 flex flex-col justify-between"
        style={{ 
          top: `${getPos(volume.vah)}%`, 
          height: `${Math.max(2, ((volume.vah - volume.val) / range) * 100)}%` 
        }}
      >
        <div className="w-full h-px bg-indigo-500/20"></div>
        <div className="w-full h-px bg-indigo-500/20"></div>
      </div>

      {/* Volume POC */}
      <div 
        className="absolute left-4 w-18 h-0.5 bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.7)] z-10"
        style={{ top: `${getPos(volume.poc)}%` }}
      />

      {/* TPO VA Band */}
      <div 
        className="absolute right-6 w-14 bg-slate-500/5 border-x border-slate-600/20"
        style={{ 
          top: `${getPos(tpo.current_vah)}%`, 
          height: `${Math.max(2, ((tpo.current_vah - tpo.current_val) / range) * 100)}%` 
        }}
      />

      {/* TPO POC */}
      <div 
        className="absolute right-4 w-18 h-px bg-slate-400/60 z-10"
        style={{ top: `${getPos(tpo.current_poc)}%` }}
      />

      {/* Current Price Marker */}
      <div 
        className="absolute left-0 w-full flex items-center z-20 pointer-events-none"
        style={{ top: `${getPos(ib.current_close)}%` }}
      >
        <div className="h-px flex-1 bg-rose-500/40"></div>
        <div className="bg-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg text-white border border-rose-400/20">
          {ib.current_close.toFixed(1)}
        </div>
      </div>

      {/* Vertical Labels */}
      <div className="absolute top-2 left-3 text-[8px] font-black text-slate-700 uppercase tracking-widest">Market Profile</div>
      <div className="absolute bottom-2 left-3 text-[8px] font-black text-amber-500/60 uppercase">IB</div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black text-indigo-500/60 uppercase">Vol VA</div>
      <div className="absolute bottom-2 right-3 text-[8px] font-black text-slate-500/60 uppercase">TPO VA</div>
    </div>
  );
};

export default ProfileVisualizer;
