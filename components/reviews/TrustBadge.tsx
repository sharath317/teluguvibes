'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Info, X } from 'lucide-react';

type TrustLevel = 'verified' | 'high' | 'medium' | 'low' | 'unverified';

interface ConfidenceBreakdown {
  source_count?: number;
  source_tiers?: { tier1: number; tier2: number; tier3: number };
  editorial_alignment?: number;
  validation_pass_rate?: number;
  last_validation_date?: string;
  field_completeness?: number;
  data_age_days?: number;
  explanation?: string;
}

interface TrustBadgeProps {
  level?: TrustLevel | string | null;
  score?: number | null;
  breakdown?: ConfidenceBreakdown | null;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const trustConfig: Record<TrustLevel, {
  label: string;
  icon: React.ReactNode;
  iconLg: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}> = {
  'verified': {
    label: 'Verified',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    iconLg: <ShieldCheck className="w-5 h-5" />,
    bgColor: 'bg-green-500',
    borderColor: 'border-green-600',
    textColor: 'text-white',
    description: 'Data verified from multiple authoritative sources',
  },
  'high': {
    label: 'High Confidence',
    icon: <Shield className="w-3.5 h-3.5" />,
    iconLg: <Shield className="w-5 h-5" />,
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-600',
    textColor: 'text-white',
    description: 'Data from reliable sources with good coverage',
  },
  'medium': {
    label: 'Medium',
    icon: <Shield className="w-3.5 h-3.5" />,
    iconLg: <Shield className="w-5 h-5" />,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-600',
    textColor: 'text-black',
    description: 'Some data points may need verification',
  },
  'low': {
    label: 'Low',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    iconLg: <ShieldAlert className="w-5 h-5" />,
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-600',
    textColor: 'text-white',
    description: 'Limited sources available',
  },
  'unverified': {
    label: 'Unverified',
    icon: <ShieldQuestion className="w-3.5 h-3.5" />,
    iconLg: <ShieldQuestion className="w-5 h-5" />,
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-600',
    textColor: 'text-white',
    description: 'Data has not been verified',
  },
};

function getTrustLevel(score?: number | null): TrustLevel {
  if (!score && score !== 0) return 'unverified';
  if (score >= 0.9) return 'verified';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'unverified';
}

function generateExplanation(breakdown: ConfidenceBreakdown): string {
  const parts: string[] = [];
  
  if (breakdown.source_count) {
    parts.push(`Aggregated from ${breakdown.source_count} sources`);
  }
  
  if (breakdown.source_tiers?.tier1 && breakdown.source_tiers.tier1 >= 2) {
    parts.push(`Verified by ${breakdown.source_tiers.tier1} authoritative sources`);
  }
  
  if (breakdown.field_completeness) {
    const pct = Math.round(breakdown.field_completeness * 100);
    parts.push(`${pct}% data completeness`);
  }
  
  if (breakdown.data_age_days && breakdown.data_age_days > 90) {
    parts.push(`Data may be outdated (${breakdown.data_age_days} days old)`);
  }
  
  if (breakdown.validation_pass_rate) {
    const pct = Math.round(breakdown.validation_pass_rate * 100);
    parts.push(`${pct}% validation pass rate`);
  }
  
  return parts.length > 0 ? parts.join('. ') + '.' : '';
}

export function TrustBadge({ 
  level, 
  score, 
  breakdown, 
  showTooltip = true, 
  size = 'md' 
}: TrustBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const trustLevel = level as TrustLevel || getTrustLevel(score);
  const config = trustConfig[trustLevel];
  
  if (!config) return null;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const explanation = breakdown 
    ? breakdown.explanation || generateExplanation(breakdown)
    : config.description;

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => showTooltip && setTooltipOpen(!tooltipOpen)}
        className={`inline-flex items-center rounded-md font-semibold border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses[size]} shadow-md transition-transform hover:scale-105`}
        title={!showTooltip ? explanation : undefined}
      >
        {size === 'lg' ? config.iconLg : config.icon}
        {config.label}
        {showTooltip && (
          <Info className="w-3 h-3 opacity-70" />
        )}
      </button>

      {/* Tooltip Modal */}
      {tooltipOpen && showTooltip && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setTooltipOpen(false)}
          />
          
          {/* Tooltip */}
          <div className="absolute z-50 top-full left-0 mt-2 w-72 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {config.iconLg}
                <span className="font-semibold text-[var(--text-primary)]">
                  {config.label}
                </span>
              </div>
              <button 
                onClick={() => setTooltipOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {explanation}
            </p>

            {breakdown && (
              <div className="space-y-2 text-xs">
                {breakdown.source_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Sources</span>
                    <span className="text-[var(--text-primary)]">{breakdown.source_count}</span>
                  </div>
                )}
                {breakdown.field_completeness !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Completeness</span>
                    <span className="text-[var(--text-primary)]">
                      {Math.round(breakdown.field_completeness * 100)}%
                    </span>
                  </div>
                )}
                {breakdown.validation_pass_rate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Validation</span>
                    <span className="text-[var(--text-primary)]">
                      {Math.round(breakdown.validation_pass_rate * 100)}%
                    </span>
                  </div>
                )}
                {breakdown.last_validation_date && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Last Verified</span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(breakdown.last_validation_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {score !== undefined && score !== null && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-primary)]">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Confidence Score</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {Math.round(score * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${config.bgColor} rounded-full`}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Simple score indicator without tooltip
export function ConfidenceScore({ score }: { score: number }) {
  const level = getTrustLevel(score);
  const config = trustConfig[level];
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
      <span className="text-xs text-[var(--text-secondary)]">
        {Math.round(score * 100)}% confidence
      </span>
    </div>
  );
}

