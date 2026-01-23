
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Brain, AlertTriangle, ArrowLeft, Copy, ClipboardCheck } from 'lucide-react';
import { TPORow } from '../utils/tpoHelpers';

interface TPOAnalyzerProps {
  tpo30m: { tpoRows: TPORow[], minPrice: number, maxPrice: number };
  tpo5m: { tpoRows: TPORow[], minPrice: number, maxPrice: number };
  snapshotTime: string;
  currentPrice: number;
  promptTemplate?: string;
  onBack: () => void;
}

const TPOAnalyzer: React.FC<TPOAnalyzerProps> = ({ tpo30m, tpo5m, snapshotTime, currentPrice, promptTemplate, onBack }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to condense rows for prompt efficiency
  const condenseRows = (rows: TPORow[]) => {
      // Only include rows with data, and limit granularity if too large
      return rows
        .filter(r => r.letters.length > 0)
        .map(r => `${r.price}: ${r.letters} (Vol:${Math.round(r.volume)})`)
        .join('\n');
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setReport('');

    try {
        if (!promptTemplate) throw new Error("Analysis prompt not loaded.");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const condensed30m = condenseRows(tpo30m.tpoRows);
        const condensed5m = condenseRows(tpo5m.tpoRows);

        const prompt = `
            ${promptTemplate}

            ------------------------------------------------
            CURRENT MARKET CONTEXT:
            Time: ${snapshotTime}
            Price: ${currentPrice}
            ------------------------------------------------

            RAW TPO DATA (30-Minute Brackets):
            ${condensed30m.slice(0, 15000)} ${/* Safety clip */ ""}

            RAW TPO DATA (5-Minute Brackets - Detail):
            ${condensed5m.slice(0, 15000)}

            INSTRUCTIONS:
            Analyze the structure above based on the rules provided in the main prompt. 
            Identify the distribution shape, anomalies, and value migration.
        `;

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.4 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) setReport(prev => prev + chunk.text);
        }

    } catch (err: any) {
        setError(err.message || "Failed to run analysis.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      runAnalysis();
  }, []);

  const handleCopy = () => {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/40 rounded-3xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <Brain className="w-4 h-4" /> TPO Deep Scan
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">DUAL-TIMEFRAME ANALYSIS ENGINE</p>
                </div>
            </div>
            
            {!loading && report && (
                <button onClick={handleCopy} className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    {copied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/30">
            {loading && (
                <div className="h-full flex flex-col items-center justify-center opacity-70">
                    <Sparkles className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-300 animate-pulse">Deconstructing Profile...</p>
                </div>
            )}

            {error && (
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-4">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                    <div className="text-xs text-rose-300 font-mono">{error}</div>
                </div>
            )}

            {report && (
                <div className="prose prose-invert prose-headings:text-indigo-200 prose-p:text-slate-300 prose-sm max-w-none font-medium leading-relaxed">
                    {report.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-black uppercase tracking-widest text-indigo-400 mt-6 mb-3 border-b border-slate-800 pb-2">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('- **')) {
                             const parts = line.replace('- **', '').split('**:');
                             return <div key={i} className="mb-2"><span className="text-sky-300 font-bold">{parts[0]}:</span><span className="text-slate-300">{parts[1]}</span></div>;
                        }
                        if (line.startsWith('*')) return <li key={i} className="ml-4 list-disc text-slate-400">{line.replace('*', '').trim()}</li>;
                        return <p key={i} className="mb-2">{line}</p>;
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default TPOAnalyzer;