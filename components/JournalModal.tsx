
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, BookOpen, History, Edit3, Check, AlertCircle, Loader2, DownloadCloud } from 'lucide-react';
import { GCS_BUCKET_BASE } from '../utils/dataHelpers';

interface JournalData {
  date: string;
  daily_remarks: {
    premarket: string;
    open_auction: string;
    post_ib: string;
    lunch_london: string;
    pm_session: string;
    power_hour: string;
  };
  time_slice_remarks: Record<string, string>; // timestamp -> note
  updated_at: string;
}

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDate: string;
  currentTime: string;
}

const EMPTY_JOURNAL: JournalData = {
  date: '',
  daily_remarks: {
    premarket: '',
    open_auction: '',
    post_ib: '',
    lunch_london: '',
    pm_session: '',
    power_hour: ''
  },
  time_slice_remarks: {},
  updated_at: ''
};

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, sessionDate, currentTime }) => {
  const [data, setData] = useState<JournalData>(EMPTY_JOURNAL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverErrorDetails, setServerErrorDetails] = useState<string | null>(null);

  // Load Journal on Open or Date Change
  useEffect(() => {
    if (isOpen && sessionDate) {
      loadJournal(sessionDate);
    }
  }, [isOpen, sessionDate]);

  const loadJournal = async (date: string) => {
    setLoading(true);
    const filename = `journals/${date}.jsonl`;
    const url = `${GCS_BUCKET_BASE}/${filename}?cb=${Date.now()}`;

    try {
      // 1. Try Local Storage first (for immediate consistency)
      const localData = localStorage.getItem(`journal_${date}`);
      
      // 2. Try Fetching from Cloud
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        // Assume valid JSONL (single line object)
        const cloudData = JSON.parse(text);
        
        // Merge logic: If local is newer, use local. Else cloud.
        if (localData) {
            const parsedLocal = JSON.parse(localData);
            if (new Date(parsedLocal.updated_at) > new Date(cloudData.updated_at)) {
                setData(parsedLocal);
            } else {
                setData(cloudData);
            }
        } else {
            setData(cloudData);
        }
      } else {
        // If 404, check local, otherwise init empty
        if (localData) {
            setData(JSON.parse(localData));
        } else {
            setData({ ...EMPTY_JOURNAL, date });
        }
      }
    } catch (e) {
      console.warn("Journal load failed, using empty/local", e);
      const localData = localStorage.getItem(`journal_${date}`);
      if (localData) setData(JSON.parse(localData));
      else setData({ ...EMPTY_JOURNAL, date });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setServerErrorDetails(null);
    
    const payload = {
        ...data,
        updated_at: new Date().toISOString()
    };

    try {
        // 1. Save to LocalStorage (Immediate Backup)
        localStorage.setItem(`journal_${sessionDate}`, JSON.stringify(payload));

        // 2. Server API Hook (Cloud Sync)
        // Expects the backend to handle the write to GCS bucket `rockit-data/journals/`
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("[ROCKIT] Journal Synced to Cloud");
            setSaveStatus('success');
        } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.details || errData.error || `HTTP ${response.status}`);
        }
    } catch (e: any) {
        console.error("Cloud sync failed:", e);
        setSaveStatus('error'); // Indicates "Saved Locally" state
        setServerErrorDetails(e.message);
    } finally {
        setSaving(false);
        // Reset success status after delay
        if (saveStatus !== 'error') {
             setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }
  };

  const handleDownload = () => {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionDate}_journal.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateDaily = (field: keyof JournalData['daily_remarks'], value: string) => {
    setData(prev => ({
        ...prev,
        daily_remarks: { ...prev.daily_remarks, [field]: value }
    }));
  };

  const updateTimeSlice = (time: string, value: string) => {
    setData(prev => ({
        ...prev,
        time_slice_remarks: { ...prev.time_slice_remarks, [time]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal Window */}
        <div className="relative w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-slate-200">Trader's Journal</h2>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                            <span>SESSION: {sessionDate}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-amber-400 font-bold">LIVE: {currentTime}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 animate-in fade-in slide-in-from-right">
                            <Check className="w-3 h-3" /> Synced
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <div className="flex items-center gap-1" title={serverErrorDetails || "Failed to sync to cloud"}>
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 animate-in fade-in">
                                <AlertCircle className="w-3 h-3" /> Saved Locally
                            </span>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleDownload}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                        title="Download Manual Backup"
                    >
                        <DownloadCloud className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save Entry</span>
                    </button>
                    
                    <div className="w-px h-6 bg-slate-800 mx-2"></div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden flex divide-x divide-slate-800">
                
                {/* LEFT: Daily Remarks (Scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/50">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Daily Structure Notes
                    </h3>
                    
                    <div className="space-y-6">
                        <SectionArea 
                            label="1. Premarket Remarks" 
                            sub="Overnight inventory, key levels, news drivers."
                            value={data.daily_remarks.premarket}
                            onChange={(v) => updateDaily('premarket', v)}
                        />
                        <SectionArea 
                            label="2. Opening Market Auction Remarks" 
                            sub="IB formation, confidence, initial test."
                            value={data.daily_remarks.open_auction}
                            onChange={(v) => updateDaily('open_auction', v)}
                        />
                        <SectionArea 
                            label="3. Post IB Range Remarks" 
                            sub="Extension, rotation, or chop?"
                            value={data.daily_remarks.post_ib}
                            onChange={(v) => updateDaily('post_ib', v)}
                        />
                        <SectionArea 
                            label="4. Lunch / London Close Remarks" 
                            sub="Volume drop, fake-outs, stabilization."
                            value={data.daily_remarks.lunch_london}
                            onChange={(v) => updateDaily('lunch_london', v)}
                        />
                        <SectionArea 
                            label="5. PM Remarks" 
                            sub="Trend continuation or reversal?"
                            value={data.daily_remarks.pm_session}
                            onChange={(v) => updateDaily('pm_session', v)}
                        />
                        <SectionArea 
                            label="6. Power Hour Remarks" 
                            sub="Closing auction, MOC imbalance."
                            value={data.daily_remarks.power_hour}
                            onChange={(v) => updateDaily('power_hour', v)}
                        />
                    </div>
                </div>

                {/* RIGHT: Time Slice Remarks (Fixed width) */}
                <div className="w-[40%] flex flex-col bg-slate-950/30">
                    
                    {/* Current Slice Input */}
                    <div className="p-6 border-b border-slate-800 bg-slate-900/80 z-10 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-amber-100">
                                Active Time Slice: {currentTime}
                            </span>
                        </div>
                        <textarea 
                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-medium text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all resize-none placeholder:text-slate-600"
                            placeholder={`Enter observations for ${currentTime}...`}
                            value={data.time_slice_remarks[currentTime] || ''}
                            onChange={(e) => updateTimeSlice(currentTime, e.target.value)}
                        />
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                            <History className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Chronology</span>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(data.time_slice_remarks)
                                .filter(([t]) => t !== currentTime) // Exclude current as it's above
                                .sort((a, b) => b[0].localeCompare(a[0])) // Newest first
                                .map(([time, note]) => (
                                    <div key={time} className="group relative bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{time}</span>
                                        </div>
                                        <textarea
                                            className="w-full bg-transparent text-sm text-slate-400 group-hover:text-slate-200 outline-none resize-none h-auto min-h-[60px]"
                                            value={note}
                                            onChange={(e) => updateTimeSlice(time, e.target.value)}
                                        />
                                    </div>
                                ))
                            }
                            {Object.keys(data.time_slice_remarks).length <= 1 && (
                                <div className="text-center py-10 opacity-30">
                                    <p className="text-xs font-mono">No previous timestamp entries.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const SectionArea = ({ label, sub, value, onChange }: { label: string, sub: string, value: string, onChange: (v: string) => void }) => (
    <div className="group">
        <div className="mb-2">
            <span className="text-sm font-bold text-slate-200 block">{label}</span>
            <span className="text-[10px] text-slate-500 font-mono">{sub}</span>
        </div>
        <textarea 
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none group-hover:border-slate-700"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="No remarks entered..."
        />
    </div>
);

export default JournalModal;
