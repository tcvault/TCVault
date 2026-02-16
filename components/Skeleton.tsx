import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "", count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`animate-pulse bg-white/[0.03] border border-white/5 rounded-xl ${className}`}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
        </div>
      ))}
    </>
  );
};

export const CardSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="aspect-[3/4] rounded-[16px]" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
      </div>
    </div>
  </div>
);

export default Skeleton;
