'use client';

/**
 * Celebrity Hero Section
 * Displays celebrity profile image, name, quick facts, and social links
 */

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Trophy, Film, Star, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { CelebrityProfile, AwardsSummary, CareerStats } from '@/lib/celebrity/types';

interface CelebrityHeroProps {
  celebrity: CelebrityProfile & {
    career_stats?: CareerStats;
    awards_summary?: AwardsSummary;
  };
}

export function CelebrityHero({ celebrity }: CelebrityHeroProps) {
  const imageUrl = celebrity.profile_image || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(celebrity.name_en)}&background=FF6B00&color=fff&size=400`;

  const stats = celebrity.career_stats;
  const awards = celebrity.awards_summary;

  // Format birth date
  const birthDate = celebrity.birth_date 
    ? new Date(celebrity.birth_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Calculate age
  const age = celebrity.birth_date && !celebrity.death_date
    ? Math.floor((Date.now() - new Date(celebrity.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <section className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 via-transparent to-transparent" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Profile Image */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl shadow-orange-500/20">
              <Image
                src={imageUrl}
                alt={celebrity.name_en}
                fill
                className="object-cover"
                priority
              />
              {celebrity.era && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-full text-xs font-medium text-orange-400">
                  {getEraLabel(celebrity.era)}
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 text-center md:text-left">
            {/* Name */}
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1">
              {celebrity.name_en}
            </h1>
            {celebrity.name_te && (
              <p className="text-xl md:text-2xl text-orange-400 mb-3">
                {celebrity.name_te}
              </p>
            )}

            {/* Nicknames */}
            {celebrity.nicknames && celebrity.nicknames.length > 0 && (
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Also known as: {celebrity.nicknames.join(', ')}
              </p>
            )}

            {/* Quick Facts */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              {celebrity.occupation && celebrity.occupation.length > 0 && (
                <Fact 
                  icon={Star} 
                  text={celebrity.occupation.join(', ')} 
                />
              )}
              {birthDate && (
                <Fact 
                  icon={Calendar} 
                  text={`${birthDate}${age ? ` (${age} years)` : ''}`} 
                />
              )}
              {celebrity.birth_place && (
                <Fact 
                  icon={MapPin} 
                  text={celebrity.birth_place} 
                />
              )}
            </div>

            {/* Known For */}
            {celebrity.known_for && celebrity.known_for.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-[var(--text-secondary)] mb-2">Known for:</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {celebrity.known_for.slice(0, 5).map((movie, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[var(--bg-secondary)] rounded-full text-sm text-[var(--text-primary)]"
                    >
                      {movie}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Bar */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard 
                  label="Movies" 
                  value={stats.total_movies ?? stats.total_films ?? 0} 
                  icon={Film}
                />
                <StatCard 
                  label="Hits" 
                  value={stats.hits ?? 0} 
                  color="text-green-400"
                />
                <StatCard 
                  label="Hit Rate" 
                  value={`${stats.hit_rate}%`} 
                  color="text-yellow-400"
                />
                <StatCard 
                  label="Awards" 
                  value={awards?.total || 0} 
                  icon={Trophy}
                  color="text-orange-400"
                />
              </div>
            )}

            {/* External Links */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {celebrity.wikipedia_url && (
                <ExternalLinkButton href={celebrity.wikipedia_url} label="Wikipedia" />
              )}
              {celebrity.imdb_id && (
                <ExternalLinkButton 
                  href={`https://www.imdb.com/name/${celebrity.imdb_id}`} 
                  label="IMDb" 
                />
              )}
              {celebrity.instagram_handle && (
                <ExternalLinkButton 
                  href={`https://instagram.com/${celebrity.instagram_handle}`} 
                  label="Instagram" 
                />
              )}
              {celebrity.twitter_handle && (
                <ExternalLinkButton 
                  href={`https://twitter.com/${celebrity.twitter_handle}`} 
                  label="Twitter" 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Sub-components
function Fact({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
      <Icon className="w-4 h-4 text-orange-400" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon,
  color = 'text-[var(--text-primary)]' 
}: { 
  label: string; 
  value: number | string; 
  icon?: any;
  color?: string;
}) {
  return (
    <div className="bg-[var(--bg-secondary)]/50 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <span className={`text-xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-gray-700 rounded-lg text-sm text-[var(--text-secondary)] transition-colors"
    >
      <span>{label}</span>
      <ExternalLinkIcon className="w-3 h-3" />
    </Link>
  );
}

function getEraLabel(era: string): string {
  const labels: Record<string, string> = {
    legend: '🏆 Legend',
    golden: '✨ Golden Era',
    classic: '🎬 Classic',
    current: '🌟 Current',
    emerging: '🚀 Emerging',
  };
  return labels[era] || era;
}


