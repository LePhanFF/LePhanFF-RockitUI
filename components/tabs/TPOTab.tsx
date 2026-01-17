
import React, { useMemo, useState, useRef } from 'react';
import TPOChart from '../TPOChart';
import { AlignJustify, AlertOctagon, ArrowUpFromLine, ArrowDownFromLine, BoxSelect, Clock, Copy, ClipboardCheck, Camera, Check } from 'lucide-react';

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
  const [imageCopied, setImageCopied] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
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

  const handleCopyImage = async () => {
    if (!chartContainerRef.current) return;
    const originalSvg = chartContainerRef.current.querySelector('.tpo-main-svg');
    if (!originalSvg) return;

    try {
        // 1. Get Dimensions
        // Use clientWidth for the width since TPOChart uses width="100%"
        const width = chartContainerRef.current.clientWidth;
        // Use the explicit height attribute from the SVG (calculated by TPOChart based on rows)
        const heightAttr = originalSvg.getAttribute('height');
        const height = heightAttr ? parseFloat(heightAttr) : chartContainerRef.current.scrollHeight;

        // 2. Canvas Setup
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 3. Draw Background (Dark Slate / Slate-950)
        ctx.fillStyle = "#0f172a"; 
        ctx.fillRect(0, 0, width, height);

        // 4. Prepare SVG
        const svgClone = originalSvg.cloneNode(true) as SVGElement;
        
        // Explicitly set pixel dimensions on the clone to ensure it renders correctly in the blob
        svgClone.setAttribute("width", `${width}`);
        svgClone.setAttribute("height", `${height}`);
        svgClone.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        
        // 5. Serialize
        const svgData = new XMLSerializer().serializeToString(svgClone);
        
        // 6. Render to Image -> Canvas -> Blob
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
        img.onerror = (e) => {
            console.error("SVG Image Load Error", e);
            URL.revokeObjectURL(url);
        };
        img.src = url;

    } catch (e) {
        console.error("Snapshot error:", e);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 gap-4 relative">
        {/* Toolbar */}
        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800 shrink-0">
             {/* Timeframe Toggles */}
             <div className="flex gap-2">
                <button 
                    onClick={() => setTimeframe('5m')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                        timeframe === '5m' ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                >
                    5m
                </button>
                <button 
                    onClick={() => setTimeframe('30m')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                        timeframe === '30m' ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                >
                    30m
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button 
                    onClick={handleCopyImage}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        imageCopied 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                            : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-white hover:border-slate-600'
                    }`}
                    title="Copy Full Chart Image"
                >
                    {imageCopied ? <Check className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{imageCopied ? 'Copied' : 'Snap'}</span>
                </button>
                <button 
                    onClick={handleCopy}
                    className={`p-1.5 rounded-lg border transition-all ${
                        copied 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
                            : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-white hover:border-slate-600'
                    }`}
                    title="Copy TPO Stats Text"
                >
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
