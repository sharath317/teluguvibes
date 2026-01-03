'use client';

import { useState } from 'react';
import { 
  ThumbsUp, ThumbsDown, Star, ChevronDown, ChevronUp, 
  Users, Sparkles, Gem, Trophy, Crown, Medal, Flame, Heart
} from 'lucide-react';

interface QuickVerdictProps {
  whyWatch?: {
    reasons?: string[];
    best_for?: string[];
  };
  whySkip?: {
    reasons?: string[];
    not_for?: string[];
  };
  verdict?: {
    en?: string;
    te?: string;
    category?: string;
    final_rating?: number;
  };
  qualityScore?: number;
}

// Category styling with unique icons and colors
const categoryStyles: Record<string, { 
  icon: React.ReactNode; 
  bg: string; 
  text: string; 
  border: string;
  glow: string;
  label: string;
}> = {
  'blockbuster': {
    icon: <Gem className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-purple-600 to-pink-600',
    text: 'text-white',
    border: 'border-purple-500/50',
    glow: 'shadow-purple-500/20',
    label: '💎 BLOCKBUSTER'
  },
  'must-watch': {
    icon: <Crown className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    text: 'text-black',
    border: 'border-amber-400/50',
    glow: 'shadow-amber-500/20',
    label: '👑 MUST WATCH'
  },
  'hit': {
    icon: <Trophy className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    text: 'text-black',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-500/20',
    label: '🏆 HIT'
  },
  'recommended': {
    icon: <Medal className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    text: 'text-white',
    border: 'border-blue-400/50',
    glow: 'shadow-blue-500/20',
    label: '🎖️ RECOMMENDED'
  },
  'average': {
    icon: <Star className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
    text: 'text-white',
    border: 'border-gray-500/50',
    glow: 'shadow-gray-500/20',
    label: '⭐ AVERAGE'
  },
  'cult-classic': {
    icon: <Flame className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-red-600 to-orange-600',
    text: 'text-white',
    border: 'border-red-500/50',
    glow: 'shadow-red-500/20',
    label: '🔥 CULT CLASSIC'
  },
  'hidden-gem': {
    icon: <Heart className="w-4 h-4" />,
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-white',
    border: 'border-emerald-400/50',
    glow: 'shadow-emerald-500/20',
    label: '💚 HIDDEN GEM'
  },
};

const getStyle = (category?: string) => {
  const normalized = category?.toLowerCase().replace(/\s+/g, '-') || '';
  return categoryStyles[normalized] || categoryStyles['recommended'];
};

export function QuickVerdictCard({ whyWatch, whySkip, verdict, qualityScore }: QuickVerdictProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  
  const hasWatchReasons = whyWatch?.reasons && whyWatch.reasons.length > 0;
  const hasSkipReasons = whySkip?.reasons && whySkip.reasons.length > 0;
  const hasVerdict = verdict?.en || verdict?.category;
  
  // Don't render if no content
  if (!hasWatchReasons && !hasVerdict) return null;
  
  const style = getStyle(verdict?.category);
  const visibleReasons = showAllReasons ? whyWatch?.reasons : whyWatch?.reasons?.slice(0, 3);
  const hasMoreReasons = (whyWatch?.reasons?.length || 0) > 3;
  
  return (
    <div className={`bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-xl border ${style.border} overflow-hidden shadow-lg ${style.glow}`}>
      {/* Header with Verdict Badge */}
      {hasVerdict && (
        <div className="p-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-800/30 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${style.bg} ${style.text} shadow-lg`}>
              {style.icon}
              <span className="text-xs font-bold tracking-wide">
                {style.label}
              </span>
            </div>
            {verdict?.final_rating && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 rounded-lg">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">{verdict.final_rating}/10</span>
              </div>
            )}
          </div>
          {verdict?.en && (
            <p className="text-gray-300 text-sm mt-3 leading-relaxed">{verdict.en}</p>
          )}
        </div>
      )}
      
      {/* Why Watch - Full content, no cropping */}
      {hasWatchReasons && (
        <div className="p-4">
          <h4 className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-3">
            <div className="p-1 rounded bg-emerald-500/20">
              <ThumbsUp className="w-3.5 h-3.5" />
            </div>
            Why You Should Watch
          </h4>
          <ul className="space-y-2">
            {visibleReasons?.map((reason, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2.5 leading-relaxed">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          
          {/* Show more/less toggle */}
          {hasMoreReasons && (
            <button
              onClick={() => setShowAllReasons(!showAllReasons)}
              className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {showAllReasons ? 'Show less' : `+${(whyWatch?.reasons?.length || 0) - 3} more reasons`}
              {showAllReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          
          {/* Best For tags */}
          {whyWatch?.best_for && whyWatch.best_for.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-500 text-xs uppercase tracking-wide">Perfect for</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {whyWatch.best_for.map((tag, i) => (
                  <span 
                    key={i} 
                    className="text-xs px-2.5 py-1 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 text-emerald-300 rounded-full border border-emerald-800/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Why Skip - Collapsible with better styling */}
      {hasSkipReasons && (
        <div className="border-t border-gray-800/50">
          <button
            onClick={() => setShowSkip(!showSkip)}
            className="w-full px-4 py-3 flex items-center justify-between text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition-all"
          >
            <span className="flex items-center gap-2 text-sm">
              <div className="p-1 rounded bg-orange-500/10">
                <ThumbsDown className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <span className="text-gray-400">Things to consider</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showSkip ? 'rotate-180' : ''}`} />
          </button>
          
          {showSkip && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200">
              <ul className="space-y-2">
                {whySkip!.reasons!.map((reason, i) => (
                  <li key={i} className="text-gray-400 text-sm flex items-start gap-2.5 leading-relaxed">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Quality indicator */}
      {qualityScore && qualityScore > 0.8 && (
        <div className="px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-900/50 flex items-center justify-center gap-1.5 text-xs border-t border-gray-800/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-500">AI-Enhanced Editorial Review</span>
        </div>
      )}
    </div>
  );
}
