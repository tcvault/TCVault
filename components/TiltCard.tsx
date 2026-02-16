import React, { useState, useRef, useCallback } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  shimmer?: boolean;
}

const TiltCard: React.FC<TiltCardProps> = ({ children, className = "", shimmer = true }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [shimmerPos, setShimmerPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg
    const rotateY = ((x - centerX) / centerX) * 10; // Max 10deg
    
    setRotate({ x: rotateX, y: rotateY });
    
    // Shimmer position follows the cursor for a "light following" effect
    setShimmerPos({ 
      x: (x / rect.width) * 100, 
      y: (y / rect.height) * 100 
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotate({ x: 0, y: 0 });
    setShimmerPos({ x: 50, y: 50 });
  }, []);

  // Mobile support via gyro could be added here, but starting with mouse for reliability

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      <div style={{ transform: 'translateZ(20px)' }} className="relative z-10">
        {children}
      </div>

      {shimmer && (
        <div 
          className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
          style={{
            background: `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            mixBlendMode: 'soft-light'
          }}
        />
      )}
      
      {/* Holofoil "rainbow" effect */}
      {shimmer && (
        <div 
          className="absolute inset-0 z-15 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-[inherit]"
          style={{
            background: `linear-gradient(${135 + rotate.y * 2}deg, transparent 0%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 100%)`,
            backgroundSize: '200% 200%',
            backgroundPosition: `${50 + rotate.y * 5}% ${50 + rotate.x * 5}%`
          }}
        />
      )}
    </div>
  );
};

export default TiltCard;
