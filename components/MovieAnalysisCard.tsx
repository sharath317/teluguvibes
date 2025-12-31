'use client';

/**
 * MOVIE ANALYSIS CARD
 *
 * Shows "Why This Movie Worked/Failed" analysis.
 * Evergreen content, generated once.
 */

import Link from 'next/link';

interface MovieAnalysis {
  movie_id: string;
  movie_title: string;
  release_date: string;
  verdict: string;
  recovery_percentage: number;
  what_worked_te: string;
  what_failed_te: string;
  audience_mismatch_te: string;
  one_line_verdict_te: string;
  success_factors: string[];
  failure_factors: string[];
}

interface MovieAnalysisCardProps {
  analysis: MovieAnalysis;
  posterUrl?: string;
  compact?: boolean;
}

export function MovieAnalysisCard({ analysis, posterUrl, compact = false }: MovieAnalysisCardProps) {
  const verdictConfig = {
    blockbuster: { emoji: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'బ్లాక్‌బస్టర్' },
    superhit: { emoji: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'సూపర్ హిట్' },
    hit: { emoji: '✅', color: 'text-green-400', bg: 'bg-green-500/20', label: 'హిట్' },
    average: { emoji: '😐', color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'యావరేజ్' },
    flop: { emoji: '📉', color: 'text-red-400', bg: 'bg-red-500/20', label: 'ఫ్లాప్' },
    disaster: { emoji: '💀', color: 'text-red-600', bg: 'bg-red-600/20', label: 'డిజాస్టర్' },
  };

  const config = verdictConfig[analysis.verdict as keyof typeof verdictConfig] || verdictConfig.average;

  if (compact) {
    return (
      <Link
        href={`/movie/${analysis.movie_id}/analysis`}
        className="card p-4 hover:border-orange-500/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={analysis.movie_title}
              className="w-12 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white group-hover:text-orange-400 truncate transition-colors">
              {analysis.movie_title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                {config.emoji} {config.label}
              </span>
              <span className="text-xs text-gray-500">
                {analysis.recovery_percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header with verdict */}
      <div className={`${config.bg} px-6 py-4 border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{analysis.movie_title}</h3>
            <p className="text-gray-400 text-sm">
              విడుదల: {new Date(analysis.release_date).toLocaleDateString('te-IN')}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-3xl ${config.color}`}>{config.emoji}</span>
            <p className={`font-bold ${config.color}`}>{config.label}</p>
            <p className="text-xs text-gray-500">{analysis.recovery_percentage.toFixed(0)}% రికవరీ</p>
          </div>
        </div>
      </div>

      {/* One-line verdict */}
      <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
        <p className="text-lg text-white italic">"{analysis.one_line_verdict_te}"</p>
      </div>

      {/* Analysis sections */}
      <div className="p-6 space-y-6">
        {/* What Worked */}
        {analysis.what_worked_te && (
          <div>
            <h4 className="flex items-center gap-2 font-bold text-green-400 mb-2">
              ✅ ఏం వర్క్ అయింది
            </h4>
            <p className="text-gray-300">{analysis.what_worked_te}</p>
            {analysis.success_factors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {analysis.success_factors.map(factor => (
                  <span
                    key={factor}
                    className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded"
                  >
                    {translateFactor(factor)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* What Failed */}
        {analysis.what_failed_te && (
          <div>
            <h4 className="flex items-center gap-2 font-bold text-red-400 mb-2">
              ❌ ఏం ఫెయిల్ అయింది
            </h4>
            <p className="text-gray-300">{analysis.what_failed_te}</p>
            {analysis.failure_factors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {analysis.failure_factors.map(factor => (
                  <span
                    key={factor}
                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded"
                  >
                    {translateFactor(factor)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audience Mismatch */}
        {analysis.audience_mismatch_te && (
          <div>
            <h4 className="flex items-center gap-2 font-bold text-yellow-400 mb-2">
              🎯 ప్రేక్షకుల అంచనాలు
            </h4>
            <p className="text-gray-300">{analysis.audience_mismatch_te}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function translateFactor(factor: string): string {
  const translations: Record<string, string> = {
    story: 'కథ',
    screenplay: 'స్క్రీన్‌ప్లే',
    music: 'సంగీతం',
    star_power: 'స్టార్ పవర్',
    timing: 'రిలీజ్ టైమింగ్',
    direction: 'దర్శకత్వం',
    acting: 'నటన',
    dialogues: 'డైలాగ్స్',
    visuals: 'విజువల్స్',
    weak_script: 'బలహీన స్క్రిప్ట్',
    poor_marketing: 'పేలవ మార్కెటింగ్',
    competition: 'పోటీ',
    length: 'నిడివి',
    pacing: 'పేసింగ్',
    predictable: 'ప్రిడిక్టబుల్',
    songs: 'పాటలు',
    comedy: 'కామెడీ',
    emotions: 'ఎమోషన్స్',
  };
  return translations[factor] || factor;
}

/**
 * Recent movie analyses widget
 */
export function RecentAnalysesWidget() {
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-500 px-6 py-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          📊 సినిమా విశ్లేషణలు
        </h3>
        <p className="text-blue-100 text-sm">ఏది వర్క్ అయింది, ఏది ఫెయిల్ అయింది?</p>
      </div>
      <div className="p-4">
        <p className="text-gray-400 text-center py-4">
          తాజా విశ్లేషణలు త్వరలో...
        </p>
      </div>
    </div>
  );
}

export default MovieAnalysisCard;



