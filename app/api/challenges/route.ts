/**
 * Challenges API
 *
 * Endpoints:
 * GET - List active challenges
 * POST - Start or submit challenge
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveChallenges,
  getWeeklyChallenge,
  getChallengeQuestions,
  startChallenge,
  submitAnswer,
  completeChallenge,
  getLeaderboard,
} from '@/lib/challenges';

export const revalidate = 60; // Cache for 1 minute

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const challengeId = searchParams.get('id');

  try {
    switch (action) {
      case 'weekly':
        const weekly = await getWeeklyChallenge();
        return NextResponse.json({ challenge: weekly });

      case 'questions':
        if (!challengeId) {
          return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 });
        }
        const questions = await getChallengeQuestions(challengeId);
        // Remove correct answers from response
        const safeQuestions = questions.map((q) => ({
          id: q.id,
          question: q.question,
          question_te: q.question_te,
          options: q.options,
          hint: q.hint,
          image_url: q.image_url,
          points: q.points,
        }));
        return NextResponse.json({ questions: safeQuestions });

      case 'leaderboard':
        if (!challengeId) {
          return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 });
        }
        const leaderboard = await getLeaderboard(challengeId);
        return NextResponse.json({ leaderboard });

      default:
        const challenges = await getActiveChallenges();
        return NextResponse.json({ challenges });
    }
  } catch (error) {
    console.error('Challenges API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, challengeId, userId, questionId, selectedIndex, timeTakenMs } = body;

    switch (action) {
      case 'start':
        if (!challengeId || !userId) {
          return NextResponse.json(
            { error: 'Challenge ID and User ID required' },
            { status: 400 }
          );
        }
        const startResult = await startChallenge(challengeId, userId);
        return NextResponse.json(startResult);

      case 'answer':
        if (!challengeId || !userId || !questionId || selectedIndex === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }
        const answerResult = await submitAnswer(
          challengeId,
          userId,
          questionId,
          selectedIndex,
          timeTakenMs || 0
        );
        return NextResponse.json(answerResult);

      case 'complete':
        if (!challengeId || !userId) {
          return NextResponse.json(
            { error: 'Challenge ID and User ID required' },
            { status: 400 }
          );
        }
        const completeResult = await completeChallenge(challengeId, userId);
        return NextResponse.json(completeResult);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Challenges API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}








