'use client';

import { ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';

interface WhyWatchSkipProps {
  whyWatch?: string[] | null;
  whySkip?: string[] | null;
  compact?: boolean;
}

export function WhyWatchSkip({ whyWatch, whySkip, compact = false }: WhyWatchSkipProps) {
  const hasWatch = whyWatch && whyWatch.length > 0;
  const hasSkip = whySkip && whySkip.length > 0;

  if (!hasWatch && !hasSkip) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {hasWatch && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
            <ThumbsUp className="w-3 h-3" />
            {whyWatch[0]}
          </span>
        )}
        {hasSkip && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
            <ThumbsDown className="w-3 h-3" />
            {whySkip[0]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)]/50 rounded-xl border border-[var(--border-primary)]/30 p-4 space-y-4">
      {hasWatch && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4" />
            Why Watch
          </h4>
          <ul className="space-y-1.5">
            {whyWatch.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSkip && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
            <ThumbsDown className="w-4 h-4" />
            Why Skip
          </h4>
          <ul className="space-y-1.5">
            {whySkip.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

