import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionLabel, onAction, compact = false, className = '' }) => (
  <div className={`card-vault ${compact ? 'p-padding sm:p-section' : 'p-padding sm:p-major'} flex flex-col items-center justify-center text-center border-dashed border-border-soft animate-in fade-in duration-500 ${className}`}>
    <div className={`flex flex-col items-center ${compact ? 'space-y-control mb-padding' : 'space-y-padding mb-section'}`}>
      <div className={`${compact ? 'w-12 h-12' : 'w-14 h-14 sm:w-16 sm:h-16'} rounded-full bg-surface-base flex items-center justify-center text-ink-tertiary`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: compact ? 24 : 30 }) : icon}
      </div>
      <div className="space-y-control">
        <h3 className={`${compact ? 'text-lg' : 'text-lg sm:text-xl'} font-bold text-ink-primary`}>{title}</h3>
        <p className="text-sm text-ink-tertiary max-w-xs font-semibold">{message}</p>
      </div>
    </div>
    {actionLabel && (
      <button onClick={onAction} className={`${compact ? 'h-10 px-5 text-xs' : 'h-11 sm:h-12 px-6 sm:px-8 text-xs sm:text-sm'} btn-primary font-bold uppercase tracking-widest`}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
