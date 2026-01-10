'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, Filter, RefreshCw, BarChart3, Search,
  ChevronRight, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import {
  ContentSector,
  ContentType,
  VerificationStatus,
  SECTOR_DEFINITIONS,
  getSectorOptions,
  VERIFICATION_STATUS_CONFIG,
} from '@/types/content-sectors';

interface SectorStats {
  sector: ContentSector;
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  verifiedPosts: number;
  avgConfidenceScore: number;
  lastUpdated: string;
}

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content_type: ContentType;
  content_sector: ContentSector;
  verification_status: VerificationStatus;
  fact_confidence_score: number;
  status: string;
  created_at: string;
}

export default function ContentSectorsPage() {
  const [loading, setLoading] = useState(true);
  const [sectorStats, setSectorStats] = useState<SectorStats[]>([]);
  const [selectedSector, setSelectedSector] = useState<ContentSector | null>(null);
  const [sectorContent, setSectorContent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSectorStats();
  }, []);

  useEffect(() => {
    if (selectedSector) {
      fetchSectorContent(selectedSector);
    }
  }, [selectedSector, statusFilter]);

  async function fetchSectorStats() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content-sectors/stats');
      if (res.ok) {
        const data = await res.json();
        setSectorStats(data.stats || []);
      } else {
        // Generate mock stats if API doesn't exist yet
        const mockStats: SectorStats[] = getSectorOptions().map((opt) => ({
          sector: opt.value,
          totalPosts: Math.floor(Math.random() * 100),
          publishedPosts: Math.floor(Math.random() * 50),
          draftPosts: Math.floor(Math.random() * 30),
          verifiedPosts: Math.floor(Math.random() * 40),
          avgConfidenceScore: Math.floor(Math.random() * 100),
          lastUpdated: new Date().toISOString(),
        }));
        setSectorStats(mockStats);
      }
    } catch (error) {
      console.error('Failed to fetch sector stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSectorContent(sector: ContentSector) {
    try {
      setContentLoading(true);
      const params = new URLSearchParams({
        sector,
        status: statusFilter !== 'all' ? statusFilter : '',
      });
      const res = await fetch(`/api/admin/content-sectors/content?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSectorContent(data.content || []);
      } else {
        // Generate mock content if API doesn't exist yet
        const mockContent: ContentItem[] = Array.from({ length: 5 }, (_, i) => ({
          id: `mock-${i}`,
          title: `Sample ${SECTOR_DEFINITIONS[sector].name} Content ${i + 1}`,
          slug: `sample-content-${i}`,
          content_type: SECTOR_DEFINITIONS[sector].allowedContentTypes[0] || 'article',
          content_sector: sector,
          verification_status: ['draft', 'pending', 'verified'][Math.floor(Math.random() * 3)] as VerificationStatus,
          fact_confidence_score: Math.floor(Math.random() * 100),
          status: ['draft', 'published'][Math.floor(Math.random() * 2)],
          created_at: new Date().toISOString(),
        }));
        setSectorContent(mockContent);
      }
    } catch (error) {
      console.error('Failed to fetch sector content:', error);
    } finally {
      setContentLoading(false);
    }
  }

  const filteredContent = sectorContent.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStats = {
    totalPosts: sectorStats.reduce((sum, s) => sum + s.totalPosts, 0),
    publishedPosts: sectorStats.reduce((sum, s) => sum + s.publishedPosts, 0),
    verifiedPosts: sectorStats.reduce((sum, s) => sum + s.verifiedPosts, 0),
    avgConfidence: sectorStats.length > 0 
      ? Math.round(sectorStats.reduce((sum, s) => sum + s.avgConfidenceScore, 0) / sectorStats.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#eab308]/20 rounded-xl">
            <Layers className="w-6 h-6 text-[#eab308]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Content Sectors</h1>
            <p className="text-[#737373]">Browse and manage content by sector</p>
          </div>
        </div>
        <button
          onClick={fetchSectorStats}
          className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <p className="text-[#737373] text-sm">Total Content</p>
          <p className="text-2xl font-bold text-white mt-1">{totalStats.totalPosts}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <p className="text-[#737373] text-sm">Published</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{totalStats.publishedPosts}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <p className="text-[#737373] text-sm">Verified</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{totalStats.verifiedPosts}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <p className="text-[#737373] text-sm">Avg Confidence</p>
          <p className="text-2xl font-bold text-[#eab308] mt-1">{totalStats.avgConfidence}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sector List */}
        <div className="lg:col-span-1 bg-[#141414] border border-[#262626] rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sectors
          </h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-[#262626] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {getSectorOptions().map((opt) => {
                const stats = sectorStats.find(s => s.sector === opt.value);
                const sectorDef = SECTOR_DEFINITIONS[opt.value];
                const isSelected = selectedSector === opt.value;
                
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedSector(opt.value)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      isSelected 
                        ? 'bg-[#eab308]/20 border border-[#eab308]' 
                        : 'bg-[#0a0a0a] border border-[#262626] hover:border-[#404040]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sectorDef.icon}</span>
                        <span className={`font-medium ${isSelected ? 'text-[#eab308]' : 'text-white'}`}>
                          {sectorDef.name}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#eab308]' : 'text-[#737373]'}`} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-[#737373]">
                        {stats?.totalPosts || 0} posts
                      </span>
                      <span className="text-green-400">
                        {stats?.publishedPosts || 0} published
                      </span>
                      <span className="text-blue-400">
                        {stats?.avgConfidenceScore || 0}% conf
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sector Content */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-4">
          {selectedSector ? (
            <>
              {/* Sector Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{SECTOR_DEFINITIONS[selectedSector].icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {SECTOR_DEFINITIONS[selectedSector].name}
                    </h2>
                    <p className="text-sm text-[#737373]">
                      {SECTOR_DEFINITIONS[selectedSector].description}
                    </p>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex gap-2">
                  {SECTOR_DEFINITIONS[selectedSector].requiresFictionalLabel && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      Fiction
                    </span>
                  )}
                  {SECTOR_DEFINITIONS[selectedSector].requiresDisclaimer && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                      Disclaimer
                    </span>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search content..."
                    className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308]"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Content List */}
              {contentLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-[#262626] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredContent.length > 0 ? (
                <div className="space-y-3">
                  {filteredContent.map((item) => {
                    const verificationConfig = VERIFICATION_STATUS_CONFIG[item.verification_status];
                    
                    return (
                      <Link
                        key={item.id}
                        href={`/admin/posts/${item.id}/edit`}
                        className="block p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg hover:border-[#404040] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium line-clamp-1">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-[#737373]">
                                {item.content_type}
                              </span>
                              <span 
                                className={`px-2 py-0.5 rounded ${
                                  item.status === 'published' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-[#262626] text-[#737373]'
                                }`}
                              >
                                {item.status}
                              </span>
                              <span 
                                className="px-2 py-0.5 rounded"
                                style={{ 
                                  backgroundColor: verificationConfig.color + '20',
                                  color: verificationConfig.color
                                }}
                              >
                                {verificationConfig.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm">
                              {item.fact_confidence_score >= 70 ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : item.fact_confidence_score >= 40 ? (
                                <Clock className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className={`font-medium ${
                                item.fact_confidence_score >= 70 
                                  ? 'text-green-400' 
                                  : item.fact_confidence_score >= 40 
                                  ? 'text-yellow-400' 
                                  : 'text-red-400'
                              }`}>
                                {item.fact_confidence_score}%
                              </span>
                            </div>
                            <p className="text-xs text-[#737373] mt-1">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 text-[#262626] mx-auto mb-4" />
                  <p className="text-[#737373]">No content in this sector</p>
                  <Link
                    href="/admin/posts/new"
                    className="inline-block mt-4 px-4 py-2 bg-[#eab308] text-black font-medium rounded-lg hover:bg-[#ca9a06] transition-colors"
                  >
                    Create Content
                  </Link>
                </div>
              )}

              {/* Allowed Content Types */}
              <div className="mt-6 pt-4 border-t border-[#262626]">
                <p className="text-sm text-[#737373] mb-2">Allowed content types:</p>
                <div className="flex flex-wrap gap-2">
                  {SECTOR_DEFINITIONS[selectedSector].allowedContentTypes.map((type) => (
                    <span 
                      key={type}
                      className="px-3 py-1 bg-[#262626] text-white text-sm rounded-full"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Layers className="w-12 h-12 text-[#262626] mx-auto mb-4" />
                <p className="text-[#737373]">Select a sector to view content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


