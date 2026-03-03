import React, { useState, useRef, useEffect } from 'react';
import { Card, BinderPage } from '../types';
import { Sparkles, X, Save, AlertCircle, Plus, Trash2, User, Users, FileText, Eye, BrainCircuit, PoundSterling, BookOpen, Hash, Zap, ChevronDown, Loader2, Globe, Lock, Crop, ShieldCheck } from 'lucide-react';
import { identifyCard, getCardBoundingBox, BoundingBox } from '../services/gemini';
import { vaultStorage, supabase } from '../services/storage';

interface CardFormProps {
  onSubmit: (card: Card) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: Card;
  pages: BinderPage[];
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  animationClass?: string;
}

const processImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const isPng = base64Str.includes('image/png');
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.85));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const performCrop = (imgSrc: string, box: BoundingBox): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    if (imgSrc.startsWith('http')) {
      img.crossOrigin = "anonymous";
    }
    img.src = imgSrc;
    img.onload = () => {
      const isPng = imgSrc.includes('image/png');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imgSrc); return; }

      // Normalized coordinates (0-1000) to pixel coordinates
      const x = (box.xmin / 1000) * img.width;
      const y = (box.ymin / 1000) * img.height;
      const width = ((box.xmax - box.xmin) / 1000) * img.width;
      const height = ((box.ymax - box.ymin) / 1000) * img.height;

      // Add 5% padding
      const padW = width * 0.05;
      const padH = height * 0.05;

      let sx = x - padW;
      let sy = y - padH;
      let sw = width + padW * 2;
      let sh = height + padH * 2;

      // Clamp to image boundaries
      if (sx < 0) { sw += sx; sx = 0; }
      if (sy < 0) { sh += sy; sy = 0; }
      if (sx + sw > img.width) sw = img.width - sx;
      if (sy + sh > img.height) sh = img.height - sy;

      // Ensure we have valid dimensions and avoid zero-size canvas
      sw = Math.max(1, Math.floor(sw));
      sh = Math.max(1, Math.floor(sh));

      canvas.width = sw;
      canvas.height = sh;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.9));
      } catch (e) {
        console.error("Crop failed (likely CORS or Canvas limit):", e);
        resolve(imgSrc); // Fallback to original
      }
    };
    img.onerror = () => resolve(imgSrc);
  });
};

const CardForm: React.FC<CardFormProps> = ({ onSubmit, onDelete, onCancel, initialData, pages, onToast, animationClass }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<Partial<Card>>({
    playerName: '', team: '', cardSpecifics: '', set: '', setNumber: '',
    condition: 'Ungraded', pricePaid: 0, marketValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    serialNumber: '', certNumber: '', notes: '', pageId: '', rarityTier: 'Base',
    isPublic: true
  });

  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const standardConditions = ['Ungraded', 'Raw', 'PSA 10', 'PSA 9', 'PSA 8', 'BGS 10 Black Label', 'BGS 10', 'BGS 9.5', 'SGC 10', 'CGC 10'];

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setImages(initialData.images || []);
      setHasScanned(true);
    }
  }, [initialData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setIsSaving(true);
    
    try {
      let userId = 'local-guest';
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      }

      for (let i = 0; i < files.length; i++) {
        if (i > 0) await new Promise(res => setTimeout(res, 500));
        const file = files[i];
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        const compressed = await processImage(base64);
        const currentIdx = images.length + i;
        setIsCropping(currentIdx);
        
        try {
          const box = await getCardBoundingBox(compressed);
          let finalImage = compressed;
          if (box) {
            finalImage = await performCrop(compressed, box);
            if (onToast && i === 0) onToast("Auto-cropped to focus on the card", "info");
          }
          
          const storedUrl = await vaultStorage.uploadImage(userId, finalImage);
          setImages(prev => [...prev, storedUrl].slice(0, 4));
        } catch (cropErr) {
          console.error("Auto-crop failed:", cropErr);
          const storedUrl = await vaultStorage.uploadImage(userId, compressed);
          setImages(prev => [...prev, storedUrl].slice(0, 4));
        } finally {
          setIsCropping(null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecrop = async (index: number) => {
    if (isCropping !== null || isSaving) return;
    const targetImage = images[index];
    if (!targetImage) return;

    setIsCropping(index);
    try {
      let userId = 'local-guest';
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      }

      const box = await getCardBoundingBox(targetImage);
      if (box) {
        const croppedImage = await performCrop(targetImage, box);
        const storedUrl = await vaultStorage.uploadImage(userId, croppedImage);
        
        setImages(prev => {
          const newImages = [...prev];
          newImages[index] = storedUrl;
          return newImages;
        });
        
        if (onToast) onToast("Image recropped successfully", "success");
      } else {
        if (onToast) onToast("Could not detect card boundaries", "error");
      }
    } catch (err) {
      console.error("Recrop failed:", err);
      if (onToast) onToast("Recrop analysis failed", "error");
    } finally {
      setIsCropping(null);
    }
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const runScanner = async () => {
    if (images.length === 0) return;
    setIsScanning(true);
    setScanStep('Analyzing visuals...');
    setError(null);
    try {
      const result = await identifyCard(images);
      if (result) {
        setFormData(prev => {
          const newCondition = result.condition || prev.condition || 'Ungraded';
          const isPSA = newCondition.startsWith('PSA');
          return {
            ...prev,
            playerName: result.playerName,
            team: result.team || prev.team || '',
            cardSpecifics: result.cardSpecifics,
            set: result.set,
            setNumber: result.setNumber || prev.setNumber || '',
            condition: newCondition,
            marketValue: result.estimatedValue,
            serialNumber: result.serialNumber || prev.serialNumber || '',
            certNumber: isPSA ? (result.certNumber || prev.certNumber || '') : '',
            notes: result.description,
            rarityTier: result.rarityTier
          };
        });
        setHasScanned(true);
        if (onToast) onToast("AI Identification complete", 'success');
      }
    } catch {
      setError("AI analysis failed.");
    } finally { 
      setIsScanning(false); 
      setScanStep('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName || !formData.set) {
      setError("Identify the card before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const completeCard: Card = {
        ...formData as Card,
        id: initialData?.id || crypto.randomUUID(),
        images: images,
        createdAt: initialData?.createdAt || Date.now(),
        isPublic: formData.isPublic || false
      };
      await onSubmit(completeCard);
    } catch (err: any) {
      setError(err.message || "Save error.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-major pb-16 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-center justify-between gap-padding">
        <h2 className="text-[32px] font-bold tracking-tighter text-ink-primary leading-tight">
          {isEditing ? 'Modify Record' : 'Add to Collection'}
        </h2>
        <button onClick={onCancel} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-secondary/40 hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-xl active:scale-95"><X size={24} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-section">
        <div className="lg:col-span-5 space-y-section">
          <div className="card-vault p-padding space-y-padding relative overflow-hidden shadow-lg">
            {isScanning && (
              <div className="absolute inset-0 bg-surface-base/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-padding space-y-padding text-center animate-in fade-in duration-300">
                 <div className="relative w-full aspect-square border border-border-soft rounded-xl overflow-hidden bg-surface-base">
                   <div className="scanner-line"></div>
                   <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit size={48} className="text-gold-500 animate-pulse" /></div>
                 </div>
                 <div className="space-y-control">
                   <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-gold-500 px-3 py-1 rounded-full shadow-lg shadow-gold-500/20">Identifying...</span>
                   <p className="text-sm font-semibold text-ink-secondary/40 animate-pulse">{scanStep}</p>
                 </div>
              </div>
            )}
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-bold text-ink-secondary/40 uppercase tracking-widest flex items-center gap-control">
                Photos <span className="text-[8px] px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-500 border border-gold-500/20">Auto-Crop Enabled</span>
              </label>
              <span className="text-[10px] font-semibold text-ink-secondary/40 uppercase tracking-widest tabular">{images.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-control">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-square bg-surface-base rounded-xl overflow-hidden relative group border border-border-soft shadow-md flex items-center justify-center p-control img-loading">
                  <img src={img} onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')} className="w-full h-full object-contain select-none z-10" alt="Preview" />
                  {isCropping === idx && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-control">
                      <Loader2 size={24} className="text-gold-500 animate-spin" />
                      <span className="text-[8px] font-bold text-gold-500 uppercase tracking-widest">Recropping...</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col gap-control z-20">
                    <button onClick={() => removeImage(idx)} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-rose-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-lg"><Trash2 size={16} /></button>
                    {isEditing && (
                      <button type="button" onClick={() => handleRecrop(idx)} disabled={isCropping !== null} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-gold-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-lg disabled:opacity-50"><Crop size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
              {(images.length < 4 || (isCropping !== null && !images[isCropping])) && (
                <button onClick={() => fileInputRef.current?.click()} disabled={isSaving || isCropping !== null} className="aspect-square rounded-xl border border-dashed border-border-soft flex flex-col items-center justify-center gap-padding hover:border-ink-primary/20 hover:bg-surface-elevated transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[0.98] relative">
                  {isSaving || (isCropping !== null && !images[isCropping]) ? (
                    <div className="flex flex-col items-center gap-control">
                       <Loader2 className="text-gold-500 animate-spin" size={24} />
                       <span className="text-[8px] font-bold text-gold-500 uppercase tracking-[0.2em] animate-pulse">Precision Cropping...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="text-ink-secondary/20 group-hover:text-ink-secondary/40 transition-colors" size={24} />
                      <span className="text-[10px] font-bold text-ink-secondary/20 group-hover:text-ink-secondary/40 uppercase tracking-widest transition-colors">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            {images.length > 0 && (
              <button type="button" onClick={runScanner} disabled={isScanning || isSaving || isCropping !== null} className={`w-full h-14 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-control active:scale-[0.97] ${hasScanned ? 'btn-secondary text-ink-secondary/40' : 'btn-primary'}`}>
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={16} />}
                <span className="uppercase text-[10px] tracking-widest">{hasScanned ? 'Rescan Identification' : 'Identify with AI'}</span>
              </button>
            )}
          </div>

          <div className="card-vault p-padding space-y-padding">
            <h3 className="text-[10px] font-bold text-ink-secondary/40 uppercase tracking-widest px-2">Visibility</h3>
            <div className="grid grid-cols-2 gap-control">
              <button type="button" onClick={() => setFormData({...formData, isPublic: true})} className={`flex flex-col items-center justify-center gap-control p-6 rounded-xl border transition-all ${formData.isPublic ? 'bg-gold-500/10 border-gold-500/30 text-gold-500' : 'bg-surface-base border-border-soft text-ink-secondary/40 hover:border-ink-primary/10'}`}>
                <Globe size={24} /><span className="text-[10px] font-bold uppercase tracking-widest">Public</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, isPublic: false})} className={`flex flex-col items-center justify-center gap-control p-6 rounded-xl border transition-all ${!formData.isPublic ? 'bg-surface-elevated border-border-soft text-ink-primary' : 'bg-surface-base border-border-soft text-ink-secondary/40 hover:border-ink-primary/10'}`}>
                <Lock size={24} /><span className="text-[10px] font-bold uppercase tracking-widest">Private</span>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-section">
          <div className="card-vault p-padding md:p-12 space-y-padding shadow-lg bg-white/[0.01]">
            {error && <div className="p-padding bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-padding text-rose-500 text-sm font-bold tracking-tight animate-in slide-in-from-top-2 duration-200"><AlertCircle size={16} />{error}</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <Field label="Player" value={formData.playerName} onChange={(v: string) => setFormData({...formData, playerName: v})} icon={<User size={16} />} />
              <Field label="Team" value={formData.team} onChange={(v: string) => setFormData({...formData, team: v})} icon={<Users size={16} />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <Field label="Set / Product" value={formData.set} onChange={(v: string) => setFormData({...formData, set: v})} icon={<Eye size={16} />} />
              <Field label="Set Number" value={formData.setNumber} onChange={(v: string) => setFormData({...formData, setNumber: v})} icon={<Hash size={16} />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <Field label="Parallel / Variant" value={formData.cardSpecifics} onChange={(v: string) => setFormData({...formData, cardSpecifics: v})} icon={<FileText size={16} />} />
              <div className="grid grid-cols-2 gap-control">
                <Field label="Serial #" value={formData.serialNumber} onChange={(v: string) => setFormData({...formData, serialNumber: v})} icon={<BookOpen size={16} />} />
                {formData.condition?.startsWith('PSA') && (
                  <Field label="PSA Cert #" value={formData.certNumber} onChange={(v: string) => setFormData({...formData, certNumber: v})} icon={<ShieldCheck size={16} />} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <div className="space-y-control">
                <label className="text-[10px] font-bold text-ink-secondary/40 uppercase tracking-widest ml-1">Grade / Condition</label>
                <div className="relative group">
                   <select 
                    value={formData.condition || ''} 
                    onChange={e => {
                      const newCondition = e.target.value;
                      const isPSA = newCondition.startsWith('PSA');
                      setFormData({
                        ...formData, 
                        condition: newCondition,
                        certNumber: isPSA ? formData.certNumber : ''
                      });
                    }} 
                    style={{ colorScheme: 'light' }} 
                    className="w-full bg-surface-base border border-border-soft rounded-xl h-14 px-padding outline-none font-bold text-sm text-ink-primary focus:border-gold-500/40 appearance-none transition-all cursor-pointer"
                  >
                    {standardConditions.map(c => <option key={c} value={c} className="bg-white font-semibold">{c}</option>)}
                   </select>
                   <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-secondary/40" />
                </div>
              </div>
              <div className="space-y-control">
                <label className="text-[10px] font-bold text-ink-secondary/40 uppercase tracking-widest ml-1">Assign to Binder</label>
                <div className="relative group">
                  <select value={formData.pageId || ''} onChange={e => setFormData({...formData, pageId: e.target.value})} style={{ colorScheme: 'light' }} className={`w-full bg-surface-base border rounded-xl h-14 px-padding outline-none font-bold text-sm transition-all appearance-none cursor-pointer ${formData.pageId ? 'border-gold-500/40 text-gold-500' : 'border-border-soft text-ink-secondary/40'}`}>
                    <option value="" className="bg-white font-semibold">All Cards</option>
                    {pages.map(p => <option key={p.id} value={p.id} className="bg-white font-semibold">{p.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-secondary/40" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section pt-padding border-t border-border-soft">
              <Field label="Price Paid (£)" type="number" value={formData.pricePaid} onChange={(v: string) => setFormData({...formData, pricePaid: Number(v)})} icon={<PoundSterling size={16} />} />
              <Field label="Market Value (£)" type="number" value={formData.marketValue} onChange={(v: string) => setFormData({...formData, marketValue: Number(v)})} icon={<Zap size={16} />} />
            </div>
          </div>
          
          <div className="flex gap-control">
            {isEditing && (
              <button type="button" onClick={() => initialData && onDelete?.(initialData.id)} className="btn-secondary text-rose-500 border-rose-500/20 hover:bg-rose-500/10 h-14 px-6 uppercase text-[10px] tracking-widest flex items-center justify-center transition-all active:scale-95"><Trash2 size={20} className="mr-2" /><span className="hidden sm:inline">Delete Record</span></button>
            )}
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 h-14 uppercase text-[10px] tracking-widest">Discard</button>
            <button type="submit" disabled={isSaving || isCropping !== null} className={`btn-primary flex-[2] h-14 uppercase text-[10px] tracking-widest ${isSaving || isCropping !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" size={20} />}
              <span>{isEditing ? 'Update Card' : 'Add to Collection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  type?: string;
}

const Field = ({ label, value, onChange, icon, type = 'text' }: FieldProps) => (
  <div className="space-y-control">
    <label className="text-[10px] font-bold text-ink-secondary/40 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary/40 group-focus-within:text-gold-500 transition-colors">{icon}</div>
      <input type={type} step="0.01" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-base border border-border-soft rounded-xl h-14 pl-12 pr-4 focus:border-gold-500/40 outline-none font-semibold text-sm text-ink-primary transition-all placeholder:text-ink-secondary/20" />
    </div>
  </div>
);

export default CardForm;