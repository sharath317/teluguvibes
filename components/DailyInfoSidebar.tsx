'use client';

import { useEffect, useState } from 'react';
import { Coins, Cloud, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import type { GoldPrices, WeatherData } from '@/types/database';

export function DailyInfoSidebar() {
  return (
    <aside className="space-y-4">
      <GoldPricesWidget />
      <WeatherWidget />
    </aside>
  );
}

function GoldPricesWidget() {
  const [prices, setPrices] = useState<GoldPrices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    try {
      setLoading(true);
      const res = await fetch('/api/gold-prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (error) {
      console.error('Failed to fetch gold prices:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#eab308] flex items-center gap-2">
          <Coins className="w-5 h-5" />
          బంగారం & వెండి ధరలు
        </h3>
        <button
          onClick={fetchPrices}
          className="p-1 hover:bg-[#262626] rounded transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-[#737373] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !prices ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-[#262626] rounded" />
          <div className="h-12 bg-[#262626] rounded" />
          <div className="h-12 bg-[#262626] rounded" />
        </div>
      ) : prices ? (
        <div className="space-y-3">
          <PriceRow
            label="24K బంగారం"
            value={prices.gold_24k}
            unit="₹/గ్రా"
            trend="up"
          />
          <PriceRow
            label="22K బంగారం"
            value={prices.gold_22k}
            unit="₹/గ్రా"
            trend="up"
          />
          <PriceRow
            label="వెండి"
            value={prices.silver}
            unit="₹/గ్రా"
            trend="down"
          />
          <div className="text-xs text-[#737373] pt-2 border-t border-[#262626]">
            📍 {prices.city} • {new Date(prices.updated_at).toLocaleTimeString('te-IN')}
          </div>
        </div>
      ) : (
        <div className="text-center text-[#737373] py-4">
          ధరలు లోడ్ అవ్వలేదు
        </div>
      )}
    </div>
  );
}

function PriceRow({
  label,
  value,
  unit,
  trend,
}: {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down';
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded-lg">
      <span className="text-sm text-[#ededed]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#eab308]">
          ₹{value.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-[#737373]">{unit}</span>
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
      </div>
    </div>
  );
}

function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    // Mock weather data - Replace with actual API
    setWeather({
      temperature: 32,
      condition: 'ఎండ',
      city: 'హైదరాబాద్',
      humidity: 45,
    });
  }, []);

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
        <Cloud className="w-5 h-5 text-blue-400" />
        వాతావరణం
      </h3>

      {weather ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-white">
              {weather.temperature}°C
            </div>
            <div className="text-sm text-[#737373]">{weather.condition}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">{weather.city}</div>
            <div className="text-xs text-[#737373]">
              తేమ: {weather.humidity}%
            </div>
          </div>
        </div>
      ) : (
        <div className="h-16 bg-[#262626] rounded animate-pulse" />
      )}
    </div>
  );
}








