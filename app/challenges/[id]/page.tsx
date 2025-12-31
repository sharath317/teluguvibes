'use client';

/**
 * Individual Challenge Play Page
 *
 * Features:
 * - Quiz gameplay
 * - Score tracking
 * - Streak bonus
 * - Shareable results
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Trophy, Clock, Star, ChevronRight, Check, X,
  Share2, ArrowLeft, Zap, Award, Loader2
} from 'lucide-react';
import { getAnonymousUserId, getUserProgress, updateUserProgress } from '@/lib/challenges';

interface Question {
  id: string;
  question: string;
  question_te: string;
  options: string[];
  hint?: string;
  image_url?: string;
  points: number;
}

interface Challenge {
  id: string;
  title: string;
  title_te: string;
  description_te: string;
  difficulty: string;
  questions_count: number;
  points_per_correct: number;
  bonus_for_streak: number;
}

interface GameState {
  status: 'loading' | 'ready' | 'playing' | 'answered' | 'complete';
  currentQuestionIndex: number;
  score: number;
  streak: number;
  maxStreak: number;
  answers: { questionId: string; correct: boolean; points: number }[];
  lastAnswerCorrect?: boolean;
  lastAnswerPoints?: number;
  timeLeft: number;
}

export default function ChallengePlayPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>({
    status: 'loading',
    currentQuestionIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    answers: [],
    timeLeft: 30,
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shareResult, setShareResult] = useState<{ text: string; url: string } | null>(null);

  // Load challenge and questions
  useEffect(() => {
    async function loadChallenge() {
      try {
        // Get user ID
        const uid = getAnonymousUserId();
        setUserId(uid);

        // Fetch challenge
        const challengeRes = await fetch(`/api/challenges?id=${challengeId}`);
        const challengeData = await challengeRes.json();

        if (challengeData.challenges?.length > 0) {
          setChallenge(challengeData.challenges.find((c: Challenge) => c.id === challengeId) || null);
        }

        // Fetch questions
        const questionsRes = await fetch(`/api/challenges?action=questions&id=${challengeId}`);
        const questionsData = await questionsRes.json();

        if (questionsData.questions) {
          setQuestions(questionsData.questions);
        }

        setGameState((prev) => ({ ...prev, status: 'ready' }));
      } catch (error) {
        console.error('Failed to load challenge:', error);
      }
    }

    loadChallenge();
  }, [challengeId]);

  // Timer
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeLeft <= 1) {
          // Time's up - auto submit wrong answer
          handleAnswer(-1);
          return prev;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.status, gameState.currentQuestionIndex]);

  const startChallenge = async () => {
    try {
      await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          challengeId,
          userId,
        }),
      });

      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        timeLeft: 30,
      }));
    } catch (error) {
      console.error('Failed to start challenge:', error);
    }
  };

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (gameState.status !== 'playing') return;

    setSelectedOption(optionIndex);
    const currentQuestion = questions[gameState.currentQuestionIndex];

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          challengeId,
          userId,
          questionId: currentQuestion.id,
          selectedIndex: optionIndex,
          timeTakenMs: (30 - gameState.timeLeft) * 1000,
        }),
      });

      const result = await res.json();

      setGameState((prev) => ({
        ...prev,
        status: 'answered',
        score: prev.score + result.points,
        streak: result.streak,
        maxStreak: Math.max(prev.maxStreak, result.streak),
        answers: [
          ...prev.answers,
          {
            questionId: currentQuestion.id,
            correct: result.correct,
            points: result.points,
          },
        ],
        lastAnswerCorrect: result.correct,
        lastAnswerPoints: result.points,
      }));

      // Auto-advance after 1.5 seconds
      setTimeout(() => {
        nextQuestion();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  }, [gameState, questions, challengeId, userId]);

  const nextQuestion = () => {
    if (gameState.currentQuestionIndex + 1 >= questions.length) {
      // Challenge complete
      completeChallenge();
    } else {
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        timeLeft: 30,
      }));
      setSelectedOption(null);
    }
  };

  const completeChallenge = async () => {
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          challengeId,
          userId,
        }),
      });

      const result = await res.json();

      if (result) {
        setShareResult({
          text: result.share_text,
          url: result.share_url,
        });
      }

      // Update local progress
      const progress = getUserProgress();
      updateUserProgress({
        challenges_completed: progress.challenges_completed + 1,
        total_points: progress.total_points + gameState.score,
        best_streak: Math.max(progress.best_streak, gameState.maxStreak),
        last_played: new Date().toISOString(),
      });

      setGameState((prev) => ({
        ...prev,
        status: 'complete',
      }));
    } catch (error) {
      console.error('Failed to complete challenge:', error);
    }
  };

  const shareResults = async () => {
    if (!shareResult) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: challenge?.title || 'TeluguVibes Challenge',
          text: shareResult.text,
          url: shareResult.url,
        });
      } catch {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareResult.text}\n${shareResult.url}`);
        alert('Copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(`${shareResult.text}\n${shareResult.url}`);
      alert('Copied to clipboard!');
    }
  };

  // Loading state
  if (gameState.status === 'loading') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </main>
    );
  }

  // Ready state - show start screen
  if (gameState.status === 'ready') {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenges
          </Link>

          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-yellow-500/10 via-[#141414] to-orange-500/10 border border-yellow-500/30 rounded-2xl p-8">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-yellow-400" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">
                {challenge?.title_te || 'Challenge'}
              </h1>
              <p className="text-gray-400 mb-8">
                {challenge?.description_te}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#0a0a0a] rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">
                    {questions.length}
                  </div>
                  <div className="text-xs text-gray-500">Questions</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-400">30s</div>
                  <div className="text-xs text-gray-500">Per Question</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {(challenge?.points_per_correct || 10) * questions.length}
                  </div>
                  <div className="text-xs text-gray-500">Max Points</div>
                </div>
              </div>

              <button
                onClick={startChallenge}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity text-lg"
              >
                Start Challenge 🚀
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Complete state - show results
  if (gameState.status === 'complete') {
    const correctCount = gameState.answers.filter((a) => a.correct).length;
    const percentage = Math.round((correctCount / questions.length) * 100);
    const maxScore = questions.length * (challenge?.points_per_correct || 10);

    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-green-500/10 via-[#141414] to-yellow-500/10 border border-green-500/30 rounded-2xl p-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-green-400" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">
                Challenge Complete! 🎉
              </h1>
              <p className="text-gray-400 mb-8">
                {percentage >= 80
                  ? 'అద్భుతం! మీరు నిజంగా Telugu Cinema expert!'
                  : percentage >= 50
                  ? 'బాగుంది! కొంచెం practice తో మీరు expert అవుతారు!'
                  : 'పర్వాలేదు! మరోసారి try చేయండి!'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#0a0a0a] rounded-lg p-6">
                  <div className="text-4xl font-bold text-yellow-400">
                    {gameState.score}
                  </div>
                  <div className="text-sm text-gray-500">
                    / {maxScore} Points
                  </div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-6">
                  <div className="text-4xl font-bold text-orange-400">
                    {correctCount}
                  </div>
                  <div className="text-sm text-gray-500">
                    / {questions.length} Correct
                  </div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-6">
                  <div className="text-4xl font-bold text-green-400">
                    {percentage}%
                  </div>
                  <div className="text-sm text-gray-500">Accuracy</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-6">
                  <div className="text-4xl font-bold text-purple-400">
                    {gameState.maxStreak}
                  </div>
                  <div className="text-sm text-gray-500">Best Streak</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={shareResults}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share Results
                </button>
                <Link
                  href="/challenges"
                  className="flex-1 py-4 bg-[#262626] text-white font-bold rounded-xl hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                >
                  More Challenges
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Playing/Answered state
  const currentQuestion = questions[gameState.currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Question {gameState.currentQuestionIndex + 1}/{questions.length}
            </span>
            <div className="h-2 w-32 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{
                  width: `${((gameState.currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-orange-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">{gameState.streak}</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <Star className="w-4 h-4" />
              <span className="font-bold">{gameState.score}</span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={`w-5 h-5 ${gameState.timeLeft <= 10 ? 'text-red-400' : 'text-gray-400'}`} />
              <span className={`text-2xl font-bold ${gameState.timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                {gameState.timeLeft}s
              </span>
            </div>
            <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${gameState.timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${(gameState.timeLeft / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 mb-6">
            {currentQuestion.image_url && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={currentQuestion.image_url}
                  alt="Question"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-white text-center">
              {currentQuestion.question_te || currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isAnswered = gameState.status === 'answered';
              const isCorrect = isAnswered && gameState.lastAnswerCorrect && isSelected;
              const isWrong = isAnswered && !gameState.lastAnswerCorrect && isSelected;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                    isCorrect
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : isWrong
                      ? 'bg-red-500/20 border-2 border-red-500'
                      : isSelected
                      ? 'bg-yellow-500/20 border-2 border-yellow-500'
                      : 'bg-[#141414] border-2 border-[#262626] hover:border-[#404040]'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCorrect
                      ? 'bg-green-500 text-white'
                      : isWrong
                      ? 'bg-red-500 text-white'
                      : 'bg-[#262626] text-gray-400'
                  }`}>
                    {isCorrect ? <Check className="w-4 h-4" /> : isWrong ? <X className="w-4 h-4" /> : String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-white flex-1">{option}</span>
                  {isAnswered && isCorrect && (
                    <span className="text-green-400 text-sm font-bold">
                      +{gameState.lastAnswerPoints}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Streak indicator */}
          {gameState.streak >= 3 && gameState.status === 'playing' && (
            <div className="mt-6 text-center">
              <span className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm">
                <Zap className="w-4 h-4" />
                {gameState.streak} Streak! Bonus points active 🔥
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}



