
import React, { useState, useRef } from 'react';
import { User, Card } from '../types';
import { User as UserIcon, Settings, Grid, Lock, Unlock, MapPin, Trophy, ShieldCheck, Heart, Camera, X, Check, Loader2, Save, Edit3 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'Public' | 'Private'>('Public');
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<User>(user);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const publicCards = cards.filter(c => c.isPublic);
  const privateCards = cards.filter(c => !c.isPublic);

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
    <div className={`space-y-12 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="relative">
        <div 
          className="h-48 w-full bg-[#020617] rounded-[32px] overflow-hidden border border-white/5 relative group/banner transition-all duration-700 shadow-2xl"
          style={(bannerDraft || user.bannerUrl) ? { 
            backgroundImage: `url(${bannerDraft || user.bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        >
          {!(bannerDraft || user.bannerUrl) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-950 to-indigo-900/20 transition-transform duration-700 group-hover:scale-105"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12)_0%,transparent_75%)]"></div>
            </>
          )}
          
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          
          {isEditing && (
            <button 
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white font-black uppercase text-[10px] tracking-widest z-30"
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
              Change Banner
            </button>
          )}
          <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setBannerDraft, 'banner')} />
        </div>
        
        <div className="absolute -bottom-16 left-8 md:left-12">
          <div className="w-32 h-32 rounded-[24px] bg-black border-4 border-black overflow-hidden shadow-2xl relative group/avatar">
            <div className="w-full h-full bg-blue-600/10 flex items-center justify-center text-blue-500 relative">
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

      <div className="pt-20 md:pt-8 space-y-4 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 pl-0 md:pl-44">
            {isEditing ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <input 
                  type="text" 
                  value={editDraft.username} 
                  onChange={e => setEditDraft({...editDraft, username: e.target.value})}
                  className="bg-white/[0.03] border border-white/10 rounded-xl h-10 px-4 text-sm font-black italic focus:border-blue-500/40 outline-none transition-all text-white w-full max-w-sm" 
                  placeholder="Username"
                />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Master Collector • London, UK</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[28px] font-black text-white tracking-tighter leading-none italic">@{user.username}</h2>
                  <span title="Verified Collector" className="flex shrink-0">
                    <ShieldCheck size={20} className="text-blue-500" />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-400">Master Collector • London, UK</p>
              </>
            )}
          </div>
          
          <div className="shrink-0 flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditDraft(user);
                    setAvatarDraft(null);
                    setBannerDraft(null);
                  }}
                  className="btn-secondary h-10 px-4 uppercase text-[10px] tracking-widest gap-2"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="btn-primary h-10 px-6 uppercase text-[10px] tracking-widest gap-2"
                >
                  <Save size={14} /> Save
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="btn-secondary h-10 px-4 uppercase text-[10px] tracking-widest gap-2 shrink-0 active:scale-95"
              >
                <Settings size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[24px] border-white/5 space-y-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collector Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <Stat icon={<Grid />} label="Total" value={cards.length.toString()} />
                <Stat icon={<Heart />} label="Likes" value="1.2k" />
                <Stat icon={<MapPin />} label="Events" value="12" />
                <Stat icon={<Trophy />} label="Grails" value={cards.filter(c => c.rarityTier === '1/1').length.toString()} />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Personal Details</h3>
              <div className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <EditField label="Favourite Club" value={editDraft.favClub || ''} onChange={v => setEditDraft({...editDraft, favClub: v})} />
                    <EditField label="Favourite Player" value={editDraft.favPlayer || ''} onChange={v => setEditDraft({...editDraft, favPlayer: v})} />
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Bio</label>
                      <textarea 
                        value={editDraft.bio || ''} 
                        onChange={e => setEditDraft({...editDraft, bio: e.target.value})}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs font-semibold focus:border-blue-500/40 outline-none transition-all text-white resize-none h-24" 
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

        <div className="md:col-span-8 space-y-8">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
             <TabButton active={activeTab === 'Public'} onClick={() => setActiveTab('Public')} icon={<Unlock size={14} />} label="Public Vault" count={publicCards.length} />
             <TabButton active={activeTab === 'Private'} onClick={() => setActiveTab('Private')} icon={<Lock size={14} />} label="Secure Archive" count={privateCards.length} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {(activeTab === 'Public' ? publicCards : privateCards).map(card => (
              <div key={card.id} className="group cursor-pointer space-y-3" onClick={() => onEditCard(card)}>
                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-slate-950 flex items-center justify-center p-3 relative img-loading shadow-lg">
                  <img 
                    src={card.images[0]} 
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" 
                    alt={card.playerName} 
                  />
                  {/* Top-left edit button, visible on mobile */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditCard(card); }}
                    className="absolute top-2 left-2 p-2 bg-white text-black rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs text-white truncate">{card.playerName}</h4>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase truncate">{card.set}</p>
                </div>
              </div>
            ))}
            
            {(activeTab === 'Public' ? publicCards : privateCards).length === 0 && (
              <div className="col-span-full">
                <EmptyState 
                  icon={activeTab === 'Public' ? <Unlock /> : <Lock />} 
                  title={activeTab === 'Public' ? "No public cards" : "Archive empty"} 
                  message={activeTab === 'Public' 
                    ? "Your public vault is currently empty. Items you mark as public will appear here for others to see." 
                    : "Your private archive is empty. Secure items are only visible to you."
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

const Stat = ({ icon, label, value }: any) => (
  <div className="p-4 glass-subtle rounded-xl flex flex-col gap-3 border border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
    <div className="text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity">
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
    </div>
    <div className="space-y-1">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none block">{label}</span>
      <p className="text-xl font-black text-white tracking-tighter tabular leading-none">{value}</p>
    </div>
  </div>
);

const Detail = ({ label, value }: any) => (
  <div className="space-y-1">
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
    <p className="text-sm font-semibold text-white leading-relaxed">{value}</p>
  </div>
);

const EditField = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type="text" 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/[0.03] border border-white/10 rounded-xl h-9 px-4 text-xs font-semibold focus:border-blue-500/40 outline-none transition-all text-white" 
    />
  </div>
);

const TabButton = ({ active, onClick, icon, label, count }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 h-10 rounded-full transition-all active:scale-95 ${
      active 
        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 font-black shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
        : 'text-slate-500 hover:text-slate-300 border border-transparent font-medium'
    }`}
  >
    {icon}
    <span className="text-[10px] uppercase tracking-widest">{label}</span>
    <span className={`text-[10px] ${active ? 'opacity-50' : 'text-slate-700'}`}>{count}</span>
  </button>
);

export default ProfileView;
