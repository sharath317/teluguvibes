'use client';

/**
 * TREND HEAT BADGE
 *
 * Visual indicator of trending score (0-100).
 * Shows 🔥 with color intensity based on heat level.
 */

import { useState, useEffect } from 'react';

interface TrendHeatBadgeProps {
  entityType: 'celebrity' | 'movie' | 'topic';
  entityName: string;
  entityId?: string;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

interface HeatScore {
  heat_index: number;
  heat_label: 'cold' | 'warm' | 'hot' | 'viral';
  trending_direction: 'up' | 'down' | 'stable';
  heat_delta: number;
}

export function TrendHeatBadge({
  entityType,
  entityName,
  entityId,
  size = 'md',
  showScore = false,
}: TrendHeatBadgeProps) {
  const [heat, setHeat] = useState<HeatScore | null>(null);

  useEffect(() => {
    async function fetchHeat() {
      try {
        const res = await fetch(
          `/api/heat-score?type=${entityType}&name=${encodeURIComponent(entityName)}`
        );
        if (res.ok) {
          const data = await res.json();
          setHeat(data);
        }
      } catch {
        // Silently fail - badge just won't show
      }
    }
    fetchHeat();
  }, [entityType, entityName]);

  // Don't show badge for cold entities
  if (!heat || heat.heat_label === 'cold') {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses = {
    warm: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hot: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    viral: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
  };

  const icon = {
    warm: '🔥',
    hot: '🔥🔥',
    viral: '🔥🔥🔥',
  };

  const directionIcon = {
    up: '↑',
    down: '↓',
    stable: '',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${sizeClasses[size]}
        ${colorClasses[heat.heat_label as keyof typeof colorClasses]}
      `}
      title={`Trend Score: ${heat.heat_index}/100`}
    >
      <span>{icon[heat.heat_label as keyof typeof icon]}</span>
      {showScore && (
        <>
          <span className="font-medium">{heat.heat_index}</span>
          {heat.trending_direction !== 'stable' && (
            <span className={heat.trending_direction === 'up' ? 'text-green-400' : 'text-red-400'}>
              {directionIcon[heat.trending_direction]}
            </span>
          )}
        </>
      )}
    </span>
  );
}

/**
 * Inline heat indicator (just the fire emoji)
 */
export function TrendHeatIcon({ heatIndex }: { heatIndex: number }) {
  if (heatIndex < 40) return null;

  const label = heatIndex >= 80 ? 'viral' : heatIndex >= 60 ? 'hot' : 'warm';
  const icon = label === 'viral' ? '🔥🔥🔥' : label === 'hot' ? '🔥🔥' : '🔥';

  return (
    <span
      className={label === 'viral' ? 'animate-pulse' : ''}
      title={`Trending: ${heatIndex}/100`}
    >
      {icon}
    </span>
  );
}

/**
 * Trending list widget
 */
export function TrendingNowWidget() {
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch('/api/trending-now');
        if (res.ok) {
          const data = await res.json();
          setTrending(data.items || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-32 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3">
        <h3 className="font-bold text-white flex items-center gap-2">
          🔥 ట్రెండింగ్ నౌ
        </h3>
      </div>
      <div className="divide-y divide-gray-700">
        {trending.slice(0, 8).map((item, index) => (
          <div key={item.entity_name} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50">
            <span className="text-gray-500 font-mono text-sm w-5">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-white truncate block">{item.entity_name}</span>
              <span className="text-xs text-gray-500 capitalize">{item.entity_type}</span>
            </div>
            <TrendHeatIcon heatIndex={item.heat_index} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TrendHeatBadge;








