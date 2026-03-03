
import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionLabel, onAction }) => (
  <div className="card-vault p-major flex flex-col items-center justify-center text-center border-dashed border-border-soft animate-in fade-in duration-500">
    <div className="flex flex-col items-center space-y-padding mb-section">
      <div className="w-16 h-16 rounded-full bg-surface-base flex items-center justify-center text-ink-secondary/40">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 32 }) : icon}
      </div>
      <div className="space-y-control">
        <h3 className="text-xl font-bold text-ink-primary">{title}</h3>
        <p className="text-sm text-ink-secondary/40 max-w-xs font-semibold">{message}</p>
      </div>
    </div>
    {actionLabel && (
      <button onClick={onAction} className="btn-primary h-12 px-8 font-bold text-sm uppercase tracking-widest">
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
