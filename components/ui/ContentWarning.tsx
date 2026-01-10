'use client';

/**
 * Content Warning Component
 * 
 * Displays content warnings and age gates for sensitive content.
 */

import { useState, ReactNode } from 'react';
import { useContentMode } from '@/lib/content/content-mode-context';
import { ContentProfile, getAudienceRatingLabel, getAudienceRatingColor } from '@/types/content';

// ============================================================
// TYPES
// ============================================================

export interface ContentWarningProps {
  /** Content profile to display warning for */
  profile: ContentProfile;
  /** Content to show after warning is dismissed */
  children: ReactNode;
  /** Show as overlay vs inline */
  variant?: 'overlay' | 'inline' | 'banner';
  /** Allow dismissal */
  dismissible?: boolean;
  /** Called when user proceeds */
  onProceed?: () => void;
  /** Called when user declines */
  onDecline?: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function ContentWarning({
  profile,
  children,
  variant = 'overlay',
  dismissible = true,
  onProceed,
  onDecline,
}: ContentWarningProps) {
  const [dismissed, setDismissed] = useState(false);
  const { mode, verifyAge, isAgeVerified } = useContentMode();

  // Don't show warning if already dismissed or adult mode with verification
  if (dismissed || (mode === 'adult' && isAgeVerified)) {
    return <>{children}</>;
  }

  // Don't show warning for family-safe content
  if (profile.isFamilySafe && !profile.requiresWarning) {
    return <>{children}</>;
  }

  const handleProceed = () => {
    if (profile.isAdult) {
      verifyAge();
    }
    setDismissed(true);
    onProceed?.();
  };

  const handleDecline = () => {
    onDecline?.();
  };

  const ratingLabel = getAudienceRatingLabel(profile.audienceRating);
  const ratingColor = getAudienceRatingColor(profile.audienceRating);

  // Banner variant - non-blocking warning
  if (variant === 'banner') {
    return (
      <div>
        <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-[var(--warning)] text-xl">⚠️</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs font-bold rounded bg-${ratingColor}-500/20 text-${ratingColor}-600`}>
                  {profile.audienceRating}
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {ratingLabel}
                </span>
              </div>
              {profile.warnings.length > 0 && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Contains: {profile.warnings.map(w => w.replace(/_/g, ' ')).join(', ')}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                onClick={() => setDismissed(true)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Inline variant - compact warning
  if (variant === 'inline') {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-[var(--bg-primary)]/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center p-4">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 bg-${ratingColor}-500/20 text-${ratingColor}-600`}>
              {profile.audienceRating} - {ratingLabel}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              This content is rated for mature audiences.
            </p>
            {dismissible && (
              <button
                onClick={handleProceed}
                className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                I understand, show content
              </button>
            )}
          </div>
        </div>
        <div className="filter blur-md pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // Overlay variant - full screen gate
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Warning icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-[var(--error-bg)] rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Content Warning
          </h2>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-${ratingColor}-500/20 text-${ratingColor}-600`}>
            {profile.audienceRating} - {ratingLabel}
          </div>
        </div>

        {/* Warning details */}
        <div className="mb-6">
          <p className="text-[var(--text-secondary)] text-center mb-4">
            This content is intended for {profile.minimumAge}+ audiences and may contain:
          </p>
          
          {profile.warnings.length > 0 && (
            <ul className="space-y-2">
              {profile.warnings.map((warning) => (
                <li 
                  key={warning}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="w-1.5 h-1.5 bg-[var(--warning)] rounded-full" />
                  {warning.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Age verification for adult content */}
        {profile.isAdult && (
          <p className="text-sm text-center text-[var(--text-tertiary)] mb-4">
            By proceeding, you confirm that you are {profile.minimumAge} years of age or older.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            Go Back
          </button>
          {dismissible && (
            <button
              onClick={handleProceed}
              className="flex-1 px-4 py-3 bg-[var(--brand-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {profile.isAdult ? 'I am 18+, Continue' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BADGE COMPONENT
// ============================================================

export interface ContentRatingBadgeProps {
  profile: ContentProfile;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ContentRatingBadge({
  profile,
  size = 'md',
  showLabel = false,
}: ContentRatingBadgeProps) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500/20 text-green-600 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-600 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    gray: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  };

  const sizeMap = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const color = getAudienceRatingColor(profile.audienceRating);
  const label = getAudienceRatingLabel(profile.audienceRating);

  return (
    <span 
      className={`
        inline-flex items-center gap-1 font-bold rounded border
        ${colorMap[color]}
        ${sizeMap[size]}
      `}
      title={label}
    >
      {profile.audienceRating}
      {showLabel && <span className="font-normal opacity-80">• {label}</span>}
    </span>
  );
}

export default ContentWarning;


