
import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, Lock, ChevronRight, Key, Sparkles, Database } from 'lucide-react';
import { User } from '../types';
import { TCLogo } from '../App';

interface AuthProps {
  onLogin: (user: User) => void;
}

const STORAGE_USERS_KEY = 'cardvault_registered_users';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const getUsers = (): Record<string, string> => {
    const users = localStorage.getItem(STORAGE_USERS_KEY);
    return users ? JSON.parse(users) : {};
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    const users = getUsers();

    if (isRegistering) {
      if (users[username.toLowerCase()]) {
        setError("User already exists.");
        return;
      }
      users[username.toLowerCase()] = password;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      onLogin({ id: crypto.randomUUID(), username });
    } else {
      if (users[username.toLowerCase()] === password) {
        onLogin({ id: crypto.randomUUID(), username });
      } else {
        setError("Invalid credentials.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/[0.02] rounded-full blur-[128px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-12">
          <TCLogo className="w-24 h-24 mb-6" />
          <h1 className="text-3xl font-black tracking-tighter uppercase drop-shadow-md">
            <span className="text-blue-500">TC</span>
            <span className="text-slate-300 ml-2">VAULT</span>
          </h1>
        </div>

        <div className="glass rounded-[2.5rem] p-8 md:p-10 border-slate-800/40 shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <div className={`flex-1 h-px transition-all duration-500 ${!isRegistering ? 'bg-blue-500/40' : 'bg-slate-800'}`}></div>
            <span className="text-[11px] font-medium text-slate-500 tracking-tight">
              {isRegistering ? 'Create your Vault' : 'Login to your Vault'}
            </span>
            <div className={`flex-1 h-px transition-all duration-500 ${isRegistering ? 'bg-blue-500/40' : 'bg-slate-800'}`}></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-slate-500 tracking-tight ml-1">TC Vault Account ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl h-14 pl-12 pr-6 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 outline-none font-semibold text-white transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-slate-500 tracking-tight ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl h-14 pl-12 pr-6 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 outline-none font-semibold text-white transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl text-rose-400 text-[11px] font-semibold text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-blue-600/20 group"
            >
              {isRegistering ? 'Create Account' : 'Login'}
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-[11px] font-medium text-slate-600 hover:text-blue-400 transition-colors"
            >
              {isRegistering ? 'Already have an account? Login' : 'Sign up for a TC Vault'}
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-8">
          <AuthBenefit icon={<ShieldCheck size={16} />} label="Encrypted" />
          <AuthBenefit icon={<Database size={16} />} label="Sovereign" />
          <AuthBenefit icon={<Sparkles size={16} />} label="AI Tuned" />
        </div>
      </div>
    </div>
  );
};

const AuthBenefit = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <div className="flex flex-col items-center gap-2.5">
    <div className="text-slate-700">
      {icon}
    </div>
    <span className="text-[10px] font-medium text-slate-700 tracking-tight">{label}</span>
  </div>
);

export default Auth;
