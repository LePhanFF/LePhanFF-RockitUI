
import React, { useState } from 'react';
import { LayoutDashboard, Key, ChevronRight, AlertCircle, Lock, Loader2, User } from 'lucide-react';
import { API_BASE_URL } from '../utils/dataHelpers';

export const LoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetUrl = `${API_BASE_URL}/auth/login`;
    
    try {
        // Backend expects JSON object (Pydantic model), not form data
        const payload = { username, password };

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            
            // Response format: { access_token: string, token_type: string, expires_in: number }
            const accessToken = data.access_token;
            const expiresIn = data.expires_in; // in seconds
            
            if (accessToken) {
                // Store token
                localStorage.setItem('rockit_token', accessToken);
                localStorage.setItem('rockit_user', username);
                
                // Calculate and store expiration time
                if (expiresIn && typeof expiresIn === 'number') {
                    const expirationTime = Date.now() + (expiresIn * 1000);
                    localStorage.setItem('rockit_token_expiry', expirationTime.toString());
                }

                console.log("[Login] Success. Token stored.");
                onLogin();
            } else {
                throw new Error("Authentication successful but 'access_token' missing in response.");
            }
        } else {
            const errData = await res.json().catch(() => ({}));
            let msg = errData.detail || errData.message || `Login failed (HTTP ${res.status})`;
            if (typeof msg === 'object') {
                msg = JSON.stringify(msg);
            }
            throw new Error(msg);
        }
    } catch (err: any) {
        console.error("Login failed:", err);
        let msg = err.message || "Connection failed.";
        if (msg.includes("Failed to fetch")) {
            msg = "Network Error: Unable to reach authentication server. Check CORS or connection.";
        }
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

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
           {/* Username Input */}
           <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <User className="w-4 h-4 text-content-muted group-focus-within:text-accent transition-colors" />
              </div>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-background/50 border border-border focus:border-accent text-content text-sm rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-content-muted font-mono tracking-widest focus:bg-background"
                placeholder="OPERATOR ID"
                autoFocus
                disabled={loading}
              />
           </div>

           {/* Password Input */}
           <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Key className={`w-4 h-4 ${error ? 'text-rose-500' : 'text-content-muted group-focus-within:text-accent'} transition-colors`} />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className={`w-full bg-background/50 border ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-border focus:border-accent'} text-content text-sm rounded-xl py-3 pl-10 pr-4 outline-none transition-all placeholder:text-content-muted font-mono tracking-widest focus:bg-background`}
                placeholder="ACCESS KEY"
                disabled={loading}
              />
           </div>
           
           <button 
             type="submit"
             disabled={loading}
             className="w-full bg-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-all shadow-[0_0_20px_var(--accent-glow)] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                 <>
                    <span>Initialize Uplink</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                 </>
             )}
           </button>
        </form>
        
        {error && (
           <div className="mt-4 flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20 text-left">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="break-all">{error}</span>
           </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-content-muted font-bold uppercase tracking-widest mt-8 opacity-60">
          <Lock className="w-3 h-3" />
          <span>Secured Connection</span>
        </div>
      </div>
    </div>
  );
};
