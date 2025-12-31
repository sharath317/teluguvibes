// Movie Reviews & Dedications Types

export type Genre =
  | 'Action' | 'Drama' | 'Romance' | 'Comedy' | 'Thriller'
  | 'Horror' | 'Fantasy' | 'Crime' | 'Period' | 'Family'
  | 'Musical' | 'Devotional' | 'Biographical' | 'Sports';

export type DedicationType =
  | 'birthday' | 'anniversary' | 'achievement' | 'memorial'
  | 'congratulations' | 'thank_you' | 'love' | 'friendship' | 'general';

export type AnimationType =
  | 'flowers' | 'crackers' | 'confetti' | 'hearts' | 'stars'
  | 'balloons' | 'sparkles' | 'fireworks' | 'petals' | 'none';

export interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  release_date?: string;
  release_year?: number;
  runtime_minutes?: number;
  genres: Genre[];
  language: string;
  certification?: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  tmdb_id?: number;
  imdb_id?: string;
  director?: string;
  directors: string[];
  producers: string[];
  music_director?: string;
  cinematographer?: string;
  editor?: string;
  writer?: string;
  cast_members: string[];
  hero?: string;
  heroine?: string;
  synopsis?: string;
  synopsis_te?: string;
  avg_rating: number;
  total_reviews: number;
  tags: string[];
  is_underrated: boolean;
  is_blockbuster: boolean;
  is_classic: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovieReview {
  id: string;
  movie_id: string;
  movie?: Movie;
  reviewer_type: 'admin' | 'critic' | 'user';
  reviewer_name: string;
  reviewer_avatar?: string;
  overall_rating: number;
  direction_rating?: number;
  screenplay_rating?: number;
  acting_rating?: number;
  music_rating?: number;
  cinematography_rating?: number;
  production_rating?: number;
  entertainment_rating?: number;
  title?: string;
  title_te?: string;
  summary?: string;
  summary_te?: string;
  direction_review?: string;
  screenplay_review?: string;
  acting_review?: string;
  music_review?: string;
  cinematography_review?: string;
  production_review?: string;
  directors_vision?: string;
  strengths: string[];
  weaknesses: string[];
  verdict?: string;
  verdict_te?: string;
  worth_watching: boolean;
  recommended_for: string[];
  views: number;
  likes: number;
  helpful_votes: number;
  is_featured: boolean;
  is_spoiler_free: boolean;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Dedication {
  id: string;
  dedication_type: DedicationType;
  from_name: string;
  from_location?: string;
  to_name: string;
  to_relation?: string;
  message: string;
  message_te?: string;
  celebrity_id?: string;
  celebrity_name?: string;
  photo_url?: string;
  animation_type: AnimationType;
  display_date: string;
  display_duration_hours: number;
  is_premium: boolean;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  likes: number;
  created_at: string;
  expires_at: string;
}

// Filter types for reviews page
export interface ReviewFilters {
  genre?: Genre;
  actor?: string;
  director?: string;
  year?: number;
  yearRange?: { from: number; to: number };
  minRating?: number;
  isUnderrated?: boolean;
  isBlockbuster?: boolean;
  isClassic?: boolean;
  sortBy?: 'rating' | 'year' | 'reviews' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

// Animation config for dedications
export const ANIMATION_CONFIG: Record<AnimationType, {
  emoji: string;
  color: string;
  particles: string[];
  sound?: string;
}> = {
  flowers: {
    emoji: '🌸',
    color: '#ff69b4',
    particles: ['🌸', '🌺', '🌷', '🌹', '💐'],
  },
  crackers: {
    emoji: '🎆',
    color: '#ffd700',
    particles: ['🎆', '🎇', '✨', '💥', '🎉'],
  },
  confetti: {
    emoji: '🎊',
    color: '#ff6347',
    particles: ['🎊', '🎉', '🎈', '🎀', '🎁'],
  },
  hearts: {
    emoji: '❤️',
    color: '#ff1493',
    particles: ['❤️', '💕', '💖', '💗', '💓'],
  },
  stars: {
    emoji: '⭐',
    color: '#ffd700',
    particles: ['⭐', '🌟', '✨', '💫', '🌠'],
  },
  balloons: {
    emoji: '🎈',
    color: '#87ceeb',
    particles: ['🎈', '🎁', '🎉', '🎀', '🎊'],
  },
  sparkles: {
    emoji: '✨',
    color: '#9370db',
    particles: ['✨', '💎', '🔮', '💜', '🌟'],
  },
  fireworks: {
    emoji: '🎆',
    color: '#ff4500',
    particles: ['🎆', '🎇', '💥', '🌟', '✨'],
  },
  petals: {
    emoji: '🌸',
    color: '#ffb6c1',
    particles: ['🌸', '🍃', '🌺', '🌷', '💮'],
  },
  none: {
    emoji: '💝',
    color: '#808080',
    particles: [],
  },
};

// Dedication type labels
export const DEDICATION_TYPE_LABELS: Record<DedicationType, {
  label: string;
  labelTe: string;
  defaultAnimation: AnimationType;
  icon: string;
}> = {
  birthday: {
    label: 'Birthday Wishes',
    labelTe: 'పుట్టినరోజు శుభాకాంక్షలు',
    defaultAnimation: 'balloons',
    icon: '🎂',
  },
  anniversary: {
    label: 'Anniversary',
    labelTe: 'వార్షికోత్సవం',
    defaultAnimation: 'hearts',
    icon: '💑',
  },
  achievement: {
    label: 'Congratulations',
    labelTe: 'అభినందనలు',
    defaultAnimation: 'confetti',
    icon: '🏆',
  },
  memorial: {
    label: 'In Memory',
    labelTe: 'స్మరణ',
    defaultAnimation: 'petals',
    icon: '🕯️',
  },
  congratulations: {
    label: 'Congratulations',
    labelTe: 'అభినందనలు',
    defaultAnimation: 'crackers',
    icon: '🎉',
  },
  thank_you: {
    label: 'Thank You',
    labelTe: 'ధన్యవాదాలు',
    defaultAnimation: 'flowers',
    icon: '🙏',
  },
  love: {
    label: 'Love',
    labelTe: 'ప్రేమ',
    defaultAnimation: 'hearts',
    icon: '❤️',
  },
  friendship: {
    label: 'Friendship',
    labelTe: 'స్నేహం',
    defaultAnimation: 'stars',
    icon: '🤝',
  },
  general: {
    label: 'Dedication',
    labelTe: 'అంకితం',
    defaultAnimation: 'sparkles',
    icon: '💝',
  },
};



