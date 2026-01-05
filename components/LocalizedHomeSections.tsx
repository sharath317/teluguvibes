'use client';

/**
 * LocalizedHomeSections
 * 
 * Client-side wrapper for homepage sections with full localization.
 * Uses CollapsibleSection for each content area.
 */

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { CollapsibleSection } from './sections/CollapsibleSection';
import { NewsCard } from './NewsCard';
import { CompactNewsCard } from './cards/CompactNewsCard';
import { SectionHeader } from './sections/SectionHeader';
import { PhotoGalleryStrip } from './sections/PhotoGalleryStrip';
import { VideoSection } from './sections/VideoSection';
import { OpinionSection } from './sections/OpinionSection';
import { HeadlineStrip } from './sections/HeadlineStrip';
import { RecentPostsSidebar } from './RecentPostsSidebar';
import { AdSlot } from './AdSlot';
import { Newspaper, Zap } from 'lucide-react';
import type { Post } from '@/types/database';

interface LocalizedHomeSectionsProps {
  posts: Post[];
  popularPosts: Post[];
  entertainmentPosts: Post[];
  sportsPosts: Post[];
  politicsPosts: Post[];
  hotGalleryItems: any[];
  videos: any[];
  opinionPosts: any[];
  gossipPosts: Post[];
  trendingPosts: Post[];
  featuredPost: Post | null;
  topStories: Post[];
  recentPosts: Post[];
  crimePosts: Post[];
  viralPosts: Post[];
}

export function LocalizedHomeSections({
  posts,
  popularPosts,
  entertainmentPosts,
  sportsPosts,
  politicsPosts,
  hotGalleryItems,
  videos,
  opinionPosts,
  gossipPosts,
  trendingPosts,
  featuredPost,
  topStories,
  recentPosts,
  crimePosts,
  viralPosts,
}: LocalizedHomeSectionsProps) {
  const { t, isEnglish, lang } = useLanguage();

  if (posts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
      {/* ============ LEFT COLUMN: MAIN FEED (8 cols) ============ */}
      <div className="lg:col-span-8">
        <div className="space-y-4 sm:space-y-6">
          
          {/* -------- HERO SECTION (Always visible) -------- */}
          <section className="glass-card rounded-xl p-3 sm:p-4">
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {featuredPost && (
                <div className="md:row-span-2">
                  <NewsCard post={featuredPost} featured />
                </div>
              )}
              <div className="space-y-2 sm:space-y-3">
                {topStories.slice(0, 2).map((post) => (
                  <CompactNewsCard 
                    key={post.id} 
                    post={post} 
                    variant="horizontal"
                    imageSize="medium"
                  />
                ))}
              </div>
            </div>
          </section>

          {/* -------- ENTERTAINMENT SECTION -------- */}
          {entertainmentPosts.length > 0 && (
            <CollapsibleSection
              title={t('sections', 'filmBeat')}
              emoji="🎬"
              href="/category/entertainment"
              gradient="linear-gradient(135deg, #7209b7, #a855f7)"
              initialOpen={true}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {entertainmentPosts.slice(0, 6).map((post) => (
                  <CompactNewsCard 
                    key={post.id} 
                    post={post} 
                    variant="vertical"
                    showCategory={false}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- VIDEO SECTION -------- */}
          {videos.length > 0 && (
            <CollapsibleSection
              title={t('sections', 'videoWave')}
              emoji="🎬"
              href="/videos"
              gradient="linear-gradient(135deg, #f97316, #ea580c)"
              initialOpen={true}
              badge={isEnglish ? 'NEW' : 'కొత్త'}
              badgeColor="#10b981"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {videos.slice(0, 8).map((video: any) => (
                  <Link
                    key={video.id}
                    href={video.href}
                    className="group relative rounded-lg overflow-hidden aspect-video"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <span className="text-[10px] text-white line-clamp-2">{video.title}</span>
                      {video.duration && (
                        <span className="text-[9px] text-white/70">{video.duration}</span>
                      )}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- AD SLOT (Mid-page) -------- */}
          <div className="flex justify-center py-2">
            <AdSlot slot="mid-article" />
          </div>

          {/* -------- GOSSIP HEADLINES -------- */}
          {gossipPosts.length > 0 && (
            <CollapsibleSection
              title={t('nav', 'masalaBytes')}
              emoji="🌶️"
              href="/category/gossip"
              gradient="linear-gradient(135deg, #f72585, #b5179e)"
              initialOpen={true}
            >
              <div className="space-y-2">
                {gossipPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.slug}`}
                    className="flex items-start gap-2 py-1.5 group"
                  >
                    <span 
                      className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ 
                        background: idx < 3 ? '#f72585' : 'var(--bg-tertiary)',
                        color: idx < 3 ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span 
                      className={`text-sm line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors ${isEnglish ? 'font-body' : ''}`}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {post.title}
                    </span>
                  </Link>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- SPORTS SECTION -------- */}
          {sportsPosts.length > 0 && (
            <CollapsibleSection
              title={t('sections', 'sportsMasala')}
              emoji="🏆"
              href="/category/sports"
              gradient="linear-gradient(135deg, #06d6a0, #059669)"
              initialOpen={true}
            >
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                {sportsPosts.slice(0, 4).map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- OPINION / EDITORIAL SECTION -------- */}
          {opinionPosts.length > 0 && (
            <CollapsibleSection
              title={t('sections', 'opinionDesk')}
              emoji="📝"
              href="/editorial"
              gradient="linear-gradient(135deg, #607D8B, #455A64)"
              initialOpen={false}
            >
              <div className="space-y-3">
                {opinionPosts.map((post: any, idx: number) => (
                  <Link
                    key={post.id}
                    href={post.href}
                    className="block p-3 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
                    style={{ background: idx === 0 ? 'var(--bg-tertiary)' : 'transparent' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                        {post.author?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1">
                        <h3 
                          className={`font-medium text-sm mb-1 line-clamp-2 ${isEnglish ? 'font-body' : ''}`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <span>{post.author}</span>
                          {post.authorRole && (
                            <>
                              <span>•</span>
                              <span>{post.authorRole}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- POLITICS SECTION -------- */}
          {politicsPosts.length > 0 && (
            <CollapsibleSection
              title={t('sections', 'politicalPulse')}
              emoji="🗳️"
              href="/category/politics"
              gradient="linear-gradient(135deg, #4361ee, #3a0ca3)"
              initialOpen={false}
            >
              <div className="space-y-2">
                {politicsPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.slug}`}
                    className="flex items-start gap-2 py-1.5 group"
                  >
                    <span 
                      className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{ 
                        background: idx < 3 ? '#4361ee' : 'var(--bg-tertiary)',
                        color: idx < 3 ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span 
                      className={`text-sm line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors ${isEnglish ? 'font-body' : ''}`}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {post.title}
                    </span>
                  </Link>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* -------- MORE NEWS GRID -------- */}
          <CollapsibleSection
            title={t('ui', 'moreNews')}
            emoji="📰"
            href="/category/trending"
            initialOpen={true}
            collapsible={false}
          >
            <div className="grid md:grid-cols-2 gap-2 sm:gap-3">
              {posts.slice(5, 11).map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>

            {posts.length > 10 && (
              <div className="text-center pt-4 sm:pt-6">
                <Link
                  href="/category/trending"
                  className={`inline-block px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition-colors ${isEnglish ? 'font-body' : ''}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  {t('sections', 'moreNewsBtn')}
                </Link>
              </div>
            )}
          </CollapsibleSection>
        </div>
      </div>

      {/* ============ RIGHT COLUMN: SIDEBAR (4 cols) ============ */}
      <aside className="lg:col-span-4 space-y-4 sm:space-y-6">
        <AdSlot slot="sidebar" />

        <RecentPostsSidebar
          recentPosts={recentPosts}
          popularPosts={popularPosts.length > 0 ? popularPosts : recentPosts}
        />

        {/* Trending Topics */}
        {trendingPosts.length > 0 && (
          <CollapsibleSection
            title={t('sections', 'trendingNow')}
            emoji="🔥"
            href="/category/trending"
            gradient="linear-gradient(90deg, #f97316, #ea580c)"
          >
            <div className="space-y-1">
              {trendingPosts.slice(0, 5).map((post, idx) => (
                <Link
                  key={post.id}
                  href={`/post/${post.slug}`}
                  className="flex items-start gap-2 py-1 sm:py-1.5 group"
                >
                  <span 
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{ 
                      background: idx < 3 ? '#f97316' : 'var(--bg-tertiary)',
                      color: idx < 3 ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span 
                    className={`text-xs line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors ${isEnglish ? 'font-body' : ''}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {post.title}
                  </span>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Astrology Widget */}
        <CollapsibleSection
          title={t('sections', 'starSigns')}
          emoji="🔮"
          href="/astrology"
          gradient="linear-gradient(90deg, #9d4edd, #7b2cbf)"
          initialOpen={false}
        >
          <div className="grid grid-cols-4 gap-2 mb-3">
            {['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((sign, i) => (
              <Link
                key={i}
                href={`/astrology/${['mesha', 'vrushabha', 'mithuna', 'karkataka', 'simha', 'kanya', 'tula', 'vrischika', 'dhanu', 'makara', 'kumbha', 'meena'][i]}`}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-lg hover:scale-110 transition-transform sparkle"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                {sign}
              </Link>
            ))}
          </div>
        </CollapsibleSection>

        {/* Crime Section */}
        <CollapsibleSection
          title={t('sections', 'crimeFile')}
          emoji="🔍"
          href="/category/crime"
          gradient="linear-gradient(90deg, #d00000, #9d0208)"
          initialOpen={false}
        >
          <div className="space-y-2">
            {crimePosts.slice(0, 4).map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="flex gap-2 group"
              >
                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={post.image_url || `https://picsum.photos/seed/${post.id}/80/60`}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
                <span 
                  className={`text-xs line-clamp-2 group-hover:text-[#d00000] transition-colors ${isEnglish ? 'font-body' : ''}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </CollapsibleSection>

        <AdSlot slot="sidebar-bottom" />
      </aside>
    </div>
  );
}

function EmptyState() {
  const { t, isEnglish } = useLanguage();
  
  return (
    <div
      className="rounded-xl p-8 sm:p-12 text-center"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)'
      }}
    >
      <div className="text-5xl sm:text-6xl mb-4">📰</div>
      <h2 
        className={`text-lg sm:text-xl font-bold mb-2 ${isEnglish ? 'font-heading' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {t('empty', 'noNews')}
      </h2>
      <p className="mb-4 sm:mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {isEnglish 
          ? 'Add your first news article from the admin dashboard.'
          : 'మొదటి వార్తను అడ్మిన్ డాష్‌బోర్డ్ నుండి జోడించండి.'}
      </p>
      <a
        href="/admin"
        className={`inline-block px-5 sm:px-6 py-2.5 sm:py-3 font-bold rounded-lg transition-colors text-sm sm:text-base ${isEnglish ? 'font-body' : ''}`}
        style={{
          background: 'var(--brand-primary)',
          color: 'white'
        }}
      >
        {t('empty', 'goToAdmin')}
      </a>
    </div>
  );
}

export default LocalizedHomeSections;






