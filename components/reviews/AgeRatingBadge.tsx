'use client';

import { Shield, ShieldAlert, ShieldCheck, ShieldBan } from 'lucide-react';

type AgeRating = 'U' | 'U/A' | 'A' | 'S';

interface AgeRatingBadgeProps {
  rating?: AgeRating | string | null;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ratingConfig: Record<AgeRating, {
  label: string;
  description: string;
  icon: React.ReactNode;
  iconLg: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  'U': {
    label: 'U',
    description: 'Universal - Suitable for all ages',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    iconLg: <ShieldCheck className="w-5 h-5" />,
    bgColor: 'bg-green-500',
    borderColor: 'border-green-600',
    textColor: 'text-white',
  },
  'U/A': {
    label: 'U/A',
    description: 'Parental guidance for children under 12',
    icon: <Shield className="w-3.5 h-3.5" />,
    iconLg: <Shield className="w-5 h-5" />,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-600',
    textColor: 'text-black',
  },
  'A': {
    label: 'A',
    description: 'Adults only (18+)',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    iconLg: <ShieldAlert className="w-5 h-5" />,
    bgColor: 'bg-red-500',
    borderColor: 'border-red-600',
    textColor: 'text-white',
  },
  'S': {
    label: 'S',
    description: 'Restricted to specialized audiences',
    icon: <ShieldBan className="w-3.5 h-3.5" />,
    iconLg: <ShieldBan className="w-5 h-5" />,
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-700',
    textColor: 'text-white',
  },
};

export function AgeRatingBadge({ rating, showDescription = false, size = 'md' }: AgeRatingBadgeProps) {
  if (!rating) return null;

  // Normalize rating
  const normalizedRating = (rating === 'UA' ? 'U/A' : rating) as AgeRating;
  const config = ratingConfig[normalizedRating];
  
  if (!config) return null;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-md font-bold border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses[size]} shadow-lg`}
        title={config.description}
      >
        {size === 'lg' ? config.iconLg : config.icon}
        {config.label}
      </span>
      {showDescription && (
        <span className="text-xs text-[var(--text-secondary)]">
          {config.description}
        </span>
      )}
    </div>
  );
}

// Inline certification display
export function CertificationBadge({ rating }: { rating: AgeRating | string }) {
  const normalizedRating = (rating === 'UA' ? 'U/A' : rating) as AgeRating;
  const config = ratingConfig[normalizedRating];
  
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border-2 ${config.bgColor} ${config.borderColor} ${config.textColor} shadow-md`}
      title={config.description}
    >
      {config.label}
    </span>
  );
}

