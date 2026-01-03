'use client';

import { useState } from 'react';
import { 
  Star, ChevronDown, ChevronUp, Film, Music, Camera, 
  Clapperboard, Clock, Award, Heart, Sparkles, Zap, Palette
} from 'lucide-react';

interface RatingItem {
  label: string;
  score: number;
  icon: 'story' | 'direction' | 'music' | 'camera' | 'pacing' | 'emotion' | 'original' | 'editing';
}

interface CompactRatingsProps {
  ratings: RatingItem[];
  overallRating?: number;
}

// Icon and color mapping for each rating type
const iconConfig: Record<string, { 
  Icon: any; 
  color: string; 
  bgColor: string; 
}> = {
  story: { 
    Icon: Film, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10',
  },
  direction: { 
    Icon: Clapperboard, 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10',
  },
  music: { 
    Icon: Music, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/10',
  },
  camera: { 
    Icon: Camera, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10',
  },
  pacing: { 
    Icon: Zap, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10',
  },
  emotion: { 
    Icon: Heart, 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/10',
  },
  original: { 
    Icon: Sparkles, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10',
  },
  editing: { 
    Icon: Palette, 
    color: 'text-rose-400', 
    bgColor: 'bg-rose-500/10',
  },
};

// Get bar gradient based on score
const getBarGradient = (score: number) => {
  if (score >= 8) return 'from-emerald-500 via-emerald-400 to-teal-400';
  if (score >= 6) return 'from-amber-500 via-yellow-400 to-orange-400';
  if (score >= 4) return 'from-orange-500 via-orange-400 to-red-400';
  return 'from-red-500 via-red-400 to-rose-400';
};

// Get score badge color
const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-amber-400';
  return 'text-orange-400';
};

export function CompactRatings({ ratings, overallRating }: CompactRatingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Filter out ratings without valid scores
  const validRatings = ratings.filter(r => r.score && r.score > 0);
  
  if (validRatings.length === 0) return null;
  
  // Show top 4 ratings, rest in expansion
  const visibleRatings = validRatings.slice(0, 4);
  const hiddenRatings = validRatings.slice(4);
  
  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 rounded-xl p-4 border border-gray-800/50 shadow-lg">
      {/* Header with overall rating */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10">
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-gray-300 text-sm font-medium">Rating Breakdown</span>
        </div>
        {overallRating && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-lg border border-yellow-600/30">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm font-bold">{overallRating}/10</span>
          </div>
        )}
      </div>
      
      {/* Compact grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {visibleRatings.map((rating) => {
          const config = iconConfig[rating.icon] || iconConfig.story;
          return (
            <RatingPill 
              key={rating.label} 
              label={rating.label} 
              score={rating.score} 
              Icon={config.Icon}
              iconColor={config.color}
              iconBg={config.bgColor}
            />
          );
        })}
      </div>
      
      {/* Expandable section */}
      {hiddenRatings.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors rounded-lg hover:bg-gray-800/30"
          >
            {isExpanded ? 'Show less' : `Show ${hiddenRatings.length} more`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="grid grid-cols-2 gap-2.5 mt-2.5 pt-2.5 border-t border-gray-800/50 animate-in slide-in-from-top-1 duration-200">
              {hiddenRatings.map((rating) => {
                const config = iconConfig[rating.icon] || iconConfig.story;
                return (
                  <RatingPill 
                    key={rating.label} 
                    label={rating.label} 
                    score={rating.score} 
                    Icon={config.Icon}
                    iconColor={config.color}
                    iconBg={config.bgColor}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RatingPill({ 
  label, 
  score, 
  Icon, 
  iconColor, 
  iconBg 
}: { 
  label: string; 
  score: number; 
  Icon: any; 
  iconColor: string; 
  iconBg: string;
}) {
  const percentage = (score / 10) * 100;
  const barGradient = getBarGradient(score);
  const scoreColor = getScoreColor(score);
  
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-gray-800/40 hover:bg-gray-800/60 rounded-lg transition-colors border border-gray-700/30">
      <div className={`p-1.5 rounded-md ${iconBg} flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs truncate">{label}</span>
          <span className={`text-xs font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
        </div>
        <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500`} 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
