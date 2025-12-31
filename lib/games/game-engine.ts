/**
 * TELUGUVIBES GAME ENGINE - FIXED & ENHANCED
 *
 * Core engine for interactive Telugu cinema games.
 *
 * FIXED:
 * - Rounds now stored in DB for answer verification
 * - Answer checking works correctly
 * - Added Dumb Charades "Enact Mode" (just timer + word)
 * - Added kids-friendly categories (animals, birds, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import type {
  GameType,
  GameRound,
  GameSession,
  GameRoundResult,
  Difficulty,
  GameHint,
  GameAdminConfig,
  Era,
} from './types';

// Internal movie record type
interface MovieRecord {
  id: string;
  title_en: string;
  title_te?: string;
  release_year: number;
  hero?: string;
  heroine?: string;
  director?: string;
  genres?: string[];
  verdict?: string;
  poster_url?: string;
  popularity_score?: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CONSTANTS
// ============================================================

const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
  legend: 500,
};

const HINT_DEDUCTION: Record<number, number> = {
  1: 20,
  2: 30,
  3: 40,
};

const DEFAULT_CONFIG: GameAdminConfig = {
  games_enabled: true,
  maintenance_mode: false,
  enabled_games: ['dumb_charades', 'dumb_charades_enact', 'dialogue_guess', 'hit_or_flop', 'emoji_movie', 'kids_charades'],
  excluded_movies: [],
  excluded_celebrities: [],
  excluded_dialogues: [],
  default_difficulty: 'medium',
  adaptive_difficulty: true,
  difficulty_adjustment_threshold: 3,
  prefer_nostalgic: true,
  prefer_classics: true,
  require_verified_data: true,
  exclude_sensitive_content: true,
  show_ads_in_games: false,
};

// ============================================================
// KIDS-FRIENDLY CHARADES DATA
// ============================================================

const KIDS_CHARADES_WORDS = {
  animals: [
    { word_en: 'Elephant', word_te: 'ఏనుగు', emoji: '🐘', difficulty: 'easy' },
    { word_en: 'Lion', word_te: 'సింహం', emoji: '🦁', difficulty: 'easy' },
    { word_en: 'Monkey', word_te: 'కోతి', emoji: '🐒', difficulty: 'easy' },
    { word_en: 'Tiger', word_te: 'పులి', emoji: '🐅', difficulty: 'easy' },
    { word_en: 'Dog', word_te: 'కుక్క', emoji: '🐕', difficulty: 'easy' },
    { word_en: 'Cat', word_te: 'పిల్లి', emoji: '🐈', difficulty: 'easy' },
    { word_en: 'Cow', word_te: 'ఆవు', emoji: '🐄', difficulty: 'easy' },
    { word_en: 'Horse', word_te: 'గుర్రం', emoji: '🐎', difficulty: 'easy' },
    { word_en: 'Rabbit', word_te: 'కుందేలు', emoji: '🐇', difficulty: 'easy' },
    { word_en: 'Bear', word_te: 'ఎలుగుబంటి', emoji: '🐻', difficulty: 'medium' },
    { word_en: 'Fox', word_te: 'నక్క', emoji: '🦊', difficulty: 'medium' },
    { word_en: 'Deer', word_te: 'జింక', emoji: '🦌', difficulty: 'medium' },
    { word_en: 'Crocodile', word_te: 'మొసలి', emoji: '🐊', difficulty: 'medium' },
    { word_en: 'Kangaroo', word_te: 'కంగారూ', emoji: '🦘', difficulty: 'hard' },
    { word_en: 'Panda', word_te: 'పాండా', emoji: '🐼', difficulty: 'medium' },
  ],
  birds: [
    { word_en: 'Peacock', word_te: 'నెమలి', emoji: '🦚', difficulty: 'easy' },
    { word_en: 'Parrot', word_te: 'చిలుక', emoji: '🦜', difficulty: 'easy' },
    { word_en: 'Crow', word_te: 'కాకి', emoji: '🐦‍⬛', difficulty: 'easy' },
    { word_en: 'Sparrow', word_te: 'పిచ్చుక', emoji: '🐦', difficulty: 'easy' },
    { word_en: 'Eagle', word_te: 'గ్రద్ద', emoji: '🦅', difficulty: 'medium' },
    { word_en: 'Owl', word_te: 'గుడ్లగూబ', emoji: '🦉', difficulty: 'medium' },
    { word_en: 'Duck', word_te: 'బాతు', emoji: '🦆', difficulty: 'easy' },
    { word_en: 'Swan', word_te: 'హంస', emoji: '🦢', difficulty: 'medium' },
    { word_en: 'Penguin', word_te: 'పెంగ్విన్', emoji: '🐧', difficulty: 'easy' },
    { word_en: 'Flamingo', word_te: 'ఫ్లెమింగో', emoji: '🦩', difficulty: 'hard' },
  ],
  reptiles: [
    { word_en: 'Snake', word_te: 'పాము', emoji: '🐍', difficulty: 'easy' },
    { word_en: 'Turtle', word_te: 'తాబేలు', emoji: '🐢', difficulty: 'easy' },
    { word_en: 'Lizard', word_te: 'బల్లి', emoji: '🦎', difficulty: 'medium' },
    { word_en: 'Frog', word_te: 'కప్ప', emoji: '🐸', difficulty: 'easy' },
    { word_en: 'Chameleon', word_te: 'ఊసరవెల్లి', emoji: '🦎', difficulty: 'hard' },
  ],
  actions: [
    { word_en: 'Dancing', word_te: 'నాట్యం', emoji: '💃', difficulty: 'easy' },
    { word_en: 'Sleeping', word_te: 'నిద్ర', emoji: '😴', difficulty: 'easy' },
    { word_en: 'Eating', word_te: 'తినడం', emoji: '🍽️', difficulty: 'easy' },
    { word_en: 'Swimming', word_te: 'ఈత', emoji: '🏊', difficulty: 'easy' },
    { word_en: 'Running', word_te: 'పరుగు', emoji: '🏃', difficulty: 'easy' },
    { word_en: 'Crying', word_te: 'ఏడవడం', emoji: '😢', difficulty: 'easy' },
    { word_en: 'Laughing', word_te: 'నవ్వడం', emoji: '😂', difficulty: 'easy' },
    { word_en: 'Flying', word_te: 'ఎగరడం', emoji: '✈️', difficulty: 'medium' },
    { word_en: 'Cooking', word_te: 'వంట', emoji: '🍳', difficulty: 'medium' },
    { word_en: 'Reading', word_te: 'చదవడం', emoji: '📖', difficulty: 'medium' },
  ],
  professions: [
    { word_en: 'Doctor', word_te: 'డాక్టర్', emoji: '👨‍⚕️', difficulty: 'easy' },
    { word_en: 'Teacher', word_te: 'టీచర్', emoji: '👩‍🏫', difficulty: 'easy' },
    { word_en: 'Police', word_te: 'పోలీస్', emoji: '👮', difficulty: 'easy' },
    { word_en: 'Farmer', word_te: 'రైతు', emoji: '👨‍🌾', difficulty: 'easy' },
    { word_en: 'Chef', word_te: 'వంటవాడు', emoji: '👨‍🍳', difficulty: 'medium' },
    { word_en: 'Pilot', word_te: 'పైలట్', emoji: '👨‍✈️', difficulty: 'medium' },
    { word_en: 'Firefighter', word_te: 'అగ్నిమాపక సిబ్బంది', emoji: '🧑‍🚒', difficulty: 'medium' },
  ],
};

// ============================================================
// GAME ENGINE CLASS
// ============================================================

export class GameEngine {
  private config: GameAdminConfig;
  // In-memory round storage for quick access (also stored in DB)
  private activeRounds: Map<string, GameRound> = new Map();

  constructor(config?: Partial<GameAdminConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async startSession(
    gameType: GameType,
    totalRounds: number = 10,
    userId?: string
  ): Promise<GameSession> {
    const sessionId = this.generateId();
    const sessionToken = this.generateToken();

    const session: GameSession = {
      id: sessionId,
      user_id: userId,
      session_token: sessionToken,
      game_type: gameType,
      current_round: 0,
      total_rounds: totalRounds,
      rounds_completed: [],
      total_score: 0,
      streak: 0,
      best_streak: 0,
      hints_used: 0,
      current_difficulty: this.config.default_difficulty,
      correct_answers: 0,
      wrong_answers: 0,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      total_time_seconds: 0,
      status: 'in_progress',
    };

    await supabase.from('game_sessions').insert(session);
    return session;
  }

  async getNextRound(session: GameSession): Promise<GameRound | null> {
    if (session.current_round >= session.total_rounds) {
      return null;
    }

    const difficulty = this.config.adaptive_difficulty
      ? this.calculateAdaptiveDifficulty(session)
      : session.current_difficulty;

    const usedQuestionIds = session.rounds_completed.map(r => r.question_id);

    const round = await this.generateRound(
      session.game_type,
      difficulty,
      usedQuestionIds
    );

    // CRITICAL FIX: Store round in DB and memory for later verification
    round.session_id = session.id;
    await this.storeRound(round);

    return round;
  }

  /**
   * Store round for later answer verification
   */
  private async storeRound(round: GameRound): Promise<void> {
    // Store in memory for fast access
    this.activeRounds.set(round.id, round);

    // Also store in DB for persistence
    try {
      await supabase.from('game_rounds').upsert({
        id: round.id,
        session_id: round.session_id,
        game_type: round.game_type,
        difficulty: round.difficulty,
        question: round.question,
        question_te: round.question_te,
        correct_answer: round.correct_answer,
        correct_answer_te: round.correct_answer_te,
        options: round.options,
        hints: round.hints,
        explanation: round.explanation,
        explanation_te: round.explanation_te,
        // Enact mode fields
        enact_word: round.enact_word,
        enact_word_te: round.enact_word_te,
        is_enact_mode: round.is_enact_mode || false,
        is_kids_mode: round.is_kids_mode || false,
        category: round.category,
        answer_image: round.answer_image,
        time_limit_seconds: round.time_limit_seconds,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store round:', error);
    }
  }

  /**
   * Get stored round
   */
  private async getStoredRound(roundId: string): Promise<GameRound | null> {
    // Check memory first
    if (this.activeRounds.has(roundId)) {
      return this.activeRounds.get(roundId)!;
    }

    // Fallback to DB
    try {
      const { data, error } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('id', roundId)
        .single();

      if (error) {
        console.error('Failed to get round from DB:', error);
        return null;
      }

      if (data) {
        // Cache it for future use
        this.activeRounds.set(roundId, data as GameRound);
      }

      return data as GameRound | null;
    } catch (error) {
      console.error('Error getting stored round:', error);
      return null;
    }
  }

  async submitAnswer(
    session: GameSession,
    roundId: string,
    userAnswer: string,
    hintsUsed: number,
    timeTaken: number
  ): Promise<{
    session: GameSession;
    result: GameRoundResult;
    isCorrect: boolean;
    explanation: string;
  }> {
    // CRITICAL FIX: Get round from our storage, not just DB
    const round = await this.getStoredRound(roundId);

    if (!round) {
      console.error('Round not found:', roundId);
      return {
        session,
        result: {
          round_id: roundId,
          question_id: roundId,
          user_answer: userAnswer,
          is_correct: false,
          hints_used: hintsUsed,
          time_taken_seconds: timeTaken,
          points_earned: 0,
          completed_at: new Date().toISOString(),
        },
        isCorrect: false,
        explanation: 'Round data not found',
      };
    }

    // CRITICAL FIX: Proper answer comparison
    const isCorrect = this.checkAnswer(userAnswer, round.correct_answer);

    const basePoints = POINTS_BY_DIFFICULTY[session.current_difficulty];
    let points = isCorrect ? basePoints : 0;

    for (let i = 1; i <= hintsUsed; i++) {
      points -= Math.floor(basePoints * (HINT_DEDUCTION[i] || 0) / 100);
    }
    points = Math.max(0, points);

    const newStreak = isCorrect ? session.streak + 1 : 0;
    const bestStreak = Math.max(session.best_streak, newStreak);

    const result: GameRoundResult = {
      round_id: roundId,
      question_id: roundId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      hints_used: hintsUsed,
      time_taken_seconds: timeTaken,
      points_earned: points,
      completed_at: new Date().toISOString(),
    };

    const updatedSession: GameSession = {
      ...session,
      current_round: session.current_round + 1,
      rounds_completed: [...session.rounds_completed, result],
      total_score: session.total_score + points,
      streak: newStreak,
      best_streak: bestStreak,
      hints_used: session.hints_used + hintsUsed,
      correct_answers: session.correct_answers + (isCorrect ? 1 : 0),
      wrong_answers: session.wrong_answers + (isCorrect ? 0 : 1),
      last_activity: new Date().toISOString(),
      total_time_seconds: session.total_time_seconds + timeTaken,
      status: session.current_round + 1 >= session.total_rounds ? 'completed' : 'in_progress',
    };

    await supabase
      .from('game_sessions')
      .update(updatedSession)
      .eq('id', session.id);

    // Clean up round from memory
    this.activeRounds.delete(roundId);

    return {
      session: updatedSession,
      result,
      isCorrect,
      explanation: round.explanation || '',
    };
  }

  // ============================================================
  // ROUND GENERATION
  // ============================================================

  async generateRound(
    gameType: GameType,
    difficulty: Difficulty,
    excludeIds: string[] = []
  ): Promise<GameRound> {
    switch (gameType) {
      case 'dumb_charades':
        return this.generateDumbCharadesRound(difficulty, excludeIds);
      case 'dumb_charades_enact':
        return this.generateDumbCharadesEnactRound(difficulty);
      case 'kids_charades':
        return this.generateKidsCharadesRound(difficulty);
      case 'dialogue_guess':
        return this.generateDialogueGuessRound(difficulty, excludeIds);
      case 'hit_or_flop':
        return this.generateHitOrFlopRound(difficulty, excludeIds);
      case 'emoji_movie':
        return this.generateEmojiMovieRound(difficulty, excludeIds);
      case 'director_guess':
        return this.generateDirectorGuessRound(difficulty, excludeIds);
      case 'year_guess':
        return this.generateYearGuessRound(difficulty, excludeIds);
      default:
        return this.generateDumbCharadesRound(difficulty, excludeIds);
    }
  }

  // ============================================================
  // DUMB CHARADES - ENACT MODE (NEW!)
  // Just shows the word/movie - user acts it out
  // ============================================================

  private async generateDumbCharadesEnactRound(
    difficulty: Difficulty
  ): Promise<GameRound> {
    const movie = await this.getRandomMovie(difficulty, []);

    return {
      id: this.generateId(),
      game_type: 'dumb_charades_enact',
      difficulty,
      // Clear instruction
      question: '🎭 ACT THIS OUT!',
      question_te: '🎭 దీన్ని యాక్ట్ చేయండి!',

      // The word to enact - shown prominently
      enact_word: movie.title_en,
      enact_word_te: movie.title_te || movie.title_en,

      // No hints needed - it's just for acting
      hints: [],
      max_hints: 0,

      // Answer is not checked in enact mode
      correct_answer: movie.title_en,
      correct_answer_te: movie.title_te,
      answer_image: movie.poster_url,

      explanation: `Movie: "${movie.title_en}" (${movie.release_year})`,
      explanation_te: `సినిమా: "${movie.title_te || movie.title_en}" (${movie.release_year})`,

      // No options - it's not a guessing game for the actor
      options: undefined,
      is_multiple_choice: false,
      is_enact_mode: true,  // Flag for frontend

      source_movies: [movie.id],
      era: this.getEra(movie.release_year),
      tags: ['enact', 'charades', 'movie'],
      points: 0,  // No points in enact mode - it's just fun
      time_limit_seconds: difficulty === 'easy' ? 120 : difficulty === 'medium' ? 90 : 60,
    };
  }

  // ============================================================
  // KIDS CHARADES (NEW!)
  // Animals, birds, reptiles, actions, professions
  // ============================================================

  private generateKidsCharadesRound(difficulty: Difficulty): GameRound {
    const categories = Object.keys(KIDS_CHARADES_WORDS) as (keyof typeof KIDS_CHARADES_WORDS)[];
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryWords = KIDS_CHARADES_WORDS[selectedCategory];

    // Filter by difficulty
    const filteredWords = categoryWords.filter(w =>
      difficulty === 'easy' ? w.difficulty === 'easy' :
      difficulty === 'medium' ? ['easy', 'medium'].includes(w.difficulty) :
      true
    );

    const selected = filteredWords[Math.floor(Math.random() * filteredWords.length)] || categoryWords[0];

    return {
      id: this.generateId(),
      game_type: 'kids_charades',
      difficulty,

      question: `🎭 ACT THIS: ${selected.emoji}`,
      question_te: `🎭 దీన్ని యాక్ట్ చేయండి: ${selected.emoji}`,

      // The word to enact
      enact_word: selected.word_en,
      enact_word_te: selected.word_te,

      hints: [],
      max_hints: 0,

      correct_answer: selected.word_en,
      correct_answer_te: selected.word_te,

      explanation: `${selected.word_en} (${selected.word_te}) ${selected.emoji}`,

      options: undefined,
      is_multiple_choice: false,
      is_enact_mode: true,
      is_kids_mode: true,

      source_movies: [],
      era: undefined,
      category: selectedCategory,
      tags: ['kids', 'enact', selectedCategory],
      points: 0,
      time_limit_seconds: 60,
    };
  }

  // ============================================================
  // ORIGINAL DUMB CHARADES (GUESS MODE)
  // ============================================================

  private async generateDumbCharadesRound(
    difficulty: Difficulty,
    excludeIds: string[]
  ): Promise<GameRound> {
    const movie = await this.getRandomMovie(difficulty, excludeIds);

    const hints: GameHint[] = [
      {
        order: 1,
        text: `Released in ${movie.release_year}`,
        text_te: `${movie.release_year}లో విడుదల`,
        hint_type: 'year',
        points_deduction: 20,
      },
      {
        order: 2,
        text: `Genre: ${(movie.genres || ['Action']).slice(0, 2).join(', ')}`,
        text_te: `జానర్: ${(movie.genres || ['యాక్షన్']).slice(0, 2).join(', ')}`,
        hint_type: 'genre',
        points_deduction: 30,
      },
      {
        order: 3,
        text: `Hero: ${movie.hero || 'Popular star'}`,
        text_te: `హీరో: ${movie.hero || 'పాపులర్ స్టార్'}`,
        hint_type: 'cast',
        points_deduction: 40,
      },
    ];

    let question = '';
    let questionTe = '';

    if (difficulty === 'easy') {
      question = `This ${movie.hero || 'Telugu'} movie is a ${movie.verdict || 'popular'} film. Can you guess it?`;
      questionTe = `ఈ ${movie.hero || 'తెలుగు'} సినిమా ఒక ${movie.verdict || 'పాపులర్'} చిత్రం. ఊహించగలరా?`;
    } else if (difficulty === 'medium') {
      question = `A ${movie.release_year} movie directed by ${movie.director || 'a famous director'}. What is it?`;
      questionTe = `${movie.release_year}లో ${movie.director || 'ఒక ప్రసిద్ధ దర్శకుడు'} తీసిన సినిమా. ఏమిటి?`;
    } else {
      question = `This cult classic from the ${this.getDecade(movie.release_year)} became iconic. Name it!`;
      questionTe = `${this.getDecade(movie.release_year)}ల నుండి వచ్చిన ఈ కల్ట్ క్లాసిక్. పేరు చెప్పండి!`;
    }

    const options = await this.getMovieOptions(movie.title_en, difficulty);

    return {
      id: this.generateId(),
      game_type: 'dumb_charades',
      difficulty,
      question,
      question_te: questionTe,
      hints,
      max_hints: 3,
      correct_answer: movie.title_en,
      correct_answer_te: movie.title_te,
      answer_image: movie.poster_url,
      explanation: `"${movie.title_en}" (${movie.release_year}) was a ${movie.verdict || 'popular'} movie starring ${movie.hero || 'top stars'}.`,
      explanation_te: `"${movie.title_te || movie.title_en}" (${movie.release_year}) ${movie.hero || 'టాప్ స్టార్లు'} నటించిన ${movie.verdict || 'పాపులర్'} సినిమా.`,
      options,
      is_multiple_choice: true,
      source_movies: [movie.id],
      era: this.getEra(movie.release_year),
      tags: movie.genres || [],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: difficulty === 'legend' ? 15 : difficulty === 'hard' ? 20 : 30,
    };
  }

  private async generateDialogueGuessRound(
    difficulty: Difficulty,
    _excludeIds: string[]
  ): Promise<GameRound> {
    const dialogues = await this.getIconicDialogues(difficulty);
    const selected = dialogues[Math.floor(Math.random() * dialogues.length)] || {
      dialogue: 'నేను సాధారణ మనిషిని, సూపర్ హీరో కాదు',
      movie: 'Pokiri',
      actor: 'Mahesh Babu',
      year: 2006,
    };

    const hints: GameHint[] = [
      {
        order: 1,
        text: `From a ${this.getDecade(selected.year)} movie`,
        text_te: `${this.getDecade(selected.year)} సినిమా నుండి`,
        hint_type: 'year',
        points_deduction: 20,
      },
      {
        order: 2,
        text: `Movie: ${selected.movie}`,
        text_te: `సినిమా: ${selected.movie}`,
        hint_type: 'text',
        points_deduction: 40,
      },
    ];

    const options = await this.getActorOptions(selected.actor, difficulty);

    return {
      id: this.generateId(),
      game_type: 'dialogue_guess',
      difficulty,
      question: `Who said this iconic dialogue?\n\n"${selected.dialogue}"`,
      question_te: `ఈ ఐకానిక్ డైలాగ్ ఎవరు చెప్పారు?\n\n"${selected.dialogue}"`,
      hints,
      max_hints: 2,
      correct_answer: selected.actor,
      answer_image: undefined,
      explanation: `This dialogue is from "${selected.movie}" (${selected.year}), spoken by ${selected.actor}.`,
      explanation_te: `ఈ డైలాగ్ "${selected.movie}" (${selected.year}) సినిమా నుండి, ${selected.actor} చెప్పారు.`,
      options,
      is_multiple_choice: true,
      source_movies: [],
      era: this.getEra(selected.year),
      tags: ['dialogue', 'iconic'],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: 25,
    };
  }

  private async generateHitOrFlopRound(
    difficulty: Difficulty,
    excludeIds: string[]
  ): Promise<GameRound> {
    const movie = await this.getRandomMovie(difficulty, excludeIds);
    const verdictOptions = ['Blockbuster', 'Super Hit', 'Hit', 'Average', 'Flop'];

    // Normalize the correct answer to match options
    const normalizedVerdict = this.normalizeVerdict(movie.verdict);

    return {
      id: this.generateId(),
      game_type: 'hit_or_flop',
      difficulty,
      question: `What was the verdict of "${movie.title_en}" (${movie.release_year})?`,
      question_te: `"${movie.title_te || movie.title_en}" (${movie.release_year}) వెర్డిక్ట్ ఏమిటి?`,
      question_image: movie.poster_url,
      hints: [
        {
          order: 1,
          text: `Starring ${movie.hero || 'top stars'}`,
          text_te: `హీరో: ${movie.hero || 'టాప్ స్టార్లు'}`,
          hint_type: 'cast',
          points_deduction: 25,
        },
      ],
      max_hints: 1,
      correct_answer: normalizedVerdict,
      explanation: `"${movie.title_en}" was a ${normalizedVerdict} at the box office.`,
      explanation_te: `"${movie.title_te || movie.title_en}" బాక్స్ ఆఫీస్ లో ${normalizedVerdict}.`,
      options: verdictOptions,
      is_multiple_choice: true,
      source_movies: [movie.id],
      era: this.getEra(movie.release_year),
      tags: ['box_office'],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: 20,
    };
  }

  private async generateEmojiMovieRound(
    difficulty: Difficulty,
    _excludeIds: string[]
  ): Promise<GameRound> {
    const emojiMovies = [
      { emojis: ['🦁', '👑', '🌾'], movie: 'Simha', year: 2010 },
      { emojis: ['🏍️', '💥', '🔥'], movie: 'Pokiri', year: 2006 },
      { emojis: ['🦅', '⚔️', '👑'], movie: 'Baahubali', year: 2015 },
      { emojis: ['🌲', '💪', '🔥'], movie: 'Pushpa', year: 2021 },
      { emojis: ['🎭', '👨‍👩‍👧', '❤️'], movie: 'Bommarillu', year: 2006 },
      { emojis: ['🏠', '👨‍👩‍👧‍👦', '💕'], movie: 'Geetha Govindam', year: 2018 },
      { emojis: ['🎓', '💑', '🎵'], movie: 'Arya', year: 2004 },
      { emojis: ['👊', '⚖️', '🏛️'], movie: 'Temper', year: 2015 },
      { emojis: ['🚗', '💨', '🏁'], movie: 'Race Gurram', year: 2014 },
      { emojis: ['🦸', '⚡', '🎬'], movie: 'Magadheera', year: 2009 },
      { emojis: ['💔', '🎵', '🌧️'], movie: 'Arjun Reddy', year: 2017 },
      { emojis: ['🏏', '🇮🇳', '⭐'], movie: 'Jersey', year: 2019 },
    ];

    const selected = emojiMovies[Math.floor(Math.random() * emojiMovies.length)];
    const options = await this.getMovieOptions(selected.movie, difficulty);

    return {
      id: this.generateId(),
      game_type: 'emoji_movie',
      difficulty,
      question: 'Guess the movie from these emojis!',
      question_te: 'ఈ ఎమోజీల నుండి సినిమాను ఊహించండి!',
      question_emojis: selected.emojis,
      hints: [
        {
          order: 1,
          text: `Released in ${selected.year}`,
          text_te: `${selected.year}లో విడుదల`,
          hint_type: 'year',
          points_deduction: 30,
        },
      ],
      max_hints: 1,
      correct_answer: selected.movie,
      explanation: `The emojis represent "${selected.movie}" (${selected.year})!`,
      explanation_te: `ఎమోజీలు "${selected.movie}" (${selected.year}) సినిమాను సూచిస్తాయి!`,
      options,
      is_multiple_choice: true,
      source_movies: [],
      era: this.getEra(selected.year),
      tags: ['emoji', 'fun'],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: 30,
    };
  }

  private async generateDirectorGuessRound(
    difficulty: Difficulty,
    excludeIds: string[]
  ): Promise<GameRound> {
    const movie = await this.getRandomMovie(difficulty, excludeIds);
    const options = await this.getDirectorOptions(movie.director || 'Unknown', difficulty);

    return {
      id: this.generateId(),
      game_type: 'director_guess',
      difficulty,
      question: `Who directed "${movie.title_en}" (${movie.release_year})?`,
      question_te: `"${movie.title_te || movie.title_en}" (${movie.release_year}) దర్శకుడు ఎవరు?`,
      question_image: movie.poster_url,
      hints: [
        {
          order: 1,
          text: `This director is known for ${(movie.genres || ['popular']).join(', ')} movies`,
          text_te: `ఈ దర్శకుడు ${(movie.genres || ['పాపులర్']).join(', ')} సినిమాలకు ప్రసిద్ధి`,
          hint_type: 'genre',
          points_deduction: 30,
        },
      ],
      max_hints: 1,
      correct_answer: movie.director || 'Unknown',
      explanation: `"${movie.title_en}" was directed by ${movie.director}.`,
      explanation_te: `"${movie.title_te || movie.title_en}" దర్శకుడు ${movie.director}.`,
      options,
      is_multiple_choice: true,
      source_movies: [movie.id],
      era: this.getEra(movie.release_year),
      tags: ['director'],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: 25,
    };
  }

  private async generateYearGuessRound(
    difficulty: Difficulty,
    excludeIds: string[]
  ): Promise<GameRound> {
    const movie = await this.getRandomMovie(difficulty, excludeIds);
    const year = movie.release_year;

    const yearOptions = [year - 2, year - 1, year, year + 1, year + 2]
      .filter(y => y > 1930 && y <= new Date().getFullYear())
      .sort(() => Math.random() - 0.5)
      .slice(0, 4)
      .sort((a, b) => a - b)
      .map(String);

    if (!yearOptions.includes(String(year))) {
      yearOptions[Math.floor(Math.random() * yearOptions.length)] = String(year);
    }

    return {
      id: this.generateId(),
      game_type: 'year_guess',
      difficulty,
      question: `When was "${movie.title_en}" released?`,
      question_te: `"${movie.title_te || movie.title_en}" ఎప్పుడు విడుదలైంది?`,
      question_image: movie.poster_url,
      hints: [
        {
          order: 1,
          text: `Starring ${movie.hero || 'top stars'}`,
          text_te: `హీరో: ${movie.hero || 'టాప్ స్టార్లు'}`,
          hint_type: 'cast',
          points_deduction: 25,
        },
      ],
      max_hints: 1,
      correct_answer: String(year),
      explanation: `"${movie.title_en}" was released in ${year}.`,
      explanation_te: `"${movie.title_te || movie.title_en}" ${year}లో విడుదలైంది.`,
      options: yearOptions.sort((a, b) => parseInt(a) - parseInt(b)),
      is_multiple_choice: true,
      source_movies: [movie.id],
      era: this.getEra(movie.release_year),
      tags: ['year'],
      points: POINTS_BY_DIFFICULTY[difficulty],
      time_limit_seconds: 20,
    };
  }

  // ============================================================
  // DATA HELPERS
  // ============================================================

  private async getRandomMovie(
    difficulty: Difficulty,
    _excludeIds: string[]
  ): Promise<MovieRecord> {
    let query = supabase.from('movies').select('*');

    if (difficulty === 'easy') {
      query = query.gte('popularity_score', 70);
    } else if (difficulty === 'legend') {
      query = query.lte('release_year', 1990);
    }

    query = query.limit(50);

    const { data: movies } = await query;

    if (!movies || movies.length === 0) {
      return {
        id: 'fallback',
        title_en: 'Baahubali',
        title_te: 'బాహుబలి',
        release_year: 2015,
        hero: 'Prabhas',
        director: 'S.S. Rajamouli',
        genres: ['Action', 'Drama'],
        verdict: 'Blockbuster',
      };
    }

    return movies[Math.floor(Math.random() * movies.length)];
  }

  private async getMovieOptions(
    correctTitle: string,
    _difficulty: Difficulty
  ): Promise<string[]> {
    const { data: movies } = await supabase
      .from('movies')
      .select('title_en')
      .neq('title_en', correctTitle)
      .limit(20);

    const options = (movies || [])
      .map(m => m.title_en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    options.push(correctTitle);
    return options.sort(() => Math.random() - 0.5);
  }

  private async getActorOptions(
    correctActor: string,
    _difficulty: Difficulty
  ): Promise<string[]> {
    const { data: celebs } = await supabase
      .from('celebrities')
      .select('name_en')
      .or('primary_role.eq.actor,primary_role.eq.actress')
      .neq('name_en', correctActor)
      .limit(20);

    const options = (celebs || [])
      .map(c => c.name_en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    options.push(correctActor);
    return options.sort(() => Math.random() - 0.5);
  }

  private async getDirectorOptions(
    correctDirector: string,
    _difficulty: Difficulty
  ): Promise<string[]> {
    const { data: celebs } = await supabase
      .from('celebrities')
      .select('name_en')
      .eq('primary_role', 'director')
      .neq('name_en', correctDirector)
      .limit(20);

    const options = (celebs || [])
      .map(c => c.name_en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (correctDirector) options.push(correctDirector);
    return options.sort(() => Math.random() - 0.5);
  }

  private async getIconicDialogues(_difficulty: Difficulty): Promise<{ dialogue: string; movie: string; actor: string; year: number }[]> {
    return [
      { dialogue: 'నేను సాధారణ మనిషిని, సూపర్ హీరో కాదు', movie: 'Pokiri', actor: 'Mahesh Babu', year: 2006 },
      { dialogue: 'ఇది నా అల్లుడు... మహేష్ బాబు!', movie: 'Businessman', actor: 'Mahesh Babu', year: 2012 },
      { dialogue: 'నేను ట్రిగర్ లాగితే, గన్ మాట్లాడుతుంది', movie: 'Gabbar Singh', actor: 'Pawan Kalyan', year: 2012 },
      { dialogue: 'నా స్టైల్ వేరయ్య!', movie: 'Pokiri', actor: 'Mahesh Babu', year: 2006 },
      { dialogue: 'అసలు power ఎవరిది?', movie: 'Baahubali', actor: 'Prabhas', year: 2015 },
      { dialogue: 'తగ్గేదెలే!', movie: 'Pushpa', actor: 'Allu Arjun', year: 2021 },
      { dialogue: 'మన ఊరు బంగారం!', movie: 'Srimanthudu', actor: 'Mahesh Babu', year: 2015 },
      { dialogue: 'దూకుడు... గెలుపు!', movie: 'Dookudu', actor: 'Mahesh Babu', year: 2011 },
    ];
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer || !correctAnswer) return false;

    // Normalize for comparison - remove special chars, lowercase, trim
    const normalize = (s: string) => {
      return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, '') // Keep Telugu chars and alphanumerics
        .replace(/\s+/g, ' '); // Normalize whitespace
    };

    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);

    // Exact match
    if (normalizedUser === normalizedCorrect) return true;

    // Also check if user answer contains correct answer (for partial matches)
    if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
      return true;
    }

    // Debug logging
    console.log('[GameEngine] Answer check:', {
      userAnswer,
      correctAnswer,
      normalizedUser,
      normalizedCorrect,
      match: normalizedUser === normalizedCorrect
    });

    return false;
  }

  private normalizeVerdict(verdict?: string): string {
    if (!verdict) return 'Hit';
    const v = verdict.toLowerCase();
    if (v.includes('block')) return 'Blockbuster';
    if (v.includes('super')) return 'Super Hit';
    if (v.includes('hit')) return 'Hit';
    if (v.includes('average')) return 'Average';
    if (v.includes('flop')) return 'Flop';
    return 'Hit';
  }

  private calculateAdaptiveDifficulty(session: GameSession): Difficulty {
    const recentResults = session.rounds_completed.slice(-3);
    const recentCorrect = recentResults.filter(r => r.is_correct).length;

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'legend'];
    const currentIndex = difficulties.indexOf(session.current_difficulty);

    if (recentCorrect >= 3 && currentIndex < 3) {
      return difficulties[currentIndex + 1];
    } else if (recentCorrect === 0 && currentIndex > 0) {
      return difficulties[currentIndex - 1];
    }

    return session.current_difficulty;
  }

  private getEra(year: number): Era {
    if (year < 1970) return 'classic';
    if (year < 1990) return 'golden';
    if (year < 2005) return '90s';
    if (year < 2018) return 'modern';
    return 'current';
  }

  private getDecade(year: number): string {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
  }

  private generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

// ============================================================
// EXPORTS
// ============================================================

let engineInstance: GameEngine | null = null;

export function getGameEngine(config?: Partial<GameAdminConfig>): GameEngine {
  if (!engineInstance || config) {
    engineInstance = new GameEngine(config);
  }
  return engineInstance;
}
