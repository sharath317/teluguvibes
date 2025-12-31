/**
 * Challenges Landing Page
 *
 * Features:
 * - Weekly challenge
 * - Daily trivia
 * - Leaderboard
 * - User progress
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Trophy, Calendar, Clock, Users, Zap, Star, ChevronRight } from 'lucide-react';
import { getActiveChallenges, getWeeklyChallenge } from '@/lib/challenges';

export const revalidate = 300; // 5 minutes

export const metadata = {
  title: 'Challenges | TeluguVibes',
  description: 'Test your Telugu cinema knowledge with weekly challenges and daily trivia!',
};

export default async function ChallengesPage() {
  const [challenges, weeklyChallenge] = await Promise.all([
    getActiveChallenges(),
    getWeeklyChallenge(),
  ]);

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900/40 via-[#0a0a0a] to-orange-900/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1 mb-4">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">Fan Challenges</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              తెలుగు సినిమా <span className="text-yellow-400">Challenges</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8">
              మీ తెలుగు సినిమా జ్ఞానాన్ని పరీక్షించండి. వారపు challenges లో పాల్గొని, badges గెలవండి!
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Weekly Challenge */}
            {weeklyChallenge && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  ఈ వారపు Challenge
                </h2>
                <WeeklyChallengeCard challenge={weeklyChallenge} />
              </section>
            )}

            {/* All Active Challenges */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Active Challenges
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {challenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
                {challenges.length === 0 && (
                  <div className="col-span-2 text-center py-12 bg-[#141414] rounded-xl border border-[#262626]">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">ప్రస్తుతం ఏ challenges లేవు</p>
                    <p className="text-gray-500 text-sm">త్వరలో కొత్త challenges వస్తాయి!</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* User Progress */}
            <Suspense fallback={<ProgressSkeleton />}>
              <UserProgressCard />
            </Suspense>

            {/* Leaderboard */}
            {weeklyChallenge && (
              <Suspense fallback={<LeaderboardSkeleton />}>
                <LeaderboardCard challengeId={weeklyChallenge.id} />
              </Suspense>
            )}

            {/* How to Play */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                ఎలా ఆడాలి?
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs flex-shrink-0">1</span>
                  Challenge select చేసి Start నొక్కండి
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs flex-shrink-0">2</span>
                  ప్రతి question కి సరైన answer select చేయండి
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs flex-shrink-0">3</span>
                  Streak maintain చేసి bonus points గెలవండి
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs flex-shrink-0">4</span>
                  Results share చేసి friends ని challenge చేయండి
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// Weekly Challenge Card (Featured)
function WeeklyChallengeCard({ challenge }: { challenge: Awaited<ReturnType<typeof getWeeklyChallenge>> }) {
  if (!challenge) return null;

  const endDate = new Date(challenge.end_date);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block bg-gradient-to-br from-yellow-500/10 via-[#141414] to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-medium text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
            {challenge.difficulty.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm text-orange-400">{daysLeft} days left</span>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
        {challenge.title_te}
      </h3>
      <p className="text-gray-400 mb-4">{challenge.description_te}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {challenge.questions_count} questions
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {challenge.points_per_correct * challenge.questions_count} max points
          </span>
        </div>
        <span className="text-yellow-400 group-hover:translate-x-1 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </span>
      </div>
    </Link>
  );
}

// Regular Challenge Card
function ChallengeCard({ challenge }: { challenge: Awaited<ReturnType<typeof getActiveChallenges>>[0] }) {
  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    hard: 'bg-red-500/20 text-red-400',
  };

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-[#404040] transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${difficultyColors[challenge.difficulty]}`}>
          {challenge.difficulty.toUpperCase()}
        </span>
      </div>

      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
        {challenge.title_te}
      </h3>
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{challenge.description_te}</p>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {challenge.questions_count} Qs
        </span>
        <span className="flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          {challenge.max_attempts} attempts
        </span>
      </div>
    </Link>
  );
}

// User Progress Card (Client Component would be better, but keeping simple)
function UserProgressCard() {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        మీ Progress
      </h3>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-400">0</div>
          <div className="text-xs text-gray-500">Challenges</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-400">0</div>
          <div className="text-xs text-gray-500">Points</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">0</div>
          <div className="text-xs text-gray-500">Best Streak</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">0</div>
          <div className="text-xs text-gray-500">Badges</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center mt-4">
        * Progress browser లో save అవుతుంది
      </p>
    </div>
  );
}

// Leaderboard Card
async function LeaderboardCard({ challengeId }: { challengeId: string }) {
  const { getLeaderboard } = await import('@/lib/challenges');
  const leaderboard = await getLeaderboard(challengeId, 5);

  if (leaderboard.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Leaderboard
        </h3>
        <p className="text-center text-gray-500 text-sm py-4">
          ఇంకా ఎవరూ complete చేయలేదు
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Leaderboard
      </h3>
      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.user_name}
            className="flex items-center gap-3 p-2 rounded-lg bg-[#0a0a0a]"
          >
            <span className={`text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
              {entry.avatar_emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {entry.user_name}
              </div>
              <div className="text-xs text-gray-500">
                Streak: {entry.streak}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-yellow-400">
                {entry.score}
              </div>
              <div className="text-xs text-gray-500">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeletons
function ProgressSkeleton() {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 animate-pulse">
      <div className="h-6 w-32 bg-[#262626] rounded mb-4" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-[#0a0a0a] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 animate-pulse">
      <div className="h-6 w-32 bg-[#262626] rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-[#0a0a0a] rounded-lg" />
        ))}
      </div>
    </div>
  );
}



