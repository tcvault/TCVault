import React from 'react';

// ─── Shared gold gradient definition (reused across SVG variants) ────────────
const GoldGradientDef = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stopColor="#7A5E18" />
      <stop offset="35%"  stopColor="#C7A54B" />
      <stop offset="55%"  stopColor="#E8C96A" />
      <stop offset="75%"  stopColor="#C7A54B" />
      <stop offset="100%" stopColor="#7A5E18" />
    </linearGradient>
  </defs>
);

// ─── App Icon — vault door + star (image-based, from Supabase) ───────────────
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

// ─── Monogram — "TC" vault-door badge ────────────────────────────────────────
export const TCMonogram = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg
    className={`${className} shrink-0`}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="TC Vault monogram"
  >
    <GoldGradientDef id="mono-gold" />
    {/* Vault door body */}
    <rect x="2" y="2" width="36" height="36" rx="7" fill="#1A1A1A" />
    <rect x="2" y="2" width="36" height="36" rx="7" stroke="url(#mono-gold)" strokeWidth="1.5" />
    {/* Inner recess frame */}
    <rect x="6" y="6" width="28" height="28" rx="5" stroke="url(#mono-gold)" strokeWidth="0.75" opacity="0.4" />
    {/* Hinge tabs — left edge */}
    <rect x="1.5" y="10.5" width="4" height="3" rx="1" fill="url(#mono-gold)" />
    <rect x="1.5" y="26.5" width="4" height="3" rx="1" fill="url(#mono-gold)" />
    {/* TC letterform */}
    <text
      x="20" y="25"
      textAnchor="middle"
      fontFamily="Inter, ui-sans-serif, sans-serif"
      fontWeight="900"
      fontSize="14"
      letterSpacing="-0.8"
      fill="url(#mono-gold)"
    >
      TC
    </text>
    {/* Bottom chevron accent */}
    <path d="M16.5 33.5 L20 37 L23.5 33.5" stroke="url(#mono-gold)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Horizontal lockup — app icon + "TC VAULT" wordmark ──────────────────────
export const TCLogoHorizontal = ({ className = "h-10" }: { className?: string }) => (
  <div className={`${className} flex items-center gap-2.5 shrink-0`}>
    <TCLogo className="h-full w-auto aspect-square" />
    <div className="flex flex-col justify-center leading-none gap-0.5">
      <span
        className="text-[15px] font-black tracking-tight leading-none"
        style={{
          background: 'var(--gold-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        TC VAULT
      </span>
      <span
        className="text-[9px] font-semibold tracking-[0.18em] uppercase leading-none"
        style={{ color: 'var(--gold-700)' }}
      >
        Collectors
      </span>
    </div>
  </div>
);

// ─── Flat logo — star-vault icon + "TC VAULT" wordmark ───────────────────────
// Compact single-line lockup; use for headers, footers, auth screens.
export const TCLogoFlat = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <GoldGradientDef id="flat-gold" />
      {/* Vault door */}
      <rect x="1" y="1" width="20" height="20" rx="5" fill="#1A1A1A" stroke="url(#flat-gold)" strokeWidth="1" />
      {/* Star — 5pt, outer r=7, inner r=3, centered 11,11 */}
      <path
        d="M11 4 L12.63 8.9 L17.8 8.9 L13.7 11.8 L15.33 16.7 L11 13.8 L6.67 16.7 L8.3 11.8 L4.2 8.9 L9.37 8.9 Z"
        fill="url(#flat-gold)"
      />
    </svg>
    <span
      className="text-sm font-black tracking-[0.1em] uppercase leading-none"
      style={{
        background: 'var(--gold-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      TC VAULT
    </span>
  </div>
);
