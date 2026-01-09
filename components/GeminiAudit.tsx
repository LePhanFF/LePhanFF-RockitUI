
import React, { useState } from 'react';
import { MarketSnapshot } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Brain, 
  Quote, 
  ChevronRight,
  MessageSquare,
  Send,
  Rocket
} from 'lucide-react';

interface GeminiAuditProps {
  snapshots: MarketSnapshot[];
}

const GeminiAudit: React.FC<GeminiAuditProps> = ({ snapshots }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');

  const generateAudit = async () => {
    if (!snapshots || snapshots.length === 0) {
      setError("No session data available to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport('');

    try {
      // 1. Condense Data for Context Window
      const contextData = snapshots.map(s => ({
        time: s.input.current_et_time,
        price: s.input.intraday.ib.current_close,
        bias: s.decoded?.bias || 'N/A',
        narrative: s.decoded?.one_liner || '',
        dpoc: s.input.intraday.volume_profile.current_session.poc,
        migration: s.input.intraday.dpoc_migration.migration_direction,
        tpo_shape: s.input.intraday.tpo_profile.tpo_shape
      }));

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 3. Construct Prompt
      let prompt = `
        You are a master Market Profile trading analyst and psychologist. 
        
        SESSION DATA JSON:
        ${JSON.stringify(contextData)}
      `;

      if (customQuery.trim()) {
        prompt += `
          USER QUESTION: "${customQuery}"

          INSTRUCTIONS:
          Answer the user's specific question based strictly on the provided SESSION DATA. 
          Use professional trading terminology (Market Profile, Auction Theory).
          Format the response in clear Markdown.
        `;
      } else {
        prompt += `
          OBJECTIVE:
          Generate a "Session Post-Mortem & Audit" report. Look for structural shifts, traps ("gotchas"), and narrative changes.

          FORMAT REQUIREMENTS:
          Return the response in Markdown. Use the following structure strictly:

          ## ⚡ TL;DR Summary
          (A concise 2-3 sentence summary of the entire session's character)

          ## 🕰 Chronological Breakdown

          ### 🌅 Early Open (09:30 - 10:30)
          *   **Action:** Describe price action and IB formation.
          *   **Narrative:** What was the initial Algo bias?
          
          ### 🏙 Mid-Morning Rotation (10:30 - 11:30)
          *   **Shift:** Did the initial trend hold or fail? 
          *   **Structure:** Note any DPOC migration or IB extension.

          ### 🥪 The Lunch Lull (11:30 - 12:30)
          *   **State:** Compression, chop, or continuation?

          ### 🌇 PM Session (12:30 - Close)
          *   **Resolution:** How did the day resolve?
          
          ## 🧠 Analyst Insights
          *   **Transition Points:** Identify specific times where the market changed character (The "Morph").
          *   **The "Gotcha":** Where were traders trapped today?
          *   **Key Idea:** One actionable takeaway for tomorrow based on today's structure.
        `;
      }

      // 4. Call API
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
            temperature: 0.7,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          setReport(prev => prev + text);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate audit. Check API Key configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-black text-indigo-400 mt-8 mb-3 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4" />{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-sm font-bold text-slate-200 mt-6 mb-2 uppercase tracking-wider bg-slate-800/50 p-2 rounded-lg border-l-2 border-indigo-500 shadow-lg">{line.replace('### ', '')}</h3>;
      }
      if (line.trim().startsWith('*   **')) {
        const content = line.replace('*   **', '').replace('**', ':');
        const [title, ...rest] = content.split(':');
        return (
            <div key={i} className="flex gap-2 mb-2 ml-4">
                <span className="text-slate-400 font-bold shrink-0">{title}:</span>
                <span className="text-slate-300">{rest.join(':')}</span>
            </div>
        );
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-6 list-disc text-slate-300 my-1">{line.replace('- ', '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      
      return <p key={i} className="text-slate-400 leading-relaxed mb-1">{line}</p>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-4">
        {/* Top Row: Title */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Gemini Audit & Analyst</h2>
                    <p className="text-[10px] text-slate-500 font-mono">SESSION POST-MORTEM & CUSTOM INQUIRY</p>
                </div>
            </div>
        </div>

        {/* Input Row */}
        <div className="flex gap-3">
            <div className="relative flex-1 group">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <MessageSquare className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                 </div>
                 <input
                     type="text"
                     value={customQuery}
                     onChange={(e) => setCustomQuery(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && !loading && generateAudit()}
                     placeholder="E.g., 'Analyze the transition from 10:30 to 11:30' or leave empty for full audit"
                     className="w-full bg-slate-950/50 border border-slate-700/50 text-slate-200 text-xs rounded-xl py-2.5 pl-9 pr-4 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-mono"
                 />
            </div>
            {!loading && (
                <button 
                    onClick={generateAudit}
                    className="shrink-0 flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                >
                    {customQuery ? (
                        <>
                           <Send className="w-3 h-3" />
                           <span>Ask Gemini</span>
                        </>
                    ) : (
                        <>
                           <Sparkles className="w-3 h-3 group-hover:animate-spin" />
                           <span>Full Audit</span>
                        </>
                    )}
                </button>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-950/30 relative">
        
        {/* Empty State */}
        {!report && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
                <Brain className="w-24 h-24 text-slate-700 mb-6" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-600">Ready to Analyze Session Structure</p>
                <p className="text-xs text-slate-600 mt-2 font-mono">Ask a question or click Full Audit to process {snapshots.length} snapshots</p>
            </div>
        )}

        {/* Loading State */}
        {loading && (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">
                    {customQuery ? 'Processing Query...' : 'Analyzing Market Structure...'}
                </p>
                <div className="mt-2 flex flex-col items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <span>Scanning {snapshots.length} snapshots...</span>
                    <span className="delay-75">Synthesizing Narrative...</span>
                </div>
            </div>
        )}

        {/* Error State */}
        {error && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                    <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Analysis Failed</h3>
                    <p className="text-xs text-rose-300/80 mt-1 font-mono">{error}</p>
                </div>
            </div>
        )}

        {/* Report Content */}
        {report && (
            <div className="max-w-4xl mx-auto space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-8 opacity-50">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {customQuery ? 'Custom Query Response' : 'Full Session Post-Mortem'} • Gemini 3 Pro
                    </span>
                </div>
                
                <div className="prose prose-invert prose-headings:font-black prose-p:text-slate-400 max-w-none">
                    {renderMarkdown(report)}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-800/50 flex items-center justify-center">
                    <Quote className="w-6 h-6 text-slate-700" />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeminiAudit;
