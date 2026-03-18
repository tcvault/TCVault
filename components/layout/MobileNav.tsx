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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-elevated flex items-center justify-around px-8 z-[50] shadow-[0_-4px_24px_rgba(0,0,0,0.10),0_-1px_0_rgba(203,185,150,0.6)]">
      <MobileNavButton active={view === ViewMode.FEED} onClick={() => setView(ViewMode.FEED)} icon={<Rss size={20} />} label="Corner" />
      <MobileNavButton active={view === ViewMode.EXPLORE} onClick={() => setView(ViewMode.EXPLORE)} icon={<Compass size={20} />} label="Explore" />
      {!isGuest ? (
        <>
          <button 
            onClick={() => setView(ViewMode.ADD_CARD)} 
            style={goldGradientStyle}
            className="w-14 h-14 rounded-xl flex items-center justify-center -translate-y-7 shadow-[0_-6px_20px_rgba(201,162,39,0.3),0_10px_30px_rgba(201,162,39,0.25)] border-[3px] border-surface-base active:scale-[0.97] transition-all"
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
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all p-2 active:scale-[0.97] relative ${active ? 'text-ink-primary' : 'text-ink-tertiary'}`}>
    {React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, {
      size: 20,
      className: active ? 'text-gold-500' : '',
    })}
    <span className={`text-xs font-bold uppercase tracking-widest leading-none ${active ? 'text-gold-700' : ''}`}>{label}</span>
    {/* Gold bar indicator at top of nav */}
    {active && (
      <div
        className="absolute -top-[1px] left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
        style={{ background: 'var(--gold-gradient)' }}
      />
    )}
  </button>
);
