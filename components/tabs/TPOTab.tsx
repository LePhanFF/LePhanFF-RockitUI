
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
  sessionDate: string;
}

const TPOTab: React.FC<TPOTabProps> = ({ tpo, vol, ib, snapshotTime, allSnapshots, tpoAnalysisContent, sessionDate }) => {
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
    } catch (e) { console.error("Snapshot error", e); }
  };

  if (viewMode === 'analyze' && analyzerData) {
      return (
          <TPOAnalyzer 
            tpo30m={analyzerData.tpo30m}
            tpo5m={analyzerData.tpo5m}
            snapshotTime={snapshotTime}
            currentPrice={ib?.current_close || 0}
            promptTemplate={tpoAnalysisContent}
            onBack={() => setViewMode('chart')}
            sessionDate={sessionDate}
          />
      );
  }

  return (
    <div className="h-full flex flex-col relative animate-in fade-in duration-500">
        <div className="absolute top-4 left-4 z-50 flex gap-2">
            <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-700 flex items-center shadow-xl backdrop-blur-md">
                <button onClick={() => setViewMode('chart')} className={`p-2 rounded-md transition-all ${viewMode === 'chart' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Interactive Chart">
                    <AlignJustify className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('analyze')} className={`p-2 rounded-md transition-all ${viewMode === 'analyze' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="AI Deep Scan">
                    <Brain className="w-4 h-4" />
                </button>
            </div>

            {viewMode === 'chart' && (
                <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-700 flex items-center shadow-xl backdrop-blur-md">
                    <button onClick={() => setTimeframe('30m')} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${timeframe === '30m' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>30m</button>
                    <button onClick={() => setTimeframe('5m')} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${timeframe === '5m' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>5m</button>
                </div>
            )}
        </div>

        {viewMode === 'chart' && (
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                 <button onClick={handleCopyImage} className={`p-2 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-xl transition-all ${imageCopied ? 'text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Copy Chart Image">
                    {imageCopied ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                </button>
                <button onClick={handleCopy} className={`p-2 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-xl transition-all ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Copy Stats">
                    {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        )}

        <div className="flex-1 bg-slate-900/40 rounded-3xl overflow-hidden border border-slate-800 relative shadow-inner" ref={chartContainerRef}>
            <TPOChart 
                tpoProfile={tpo}
                volumeProfile={vol?.current_session}
                ibLevels={{ high: ib?.ib_high, low: ib?.ib_low }}
                history={historyUpToNow}
                currentPrice={ib?.current_close || 0}
                timeframe={timeframe}
            />
        </div>
    </div>
  );
};

export default TPOTab;
