
import React, { useState, useEffect } from 'react';
import { ShieldCheck, User as UserIcon, Lock, ChevronRight, Key, Sparkles, Database, Box, HelpCircle, AlertTriangle, RefreshCcw, ArrowLeft, Search as SearchIcon, Loader2, KeyRound, CheckCircle2, Mail, Clock } from 'lucide-react';
import { User } from '../types';
import { TCLogo } from '../App';
import { supabase } from '../services/storage';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'update-password' | 'admin-access';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Remove the redundant listener that was causing session conflicts with App.tsx
  useEffect(() => {
    if (!supabase) return;
    // We only need to check for recovery mode transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setAuthMode('update-password');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // MASTER ADMIN BYPASS (Strictly local, no Supabase involvement)
      if (email === 'admin@tcvault.app' && password === 'vault-admin-2025') {
        onLogin({ id: 'admin-master', username: 'Administrator' });
        return;
      }

      const formattedEmail = email.includes('@') ? email : `${email}@tcvault.app`;

      if (authMode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formattedEmail,
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          if (data.session) {
            onLogin({ id: data.user.id, username: email });
          } else {
            setSuccessMessage('Registration successful! Check your email to confirm.');
          }
        }
      } else if (authMode === 'login' || authMode === 'admin-access') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          onLogin({ id: data.user.id, username: email });
        }
      } else if (authMode === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setSuccessMessage('Reset link sent! Check your inbox.');
      } else if (authMode === 'update-password') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setSuccessMessage('Password updated. You can now log in.');
        setTimeout(() => setAuthMode('login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-12">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <TCLogo className="w-20 h-20 shadow-2xl shadow-blue-500/20" />
            <div className="absolute -inset-1 bg-blue-500/20 blur-xl rounded-full -z-10"></div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              <span className="text-blue-500 italic">TC</span>
              <span className="text-slate-300 ml-2 uppercase">Vault</span>
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Secure Entrance</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2rem] p-10 border-white/5 shadow-2xl space-y-8 relative group">
          <div className="absolute inset-0 bg-blue-500/[0.01] group-hover:bg-blue-500/[0.02] transition-colors pointer-events-none"></div>
          
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase italic">
              {authMode === 'register' && 'Initialize Account'}
              {authMode === 'login' && 'Identity Verification'}
              {authMode === 'forgot-password' && 'Key Recovery'}
              {authMode === 'update-password' && 'Vault Recalibration'}
              {authMode === 'admin-access' && 'Admin Override'}
            </span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          {successMessage ? (
            <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm font-bold text-white leading-tight">{successMessage}</p>
              <button 
                onClick={() => { setAuthMode('login'); setSuccessMessage(''); setError(''); }}
                className="text-[10px] font-black text-blue-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 mx-auto"
              >
                <ArrowLeft size={12} /> Return to Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-8">
              <div className="space-y-5">
                {(authMode === 'login' || authMode === 'register' || authMode === 'forgot-password' || authMode === 'admin-access') && (
                  <AuthField 
                    label="Vault Identity (Email)" 
                    icon={<UserIcon size={16} />} 
                    value={email} 
                    onChange={setEmail} 
                    placeholder="name@tcvault.app" 
                  />
                )}
                
                {(authMode === 'login' || authMode === 'register' || authMode === 'update-password' || authMode === 'admin-access') && (
                  <div className="space-y-3">
                    <AuthField 
                      label="Access Cipher"
                      type="password" 
                      icon={<Lock size={16} />} 
                      value={password} 
                      onChange={setPassword} 
                      placeholder="••••••••" 
                    />
                    {authMode === 'login' && (
                      <div className="flex justify-between items-center px-1">
                        <button 
                          type="button" 
                          onClick={() => setAuthMode('admin-access')}
                          className="text-[9px] font-black text-slate-700 hover:text-blue-500 transition-colors uppercase"
                        >
                          Admin Logic
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setAuthMode('forgot-password')}
                          className="text-[9px] font-black text-slate-700 hover:text-blue-400 transition-colors uppercase"
                        >
                          Lost Key?
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400 animate-in shake">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="text-[10px] font-black tracking-tight uppercase leading-tight">{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-2xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-white/50" />
                ) : (
                  <>
                    {authMode === 'register' && 'Create Vault'}
                    {authMode === 'login' && 'Unlock Entrance'}
                    {authMode === 'forgot-password' && 'Request Recovery'}
                    {authMode === 'update-password' && 'Re-seal Vault'}
                    {authMode === 'admin-access' && 'Administrative Login'}
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                {authMode !== 'forgot-password' && authMode !== 'admin-access' && (
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setError(''); }} 
                    className="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    {authMode === 'register' ? 'Existing collector? Login' : 'New collector? Initialize Vault'}
                  </button>
                )}
                
                {(authMode === 'forgot-password' || authMode === 'admin-access') && (
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 mx-auto"
                  >
                    <ArrowLeft size={12} /> Standard Access
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-center gap-12 text-slate-800">
           <div className="flex flex-col items-center gap-2">
             <ShieldCheck size={20} />
             <span className="text-[8px] font-black uppercase tracking-[0.2em]">Encrypted</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <RefreshCcw size={20} />
             <span className="text-[8px] font-black uppercase tracking-[0.2em]">Synced</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <KeyRound size={20} />
             <span className="text-[8px] font-black uppercase tracking-[0.2em]">Audited</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const AuthField = ({ label, value, onChange, icon, type = 'text', placeholder }: any) => (
  <div className="space-y-2.5">
    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800">{icon}</div>
      <input 
        type={type} 
        required 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full bg-slate-950/60 border border-white/5 rounded-2xl h-12 pl-12 pr-4 focus:border-blue-500/40 outline-none font-semibold text-sm text-white transition-all placeholder:text-slate-900" 
      />
    </div>
  </div>
);

export default Auth;
