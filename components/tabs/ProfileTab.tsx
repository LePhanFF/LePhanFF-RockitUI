
import React from 'react';

interface ProfileTabProps {
  vol: any;
  tpo: any;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ vol, tpo }) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-500 h-full flex flex-col">
        <div className="grid grid-cols-1 gap-5">
        {[
            { 
            title: "Current Session", 
            data: vol?.current_session, 
            tpoData: tpo,
            color: "text-indigo-400", 
            border: "border-indigo-500/20", 
            bg: "bg-indigo-500/5" 
            },
            { 
            title: "Previous Day", 
            data: vol?.previous_day, 
            color: "text-slate-400", 
            border: "border-slate-800", 
            bg: "bg-slate-900/40" 
            },
            { 
            title: "Previous 3 Days", 
            data: vol?.previous_3_days, 
            color: "text-slate-400", 
            border: "border-slate-800", 
            bg: "bg-slate-900/40" 
            }
        ].map((section, idx) => (
            <div key={idx} className={`rounded-3xl border ${section.border} ${section.bg} p-6 shadow-xl relative overflow-hidden group`}>
            <div className="relative z-10">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-5 ${section.color}`}>{section.title}</h3>
                
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="col-span-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Vol POC</span>
                        <span className="text-sm font-mono font-black text-white bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50 block w-fit mb-2">
                        {Number(section.data?.poc).toFixed(2)}
                        </span>
                        
                        {section.tpoData?.current_poc && (
                        <>
                            <span className="text-[9px] text-amber-500/70 font-bold uppercase block mb-1">TPO POC</span>
                            <span className="text-sm font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 block w-fit animate-pulse">
                            {Number(section.tpoData.current_poc).toFixed(2)}
                            </span>
                        </>
                        )}
                    </div>

                    <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">VAH</span>
                        <span className="text-xs font-mono font-bold text-sky-300">{Number(section.data?.vah).toFixed(2)}</span>
                    </div>

                    <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">VAL</span>
                        <span className="text-xs font-mono font-bold text-sky-300">{Number(section.data?.val).toFixed(2)}</span>
                    </div>

                    <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">High</span>
                        <span className="text-xs font-mono font-bold text-slate-400">{Number(section.data?.high).toFixed(2)}</span>
                    </div>

                    <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Low</span>
                        <span className="text-xs font-mono font-bold text-slate-400">{Number(section.data?.low).toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-slate-800/30 pt-4">
                    <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block mb-2">High Volume Nodes (HVN)</span>
                    <div className="flex flex-wrap gap-1.5">
                        {section.data?.hvn_nodes && section.data.hvn_nodes.length > 0 ? (
                        section.data.hvn_nodes.map((node: number, i: number) => (
                            <span key={i} className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            {Number(node).toFixed(2)}
                            </span>
                        ))
                        ) : <span className="text-[9px] text-slate-700 italic">None</span>}
                    </div>
                    </div>
                    
                    <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block mb-2">Low Volume Nodes (LVN)</span>
                    <div className="flex flex-wrap gap-1.5">
                        {section.data?.lvn_nodes && section.data.lvn_nodes.length > 0 ? (
                        section.data.lvn_nodes.map((node: number, i: number) => (
                            <span key={i} className="text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                            {Number(node).toFixed(2)}
                            </span>
                        ))
                        ) : <span className="text-[9px] text-slate-700 italic">None</span>}
                    </div>
                    </div>
                </div>

            </div>
            </div>
        ))}
    </div>
    </div>
  );
};

export default ProfileTab;
