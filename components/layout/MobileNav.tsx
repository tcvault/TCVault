import React from 'react';
import { Rss, Compass, Plus, Layers as BinderIcon, User as UserIcon, ShieldCheck } from 'lucide-react';
import { ViewMode, BinderPage } from '../../types';

interface MobileNavProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  isGuest: boolean;
  binders: BinderPage[];
  setSelectedBinderId: (id: string) => void;
  setShowBinderSheet: (show: boolean) => void;
  goldGradientStyle: React.CSSProperties;
}

export const MobileNav = ({
  view,
  setView,
  isGuest,
  binders,
  setSelectedBinderId,
  setShowBinderSheet,
  goldGradientStyle
}: MobileNavProps) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#f5f2ec]/90 backdrop-blur-xl border-t border-black/6 flex items-center justify-around px-8 z-[50] shadow-xl">
      <MobileNavButton active={view === ViewMode.FEED} onClick={() => setView(ViewMode.FEED)} icon={<Rss size={20} />} label="Feed" />
      <MobileNavButton active={view === ViewMode.EXPLORE} onClick={() => setView(ViewMode.EXPLORE)} icon={<Compass size={20} />} label="Explore" />
      {!isGuest ? (
        <>
          <button 
            onClick={() => setView(ViewMode.ADD_CARD)} 
            style={goldGradientStyle}
            className="w-14 h-14 rounded-xl flex items-center justify-center -translate-y-7 shadow-[0_-6px_20px_rgba(201,162,39,0.3),0_10px_30px_rgba(201,162,39,0.25)] border-[3px] border-[#faf8f4] active:scale-[0.97] transition-all"
          >
            <Plus size={32} />
          </button>
          <MobileNavButton
            active={view === ViewMode.INVENTORY}
            onClick={() => {
              if (binders.length === 0) {
                setView(ViewMode.INVENTORY);
                setSelectedBinderId('all');
              } else {
                setShowBinderSheet(true);
              }
            }}
            icon={<BinderIcon size={20} />}
            label="Vault"
          />
          <MobileNavButton active={view === ViewMode.PROFILE} onClick={() => setView(ViewMode.PROFILE)} icon={<UserIcon size={20} />} label="You" />
        </>
      ) : (
        <MobileNavButton active={view === ViewMode.SETTINGS} onClick={() => setView(ViewMode.SETTINGS)} icon={<ShieldCheck size={20} />} label="Join" />
      )}
    </nav>
  );
};

interface MobileNavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
}

const MobileNavButton = ({ active, onClick, icon, label }: MobileNavButtonProps) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all p-2 active:scale-[0.97] ${active ? 'text-[#c9a227]' : 'text-stone-400'}`}>
    {React.cloneElement(icon, { size: 20 } as any)}
    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
  </button>
);
