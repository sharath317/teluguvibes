'use client';

import { TrendingUp, Trophy, IndianRupee, Calendar, Flame } from 'lucide-react';

interface BoxOfficeData {
  budget?: string;
  lifetime_gross?: string;
  opening_week?: string;
  verdict?: string;
  roi?: number;
}

type BoxOfficeCategory = 
  | 'industry-hit'
  | 'blockbuster'
  | 'super-hit'
  | 'hit'
  | 'average'
  | 'below-average'
  | 'disaster';

interface BoxOfficeCardProps {
  data?: BoxOfficeData | null;
  category?: BoxOfficeCategory | null;
  compact?: boolean;
}

const categoryConfig: Record<BoxOfficeCategory, {
  label: string;
  icon: React.ReactNode;
  gradient: string;
  textClass: string;
}> = {
  'industry-hit': {
    label: 'Industry Hit',
    icon: <Trophy className="w-4 h-4" />,
    gradient: 'from-yellow-400 via-amber-500 to-orange-600',
    textClass: 'text-yellow-400',
  },
  'blockbuster': {
    label: 'Blockbuster',
    icon: <Flame className="w-4 h-4" />,
    gradient: 'from-orange-500 to-red-600',
    textClass: 'text-orange-400',
  },
  'super-hit': {
    label: 'Super Hit',
    icon: <TrendingUp className="w-4 h-4" />,
    gradient: 'from-green-500 to-emerald-600',
    textClass: 'text-green-400',
  },
  'hit': {
    label: 'Hit',
    icon: <TrendingUp className="w-4 h-4" />,
    gradient: 'from-teal-500 to-cyan-600',
    textClass: 'text-teal-400',
  },
  'average': {
    label: 'Average',
    icon: <Calendar className="w-4 h-4" />,
    gradient: 'from-gray-500 to-slate-600',
    textClass: 'text-gray-400',
  },
  'below-average': {
    label: 'Below Average',
    icon: <Calendar className="w-4 h-4" />,
    gradient: 'from-slate-600 to-gray-700',
    textClass: 'text-slate-400',
  },
  'disaster': {
    label: 'Disaster',
    icon: <Calendar className="w-4 h-4" />,
    gradient: 'from-red-700 to-gray-800',
    textClass: 'text-red-400',
  },
};

export function BoxOfficeCard({ data, category, compact = false }: BoxOfficeCardProps) {
  if (!data && !category) return null;

  const config = category ? categoryConfig[category] : null;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {config && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${config.gradient} text-white text-xs font-bold shadow-lg`}>
            {config.icon}
            {config.label}
          </span>
        )}
        {data?.lifetime_gross && (
          <span className="text-sm text-[var(--text-secondary)]">
            <IndianRupee className="w-3 h-3 inline" />
            {data.lifetime_gross}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)]/50 rounded-xl border border-[var(--border-primary)]/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <IndianRupee className="w-4 h-4" />
          Box Office
        </h4>
        {config && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${config.gradient} text-white text-xs font-bold shadow-lg`}>
            {config.icon}
            {config.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data?.budget && (
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)]">Budget</span>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{data.budget}</p>
          </div>
        )}
        {data?.lifetime_gross && (
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)]">Lifetime Gross</span>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{data.lifetime_gross}</p>
          </div>
        )}
        {data?.opening_week && (
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)]">Opening Week</span>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{data.opening_week}</p>
          </div>
        )}
        {data?.verdict && (
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)]">Verdict</span>
            <p className={`text-sm font-semibold ${config?.textClass || 'text-[var(--text-primary)]'}`}>
              {data.verdict}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export a compact badge for inline use
export function BoxOfficeBadge({ category }: { category: BoxOfficeCategory }) {
  const config = categoryConfig[category];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${config.gradient} text-white text-xs font-bold shadow-lg`}>
      {config.icon}
      {config.label}
    </span>
  );
}

