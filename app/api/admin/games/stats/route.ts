/**
 * ADMIN GAMES STATS API
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get stats from view or calculate
    const { data, error } = await supabase
      .from('game_sessions')
      .select('game_type, total_score, current_round, correct_answers, status, best_streak');

    if (error) throw error;

    // Aggregate stats by game type
    const statsByType: Record<string, any> = {};

    for (const session of (data || [])) {
      if (!statsByType[session.game_type]) {
        statsByType[session.game_type] = {
          game_type: session.game_type,
          total_sessions: 0,
          completed_sessions: 0,
          total_score: 0,
          total_rounds: 0,
          total_correct: 0,
          high_score: 0,
          max_streak: 0,
        };
      }

      const s = statsByType[session.game_type];
      s.total_sessions++;
      if (session.status === 'completed') s.completed_sessions++;
      s.total_score += session.total_score || 0;
      s.total_rounds += session.current_round || 0;
      s.total_correct += session.correct_answers || 0;
      s.high_score = Math.max(s.high_score, session.total_score || 0);
      s.max_streak = Math.max(s.max_streak, session.best_streak || 0);
    }

    // Calculate averages
    const stats = Object.values(statsByType).map((s: any) => ({
      game_type: s.game_type,
      total_sessions: s.total_sessions,
      completed_sessions: s.completed_sessions,
      avg_score: s.total_sessions > 0 ? Math.round(s.total_score / s.total_sessions) : 0,
      avg_accuracy: s.total_rounds > 0 ? Math.round((s.total_correct / s.total_rounds) * 100) : 0,
      high_score: s.high_score,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch game stats:', error);
    return NextResponse.json({ stats: [] });
  }
}
