'use client';

/**
 * INTERVIEW INSIGHTS COMPONENT
 *
 * Shows "What X said about Y" insights from interviews.
 * Evergreen content extracted once from interviews.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Insight {
  id: string;
  insight_type: string;
  content_te: string;
  content_en?: string;
  topic: string;
  sentiment: string;
  importance_score: number;
  is_quotable: boolean;
  celebrities?: {
    name_en: string;
    name_te?: string;
  };
  interview_sources?: {
    title: string;
    source_url: string;
  };
}

interface CelebrityInsightsProps {
  celebrityId: string;
  celebrityName: string;
  limit?: number;
}

export function CelebrityInsights({ celebrityId, celebrityName, limit = 5 }: CelebrityInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/insights?celebrity=${celebrityId}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [celebrityId, limit]);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-40 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-500 px-6 py-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          🎙️ {celebrityName} ఏం చెప్పారు
        </h3>
      </div>
      <div className="divide-y divide-gray-700">
        {insights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const typeConfig = {
    opinion: { emoji: '💭', label: 'అభిప్రాయం', color: 'text-blue-400' },
    controversy: { emoji: '⚡', label: 'వివాదం', color: 'text-red-400' },
    career_reflection: { emoji: '📖', label: 'కెరీర్', color: 'text-green-400' },
    trivia: { emoji: '💡', label: 'ట్రివియా', color: 'text-yellow-400' },
    quote: { emoji: '💬', label: 'కోట్', color: 'text-purple-400' },
    revelation: { emoji: '🔓', label: 'వెల్లడి', color: 'text-pink-400' },
  }[insight.insight_type] || { emoji: '📌', label: insight.insight_type, color: 'text-gray-400' };

  const sentimentColor = {
    positive: 'border-green-500',
    negative: 'border-red-500',
    neutral: 'border-gray-500',
    controversial: 'border-yellow-500',
  }[insight.sentiment] || 'border-gray-500';

  return (
    <div className={`p-4 border-l-4 ${sentimentColor} hover:bg-gray-800/50`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm ${typeConfig.color}`}>
          {typeConfig.emoji} {typeConfig.label}
        </span>
        {insight.is_quotable && (
          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
            Quotable
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          Score: {insight.importance_score}
        </span>
      </div>

      {/* Telugu content */}
      <p className="text-white mb-2">
        {insight.is_quotable && <span className="text-gray-500">"</span>}
        {insight.content_te}
        {insight.is_quotable && <span className="text-gray-500">"</span>}
      </p>

      {/* Topic */}
      {insight.topic && (
        <p className="text-sm text-gray-500 mb-2">
          విషయం: <span className="text-gray-400">{insight.topic}</span>
        </p>
      )}

      {/* Source */}
      {insight.interview_sources && (
        <a
          href={insight.interview_sources.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-400 hover:text-orange-300"
        >
          📺 {insight.interview_sources.title}
        </a>
      )}
    </div>
  );
}

/**
 * Controversial insights widget for sidebar
 */
export function ControversialInsightsWidget() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchControversies() {
      try {
        const res = await fetch('/api/insights?type=controversy&limit=5');
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchControversies();
  }, []);

  if (loading || insights.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3">
        <h3 className="font-bold text-white flex items-center gap-2">
          ⚡ వివాదాస్పద వ్యాఖ్యలు
        </h3>
      </div>
      <div className="divide-y divide-gray-700">
        {insights.slice(0, 3).map(insight => (
          <div key={insight.id} className="p-3 hover:bg-gray-800/50">
            <p className="text-sm text-white line-clamp-2">{insight.content_te}</p>
            {insight.celebrities && (
              <p className="text-xs text-orange-400 mt-1">
                — {insight.celebrities.name_en}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "What X said about Y" component
 */
export function WhatTheySaidAbout({
  aboutType,
  aboutId,
  aboutName,
}: {
  aboutType: 'celebrity' | 'movie';
  aboutId: string;
  aboutName: string;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const param = aboutType === 'celebrity' ? 'aboutCelebrity' : 'aboutMovie';
        const res = await fetch(`/api/insights?${param}=${aboutId}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [aboutType, aboutId]);

  if (loading || insights.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-white mb-4">
        🎙️ {aboutName} గురించి వారు ఏం చెప్పారు
      </h3>
      <div className="space-y-4">
        {insights.map(insight => (
          <div key={insight.id} className="card p-4">
            <p className="text-white mb-2">"{insight.content_te}"</p>
            {insight.celebrities && (
              <p className="text-sm text-orange-400">
                — {insight.celebrities.name_en}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CelebrityInsights;



