'use client';

import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  TrendingUp,
  Eye,
  Search,
  ExternalLink,
} from 'lucide-react';

interface PendingImage {
  id: string;
  sourceUrl: string;
  source: string;
  entityName: string;
  qualityScore: number;
  reviewReason: string;
}

interface SourcePerformance {
  source: string;
  totalImages: number;
  approvedImages: number;
  avgQuality: number;
  avgCtr: number;
  reliabilityScore: number;
}

export default function ImageIntelligencePage() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [sourceStats, setSourceStats] = useState<SourcePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'review' | 'sources' | 'test'>('review');
  const [testQuery, setTestQuery] = useState('');
  const [testType, setTestType] = useState<'person' | 'movie' | 'topic'>('person');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, performanceRes] = await Promise.all([
        fetch('/api/admin/image-intelligence?action=pending&limit=20'),
        fetch('/api/admin/image-intelligence?action=performance'),
      ]);

      const pendingData = await pendingRes.json();
      const performanceData = await performanceRes.json();

      if (pendingData.success) setPendingImages(pendingData.data);
      if (performanceData.success) setSourceStats(performanceData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reviewImage = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const res = await fetch('/api/admin/image-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', imageId: id, status, notes }),
      });
      const data = await res.json();

      if (data.success) {
        setPendingImages(prev => prev.filter(img => img.id !== id));
      } else {
        alert('Review failed');
      }
    } catch (error) {
      alert('Review failed');
    }
  };

  const testFetch = async () => {
    if (!testQuery.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/image-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch',
          entityType: testType,
          entityName: testQuery,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, error: String(error) });
    } finally {
      setTesting(false);
    }
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      tmdb: '🎬',
      wikimedia_commons: '📚',
      wikipedia: '📖',
      pexels: '📷',
      unsplash: '🖼️',
      ai_generated: '🤖',
      press_kit: '📰',
    };
    return icons[source] || '🖼️';
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-orange-500" />
            Image Intelligence
          </h1>
          <p className="text-gray-400 mt-1">
            Zero copyright risk media management • Legal-safe image ingestion
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333]
            text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Legal Safety Banner */}
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <div className="font-medium text-green-400">Legal-Safe Sources Only</div>
            <div className="text-sm text-gray-400">
              TMDB • Wikimedia Commons • Wikipedia • Pexels • Unsplash • AI-Generated
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertCircle}
          label="Pending Review"
          value={pendingImages.length.toString()}
          color="yellow"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved Sources"
          value={sourceStats.filter(s => s.reliabilityScore >= 70).length.toString()}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Quality"
          value={`${Math.round(sourceStats.reduce((a, s) => a + s.avgQuality, 0) / Math.max(sourceStats.length, 1))}%`}
          color="purple"
        />
        <StatCard
          icon={Eye}
          label="Total Images"
          value={sourceStats.reduce((a, s) => a + s.totalImages, 0).toString()}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333]">
        {[
          { id: 'review', label: 'Pending Review', icon: AlertCircle },
          { id: 'sources', label: 'Source Performance', icon: TrendingUp },
          { id: 'test', label: 'Test Fetch', icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {pendingImages.length > 0 ? (
            pendingImages.map(image => (
              <div key={image.id} className="bg-[#1a1a1a] rounded-lg p-4 flex items-start gap-4">
                <div className="w-32 h-24 bg-[#252525] rounded overflow-hidden flex-shrink-0">
                  <img
                    src={image.sourceUrl}
                    alt={image.entityName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="96"><rect fill="%23333" width="128" height="96"/><text fill="%23666" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getSourceIcon(image.source)}</span>
                    <span className="text-white font-medium truncate">{image.entityName}</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    Source: {image.source} • Quality: {image.qualityScore}%
                  </div>
                  <div className="text-sm text-yellow-400">
                    ⚠️ {image.reviewReason}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={image.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#333] hover:bg-[#444] rounded transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                  <button
                    onClick={() => reviewImage(image.id, 'approved')}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => reviewImage(image.id, 'rejected', 'Manual rejection')}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p>All images reviewed!</p>
              <p className="text-sm mt-1">No pending images</p>
            </div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#252525]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Images</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Approved</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Avg Quality</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {sourceStats.map(stat => (
                <tr key={stat.source} className="hover:bg-[#252525]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getSourceIcon(stat.source)}</span>
                      <span className="text-white capitalize">{stat.source.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{stat.totalImages}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {stat.approvedImages} ({stat.totalImages > 0 ? Math.round(stat.approvedImages / stat.totalImages * 100) : 0}%)
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[#333] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            stat.avgQuality >= 70 ? 'bg-green-500' :
                            stat.avgQuality >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.avgQuality}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{Math.round(stat.avgQuality)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${getReliabilityColor(stat.reliabilityScore)}`}>
                      {Math.round(stat.reliabilityScore)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Test Image Fetch</h2>

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Entity Name</label>
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="e.g., Chiranjeevi, Pushpa, Telugu cinema"
                className="w-full px-3 py-2 bg-[#252525] border border-[#333] rounded-lg
                  text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                className="px-3 py-2 bg-[#252525] border border-[#333] rounded-lg
                  text-white focus:outline-none focus:border-orange-500"
              >
                <option value="person">Person</option>
                <option value="movie">Movie</option>
                <option value="topic">Topic</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={testFetch}
                disabled={testing || !testQuery.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg
                  disabled:opacity-50 transition-colors"
              >
                {testing ? 'Fetching...' : 'Test Fetch'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {testResult.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Image Found!</span>
                  </div>

                  {testResult.data?.image && (
                    <div className="flex gap-4">
                      <div className="w-48 h-36 bg-[#252525] rounded overflow-hidden flex-shrink-0">
                        <img
                          src={testResult.data.image.sourceUrl}
                          alt="Test result"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="text-gray-400">
                          <span className="text-gray-500">Source:</span> {testResult.data.source}
                        </div>
                        <div className="text-gray-400">
                          <span className="text-gray-500">License:</span> {testResult.data.image.licenseType}
                        </div>
                        <div className="text-gray-400">
                          <span className="text-gray-500">Quality:</span> {testResult.data.image.qualityScore}%
                        </div>
                        <div className="text-gray-400">
                          <span className="text-gray-500">Fallback Chain:</span> {testResult.data.fallbackChain?.join(' → ')}
                        </div>
                        {testResult.data.image.attributionText && (
                          <div className="text-gray-400">
                            <span className="text-gray-500">Attribution:</span> {testResult.data.image.attributionText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{testResult.error || testResult.data?.error || 'No image found'}</span>
                </div>
              )}
            </div>
          )}

          {/* Legal Sources Info */}
          <div className="mt-6 p-4 bg-[#252525] rounded-lg">
            <h3 className="text-white font-medium mb-3">Allowed Sources (Priority Order)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">1.</span> 🎬 TMDB (Posters/Profiles)
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">2.</span> 📚 Wikimedia Commons
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">3.</span> 📖 Wikipedia PageImages
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">4.</span> 📷 Pexels (Topics only)
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">5.</span> 🖼️ Unsplash (Topics only)
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-green-400">6.</span> 🤖 AI-Generated (Fallback)
              </div>
            </div>
          </div>

          {/* Blocked Sources Warning */}
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h3 className="text-red-400 font-medium mb-2">⛔ Never Fetched From</h3>
            <div className="text-sm text-gray-400">
              Google Images • Instagram • IMDb • Pinterest • Getty • Shutterstock • iStock
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-500/20 text-yellow-500',
    green: 'bg-green-500/20 text-green-500',
    purple: 'bg-purple-500/20 text-purple-500',
    blue: 'bg-blue-500/20 text-blue-500',
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
