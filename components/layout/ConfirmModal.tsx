import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info' | undefined;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20',
    warning: 'bg-gold-500 hover:bg-gold-600 text-white shadow-gold-500/20',
    info: 'bg-ink-primary hover:bg-ink-secondary text-white shadow-ink-primary/20'
  };

  const iconStyles = {
    danger: 'text-red-500 bg-red-500/10',
    warning: 'text-gold-500 bg-gold-500/10',
    info: 'text-ink-primary bg-ink-primary/10'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-elevated border border-border-soft rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
                  <AlertTriangle size={24} />
                </div>
                <button
                  onClick={onCancel}
                  className="p-2 text-ink-tertiary hover:text-ink-primary transition-colors rounded-lg hover:bg-surface-base"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-ink-primary">
                  {title}
                </h3>
                <p className="text-sm text-ink-tertiary leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-widest text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-all active:scale-95"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${variantStyles[variant]}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
