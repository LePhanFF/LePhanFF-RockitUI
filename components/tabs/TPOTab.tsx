
import React, { useMemo, useState, useRef } from 'react';
import TPOChart from '../TPOChart';
import TPOAnalyzer from '../TPOAnalyzer';
import { AlignJustify, AlertOctagon, ArrowUpFromLine, ArrowDownFromLine, BoxSelect, Clock, Copy, ClipboardCheck, Camera, Check, Brain } from 'lucide-react';
import { generateTPOData } from '../../utils/tpoHelpers';

interface TPOTabProps {
  tpo: any;
  vol: any;
  ib: any;
  snapshotTime: string;
  allSnapshots: any[];
  tpoAnalysisContent?: string;
}

const TPOTab: React.FC<TPOTabProps> = ({ tpo, vol, ib, snapshotTime, allSnapshots, tpoAnalysisContent }) => {
  const [timeframe, setTimeframe] = useState<'30m' | '5m'>('30m');
  const [viewMode, setViewMode] = useState<'chart' | 'analyze'>('chart');
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter history:
  // 1. Up to current snapshot time (Point-in-Time)
  // 2. Starting strictly from 09:30 (RTH Open)
  const historyUpToNow = useMemo(() => {
    if (!allSnapshots || allSnapshots.length === 0) return [];
    
    // Find cutoff index for current time
    const idx = allSnapshots.findIndex(s => s.input?.current_et_time === snapshotTime);
    
    // Slice data up to current moment
    const sliced = (idx === -1) ? allSnapshots : allSnapshots.slice(0, idx + 1);
    
    // Filter out Pre-market (Before 09:30)
    return sliced.filter(s => s.input?.current_et_time >= "09:30");
  }, [allSnapshots, snapshotTime]);

  // Generate Data for Analyzer (Both Timeframes)
  const analyzerData = useMemo(() => {
      if (viewMode !== 'analyze') return null;
      return {
          tpo30m: generateTPOData(historyUpToNow, '30m', 0.5, { high: ib?.ib_high, low: ib?.ib_low }),
          tpo5m: generateTPOData(historyUpToNow, '5m', 0.5, { high: ib?.ib_high, low: ib?.ib_low })
      };
  }, [historyUpToNow, ib, viewMode]);

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

  const handleCopyImage = async () => {
    if (!chartContainerRef.current) return;
    const originalSvg = chartContainerRef.current.querySelector('.tpo-main-svg');
    if (!originalSvg) return;

    try {
        const width = chartContainerRef.current.clientWidth;
        const heightAttr = originalSvg.getAttribute('height');
        const height = heightAttr ? parseFloat(heightAttr) : chartContainerRef.current.scrollHeight;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = "#0f172a"; 
        ctx.fillRect(0, 0, width, height);

        const svgClone = originalSvg.cloneNode(true) as SVGElement;
        svgClone.setAttribute("width", `${width}`);
        svgClone.setAttribute("height", `${height}`);
        svgClone.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                        .then(() => {
                            setImageCopied(true);
                            setTimeout(() => setImageCopied(false), 2000);
                        })
                        .catch(err => console.error('Clipboard write failed:', err));
                }
            }, 'image/png');
        };
        img.src = url;
    } catch (e) { console.error("Snapshot error:", e); }
  };

  if (viewMode === 'analyze' && analyzerData) {
      return (
          <TPOAnalyzer 
             tpo30m={analyzerData.tpo30m}
             tpo5m={analyzerData.tpo5m}
             snapshotTime={snapshotTime}
             currentPrice={Number(ib?.current_close)}
             promptTemplate={tpoAnalysisContent}
             onBack={() => setViewMode('chart')}
          />
      );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 gap-4 relative">
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800 shrink-0">
             <div className="flex gap-2">
                <button onClick={() => setTimeframe('5m')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${timeframe === '5m' ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'}`}>5m</button>
                <button onClick={() => setTimeframe('30m')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${timeframe === '30m' ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'}`}>30m</button>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={() => setViewMode('analyze')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-500"
                >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Analyze</span>
                </button>

                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <button onClick={handleCopyImage} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${imageCopied ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-white hover:border-slate-600'}`}>
                    {imageCopied ? <Check className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleCopy} className={`p-1.5 rounded-lg border transition-all ${copied ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-white hover:border-slate-600'}`}>
                    {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>

        {/* TPO Chart Container */}
        <div ref={chartContainerRef} className="flex-1 min-h-[400px] bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-inner p-1 relative">
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
