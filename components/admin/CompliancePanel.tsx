'use client';

/**
 * CompliancePanel Component
 * 
 * Displays compliance information:
 * - License details
 * - Attribution requirements
 * - Privacy status
 * - Content safety status
 */

import React from 'react';
import type { 
  UsageValidation, 
  PrivacyCheck, 
  ContentSafetyResult,
  Attribution,
  LicenseType,
} from '@/lib/compliance/types';
import { LICENSES } from '@/lib/compliance/types';

interface CompliancePanelProps {
  usage?: UsageValidation;
  privacy?: PrivacyCheck;
  safety?: ContentSafetyResult;
  attributions?: Attribution[];
  compact?: boolean;
}

export function CompliancePanel({
  usage,
  privacy,
  safety,
  attributions = [],
  compact = false,
}: CompliancePanelProps) {
  const getStatusColor = (status: boolean | undefined): string => {
    if (status === undefined) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return status 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getLicenseInfo = (license: LicenseType) => LICENSES[license];

  if (compact) {
    return (
      <div className="compliance-panel-compact flex items-center gap-2 text-sm">
        {usage && (
          <span className={`px-2 py-1 rounded ${getStatusColor(usage.canUse)}`}>
            {usage.canUse ? '✓ Licensed' : '✗ Restricted'}
          </span>
        )}
        {privacy && (
          <span className={`px-2 py-1 rounded ${getStatusColor(privacy.safe)}`}>
            {privacy.safe ? '✓ Privacy OK' : '⚠ Privacy Issues'}
          </span>
        )}
        {safety && (
          <span className={`px-2 py-1 rounded ${getStatusColor(safety.safe)}`}>
            {safety.safe ? '✓ Safe' : '⚠ Review Needed'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="compliance-panel space-y-4 p-4 border rounded-lg dark:border-gray-700">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>🛡️</span> Compliance Status
      </h3>

      {/* Usage/License Section */}
      {usage && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">License</h4>
          <div className={`p-3 rounded ${getStatusColor(usage.canUse)}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {getLicenseInfo(usage.license).name}
              </span>
              <span>{usage.canUse ? '✓ Allowed' : '✗ Restricted'}</span>
            </div>
            {usage.restrictions && usage.restrictions.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {usage.restrictions.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span> {r}
                  </li>
                ))}
              </ul>
            )}
            {usage.warnings && usage.warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20">
                {usage.warnings.map((w, i) => (
                  <p key={i} className="text-sm">⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Section */}
      {privacy && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Privacy</h4>
          <div className={`p-3 rounded ${getStatusColor(privacy.safe)}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {privacy.safe ? 'No Issues Detected' : 'Issues Found'}
              </span>
              <span>
                {privacy.flaggedFields.length === 0 
                  ? '✓ Clear' 
                  : `${privacy.flaggedFields.length} flag${privacy.flaggedFields.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            
            {privacy.flaggedFields.length > 0 && (
              <div className="mt-2 space-y-1">
                {privacy.flaggedFields.slice(0, 5).map((flag, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <span className={
                      flag.severity === 'critical' ? '🔴' :
                      flag.severity === 'high' ? '🟠' :
                      flag.severity === 'medium' ? '🟡' : '🔵'
                    }>
                    </span>
                    <span>
                      <strong>{flag.field}</strong>: {flag.recommendation}
                    </span>
                  </div>
                ))}
                {privacy.flaggedFields.length > 5 && (
                  <p className="text-sm">... and {privacy.flaggedFields.length - 5} more</p>
                )}
              </div>
            )}

            {privacy.recommendations && privacy.recommendations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20 text-sm">
                <p className="font-medium">Recommendations:</p>
                <ul className="mt-1 space-y-1">
                  {privacy.recommendations.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Section */}
      {safety && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Content Safety</h4>
          <div className={`p-3 rounded ${getStatusColor(safety.safe)}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{safety.status.replace('_', ' ')}</span>
              <span>Score: {safety.score}/100</span>
            </div>
            
            {safety.flags.length > 0 && (
              <div className="mt-2 space-y-1">
                {safety.flags.map((flag, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <span className={
                      flag.severity === 'critical' ? '🔴' :
                      flag.severity === 'warning' ? '🟡' : '🔵'
                    }>
                    </span>
                    <span>
                      <strong className="capitalize">{flag.type}</strong>: {flag.reason}
                      {flag.autoResolve && ' (auto-resolvable)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attributions Section */}
      {attributions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
            Attributions ({attributions.length})
          </h4>
          <div className="space-y-2">
            {attributions.map((attr, i) => (
              <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{attr.sourceName}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                    {attr.license}
                  </span>
                </div>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{attr.text}</p>
                {attr.requiresLink && attr.sourceUrl && (
                  <a 
                    href={attr.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-1 inline-block"
                  >
                    View source →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="pt-2 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>
            License: {usage?.canUse ? '✓' : '✗'}
          </span>
          <span>
            Privacy: {privacy?.safe ? '✓' : (privacy ? '✗' : '?')}
          </span>
          <span>
            Safety: {safety?.safe ? '✓' : (safety ? '✗' : '?')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CompliancePanel;

