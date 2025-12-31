/**
 * GAMES API
 *
 * Handles game sessions and rounds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGameEngine } from '@/lib/games/game-engine';
import type { GameType } from '@/lib/games/types';

const engine = getGameEngine();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, gameType, sessionId, roundId, answer, hintsUsed, timeTaken, totalRounds } = body;

    switch (action) {
      case 'start': {
        const session = await engine.startSession(
          gameType as GameType,
          totalRounds || 10
        );

        // Generate first round
        const firstRound = await engine.getNextRound(session);

        // Update session to show round 1 (not 0)
        const updatedSession = { ...session, current_round: 1 };

        // Update in DB
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_sessions?id=eq.${session.id}`, {
          method: 'PATCH',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ current_round: 1 }),
        });

        return NextResponse.json({ session: updatedSession, round: firstRound });
      }

      case 'next_round': {
        // Get session from DB
        const { data: session } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_sessions?id=eq.${sessionId}`, {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }).then(r => r.json());

        if (!session?.[0]) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const currentSession = session[0];

        // Check if game is complete
        if (currentSession.current_round >= currentSession.total_rounds) {
          return NextResponse.json({ round: null, gameComplete: true, session: currentSession });
        }

        // Update the session's current_round in DB BEFORE generating the new round
        // This is important for enact mode where submitAnswer isn't called
        const newRoundNumber = currentSession.current_round + 1;
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_sessions?id=eq.${sessionId}`, {
          method: 'PATCH',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            current_round: newRoundNumber,
            last_activity: new Date().toISOString(),
          }),
        });

        // Now generate the next round
        const updatedSession = { ...currentSession, current_round: newRoundNumber };
        const round = await engine.getNextRound(updatedSession);

        return NextResponse.json({ round, session: updatedSession });
      }

      case 'submit': {
        const { data: sessionData } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_sessions?id=eq.${sessionId}`, {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }).then(r => r.json());

        if (!sessionData?.[0]) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const result = await engine.submitAnswer(
          sessionData[0],
          roundId,
          answer,
          hintsUsed || 0,
          timeTaken || 0
        );

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Game error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameType = searchParams.get('type') as GameType;
  const difficulty = (searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard' | 'legend';

  try {
    // Get a single round for preview
    const round = await engine.generateRound(
      gameType || 'dumb_charades',
      difficulty,
      []
    );

    return NextResponse.json({ round });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate round' },
      { status: 500 }
    );
  }
}
