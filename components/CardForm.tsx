
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../types';
import { Sparkles, X, Save, AlertCircle, Info, Hash, Plus, Trash2, User, FileText, Camera, Eye } from 'lucide-react';
import { identifyCard } from '../services/gemini';

interface CardFormProps {
  onSubmit: (card: Card) => void;
  onCancel: () => void;
  initialData?: Card;
}

const CardForm: React.FC<CardFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<Partial<Card & { reasoning?: string }>>({
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
    reasoning: ''
  });

  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const standardConditions = [
    'Ungraded',
    'Raw',
    '10 - Gem Mint',
    '9 - Mint',
    '8 - Near Mint-Mint',
    '7 - Near Mint',
    'PSA 10',
    'PSA 9',
    'PSA 8',
    'BGS 10',
    'BGS 9.5',
    'BGS 9',
    'SGC 10',
    'CGC 10'
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
    const processFile = (file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    };

    for (let i = 0; i < files.length; i++) {
      const base64 = await processFile(files[i]);
      newImages.push(base64);
    }

    setImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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
          reasoning: result.reasoning
        }));
        setHasScanned(true);
      } else {
        setError("AI Identification inconclusive. Please verify manually.");
      }
    } catch (e: any) {
      if (e.message === "QUOTA_EXHAUSTED") {
        setError("Daily AI limit reached. Please try again in 24 hours or use manual entry.");
      } else {
        setError("AI Service temporarily unavailable. Manual entry enabled.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName || !formData.set) {
      setError("Player Name and Set Name are required.");
      return;
    }

    const finalCard: Card = {
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
    };

    onSubmit(finalCard);
  };

  // Ensure current condition is in the list of options
  const displayConditions = [...new Set([...standardConditions, formData.condition || 'Ungraded'])];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight">{isEditing ? 'Update Card' : 'Add to Vault'}</h2>
          <p className="text-slate-400 font-medium">{isEditing ? 'Modify your existing card' : 'Register a new card to your collection'}</p>
        </div>
        <button 
          onClick={onCancel}
          className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors shadow-lg"
        >
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[2.5rem] p-6 space-y-4 border-slate-700 shadow-2xl relative overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={32} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Deep Scanning</p>
                  <p className="text-[10px] text-indigo-300/60 font-bold mt-1 tracking-widest">CHECKING GRADING & PARALLELS</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Staging Area</label>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{images.length} Photo{images.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden relative group border border-slate-700/50">
                  <img src={img} className="w-full h-full object-cover" alt={`View ${idx + 1}`} />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
              >
                <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors">
                  <Plus className="text-slate-400 group-hover:text-indigo-400" size={20} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400">Add View</span>
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={handleFileChange} 
            />

            {!isScanning && images.length > 0 && (
              <button 
                type="button"
                onClick={runScanner}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl group ${!hasScanned ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-slate-800 text-indigo-400 border border-indigo-500/30 hover:bg-slate-700'}`}
              >
                <Sparkles size={18} className={!hasScanned ? 'animate-pulse' : ''} />
                {hasScanned ? 'RE-IDENTIFY CARD' : 'IDENTIFY WITH AI'}
              </button>
            )}

            <div className="flex items-start gap-2 p-4 bg-slate-900/50 rounded-2xl text-left border border-slate-800">
              <Info size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Pro Tip</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Ensure the <strong>grading label</strong> is clearly visible in one of your staged photos.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-5 rounded-3xl flex items-center gap-4 animate-in shake-in">
              <div className="p-2 bg-rose-500/20 rounded-full"><AlertCircle size={20} /></div>
              <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
          <div className="glass rounded-[2.5rem] p-8 space-y-8 border-slate-700/50 shadow-2xl relative">
            {!hasScanned && !isEditing && (
              <div className="absolute inset-0 z-10 bg-slate-950/40 backdrop-blur-[1px] rounded-[2.5rem] flex items-center justify-center pointer-events-none">
                 <div className="bg-slate-900/90 border border-slate-700 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                   <div className="p-2 bg-indigo-500/20 rounded-lg"><Camera size={20} className="text-indigo-400" /></div>
                   <p className="text-xs font-bold text-slate-400 tracking-tight uppercase">Upload & Identify to populate</p>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Player / Character Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text"
                    placeholder="e.g. LeBron James"
                    value={formData.playerName || ''}
                    onChange={e => setFormData({...formData, playerName: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Card Specifics (Parallel)</label>
                  {formData.reasoning && (
                    <div className="flex items-center gap-1.5 text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20 group relative cursor-help">
                      <Eye size={10} />
                      <span className="text-[8px] font-black uppercase">AI Insight</span>
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <p className="text-[10px] text-slate-300 font-medium leading-tight">"{formData.reasoning}"</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text"
                    placeholder="e.g. White Ice Terrace"
                    value={formData.cardSpecifics || ''}
                    onChange={e => setFormData({...formData, cardSpecifics: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <FormInput 
                label="Set Name"
                placeholder="2023-24 Panini Select..."
                value={formData.set || ''}
                onChange={v => setFormData({...formData, set: v})}
              />
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Condition / Grade</label>
                <select 
                  value={formData.condition}
                  onChange={e => setFormData({...formData, condition: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-slate-200 transition-all cursor-pointer"
                >
                  {displayConditions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <FormInput 
                  label="Set Number"
                  placeholder="e.g. 245"
                  value={formData.setNumber || ''}
                  onChange={v => setFormData({...formData, setNumber: v})}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Serial Number (Opt.)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="text"
                    placeholder="e.g. 12/85"
                    value={formData.serialNumber}
                    onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Purchase Date</label>
                <input 
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 transition-all"
                />
              </div>
              <div className="flex gap-4">
                 <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Purchase Price (£)</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.pricePaid}
                    onChange={e => setFormData({...formData, pricePaid: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 text-emerald-400 font-black text-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Market Price (£)</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.marketValue}
                    onChange={e => setFormData({...formData, marketValue: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 text-indigo-400 font-black text-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Notes</label>
              <textarea 
                rows={3}
                placeholder="Background on acquisition..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-3xl py-4 px-6 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium text-slate-300 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              className="w-full sm:flex-1 py-5 glass rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-full sm:flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <Save size={18} />
              {isEditing ? 'COMMIT UPDATES' : 'SAVE TO VAULT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormInput = ({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-3 flex-1">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
    <input 
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 transition-all placeholder:text-slate-700"
    />
  </div>
);

export default CardForm;
