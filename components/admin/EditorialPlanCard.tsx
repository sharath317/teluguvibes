'use client';

/**
 * EDITORIAL PLAN CARD
 *
 * Read-only preview of the editorial analysis.
 * Shows emotion, angle, safety, and hook preview.
 * Used in /admin/posts/new and /admin/drafts
 */

import { useState } from 'react';
import type { EditorialPlan, AudienceEmotion, EditorialAngle, SafetyRisk } from '@/lib/intelligence/editorial-analyzer';

interface EditorialPlanCardProps {
  plan: EditorialPlan | null;
  loading?: boolean;
  onReanalyze?: () => void;
  onOverrideAngle?: (angle: EditorialAngle) => void;
}

// Emotion display configuration
const EMOTION_CONFIG: Record<AudienceEmotion, { emoji: string; label: string; color: string; labelTe: string }> = {
  nostalgia: { emoji: '🎬', label: 'Nostalgia', labelTe: 'నాస్టాల్జియా', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  excitement: { emoji: '🔥', label: 'Excitement', labelTe: 'ఉత్సాహం', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  pride: { emoji: '🏆', label: 'Pride', labelTe: 'గర్వం', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  curiosity: { emoji: '🤔', label: 'Curiosity', labelTe: 'ఆసక్తి', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  controversy: { emoji: '⚡', label: 'Controversy', labelTe: 'వివాదం', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  sadness: { emoji: '🙏', label: 'Sadness', labelTe: 'బాధ', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  celebration: { emoji: '🎉', label: 'Celebration', labelTe: 'వేడుక', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

// Angle display configuration
const ANGLE_CONFIG: Record<EditorialAngle, { emoji: string; label: string; labelTe: string }> = {
  gossip: { emoji: '💬', label: 'Gossip', labelTe: 'గాసిప్' },
  nostalgia: { emoji: '📼', label: 'Nostalgia', labelTe: 'నాస్టాల్జియా' },
  info: { emoji: '📰', label: 'Informational', labelTe: 'సమాచారం' },
  tribute: { emoji: '🌟', label: 'Tribute', labelTe: 'నివాళి' },
  analysis: { emoji: '📊', label: 'Analysis', labelTe: 'విశ్లేషణ' },
  viral: { emoji: '📈', label: 'Viral', labelTe: 'వైరల్' },
};

// Safety display configuration
const SAFETY_CONFIG: Record<SafetyRisk, { emoji: string; label: string; color: string }> = {
  low: { emoji: '✅', label: 'Safe to publish', color: 'text-green-400' },
  medium: { emoji: '⚠️', label: 'Needs careful wording', color: 'text-yellow-400' },
  high: { emoji: '🚨', label: 'Requires admin review', color: 'text-red-400' },
};

export function EditorialPlanCard({
  plan,
  loading,
  onReanalyze,
  onOverrideAngle
}: EditorialPlanCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-40 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="card p-4 border-dashed border-gray-600">
        <p className="text-gray-500 text-center">
          📝 Editorial plan will appear here after topic analysis
        </p>
      </div>
    );
  }

  const emotionConfig = EMOTION_CONFIG[plan.audience_emotion];
  const angleConfig = ANGLE_CONFIG[plan.best_angle];
  const safetyConfig = SAFETY_CONFIG[plan.safety_risk];

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          🧠 Editorial Plan
        </h3>
        <div className="flex items-center gap-2">
          {/* Confidence indicator */}
          <span className={`text-xs px-2 py-0.5 rounded ${
            plan.confidence >= 0.8 ? 'bg-green-500/30 text-green-300' :
            plan.confidence >= 0.6 ? 'bg-yellow-500/30 text-yellow-300' :
            'bg-red-500/30 text-red-300'
          }`}>
            {Math.round(plan.confidence * 100)}% confidence
          </span>
          {plan.needs_human_review && (
            <span className="text-xs px-2 py-0.5 bg-red-500/30 text-red-300 rounded">
              ⚠️ Review needed
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4">
        {/* Entity */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Main Entity</span>
          <p className="font-medium text-white">{plan.main_entity}</p>
          <span className="text-xs text-gray-500 capitalize">{plan.entity_type}</span>
          {plan.entity_metadata?.is_legend && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
              Legend
            </span>
          )}
          {plan.entity_metadata?.is_senior && !plan.entity_metadata?.is_legend && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
              Senior
            </span>
          )}
        </div>

        {/* Emotion & Angle */}
        <div className="grid grid-cols-2 gap-4">
          {/* Emotion */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Audience Emotion</span>
            <div className={`mt-1 px-3 py-2 rounded-lg border ${emotionConfig.color}`}>
              <span className="text-lg mr-2">{emotionConfig.emoji}</span>
              <span className="font-medium">{emotionConfig.label}</span>
              <p className="text-xs opacity-75">{emotionConfig.labelTe}</p>
            </div>
          </div>

          {/* Angle */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Best Angle</span>
            <div className="mt-1 px-3 py-2 rounded-lg border border-gray-600 bg-gray-800/50">
              <span className="text-lg mr-2">{angleConfig.emoji}</span>
              <span className="font-medium text-white">{angleConfig.label}</span>
              <p className="text-xs text-gray-400">{angleConfig.labelTe}</p>
            </div>
            {plan.fallback_angles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Fallback: {plan.fallback_angles.map(a => ANGLE_CONFIG[a].label).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Safety */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Safety Risk</span>
          <p className={`${safetyConfig.color} font-medium`}>
            {safetyConfig.emoji} {safetyConfig.label}
          </p>
        </div>

        {/* Hook Preview */}
        {plan.narrative_plan.hook.length > 0 && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Hook Preview</span>
            <div className="mt-1 p-3 bg-gray-800/50 rounded-lg border-l-4 border-orange-500">
              {plan.narrative_plan.hook.map((line, i) => (
                <p key={i} className="text-white italic">{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        {plan.reasoning && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">AI Reasoning</span>
            <p className="text-sm text-gray-400 mt-1">{plan.reasoning}</p>
          </div>
        )}

        {/* Expandable details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          {showDetails ? '▼ Hide narrative details' : '▶ Show narrative details'}
        </button>

        {showDetails && (
          <div className="space-y-3 pt-2 border-t border-gray-700">
            {plan.narrative_plan.context && (
              <div>
                <span className="text-xs text-gray-500">Context</span>
                <p className="text-sm text-gray-300">{plan.narrative_plan.context}</p>
              </div>
            )}
            {plan.narrative_plan.main_story && (
              <div>
                <span className="text-xs text-gray-500">Main Story</span>
                <p className="text-sm text-gray-300">{plan.narrative_plan.main_story}</p>
              </div>
            )}
            {plan.narrative_plan.past_relevance && (
              <div>
                <span className="text-xs text-gray-500">Past Relevance</span>
                <p className="text-sm text-gray-300">{plan.narrative_plan.past_relevance}</p>
              </div>
            )}
            {plan.narrative_plan.fan_reactions && (
              <div>
                <span className="text-xs text-gray-500">Fan Reactions</span>
                <p className="text-sm text-gray-300">{plan.narrative_plan.fan_reactions}</p>
              </div>
            )}
            {plan.narrative_plan.closing_note && (
              <div>
                <span className="text-xs text-gray-500">Closing Note</span>
                <p className="text-sm text-gray-300 italic">{plan.narrative_plan.closing_note}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              className="btn btn-secondary text-sm"
            >
              🔄 Re-analyze
            </button>
          )}
          {onOverrideAngle && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Override angle:</span>
              {(['info', 'tribute', 'analysis', 'viral'] as EditorialAngle[]).map(angle => (
                <button
                  key={angle}
                  onClick={() => onOverrideAngle(angle)}
                  className={`text-xs px-2 py-1 rounded ${
                    plan.best_angle === angle
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ANGLE_CONFIG[angle].emoji} {ANGLE_CONFIG[angle].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for list views
 */
export function EditorialPlanBadge({ plan }: { plan: EditorialPlan }) {
  const emotionConfig = EMOTION_CONFIG[plan.audience_emotion];
  const angleConfig = ANGLE_CONFIG[plan.best_angle];
  const safetyConfig = SAFETY_CONFIG[plan.safety_risk];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs px-2 py-0.5 rounded border ${emotionConfig.color}`}>
        {emotionConfig.emoji} {emotionConfig.label}
      </span>
      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
        {angleConfig.emoji} {angleConfig.label}
      </span>
      <span className={`text-xs ${safetyConfig.color}`}>
        {safetyConfig.emoji}
      </span>
      {plan.needs_human_review && (
        <span className="text-xs text-red-400">⚠️</span>
      )}
    </div>
  );
}

export default EditorialPlanCard;



