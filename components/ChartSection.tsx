
import React, { useState, useMemo, useRef } from 'react';
import { Terminal, Globe, Layers, GitCommit, Network, LineChart, Target, Shield, Zap, BarChart2, Camera, Check } from 'lucide-react';
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
  const [showProfile, setShowProfile] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [showGlobex, setShowGlobex] = useState(false);
  const [showEMAs, setShowEMAs] = useState(false);
  const [showDPOC, setShowDPOC] = useState(true);
  const [showVolPOC, setShowVolPOC] = useState(true);
  const [showOHLC, setShowOHLC] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const input = snapshot?.input;
  const intraday = input?.intraday;
  const premarket = input?.premarket;
  const ib = intraday?.ib;
  const vol = intraday?.volume_profile;
  const tpo = intraday?.tpo_profile;
  const fvgs = intraday?.fvg_detection;
  const dpocData = intraday?.dpoc_migration;
  
  const dpocHistory = dpocData?.dpoc_history || intraday?.dpoc_history;

  const derivedSlices = useMemo(() => {
    if (dpocHistory && dpocHistory.length > 0) {
      return dpocHistory.map(h => ({ time: h.slice, dpoc: h.dpoc })).sort((a, b) => a.time.localeCompare(b.time));
    }
    const sliceMap = new Map<string, number>();
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const relevant = currentIndex >= 0 ? allSnapshots.slice(0, currentIndex + 1) : [snapshot];
    relevant.forEach(s => {
        const slices = s.input?.intraday?.dpoc_migration?.dpoc_slices;
        if (Array.isArray(slices)) {
            slices.forEach(slice => {
                if (slice.time && typeof slice.dpoc === 'number') {
                    sliceMap.set(slice.time, slice.dpoc);
                }
            });
        }
    });
    if (sliceMap.size > 0) {
        return Array.from(sliceMap.entries())
            .map(([time, dpoc]) => ({ time, dpoc }))
            .sort((a, b) => a.time.localeCompare(b.time));
    }
    const computed: { time: string; dpoc: number }[] = [];
    let lastPoc: number | null = null;
    relevant.forEach(s => {
        const poc = s.input?.intraday?.volume_profile?.current_session?.poc;
        const time = s.input?.current_et_time;
        if (typeof poc === 'number' && poc > 0 && time) {
            if (lastPoc === null || Math.abs(poc - lastPoc) > 0.01) {
                computed.push({ time, dpoc: poc });
                lastPoc = poc;
            }
        }
    });
    return computed;
  }, [allSnapshots, snapshot, dpocHistory]);

  const chartData = useMemo(() => {
    if (!allSnapshots || allSnapshots.length === 0) return [];
    const currentIndex = allSnapshots.findIndex(s => s.input?.current_et_time === snapshot.input?.current_et_time);
    const visibleSnapshots = allSnapshots.slice(0, Math.max(0, currentIndex + 1));
    const historicalSlices = derivedSlices;
    
    let lastVolPoc: number | null = null;

    return visibleSnapshots.map(s => {
      const inp = s.input;
      const ibData = inp?.intraday?.ib;
      const t = inp?.current_et_time || '00:00';
      const isPostIB = t >= "10:30";
      
      let activeDPOC = inp?.intraday?.volume_profile?.current_session?.poc || ibData?.current_close || 0;
      const applicableSlices = historicalSlices.filter(slice => slice.time <= t);
      if (applicableSlices.length > 0) {
        activeDPOC = applicableSlices[applicableSlices.length - 1].dpoc;
      }
      const matchingSlice = historicalSlices.find(slice => slice.time === t);

      const rawPoc = inp?.intraday?.tpo_profile?.current_poc;
      const currentVolPoc = (typeof rawPoc === 'number' && rawPoc > 0) ? rawPoc : null;
      
      let volPocMarker = null;
      if (currentVolPoc !== null && lastVolPoc !== null && Math.abs(currentVolPoc - lastVolPoc) > 0.01) {
        volPocMarker = currentVolPoc;
      }
      if (currentVolPoc !== null) {
          lastVolPoc = currentVolPoc;
      }

      return {
        time: t,
        dpoc: activeDPOC,
        dpoc_marker: matchingSlice ? matchingSlice.dpoc : null,
        vol_poc: currentVolPoc,
        vol_poc_marker: volPocMarker,
        open: ibData?.current_open || 0,
        high: ibData?.current_high || 0,
        low: ibData?.current_low || 0,
        close: ibData?.current_close || 0,
        vwap: ibData?.current_vwap || 0,
        ema20: ibData?.ema20 || 0,
        ema50: ibData?.ema50 || 0,
        ema200: ibData?.ema200 || 0,
        ibh: isPostIB ? (ibData?.ib_high || null) : null,
        ibl: isPostIB ? (ibData?.ib_low || null) : null
      };
    });
  }, [allSnapshots, snapshot, intraday, derivedSlices]);

  const handleCopyChart = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Add minimal styling to SVG for dark mode background
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            if (!ctx) return;
            // Get dimensions from svg viewbox or bounding client rect
            const svgRect = svg.getBoundingClientRect();
            canvas.width = svgRect.width;
            canvas.height = svgRect.height;
            
            // Draw background
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw SVG
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                        .then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        })
                        .catch(err => console.error('Copy failed:', err));
                }
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = url;
    } catch (e) {
        console.error("Snapshot error:", e);
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
            <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-xl border border-border shadow-xl scale-90">
                <ToggleButton active={showGlobex} onClick={() => setShowGlobex(!showGlobex)} icon={Globe} label="Globex" activeClass="bg-amber-600 text-white shadow-lg" />
                <ToggleButton active={showProfile} onClick={() => setShowProfile(!showProfile)} icon={Layers} label="Profile" activeClass="bg-sky-600 text-white shadow-lg" />
                <ToggleButton active={showDPOC} onClick={() => setShowDPOC(!showDPOC)} icon={GitCommit} label="Algo DPOC" activeClass="bg-indigo-600 text-white shadow-lg" />
                <ToggleButton active={showVolPOC} onClick={() => setShowVolPOC(!showVolPOC)} icon={Network} label="TPO Trace" activeClass="bg-amber-500 text-white shadow-lg" />
                <div className="w-px h-5 bg-border mx-1"></div>
                <ToggleButton active={showEMAs} onClick={() => setShowEMAs(!showEMAs)} icon={LineChart} label="EMAs" activeClass="bg-violet-600 text-white shadow-lg" />
                <ToggleButton active={showVWAP} onClick={() => setShowVWAP(!showVWAP)} icon={Target} label="VWAP" activeClass="bg-amber-400/80 text-white shadow-lg" />
                <ToggleButton active={showIB} onClick={() => setShowIB(!showIB)} icon={Shield} label="IB Levels" activeClass="bg-orange-600 text-white shadow-lg" />
                <ToggleButton active={showFVG} onClick={() => setShowFVG(!showFVG)} icon={Zap} label="FVG Zones" activeClass="bg-rose-600 text-white shadow-lg" />
                <div className="w-px h-5 bg-border mx-1"></div>
                <ToggleButton active={showOHLC} onClick={() => setShowOHLC(!showOHLC)} icon={BarChart2} label="Candles" activeClass="bg-emerald-600 text-white shadow-lg" />
            </div>
            
            {/* Chart Screenshot Button */}
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
      <div ref={containerRef} className="flex-1 bg-background/60 rounded-2xl overflow-hidden border border-border shadow-inner min-h-0">
        <MigrationChart 
          data={chartData} 
          currentPrice={Number(ib?.current_close) || 0} 
          showOHLC={showOHLC} 
          showVWAP={showVWAP} 
          showEMA={showEMAs} 
          showInstitutional={showGlobex}
          showIB={showIB} 
          showProfile={showProfile}
          showFVG={showFVG}
          showDPOC={showDPOC}
          showVolPOC={showVolPOC}
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
          fvgData={fvgs as any} 
        />
      </div>
    </div>
  );
};

export default ChartSection;
