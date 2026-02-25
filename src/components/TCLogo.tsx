import React from 'react';

export const TCLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center shrink-0`}>
    <img
      src="https://oewvucbsbcxxwtnflbfw.supabase.co/storage/v1/object/public/assets/TCVaultIcon.png"
      className="w-full h-full object-contain object-center"
      alt="TC Vault"
      draggable={false}
    />
  </div>
);
