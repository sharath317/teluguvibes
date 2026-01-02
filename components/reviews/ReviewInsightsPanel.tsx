'use client';

/**
 * REVIEW INSIGHTS PANEL
 * 
 * Displays enriched review insights as a secondary layer.
 * Togglable via "Enhanced Review" switch.
 * Shows performance, direction, technical, and theme analysis.
 */

import { useState } from 'react';
import {
  Users, Clapperboard, Music, Camera, Palette, 
  ChevronDown, ChevronUp, Sparkles, Info
} from 'lucide-react';
import type { ReviewInsights, PerformanceInsight, DirectionInsight, TechnicalInsight, ThemeInsight } from '@/lib/reviews/review-insights';

interface ReviewInsightsPanelProps {
  insights: ReviewInsights | null;
  className?: string;
  defaultExpanded?: boolean;
}

export function ReviewInsightsPanel({
  insights,
  className = '',
  defaultExpanded = false
}: ReviewInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showEnhanced, setShowEnhanced] = useState(true);

  if (!insights) return null;

  const hasContent = insights.performances || insights.direction || 
                     insights.technical || insights.themes;

  if (!hasContent) return null;

  return (
    <div className={`bg-[var(--bg-secondary,#111)] border border-[var(--border-primary,#333)] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary,#333)]">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-[var(--text-primary,#fff)]">
            Enhanced Insights
          </h3>
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
            AI-Assisted
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-[var(--text-secondary,#999)]">Show</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={showEnhanced}
                onChange={(e) => setShowEnhanced(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${showEnhanced ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${showEnhanced ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </label>
          
          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary,#222)] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {showEnhanced && (
        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[2000px]' : 'max-h-96'} overflow-hidden`}>
          <div className="p-6 space-y-6">
            {/* Confidence Indicator */}
            <div className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary,#1a1a1a)] rounded-lg">
              <Info className="w-4 h-4 text-[var(--text-secondary,#999)]" />
              <div className="flex gap-4 text-xs">
                <ConfidenceBadge label="Performances" value={insights.section_confidence.performances} />
                <ConfidenceBadge label="Direction" value={insights.section_confidence.direction} />
                <ConfidenceBadge label="Technical" value={insights.section_confidence.technical} />
                <ConfidenceBadge label="Themes" value={insights.section_confidence.themes} />
              </div>
            </div>

            {/* Performances */}
            {insights.performances && insights.performances.length > 0 && (
              <InsightSection
                icon={<Users className="w-5 h-5" />}
                title="Performances"
                titleTe="నటన"
              >
                <div className="space-y-4">
                  {insights.performances.map((perf, idx) => (
                    <PerformanceCard key={idx} performance={perf} />
                  ))}
                </div>
              </InsightSection>
            )}

            {/* Direction */}
            {insights.direction && (
              <InsightSection
                icon={<Clapperboard className="w-5 h-5" />}
                title="Direction & Craft"
                titleTe="దర్శకత్వం"
              >
                <DirectionCard direction={insights.direction} />
              </InsightSection>
            )}

            {/* Technical */}
            {insights.technical && insights.technical.length > 0 && (
              <InsightSection
                icon={<Music className="w-5 h-5" />}
                title="Technical Aspects"
                titleTe="సాంకేతిక అంశాలు"
              >
                <div className="space-y-3">
                  {insights.technical.map((tech, idx) => (
                    <TechnicalCard key={idx} technical={tech} />
                  ))}
                </div>
              </InsightSection>
            )}

            {/* Themes */}
            {insights.themes && (
              <InsightSection
                icon={<Palette className="w-5 h-5" />}
                title="Themes & Impact"
                titleTe="థీమ్‌లు"
              >
                <ThemeCard theme={insights.themes} />
              </InsightSection>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-[var(--bg-tertiary,#1a1a1a)] border-t border-[var(--border-primary,#333)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-tertiary,#666)]">
              <span>Density Score: {insights.density_score}/100</span>
              {insights.needs_review && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                  Soft insights included
                </span>
              )}
              <span>Generated: {new Date(insights.generated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ConfidenceBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 0.80 ? 'text-green-400' : value >= 0.60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={color}>
      {label}: {(value * 100).toFixed(0)}%
    </span>
  );
}

function InsightSection({
  icon,
  title,
  titleTe,
  children
}: {
  icon: React.ReactNode;
  title: string;
  titleTe: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-500">{icon}</span>
        <h4 className="text-white font-semibold">{title}</h4>
        <span className="text-[var(--text-tertiary,#666)] text-sm">({titleTe})</span>
      </div>
      {children}
    </div>
  );
}

function PerformanceCard({ performance }: { performance: PerformanceInsight }) {
  const toneColors: Record<string, string> = {
    restrained: 'bg-blue-500/20 text-blue-400',
    intense: 'bg-red-500/20 text-red-400',
    raw: 'bg-orange-500/20 text-orange-400',
    charismatic: 'bg-purple-500/20 text-purple-400',
    nuanced: 'bg-teal-500/20 text-teal-400',
    commercial: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="p-4 bg-[var(--bg-tertiary,#1a1a1a)] rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{performance.actor}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${toneColors[performance.tone.type] || 'bg-gray-500/20 text-gray-400'}`}>
            {performance.tone.type}
          </span>
        </div>
        <span className="text-xs text-[var(--text-tertiary,#666)] capitalize">
          {performance.role_type}
        </span>
      </div>
      <p className="text-[var(--text-secondary,#999)] text-sm leading-relaxed">
        {performance.note_en}
      </p>
      <p className="text-[var(--text-tertiary,#666)] text-sm mt-1 italic">
        {performance.note_te}
      </p>
    </div>
  );
}

function DirectionCard({ direction }: { direction: DirectionInsight }) {
  const styleColors: Record<string, string> = {
    grounded: 'bg-green-500/20 text-green-400',
    commercial: 'bg-yellow-500/20 text-yellow-400',
    experimental: 'bg-purple-500/20 text-purple-400',
    classical: 'bg-blue-500/20 text-blue-400',
    hybrid: 'bg-teal-500/20 text-teal-400',
  };

  const pacingColors: Record<string, string> = {
    tight: 'text-green-400',
    measured: 'text-blue-400',
    uneven: 'text-yellow-400',
    rushed: 'text-red-400',
  };

  return (
    <div className="p-4 bg-[var(--bg-tertiary,#1a1a1a)] rounded-lg">
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-3 py-1 text-sm rounded-full ${styleColors[direction.style] || 'bg-gray-500/20 text-gray-400'}`}>
          {direction.style} style
        </span>
        <span className={`px-3 py-1 text-sm rounded-full bg-gray-700 ${pacingColors[direction.pacing_control]}`}>
          {direction.pacing_control} pacing
        </span>
        <span className={`px-3 py-1 text-sm rounded-full ${direction.emotional_payoff === 'strong' ? 'bg-green-500/20 text-green-400' : direction.emotional_payoff === 'weak' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
          {direction.emotional_payoff} payoff
        </span>
      </div>
      <p className="text-[var(--text-secondary,#999)] text-sm leading-relaxed">
        {direction.note_en}
      </p>
      <p className="text-[var(--text-tertiary,#666)] text-sm mt-1 italic">
        {direction.note_te}
      </p>
    </div>
  );
}

function TechnicalCard({ technical }: { technical: TechnicalInsight }) {
  const aspectIcons: Record<string, React.ReactNode> = {
    music: <Music className="w-4 h-4" />,
    cinematography: <Camera className="w-4 h-4" />,
    editing: <Clapperboard className="w-4 h-4" />,
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary,#1a1a1a)] rounded-lg">
      <span className="text-yellow-500 mt-0.5">
        {aspectIcons[technical.aspect] || <Music className="w-4 h-4" />}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white capitalize">{technical.aspect}</span>
          {technical.notable && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
              Notable
            </span>
          )}
          {technical.mood && (
            <span className="text-xs text-[var(--text-tertiary,#666)]">
              ({technical.mood})
            </span>
          )}
        </div>
        <p className="text-[var(--text-secondary,#999)] text-sm">
          {technical.impact_en}
        </p>
      </div>
    </div>
  );
}

function ThemeCard({ theme }: { theme: ThemeInsight }) {
  return (
    <div className="p-4 bg-[var(--bg-tertiary,#1a1a1a)] rounded-lg">
      <div className="flex flex-wrap gap-2 mb-3">
        {theme.core_themes.map((t, idx) => (
          <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full capitalize">
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-4 mb-3 text-xs">
        <span className={theme.cultural_relevance === 'high' ? 'text-green-400' : 'text-[var(--text-tertiary,#666)]'}>
          Cultural Relevance: <span className="capitalize">{theme.cultural_relevance}</span>
        </span>
        <span className={theme.emotional_resonance === 'deep' ? 'text-blue-400' : 'text-[var(--text-tertiary,#666)]'}>
          Emotional Depth: <span className="capitalize">{theme.emotional_resonance}</span>
        </span>
      </div>
      <p className="text-[var(--text-secondary,#999)] text-sm leading-relaxed">
        {theme.note_en}
      </p>
      <p className="text-[var(--text-tertiary,#666)] text-sm mt-1 italic">
        {theme.note_te}
      </p>
    </div>
  );
}

export default ReviewInsightsPanel;

