'use client';

/**
 * Awards Section Component
 * Displays celebrity awards grouped by type with filtering
 */

import { useState } from 'react';
import { Trophy, Medal, Star, Award } from 'lucide-react';
import type { CelebrityAward } from '@/lib/celebrity/types';

interface AwardsSectionProps {
  awards: CelebrityAward[];
  className?: string;
}

const AWARD_TABS = [
  { key: 'all', label: 'All', icon: Trophy },
  { key: 'national', label: 'National', icon: Medal },
  { key: 'filmfare', label: 'Filmfare', icon: Star },
  { key: 'nandi', label: 'Nandi', icon: Award },
  { key: 'siima', label: 'SIIMA', icon: Award },
];

export function AwardsSection({ awards, className = '' }: AwardsSectionProps) {
  const [activeTab, setActiveTab] = useState('all');

  if (awards.length === 0) {
    return null;
  }

  const filteredAwards = activeTab === 'all' 
    ? awards 
    : awards.filter(a => a.award_type === activeTab);

  // Group by year
  const awardsByYear = filteredAwards.reduce((acc, award) => {
    const year = award.year || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(award);
    return acc;
  }, {} as Record<number | string, CelebrityAward[]>);

  const sortedYears = Object.keys(awardsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <section className={`${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span>Awards & Honors</span>
          <span className="text-sm font-normal text-[var(--text-secondary)]">({awards.length})</span>
        </h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {AWARD_TABS.map(tab => {
          const count = tab.key === 'all' 
            ? awards.length 
            : awards.filter(a => a.award_type === tab.key).length;
          
          if (count === 0 && tab.key !== 'all') return null;

          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-secondary)] text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs ${activeTab === tab.key ? 'text-orange-200' : 'text-gray-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Awards List */}
      <div className="space-y-6">
        {sortedYears.map(year => (
          <div key={year}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
              <span className="w-12 h-px bg-gray-700" />
              {year}
              <span className="w-full h-px bg-gray-700" />
            </h3>
            
            <div className="grid gap-3">
              {awardsByYear[year].map((award, index) => (
                <AwardCard key={award.id || index} award={award} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredAwards.length === 0 && (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          No awards in this category
        </div>
      )}
    </section>
  );
}

function AwardCard({ award }: { award: CelebrityAward }) {
  const color = getAwardColor(award.award_type ?? 'other');
  const icon = getAwardIcon(award.award_type ?? 'other');

  return (
    <div className="flex items-start gap-3 p-4 bg-[var(--bg-secondary)]/50 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
      {/* Award Icon */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </div>

      {/* Award Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-xs font-medium px-2 py-0.5 rounded uppercase"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {formatAwardType(award.award_type ?? 'other')}
          </span>
          {award.is_won && (
            <span className="text-xs text-green-400">Won</span>
          )}
          {award.is_nomination && !award.is_won && (
            <span className="text-xs text-gray-500">Nominated</span>
          )}
        </div>

        <h4 className="text-[var(--text-primary)] font-medium">
          {award.category || award.name}
        </h4>

        {award.movie_title && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            For: <span className="text-orange-400">{award.movie_title}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function getAwardColor(type: string): string {
  const colors: Record<string, string> = {
    national: '#FFD700',
    filmfare: '#FF6B6B',
    nandi: '#4ECDC4',
    siima: '#9B59B6',
    cinemaa: '#3498DB',
    other: '#6B7280',
  };
  return colors[type] || colors.other;
}

function getAwardIcon(type: string): string {
  const icons: Record<string, string> = {
    national: '🏅',
    filmfare: '🎬',
    nandi: '🐂',
    siima: '⭐',
    cinemaa: '🎭',
    other: '🏆',
  };
  return icons[type] || '🏆';
}

function formatAwardType(type: string): string {
  const labels: Record<string, string> = {
    national: 'National',
    filmfare: 'Filmfare',
    nandi: 'Nandi',
    siima: 'SIIMA',
    cinemaa: 'CineMAA',
    other: 'Award',
  };
  return labels[type] || type;
}


