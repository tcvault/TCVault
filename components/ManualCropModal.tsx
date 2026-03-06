import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, RotateCcw, Check, Loader2, Crop } from 'lucide-react';
import { BoundingBox } from '../services/gemini';

interface CropRect { x: number; y: number; w: number; h: number; }

type HandleMode = 'MOVE' | 'TL' | 'TC' | 'TR' | 'ML' | 'MR' | 'BL' | 'BC' | 'BR';

interface DragState {
  mode: HandleMode;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
}

const DEFAULT_CROP: CropRect = { x: 0.05, y: 0.05, w: 0.90, h: 0.90 };
const MIN_SIZE = 0.05;

interface ManualCropModalProps {
  imageSrc: string;
  onApply: (box: BoundingBox) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const clampRect = (r: CropRect): CropRect => {
  let { x, y, w, h } = r;
  w = Math.max(MIN_SIZE, w);
  h = Math.max(MIN_SIZE, h);
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  return { x, y, w, h };
};

const ManualCropModal: React.FC<ManualCropModalProps> = ({ imageSrc, onApply, onCancel, isSaving }) => {
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgBounds, setImgBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const measureImg = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const imgBcr = img.getBoundingClientRect();
    const conBcr = container.getBoundingClientRect();
    setImgBounds({ left: imgBcr.left - conBcr.left, top: imgBcr.top - conBcr.top, width: imgBcr.width, height: imgBcr.height });
  }, []);

  useEffect(() => { if (imgLoaded) measureImg(); }, [imgLoaded, measureImg]);

  const onPointerDown = useCallback((e: React.PointerEvent, mode: HandleMode) => {
    if (isSaving) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { mode, startClientX: e.clientX, startClientY: e.clientY, startRect: { ...cropRect } };
  }, [cropRect, isSaving]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || !imgBounds || imgBounds.width === 0 || imgBounds.height === 0) return;
    e.preventDefault();
    const dx = (e.clientX - drag.startClientX) / imgBounds.width;
    const dy = (e.clientY - drag.startClientY) / imgBounds.height;
    const { x, y, w, h } = drag.startRect;
    let next: CropRect = { x, y, w, h };
    switch (drag.mode) {
      case 'MOVE': next = { x: x + dx, y: y + dy, w, h }; break;
      case 'TL':   next = { x: x + dx, y: y + dy, w: w - dx, h: h - dy }; break;
      case 'TC':   next = { x, y: y + dy, w, h: h - dy }; break;
      case 'TR':   next = { x, y: y + dy, w: w + dx, h: h - dy }; break;
      case 'ML':   next = { x: x + dx, y, w: w - dx, h }; break;
      case 'MR':   next = { x, y, w: w + dx, h }; break;
      case 'BL':   next = { x: x + dx, y, w: w - dx, h: h + dy }; break;
      case 'BC':   next = { x, y, w, h: h + dy }; break;
      case 'BR':   next = { x, y, w: w + dx, h: h + dy }; break;
    }
    setCropRect(clampRect(next));
  }, [imgBounds]);

  const onPointerUp = useCallback(() => { dragStateRef.current = null; }, []);

  const handleApply = () => {
    const box: BoundingBox = {
      xmin: Math.round(cropRect.x * 1000),
      ymin: Math.round(cropRect.y * 1000),
      xmax: Math.round((cropRect.x + cropRect.w) * 1000),
      ymax: Math.round((cropRect.y + cropRect.h) * 1000),
    };
    onApply(box);
  };

  const L = (cropRect.x * 100).toFixed(3) + '%';
  const T = (cropRect.y * 100).toFixed(3) + '%';
  const W = (cropRect.w * 100).toFixed(3) + '%';
  const H = (cropRect.h * 100).toFixed(3) + '%';
  const R = ((1 - cropRect.x - cropRect.w) * 100).toFixed(3) + '%';
  const B = ((1 - cropRect.y - cropRect.h) * 100).toFixed(3) + '%';
  const hdlBase = 'absolute w-3 h-3 bg-white border-2 border-gold-500 rounded-sm shadow-md z-30 -translate-x-1/2 -translate-y-1/2 touch-none';

  return (
    <div
      className="fixed inset-0 z-[400] bg-ink-primary/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onCancel(); }}
    >
      <div className="w-full max-w-2xl bg-surface-elevated border border-border-soft rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <div className="flex items-center gap-3">
            <Crop size={18} className="text-gold-500" />
            <div>
              <h3 className="text-sm font-bold text-ink-primary uppercase tracking-widest">Manual Crop</h3>
              <p className="text-xs text-ink-tertiary font-medium mt-0.5">Drag handles to select the card area</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={isSaving} className="p-2 text-ink-tertiary hover:text-ink-primary transition-colors rounded-lg active:scale-95 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className="p-4 bg-ink-primary/20 flex items-center justify-center">
          <div
            ref={containerRef}
            className="relative select-none overflow-hidden rounded-lg bg-surface-base flex items-center justify-center w-full"
            style={{ maxHeight: '60vh', minHeight: '200px' }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop source"
              draggable={false}
              onLoad={() => { setImgLoaded(true); setTimeout(measureImg, 0); }}
              className="max-w-full max-h-[60vh] object-contain block pointer-events-none"
              crossOrigin="anonymous"
            />

            {imgLoaded && imgBounds && (
              <div
                className="absolute pointer-events-none"
                style={{ left: imgBounds.left, top: imgBounds.top, width: imgBounds.width, height: imgBounds.height }}
              >
                {/* Dark mask strips */}
                <div className="absolute bg-ink-primary/60" style={{ left: 0, top: 0, right: 0, height: T }} />
                <div className="absolute bg-ink-primary/60" style={{ left: 0, bottom: 0, right: 0, height: B }} />
                <div className="absolute bg-ink-primary/60" style={{ left: 0, top: T, width: L, height: H }} />
                <div className="absolute bg-ink-primary/60" style={{ right: 0, top: T, width: R, height: H }} />

                {/* Crop selection */}
                <div
                  className="absolute border-2 border-gold-500 box-border pointer-events-auto"
                  style={{ left: L, top: T, width: W, height: H }}
                >
                  {/* Rule-of-thirds grid */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-y-0" style={{ left: '33.33%', borderLeft: '1px dashed rgba(255,255,255,0.25)' }} />
                    <div className="absolute inset-y-0" style={{ left: '66.66%', borderLeft: '1px dashed rgba(255,255,255,0.25)' }} />
                    <div className="absolute inset-x-0" style={{ top: '33.33%', borderTop: '1px dashed rgba(255,255,255,0.25)' }} />
                    <div className="absolute inset-x-0" style={{ top: '66.66%', borderTop: '1px dashed rgba(255,255,255,0.25)' }} />
                  </div>

                  {/* Move zone */}
                  <div className="absolute inset-0 cursor-move" style={{ margin: '8px' }} onPointerDown={(e) => onPointerDown(e, 'MOVE')} />

                  {/* Handles */}
                  <div className={hdlBase + ' cursor-nw-resize'} style={{ left: '0%', top: '0%' }}     onPointerDown={(e) => onPointerDown(e, 'TL')} />
                  <div className={hdlBase + ' cursor-n-resize'}  style={{ left: '50%', top: '0%' }}    onPointerDown={(e) => onPointerDown(e, 'TC')} />
                  <div className={hdlBase + ' cursor-ne-resize'} style={{ left: '100%', top: '0%' }}   onPointerDown={(e) => onPointerDown(e, 'TR')} />
                  <div className={hdlBase + ' cursor-w-resize'}  style={{ left: '0%', top: '50%' }}    onPointerDown={(e) => onPointerDown(e, 'ML')} />
                  <div className={hdlBase + ' cursor-e-resize'}  style={{ left: '100%', top: '50%' }}  onPointerDown={(e) => onPointerDown(e, 'MR')} />
                  <div className={hdlBase + ' cursor-sw-resize'} style={{ left: '0%', top: '100%' }}   onPointerDown={(e) => onPointerDown(e, 'BL')} />
                  <div className={hdlBase + ' cursor-s-resize'}  style={{ left: '50%', top: '100%' }}  onPointerDown={(e) => onPointerDown(e, 'BC')} />
                  <div className={hdlBase + ' cursor-se-resize'} style={{ left: '100%', top: '100%' }} onPointerDown={(e) => onPointerDown(e, 'BR')} />
                </div>
              </div>
            )}

            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="text-gold-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border-soft">
          <button type="button" onClick={() => setCropRect(DEFAULT_CROP)} disabled={isSaving} className="btn-secondary h-11 px-4 flex items-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50">
            <RotateCcw size={14} /><span>Reset</span>
          </button>
          <div className="flex-1" />
          <button type="button" onClick={onCancel} disabled={isSaving} className="btn-secondary h-11 px-6 uppercase text-xs tracking-widest disabled:opacity-50">Cancel</button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving || !imgLoaded}
            className="btn-primary h-11 px-6 flex items-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? <><Loader2 size={14} className="animate-spin" /><span>Saving...</span></>
              : <><Check size={14} /><span>Apply Crop</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualCropModal;
