/**
 * TELUGUVIBES GAMES - HOME PAGE
 *
 * Interactive Telugu cinema games.
 * Focus on nostalgia, fun, and cultural respect.
 */

import Link from 'next/link';
import { Gamepad2, Film, MessageSquareQuote, Trophy, Sparkles, Clapperboard } from 'lucide-react';

const GAME_TYPES = [
  // PARTY GAMES (for groups)
  {
    id: 'dumb-charades-enact',
    title: 'Dumb Charades (Act)',
    title_te: 'డంబ్ చరేడ్స్ (యాక్ట్)',
    description: '🎭 Act out movies for your friends to guess!',
    icon: Film,
    color: 'from-pink-500 to-rose-500',
    difficulty: 'Party Game',
    isParty: true,
  },
  {
    id: 'kids-charades',
    title: 'Kids Charades',
    title_te: 'పిల్లల చరేడ్స్',
    description: '🐘 Animals, birds, actions - fun for kids!',
    icon: Sparkles,
    color: 'from-emerald-400 to-teal-500',
    difficulty: 'Kids Friendly',
    isKids: true,
  },
  // QUIZ GAMES (individual)
  {
    id: 'dumb-charades',
    title: 'Movie Quiz',
    title_te: 'మూవీ క్విజ్',
    description: 'Guess the movie from clever clues',
    icon: Film,
    color: 'from-orange-500 to-red-500',
    difficulty: 'All Levels',
  },
  {
    id: 'dialogue-guess',
    title: 'Dialogue Guess',
    title_te: 'డైలాగ్ గెస్',
    description: 'Who said this iconic line?',
    icon: MessageSquareQuote,
    color: 'from-purple-500 to-pink-500',
    difficulty: 'Medium',
  },
  {
    id: 'hit-or-flop',
    title: 'Hit or Flop',
    title_te: 'హిట్ లేదా ఫ్లాప్',
    description: 'Guess the box office verdict',
    icon: Trophy,
    color: 'from-green-500 to-emerald-500',
    difficulty: 'All Levels',
  },
  {
    id: 'emoji-movie',
    title: 'Emoji Movie',
    title_te: 'ఎమోజీ మూవీ',
    description: 'Guess from emoji clues 🎬',
    icon: Sparkles,
    color: 'from-yellow-500 to-orange-500',
    difficulty: 'Easy',
  },
  {
    id: 'director-guess',
    title: 'Director Quiz',
    title_te: 'దర్శకుడి క్విజ్',
    description: 'Who directed this masterpiece?',
    icon: Clapperboard,
    color: 'from-blue-500 to-cyan-500',
    difficulty: 'Hard',
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero */}
      <div className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-purple-600/20" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-orange-500/20 px-4 py-2 rounded-full mb-6">
            <Gamepad2 className="w-5 h-5 text-orange-400" />
            <span className="text-orange-300 font-medium">Interactive Games</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            తెలుగు సినిమా గేమ్స్
          </h1>
          <p className="text-xl md:text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Telugu Cinema Games
          </p>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Test your knowledge of Telugu movies, iconic dialogues, and legendary stars.
            From classics to modern blockbusters!
          </p>
        </div>
      </div>

      {/* Game Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAME_TYPES.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group block"
              >
                <div className="card h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-transparent hover:border-orange-500/30">
                  {/* Gradient header */}
                  <div className={`h-24 bg-gradient-to-r ${game.color} rounded-t-xl flex items-center justify-center`}>
                    <Icon className="w-12 h-12 text-white opacity-90" />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {game.title}
                        </h3>
                        <p className="text-sm text-orange-400">{game.title_te}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                        {game.difficulty}
                      </span>
                    </div>

                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      {game.description}
                    </p>

                    <div className="flex items-center gap-2 text-orange-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>Play Now</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 card p-6 text-center">
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            🎬 About Telugu Cinema Games
          </h2>
          <p className="max-w-2xl mx-auto mb-4" style={{ color: 'var(--text-secondary)' }}>
            Relive the nostalgia of Telugu cinema through fun, interactive games.
            All questions are based on verified movie data. Box office verdicts are
            estimates based on available information.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
              ✅ Family Friendly
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
              📱 Mobile Optimized
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">
              🏆 Track Your Score
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
