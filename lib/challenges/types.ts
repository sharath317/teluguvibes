/**
 * Fan Challenges & Weekly Games Types
 *
 * Browser-stored progress, shareable results
 */

export type ChallengeType =
  | 'weekly_quiz'
  | 'daily_trivia'
  | 'movie_marathon'
  | 'actor_birthday'
  | 'classic_movies'
  | 'hit_or_flop_streak';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  title_te: string;
  description: string;
  description_te: string;
  difficulty: ChallengeDifficulty;
  start_date: string;
  end_date: string;
  max_attempts: number;
  questions_count: number;
  points_per_correct: number;
  bonus_for_streak: number;
  badge_image?: string;
  prize_description?: string;
  status: ChallengeStatus;
}

export interface ChallengeQuestion {
  id: string;
  challenge_id: string;
  question: string;
  question_te: string;
  options: string[];
  correct_index: number;
  hint?: string;
  image_url?: string;
  points: number;
}

export interface ChallengeAttempt {
  challenge_id: string;
  user_id: string; // Browser fingerprint or anonymous ID
  started_at: string;
  completed_at?: string;
  score: number;
  streak: number;
  answers: {
    question_id: string;
    selected_index: number;
    is_correct: boolean;
    time_taken_ms: number;
  }[];
  rank?: number;
}

export interface UserChallengeProgress {
  challenges_completed: number;
  total_points: number;
  current_streak: number;
  best_streak: number;
  badges_earned: string[];
  last_played: string;
}

export interface ShareableResult {
  challenge_id: string;
  challenge_title: string;
  score: number;
  max_score: number;
  streak: number;
  rank?: number;
  share_text: string;
  share_url: string;
  og_image_url: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_name: string;
  avatar_emoji: string;
  score: number;
  streak: number;
  completed_at: string;
}

// Browser storage keys
export const CHALLENGE_STORAGE_KEY = 'teluguvibes_challenges';
export const PROGRESS_STORAGE_KEY = 'teluguvibes_challenge_progress';








