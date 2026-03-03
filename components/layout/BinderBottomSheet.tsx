import React from 'react';
import { X, Layers as BinderIcon, Check, BookOpen, Plus } from 'lucide-react';
import { ViewMode, BinderPage } from '../../types';

interface BinderBottomSheetProps {
  show: boolean;
  onClose: () => void;
  binders: BinderPage[];
  selectedBinderId: string;
  setSelectedBinderId: (id: string) => void;
  setView: (view: ViewMode) => void;
}

export const BinderBottomSheet = ({
  show,
  onClose,
  binders,
  selectedBinderId,
  setSelectedBinderId,
  setView
}: BinderBottomSheetProps) => {
  if (!show) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-[150] flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Sheet */}
      <div
        className="relative bg-[#f5f2ec] rounded-t-[32px] border-t border-black/8 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-black/6">
          <span className="text-[10px] font-black text-[#c9a227]/60 uppercase tracking-widest">Your Vault</span>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* Binder list */}
        <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar pb-8">

          {/* All Cards */}
          <button
            onClick={() => {
              setSelectedBinderId('all');
              setView(ViewMode.INVENTORY);
              onClose();
            }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${
              selectedBinderId === 'all'
                ? 'bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20'
                : 'hover:bg-black/5 text-stone-600 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <BinderIcon size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">All Cards</span>
            </div>
            {selectedBinderId === 'all' && <Check size={16} />}
          </button>

          {/* Individual binders */}
          {binders.map(binder => (
            <button
              key={binder.id}
              onClick={() => {
                setSelectedBinderId(binder.id);
                setView(ViewMode.INVENTORY);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${
                selectedBinderId === binder.id
                  ? 'bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20'
                  : 'hover:bg-black/5 text-stone-600 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={18} />
                <span className="text-sm font-bold truncate">{binder.name}</span>
              </div>
              {selectedBinderId === binder.id && <Check size={16} />}
            </button>
          ))}

          {/* New Binder shortcut */}
          <button
            onClick={() => {
              onClose();
              setView(ViewMode.INVENTORY);
            }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-stone-400 hover:bg-black/5 transition-all active:scale-[0.98] border border-dashed border-black/10 mt-2"
          >
            <Plus size={18} />
            <span className="text-sm font-semibold">New Binder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
