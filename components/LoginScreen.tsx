
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Key, ChevronRight, AlertCircle, Lock, Loader2 } from 'lucide-react';

const ACCESS_CODE = "hello123";
const BYPASS_IP = "47.153.152.70";

export const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checkingIp, setCheckingIp] = useState(true);

  useEffect(() => {
    const checkIp = async () => {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            if (res.ok) {
                const data = await res.json();
                if (data.ip === BYPASS_IP) {
                    onLogin();
                    return;
                }
            }
        } catch (e) {
            console.warn("IP Check failed, requiring password.");
        } finally {
            setCheckingIp(false);
        }
    };
    checkIp();
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_CODE) {
      onLogin();
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (checkingIp) {
      return (
        <div className="h-screen w-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-xs font-mono text-content-muted tracking-widest uppercase">Verifying Secure Uplink...</p>
        </div>
      );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>
      
      <div className="relative z-10 bg-surface/60 border border-border p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl flex flex-col items-center max-w-md w-full text-center">
        <div className="p-4 bg-background rounded-2xl border border-border mb-8 shadow-xl">
           <LayoutDashboard className="w-12 h-12 text-accent" />
        </div>
        
        <h1 className="text-3xl font-black italic tracking-tighter text-content uppercase mb-2">
          ROCKIT <span className="text-accent">ENGINE</span>
        </h1>
        <p className="text-xs font-mono text-content-muted tracking-[0.3em] uppercase mb-10">
          Intelligence Protocol Access
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
           <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Key className={`w-4 h-4 ${error ? 'text-rose-500' : 'text-content-muted group-focus-within:text-accent'} transition-colors`} />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className={`w-full bg-background/50 border ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-border focus:border-accent'} text-content text-sm rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-content-muted font-mono tracking-widest`}
                placeholder="ENTER ACCESS CODE"
                autoFocus
              />
           </div>
           
           <button 
             type="submit"
             className="w-full bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-all shadow-[0_0_20px_var(--accent-glow)] flex items-center justify-center gap-2 group"
           >
             <span>Initialize Uplink</span>
             <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
           </button>
        </form>
        
        {error && (
           <div className="mt-4 flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-3 h-3" />
              <span>Access Denied: Invalid Credentials</span>
           </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-content-muted font-bold uppercase tracking-widest mt-8">
          <Lock className="w-3 h-3" />
          <span>Restricted Environment</span>
        </div>
      </div>
    </div>
  );
};
