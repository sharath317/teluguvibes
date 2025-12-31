'use client';

/**
 * Trending Ticker Component
 *
 * Displays a horizontal scrolling ticker with:
 * - Trending news
 * - Cricket scores (if live)
 * - Google Trends
 *
 * Uses Edge API with fallback.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface TickerItem {
  id: string;
  text: string;
  category: 'news' | 'cricket' | 'trend' | 'gossip';
  url?: string;
  isLive?: boolean;
}

interface TickerData {
  items: TickerItem[];
  lastUpdated: string;
  error?: string;
}

const CATEGORY_ICONS: Record<TickerItem['category'], React.ReactNode> = {
  news: <TrendingUp className="w-3 h-3" />,
  cricket: <span>🏏</span>,
  trend: <Zap className="w-3 h-3" />,
  gossip: <span>💫</span>,
};

const CATEGORY_COLORS: Record<TickerItem['category'], string> = {
  news: 'text-yellow-400',
  cricket: 'text-green-400',
  trend: 'text-orange-400',
  gossip: 'text-pink-400',
};

export function TrendingTicker() {
  const [data, setData] = useState<TickerData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const response = await fetch('/api/ticker', {
          next: { revalidate: 300 },
        });
        if (response.ok) {
          const tickerData = await response.json();
          setData(tickerData);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };

    fetchTicker();

    // Refresh every 5 minutes
    const interval = setInterval(fetchTicker, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data?.items?.length) {
    if (error) {
      return (
        <div className="bg-red-900/20 border-b border-red-800/30 py-1 px-4 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>Ticker unavailable</span>
        </div>
      );
    }
    return null; // Loading or empty
  }

  // Duplicate items for seamless loop
  const items = [...data.items, ...data.items];

  return (
    <div
      className="bg-gradient-to-r from-[#0a0a0a] via-[#141414] to-[#0a0a0a] border-b border-[#262626] py-1.5 overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Live indicator */}
      {data.items.some((item) => item.isLive) && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 bg-gradient-to-r from-[#0a0a0a] to-transparent">
          <span className="flex items-center gap-1 text-xs text-red-500 font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            LIVE
          </span>
        </div>
      )}

      {/* Ticker content */}
      <div
        className={`flex items-center gap-8 ${
          isPaused ? '' : 'animate-ticker'
        }`}
        style={{
          animationDuration: `${items.length * 5}s`,
        }}
      >
        {items.map((item, index) => (
          <TickerItemComponent key={`${item.id}-${index}`} item={item} />
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none" />
    </div>
  );
}

function TickerItemComponent({ item }: { item: TickerItem }) {
  const content = (
    <span
      className={`flex items-center gap-2 text-sm whitespace-nowrap ${CATEGORY_COLORS[item.category]}`}
    >
      {CATEGORY_ICONS[item.category]}
      <span className={item.isLive ? 'font-medium' : ''}>{item.text}</span>
      {item.isLive && (
        <span className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded animate-pulse">
          LIVE
        </span>
      )}
    </span>
  );

  if (item.url) {
    return (
      <Link
        href={item.url}
        className="hover:opacity-80 transition-opacity cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default TrendingTicker;
