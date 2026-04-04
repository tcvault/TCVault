import React, { useState, useRef } from 'react';
import { User, Card } from '../types';
import { User as UserIcon, Settings, Grid, Lock, Unlock, Trophy, ShieldCheck, Camera, Loader2, Save, Edit3 } from 'lucide-react';
import EmptyState from './EmptyState';
import { vaultStorage } from '../services/storage';

interface ProfileViewProps {
  user: User;
  cards: Card[];
  onEditCard: (card: Card) => void;
  onUpdateProfile?: (user: User) => void;
  animationClass?: string;
}

const processImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const ProfileView: React.FC<ProfileViewProps> = ({ user, cards, onEditCard, onUpdateProfile, animationClass }) => {
  const [activeTab, setActiveTab] = useState<'Public' | 'Private' | 'Grails'>('Public');
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<User>(user);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const publicCards = cards.filter(c => c.isPublic);
  const privateCards = cards.filter(c => !c.isPublic);
  const grailCards = cards.filter(c => c.rarityTier === '1/1');
  const visibleCards = activeTab === 'Public' ? publicCards : activeTab === 'Private' ? privateCards : grailCards;

  const handleImageUpload = async (file: File, setter: (url: string) => void, type: 'avatar' | 'banner') => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await processImage(base64, type === 'banner' ? 1600 : 800);
      const url = await vaultStorage.uploadImage(user.id, compressed);
      setter(url);
    } catch (e) {
      console.error("Profile image upload failed:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        ...editDraft,
        avatar: avatarDraft ?? user.avatar,
        bannerUrl: bannerDraft ?? user.bannerUrl,
      });
    }
    setIsEditing(false);
    setAvatarDraft(null);
    setBannerDraft(null);
  };

  return (
    <div className={`space-y-major px-3 sm:px-0 pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="relative">
        <div 
          className="h-48 w-full bg-ink-primary rounded-xl overflow-hidden border border-border-soft relative group/banner transition-all duration-700 shadow-2xl"
          style={(bannerDraft || user.bannerUrl) ? { 
            backgroundImage: `url(${bannerDraft || user.bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        >
          {!(bannerDraft || user.bannerUrl) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-ink-primary via-ink-primary/80 to-ink-primary transition-transform duration-700 group-hover:scale-105"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,162,39,0.1)_0%,transparent_75%)]"></div>
            </>
          )}
          
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")" }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          {isEditing && (
            <button 
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center gap-control text-white font-bold uppercase text-xs tracking-widest z-30"
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
              Change Banner
            </button>
          )}
          <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setBannerDraft, 'banner')} />
        </div>
        
        <div className="absolute -bottom-16 left-8 md:left-12">
          <div className="w-32 h-32 rounded-xl bg-surface-base border-4 border-surface-base overflow-hidden shadow-2xl relative group/avatar">
            <div className="w-full h-full bg-gold-500/10 flex items-center justify-center text-gold-500 relative">
              { (avatarDraft || user.avatar) ? (
                <img src={avatarDraft || user.avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <UserIcon size={48} />
              )}
              
              {isEditing && (
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white z-30"
                >
                  {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
                </button>
              )}
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setAvatarDraft, 'avatar')} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 md:pt-8 space-y-control mb-8">
        <div className="flex items-start justify-between gap-padding">
          <div className="space-y-control pl-0 md:pl-44">
            {isEditing ? (
              <div className="space-y-control animate-in fade-in slide-in-from-left-2 duration-300">
                <input 
                  type="text" 
                  value={editDraft.username ?? ''} 
                  onChange={e => setEditDraft({...editDraft, username: e.target.value})}
                  className="bg-surface-base border border-border-soft rounded-xl h-10 px-padding text-sm font-bold italic focus:border-gold-500/40 outline-none transition-all text-ink-primary w-full max-w-sm" 
                  placeholder="Username"
                />
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest px-1">Trading Card Collector</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-control flex-wrap">
                  <h1 className="text-[28px] italic">@{user.username}</h1>
                  <span title="Verified Collector" className="flex shrink-0">
                    <ShieldCheck size={20} className="text-gold-500" />
                  </span>
                </div>
                <p className="text-sm font-semibold text-ink-tertiary">Trading Card Collector</p>
              </>
            )}
          </div>
          
          <div className="shrink-0 flex gap-control">
            {isEditing ? (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditDraft(user);
                    setAvatarDraft(null);
                    setBannerDraft(null);
                  }}
                  className="btn-secondary h-10 px-4 text-xs tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="btn-primary h-10 px-6 text-xs tracking-widest gap-2 font-bold"
                >
                  <Save size={14} /> Save
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="btn-secondary h-10 px-4 text-xs tracking-widest gap-2 shrink-0 active:scale-95"
              >
                <Settings size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-section">
        <div className="md:col-span-4 space-y-section">
          <div className="card-vault p-padding space-y-padding">
            <div className="space-y-padding">
              <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">Collector Stats</h3>
              <div className="grid grid-cols-2 gap-control">
                <Stat icon={<Grid />} label="Total" value={cards.length.toString()} />
                <Stat icon={<Unlock />} label="Public" value={publicCards.length.toString()} />
                <Stat icon={<Lock />} label="Private" value={privateCards.length.toString()} />
                <Stat icon={<Trophy />} label="Grails" value={grailCards.length.toString()} onClick={() => setActiveTab('Grails')} />
              </div>
            </div>

            <div className="space-y-padding pt-padding border-t border-border-soft">
              <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">Personal Details</h3>
              <div className="space-y-section">
                {isEditing ? (
                  <div className="space-y-padding animate-in fade-in duration-300">
                    <EditField label="Favourite Club" value={editDraft.favClub || ''} onChange={v => setEditDraft({...editDraft, favClub: v})} />
                    <EditField label="Favourite Player" value={editDraft.favPlayer || ''} onChange={v => setEditDraft({...editDraft, favPlayer: v})} />
                    <div className="space-y-control">
                      <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest ml-1">Bio</label>
                      <textarea 
                        value={editDraft.bio || ''} 
                        onChange={e => setEditDraft({...editDraft, bio: e.target.value})}
                        className="w-full bg-surface-base border border-border-soft rounded-xl p-padding text-xs font-semibold focus:border-gold-500/40 outline-none transition-all text-ink-primary resize-none h-24" 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Detail label="Favourite Club" value={user.favClub || 'Not set'} />
                    <Detail label="Favourite Player" value={user.favPlayer || 'Not set'} />
                    <Detail label="Bio" value={user.bio || 'Chasing the finest parallels of the modern era.'} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 space-y-section">
          <div className="flex items-center gap-control border-b border-border-soft pb-control overflow-x-auto no-scrollbar">
             <TabButton active={activeTab === 'Public'} onClick={() => setActiveTab('Public')} icon={<Unlock size={14} />} label="Public Vault" count={publicCards.length} />
             <TabButton active={activeTab === 'Private'} onClick={() => setActiveTab('Private')} icon={<Lock size={14} />} label="Private Stash" count={privateCards.length} />
             <TabButton active={activeTab === 'Grails'} onClick={() => setActiveTab('Grails')} icon={<Trophy size={14} />} label="Grails" count={grailCards.length} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-padding">
            {visibleCards.map(card => (
              <div key={card.id} className="group cursor-pointer space-y-control" onClick={() => onEditCard(card)}>
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border-soft bg-surface-base flex items-center justify-center p-control relative img-loading shadow-sm">
                  <img 
                    src={card.images[0]} 
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" 
                    alt={card.playerName} 
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditCard(card); }}
                    className="absolute top-2 left-2 p-2 bg-ink-primary text-gold-500 rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-ink-primary truncate">{card.playerName}</h4>
                  <p className="text-xs text-ink-tertiary font-semibold uppercase truncate">{card.set}</p>
                </div>
              </div>
            ))}
            
            {visibleCards.length === 0 && (
              <div className="col-span-full">
                <EmptyState compact className="mx-1 sm:mx-0" 
                  icon={activeTab === 'Public' ? <Unlock /> : activeTab === 'Private' ? <Lock /> : <Trophy />} 
                  title={activeTab === 'Public' ? "Vault is empty" : activeTab === 'Private' ? "Stash is empty" : "No grails yet"} 
                  message={activeTab === 'Public' 
                    ? "Your public collection is currently empty. Items you mark as public will appear here." 
                    : activeTab === 'Private'
                    ? "Your private stash is empty. Secured items are only visible to you."
                    : "Set a card's rarity to 1/1 to have it appear in Grails."
                  } 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatProps { icon: React.ReactNode; label: string; value: string | number; onClick?: () => void; }
const Stat = ({ icon, label, value, onClick }: StatProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-padding bg-surface-base rounded-xl flex flex-col gap-padding border border-border-soft hover:bg-surface-elevated transition-colors group text-left w-full ${onClick ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
  >
    <div className="text-gold-500 opacity-60 group-hover:opacity-100 transition-opacity flex justify-between">
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 16 }) : icon}
    </div>
    <div className="space-y-0.5">
      <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest leading-none block">{label}</span>
      <p className="text-xl font-bold text-ink-primary tracking-tighter tabular leading-none">{value}</p>
    </div>
  </button>
);

interface DetailProps { label: string; value: React.ReactNode; }
const Detail = ({ label, value }: DetailProps) => (
  <div className="space-y-control">
    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">{label}</span>
    <p className="text-sm font-semibold text-ink-tertiary leading-relaxed">{value}</p>
  </div>
);

const EditField = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-control">
    <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest ml-1">{label}</label>
    <input 
      type="text" 
      value={value ?? ''} 
      onChange={e => onChange(e.target.value)}
      className="w-full bg-surface-base border border-border-soft rounded-xl h-9 px-padding text-xs font-semibold focus:border-gold-500/40 outline-none transition-all text-ink-primary" 
    />
  </div>
);

interface TabButtonProps { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number; }
const TabButton = ({ active, onClick, icon, label, count }: TabButtonProps) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-control px-4 h-10 rounded-full transition-all active:scale-95 whitespace-nowrap relative ${
      active 
        ? 'bg-surface-elevated text-ink-primary font-bold border border-border-soft' 
        : 'text-ink-tertiary hover:text-ink-primary border border-transparent font-medium'
    }`}
  >
    {icon}
    <span className="text-xs uppercase tracking-widest">{label}</span>
    <span className={`text-xs ${active ? 'opacity-50' : 'text-ink-tertiary/40'}`}>{count}</span>
    {active && <div className="absolute -bottom-control left-1/2 -translate-x-1/2 w-1 h-1 bg-gold-500 rounded-full"></div>}
  </button>
);

export default ProfileView;

