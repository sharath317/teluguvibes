'use client';

/**
 * AdSlot Component
 * Placeholder for advertisement slots throughout the site
 */

import React from 'react';

interface AdSlotProps {
  /** Unique identifier for the ad slot */
  id?: string;
  /** Alternative identifier */
  slot?: string;
  /** Size variant */
  size?: 'banner' | 'sidebar' | 'inline' | 'leaderboard';
  /** Additional CSS classes */
  className?: string;
}

export function AdSlot({ id, slot, size = 'banner', className = '' }: AdSlotProps) {
  const slotId = id || slot;
  const sizeClasses = {
    banner: 'h-24 md:h-32',
    sidebar: 'h-64',
    inline: 'h-20',
    leaderboard: 'h-20 md:h-24',
  };

  return (
    <div
      id={slotId}
      className={`
        w-full ${sizeClasses[size]}
        bg-[#1a1a1a] border border-[#262626] rounded-lg
        flex items-center justify-center
        text-[#525252] text-sm
        ${className}
      `}
    >
      <span className="opacity-50">Advertisement</span>
    </div>
  );
}

