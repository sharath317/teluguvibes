'use client';

/**
 * SourceSelector Component
 * 
 * Displays all 15+ data sources with:
 * - Source name and status
 * - Compliance badges (license, rate limit)
 * - Selection for force fetch
 * - Category grouping
 */

import React, { useState, useMemo } from 'react';
import { SOURCE_CONFIGS } from '@/lib/compliance/safe-fetcher';
import type { ComplianceDataSource, LicenseType } from '@/lib/compliance/types';
import { LICENSES } from '@/lib/compliance/types';

interface SourceSelectorProps {
  selectedSources: ComplianceDataSource[];
  onSelectionChange: (sources: ComplianceDataSource[]) => void;
  disabled?: boolean;
  showCompliance?: boolean;
  filterCategory?: 'api' | 'scraper' | 'archive' | 'news' | 'ai';
}

interface SourceGroup {
  name: string;
  sources: Array<{
    id: ComplianceDataSource;
    name: string;
    category: string;
    isOfficial: boolean;
    license: LicenseType;
    isActive: boolean;
    rateLimit: { requestsPerSecond: number };
  }>;
}

export function SourceSelector({
  selectedSources,
  onSelectionChange,
  disabled = false,
  showCompliance = true,
  filterCategory,
}: SourceSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Primary APIs', 'Telugu Sites']));

  // Group sources by category
  const sourceGroups = useMemo(() => {
    const groups: Record<string, SourceGroup> = {
      'Primary APIs': { name: 'Primary APIs', sources: [] },
      'Archival Sources': { name: 'Archival Sources', sources: [] },
      'Telugu Sites': { name: 'Telugu Entertainment', sources: [] },
      'News Sources': { name: 'News Sources', sources: [] },
      'Other': { name: 'Other', sources: [] },
    };

    Object.values(SOURCE_CONFIGS).forEach(config => {
      if (filterCategory && config.category !== filterCategory) return;

      const sourceInfo = {
        id: config.id as ComplianceDataSource,
        name: config.name,
        category: config.category ?? 'other',
        isOfficial: config.isOfficial ?? false,
        license: (config.defaultLicense ?? config.license ?? 'unknown') as LicenseType,
        isActive: config.isActive ?? config.enabled ?? false,
        rateLimit: { requestsPerSecond: config.rateLimit?.requestsPerSecond ?? 0 },
      };

      // Categorize
      if (['tmdb', 'omdb', 'wikipedia', 'wikidata', 'google_kg'].includes(config.id)) {
        groups['Primary APIs'].sources.push(sourceInfo);
      } else if (['archive_org', 'cinemaazi', 'letterboxd'].includes(config.id)) {
        groups['Archival Sources'].sources.push(sourceInfo);
      } else if (['moviebuff', 'jiosaavn', 'idlebrain', 'greatandhra', '123telugu', 'filmibeat'].includes(config.id)) {
        groups['Telugu Sites'].sources.push(sourceInfo);
      } else if (['sakshi', 'eenadu'].includes(config.id)) {
        groups['News Sources'].sources.push(sourceInfo);
      } else if (!['internal', 'regional', 'official', 'imdb'].includes(config.id)) {
        groups['Other'].sources.push(sourceInfo);
      }
    });

    // Filter out empty groups
    return Object.values(groups).filter(g => g.sources.length > 0);
  }, [filterCategory]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSource = (sourceId: ComplianceDataSource) => {
    if (disabled) return;
    
    const newSelection = selectedSources.includes(sourceId)
      ? selectedSources.filter(s => s !== sourceId)
      : [...selectedSources, sourceId];
    
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    const allSources = sourceGroups.flatMap(g => g.sources.map(s => s.id));
    onSelectionChange(allSources);
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  const getLicenseBadgeColor = (license: LicenseType): string => {
    const licenseInfo = LICENSES[license];
    if (licenseInfo.allowCommercial && !licenseInfo.requiresAttribution) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (licenseInfo.allowCommercial) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  return (
    <div className="source-selector space-y-4">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Data Sources</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Source groups */}
      <div className="space-y-2">
        {sourceGroups.map(group => (
          <div key={group.name} className="border rounded-lg dark:border-gray-700">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`transform transition-transform ${expandedGroups.has(group.name) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <span className="font-medium">{group.name}</span>
                <span className="text-sm text-gray-500">
                  ({group.sources.filter(s => selectedSources.includes(s.id)).length}/{group.sources.length})
                </span>
              </div>
            </button>

            {/* Group sources */}
            {expandedGroups.has(group.name) && (
              <div className="border-t dark:border-gray-700 divide-y dark:divide-gray-700">
                {group.sources.map(source => (
                  <label
                    key={source.id}
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source.id)}
                        onChange={() => toggleSource(source.id)}
                        disabled={disabled || !source.isActive}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          {source.isOfficial && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                              Official
                            </span>
                          )}
                          {!source.isActive && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {showCompliance && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${getLicenseBadgeColor(source.license)}`}>
                              {source.license}
                            </span>
                            <span className="text-xs text-gray-500">
                              {source.rateLimit.requestsPerSecond} req/s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
}

export default SourceSelector;

