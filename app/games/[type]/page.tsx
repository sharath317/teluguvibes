'use client';

/**
 * GAME PLAY PAGE - FIXED & ENHANCED
 *
 * Supports:
 * - Quiz mode (multiple choice questions)
 * - Enact mode (just timer + word for acting)
 * - Kids mode (animals, birds, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Lightbulb, Timer, Trophy, Check, X, RefreshCw, Play, SkipForward } from 'lucide-react';
import Link from 'next/link';

// Game type mapping
const GAME_CONFIG: Record<string, {
  title: string;
  titleTe: string;
  apiType: string;
  isEnactMode?: boolean;
  isKidsMode?: boolean;
  description?: string;
}> = {
  'dumb-charades': {
    title: 'Dumb Charades (Quiz)',
    titleTe: 'డంబ్ చరేడ్స్ (క్విజ్)',
    apiType: 'dumb_charades',
    description: 'Guess the movie from clues!'
  },
  'dumb-charades-enact': {
    title: 'Dumb Charades (Act)',
    titleTe: 'డంబ్ చరేడ్స్ (యాక్ట్)',
    apiType: 'dumb_charades_enact',
    isEnactMode: true,
    description: 'Act out the movie for others to guess!'
  },
  'kids-charades': {
    title: 'Kids Charades',
    titleTe: 'పిల్లల చరేడ్స్',
    apiType: 'kids_charades',
    isEnactMode: true,
    isKidsMode: true,
    description: 'Fun for kids! Animals, birds, actions...'
  },
  'dialogue-guess': {
    title: 'Dialogue Guess',
    titleTe: 'డైలాగ్ గెస్',
    apiType: 'dialogue_guess',
    description: 'Who said this iconic dialogue?'
  },
  'hit-or-flop': {
    title: 'Hit or Flop',
    titleTe: 'హిట్ లేదా ఫ్లాప్',
    apiType: 'hit_or_flop',
    description: 'Guess the box office verdict!'
  },
  'emoji-movie': {
    title: 'Emoji Movie',
    titleTe: 'ఎమోజీ మూవీ',
    apiType: 'emoji_movie',
    description: 'Guess the movie from emojis!'
  },
  'director-guess': {
    title: 'Director Quiz',
    titleTe: 'దర్శకుడి క్విజ్',
    apiType: 'director_guess',
    description: 'Who directed this movie?'
  },
  'year-guess': {
    title: 'Year Quiz',
    titleTe: 'సంవత్సరం క్విజ్',
    apiType: 'year_guess',
    description: 'When was this movie released?'
  },
};

interface GameRound {
  id: string;
  question: string;
  question_te?: string;
  question_emojis?: string[];
  question_image?: string;
  hints: { order: number; text: string; text_te?: string; points_deduction: number }[];
  options?: string[];
  correct_answer: string;
  explanation: string;
  explanation_te?: string;
  answer_image?: string;
  points: number;
  time_limit_seconds?: number;
  // Enact mode fields
  enact_word?: string;
  enact_word_te?: string;
  is_enact_mode?: boolean;
  is_kids_mode?: boolean;
  category?: string;
}

interface GameSession {
  id: string;
  current_round: number;
  total_rounds: number;
  total_score: number;
  streak: number;
  best_streak: number;
  status: string;
}

export default function GamePlayPage() {
  const params = useParams();
  const gameType = params.type as string;
  const config = GAME_CONFIG[gameType];

  // State
  const [session, setSession] = useState<GameSession | null>(null);
  const [round, setRound] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameComplete, setGameComplete] = useState(false);

  // Enact mode state
  const [enactStarted, setEnactStarted] = useState(false);
  const [showWord, setShowWord] = useState(false);

  // Check if this is enact mode
  const isEnactMode = config?.isEnactMode || round?.is_enact_mode;

  // Start game
  const startGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGameComplete(false);
    setEnactStarted(false);
    setShowWord(false);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          gameType: config?.apiType || 'dumb_charades',
          totalRounds: isEnactMode ? 20 : 10, // More rounds for enact mode
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setSession(data.session);
      setRound(data.round);
      setTimeLeft(data.round?.time_limit_seconds || (isEnactMode ? 60 : 30));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }, [config, isEnactMode]);

  // Get next round
  const getNextRound = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setSelectedAnswer(null);
    setHintsRevealed(0);
    setIsAnswered(false);
    setEnactStarted(false);
    setShowWord(false);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next_round',
          sessionId: session.id,
        }),
      });

      const data = await response.json();

      // Check if game is complete
      if (!data.round || data.gameComplete) {
        // Update session from server before completing
        if (data.session) {
          setSession(data.session);
        }
        setGameComplete(true);
        return;
      }

      setRound(data.round);
      setTimeLeft(data.round.time_limit_seconds || (isEnactMode ? 60 : 30));

      // Use session from API response (it's already updated in DB)
      if (data.session) {
        setSession(data.session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get next round');
    } finally {
      setLoading(false);
    }
  }, [session, isEnactMode]);

  // Submit answer (for quiz mode)
  const submitAnswer = useCallback(async (answer: string) => {
    if (!session || !round || isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          sessionId: session.id,
          roundId: round.id,
          answer,
          hintsUsed: hintsRevealed,
          timeTaken: (round.time_limit_seconds || 30) - timeLeft,
        }),
      });

      const data = await response.json();

      setIsCorrect(data.isCorrect);
      setPointsEarned(data.result?.points_earned || 0);

      if (data.session) {
        setSession(data.session);
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  }, [session, round, isAnswered, hintsRevealed, timeLeft]);

  // Reveal hint
  const revealHint = () => {
    if (!round || hintsRevealed >= round.hints.length) return;
    setHintsRevealed(prev => prev + 1);
  };

  // Timer effect
  useEffect(() => {
    if (!round || isAnswered) return;

    // For enact mode, only start timer after user starts
    if (isEnactMode && !enactStarted) return;

    if (timeLeft <= 0) {
      if (!isEnactMode) {
        submitAnswer('');
      } else {
        // In enact mode, just show the answer
        setIsAnswered(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [round, isAnswered, timeLeft, submitAnswer, isEnactMode, enactStarted]);

  // Start game on mount
  useEffect(() => {
    if (config) {
      startGame();
    }
  }, [config, startGame]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Game Not Found</h1>
          <Link href="/games" className="btn btn-primary">Back to Games</Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !round) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading game...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={startGame} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  // Game complete
  if (gameComplete && session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="card p-8 max-w-md w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isEnactMode ? 'Great Session! 🎭' : 'Game Complete! 🎉'}
          </h1>

          {!isEnactMode && (
            <p className="text-4xl font-bold text-orange-400 mb-4">
              {session.total_score} points
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-400">
                {isEnactMode ? 'Words Acted' : 'Best Streak'}
              </p>
              <p className="text-xl font-bold text-white">
                {isEnactMode ? session.current_round : `🔥 ${session.best_streak}`}
              </p>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-400">Rounds</p>
              <p className="text-xl font-bold text-white">{session.current_round}/{session.total_rounds}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={startGame} className="btn btn-primary flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
            <Link href="/games" className="btn btn-secondary">
              ← Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ENACT MODE UI
  // ============================================================
  if (isEnactMode && round) {
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/games" className="flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="text-center">
              <h1 className="font-bold text-white">{config.title}</h1>
              <p className="text-xs text-orange-400">{config.titleTe}</p>
            </div>

            <div className="w-10" />
          </div>
        </div>

        {/* Progress */}
        {session && (
          <div className="max-w-2xl mx-auto px-4 py-2 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Word {session.current_round} of {session.total_rounds}
            {round.category && (
              <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                {round.category}
              </span>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Before starting - show ready button */}
          {!enactStarted && !isAnswered && (
            <div className="text-center">
              <div className="card p-8 mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
                <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  🎭 Ready to Act?
                </h2>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Press the button below to reveal the word.
                  <br />
                  You&apos;ll have <strong className="text-orange-400">{round.time_limit_seconds || 60} seconds</strong> to act it out!
                </p>
                <button
                  onClick={() => {
                    setEnactStarted(true);
                    setShowWord(true);
                    setTimeLeft(round.time_limit_seconds || 60);
                  }}
                  className="btn btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
                >
                  <Play className="w-6 h-6" />
                  Show Word & Start Timer
                </button>
              </div>

              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                💡 Tip: Only YOU should see the screen. Others will guess!
              </p>
            </div>
          )}

          {/* Word reveal with timer */}
          {enactStarted && showWord && !isAnswered && (
            <div className="text-center">
              {/* Timer */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-white'
              }`}>
                <Timer className="w-5 h-5" />
                <span className="text-3xl font-mono font-bold">{timeLeft}s</span>
              </div>

              {/* The Word */}
              <div className="card p-8 mb-6 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  🎭 ACT THIS OUT:
                </p>
                <h1 className="text-5xl md:text-6xl font-bold mb-4 text-orange-400">
                  {round.enact_word || round.correct_answer}
                </h1>
                {round.enact_word_te && (
                  <p className="text-2xl" style={{ color: 'var(--text-primary)' }}>
                    {round.enact_word_te}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setIsAnswered(true)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  They Got It!
                </button>
                <button
                  onClick={() => setIsAnswered(true)}
                  className="btn btn-secondary flex items-center gap-2 border-red-500/30 text-red-400"
                >
                  <X className="w-5 h-5" />
                  Give Up
                </button>
              </div>
            </div>
          )}

          {/* After round ends */}
          {isAnswered && (
            <div className="text-center">
              <div className="card p-8 mb-6">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  The answer was:
                </p>
                <h2 className="text-4xl font-bold mb-4 text-orange-400">
                  {round.enact_word || round.correct_answer}
                </h2>
                {round.enact_word_te && (
                  <p className="text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
                    {round.enact_word_te}
                  </p>
                )}
                {round.answer_image && (
                  <img
                    src={round.answer_image}
                    alt={round.enact_word || round.correct_answer}
                    className="w-48 h-auto mx-auto rounded-lg mt-4"
                  />
                )}
              </div>

              <button
                onClick={getNextRound}
                className="btn btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
              >
                <SkipForward className="w-5 h-5" />
                {session && session.current_round >= session.total_rounds
                  ? 'Finish Game'
                  : 'Next Word'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // QUIZ MODE UI (Original)
  // ============================================================
  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="text-center">
            <h1 className="font-bold text-white">{config.title}</h1>
            <p className="text-xs text-orange-400">{config.titleTe}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`flex items-center gap-1 ${timeLeft <= 10 ? 'text-red-400' : 'text-gray-400'}`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono">{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Bar */}
      {session && (
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--text-secondary)' }}>
              Round {session.current_round}/{session.total_rounds}
            </span>
            {session.streak > 0 && (
              <span className="text-orange-400">🔥 {session.streak} streak</span>
            )}
          </div>
          <div className="font-bold text-orange-400">
            {session.total_score} pts
          </div>
        </div>
      )}

      {/* Question */}
      {round && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Emoji display */}
          {round.question_emojis && round.question_emojis.length > 0 && (
            <div className="text-center text-5xl mb-6 space-x-2">
              {round.question_emojis.map((emoji, i) => (
                <span key={i}>{emoji}</span>
              ))}
            </div>
          )}

          {/* Question image */}
          {round.question_image && (
            <div className="mb-6 flex justify-center">
              <img
                src={round.question_image}
                alt="Question"
                className="max-w-full h-48 object-contain rounded-lg"
              />
            </div>
          )}

          {/* Question text */}
          <div className="card p-6 mb-6">
            <p className="text-lg text-center whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
              {round.question_te || round.question}
            </p>
            {round.question_te && round.question !== round.question_te && (
              <p className="text-sm text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                {round.question}
              </p>
            )}
          </div>

          {/* Hints */}
          {round.hints && round.hints.length > 0 && hintsRevealed > 0 && (
            <div className="mb-4 space-y-2">
              {round.hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    💡 {hint.text_te || hint.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Hint button */}
          {!isAnswered && round.hints && round.hints.length > hintsRevealed && (
            <div className="text-center mb-6">
              <button
                onClick={revealHint}
                className="btn btn-secondary text-sm flex items-center gap-2 mx-auto"
              >
                <Lightbulb className="w-4 h-4" />
                Show Hint ({hintsRevealed + 1}/{round.hints.length})
                <span className="text-xs text-gray-400">
                  (-{round.hints[hintsRevealed]?.points_deduction || 20}%)
                </span>
              </button>
            </div>
          )}

          {/* Options */}
          {round.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {round.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = round.correct_answer.toLowerCase().trim() === option.toLowerCase().trim();

                let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all ';

                if (isAnswered) {
                  if (isCorrectOption) {
                    buttonClass += 'border-green-500 bg-green-500/20 text-green-300';
                  } else if (isSelected && !isCorrect) {
                    buttonClass += 'border-red-500 bg-red-500/20 text-red-300';
                  } else {
                    buttonClass += 'border-gray-700 bg-gray-800/50 text-gray-500';
                  }
                } else {
                  buttonClass += 'border-gray-700 bg-gray-800/50 hover:border-orange-500 hover:bg-orange-500/10 text-white cursor-pointer';
                }

                return (
                  <button
                    key={i}
                    onClick={() => !isAnswered && submitAnswer(option)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {isAnswered && isCorrectOption && <Check className="w-5 h-5 text-green-400" />}
                      {isAnswered && isSelected && !isCorrect && <X className="w-5 h-5 text-red-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Result */}
          {isAnswered && (
            <div className={`card p-6 mb-6 ${isCorrect ? 'border-green-500/50' : 'border-red-500/50'}`}>
              <div className="text-center mb-4">
                {isCorrect ? (
                  <div className="text-green-400">
                    <Check className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xl font-bold">Correct! +{pointsEarned} pts</p>
                  </div>
                ) : (
                  <div className="text-red-400">
                    <X className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xl font-bold">Wrong!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Correct answer: <span className="text-green-400">{round.correct_answer}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Explanation */}
              {(round.explanation_te || round.explanation) && (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  {round.explanation_te || round.explanation}
                </p>
              )}

              {/* Answer image */}
              {round.answer_image && (
                <div className="mt-4 flex justify-center">
                  <img
                    src={round.answer_image}
                    alt="Answer"
                    className="max-w-full h-40 object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <div className="text-center">
              <button
                onClick={getNextRound}
                className="btn btn-primary"
              >
                {session && session.current_round >= session.total_rounds
                  ? 'See Results'
                  : 'Next Question →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
