
import React from 'react';
import { MarketSnapshot, DecodedOutput } from '../types';
import GeminiAudit from './GeminiAudit';
import RockitAudit from './RockitAudit';
import HTFCoach from './HTFCoach';
import JsonExplorer from './JsonExplorer';
import ChartSection from './ChartSection';
import TradeIdea from './TradeIdea';

// Tab Components
import BriefTab from './tabs/BriefTab';
import LogicTab from './tabs/LogicTab';
import IntradayTab from './tabs/IntradayTab';
import DPOCTab from './tabs/DPOCTab';
import GlobexTab from './tabs/GlobexTab';
import ProfileTab from './tabs/ProfileTab';
import TPOTab from './tabs/TPOTab';
import ThinkingTab from './tabs/ThinkingTab';

interface DashboardProps {
  snapshot: MarketSnapshot;
  output: DecodedOutput | null;
  allSnapshots?: MarketSnapshot[];
  activeTab: string;
}

const Dashboard: React.FC<DashboardProps> = ({ snapshot, output, allSnapshots = [], activeTab }) => {
  const input = snapshot?.input;
  const intraday = input?.intraday;
  const core = input?.core_confluences;
  const premarket = input?.premarket;
  const ib = intraday?.ib;
  const vol = intraday?.volume_profile;
  const tpo = intraday?.tpo_profile;
  const dpocData = intraday?.dpoc_migration;
  
  const dpocHistory = dpocData?.dpoc_history || intraday?.dpoc_history;

  const thinkingText = output?.thinking || 
    snapshot?.decoded?.thinking || 
    (typeof snapshot?.output === 'string' && snapshot.output.includes('<think>') 
      ? snapshot.output.split('<think>')[1].split('</think>')[0] 
      : null);

  // --- SPECIAL JSON EXPLORER VIEW ---
  if (activeTab === 'json') {
    return <JsonExplorer snapshot={snapshot} thinkingText={thinkingText} />;
  }

  // --- STANDARD DASHBOARD LAYOUT ---
  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* Standard Chart + Sidebar Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        
        {/* Left Side: Chart Section */}
        <ChartSection snapshot={snapshot} allSnapshots={allSnapshots} />

        {/* Right Side: Analytical Matrix */}
        <div className="w-[480px] xl:w-[540px] shrink-0 flex flex-col bg-surface/50 border border-border rounded-[2rem] overflow-hidden shadow-2xl min-h-0 transition-colors duration-500">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background/20">
            
            {activeTab === 'brief' && <BriefTab output={output} />}
            
            {activeTab === 'logic' && <LogicTab core={core} />}

            {activeTab === 'intraday' && <IntradayTab intraday={intraday} />}

            {activeTab === 'dpoc' && <DPOCTab dpocData={dpocData} dpocHistory={dpocHistory || []} />}

            {activeTab === 'globex' && <GlobexTab premarket={premarket} />}

            {activeTab === 'profile' && <ProfileTab vol={vol} tpo={tpo} />}

            {activeTab === 'tpo' && <TPOTab tpo={tpo} vol={vol} ib={ib} snapshotTime={input?.current_et_time} allSnapshots={allSnapshots} />}

            {activeTab === 'thinking' && <ThinkingTab thinkingText={thinkingText} />}

            {activeTab === 'coach' && (
               <div className="h-full animate-in fade-in duration-500 flex flex-col">
                 <GeminiAudit snapshots={allSnapshots} currentSnapshot={snapshot} />
               </div>
            )}

            {activeTab === 'htf-coach' && (
               <div className="h-full animate-in fade-in duration-500 flex flex-col">
                 <HTFCoach snapshots={allSnapshots} currentSnapshot={snapshot} />
               </div>
            )}

             {activeTab === 'rk-audit' && (
               <div className="h-full animate-in fade-in duration-500 flex flex-col">
                 <RockitAudit snapshots={allSnapshots} />
               </div>
            )}

             {activeTab === 'trade-idea' && (
               <div className="h-full animate-in fade-in duration-500 flex flex-col">
                 <TradeIdea snapshots={allSnapshots} currentSnapshot={snapshot} />
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
