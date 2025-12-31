/**
 * TELUGUVIBES INTERACTIVE GAMES - TYPES
 *
 * Types for all game modes.
 * Focus on nostalgia, cult classics, and Telugu cinema culture.
 */

// ============================================================
// GAME TYPES
// ============================================================

export type GameType =
  | 'dumb_charades'        // Guess the movie from clues
  | 'dumb_charades_enact'  // Just timer + word (user acts it out)
  | 'kids_charades'        // Kids version: animals, birds, actions
  | 'dialogue_guess'       // Guess actor from dialogue
  | 'director_guess'       // Guess director from movie hints
  | 'music_guess'          // Guess music director
  | 'emoji_movie'          // Guess movie from emojis
  | 'hit_or_flop'          // Guess box office verdict
  | 'year_guess'           // Guess movie release year
  | 'pair_match';          // Match actor with movie

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legend';

export type Era = 'classic' | 'golden' | '90s' | 'modern' | 'current' | 'mixed';

// ============================================================
// GAME ROUND
// ============================================================

export interface GameRound {
  id: string;
  session_id?: string;           // Reference to session
  game_type: GameType;
  difficulty: Difficulty;

  // Question content
  question: string;
  question_te?: string;           // Telugu question
  question_image?: string;        // Optional image clue
  question_emojis?: string[];     // For emoji games

  // Enact mode (for charades acting out)
  enact_word?: string;            // Word to act out (English)
  enact_word_te?: string;         // Word to act out (Telugu)
  is_enact_mode?: boolean;        // Flag for enact mode
  is_kids_mode?: boolean;         // Flag for kids-friendly mode
  category?: string;              // For kids mode: animals, birds, etc.

  // Hints (progressive reveal)
  hints: GameHint[];
  max_hints: number;

  // Answer
  correct_answer: string;
  correct_answer_te?: string;
  answer_image?: string;          // Reveal image after answer

  // Explanation
  explanation: string;
  explanation_te?: string;

  // Options (for multiple choice)
  options?: string[];
  is_multiple_choice?: boolean;

  // Source data
  source_movies: string[];        // Movie IDs used
  source_celebrities?: string[];  // Celebrity IDs used

  // Metadata
  era?: Era;
  tags: string[];
  points: number;
  time_limit_seconds?: number;
}

export interface GameHint {
  order: number;
  text: string;
  text_te?: string;
  hint_type: 'text' | 'image' | 'year' | 'genre' | 'cast';
  points_deduction: number;       // Points lost if hint used
}

// ============================================================
// GAME SESSION
// ============================================================

export interface GameSession {
  id: string;
  user_id?: string;               // Optional (anonymous allowed)
  session_token: string;          // For anonymous tracking
  game_type: GameType;

  // Progress
  current_round: number;
  total_rounds: number;
  rounds_completed: GameRoundResult[];

  // Scoring
  total_score: number;
  streak: number;
  best_streak: number;
  hints_used: number;

  // Adaptive difficulty
  current_difficulty: Difficulty;
  correct_answers: number;
  wrong_answers: number;

  // Timing
  started_at: string;
  last_activity: string;
  completed_at?: string;
  total_time_seconds: number;

  // Status
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface GameRoundResult {
  round_id: string;
  question_id: string;

  user_answer: string;
  is_correct: boolean;

  hints_used: number;
  time_taken_seconds: number;
  points_earned: number;

  completed_at: string;
}

// ============================================================
// GAME STATS
// ============================================================

export interface GameStats {
  total_sessions: number;
  completed_sessions: number;
  total_rounds_played: number;

  // By game type
  by_game_type: Record<GameType, GameTypeStats>;

  // Leaderboard
  top_scores: LeaderboardEntry[];

  // Popular
  most_guessed_movies: string[];
  most_failed_questions: string[];
}

export interface GameTypeStats {
  sessions: number;
  avg_score: number;
  avg_accuracy: number;
  avg_time_seconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  session_id: string;
  user_name?: string;
  score: number;
  game_type: GameType;
  completed_at: string;
}

// ============================================================
// CAREER VISUALIZATION
// ============================================================

export interface CareerVisualization {
  celebrity_id: string;
  celebrity_name: string;
  celebrity_name_te?: string;
  celebrity_image?: string;

  // Career stats
  total_movies: number;
  hits: number;
  average: number;
  flops: number;
  classics: number;

  // Career phases
  debut_year?: number;
  active_years: string;
  peak_years: string;

  // Movies grid
  movies: CareerMovie[];

  // Filters available
  years: number[];
  genres: string[];
  roles: string[];
}

export interface CareerMovie {
  movie_id: string;
  title: string;
  title_te?: string;
  year: number;

  // Visual
  poster_url?: string;
  poster_source?: string;

  // Classification
  verdict: 'blockbuster' | 'superhit' | 'hit' | 'average' | 'flop' | 'disaster' | 'classic' | 'unknown';
  verdict_color: string;

  // Metadata
  genre?: string;
  role?: string;              // Lead/Supporting/Cameo
  director?: string;

  // Box office (estimated)
  is_estimated: boolean;
}

// ============================================================
// ADMIN CONTROLS
// ============================================================

export interface GameAdminConfig {
  // Global
  games_enabled: boolean;
  maintenance_mode: boolean;

  // Per game type
  enabled_games: GameType[];

  // Content filters
  excluded_movies: string[];      // Movie IDs to exclude
  excluded_celebrities: string[];
  excluded_dialogues: string[];

  // Difficulty settings
  default_difficulty: Difficulty;
  adaptive_difficulty: boolean;
  difficulty_adjustment_threshold: number;

  // Content settings
  prefer_nostalgic: boolean;
  prefer_classics: boolean;
  min_movie_year?: number;
  max_movie_year?: number;

  // Safety
  require_verified_data: boolean;
  exclude_sensitive_content: boolean;

  // Monetization
  show_ads_in_games: boolean;
}
