
import React, { useMemo, useEffect, useRef } from 'react';
import { MarketSnapshot, ProfileSet } from '../types';

interface ProfileLadderProps {
  allSnapshots: MarketSnapshot[];
  currentSnapshot: MarketSnapshot;
  showTPO: boolean;
  showVolume: boolean;
  resolution: '5m' | '30m';
  profileData: {
    tpo: { poc: number; vah: number; val: number };
    volume: ProfileSet;
  };
}

const ProfileLadder: React.FC<ProfileLadderProps> = ({ 
  allSnapshots, 
  currentSnapshot, 
  showTPO, 
  showVolume,
  resolution,
  profileData 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { poc, vah, val } = profileData.tpo;

  // Strict Letter Set (Industry Standard)
  const TPO_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const { sessionHigh, sessionLow, openPrice } = useMemo(() => {
    if (!allSnapshots.length) return { sessionHigh: 0, sessionLow: 0, openPrice: 0 };
    
    let high = -Infinity;
    let low = Infinity;
    const firstOpen = allSnapshots[0]?.input?.intraday?.ib?.current_open || 0;

    allSnapshots.forEach(s => {
      const h = s.input.intraday.ib.current_high;
      const l = s.input.intraday.ib.current_low;
      if (h > high) high = h;
      if (l < low) low = l;
    });

    return { 
      sessionHigh: high + 1, 
      sessionLow: low - 1,
      openPrice: firstOpen
    };
  }, [allSnapshots]);

  const ladderData = useMemo(() => {
    const range = sessionHigh - sessionLow;
    if (range <= 0 || isNaN(range)) return [];

    const step = range > 500 ? 2.0 : range > 200 ? 1.0 : 0.5;
    const prices: number[] = [];
    const startPrice = Math.ceil(sessionHigh / step) * step;
    const endPrice = Math.floor(sessionLow / step) * step;

    for (let p = startPrice; p >= endPrice; p -= step) {
      prices.push(p);
    }

    const getLetter = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const totalMins = h * 60 + m;
      const startMins = 9 * 60 + 30;
      const bracketSize = resolution === '5m' ? 5 : 30;
      const period = Math.floor((totalMins - startMins) / bracketSize);
      // Loop alphabet if we exceed 26 periods (common in high-res profiles)
      return TPO_LETTERS[period % TPO_LETTERS.length];
    };

    const getPeriodIndex = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const totalMins = h * 60 + m;
      const startMins = 9 * 60 + 30;
      return Math.floor((totalMins - startMins) / (resolution === '5m' ? 5 : 30));
    };

    return prices.map(price => {
      const tpoMap = new Map<string, number>();
      let volumeWeight = 0;

      allSnapshots.forEach(s => {
        const h = s.input.intraday.ib.current_high;
        const l = s.input.intraday.ib.current_low;
        
        if (price >= l && price <= h) {
          const char = getLetter(s.input.current_et_time);
          const periodIdx = getPeriodIndex(s.input.current_et_time);
          // Only store the earliest occurrence of a bracket at this price for TPO logic
          if (!tpoMap.has(char)) {
            tpoMap.set(char, periodIdx);
          }
          volumeWeight += 1;
        }
      });

      if (profileData.volume.hvn_nodes?.some(n => Math.abs(n - price) <= step)) {
        volumeWeight += 10;
      }

      return {
        price,
        isPOC: Math.abs(price - poc) <= step / 2,
        isVA: price <= vah && price >= val,
        isOpen: Math.abs(price - openPrice) <= step / 2,
        // Sort letters by their actual chronological appearance
        letters: Array.from(tpoMap.entries())
          .sort((a, b) => a[1] - b[1])
          .map(entry => ({ char: entry[0], idx: entry[1] })),
        volumeWeight
      };
    });
  }, [allSnapshots, sessionHigh, sessionLow, poc, vah, val, profileData.volume, openPrice, resolution]);

  const maxVol = Math.max(...ladderData.map(d => d.volumeWeight), 1);

  useEffect(() => {
    if (scrollContainerRef.current && ladderData.length > 0) {
      const currentPrice = currentSnapshot.input.intraday.ib.current_close;
      const targetIndex = ladderData.findIndex(d => d.price <= currentPrice);
      if (targetIndex !== -1) {
        scrollContainerRef.current.scrollTop = (targetIndex * 22) - (scrollContainerRef.current.clientHeight / 2);
      }
    }
  }, [currentSnapshot.input.intraday.ib.current_close, ladderData.length]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono select-none shadow-2xl">
      <div className="grid grid-cols-12 gap-0 border-b border-slate-800 bg-slate-900 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center shrink-0">
        <div className="col-span-2 border-r border-slate-800">Price</div>
        <div className="col-span-8 border-r border-slate-800">TPO Prints ({resolution})</div>
        <div className="col-span-2">Volume</div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth bg-slate-950/40">
        {ladderData.map((row, idx) => {
          const isCurrentPrice = Math.abs(row.price - currentSnapshot.input.intraday.ib.current_close) < 0.5;
          return (
            <div 
              key={idx} 
              className={`grid grid-cols-12 gap-0 border-b border-slate-900/40 text-[10px] transition-colors relative group ${
                row.isPOC ? 'bg-indigo-500/15' : row.isVA ? 'bg-indigo-500/5' : ''
              }`}
              style={{ height: '22px' }}
            >
              <div className={`col-span-2 flex items-center justify-center border-r border-slate-800/60 font-black ${
                row.isPOC ? 'text-indigo-400' : row.isOpen ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {row.price.toFixed(1)}
                {isCurrentPrice && <div className="absolute left-0 w-1 h-full bg-rose-500 z-20" />}
              </div>

              <div className="col-span-8 flex items-center px-4 border-r border-slate-800/60 overflow-hidden whitespace-nowrap gap-0.5">
                {showTPO ? row.letters.map((l, i) => (
                  <span key={i} className={`font-black text-[11px] ${
                    l.idx < (resolution === '5m' ? 12 : 2) ? 'text-cyan-400' : 
                    l.idx < (resolution === '5m' ? 36 : 6) ? 'text-indigo-400' : 
                    l.idx < (resolution === '5m' ? 60 : 10) ? 'text-amber-400' : 
                    'text-rose-400'
                  }`}>
                    {l.char}
                  </span>
                )) : (
                  <div className="w-full flex gap-0.5 opacity-20">
                    {row.letters.map((_, i) => <div key={i} className="w-1 h-3 bg-indigo-500/40" />)}
                  </div>
                )}
              </div>

              <div className="col-span-2 flex items-center px-2">
                {showVolume && (
                  <div 
                    className={`h-2 rounded-sm transition-all duration-700 ${row.isPOC ? 'bg-indigo-400' : 'bg-slate-700'}`}
                    style={{ width: `${(row.volumeWeight / maxVol) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border-t border-slate-800 p-3 flex justify-between items-center px-6 shrink-0">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">POC</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Open</span>
            </div>
         </div>
         <span className="text-[9px] font-black text-slate-600 uppercase italic">Resolution: {resolution} Intervals</span>
      </div>
    </div>
  );
};

export default ProfileLadder;
