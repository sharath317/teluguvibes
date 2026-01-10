'use client';

import { Film, Tv, Monitor, PlayCircle } from 'lucide-react';

type WatchRecommendation = 'theater-must' | 'theater-preferred' | 'ott-friendly' | 'any';

interface WatchRecommendationProps {
  recommendation?: WatchRecommendation | string | null;
  showDescription?: boolean;
  compact?: boolean;
}

const recommendationConfig: Record<WatchRecommendation, {
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  textClass: string;
}> = {
  'theater-must': {
    label: 'Theater Must',
    shortLabel: '🎬 Theater',
    description: 'Big screen experience is essential',
    icon: <Film className="w-4 h-4" />,
    gradient: 'from-red-500 via-orange-500 to-yellow-500',
    textClass: 'text-orange-400',
  },
  'theater-preferred': {
    label: 'Theater Preferred',
    shortLabel: '🎥 Preferred',
    description: 'Better in theater, but OTT works',
    icon: <PlayCircle className="w-4 h-4" />,
    gradient: 'from-blue-500 to-cyan-500',
    textClass: 'text-blue-400',
  },
  'ott-friendly': {
    label: 'OTT Friendly',
    shortLabel: '📺 OTT',
    description: 'Works great on streaming platforms',
    icon: <Tv className="w-4 h-4" />,
    gradient: 'from-green-500 to-emerald-500',
    textClass: 'text-green-400',
  },
  'any': {
    label: 'Watch Anywhere',
    shortLabel: '📱 Any',
    description: 'Enjoy on any screen',
    icon: <Monitor className="w-4 h-4" />,
    gradient: 'from-gray-500 to-slate-500',
    textClass: 'text-gray-400',
  },
};

export function WatchRecommendation({ 
  recommendation, 
  showDescription = false, 
  compact = false 
}: WatchRecommendationProps) {
  if (!recommendation) return null;

  const config = recommendationConfig[recommendation as WatchRecommendation];
  if (!config) return null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r ${config.gradient} text-white shadow-md`}
        title={config.description}
      >
        {config.icon}
        {config.shortLabel}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} text-white font-medium shadow-lg`}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
      {showDescription && (
        <p className="text-xs text-[var(--text-secondary)]">
          {config.description}
        </p>
      )}
    </div>
  );
}

// Small indicator for cards
export function WatchIndicator({ recommendation }: { recommendation: WatchRecommendation }) {
  const config = recommendationConfig[recommendation];
  if (!config) return null;

  return (
    <span className={`text-xs ${config.textClass} font-medium`}>
      {config.shortLabel}
    </span>
  );
}

