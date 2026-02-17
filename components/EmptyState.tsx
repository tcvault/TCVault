
import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionLabel, onAction }) => (
  <div className="glass rounded-[24px] p-16 flex flex-col items-center justify-center text-center border-dashed border-white/10 animate-in fade-in duration-500">
    <div className="flex flex-col items-center space-y-6 mb-10">
      <div className="w-16 h-16 rounded-full glass-subtle flex items-center justify-center text-slate-500">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 32 }) : icon}
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="text-sm text-slate-400 max-w-xs font-semibold">{message}</p>
      </div>
    </div>
    {actionLabel && (
      <button onClick={onAction} className="btn-primary h-12 px-8 font-black text-sm uppercase tracking-widest">
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
