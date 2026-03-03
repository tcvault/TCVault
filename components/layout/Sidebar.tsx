import React from 'react';
import { Rss, Compass, LayoutDashboard as DashboardIcon, Layers as BinderIcon, ChevronDown, PlusCircle, User as UserIcon, Power } from 'lucide-react';
import { ViewMode, User, BinderPage } from '../../types';
import { TCLogo } from '../Branding';
import { goldTextStyle } from '../../styles';

interface SidebarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  isGuest: boolean;
  currentUser: User;
  binders: BinderPage[];
  selectedBinderId: string;
  setSelectedBinderId: (id: string) => void;
  handleLogout: () => void;
}

export const Sidebar = ({
  view,
  setView,
  isGuest,
  currentUser,
  binders,
  selectedBinderId,
  setSelectedBinderId,
  handleLogout
}: SidebarProps) => {
  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 cursor-pointer mb-2" onClick={() => setView(ViewMode.FEED)}>
        <TCLogo className="w-10 h-10 shrink-0" />
        <div>
          <p className="text-sm font-black tracking-tighter uppercase leading-none">
            <span style={goldTextStyle}>TC</span>
            <span className="text-stone-800 ml-1">Vault</span>
          </p>
          <p style={goldTextStyle} className="text-[9px] font-semibold uppercase tracking-widest leading-none mt-0.5">
            Collectors Community
          </p>
        </div>
      </div>

      <nav className="space-y-8 flex-1 overflow-y-auto no-scrollbar mt-12 pb-8">
        <div className="space-y-2">
          <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Community</span>
          <NavButton active={view === ViewMode.FEED} onClick={() => setView(ViewMode.FEED)} icon={<Rss size={16} />} label="Global Feed" />
          <NavButton active={view === ViewMode.EXPLORE} onClick={() => setView(ViewMode.EXPLORE)} icon={<Compass size={16} />} label="Explore" />
        </div>

        {!isGuest && (
          <>
            <div className="space-y-2">
              <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Asset Management</span>
              <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={16} />} label="Portfolio" />
              
              <div className="space-y-1">
                <NavButton 
                  active={view === ViewMode.INVENTORY} 
                  onClick={() => {
                    setView(ViewMode.INVENTORY);
                    setSelectedBinderId('all');
                  }} 
                  icon={<BinderIcon size={16} />} 
                  label="Collection" 
                  trailing={binders.length > 0 && <ChevronDown size={14} className={`transition-transform duration-300 ${view === ViewMode.INVENTORY ? 'rotate-180' : ''}`} />}
                />
                
                {binders.length > 0 && (view === ViewMode.INVENTORY || binders.some(b => b.id === selectedBinderId)) && (
                  <div className="pl-9 space-y-1 mt-1 border-l-2 border-black/5 ml-6 animate-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId('all'); }}
                      className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-all text-left ${view === ViewMode.INVENTORY && selectedBinderId === 'all' ? 'text-[#c9a227] font-bold' : 'text-stone-400 hover:text-stone-600 hover:bg-black/[0.02]'}`}
                    >
                      <span className="text-[11px] uppercase tracking-wider">All Cards</span>
                    </button>
                    {binders.map(binder => (
                      <button 
                        key={binder.id}
                        onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId(binder.id); }}
                        className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-all text-left group ${view === ViewMode.INVENTORY && selectedBinderId === binder.id ? 'text-[#c9a227] font-bold' : 'text-stone-400 hover:text-stone-600 hover:bg-black/[0.02]'}`}
                      >
                        <span className="text-[11px] truncate">{binder.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={16} />} label="Add Card" />
            </div>

            <div className="space-y-2">
              <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Identity</span>
              <NavButton active={view === ViewMode.PROFILE} onClick={() => setView(ViewMode.PROFILE)} icon={<UserIcon size={16} />} label="My Profile" />
            </div>
          </>
        )}
      </nav>

      <div className="space-y-4 pt-6 mt-auto border-t border-black/6">
        {!isGuest ? (
          <div className="flex items-center justify-between px-4 h-12 rounded-xl glass-subtle">
            <div className="flex items-center gap-2 truncate">
              <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${currentUser.avatar ? '' : 'bg-[#c9a227]/10 text-[#c9a227]'}`}>
                {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : <UserIcon size={16} />}
              </div>
              <span className="text-sm font-bold truncate italic">{currentUser?.username}</span>
            </div>
            <button onClick={handleLogout} className="text-stone-400 hover:text-rose-500 transition-colors p-2 active:scale-90" title="Sign Out">
              <Power size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setView(ViewMode.SETTINGS)}
            className="w-full btn-primary h-12 uppercase text-[10px] tracking-widest"
          >
            Join Vault
          </button>
        )}
      </div>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  trailing?: React.ReactNode;
}

const NavButton = ({ active, onClick, icon, label, trailing }: NavButtonProps) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between gap-4 px-4 h-12 rounded-xl transition-all active:scale-[0.97] ${active ? 'bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20 shadow-lg' : 'text-stone-400 hover:text-stone-700 hover:bg-black/[0.03]'}`}>
    <div className="flex items-center gap-4">
      {React.cloneElement(icon, { size: 16 } as any)}
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {trailing}
  </button>
);
