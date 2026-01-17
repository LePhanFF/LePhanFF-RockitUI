
import React, { useState, useMemo, useRef } from 'react';
import { Terminal, Globe, Layers, GitCommit, LineChart, Target, Shield, Zap, Camera, Check, Magnet, MousePointer2, MoveUpRight, Square, Circle, Trash2, Type } from 'lucide-react';
import MigrationChart from './MigrationChart';
import { MarketSnapshot } from '../types';

interface ChartSectionProps {
  snapshot: MarketSnapshot;
  allSnapshots: MarketSnapshot[];
}

const ToggleButton = ({ active, onClick, icon: Icon, label, activeClass }: any) => (
  <button 
    onClick={onClick} 
    className={`p-2 rounded-lg transition-all relative group ${
      active ? activeClass : 'text-content-muted hover:text-content hover:bg-panel'
    }`}
  >
    <Icon className="w-4 h-4" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface border border-border text-content text-[9px] font-black uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border"></div>
    </div>
  </button>
);

const ChartSection: React.FC<ChartSectionProps> = ({ snapshot, allSnapshots }) => {
  const [showVWAP, setShowVWAP] = useState(true);
  const [showIB, setShowIB] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showFVG, setShowFVG] = useState(true);
  const [showGlobex, setShowGlobex] = useState(false);
  const [showEMAs, setShowEMAs] = useState(false);
  const [showDPOC, setShowDPOC] = useState(true);
  const [showComposite, setShowComposite] = useState(false); 
  const [copied, setCopied] = useState(false);

  // Drawing State
  const [activeTool, setActiveTool] = useState<'cursor' | 'line' | 'rect' | 'circle' | 'text'>('cursor');
  const [drawings, setDrawings] = useState<any[]>([]);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const input = snapshot?.input;
  const intraday = input?.intraday;
  const premarket = input?.premarket;
  const ib = intraday?.ib;
  const vol = intraday?.volume_profile;
  const tpo = intraday?.tpo_profile;
  const fvgs = intraday?.fvg_detection;
  
  // Prepare Raw Data for Chart from All Snapshots (No aggregation)
  const chartData = useMemo(() => {
      if (!allSnapshots || allSnapshots.length === 0) return [];
      
      const currentTime = snapshot?.input?.current_et_time;
      if (!currentTime) return [];

      return allSnapshots
          .filter(s => {
              const t = s.input?.current_et_time || '00:00';
              // Filter: Start at 09:30, End at selected snapshot time
              return t >= "09:30" && t <= currentTime;
          })
          .map(s => {
            const ibData = s.input?.intraday?.ib;
            const t = s.input?.current_et_time || '00:00';
            const isPostIB = t >= "10:30";
            
            // Logic for DPOC extraction - prioritizing dpoc_history as requested
            let dpoc = undefined;
            const migration = s.input?.intraday?.dpoc_migration;
            
            // 1. Try dpoc_history
            if (migration?.dpoc_history && Array.isArray(migration.dpoc_history) && migration.dpoc_history.length > 0) {
              const lastEntry = migration.dpoc_history[migration.dpoc_history.length - 1];
              if (lastEntry && typeof lastEntry.dpoc === 'number') {
                  dpoc = lastEntry.dpoc;
              }
            }
            
            // 2. Try dpoc_slices (Fallback)
            if (dpoc === undefined && migration?.dpoc_slices && Array.isArray(migration.dpoc_slices) && migration.dpoc_slices.length > 0) {
              const lastSlice = migration.dpoc_slices[migration.dpoc_slices.length - 1];
              if (lastSlice && typeof lastSlice.dpoc === 'number') {
                  dpoc = lastSlice.dpoc;
              }
            }

            // 3. Try Volume Profile POC
            if (dpoc === undefined) {
              dpoc = s.input?.intraday?.volume_profile?.current_session?.poc;
            }

            // 4. Fallback to Close
            if (dpoc === undefined || dpoc === null || dpoc === 0) {
              dpoc = ibData?.current_close;
            }

            // Extract Standard Volume Profile POC for Historical Plotting
            // REMAPPED to TPO POC as requested
            const rawVolPoc = s.input?.intraday?.tpo_profile?.current_poc;
            
            return {
                time: t,
                open: ibData?.current_open || 0,
                high: ibData?.current_high || 0,
                low: ibData?.current_low || 0,
                close: ibData?.current_close || 0,
                volume: ibData?.current_volume || 0,
                vwap: ibData?.current_vwap || 0,
                ema20: ibData?.ema20 || 0,
                ema50: ibData?.ema50 || 0,
                ema200: ibData?.ema200 || 0,
                dpoc: dpoc || 0,
                vol_poc: typeof rawVolPoc === 'number' ? rawVolPoc : null, // Mapped to TPO POC
                ibh: isPostIB ? (ibData?.ib_high || null) : null,
                ibl: isPostIB ? (ibData?.ib_low || null) : null
            };
        }).sort((a, b) => a.time.localeCompare(b.time));
  }, [allSnapshots, snapshot]);

  const handleCopyChart = async () => {
      if (!chartContainerRef.current) return;
      
      const width = chartContainerRef.current.clientWidth;
      const height = chartContainerRef.current.clientHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background
      ctx.fillStyle = "#020617"; // Match Theme BG (slate-950)
      ctx.fillRect(0, 0, width, height);

      // 2. Find SVGs
      const svgs = Array.from(chartContainerRef.current.querySelectorAll('svg'));
      
      // Identify Chart SVG vs Drawing SVG
      // Recharts SVG usually has 'recharts-surface' class
      const chartSvg = svgs.find(s => s.classList.contains('recharts-surface'));
      const drawingSvg = svgs.find(s => s !== chartSvg);

      const drawSvg = (svgElement: SVGSVGElement) => {
          return new Promise<void>((resolve) => {
              try {
                  const clone = svgElement.cloneNode(true) as SVGSVGElement;
                  clone.setAttribute('width', `${width}`);
                  clone.setAttribute('height', `${height}`);
                  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                  
                  // Ensure overflow visible for drawing layer if needed
                  if (svgElement === drawingSvg) {
                      clone.style.overflow = 'visible';
                  }

                  const svgData = new XMLSerializer().serializeToString(clone);
                  const img = new Image();
                  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  
                  img.onload = () => {
                      ctx.drawImage(img, 0, 0, width, height);
                      URL.revokeObjectURL(url);
                      resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = url;
              } catch (e) {
                  console.warn("SVG Draw Failed", e);
                  resolve();
              }
          });
      };

      // Draw Chart then Drawings
      if (chartSvg) await drawSvg(chartSvg);
      if (drawingSvg) await drawSvg(drawingSvg);

      // 3. Write to Clipboard
      try {
          canvas.toBlob((blob) => {
              if (blob) {
                  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                      .then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                      })
                      .catch(err => console.error("Clipboard Write Error", err));
              }
          }, 'image/png');
      } catch (e) {
          console.error("Canvas Blob Error", e);
      }
  };

  return (
    <div className="flex-1 min-w-0 bg-surface/40 border border-border rounded-[2rem] p-5 flex flex-col shadow-inner relative group min-h-0 transition-colors duration-500">
      <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-black uppercase tracking-widest text-content">ROCKIT COMMAND CENTER</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Drawing Tools */}
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border shadow-xl scale-90">
                <button 
                  onClick={() => setActiveTool('cursor')} 
                  className={`p-1.5 rounded-lg transition-all ${activeTool === 'cursor' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content'}`}
                  title="Cursor (ESC to switch)"
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5"></div>
                <button 
                  onClick={() => setActiveTool('line')} 
                  className={`p-1.5 rounded-lg transition-all ${activeTool === 'line' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content'}`}
                  title="Draw Arrow Line"
                >
                  <MoveUpRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setActiveTool('rect')} 
                  className={`p-1.5 rounded-lg transition-all ${activeTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content'}`}
                  title="Draw Rectangle"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setActiveTool('circle')} 
                  className={`p-1.5 rounded-lg transition-all ${activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content'}`}
                  title="Draw Circle"
                >
                  <Circle className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setActiveTool('text')} 
                  className={`p-1.5 rounded-lg transition-all ${activeTool === 'text' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content'}`}
                  title="Add Text Annotation"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5"></div>
                <button 
                  onClick={() => setDrawings([])} 
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
                  title="Clear Drawings"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-xl border border-border shadow-xl scale-90">
                <ToggleButton active={showGlobex} onClick={() => setShowGlobex(!showGlobex)} icon={Globe} label="Globex" activeClass="bg-amber-600 text-white shadow-lg" />
                <ToggleButton active={showProfile} onClick={() => setShowProfile(!showProfile)} icon={Layers} label="Profile" activeClass="bg-sky-600 text-white shadow-lg" />
                <ToggleButton active={showDPOC} onClick={() => setShowDPOC(!showDPOC)} icon={GitCommit} label="Algo DPOC" activeClass="bg-indigo-600 text-white shadow-lg" />
                <ToggleButton active={showComposite} onClick={() => setShowComposite(!showComposite)} icon={Magnet} label="Comp. HVN/LVN" activeClass="bg-pink-600 text-white shadow-lg" />
                <div className="w-px h-5 bg-border mx-1"></div>
                <ToggleButton active={showEMAs} onClick={() => setShowEMAs(!showEMAs)} icon={LineChart} label="EMAs" activeClass="bg-violet-600 text-white shadow-lg" />
                <ToggleButton active={showVWAP} onClick={() => setShowVWAP(!showVWAP)} icon={Target} label="VWAP" activeClass="bg-amber-400/80 text-white shadow-lg" />
                <ToggleButton active={showIB} onClick={() => setShowIB(!showIB)} icon={Shield} label="IB Levels" activeClass="bg-orange-600 text-white shadow-lg" />
                <ToggleButton active={showFVG} onClick={() => setShowFVG(!showFVG)} icon={Zap} label="FVG Zones" activeClass="bg-rose-600 text-white shadow-lg" />
            </div>
            
            <button 
                onClick={handleCopyChart}
                className={`p-2 rounded-xl border transition-all ${
                    copied 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                        : 'bg-background/80 border-border text-content-muted hover:text-white hover:border-accent'
                }`}
                title="Copy Chart Image"
            >
                {copied ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
      </div>
      <div ref={chartContainerRef} className="flex-1 bg-background/60 rounded-2xl overflow-hidden border border-border shadow-inner min-h-0 relative">
        <MigrationChart 
          data={chartData} 
          currentPrice={Number(ib?.current_close) || 0} 
          showVWAP={showVWAP} 
          showEMA={showEMAs} 
          showInstitutional={showGlobex} 
          showIB={showIB} 
          showProfile={showProfile}
          showFVG={showFVG}
          showDPOC={showDPOC}
          showComposite={showComposite}
          compositeNodes={{ hvn: vol?.previous_3_days?.hvn_nodes || [], lvn: vol?.previous_3_days?.lvn_nodes || [] }}
          levels={{
            ...premarket as any,
            previous_week_high: premarket?.previous_week_high,
            previous_week_low: premarket?.previous_week_low
          }} 
          profileLevels={{ 
            vah: Number(tpo?.current_vah) || Number(vol?.current_session?.vah) || 0,
            poc: Number(tpo?.current_poc) || Number(vol?.current_session?.poc) || 0,
            val: Number(tpo?.current_val) || Number(vol?.current_session?.val) || 0
          }}
          ibLevels={{
            high: Number(ib?.ib_high) || 0,
            low: Number(ib?.ib_low) || 0
          }}
          fvgData={fvgs as any}
          // Drawing Props
          activeTool={activeTool}
          drawings={drawings}
          onUpdateDrawings={setDrawings}
          onToolChange={setActiveTool}
        />
      </div>
    </div>
  );
};

export default ChartSection;
