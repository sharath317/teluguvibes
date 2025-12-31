'use client';

import { useEffect, useState } from 'react';
import { Coins, Cloud, TrendingUp, TrendingDown, Sun, CloudRain, Wind, Droplets } from 'lucide-react';
import type { GoldPrices, WeatherData } from '@/types/database';

export function BottomInfoBar() {
  const [prices, setPrices] = useState<GoldPrices | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/gold-prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (error) {
      console.error('Failed to fetch gold prices:', error);
    }

    // Mock weather - replace with actual API
    setWeather({
      temperature: 28,
      condition: 'పాక్షిక మేఘావృతం',
      city: 'హైదరాబాద్',
      humidity: 55,
    });

    setLoading(false);
  }

  return (
    <div className="bg-gradient-to-r from-[#141414] via-[#1a1a1a] to-[#141414] border-t border-[#262626]">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gold 24K */}
          <InfoCard
            icon={<Coins className="w-5 h-5 text-[#eab308]" />}
            label="24K బంగారం"
            value={prices ? `₹${prices.gold_24k.toLocaleString('en-IN')}` : '---'}
            subtext="per gram"
            trend="up"
            loading={loading}
          />

          {/* Gold 22K */}
          <InfoCard
            icon={<Coins className="w-5 h-5 text-[#f59e0b]" />}
            label="22K బంగారం"
            value={prices ? `₹${prices.gold_22k.toLocaleString('en-IN')}` : '---'}
            subtext="per gram"
            trend="up"
            loading={loading}
          />

          {/* Silver */}
          <InfoCard
            icon={<Coins className="w-5 h-5 text-gray-400" />}
            label="వెండి"
            value={prices ? `₹${prices.silver.toLocaleString('en-IN')}` : '---'}
            subtext="per gram"
            trend="down"
            loading={loading}
          />

          {/* Weather */}
          <WeatherCard weather={weather} loading={loading} />
        </div>

        {/* Last updated */}
        {prices && (
          <div className="text-center mt-3 text-xs text-[#737373]">
            📍 {prices.city} • అప్‌డేట్: {new Date(prices.updated_at).toLocaleTimeString('te-IN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  subtext,
  trend,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  trend: 'up' | 'down';
  loading: boolean;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 flex items-center gap-4 hover:border-[#eab308]/30 transition-colors">
      <div className="flex-shrink-0 w-12 h-12 bg-[#262626] rounded-full flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#737373] uppercase tracking-wider">{label}</div>
        {loading ? (
          <div className="h-6 w-24 bg-[#262626] rounded animate-pulse mt-1" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#ededed]">{value}</span>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
        <div className="text-xs text-[#737373]">{subtext}</div>
      </div>
    </div>
  );
}

function WeatherCard({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  const getWeatherIcon = (condition: string) => {
    if (condition.includes('వర్షం') || condition.includes('rain')) return <CloudRain className="w-6 h-6 text-blue-400" />;
    if (condition.includes('మేఘ') || condition.includes('cloud')) return <Cloud className="w-6 h-6 text-gray-400" />;
    return <Sun className="w-6 h-6 text-yellow-400" />;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 flex items-center gap-4 hover:border-[#3b82f6]/30 transition-colors">
      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
        {weather ? getWeatherIcon(weather.condition) : <Cloud className="w-6 h-6 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1">
          <Wind className="w-3 h-3" />
          {weather?.city || 'వాతావరణం'}
        </div>
        {loading ? (
          <div className="h-6 w-20 bg-[#262626] rounded animate-pulse mt-1" />
        ) : weather ? (
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#ededed]">{weather.temperature}°C</span>
            <span className="text-sm text-[#737373]">{weather.condition}</span>
          </div>
        ) : (
          <span className="text-[#737373]">---</span>
        )}
        {weather && (
          <div className="text-xs text-[#737373] flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            తేమ: {weather.humidity}%
          </div>
        )}
      </div>
    </div>
  );
}

// Compact horizontal version for mobile
export function BottomInfoBarCompact() {
  const [prices, setPrices] = useState<GoldPrices | null>(null);

  useEffect(() => {
    fetch('/api/gold-prices')
      .then(res => res.json())
      .then(data => setPrices(data))
      .catch(console.error);
  }, []);

  if (!prices) return null;

  return (
    <div className="bg-[#141414] border-t border-[#262626] overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap py-2">
        <span className="mx-4 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#eab308]" />
          <span className="text-[#737373]">24K:</span>
          <span className="font-bold text-[#eab308]">₹{prices.gold_24k.toLocaleString()}</span>
        </span>
        <span className="mx-4 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#f59e0b]" />
          <span className="text-[#737373]">22K:</span>
          <span className="font-bold text-[#f59e0b]">₹{prices.gold_22k.toLocaleString()}</span>
        </span>
        <span className="mx-4 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-gray-400" />
          <span className="text-[#737373]">వెండి:</span>
          <span className="font-bold text-gray-300">₹{prices.silver.toLocaleString()}</span>
        </span>
        <span className="mx-4 text-sm flex items-center gap-2">
          <Sun className="w-4 h-4 text-yellow-400" />
          <span className="text-[#737373]">హైదరాబాద్:</span>
          <span className="font-bold text-white">28°C</span>
        </span>
        {/* Repeat for seamless scroll */}
        <span className="mx-4 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#eab308]" />
          <span className="text-[#737373]">24K:</span>
          <span className="font-bold text-[#eab308]">₹{prices.gold_24k.toLocaleString()}</span>
        </span>
        <span className="mx-4 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#f59e0b]" />
          <span className="text-[#737373]">22K:</span>
          <span className="font-bold text-[#f59e0b]">₹{prices.gold_22k.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}



