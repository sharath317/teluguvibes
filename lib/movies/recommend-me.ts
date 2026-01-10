/**
 * Recommend Me Module
 * Types and utilities for personalized movie recommendations
 */

export type MoodPreference =
  | 'feel-good'
  | 'intense'
  | 'romantic'
  | 'thought-provoking'
  | 'adventurous'
  | 'nostalgic'
  | 'inspirational'
  | 'thrilling'
  | 'emotional'
  | 'light-hearted'
  | 'dark'
  | 'mass';

export type EraPreference =
  | 'classic' // Pre-1990
  | 'classics' // Alias for classic
  | 'golden' // 1990-2005
  | 'modern' // 2006-2015
  | 'recent' // 2016-present
  | '90s' // 1990s
  | '2000s' // 2000s
  | '2010s' // 2010s
  | 'any';

export interface RecommendMePreferences {
  languages?: string[];
  genres?: string[];
  moods?: MoodPreference[];
  era?: EraPreference | EraPreference[]; // Can be single or multiple
  familyFriendly?: boolean;
  blockbustersOnly?: boolean;
  hiddenGems?: boolean;
  highlyRatedOnly?: boolean;
  minRating?: number;
}

export const MOOD_LABELS: Record<MoodPreference, { label: string; emoji: string }> = {
  'feel-good': { label: 'Feel Good', emoji: '😊' },
  intense: { label: 'Intense', emoji: '🔥' },
  romantic: { label: 'Romantic', emoji: '❤️' },
  'thought-provoking': { label: 'Thought-Provoking', emoji: '🤔' },
  adventurous: { label: 'Adventurous', emoji: '🚀' },
  nostalgic: { label: 'Nostalgic', emoji: '📼' },
  inspirational: { label: 'Inspirational', emoji: '✨' },
  thrilling: { label: 'Thrilling', emoji: '😱' },
  emotional: { label: 'Emotional', emoji: '😢' },
  'light-hearted': { label: 'Light & Fun', emoji: '🎉' },
  dark: { label: 'Dark', emoji: '🌙' },
  mass: { label: 'Mass', emoji: '💪' },
};

export const ERA_LABELS: Record<EraPreference, { label: string; years: string }> = {
  classic: { label: 'Classic Era', years: 'Pre-1990' },
  classics: { label: 'Classics', years: 'Pre-1990' },
  golden: { label: 'Golden Age', years: '1990-2005' },
  modern: { label: 'Modern Era', years: '2006-2015' },
  recent: { label: 'Recent', years: '2016-Present' },
  '90s': { label: '90s', years: '1990-1999' },
  '2000s': { label: '2000s', years: '2000-2009' },
  '2010s': { label: '2010s', years: '2010-2019' },
  any: { label: 'Any Era', years: 'All Time' },
};

/**
 * Get era for a given year
 */
export function getEraForYear(year: number): EraPreference {
  if (year < 1990) return 'classic';
  if (year <= 2005) return 'golden';
  if (year <= 2015) return 'modern';
  return 'recent';
}

/**
 * Check if a year matches an era preference
 */
export function matchesEra(year: number | undefined, era: EraPreference): boolean {
  if (!year || era === 'any') return true;

  const movieEra = getEraForYear(year);
  return movieEra === era;
}

