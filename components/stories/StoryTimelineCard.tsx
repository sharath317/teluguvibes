/**
 * STORY TIMELINE CARD COMPONENT
 * 
 * A compact, beautiful card for displaying connected story arcs.
 * Features:
 * - Visual timeline with date markers
 * - Post type indicators (breaking, update, resolution)
 * - Status badges (active, concluded, dormant)
 * - Expandable post details
 * - Bilingual support (Telugu/English)
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { StoryArc, StoryPost, StoryTimeline, StoryPostType, StoryType, StoryStatus, StoryEntityType } from '@/lib/story-engine/connected-stories';

// ============================================================
// TYPES
// ============================================================

export interface StoryTimelineCardProps {
  story: StoryArc;
  timeline?: StoryTimeline['timeline'];
  posts?: StoryPost[];
  className?: string;
  compact?: boolean;
  showReadMore?: boolean;
  locale?: 'en' | 'te';
}

interface PostTypeConfig {
  label: string;
  labelTe: string;
  icon: string;
  color: string;
  bgColor: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const POST_TYPE_CONFIG: Record<StoryPostType, PostTypeConfig> = {
  initial: {
    label: 'Started',
    labelTe: 'ప్రారంభం',
    icon: '🚀',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  update: {
    label: 'Update',
    labelTe: 'అప్‌డేట్',
    icon: '📝',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  resolution: {
    label: 'Resolved',
    labelTe: 'పరిష్కారం',
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  reaction: {
    label: 'Reaction',
    labelTe: 'ప్రతిస్పందన',
    icon: '💬',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  development: {
    label: 'Development',
    labelTe: 'పురోగతి',
    icon: '📈',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  conclusion: {
    label: 'Conclusion',
    labelTe: 'ముగింపు',
    icon: '🏁',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  'follow-up': {
    label: 'Follow-up',
    labelTe: 'ఫాలో-అప్',
    icon: '🔄',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
};

const STORY_TYPE_CONFIG: Record<StoryType, { label: string; labelTe: string; icon: string }> = {
  breaking: { label: 'Breaking', labelTe: 'బ్రేకింగ్', icon: '⚡' },
  developing: { label: 'Developing', labelTe: 'డెవలపింగ్', icon: '📈' },
  feature: { label: 'Feature', labelTe: 'ఫీచర్', icon: '⭐' },
  series: { label: 'Series', labelTe: 'సీరీస్', icon: '📚' },
};

const STATUS_CONFIG: Record<StoryStatus, { label: string; labelTe: string; color: string; bgColor: string }> = {
  active: { label: 'Active', labelTe: 'యాక్టివ్', color: 'text-green-700', bgColor: 'bg-green-100' },
  concluded: { label: 'Concluded', labelTe: 'ముగిసింది', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  dormant: { label: 'Dormant', labelTe: 'డార్మెంట్', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

const ENTITY_TYPE_ICONS: Record<StoryEntityType, string> = {
  movie: '🎬',
  celebrity: '⭐',
  event: '🎉',
  topic: '📰',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDate(date: Date | string, locale: 'en' | 'te' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  };
  return d.toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-US', options);
}

function getDaysSpan(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getRelativeTime(date: Date | string, locale: 'en' | 'te' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return locale === 'te' ? `${diffMins} నిమిషాల క్రితం` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return locale === 'te' ? `${diffHours} గంటల క్రితం` : `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return locale === 'te' ? `${diffDays} రోజుల క్రితం` : `${diffDays}d ago`;
  }
  return formatDate(d, locale);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface TimelineNodeProps {
  post: StoryPost;
  isFirst: boolean;
  isLast: boolean;
  locale: 'en' | 'te';
  expanded: boolean;
  onToggle: () => void;
}

function TimelineNode({ post, isFirst, isLast, locale, expanded, onToggle }: TimelineNodeProps) {
  const config = POST_TYPE_CONFIG[post.post_type || 'update'];
  
  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.bgColor} ${config.color} ring-2 ring-white z-10`}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-gray-200 absolute top-8 left-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-medium ${config.color}`}>
              {locale === 'te' ? config.labelTe : config.label}
            </span>
            <p className="text-sm font-medium text-gray-900 truncate">
              {post.title}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.published_at && (
              <span className="text-xs text-gray-500">
                {getRelativeTime(post.published_at, locale)}
              </span>
            )}
            {(post as any).is_main_post && (
              <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                Main
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StoryTimelineCard({
  story,
  timeline,
  posts,
  className = '',
  compact = false,
  showReadMore = true,
  locale = 'en',
}: StoryTimelineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Compute display data
  const displayPosts = useMemo(() => {
    if (posts?.length) {
      return posts;
    }
    if (timeline?.length) {
      return timeline.flatMap(t => t.posts || []).filter((p): p is StoryPost => p !== undefined);
    }
    return [];
  }, [posts, timeline]);

  const visiblePosts = compact && !isExpanded 
    ? displayPosts.slice(0, 3) 
    : displayPosts;

  const storyTypeConfig = story.story_type ? STORY_TYPE_CONFIG[story.story_type] : STORY_TYPE_CONFIG['developing'];
  const statusConfig = story.status ? STATUS_CONFIG[story.status] : STATUS_CONFIG['active'];
  const entityIcon = story.entity_type ? ENTITY_TYPE_ICONS[story.entity_type] : '📰';

  const daysSpan = story.started_at && story.last_updated_at ? getDaysSpan(story.started_at, story.last_updated_at) : 0;
  const title = locale === 'te' && story.title_te ? story.title_te : (story.title_en || story.title);
  const summary = locale === 'te' && story.summary_te ? story.summary_te : (story.summary_en || story.description);

  return (
    <div className={`story-timeline-card rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Story type */}
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {storyTypeConfig.icon} {locale === 'te' ? storyTypeConfig.labelTe : storyTypeConfig.label}
          </span>
          
          {/* Status */}
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
            {locale === 'te' ? statusConfig.labelTe : statusConfig.label}
          </span>

          {/* Entity type */}
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            {entityIcon} {story.main_entity}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
          {title}
        </h3>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {summary}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {story.started_at && (
            <span className="flex items-center gap-1">
              📅 {formatDate(story.started_at, locale)}
            </span>
          )}
          <span className="flex items-center gap-1">
            📰 {story.post_count ?? story.posts?.length ?? 0} {locale === 'te' ? 'పోస్టులు' : 'posts'}
          </span>
          {daysSpan > 0 && (
            <span className="flex items-center gap-1">
              ⏱️ {daysSpan} {locale === 'te' ? 'రోజులు' : 'days'}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      {visiblePosts.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-gray-500 mb-3">
            {locale === 'te' ? 'టైమ్‌లైన్' : 'Timeline'}
          </div>
          
          <div className="space-y-0">
            {visiblePosts.map((post, index) => (
              <TimelineNode
                key={post.id}
                post={post}
                isFirst={index === 0}
                isLast={index === visiblePosts.length - 1}
                locale={locale}
                expanded={expandedPostId === post.id}
                onToggle={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
              />
            ))}
          </div>

          {/* Show more button */}
          {compact && displayPosts.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-2 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center gap-1"
            >
              {isExpanded ? (
                <>
                  {locale === 'te' ? 'తక్కువ చూపించు' : 'Show less'}
                  <span className="text-xs">▲</span>
                </>
              ) : (
                <>
                  {locale === 'te' ? `మరో ${displayPosts.length - 3} చూపించు` : `Show ${displayPosts.length - 3} more`}
                  <span className="text-xs">▼</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Keywords */}
      {story.keywords && story.keywords.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {story.keywords.slice(0, 5).map((keyword, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              >
                #{keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      {showReadMore && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Link
            href={`/stories/${story.slug}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            {locale === 'te' ? 'పూర్తి కథ చదవండి' : 'Read full story'}
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LIST COMPONENT
// ============================================================

export interface StoryTimelineListProps {
  stories: StoryArc[];
  timelines?: Map<string, StoryTimeline['timeline']>;
  className?: string;
  locale?: 'en' | 'te';
  title?: string;
  titleTe?: string;
  emptyMessage?: string;
}

export function StoryTimelineList({
  stories,
  timelines,
  className = '',
  locale = 'en',
  title = 'Connected Stories',
  titleTe = 'కనెక్టెడ్ స్టోరీస్',
  emptyMessage,
}: StoryTimelineListProps) {
  if (!stories?.length) {
    if (emptyMessage) {
      return (
        <div className={`text-center py-8 text-gray-500 ${className}`}>
          {emptyMessage}
        </div>
      );
    }
    return null;
  }

  return (
    <section className={className}>
      <h2 className="text-xl font-bold mb-4">
        {locale === 'te' ? titleTe : title}
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <StoryTimelineCard
            key={story.id}
            story={story}
            timeline={timelines?.get(story.id)}
            compact={true}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================================
// COMPACT CARD (for sidebars)
// ============================================================

export interface CompactStoryCardProps {
  story: StoryArc;
  locale?: 'en' | 'te';
  className?: string;
}

export function CompactStoryCard({ story, locale = 'en', className = '' }: CompactStoryCardProps) {
  const statusConfig = story.status ? STATUS_CONFIG[story.status] : STATUS_CONFIG['active'];
  const storyTypeConfig = story.story_type ? STORY_TYPE_CONFIG[story.story_type] : STORY_TYPE_CONFIG['developing'];
  const title = locale === 'te' && story.title_te ? story.title_te : (story.title_en || story.title);

  return (
    <Link
      href={`/stories/${story.slug}`}
      className={`block p-3 rounded-lg bg-white border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">
          {storyTypeConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 line-clamp-2">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
              {locale === 'te' ? statusConfig.labelTe : statusConfig.label}
            </span>
            <span className="text-xs text-gray-500">
              {story.post_count} {locale === 'te' ? 'పోస్టులు' : 'posts'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default StoryTimelineCard;


