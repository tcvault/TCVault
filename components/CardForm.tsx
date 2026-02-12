
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../types';
import { Sparkles, X, Save, AlertCircle, Info, Hash, Plus, Trash2, User, FileText, Camera, Eye, Search, BrainCircuit, Scan, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { identifyCard } from '../services/gemini';

interface CardFormProps {
  onSubmit: (card: Card) => void;
  onCancel: () => void;
  initialData?: Card;
}

const CardForm: React.FC<CardFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<Partial<Card & { reasoning?: string, rarityTier?: string, checklistVerified?: boolean }>>({
    playerName: '',
    cardSpecifics: '',
    set: '',
    setNumber: '',
    condition: 'Ungraded',
    pricePaid: 0,
    marketValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    serialNumber: '',
    notes: '',
    reasoning: '',
    rarityTier: 'Base',
    checklistVerified: false
  });

  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const standardConditions = [
    'Ungraded', 'Raw', 'PSA 10', 'PSA 9', 'PSA 8', 'BGS 10 Black Label', 'BGS 10', 'BGS 9.5', 'SGC 10', 'CGC 10'
  ];

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
    const newImages: string[] = [];
    const processFile = (file: File) => new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(file);
    });
    for (let i = 0; i < files.length; i++) {
      newImages.push(await processFile(files[i]));
    }
    setImages(prev => [...prev, ...newImages]);
    setError(null);
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
          cardSpecifics: result.cardSpecifics,
          set: result.set,
          setNumber: result.setNumber || prev.setNumber || '',
          condition: result.condition || prev.condition || 'Ungraded',
          marketValue: result.estimatedValue,
          serialNumber: result.serialNumber || prev.serialNumber || '',
          notes: result.description,
          reasoning: result.reasoning,
          rarityTier: result.rarityTier,
          checklistVerified: result.checklistVerified
        }));
        setHasScanned(true);
      } else {
        setError("Identification inconclusive. Multi-era manual check required.");
      }
    } catch (e: any) {
      setError(e.message === "QUOTA_EXHAUSTED" ? "Registry capacity reached." : "Scan error.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName || !formData.set) {
      setError("Subject and Set identity required.");
      return;
    }
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      playerName: formData.playerName || '',
      cardSpecifics: formData.cardSpecifics || '',
      set: formData.set || '',
      setNumber: formData.setNumber || '',
      condition: formData.condition || 'Ungraded',
      pricePaid: Number(formData.pricePaid) || 0,
      marketValue: Number(formData.marketValue) || 0,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      serialNumber: formData.serialNumber || undefined,
      images: images,
      notes: formData.notes,
      createdAt: initialData?.createdAt || Date.now()
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-top-6 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">{isEditing ? 'Asset Modification' : 'Universal Registry Entry'}</h2>
          <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.25em] mt-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-indigo-500" />
            Universal Multi-Era Soccer Registry Online
          </p>
        </div>
        <button onClick={onCancel} className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-rose-500/20 hover:border-rose-500/40 transition-all text-slate-500 hover:text-rose-400">
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div className="glass rounded-[3rem] p-10 space-y-8 border-white/5 relative overflow-hidden group">
            {isScanning && (
              <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl z-50 flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
                <div className="w-full aspect-[3/4] relative border border-indigo-500/30 rounded-[2.5rem] overflow-hidden mb-10 bg-slate-950 shadow-[0_0_100px_rgba(79,70,229,0.1)]">
                   <div className="scanner-line absolute w-full z-20"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <Scan size={140} className="text-indigo-500/5 animate-pulse" />
                        <BrainCircuit size={70} className="text-indigo-400 absolute inset-0 m-auto animate-bounce" />
                      </div>
                   </div>
                </div>
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 text-indigo-400 font-black text-xs uppercase tracking-[0.4em]">
                    <Sparkles size={18} className="animate-spin" />
                    Analyzing Visual Era & Brand
                  </div>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase tracking-[0.2em] max-w-[200px] mx-auto">Cross-referencing historic checklists & auction results...</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Visual Matrix</label>
              <span className="text-[10px] font-black text-indigo-500 tabular">{images.length} FRAMES</span>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-black rounded-3xl overflow-hidden relative group/img border border-white/5 shadow-2xl">
                  <img src={img} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-125" alt="Preview" />
                  <button onClick={() => removeImage(idx)} className="absolute top-4 right-4 p-2.5 bg-rose-600 text-white rounded-2xl opacity-0 group-hover/img:opacity-100 transition-all shadow-2xl scale-75 group-hover/img:scale-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] transition-all group/add">
                <div className="p-5 bg-white/5 rounded-2xl group-hover/add:bg-indigo-500/20 transition-all group-hover/add:scale-110">
                  <Plus className="text-slate-600 group-hover/add:text-indigo-400" size={24} />
                </div>
                <span className="text-[10px] font-black text-slate-700 group-hover/add:text-indigo-400 uppercase tracking-widest">Capture</span>
              </button>
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

            {!isScanning && images.length > 0 && (
              <button type="button" onClick={runScanner} className={`w-full flex items-center justify-center gap-4 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl ${!hasScanned ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-white/5 text-indigo-400 border border-indigo-500/20 hover:bg-white/10'}`}>
                <Sparkles size={20} />
                {hasScanned ? 'Rerun Registry Scan' : 'Identify Asset'}
              </button>
            )}
            
            <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 px-2 opacity-60">
                    <Database size={14} className="text-indigo-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Universal Archive Sync v3.0</span>
                </div>
                {formData.checklistVerified && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-left-4">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Registry Match Verified</span>
                  </div>
                )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">
          <div className="glass rounded-[3.5rem] p-12 space-y-12 border-white/5 relative bg-black/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <Field label="Subject / Athlete" value={formData.playerName} onChange={v => setFormData({...formData, playerName: v})} icon={<User size={20} />} />
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Parallel Variant & Year</label>
                  {formData.rarityTier && (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${formData.rarityTier === 'Chase' || formData.rarityTier === '1/1' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                        {formData.rarityTier}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <FileText className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input type="text" placeholder="e.g. 2014 Prizm Silver" value={formData.cardSpecifics} onChange={e => setFormData({...formData, cardSpecifics: e.target.value})} className="w-full bg-slate-950/40 border border-white/5 rounded-2xl h-16 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 outline-none font-bold text-white transition-all placeholder:text-slate-900" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <Field label="Archive Set Identity" value={formData.set} onChange={v => setFormData({...formData, set: v})} icon={<Eye size={20} />} />
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] px-1">Condition Rating</label>
                <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="w-full bg-slate-950/40 border border-white/5 rounded-2xl h-16 px-8 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 outline-none font-bold text-white appearance-none cursor-pointer">
                  {standardConditions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-12 border-t border-white/5">
              <Field label="Asset Basis (£)" type="number" value={formData.pricePaid} onChange={v => setFormData({...formData, pricePaid: Number(v)})} icon={<PoundIcon />} />
              <Field label="Market Valuation (£)" type="number" value={formData.marketValue} onChange={v => setFormData({...formData, marketValue: Number(v)})} icon={<Sparkles size={18} className="text-indigo-500" />} />
            </div>

            {formData.reasoning && (
                <div className="p-8 bg-indigo-500/[0.04] border border-indigo-500/10 rounded-[2.5rem] space-y-4 shadow-inner">
                    <div className="flex items-center gap-3">
                        <BrainCircuit size={16} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Historical Identification Logic</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{formData.reasoning}"</p>
                </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            <button type="button" onClick={onCancel} className="flex-1 h-20 bg-white/5 border border-white/10 rounded-3xl font-black text-[10px] uppercase tracking-[0.4em] transition-all hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 active:scale-[0.98]">Cancel</button>
            <button type="submit" className="flex-[2] h-20 bg-white text-black rounded-3xl font-black text-[11px] uppercase tracking-[0.5em] shadow-3xl shadow-white/5 transition-all flex items-center justify-center gap-4 hover:bg-slate-200 active:scale-[0.98]">
              <Save size={22} />
              Commit Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, icon, type = 'text' }: any) => (
  <div className="space-y-4">
    <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] px-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-indigo-500 transition-colors">{icon}</div>
      <input type={type} step="0.01" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950/40 border border-white/5 rounded-2xl h-16 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 outline-none font-bold text-white transition-all placeholder:text-slate-900" />
    </div>
  </div>
);

const PoundIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a4.5 4.5 0 0 0 0 9H13a4.5 4.5 0 0 1 0 9H6" /></svg>
);

export default CardForm;
