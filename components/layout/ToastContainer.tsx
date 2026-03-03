import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[150] w-full max-w-sm px-4">
      {toasts.map(toast => (
        <div key={toast.id} className="flex items-center gap-4 p-4 rounded-xl glass border border-black/10 shadow-2xl animate-in slide-in-from-bottom-4 w-full shrink-0">
          {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={20} className="text-rose-500 shrink-0" />}
          {toast.type === 'info' && <Info size={20} className="text-gold-500 shrink-0" />}
          <span className="text-sm font-semibold text-stone-800">{toast.message}</span>
          <button onClick={() => onRemove(toast.id)} className="ml-auto text-stone-400 hover:text-stone-700 p-2 active:scale-90"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
};
