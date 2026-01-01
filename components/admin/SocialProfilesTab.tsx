'use client';

/**
 * Social Profiles Tab Component for Admin UI
 * 
 * Features:
 * - View all social profiles for a celebrity
 * - Platform icons and confidence badges
 * - Enable/Disable toggle
 * - Re-verify button
 * - Bulk approve functionality
 * - Embed preview
 */

import { useState, useEffect, useCallback } from 'react';
import { PLATFORM_ICONS } from '@/lib/social/oembed';
import { 
  PLATFORM_CAPABILITIES, 
  getEmbedBadge, 
  type PlatformType 
} from '@/lib/social/platform-capabilities';

interface SocialProfile {
  id: string;
  platform: string;
  handle: string;
  profile_url: string;
  source: string;
  confidence: number;
  verified: boolean;
  is_official: boolean;
  is_primary: boolean;
  embed_html?: string;
}

interface SocialProfilesTabProps {
  celebrityId: string;
  celebrityName: string;
}

export function SocialProfilesTab({ celebrityId, celebrityName }: SocialProfilesTabProps) {
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/celebrity/${celebrityId}/social?include_embed=true`
      );
      const data = await response.json();

      if (data.success) {
        setProfiles(data.profiles || []);
      } else {
        setError(data.error || 'Failed to fetch profiles');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [celebrityId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Toggle verified status
  const toggleVerified = async (profile: SocialProfile) => {
    try {
      const response = await fetch(`/api/celebrity/${celebrityId}/social`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          verified: !profile.verified,
        }),
      });

      if (response.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Toggle active status
  const toggleActive = async (profile: SocialProfile, isActive: boolean) => {
    try {
      const response = await fetch(`/api/celebrity/${celebrityId}/social`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Set as primary
  const setPrimary = async (profile: SocialProfile) => {
    try {
      const response = await fetch(`/api/celebrity/${celebrityId}/social`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          is_primary: true,
        }),
      });

      if (response.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Set primary error:', err);
    }
  };

  // Delete profile
  const deleteProfile = async (profile: SocialProfile, block = false) => {
    if (!confirm(`Delete ${profile.platform} profile @${profile.handle}?`)) {
      return;
    }

    try {
      const url = new URL(`/api/celebrity/${celebrityId}/social`, window.location.origin);
      url.searchParams.set('profile_id', profile.id);
      if (block) {
        url.searchParams.set('block', 'true');
        url.searchParams.set('reason', 'inappropriate');
      }

      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (response.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Get confidence badge color
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return { color: 'bg-green-100 text-green-800', label: 'High' };
    } else if (confidence >= 60) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' };
    } else {
      return { color: 'bg-red-100 text-red-800', label: 'Low' };
    }
  };

  // Group by platform
  const byPlatform = profiles.reduce((acc, profile) => {
    if (!acc[profile.platform]) {
      acc[profile.platform] = [];
    }
    acc[profile.platform].push(profile);
    return acc;
  }, {} as Record<string, SocialProfile[]>);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading social profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={fetchProfiles}
          className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Social Profiles ({profiles.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            + Add Profile
          </button>
          <button
            onClick={fetchProfiles}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{profiles.length}</p>
          <p className="text-sm text-gray-600">Total Profiles</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-green-600">
            {profiles.filter(p => p.verified).length}
          </p>
          <p className="text-sm text-gray-600">Verified</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">
            {Object.keys(byPlatform).length}
          </p>
          <p className="text-sm text-gray-600">Platforms</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">
            {profiles.filter(p => p.confidence >= 80).length}
          </p>
          <p className="text-sm text-gray-600">High Confidence</p>
        </div>
      </div>

      {/* Profiles by Platform */}
      {Object.entries(byPlatform).map(([platform, platformProfiles]) => {
        const embedBadge = getEmbedBadge(platform as PlatformType);
        const platformCap = PLATFORM_CAPABILITIES[platform as PlatformType];
        
        return (
        <div key={platform} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <span className="text-xl">{PLATFORM_ICONS[platform] || platformCap?.icon || '🔗'}</span>
            <span className="font-medium capitalize">{platformCap?.name || platform}</span>
            <span className="text-gray-500 text-sm">
              ({platformProfiles.length} profiles)
            </span>
            {/* Embed Level Badge */}
            <span className={`ml-auto px-2 py-0.5 rounded text-xs ${
              embedBadge.color === 'green' ? 'bg-green-100 text-green-800' :
              embedBadge.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {embedBadge.icon} {embedBadge.label}
            </span>
          </div>

          <div className="divide-y">
            {platformProfiles.map(profile => {
              const badge = getConfidenceBadge(profile.confidence);
              
              return (
                <div key={profile.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    {/* Profile Info */}
                    <div className="flex items-center gap-3">
                      <a
                        href={profile.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        @{profile.handle}
                      </a>
                      
                      {/* Badges */}
                      <span className={`px-2 py-0.5 rounded text-xs ${badge.color}`}>
                        {profile.confidence}% {badge.label}
                      </span>
                      
                      {profile.verified && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          ✓ Verified
                        </span>
                      )}
                      
                      {profile.is_official && (
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                          Official
                        </span>
                      )}
                      
                      {profile.is_primary && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                          Primary
                        </span>
                      )}
                      
                      <span className="text-xs text-gray-400">
                        via {profile.source}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Preview button - disabled for non-embeddable platforms */}
                      {PLATFORM_CAPABILITIES[profile.platform as PlatformType]?.supportsEmbed ? (
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Preview embed"
                        >
                          👁️
                        </button>
                      ) : (
                        <span 
                          className="p-2 text-gray-300 cursor-not-allowed"
                          title="No embed support for this platform"
                        >
                          🚫
                        </span>
                      )}
                      
                      <button
                        onClick={() => toggleVerified(profile)}
                        className={`p-2 rounded ${
                          profile.verified 
                            ? 'text-blue-600 hover:bg-blue-50' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={profile.verified ? 'Remove verification' : 'Verify'}
                      >
                        {profile.verified ? '✓' : '○'}
                      </button>
                      
                      {!profile.is_primary && (
                        <button
                          onClick={() => setPrimary(profile)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Set as primary"
                        >
                          ⭐
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteProfile(profile)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {profiles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📱</p>
          <p>No social profiles found for {celebrityName}</p>
          <p className="text-sm mt-2">
            Run <code className="bg-gray-100 px-2 py-1 rounded">pnpm ingest:social</code> to fetch from trusted sources
          </p>
        </div>
      )}

      {/* Embed Preview Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                {PLATFORM_ICONS[selectedProfile.platform]} @{selectedProfile.handle}
              </h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="border rounded p-4 mb-4">
              {selectedProfile.embed_html ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: selectedProfile.embed_html }}
                  className="social-embed-preview"
                />
              ) : (
                <a 
                  href={selectedProfile.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on {selectedProfile.platform}
                </a>
              )}
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>Source: {selectedProfile.source}</p>
              <p>Confidence: {selectedProfile.confidence}%</p>
              <p>Verified: {selectedProfile.verified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <AddProfileModal
          celebrityId={celebrityId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProfiles();
          }}
        />
      )}
    </div>
  );
}

// Add Profile Modal
function AddProfileModal({
  celebrityId,
  onClose,
  onSuccess,
}: {
  celebrityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [platform, setPlatform] = useState('instagram');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const profile_url = getProfileUrl(platform, handle);
      
      const response = await fetch(`/api/celebrity/${celebrityId}/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          handle: handle.replace('@', ''),
          profile_url,
          source: 'manual',
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to add profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <h3 className="font-semibold text-lg mb-4">Add Social Profile</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="instagram">📸 Instagram (Full Embed)</option>
              <option value="youtube">▶️ YouTube (Full Embed)</option>
              <option value="twitter">🐦 Twitter/X (Full Embed)</option>
              <option value="tiktok">🎵 TikTok (Partial Embed)</option>
              <option value="facebook">📘 Facebook (Partial Embed)</option>
              <option value="snapchat">👻 Snapchat (No Embed - Metadata Only)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Handle</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@username"
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper to get profile URL
function getProfileUrl(platform: string, handle: string): string {
  const cleanHandle = handle.replace('@', '');
  
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${cleanHandle}/`;
    case 'youtube':
      return `https://www.youtube.com/@${cleanHandle}`;
    case 'twitter':
      return `https://twitter.com/${cleanHandle}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanHandle}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanHandle}`;
    case 'snapchat':
      return `https://www.snapchat.com/add/${cleanHandle}`;
    default:
      return `https://${platform}.com/${cleanHandle}`;
  }
}

