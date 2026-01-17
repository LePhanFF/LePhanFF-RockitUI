
import React from 'react';
import { LayoutDashboard, Pause, Timer, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Info, Cpu, Waypoints, Globe, BarChartHorizontal, Grid3X3, Brain, Target, MessageCircle, Link, Check, Palette, Clock, User, LogOut, AlertCircle, Rocket, Lightbulb, GraduationCap, Map, Code } from 'lucide-react';

interface AppHeaderProps {
  currentSnapshot: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPaused: boolean;
  setIsPaused: (p: boolean) => void;
  countdown: number;
  handleRefresh: () => void;
  isGlobalChatOpen: boolean;
  setIsGlobalChatOpen: (o: boolean) => void;
  urlCopied: boolean;
  handleShareUrl: () => void;
  theme: string;
  cycleTheme: () => void;
  handleLogout: () => void;
  errorMsg: string | null;
}

const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }: any) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg transition-all border min-w-[50px] ${
        activeTab === id 
          ? 'bg-surface text-content border-border shadow-xl transform scale-105 z-10' 
          : 'bg-background/20 text-content-muted border-transparent hover:bg-background/40 hover:text-content'
      }`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
    </button>
);

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentSnapshot,
  activeTab,
  setActiveTab,
  isPaused,
  setIsPaused,
  countdown,
  handleRefresh,
  isGlobalChatOpen,
  setIsGlobalChatOpen,
  urlCopied,
  handleShareUrl,
  theme,
  cycleTheme,
  handleLogout,
  errorMsg
}) => {
  const bias = (currentSnapshot?.decoded?.bias || 'NEUTRAL').toUpperCase();
  const narrative = currentSnapshot?.decoded?.one_liner || "Initializing Protocol...";
  const isLong = bias.includes('LONG');
  const isShort = bias.includes('SHORT');
  
  const thinkingText = currentSnapshot?.decoded?.thinking || 
  (typeof currentSnapshot?.output === 'string' && currentSnapshot.output.includes('<think>') 
    ? currentSnapshot.output.split('<think>')[1].split('</think>')[0] 
    : null);

  return (
    <header className="shrink-0 bg-surface/95 border-b border-border px-4 py-2 flex items-center justify-between shadow-2xl backdrop-blur-xl z-[100] h-20">
        
        {/* Left: Brand & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-accent rounded-xl shadow-[0_0_20px_var(--accent-glow)] border border-white/10">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-tighter text-content uppercase italic leading-none">ROCKIT <span className="text-accent not-italic">ENGINE</span></h1>
            <div className="flex items-center gap-2 mt-1">
                 <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                    isPaused ? 'text-amber-400' : 'text-content-muted hover:text-accent'
                  }`}
                  title={isPaused ? "Resume Auto-Refresh" : "Pause Auto-Refresh"}
                >
                  {isPaused ? <Pause className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                  {isPaused ? 'PAUSED' : `${countdown}S`}
                </button>
                <div className="w-0.5 h-0.5 rounded-full bg-border"></div>
                <button 
                  onClick={handleRefresh}
                  className="group flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-content-muted hover:text-content transition-colors"
                  title="Refresh Now"
                >
                  <RefreshCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform" />
                </button>
            </div>
          </div>
        </div>

        {/* Center: Intelligence Protocol Banner */}
        {currentSnapshot ? (
           <div className={`flex-1 mx-6 h-full rounded-2xl border flex items-center justify-between px-4 gap-4 overflow-hidden transition-all duration-700 shadow-inner ${
             isLong ? 'bg-emerald-500/5 border-emerald-500/20' : 
             isShort ? 'bg-rose-500/5 border-rose-500/20' : 
             'bg-accent/5 border-accent/20'
           }`}>
             
             {/* Narrative */}
             <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                <div className={`p-2 rounded-xl shrink-0 ${
                   isLong ? 'bg-emerald-500/20 text-emerald-400' : 
                   isShort ? 'bg-rose-500/20 text-rose-400' : 
                   'bg-accent/20 text-accent'
                }`}>
                   {isLong ? <ArrowUpRight className="w-4 h-4" /> : isShort ? <ArrowDownRight className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5 ${isLong ? 'text-emerald-500/70' : isShort ? 'text-rose-500/70' : 'text-accent'}`}>
                     Intelligence Protocol
                   </span>
                   <h3 className="text-xs font-bold text-content italic tracking-tight truncate max-w-lg xl:max-w-2xl" title={narrative}>
                     "{narrative}"
                   </h3>
                </div>
             </div>

             {/* Navigation Tabs */}
             <div className="flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar pb-1">
                <TabButton id="brief" label="Brief" icon={Info} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="logic" label="Logic" icon={Cpu} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="intraday" label="Intraday" icon={Timer} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="dpoc" label="DPOC" icon={Waypoints} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="globex" label="Globex" icon={Globe} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="profile" label="Profile" icon={BarChartHorizontal} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="tpo" label="TPO" icon={Grid3X3} activeTab={activeTab} setActiveTab={setActiveTab} />
                {thinkingText && <TabButton id="thinking" label="Think" icon={Brain} activeTab={activeTab} setActiveTab={setActiveTab} />}
                <TabButton id="json" label="JSON" icon={Code} activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="w-px h-6 bg-border mx-1"></div>
                <TabButton id="coach" label="Coach" icon={GraduationCap} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="htf-coach" label="MTF Map" icon={Map} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="rk-audit" label="RK Audit" icon={Rocket} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="trade-idea" label="Trade Idea" icon={Lightbulb} activeTab={activeTab} setActiveTab={setActiveTab} />
             </div>

             {/* Metrics */}
             <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-border">
                <div className="text-right">
                    <span className="text-[8px] font-bold text-content-muted uppercase tracking-widest block">Trust</span>
                    <div className="flex items-center justify-end gap-1 text-content font-mono font-black">
                       <Target className="w-3 h-3 text-accent" />
                       {currentSnapshot?.decoded?.confidence || '0%'}
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border font-black text-xs tracking-wider ${
                    isLong ? 'bg-emerald-500 text-emerald-950 border-emerald-400' : 
                    isShort ? 'bg-rose-500 text-rose-950 border-rose-400' : 
                    'bg-accent text-white border-accent'
                }`}>
                  {bias}
                </div>
             </div>
           </div>
        ) : <div className="flex-1" />}

        {/* Right: Clock & User */}
        <div className="flex items-center gap-4 shrink-0">
           {errorMsg && (
               <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] text-rose-400 font-black uppercase animate-pulse">
                 <AlertCircle className="w-3 h-3" /> {errorMsg}
               </div>
           )}
           
           <div className="flex items-center gap-2">
               {/* Global Chat Toggle */}
               <button 
                  onClick={() => setIsGlobalChatOpen(!isGlobalChatOpen)}
                  className={`p-2 rounded-full border transition-all ${
                      isGlobalChatOpen 
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                        : 'bg-surface border-border text-content-muted hover:text-accent hover:border-accent'
                  }`} 
                  title="Global Session Chat (Fast)"
               >
                  <MessageCircle className="w-4 h-4" />
               </button>

               {/* Share Button */}
               <button 
                  onClick={handleShareUrl} 
                  className={`p-2 rounded-full border transition-all ${
                      urlCopied 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                        : 'bg-surface border-border text-content-muted hover:text-accent hover:border-accent'
                  }`} 
                  title="Share Snapshot URL"
               >
                  {urlCopied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
               </button>

               {/* THEME TOGGLE */}
               <button onClick={cycleTheme} className="p-2 rounded-full bg-surface border border-border text-content-muted hover:text-accent transition-colors" title={`Theme: ${theme.toUpperCase()}`}>
                  <Palette className="w-4 h-4" />
               </button>

               {currentSnapshot && (
                 <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border shadow-inner">
                   <Clock className="w-4 h-4 text-accent" />
                   <span className="text-sm font-mono font-black text-content tracking-tighter">{currentSnapshot.input.current_et_time}</span>
                 </div>
               )}

               <div className="group relative flex items-center">
                 <button onClick={handleLogout} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-surface hover:bg-panel border border-border transition-all hover:pr-3">
                   <div className="w-7 h-7 rounded-full bg-panel flex items-center justify-center border border-border">
                      <User className="w-4 h-4 text-content-muted" />
                   </div>
                   <div className="w-0 overflow-hidden group-hover:w-auto transition-all duration-300 whitespace-nowrap">
                     <span className="text-[10px] font-bold text-content-muted uppercase mr-1">Logout</span>
                   </div>
                   <div className="p-1 bg-background rounded-full group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                      <LogOut className="w-3 h-3 text-content-muted group-hover:text-rose-400" />
                   </div>
                 </button>
               </div>
           </div>
        </div>
    </header>
  );
};
