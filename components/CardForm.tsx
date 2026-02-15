
import React, { useState, useRef, useEffect } from 'react';
import { Card, BinderPage } from '../types';
import { Sparkles, X, Save, AlertCircle, Plus, Trash2, User, Users, FileText, Eye, BrainCircuit, Scan, ShieldCheck, CheckCircle2, PoundSterling, BookOpen, Hash, Zap, ChevronDown, Loader2 } from 'lucide-react';
import { identifyCard } from '../services/gemini';
import { vaultStorage, supabase } from '../services/storage';

interface CardFormProps {
  onSubmit: (card: Card) => void;
  onCancel: () => void;
  initialData?: Card;
  pages: BinderPage[];
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
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

const CardForm: React.FC<CardFormProps> = ({ onSubmit, onCancel, initialData, pages, onToast }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<Partial<Card>>({
    playerName: '', team: '', cardSpecifics: '', set: '', setNumber: '',
    condition: 'Ungraded', pricePaid: 0, marketValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    serialNumber: '', notes: '', pageId: '', rarityTier: 'Base'
  });

  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const file = files[i];
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await processImage(base64);
        const storedUrl = await vaultStorage.uploadImage(userId, compressed);
        setImages(prev => [...prev, storedUrl].slice(0, 4));
      }
      if (onToast) onToast(`${files.length} photos added to vault`, 'info');
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const runScanner = async () => {
    if (images.length === 0) return;
    setIsScanning(true);
    setError(null);
    try {
      const result = await identifyCard(images);
      if (result) {
        setFormData(prev => ({
          ...prev,
          playerName: result.playerName,
          team: result.team || prev.team || '',
          cardSpecifics: result.cardSpecifics,
          set: result.set,
          setNumber: result.setNumber || prev.setNumber || '',
          condition: result.condition || prev.condition || 'Ungraded',
          marketValue: result.estimatedValue,
          serialNumber: result.serialNumber || prev.serialNumber || '',
          notes: result.description,
          rarityTier: result.rarityTier
        }));
        setHasScanned(true);
        if (onToast) onToast("AI Scanner finished", 'success');
      }
    } catch (e: any) {
      setError("Identification failed. Please try again.");
    } finally { setIsScanning(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName || !formData.set) {
      setError("Identification required.");
      return;
    }
    setIsSaving(true);
    try {
      const completeCard: Card = {
        ...formData as Card,
        id: initialData?.id || crypto.randomUUID(),
        images: images,
        createdAt: initialData?.createdAt || Date.now()
      };
      await onSubmit(completeCard);
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between gap-8">
        <h2 className="text-4xl font-black tracking-tighter text-white leading-tight">
          {isEditing ? 'Modify record' : 'Log pickup'}
        </h2>
        <button onClick={onCancel} className="p-2 text-slate-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg"><X size={24} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-8">
          <div className="glass rounded-3xl p-6 space-y-8 border-white/5 relative overflow-hidden shadow-lg">
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 space-y-8 text-center animate-in fade-in duration-300">
                 <div className="relative w-full aspect-[3/4] border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
                   <div className="scanner-line"></div>
                   <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit size={48} className="text-blue-500 animate-pulse" /></div>
                 </div>
                 <span className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 px-3 py-1 rounded-full shadow-lg shadow-blue-600/20">Identifying...</span>
              </div>
            )}
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Photos</label>
              <span className="text-[10px] font-black text-slate-500 tabular">{images.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden relative group border border-white/5 shadow-md flex items-center justify-center p-2">
                  <img src={img} className="w-full h-full object-contain select-none" alt="Preview" />
                  <button onClick={() => removeImage(idx)} className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-rose-500"><Trash2 size={16} /></button>
                </div>
              ))}
              {images.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isSaving}
                  className="aspect-[3/4] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:border-white/20 hover:bg-white/[0.02] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {isSaving ? <Loader2 className="text-blue-500 animate-spin" size={24} /> : (
                    <>
                      <Plus className="text-slate-800 group-hover:text-slate-600 transition-colors" size={24} />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            {images.length > 0 && (
              <button 
                type="button" 
                onClick={runScanner} 
                disabled={isScanning || isSaving}
                className={`w-full h-14 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${hasScanned ? 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500'}`}
              >
                {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{hasScanned ? 'Rescan card' : 'Identify with AI'}</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8">
          <div className="glass rounded-3xl p-8 md:p-12 space-y-8 border-white/5 shadow-lg bg-white/[0.01]">
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-4 text-rose-400 text-xs font-black tracking-tight animate-in shake duration-500"><AlertCircle size={16} />{error}</div>}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Field label="Player" value={formData.playerName} onChange={(v: string) => setFormData({...formData, playerName: v})} icon={<User size={16} />} />
              <Field label="Team" value={formData.team} onChange={(v: string) => setFormData({...formData, team: v})} icon={<Users size={16} />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Field label="Set" value={formData.set} onChange={(v: string) => setFormData({...formData, set: v})} icon={<Eye size={16} />} />
              <Field label="Set Number" value={formData.setNumber} onChange={(v: string) => setFormData({...formData, setNumber: v})} icon={<Hash size={16} />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Field label="Parallel / Variant" value={formData.cardSpecifics} onChange={(v: string) => setFormData({...formData, cardSpecifics: v})} icon={<FileText size={16} />} />
              <Field label="Serial / Parallel #" value={formData.serialNumber} onChange={(v: string) => setFormData({...formData, serialNumber: v})} icon={<BookOpen size={16} />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Grade</label>
                <div className="relative group">
                   <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="w-full bg-slate-950/40 border border-white/5 rounded-xl h-12 px-4 outline-none font-black text-sm text-white focus:border-blue-500/40 appearance-none transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/20">
                    {standardConditions.map(c => <option key={c} value={c} className="bg-slate-900 font-semibold">{c}</option>)}
                   </select>
                   <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">Binder slot</label>
                <div className="relative group">
                  <select value={formData.pageId || ''} onChange={e => setFormData({...formData, pageId: e.target.value})} className="w-full bg-slate-950/40 border border-white/5 rounded-xl h-12 px-4 outline-none font-black text-sm text-white focus:border-blue-500/40 appearance-none transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/20">
                    <option value="" className="bg-slate-900 font-semibold">Loose card</option>
                    {pages.map(p => <option key={p.id} value={p.id} className="bg-slate-900 font-semibold">{p.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/5">
              <Field label="Price paid (£)" type="number" value={formData.pricePaid} onChange={(v: string) => setFormData({...formData, pricePaid: Number(v)})} icon={<PoundSterling size={16} />} />
              <Field label="Market value (£)" type="number" value={formData.marketValue} onChange={(v: string) => setFormData({...formData, marketValue: Number(v)})} icon={<Zap size={16} />} />
            </div>
          </div>
          
          <div className="flex gap-4">
            <button type="button" onClick={onCancel} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-xl font-black text-sm hover:bg-white/10 transition-all text-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] h-14 bg-blue-600 text-white rounded-xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Stashing...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Save to stash</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, icon, type = 'text' }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-blue-500 transition-colors">{icon}</div>
      <input 
        type={type} 
        step="0.01" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="w-full bg-slate-950/40 border border-white/5 rounded-xl h-12 pl-12 pr-4 focus:border-blue-500/40 outline-none font-semibold text-sm text-white transition-all placeholder:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500/20" 
      />
    </div>
  </div>
);

export default CardForm;
