'use client';

import { Baby, Users, Heart, UserPlus, User } from 'lucide-react';

interface AudienceFit {
  kids_friendly?: boolean;
  family_watch?: boolean;
  date_movie?: boolean;
  group_watch?: boolean;
  solo_watch?: boolean;
}

interface AudienceFitBadgesProps {
  fit?: AudienceFit | null;
  compact?: boolean;
}

const fitConfig: Record<keyof AudienceFit, {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'kids_friendly': {
    label: 'Kids Friendly',
    shortLabel: 'Kids',
    icon: <Baby className="w-3.5 h-3.5" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
    description: 'Safe for children under 12',
  },
  'family_watch': {
    label: 'Family Watch',
    shortLabel: 'Family',
    icon: <Users className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    description: 'Great for family viewing',
  },
  'date_movie': {
    label: 'Date Movie',
    shortLabel: 'Date',
    icon: <Heart className="w-3.5 h-3.5" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/30',
    description: 'Perfect for couples',
  },
  'group_watch': {
    label: 'Group Watch',
    shortLabel: 'Group',
    icon: <UserPlus className="w-3.5 h-3.5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Fun with friends',
  },
  'solo_watch': {
    label: 'Solo Experience',
    shortLabel: 'Solo',
    icon: <User className="w-3.5 h-3.5" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    description: 'Best enjoyed alone',
  },
};

export function AudienceFitBadges({ fit, compact = false }: AudienceFitBadgesProps) {
  if (!fit) return null;

  const activeFits = (Object.entries(fit) as [keyof AudienceFit, boolean][])
    .filter(([, value]) => value)
    .map(([key]) => key);

  if (activeFits.length === 0) return null;

  return (
    <div className="space-y-2">
      {!compact && (
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Perfect For
        </h4>
      )}
      
      <div className="flex flex-wrap gap-1.5">
        {activeFits.map((fitKey) => {
          const config = fitConfig[fitKey];
          return (
            <span
              key={fitKey}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color} ${config.bgColor}`}
              title={config.description}
            >
              {config.icon}
              {compact ? config.shortLabel : config.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Single badge for inline use
export function AudienceFitBadge({ type }: { type: keyof AudienceFit }) {
  const config = fitConfig[type];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color} ${config.bgColor}`}
      title={config.description}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

