'use client';

import { Gem, Trophy, Crown, Flame, Star, Heart, Sparkles } from 'lucide-react';

interface MovieBadgesProps {
  isMassClassic?: boolean;
  isMasterpiece?: boolean;
  isUnderrated?: boolean;
  isClassic?: boolean;
  isCult?: boolean;
  isHit?: boolean;
  isMustWatch?: boolean;
  compact?: boolean;
}

interface BadgeConfig {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  className: string;
}

const badges: Record<string, BadgeConfig> = {
  'mass-classic': {
    icon: <Gem className="w-3 h-3" />,
    label: 'Mass Classic',
    shortLabel: 'MC',
    className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30',
  },
  masterpiece: {
    icon: <Crown className="w-3 h-3" />,
    label: 'Masterpiece',
    shortLabel: 'MP',
    className: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-500/30',
  },
  cult: {
    icon: <Flame className="w-3 h-3" />,
    label: 'Cult',
    shortLabel: 'Cult',
    className: 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-red-500/30',
  },
  hit: {
    icon: <Trophy className="w-3 h-3" />,
    label: 'Hit',
    shortLabel: 'Hit',
    className: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-yellow-500/30',
  },
  classic: {
    icon: <Crown className="w-3 h-3" />,
    label: 'Classic',
    shortLabel: 'Classic',
    className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/30',
  },
  underrated: {
    icon: <Heart className="w-3 h-3" />,
    label: 'Hidden Gem',
    shortLabel: 'Gem',
    className: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30',
  },
  cultClassic: {
    icon: <Flame className="w-3 h-3" />,
    label: 'Cult Classic',
    shortLabel: 'Cult',
    className: 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-red-500/30',
  },
  mustWatch: {
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Must Watch',
    shortLabel: 'Must',
    className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/30',
  },
};

export function MovieBadges({ 
  isMassClassic, 
  isMasterpiece,
  isUnderrated, 
  isClassic, 
  isCult, 
  isHit,
  isMustWatch,
  compact = false 
}: MovieBadgesProps) {
  const activeBadges: string[] = [];
  
  if (isMasterpiece) activeBadges.push('masterpiece');
  if (isMassClassic) activeBadges.push('mass-classic');
  if (isHit && !isMassClassic) activeBadges.push('hit');
  if (isClassic) activeBadges.push('classic');
  if (isUnderrated) activeBadges.push('underrated');
  if (isCult) activeBadges.push('cult');
  if (isMustWatch) activeBadges.push('mustWatch');
  
  if (activeBadges.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {activeBadges.map(badgeKey => {
        const badge = badges[badgeKey];
        return (
          <span 
            key={badgeKey}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold shadow-lg ${badge.className}`}
          >
            {badge.icon}
            <span>{compact ? badge.shortLabel : badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}

// Single badge component for inline use
export function SingleBadge({ type }: { type: keyof typeof badges }) {
  const badge = badges[type];
  if (!badge) return null;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold shadow-lg ${badge.className}`}>
      {badge.icon}
      <span>{badge.label}</span>
    </span>
  );
}

