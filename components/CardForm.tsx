import React, { useState, useRef, useEffect } from 'react';
import { Card, BinderPage } from '../types';
import {
  Sparkles, X, Save, AlertCircle, Plus, Trash2, User, Users, FileText, Eye,
  BrainCircuit, PoundSterling, BookOpen, Hash, Zap, ChevronDown,
  Loader2, Globe, Lock, Crop, Scissors, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { identifyCard, getCardBoundingBox, BoundingBox } from '../services/gemini';
import ManualCropModal from './ManualCropModal';
import { vaultStorage, supabase } from '../services/storage';
import { normalizeSet } from '../lib/normalizeSet';
import { writeCorrectionEvent, getCorrectionMap, applyAutoCorrect } from '../services/corrections';

// ── Image helpers ────────────────────────────────────────────────────────────
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
    if (imgSrc.startsWith('http')) img.crossOrigin = 'anonymous';
    img.src = imgSrc;
    img.onload = () => {
      const isPng = imgSrc.includes('image/png');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imgSrc); return; }
      const x = (box.xmin / 1000) * img.width;
      const y = (box.ymin / 1000) * img.height;
      const width = ((box.xmax - box.xmin) / 1000) * img.width;
      const height = ((box.ymax - box.ymin) / 1000) * img.height;
      const padW = width * 0.05;
      const padH = height * 0.05;
      let sx = x - padW, sy = y - padH, sw = width + padW * 2, sh = height + padH * 2;
      if (sx < 0) { sw += sx; sx = 0; }
      if (sy < 0) { sh += sy; sy = 0; }
      if (sx + sw > img.width) sw = img.width - sx;
      if (sy + sh > img.height) sh = img.height - sy;
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
        console.error('Crop failed:', e);
        resolve(imgSrc);
      }
    };
    img.onerror = () => resolve(imgSrc);
  });
};

// ── AI suggestion type (concrete, avoids exactOptionalPropertyTypes conflicts) ─
interface AiSuggestion {
  // Core identification
  playerName: string;
  team: string;
  cardSpecifics: string;
  set: string;
  setNumber?: string;
  condition?: string;
  estimatedValue: number;
  description: string;
  serialNumber?: string;
  certNumber?: string;
  reasoning?: string;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  checklistVerified?: boolean;
  setConfidence?: number;
  yearConfidence?: number;
  // Normalised set fields
  setDisplay: string;
  setCanonicalKey: string;
  setYearStart: number | null;
  setYearEnd: number | null;
  manufacturer: string | null;
  productLine: string | null;
  sport: string | null;
  category: 'Sports' | 'TCG' | 'Non-Sports';
  // Phase 3
  correctedByMemory?: boolean;
}

interface AiFieldDef {
  key: string;
  label: string;
  getValue: (s: AiSuggestion) => string | number | undefined;
  apply: (s: AiSuggestion, prev: Partial<Card>) => Partial<Card>;
  isLowConfidence?: (s: AiSuggestion) => boolean;
}

const AI_FIELD_DEFS: AiFieldDef[] = [
  {
    key: 'playerName', label: 'Player',
    getValue: (s) => s.playerName,
    apply: (s, p) => ({ ...p, playerName: s.playerName }),
  },
  {
    key: 'team', label: 'Team',
    getValue: (s) => s.team,
    apply: (s, p) => ({ ...p, team: s.team }),
  },
  {
    key: 'cardSpecifics', label: 'Parallel / Variant',
    getValue: (s) => s.cardSpecifics,
    apply: (s, p) => ({ ...p, cardSpecifics: s.cardSpecifics }),
  },
  {
    key: 'setDisplay', label: 'Set',
    getValue: (s) => s.setDisplay,
    apply: (s, p) => ({
      ...p,
      set: s.setDisplay,
      setCanonicalKey: s.setCanonicalKey,
      setYearStart: s.setYearStart ?? undefined,
      setYearEnd: s.setYearEnd ?? undefined,
      manufacturer: s.manufacturer ?? undefined,
      productLine: s.productLine ?? undefined,
      sport: s.sport ?? undefined,
      category: s.category,
    }),
    isLowConfidence: (s) => (s.setConfidence ?? 1) < 0.6 || (s.yearConfidence ?? 1) < 0.6,
  },
  {
    key: 'condition', label: 'Grade',
    getValue: (s) => s.condition,
    apply: (s, p) => s.condition !== undefined ? { ...p, condition: s.condition } : p,
  },
  {
    key: 'estimatedValue', label: 'Market Value',
    getValue: (s) => `£${s.estimatedValue}`,
    apply: (s, p) => ({ ...p, marketValue: s.estimatedValue }),
  },
  {
    key: 'serialNumber', label: 'Serial #',
    getValue: (s) => s.serialNumber,
    apply: (s, p) => ({ ...p, serialNumber: s.serialNumber }),
  },
  {
    key: 'rarityTier', label: 'Rarity',
    getValue: (s) => s.rarityTier,
    apply: (s, p) => ({ ...p, rarityTier: s.rarityTier }),
  },
];

const MFR_OPTIONS = ['Panini', 'Topps', 'Upper Deck', 'Futera', 'Score', 'Leaf', 'Fleer', 'Other'];

function buildSeasonStr(start: number, end: number | null | undefined): string {
  if (!end || end === start) return String(start);
  return `${start}-${String(end).slice(-2)}`;
}

// ── Component ────────────────────────────────────────────────────────────────
interface CardFormProps {
  onSubmit: (card: Card) => void;
  onDelete?: ((id: string) => void) | undefined;
  onCancel: () => void;
  initialData?: Card | undefined;
  pages: BinderPage[];
  onToast?: ((message: string, type: 'success' | 'error' | 'info') => void) | undefined;
  animationClass?: string | undefined;
}

const CardForm: React.FC<CardFormProps> = ({ onSubmit, onDelete, onCancel, initialData, pages, onToast, animationClass }) => {
  const isEditing = !!initialData;

  // ── Core form state ───────────────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<Card>>({
    playerName: '', team: '', cardSpecifics: '', set: '', setNumber: '',
    condition: 'Ungraded', pricePaid: 0, marketValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0] ?? '',
    serialNumber: '', certNumber: '', notes: '', pageId: '', rarityTier: 'Base',
    isPublic: true,
  });

  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<number | null>(null);
  const [manualCropIndex, setManualCropIndex] = useState<number | null>(null);
  const [isManualCropSaving, setIsManualCropSaving] = useState(false);

  // ── AI suggestion state (Phase 2) ─────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  // ── Structured set editor state (Phase 2) ────────────────────────────────
  const [setEditorMode, setSetEditorMode] = useState<'simple' | 'structured'>('simple');
  const [sFields, setSFields] = useState({ season: '', manufacturer: '', productLine: '', sport: 'Soccer' });

  // ── Save warnings state (Phase 2) ─────────────────────────────────────────
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const standardConditions = ['Ungraded', 'Raw', 'PSA 10', 'PSA 9', 'PSA 8', 'BGS 10 Black Label', 'BGS 10', 'BGS 9.5', 'SGC 10', 'CGC 10'];

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setImages(initialData.images || []);
      setHasScanned(true);
    }
  }, [initialData]);

  // ── Image handlers ────────────────────────────────────────────────────────
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
        if (!file) continue;
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
            if (onToast && i === 0) onToast('Auto-cropped to focus on the card', 'info');
          }
          const storedUrl = await vaultStorage.uploadImage(userId, finalImage);
          setImages(prev => [...prev, storedUrl].slice(0, 4));
        } catch (cropErr) {
          console.error('Auto-crop failed:', cropErr);
          const storedUrl = await vaultStorage.uploadImage(userId, compressed);
          setImages(prev => [...prev, storedUrl].slice(0, 4));
        } finally {
          setIsCropping(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
        setImages(prev => { const n = [...prev]; n[index] = storedUrl; return n; });
        if (onToast) onToast('Image recropped successfully', 'success');
      } else {
        if (onToast) onToast('Could not detect card boundaries. Try Manual Crop.', 'info');
      }
    } catch (err) {
      console.error('Recrop failed:', err);
      if (onToast) onToast('Recrop analysis failed', 'error');
    } finally {
      setIsCropping(null);
    }
  };

  const handleManualCropApply = async (box: BoundingBox) => {
    if (manualCropIndex === null) return;
    setIsManualCropSaving(true);
    try {
      let userId = 'local-guest';
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      }
      const src = images[manualCropIndex];
      if (!src) return;
      const croppedImage = await performCrop(src, box);
      const storedUrl = await vaultStorage.uploadImage(userId, croppedImage);
      setImages(prev => { const n = [...prev]; n[manualCropIndex!] = storedUrl; return n; });
      if (onToast) onToast('Manual crop applied', 'success');
      setManualCropIndex(null);
    } catch (err) {
      console.error('Manual crop failed:', err);
      if (onToast) onToast('Manual crop failed. Please try again.', 'error');
    } finally {
      setIsManualCropSaving(false);
    }
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  // ── AI scanner (auto-applies suggestions) ────────────────────────────────
  const runScanner = async () => {
    if (images.length === 0) return;
    setIsScanning(true);
    setScanStep('Analyzing visuals...');
    setError(null);
    try {
      const result = await identifyCard(images);
      if (result) {
        const normalized = normalizeSet(result.set, {
          setYearStart: result.setYearStart ?? null,
          setYearEnd: result.setYearEnd ?? null,
          manufacturer: result.manufacturer ?? null,
          productLine: result.productLine ?? null,
          sport: result.sport ?? null,
          category: result.category ?? null,
        });
        let suggestion: AiSuggestion = { ...result, ...normalized };

        // Phase 3: apply auto-correct from correction memory
        try {
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const correctionMap = await getCorrectionMap(user.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              suggestion = applyAutoCorrect(suggestion as any, correctionMap) as unknown as AiSuggestion;
              if (suggestion.correctedByMemory && onToast) {
                onToast('Adjusted based on your prior confirmations', 'info');
              }
            }
          }
        } catch {
          // Non-critical — ignore correction map errors
        }

        setAiSuggestion(suggestion);
        setFormData(prev => {
          const isPSA = (suggestion.condition || prev.condition || '').startsWith('PSA');
          return {
            ...prev,
            playerName: suggestion.playerName,
            team: suggestion.team || prev.team || '',
            cardSpecifics: suggestion.cardSpecifics,
            set: suggestion.setDisplay,
            setCanonicalKey: suggestion.setCanonicalKey,
            setYearStart: suggestion.setYearStart ?? undefined,
            setYearEnd: suggestion.setYearEnd ?? undefined,
            manufacturer: suggestion.manufacturer ?? undefined,
            productLine: suggestion.productLine ?? undefined,
            sport: suggestion.sport ?? undefined,
            category: suggestion.category,
            setNumber: suggestion.setNumber || prev.setNumber || '',
            condition: suggestion.condition || prev.condition || 'Ungraded',
            marketValue: suggestion.estimatedValue,
            serialNumber: suggestion.serialNumber || prev.serialNumber || '',
            certNumber: isPSA ? (suggestion.certNumber || prev.certNumber || '') : '',
            notes: suggestion.description,
            rarityTier: suggestion.rarityTier,
          };
        });
        setSFields({
          season: suggestion.setYearStart
            ? buildSeasonStr(suggestion.setYearStart, suggestion.setYearEnd)
            : '',
          manufacturer: suggestion.manufacturer ?? '',
          productLine: suggestion.productLine ?? '',
          sport: suggestion.sport ?? '',
        });
        setSetEditorMode('structured');
        setHasScanned(true);
        if (onToast && !suggestion.correctedByMemory) {
          onToast('AI Identification complete', 'success');
        }
      }
    } catch {
      setError('AI analysis failed.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // ── Structured set editor helpers ─────────────────────────────────────────
  const updateStructuredField = (field: string, value: string) => {
    const updated = { ...sFields, [field]: value };
    setSFields(updated);
    const rawStr = [updated.season, updated.manufacturer, updated.productLine, updated.sport]
      .filter(Boolean).join(' ');
    const normalized = normalizeSet(rawStr, {
      manufacturer: updated.manufacturer || null,
      productLine: updated.productLine || null,
      sport: updated.sport || null,
      category: formData.category ?? null,
    });
    setFormData(prev => ({
      ...prev,
      set: normalized.setDisplay,
      setCanonicalKey: normalized.setCanonicalKey,
      setYearStart: normalized.setYearStart ?? undefined,
      setYearEnd: normalized.setYearEnd ?? undefined,
      manufacturer: normalized.manufacturer ?? undefined,
      productLine: normalized.productLine ?? undefined,
      sport: normalized.sport ?? undefined,
      category: normalized.category,
    }));
  };

  const switchToStructured = () => {
    const normalized = normalizeSet(formData.set || '');
    setSFields({
      season: normalized.setYearStart
        ? buildSeasonStr(normalized.setYearStart, normalized.setYearEnd)
        : '',
      manufacturer: normalized.manufacturer ?? '',
      productLine: normalized.productLine ?? '',
      sport: normalized.sport ?? '',
    });
    setSetEditorMode('structured');
  };

  // ── Submit (Phase 1 + 2 — defensive normalizeSet + warnings) ─────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerName || !formData.set) {
      setError('Identify the card before saving.');
      return;
    }

    // Defensive normalizeSet pass
    let cardData = { ...formData };
    if (!cardData.setCanonicalKey && cardData.set) {
      const normalized = normalizeSet(cardData.set);
      cardData = {
        ...cardData,
        setCanonicalKey: normalized.setCanonicalKey || undefined,
        setYearStart: normalized.setYearStart ?? undefined,
        setYearEnd: normalized.setYearEnd ?? undefined,
        manufacturer: normalized.manufacturer ?? undefined,
        productLine: normalized.productLine ?? undefined,
        sport: normalized.sport ?? undefined,
        category: normalized.category,
      };
    }

    // Build non-blocking save warnings
    const warnings: string[] = [];
    if (!cardData.setCanonicalKey && cardData.set) {
      warnings.push('Set format not recognised — check year and manufacturer');
    }
    if (aiSuggestion && (aiSuggestion.setConfidence ?? 1) < 0.5) {
      warnings.push('AI confidence in set identification is low — please verify');
    }
    if (aiSuggestion && (aiSuggestion.yearConfidence ?? 1) < 0.5) {
      warnings.push('Year could not be verified from the image');
    }
    setSaveWarnings(warnings);

    setIsSaving(true);
    try {
      const completeCard: Card = {
        ...cardData as Card,
        id: initialData?.id || crypto.randomUUID(),
        images,
        createdAt: initialData?.createdAt || Date.now(),
        isPublic: cardData.isPublic ?? false,
      };
      await onSubmit(completeCard);

      // Phase 3: fire-and-forget correction event (does not block save)
      if (aiSuggestion && supabase) {
        supabase.auth.getUser().then((result: { data: { user: { id: string } | null } }) => {
          const user = result.data?.user;
          if (user) writeCorrectionEvent(user.id, completeCard, aiSuggestion as unknown as Parameters<typeof writeCorrectionEvent>[2]);
        }).catch(() => { /* non-critical */ });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div className={`max-w-4xl mx-auto space-y-major pb-16 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex items-center justify-between gap-padding">
        <h2 className="text-[32px] font-bold tracking-tighter text-ink-primary leading-tight">
          {isEditing ? 'Edit Card' : 'Add to Collection'}
        </h2>
        <button onClick={onCancel} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-tertiary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-xl active:scale-95"><X size={24} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-section">

        {/* ── Left column: Images + AI panel + Visibility ── */}
        <div className="lg:col-span-5 space-y-section">

          {/* Image card */}
          <div className="card-vault p-padding space-y-padding relative overflow-hidden shadow-lg">
            {isScanning && (
              <div className="absolute inset-0 bg-surface-base/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-padding space-y-padding text-center animate-in fade-in duration-300">
                <div className="relative w-full aspect-[3/4] border border-border-soft rounded-xl overflow-hidden bg-surface-base">
                  <div className="scanner-line"></div>
                  <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit size={48} className="text-gold-500 animate-pulse" /></div>
                </div>
                <div className="space-y-control">
                  <span className="text-xs font-bold text-white uppercase tracking-widest bg-gold-500 px-3 py-1 rounded-full shadow-lg shadow-gold-500/20">Identifying...</span>
                  <p className="text-sm font-semibold text-ink-tertiary animate-pulse">{scanStep}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest flex items-center gap-control">
                Photos <span className="text-xs px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-500 border border-gold-500/20">Auto-Crop Enabled</span>
              </label>
              <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest tabular">{images.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-control">
              {images.map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-surface-base rounded-xl overflow-hidden relative group border border-border-soft shadow-md flex items-center justify-center p-control img-loading">
                  <img src={img} onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')} className="w-full h-full object-contain select-none z-10" alt="Preview" />
                  {isCropping === idx && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-control">
                      <Loader2 size={24} className="text-gold-500 animate-spin" />
                      <span className="text-xs font-bold text-gold-500 uppercase tracking-widest">Recropping...</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col gap-control z-20">
                    <button onClick={() => removeImage(idx)} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-error text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-lg"><Trash2 size={16} /></button>
                    <button type="button" title="AI Re-crop" onClick={() => handleRecrop(idx)} disabled={isCropping !== null || isManualCropSaving} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-gold-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-lg disabled:opacity-50"><Crop size={16} /></button>
                    <button type="button" title="Manual Crop" onClick={() => setManualCropIndex(idx)} disabled={isCropping !== null || isManualCropSaving} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-elevated border border-border-soft text-ink-tertiary hover:text-ink-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95 shadow-lg disabled:opacity-50"><Scissors size={16} /></button>
                  </div>
                </div>
              ))}
              {(images.length < 4 || (isCropping !== null && !images[isCropping])) && (
                <button onClick={() => fileInputRef.current?.click()} disabled={isSaving || isCropping !== null || isManualCropSaving} className="aspect-[3/4] rounded-xl border border-dashed border-border-soft flex flex-col items-center justify-center gap-padding hover:border-ink-primary/20 hover:bg-surface-elevated transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 active:scale-[0.98] relative">
                  {isSaving || (isCropping !== null && !images[isCropping]) ? (
                    <div className="flex flex-col items-center gap-control">
                      <Loader2 className="text-gold-500 animate-spin" size={24} />
                      <span className="text-xs font-bold text-gold-500 uppercase tracking-[0.2em] animate-pulse">Precision Cropping...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="text-ink-tertiary group-hover:text-ink-secondary transition-colors" size={24} />
                      <span className="text-xs font-bold text-ink-tertiary group-hover:text-ink-secondary uppercase tracking-widest transition-colors">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            {images.length > 0 && (
              <button type="button" onClick={runScanner} disabled={isScanning || isSaving || isCropping !== null || isManualCropSaving} className={`w-full h-14 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-control active:scale-[0.97] ${hasScanned ? 'btn-secondary text-ink-tertiary' : 'btn-primary'}`}>
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={16} />}
                <span className="uppercase text-xs tracking-widest">{hasScanned ? 'Re-identify Card' : 'Identify with AI'}</span>
              </button>
            )}
          </div>

          {/* Visibility panel */}
          <div className="card-vault p-padding space-y-padding">
            <h3 className="text-xs font-bold text-ink-tertiary uppercase tracking-widest px-2">Visibility</h3>
            <div className="grid grid-cols-2 gap-control">
              <button type="button" onClick={() => setFormData({...formData, isPublic: true})} className={`flex flex-col items-center justify-center gap-control p-6 rounded-xl border transition-all ${formData.isPublic ? 'bg-gold-500/10 border-gold-500/30 text-gold-500' : 'bg-surface-base border-border-soft text-ink-tertiary hover:border-ink-primary/10'}`}>
                <Globe size={24} /><span className="text-xs font-bold uppercase tracking-widest">Public</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, isPublic: false})} className={`flex flex-col items-center justify-center gap-control p-6 rounded-xl border transition-all ${!formData.isPublic ? 'bg-surface-elevated border-border-soft text-ink-primary' : 'bg-surface-base border-border-soft text-ink-tertiary hover:border-ink-primary/10'}`}>
                <Lock size={24} /><span className="text-xs font-bold uppercase tracking-widest">Private</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column: Form ── */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-section">
          <div className="card-vault p-padding md:p-12 space-y-padding shadow-lg bg-white/[0.01]">
            {error && <div className="p-padding bg-error/10 border border-error/20 rounded-xl flex items-center gap-padding text-error text-sm font-bold tracking-tight animate-in slide-in-from-top-2 duration-200"><AlertCircle size={16} />{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <Field label="Player" value={formData.playerName} onChange={(v: string) => setFormData({...formData, playerName: v})} icon={<User size={16} />} />
              <Field label="Team" value={formData.team} onChange={(v: string) => setFormData({...formData, team: v})} icon={<Users size={16} />} />
            </div>

            {/* ── Set / Product — dual-mode editor (Phase 2) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section">
              <div className="space-y-control">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Set / Product</label>
                  <button
                    type="button"
                    onClick={setEditorMode === 'simple' ? switchToStructured : () => setSetEditorMode('simple')}
                    className="text-[10px] font-bold text-gold-500 hover:underline uppercase tracking-widest"
                  >
                    {setEditorMode === 'simple' ? 'Structured ▾' : 'Simple ▾'}
                  </button>
                </div>

                {setEditorMode === 'simple' ? (
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-gold-500 transition-colors"><Eye size={16} /></div>
                    <input
                      type="text"
                      value={formData.set ?? ''}
                      onChange={e => setFormData({...formData, set: e.target.value, setCanonicalKey: undefined})}
                      className="w-full bg-surface-base border border-border-soft rounded-xl h-14 pl-12 pr-4 focus:border-gold-500/40 outline-none font-semibold text-sm text-ink-primary transition-all placeholder:text-ink-tertiary"
                    />
                  </div>
                ) : (
                  <div className="space-y-control bg-surface-base rounded-xl p-control border border-border-soft">
                    <div className="grid grid-cols-2 gap-control">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Season</label>
                        <input
                          type="text"
                          placeholder="2023-24"
                          value={sFields.season}
                          onChange={e => updateStructuredField('season', e.target.value)}
                          className="w-full bg-surface-elevated border border-border-soft rounded-lg h-10 px-3 font-semibold text-sm text-ink-primary outline-none focus:border-gold-500/40 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Manufacturer</label>
                        <div className="relative">
                          <select
                            value={sFields.manufacturer}
                            onChange={e => updateStructuredField('manufacturer', e.target.value)}
                            style={{ colorScheme: 'light' }}
                            className="w-full bg-surface-elevated border border-border-soft rounded-lg h-10 px-3 font-semibold text-sm text-ink-primary outline-none focus:border-gold-500/40 appearance-none cursor-pointer transition-all"
                          >
                            <option value="">Select...</option>
                            {MFR_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Product Line</label>
                        <input
                          type="text"
                          placeholder="Donruss Optic"
                          value={sFields.productLine}
                          onChange={e => updateStructuredField('productLine', e.target.value)}
                          className="w-full bg-surface-elevated border border-border-soft rounded-lg h-10 px-3 font-semibold text-sm text-ink-primary outline-none focus:border-gold-500/40 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-widest">Sport</label>
                        <input
                          type="text"
                          value={sFields.sport}
                          onChange={e => updateStructuredField('sport', e.target.value)}
                          className="w-full bg-surface-elevated border border-border-soft rounded-lg h-10 px-3 font-semibold text-sm text-ink-primary outline-none focus:border-gold-500/40 transition-all"
                        />
                      </div>
                    </div>
                    <div className="pt-1 border-t border-border-soft">
                      <span className="text-[10px] text-ink-tertiary font-semibold uppercase tracking-widest">Preview: </span>
                      <span className="text-xs font-bold text-ink-primary">{formData.set || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
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
                <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest ml-1">Grade / Condition</label>
                <div className="relative group">
                  <select
                    value={formData.condition || ''}
                    onChange={e => {
                      const newCondition = e.target.value;
                      const isPSA = newCondition.startsWith('PSA');
                      setFormData({ ...formData, condition: newCondition, certNumber: isPSA ? formData.certNumber : '' });
                    }}
                    style={{ colorScheme: 'light' }}
                    className="w-full bg-surface-base border border-border-soft rounded-xl h-14 px-padding outline-none font-bold text-sm text-ink-primary focus:border-gold-500/40 appearance-none transition-all cursor-pointer"
                  >
                    {standardConditions.map(c => <option key={c} value={c} className="bg-white font-semibold">{c}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
                </div>
              </div>
              <div className="space-y-control">
                <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest ml-1">Assign to Binder</label>
                <div className="relative group">
                  <select value={formData.pageId || ''} onChange={e => setFormData({...formData, pageId: e.target.value})} style={{ colorScheme: 'light' }} className={`w-full bg-surface-base border rounded-xl h-14 px-padding outline-none font-bold text-sm transition-all appearance-none cursor-pointer ${formData.pageId ? 'border-gold-500/40 text-gold-500' : 'border-border-soft text-ink-tertiary'}`}>
                    <option value="" className="bg-white font-semibold">All Cards</option>
                    {pages.map(p => <option key={p.id} value={p.id} className="bg-white font-semibold">{p.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-section pt-padding border-t border-border-soft">
              <Field label="Price Paid (£)" type="number" value={formData.pricePaid} onChange={(v: string) => setFormData({...formData, pricePaid: Number(v)})} icon={<PoundSterling size={16} />} />
              <Field label="Market Value (£)" type="number" value={formData.marketValue} onChange={(v: string) => setFormData({...formData, marketValue: Number(v)})} icon={<Zap size={16} />} />
            </div>

            {/* Save-time warnings (non-blocking, Phase 2) */}
            {saveWarnings.length > 0 && (
              <div className="space-y-control animate-in slide-in-from-top-2 duration-200">
                {saveWarnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-control p-control bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <p className="text-xs font-semibold text-amber-600">{w}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-control">
            {isEditing && (
              <button type="button" onClick={() => initialData && onDelete?.(initialData.id)} className="btn-secondary text-error border-error/20 hover:bg-error/10 h-14 px-6 uppercase text-xs tracking-widest flex items-center justify-center transition-all active:scale-95"><Trash2 size={20} className="mr-2" /><span className="hidden sm:inline">Delete Card</span></button>
            )}
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 h-14 uppercase text-xs tracking-widest">Discard</button>
            <button type="submit" disabled={isSaving || isCropping !== null || isManualCropSaving} className={`btn-primary flex-[2] h-14 uppercase text-xs tracking-widest ${isSaving || isCropping !== null || isManualCropSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" size={20} />}
              <span>{isEditing ? 'Update Card' : 'Add to Collection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    {manualCropIndex !== null && images[manualCropIndex] && (
      <ManualCropModal
        imageSrc={images[manualCropIndex]!}
        onApply={handleManualCropApply}
        onCancel={() => setManualCropIndex(null)}
        isSaving={isManualCropSaving}
      />
    )}
    </>
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
    <label className="text-xs font-bold text-ink-tertiary uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-gold-500 transition-colors">{icon}</div>
      <input type={type} step="0.01" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-base border border-border-soft rounded-xl h-14 pl-12 pr-4 focus:border-gold-500/40 outline-none font-semibold text-sm text-ink-primary transition-all placeholder:text-ink-tertiary" />
    </div>
  </div>
);

export default CardForm;
