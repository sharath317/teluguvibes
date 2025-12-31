/**
 * TELUGU LIFE STORIES - TYPES
 *
 * Stories inspired by Reddit but AI-rewritten into
 * original Telugu narratives.
 *
 * Categories:
 * - Love ❤️
 * - Family 👨‍👩‍👧
 * - Inspiration 💪
 * - Middle-Class Life 🏠
 * - Student Struggles 🎓
 */

// ============================================================
// STORY TYPES
// ============================================================

export type StoryCategory =
  | 'love'
  | 'family'
  | 'inspiration'
  | 'middle_class'
  | 'student'
  | 'career'
  | 'friendship'
  | 'life_lessons';

export type StoryTone =
  | 'heartwarming'
  | 'emotional'
  | 'inspirational'
  | 'humorous'
  | 'reflective'
  | 'dramatic';

export type StoryLength = 'short' | 'medium' | 'long';

// ============================================================
// STORY CONTENT
// ============================================================

export interface TeluguStory {
  id: string;

  // Content
  title_te: string;
  title_en: string;
  body_te: string;
  summary_te: string;

  // Classification
  category: StoryCategory;
  tone: StoryTone;
  tags: string[];

  // Metadata
  reading_time_minutes: number;
  word_count: number;

  // Source (for legal compliance)
  inspiration_source: 'reddit' | 'original' | 'community';
  source_subreddit?: string;
  original_theme?: string;  // NOT the original text

  // Legal
  is_original_narrative: boolean;  // Must always be true
  attribution_text: string;        // "Inspired by anonymous story"

  // Publishing
  status: 'draft' | 'review' | 'published' | 'archived';
  published_at?: string;

  // Engagement
  view_count: number;
  read_completion_rate: number;
  likes: number;

  // AI Metadata
  ai_generated: boolean;
  generation_confidence: number;

  // Evergreen
  is_evergreen: boolean;
  last_recycled_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// REDDIT INSPIRATION
// ============================================================

export interface RedditInspirationPost {
  subreddit: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;

  // Extracted theme (NOT the content)
  theme: string;
  emotional_core: string;
  target_category: StoryCategory;

  // Relevance
  telugu_relevance_score: number;  // 0-1
  is_suitable: boolean;
}

export const ALLOWED_SUBREDDITS = [
  'relationships',
  'trueoffmychest',
  'AmItheAsshole',
  'india',
  'IndianRelationships',
  'offmychest',
  'relationship_advice',
  'tifu',
] as const;

// ============================================================
// STORY GENERATION CONFIG
// ============================================================

export interface StoryGenerationConfig {
  category: StoryCategory;
  tone: StoryTone;
  target_length: StoryLength;

  // Theme (from inspiration)
  theme: string;
  emotional_core: string;

  // Telugu context
  setting?: 'village' | 'city' | 'abroad' | 'mixed';
  cultural_elements?: string[];

  // Safety
  exclude_topics: string[];
  max_sensitivity: 'low' | 'medium';
}

// ============================================================
// CATEGORY CONFIG
// ============================================================

export const STORY_CATEGORY_CONFIG: Record<StoryCategory, {
  name_te: string;
  name_en: string;
  emoji: string;
  description: string;
  popular_themes: string[];
}> = {
  love: {
    name_te: 'ప్రేమ కథలు',
    name_en: 'Love Stories',
    emoji: '❤️',
    description: 'Romantic tales of love, heartbreak, and togetherness',
    popular_themes: ['first love', 'arranged marriage', 'long distance', 'reunion'],
  },
  family: {
    name_te: 'కుటుంబ కథలు',
    name_en: 'Family Stories',
    emoji: '👨‍👩‍👧',
    description: 'Stories about family bonds, sacrifices, and relationships',
    popular_themes: ['parent sacrifice', 'sibling bond', 'joint family', 'generation gap'],
  },
  inspiration: {
    name_te: 'స్ఫూర్తి కథలు',
    name_en: 'Inspirational Stories',
    emoji: '💪',
    description: 'Tales of overcoming obstacles and achieving dreams',
    popular_themes: ['rags to riches', 'never give up', 'second chances', 'hidden talent'],
  },
  middle_class: {
    name_te: 'మధ్యతరగతి జీవితం',
    name_en: 'Middle-Class Life',
    emoji: '🏠',
    description: 'Relatable stories of everyday middle-class struggles and joys',
    popular_themes: ['budget management', 'small victories', 'neighbor stories', 'festival memories'],
  },
  student: {
    name_te: 'విద్యార్థి జీవితం',
    name_en: 'Student Life',
    emoji: '🎓',
    description: 'Stories from school, college, and academic journeys',
    popular_themes: ['exam pressure', 'hostel life', 'teacher impact', 'friendship'],
  },
  career: {
    name_te: 'కెరీర్ కథలు',
    name_en: 'Career Stories',
    emoji: '💼',
    description: 'Professional journeys, workplace stories, and career pivots',
    popular_themes: ['first job', 'mentor', 'career change', 'startup journey'],
  },
  friendship: {
    name_te: 'స్నేహం',
    name_en: 'Friendship',
    emoji: '🤝',
    description: 'Stories celebrating true friendship',
    popular_themes: ['childhood friends', 'unexpected friend', 'sacrifice for friend', 'reunion'],
  },
  life_lessons: {
    name_te: 'జీవిత పాఠాలు',
    name_en: 'Life Lessons',
    emoji: '📖',
    description: 'Wisdom gained through life experiences',
    popular_themes: ['learning from mistakes', 'perspective shift', 'gratitude', 'simplicity'],
  },
};



