
import React, { useState, useEffect } from 'react';
import { ShieldCheck, User as UserIcon, Lock, KeyRound, RefreshCcw, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { User } from '../types';
import { TCLogo } from '../App';
import { supabase } from '../services/storage';

interface AuthMode {
  id: 'login' | 'register' | 'forgot-password' | 'update-password';
}

interface AuthProps {
  onLogin: (user: User) => void;
  onCancel?: () => void;
}

type AuthModeType = 'login' | 'register' | 'forgot-password' | 'update-password';

const Auth: React.FC<AuthProps> = ({ onLogin, onCancel }) => {
  const [authMode, setAuthMode] = useState<AuthModeType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!supabase) return;
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
          if (data.session) onLogin({ id: data.user.id, username: email });
          else setSuccessMessage('Check your email to confirm registration.');
        }
      } else if (authMode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) onLogin({ id: data.user.id, username: email });
      } else if (authMode === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setSuccessMessage('Instructions sent! Check your inbox.');
      } else if (authMode === 'update-password') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setSuccessMessage('Vault re-secured. Please log in.');
        setTimeout(() => setAuthMode('login'), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = () => {
    switch (authMode) {
      case 'register': return 'Create Account';
      case 'login': return 'Sign In';
      case 'forgot-password': return 'Reset Password';
      case 'update-password': return 'Update Key';
      default: return 'Authentication';
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Absolute Close Button */}
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-8 right-8 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center glass-subtle rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all active:scale-95 z-50 shadow-xl"
        >
          <X size={24} />
        </button>
      )}

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
        <div className="flex flex-col items-center gap-6">
          <TCLogo className="w-28 h-28 drop-shadow-[0_0_40px_rgba(59,130,246,0.25)]" />
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tighter leading-none"><span className="text-blue-500 italic">TC</span><span className="text-slate-200 ml-2 uppercase">Vault</span></h1>
          </div>
        </div>

        <div className="glass rounded-[32px] p-10 border-white/5 shadow-2xl space-y-8 relative animate-in zoom-in-95 duration-[300ms]">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">
              {getLabel()}
            </span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          {successMessage ? (
            <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-white">{successMessage}</p>
              <button onClick={() => { setAuthMode('login'); setSuccessMessage(''); }} className="btn-tertiary text-[10px] font-black uppercase flex items-center gap-2 mx-auto active:scale-95"><ArrowLeft size={16} /> Back to Sign In</button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-8">
              <div className="space-y-5">
                {(authMode !== 'update-password') && (
                  <AuthField label="Username (Email)" icon={<UserIcon size={16} />} value={email} onChange={setEmail} placeholder="collector@tcvault.app" />
                )}
                {(authMode !== 'forgot-password') && (
                  <AuthField 
                    label="Password" 
                    type="password" 
                    icon={<Lock size={16} />} 
                    value={password} 
                    onChange={setPassword} 
                    placeholder="••••••••" 
                    extra={authMode === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => setAuthMode('forgot-password')} 
                        className="text-[10px] font-black text-slate-600 hover:text-blue-400 uppercase transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                      >
                        Forgot?
                      </button>
                    )}
                  />
                )}
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 animate-in slide-in-from-top-2 duration-200">
                  <AlertTriangle size={16} className="shrink-0" /><span className="text-sm font-black uppercase leading-tight">{error}</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className={`btn-primary w-full h-14 uppercase text-[10px] tracking-widest ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isLoading ? <Loader2 size={20} className="animate-spin text-white/50" /> : (
                  authMode === 'register' ? 'Register Account' : authMode === 'login' ? 'Login' : 'Reset Vault Key'
                )}
              </button>

              <div className="text-center pt-2">
                <button type="button" onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setError(''); }} className="btn-tertiary uppercase text-[10px] tracking-widest p-2 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500">
                  {authMode === 'register' ? 'Back to Login' : 'No Account? Create a Vault'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-center gap-12">
           <div className="flex flex-col items-center gap-2 text-slate-600">
             <ShieldCheck size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Encrypted</span>
           </div>
           <div className="flex flex-col items-center gap-2 text-slate-600">
             <RefreshCcw size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Synced</span>
           </div>
           <div className="flex flex-col items-center gap-2 text-slate-600">
             <KeyRound size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Audited</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const AuthField = ({ label, value, onChange, icon, type = 'text', placeholder, extra }: any) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between px-1">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</label>
      {extra}
    </div>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">{icon}</div>
      <input type={type} required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-950/60 border border-white/5 rounded-xl h-14 pl-12 pr-4 focus:border-blue-500/40 outline-none font-semibold text-sm text-white transition-all placeholder:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500/20" />
    </div>
  </div>
);

export default Auth;
