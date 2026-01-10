'use client';

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  ChevronDown,
  ChevronUp,
  Users,
  Sparkles,
  Trophy,
  Flame,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import {
  getWatchRecommendation,
  getWatchLabel,
  getWatchStyle,
  type WatchRecommendation,
} from "@/lib/ratings/editorial-rating";

interface QuickVerdictProps {
  whyWatch?: { reasons?: string[]; best_for?: string[] };
  whySkip?: { reasons?: string[]; not_for?: string[] };
  verdict?: { en?: string; te?: string; category?: string; final_rating?: number; cult?: boolean };
  qualityScore?: number;
  awards?: {
    national_awards?: (string | { award?: string; winner?: string })[];
    filmfare_awards?: (string | { award?: string; winner?: string })[];
    nandi_awards?: (string | { award?: string; winner?: string })[];
    other_awards?: (string | { award?: string; winner?: string })[];
  };
  culturalHighlights?: { legacy_status?: string; cult_status?: boolean; memorable_elements?: string[] };
  isClassic?: boolean;
  compact?: boolean;
  ageRating?: string;
  audienceFit?: string[];
  watchRecommendation?: string;
  trustScore?: number;
  trustBreakdown?: { badge?: string; explanation?: string };
  boxOfficeCategory?: string;
}

const getStyleFromRating = (rating: number, isClassic?: boolean, isCult?: boolean) => {
  const recommendation = getWatchRecommendation(rating, isClassic, isCult);
  const style = getWatchStyle(recommendation);
  const label = getWatchLabel(recommendation);
  return { ...style, label: `${style.icon} ${label}`, recommendation };
};

const getBoxOfficeStyle = (category?: string) => {
  const c = category?.toLowerCase();
  if (c === 'blockbuster') return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Blockbuster' };
  if (c === 'super-hit' || c === 'superhit') return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Super Hit' };
  if (c === 'hit') return { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Hit' };
  if (c === 'above-average' || c === 'above average') return { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Above Avg' };
  if (c === 'average') return { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Average' };
  if (c === 'below-average' || c === 'below average') return { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Below Avg' };
  if (c === 'flop') return { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Flop' };
  return null;
};

export function QuickVerdictCard({
  whyWatch, whySkip, verdict, qualityScore, awards, culturalHighlights, isClassic,
  compact = false, ageRating, trustScore, trustBreakdown, boxOfficeCategory,
}: QuickVerdictProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasWatchReasons = whyWatch?.reasons && whyWatch.reasons.length > 0;
  const hasSkipReasons = whySkip?.reasons && whySkip.reasons.length > 0;
  const hasVerdict = verdict?.en || verdict?.final_rating;
  const hasMemorableElements = culturalHighlights?.memorable_elements?.length;

  const getAwardText = (a: string | { award?: string; winner?: string }): string => {
    if (typeof a === "string") return a;
    return a.award || "";
  };

  const allAwards = [
    ...(awards?.national_awards || []).map((a) => getAwardText(a)),
    ...(awards?.filmfare_awards || []).map((a) => getAwardText(a)),
    ...(awards?.nandi_awards || []).map((a) => getAwardText(a)),
    ...(awards?.other_awards || []).map((a) => getAwardText(a)),
  ].filter(Boolean);
  
  const hasAwards = allAwards.length > 0;
  const boxOfficeStyle = getBoxOfficeStyle(boxOfficeCategory);

  if (!hasWatchReasons && !hasVerdict && !hasAwards) return null;

  const rating = verdict?.final_rating || 6.0;
  const style = getStyleFromRating(rating, isClassic, culturalHighlights?.cult_status);
  const visibleReasons = showAllReasons ? whyWatch?.reasons : whyWatch?.reasons?.slice(0, 3);
  const hasMoreReasons = (whyWatch?.reasons?.length || 0) > 3;

  if (compact) {
    return (
      <div className={`rounded-xl border ${style.border} overflow-hidden bg-[var(--bg-secondary)]`}>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-3 py-2.5 flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
            <span className="text-xs font-bold">{style.label}</span>
            {verdict?.final_rating && <>
              <span className="opacity-40">|</span>
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-bold">{verdict.final_rating}</span>
            </>}
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        {isExpanded && verdict?.en && (
          <div className="px-3 pb-3 border-t border-[var(--border-primary)]/30">
            <p className="text-[var(--text-secondary)] text-xs pt-2">{verdict.en}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${style.border} overflow-hidden bg-[var(--bg-secondary)]`}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-primary)]/30">
        <div className="flex items-start justify-between gap-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${style.bg} ${style.text}`}>
            <span className="text-sm font-bold">{style.label}</span>
            {verdict?.final_rating && <>
              <span className="opacity-40">|</span>
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold">{verdict.final_rating}/10</span>
            </>}
          </div>
          <div className="flex items-center gap-2">
            {ageRating && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                ageRating === 'U' || ageRating === 'G' ? 'bg-green-500/20 text-green-400' :
                ageRating === 'UA' || ageRating === 'PG-13' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>{ageRating}</span>
            )}
            {trustScore !== undefined && trustScore >= 0.6 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle className="w-3 h-3" />
                {trustBreakdown?.badge || 'Verified'}
              </span>
            )}
          </div>
        </div>
        {verdict?.en && <p className="text-[var(--text-secondary)] text-sm mt-3 leading-relaxed">{verdict.en}</p>}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Why Watch */}
        {hasWatchReasons && (
          <div>
            <h4 className="flex items-center gap-2 text-[var(--accent-success)] text-xs font-semibold mb-2">
              <ThumbsUp className="w-3.5 h-3.5" /> Why You Should Watch
            </h4>
            <ul className="space-y-1.5 ml-5">
              {visibleReasons?.map((reason, i) => (
                <li key={i} className="text-[var(--text-secondary)] text-sm flex items-start gap-2">
                  <span className="text-[var(--accent-success)]">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {hasMoreReasons && (
              <button onClick={() => setShowAllReasons(!showAllReasons)}
                className="mt-2 ml-5 text-[var(--accent-success)] text-xs flex items-center gap-1">
                {showAllReasons ? "Show less" : `+${(whyWatch?.reasons?.length || 0) - 3} more`}
                {showAllReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {/* Perfect For */}
        {whyWatch?.best_for?.length ? (
          <div className="pt-3 border-t border-[var(--border-primary)]/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide">Perfect for</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {whyWatch.best_for.map((tag, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Stats Row */}
        {(boxOfficeStyle || hasAwards || culturalHighlights?.cult_status) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--border-primary)]/30">
            {boxOfficeStyle && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${boxOfficeStyle.bg}`}>
                <TrendingUp className={`w-3.5 h-3.5 ${boxOfficeStyle.color}`} />
                <span className={`text-xs font-medium ${boxOfficeStyle.color}`}>{boxOfficeStyle.label}</span>
              </div>
            )}
            {culturalHighlights?.cult_status && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">Cult Classic</span>
              </div>
            )}
            {hasAwards && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">{allAwards.length} Award{allAwards.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Highlights */}
        {hasMemorableElements ? (
          <div className="pt-3 border-t border-[var(--border-primary)]/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide">Highlights</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {culturalHighlights?.memorable_elements?.slice(0, 3).map((el, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-full">
                  ✨ {el.length > 35 ? el.slice(0, 35) + '...' : el}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Why Skip */}
      {hasSkipReasons && (
        <div className="border-t border-[var(--border-primary)]/30">
          <button onClick={() => setShowSkip(!showSkip)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-primary)]/50">
            <span className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <ThumbsDown className="w-3.5 h-3.5 text-orange-400" /> Things to consider
            </span>
            <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${showSkip ? "rotate-180" : ""}`} />
          </button>
          {showSkip && (
            <div className="px-4 pb-3">
              <ul className="space-y-1.5 ml-5">
                {whySkip!.reasons!.map((reason, i) => (
                  <li key={i} className="text-[var(--text-secondary)] text-sm flex items-start gap-2">
                    <span className="text-orange-400">⚠</span><span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {qualityScore && qualityScore > 0.8 && (
        <div className="px-4 py-2 flex items-center justify-center gap-1.5 text-xs border-t border-[var(--border-primary)]/30">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[var(--text-tertiary)]">AI-Enhanced Review</span>
        </div>
      )}
    </div>
  );
}
