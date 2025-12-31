/**
 * Fan Challenges & Weekly Games Engine
 *
 * Features:
 * - Weekly challenges
 * - Shareable results
 * - Browser-stored progress
 * - Leaderboard (optional)
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Challenge,
  ChallengeQuestion,
  ChallengeAttempt,
  UserChallengeProgress,
  ShareableResult,
  LeaderboardEntry,
  CHALLENGE_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
} from './types';

// ============================================================
// SUPABASE CLIENT
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// CHALLENGE FETCHING
// ============================================================

/**
 * Get current active challenges
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .lte('start_date', now)
    .gte('end_date', now)
    .eq('status', 'active')
    .order('end_date', { ascending: true });

  if (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }

  return data || [];
}

/**
 * Get weekly challenge (current week)
 */
export async function getWeeklyChallenge(): Promise<Challenge | null> {
  const challenges = await getActiveChallenges();
  return challenges.find((c) => c.type === 'weekly_quiz') || null;
}

/**
 * Get daily trivia
 */
export async function getDailyTrivia(): Promise<Challenge | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('type', 'daily_trivia')
    .gte('start_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching daily trivia:', error);
  }

  return data || null;
}

/**
 * Get challenge questions
 */
export async function getChallengeQuestions(
  challengeId: string
): Promise<ChallengeQuestion[]> {
  const { data, error } = await supabase
    .from('challenge_questions')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('sequence', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// CHALLENGE PARTICIPATION
// ============================================================

/**
 * Start a challenge attempt
 */
export async function startChallenge(
  challengeId: string,
  userId: string
): Promise<{ success: boolean; attempt?: Partial<ChallengeAttempt>; error?: string }> {
  // Check if challenge exists and is active
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    return { success: false, error: 'Challenge not found' };
  }

  // Check existing attempts
  const { count } = await supabase
    .from('challenge_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);

  if ((count || 0) >= challenge.max_attempts) {
    return { success: false, error: 'Maximum attempts reached' };
  }

  // Create new attempt
  const attempt: Partial<ChallengeAttempt> = {
    challenge_id: challengeId,
    user_id: userId,
    started_at: new Date().toISOString(),
    score: 0,
    streak: 0,
    answers: [],
  };

  const { error: insertError } = await supabase
    .from('challenge_attempts')
    .insert(attempt);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, attempt };
}

/**
 * Submit an answer
 */
export async function submitAnswer(
  challengeId: string,
  userId: string,
  questionId: string,
  selectedIndex: number,
  timeTakenMs: number
): Promise<{ correct: boolean; points: number; streak: number }> {
  // Get question
  const { data: question } = await supabase
    .from('challenge_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (!question) {
    return { correct: false, points: 0, streak: 0 };
  }

  const isCorrect = selectedIndex === question.correct_index;

  // Get current attempt
  const { data: attempt } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .is('completed_at', null)
    .single();

  if (!attempt) {
    return { correct: isCorrect, points: 0, streak: 0 };
  }

  // Calculate streak
  const newStreak = isCorrect ? (attempt.streak || 0) + 1 : 0;
  const streakBonus = newStreak >= 3 ? Math.floor(newStreak / 3) * 10 : 0;
  const points = isCorrect ? question.points + streakBonus : 0;

  // Update attempt
  const updatedAnswers = [
    ...(attempt.answers || []),
    {
      question_id: questionId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
    },
  ];

  await supabase
    .from('challenge_attempts')
    .update({
      score: (attempt.score || 0) + points,
      streak: newStreak,
      answers: updatedAnswers,
    })
    .eq('id', attempt.id);

  return { correct: isCorrect, points, streak: newStreak };
}

/**
 * Complete a challenge
 */
export async function completeChallenge(
  challengeId: string,
  userId: string
): Promise<ShareableResult | null> {
  // Get attempt
  const { data: attempt } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .is('completed_at', null)
    .single();

  if (!attempt) {
    return null;
  }

  // Get challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (!challenge) {
    return null;
  }

  // Mark as completed
  const completedAt = new Date().toISOString();
  await supabase
    .from('challenge_attempts')
    .update({ completed_at: completedAt })
    .eq('id', attempt.id);

  // Calculate rank
  const { count: betterScores } = await supabase
    .from('challenge_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
    .not('completed_at', 'is', null)
    .gt('score', attempt.score);

  const rank = (betterScores || 0) + 1;

  // Generate shareable result
  const maxScore = challenge.questions_count * challenge.points_per_correct;
  const percentage = Math.round((attempt.score / maxScore) * 100);

  const shareText = `🎬 నేను TeluguVibes ${challenge.title_te} లో ${attempt.score}/${maxScore} (${percentage}%) సాధించాను! 🏆 నా streak: ${attempt.streak} 🔥\n\nనువ్వు కూడా try చేయి! 👇`;

  return {
    challenge_id: challengeId,
    challenge_title: challenge.title,
    score: attempt.score,
    max_score: maxScore,
    streak: attempt.streak,
    rank,
    share_text: shareText,
    share_url: `https://teluguvibes.com/challenges/${challengeId}?ref=share`,
    og_image_url: `https://teluguvibes.com/api/og/challenge?id=${challengeId}&score=${attempt.score}&streak=${attempt.streak}`,
  };
}

// ============================================================
// LEADERBOARD
// ============================================================

/**
 * Get challenge leaderboard
 */
export async function getLeaderboard(
  challengeId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('challenge_id', challengeId)
    .not('completed_at', 'is', null)
    .order('score', { ascending: false })
    .order('completed_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  // Random avatar emojis
  const emojis = ['🎬', '🎥', '🌟', '⭐', '🎭', '🎪', '🎯', '🏆', '🥇', '🥈', '🥉', '🎮'];

  return (data || []).map((entry, index) => ({
    rank: index + 1,
    user_name: entry.user_name || `Player ${entry.user_id.slice(-4)}`,
    avatar_emoji: emojis[index % emojis.length],
    score: entry.score,
    streak: entry.streak,
    completed_at: entry.completed_at,
  }));
}

// ============================================================
// BROWSER STORAGE (Client-side)
// ============================================================

/**
 * Get user progress from localStorage
 */
export function getUserProgress(): UserChallengeProgress {
  if (typeof window === 'undefined') {
    return {
      challenges_completed: 0,
      total_points: 0,
      current_streak: 0,
      best_streak: 0,
      badges_earned: [],
      last_played: '',
    };
  }

  try {
    const stored = localStorage.getItem('teluguvibes_challenge_progress');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }

  return {
    challenges_completed: 0,
    total_points: 0,
    current_streak: 0,
    best_streak: 0,
    badges_earned: [],
    last_played: '',
  };
}

/**
 * Update user progress in localStorage
 */
export function updateUserProgress(
  updates: Partial<UserChallengeProgress>
): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getUserProgress();
    const updated = { ...current, ...updates };
    localStorage.setItem('teluguvibes_challenge_progress', JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate anonymous user ID
 */
export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'server';

  try {
    let userId = localStorage.getItem('teluguvibes_user_id');
    if (!userId) {
      userId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('teluguvibes_user_id', userId);
    }
    return userId;
  } catch {
    return `anon_${Date.now()}`;
  }
}

// ============================================================
// WEEKLY CHALLENGE GENERATOR
// ============================================================

/**
 * Create a new weekly challenge (admin use)
 */
export async function createWeeklyChallenge(
  theme: string,
  themeTe: string
): Promise<Challenge | null> {
  // Calculate week dates
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekNumber = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  const challenge: Omit<Challenge, 'id'> = {
    type: 'weekly_quiz',
    title: `Week ${weekNumber}: ${theme}`,
    title_te: `వారం ${weekNumber}: ${themeTe}`,
    description: `This week's challenge focuses on ${theme}`,
    description_te: `ఈ వారపు ఛాలెంజ్ ${themeTe} గురించి`,
    difficulty: 'medium',
    start_date: monday.toISOString(),
    end_date: sunday.toISOString(),
    max_attempts: 3,
    questions_count: 10,
    points_per_correct: 10,
    bonus_for_streak: 5,
    status: 'active',
  };

  const { data, error } = await supabase
    .from('challenges')
    .insert(challenge)
    .select()
    .single();

  if (error) {
    console.error('Error creating weekly challenge:', error);
    return null;
  }

  return data;
}
