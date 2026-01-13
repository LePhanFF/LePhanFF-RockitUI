
import React, { useMemo, useState } from 'react';
import TPOChart from '../TPOChart';
import { AlignJustify, AlertOctagon, ArrowUpFromLine, ArrowDownFromLine, BoxSelect, Clock, Copy, ClipboardCheck } from 'lucide-react';

interface TPOTabProps {
  tpo: any;
  vol: any;
  ib: any;
  snapshotTime: string;
  allSnapshots: any[];
}

const TPOTab: React.FC<TPOTabProps> = ({ tpo, vol, ib, snapshotTime, allSnapshots }) => {
  const [timeframe, setTimeframe] = useState<'30m' | '5m'>('30m');
  const [copied, setCopied] = useState(false);
  
  // Filter history up to current snapshot time
  const historyUpToNow = useMemo(() => {
    if (!allSnapshots || allSnapshots.length === 0) return [];
    // Find index of current snapshot
    const idx = allSnapshots.findIndex(s => s.input?.current_et_time === snapshotTime);
    if (idx === -1) return allSnapshots;
    return allSnapshots.slice(0, idx + 1);
  }, [allSnapshots, snapshotTime]);

  const hasPoorHigh = tpo?.poor_high === 1 || tpo?.poor_high === true;
  const hasPoorLow = tpo?.poor_low === 1 || tpo?.poor_low === true;
  const singlePrintsUp = tpo?.single_prints_above_vah || 0;
  const singlePrintsDown = tpo?.single_prints_below_val || 0;

  const handleCopy = () => {
    const text = `
**TPO Statistics - ${snapshotTime}**

* **Structure Anomalies:**
  - Poor High: ${hasPoorHigh ? 'DETECTED' : 'CLEAN'}
  - Poor Low: ${hasPoorLow ? 'DETECTED' : 'CLEAN'}

* **Single Prints:**
  - Above VAH: ${singlePrintsUp} Ticks
  - Below VAL: ${singlePrintsDown} Ticks

* **Profile Values:**
  - POC: ${tpo?.current_poc}
  - VAH: ${tpo?.current_vah}
  - VAL: ${tpo?.current_val}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 gap-4 relative">
        <button 
            onClick={handleCopy}
            className={`absolute top-0 right-0 p-1.5 rounded-lg transition-all z-20 ${
                copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
            title="Copy TPO Stats"
        >
            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* TPO Intelligence Panel */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl shrink-0 mt-2">
             <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                    <BoxSelect className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Structure Intelligence</span>
                </div>
                
                {/* Timeframe Toggles */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 mr-8">
                    <button 
                        onClick={() => setTimeframe('5m')}
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                            timeframe === '5m' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        5m
                    </button>
                    <button 
                        onClick={() => setTimeframe('30m')}
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                            timeframe === '30m' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        30m
                    </button>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 {/* Poor Structure */}
                 <div className="space-y-2">
                     <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Poor High</span>
                         {hasPoorHigh ? (
                             <span className="text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" /> DETECTED
                             </span>
                         ) : (
                             <span className="text-[9px] font-mono text-slate-600">CLEAN</span>
                         )}
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Poor Low</span>
                         {hasPoorLow ? (
                             <span className="text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" /> DETECTED
                             </span>
                         ) : (
                             <span className="text-[9px] font-mono text-slate-600">CLEAN</span>
                         )}
                     </div>
                 </div>

                 {/* Single Prints */}
                 <div className="space-y-2 border-l border-slate-800/50 pl-4">
                     <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">SP Above</span>
                         <span className={`text-[10px] font-mono font-black ${singlePrintsUp > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {singlePrintsUp} Ticks
                         </span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">SP Below</span>
                         <span className={`text-[10px] font-mono font-black ${singlePrintsDown > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                            {singlePrintsDown} Ticks
                         </span>
                     </div>
                 </div>
             </div>
        </div>

        {/* TPO Chart Container */}
        <div className="flex-1 min-h-[400px] bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-inner p-1">
            <TPOChart 
                tpoProfile={tpo}
                volumeProfile={vol?.current_session}
                ibLevels={{ high: ib?.ib_high, low: ib?.ib_low }}
                history={historyUpToNow}
                currentPrice={Number(ib?.current_close)}
                timeframe={timeframe}
            />
        </div>
    </div>
  );
};

export default TPOTab;
