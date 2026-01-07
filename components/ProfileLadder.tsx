
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

  const TPO_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const { sessionHigh, sessionLow, openPrice } = useMemo(() => {
    if (!allSnapshots.length) return { sessionHigh: 0, sessionLow: 0, openPrice: 0 };
    
    let high = -Infinity;
    let low = Infinity;
    const firstOpen = allSnapshots[0]?.input?.intraday?.ib?.current_open || 0;

    allSnapshots.forEach(s => {
      const h = s.input?.intraday?.ib?.current_high || 0;
      const l = s.input?.intraday?.ib?.current_low || 0;
      if (h > high) high = h;
      if (l < low) low = l;
    });

    if (high === -Infinity) high = currentSnapshot.input.intraday.ib.current_high;
    if (low === Infinity) low = currentSnapshot.input.intraday.ib.current_low;

    return { 
      sessionHigh: high + 2, 
      sessionLow: low - 2,
      openPrice: firstOpen
    };
  }, [allSnapshots, currentSnapshot]);

  const ladderData = useMemo(() => {
    const range = sessionHigh - sessionLow;
    if (range <= 0 || isNaN(range)) return [];

    const step = range > 500 ? 2.5 : range > 200 ? 1.0 : 0.5;
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
      return TPO_LETTERS[Math.max(0, period % TPO_LETTERS.length)];
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
        const h = s.input?.intraday?.ib?.current_high || 0;
        const l = s.input?.intraday?.ib?.current_low || 0;
        
        if (price >= l && price <= h) {
          const char = getLetter(s.input.current_et_time);
          const periodIdx = getPeriodIndex(s.input.current_et_time);
          if (!tpoMap.has(char)) {
            tpoMap.set(char, periodIdx);
          }
          volumeWeight += 1;
        }
      });

      if (profileData.volume.hvn_nodes?.some(n => Math.abs(n - price) <= step)) {
        volumeWeight += 15;
      }

      return {
        price,
        isPOC: Math.abs(price - poc) <= step / 2,
        isVA: price <= vah && price >= val,
        isOpen: Math.abs(price - openPrice) <= step / 2,
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
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800/60 rounded-2xl overflow-hidden font-mono select-none shadow-2xl">
      <div className="grid grid-cols-12 gap-0 border-b border-slate-800 bg-slate-900/80 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-center shrink-0">
        <div className="col-span-2 border-r border-slate-800/60 flex items-center justify-center">Price</div>
        <div className="col-span-7 border-r border-slate-800/60 flex items-center justify-center">Distribution Profile ({resolution})</div>
        <div className="col-span-3 flex items-center justify-center">Volume Profile</div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth bg-slate-950/20">
        {ladderData.map((row, idx) => {
          const isCurrentPrice = Math.abs(row.price - currentSnapshot.input.intraday.ib.current_close) < 0.5;
          return (
            <div 
              key={idx} 
              className={`grid grid-cols-12 gap-0 border-b border-slate-900/30 text-[10px] transition-colors relative group ${
                row.isPOC ? 'bg-indigo-500/15' : row.isVA ? 'bg-indigo-500/5' : ''
              }`}
              style={{ height: '22px' }}
            >
              {/* PRICE COLUMN */}
              <div className={`col-span-2 flex items-center justify-center border-r border-slate-800/40 font-black relative ${
                row.isPOC ? 'text-indigo-400' : row.isOpen ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {row.price.toFixed(1)}
                
                {row.isOpen && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.9)]" title="Session Open" />
                )}
                {isCurrentPrice && (
                  <div className="absolute left-0 w-1 h-full bg-rose-500 shadow-[2px_0_12px_rgba(244,63,94,0.7)] z-20" />
                )}
              </div>

              {/* TPO PROFILE COLUMN */}
              <div className="col-span-7 flex items-center justify-center px-2 border-r border-slate-800/40 overflow-hidden whitespace-nowrap gap-0.5">
                {showTPO ? (
                  <div className="flex gap-0.5 items-center justify-center w-full">
                    {row.letters.map((l, i) => (
                      <span key={i} className={`font-black text-[11px] leading-none ${
                        l.idx < (resolution === '5m' ? 12 : 2) ? 'text-cyan-400' : 
                        l.idx < (resolution === '5m' ? 36 : 6) ? 'text-indigo-400' : 
                        l.idx < (resolution === '5m' ? 60 : 10) ? 'text-amber-400' : 
                        'text-rose-400'
                      }`}>
                        {l.char}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="w-full flex justify-center gap-0.5 opacity-20 px-2">
                    {row.letters.map((_, i) => <div key={i} className="w-1.5 h-3 bg-indigo-500/40 rounded-full" />)}
                  </div>
                )}
              </div>

              {/* VOLUME COLUMN */}
              <div className="col-span-3 flex items-center px-4 bg-slate-900/10">
                {showVolume && (
                  <div className="w-full bg-slate-800/30 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${row.isPOC ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-slate-600'}`}
                      style={{ width: `${(row.volumeWeight / maxVol) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 pointer-events-none transition-colors" />
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex justify-between items-center px-10 shrink-0">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
               <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Point of Control</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initial Open</span>
            </div>
         </div>
         <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-0.5">Vertical Expansion</span>
            <span className="text-sm font-mono font-black text-indigo-400 tracking-tighter">{(sessionHigh - sessionLow).toFixed(1)} pts</span>
         </div>
      </div>
    </div>
  );
};

export default ProfileLadder;
