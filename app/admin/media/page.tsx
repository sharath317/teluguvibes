'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Filter, Eye, Edit, Trash2, Check, X,
  Instagram, Youtube, Twitter, Image as ImageIcon, Flame, Star
} from 'lucide-react';
import type { MediaPost, MediaEntity, MediaType, MediaStatus } from '@/types/media';

const STATUS_COLORS: Record<MediaStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  archived: 'bg-gray-500/20 text-gray-500',
};

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  instagram_post: <Instagram className="w-4 h-4" />,
  instagram_reel: <Instagram className="w-4 h-4" />,
  youtube_video: <Youtube className="w-4 h-4" />,
  youtube_short: <Youtube className="w-4 h-4" />,
  twitter_post: <Twitter className="w-4 h-4" />,
};

export default function AdminMediaPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [entities, setEntities] = useState<MediaEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<MediaStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch posts
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [postsRes, entitiesRes] = await Promise.all([
          fetch(`/api/admin/media/posts?status=${statusFilter}&limit=50`),
          fetch('/api/admin/media/entities?limit=100'),
        ]);

        const postsData = await postsRes.json();
        const entitiesData = await entitiesRes.json();

        setPosts(postsData.posts || []);
        setEntities(entitiesData.entities || []);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchData();
  }, [statusFilter]);

  // Quick actions
  async function handleApprove(postId: string) {
    try {
      await fetch(`/api/admin/media/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
    } catch (error) {
      console.error('Approve error:', error);
    }
  }

  async function handleReject(postId: string) {
    try {
      await fetch(`/api/admin/media/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'rejected' } : p));
    } catch (error) {
      console.error('Reject error:', error);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Delete this media post?')) return;
    try {
      await fetch(`/api/admin/media/posts/${postId}`, { method: 'DELETE' });
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  async function handleToggleHot(postId: string, isHot: boolean) {
    try {
      await fetch(`/api/admin/media/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hot: !isHot }),
      });
      setPosts(posts.map(p => p.id === postId ? { ...p, is_hot: !isHot } : p));
    } catch (error) {
      console.error('Toggle hot error:', error);
    }
  }

  async function handleToggleFeatured(postId: string, isFeatured: boolean) {
    try {
      await fetch(`/api/admin/media/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !isFeatured }),
      });
      setPosts(posts.map(p => p.id === postId ? { ...p, is_featured: !isFeatured } : p));
    } catch (error) {
      console.error('Toggle featured error:', error);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hot Media Manager</h1>
          <p className="text-gray-400">Manage photos, videos, and social media embeds</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Media
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${statusFilter === status
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by caption, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {posts.filter(p => p.status === 'pending').length}
          </div>
          <div className="text-gray-400 text-sm">Pending Review</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-500">
            {posts.filter(p => p.status === 'approved').length}
          </div>
          <div className="text-gray-400 text-sm">Approved</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-500">
            {posts.filter(p => p.is_hot).length}
          </div>
          <div className="text-gray-400 text-sm">Hot 🔥</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-500">
            {posts.filter(p => p.is_featured).length}
          </div>
          <div className="text-gray-400 text-sm">Featured ⭐</div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No media posts found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Media</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Entity</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Type</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Views</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-800">
                        {post.thumbnail_url || post.image_url ? (
                          <img
                            src={post.thumbnail_url || post.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {MEDIA_ICONS[post.media_type]}
                          </div>
                        )}
                      </div>
                      <div className="max-w-[200px]">
                        <p className="text-white text-sm truncate">
                          {post.caption || post.title || 'No caption'}
                        </p>
                        <p className="text-gray-500 text-xs truncate">{post.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {post.entity ? (
                      <span className="text-yellow-500 text-sm">{post.entity.name_en}</span>
                    ) : (
                      <span className="text-gray-500 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-300 text-sm">
                      {MEDIA_ICONS[post.media_type]}
                      <span className="capitalize">{post.media_type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                        {post.status}
                      </span>
                      {post.is_hot && <span title="Hot">🔥</span>}
                      {post.is_featured && <span title="Featured">⭐</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {post.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(post.id)}
                            className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(post.id)}
                            className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleToggleHot(post.id, post.is_hot)}
                        className={`p-1.5 rounded ${post.is_hot ? 'bg-orange-500/20 text-orange-500' : 'bg-gray-700 text-gray-400'}`}
                        title="Toggle Hot"
                      >
                        <Flame className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(post.id, post.is_featured)}
                        className={`p-1.5 rounded ${post.is_featured ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-700 text-gray-400'}`}
                        title="Toggle Featured"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/media/${post.id}`)}
                        className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-red-500/20 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Media Modal */}
      {showAddModal && (
        <AddMediaModal
          entities={entities}
          onClose={() => setShowAddModal(false)}
          onSuccess={(post) => {
            setPosts([post, ...posts]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Pre-populated top Telugu actresses/anchors for quick selection
const TOP_ACTRESSES = [
  { name: 'Samantha', instagram: 'samantharuthprabhuoffl' },
  { name: 'Rashmika', instagram: 'rashmika_mandanna' },
  { name: 'Pooja Hegde', instagram: 'hegabordepooja' },
  { name: 'Kajal Aggarwal', instagram: 'kaaboraggarwal' },
  { name: 'Tamanna', instagram: 'taaborannahspeaks' },
  { name: 'Anupama', instagram: 'aboranupama' },
  { name: 'Sreemukhi', instagram: 'saborabormukhi' },
  { name: 'Anasuya', instagram: 'aboranasuyakaarakada' },
  { name: 'Nidhhi Agerwal', instagram: 'nidaborhhiagerwal' },
  { name: 'Keerthy Suresh', instagram: 'kaboreerthy.suresh' },
  { name: 'Nabha Natesh', instagram: 'naborabhhanatesh' },
  { name: 'Shriya Saran', instagram: 'shraboriyasaran1109' },
];

// Quick category buttons for glamour content
const QUICK_CATEGORIES = [
  { id: 'glamour', label: '💫 Glamour', color: 'from-pink-500 to-rose-500' },
  { id: 'photoshoot', label: '📸 Photoshoot', color: 'from-orange-500 to-amber-500' },
  { id: 'magazine', label: '📰 Magazine', color: 'from-purple-500 to-violet-500' },
  { id: 'beach_vacation', label: '🏖️ Beach', color: 'from-cyan-500 to-blue-500' },
  { id: 'red_carpet', label: '👗 Red Carpet', color: 'from-red-500 to-pink-500' },
  { id: 'gym_fitness', label: '💪 Fitness', color: 'from-green-500 to-emerald-500' },
  { id: 'saree_traditional', label: '🪷 Saree', color: 'from-amber-500 to-yellow-500' },
  { id: 'western_glam', label: '👠 Western', color: 'from-indigo-500 to-purple-500' },
  { id: 'movie_promotion', label: '🎬 Promo', color: 'from-fuchsia-500 to-pink-500' },
  { id: 'event', label: '🎉 Event', color: 'from-yellow-500 to-orange-500' },
];

/**
 * Add Media Modal with URL preview and quick actress/category selection
 */
function AddMediaModal({
  entities,
  onClose,
  onSuccess,
}: {
  entities: MediaEntity[];
  onClose: () => void;
  onSuccess: (post: MediaPost) => void;
}) {
  const [url, setUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('glamour');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQuickActress, setShowQuickActress] = useState(true);

  async function handlePreview() {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (error) {
      console.error('Preview error:', error);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!url) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/media/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: url,
          entity_id: entityId || null,
          caption,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          thumbnail_url: preview?.thumbnail_url,
          embed_html: preview?.embed_html,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(data.post);
      } else {
        alert('Failed to save media');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save media');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add Media</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Paste Instagram / YouTube / Twitter URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
              />
              <button
                onClick={handlePreview}
                disabled={!url || loading}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Preview'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  preview.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {preview.success ? `✓ ${preview.platform}` : '✗ Failed'}
                </span>
                <span className="text-gray-400 text-sm">{preview.media_type}</span>
              </div>

              {preview.thumbnail_url && (
                <img
                  src={preview.thumbnail_url}
                  alt="Preview"
                  className="w-full max-h-60 object-contain rounded-lg mb-2"
                />
              )}

              {preview.title && (
                <p className="text-white text-sm">{preview.title}</p>
              )}
              {preview.author_name && (
                <p className="text-gray-400 text-xs">By: {preview.author_name}</p>
              )}
            </div>
          )}

          {/* Quick Actress Selection */}
          {showQuickActress && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                🔥 Quick Select Actress
              </label>
              <div className="flex flex-wrap gap-2">
                {TOP_ACTRESSES.map((actress) => (
                  <button
                    key={actress.name}
                    type="button"
                    onClick={() => {
                      // Find matching entity
                      const match = entities.find(e => 
                        e.name_en.toLowerCase().includes(actress.name.toLowerCase()) ||
                        e.instagram_handle === actress.instagram
                      );
                      if (match) {
                        setEntityId(match.id);
                      }
                      // Add to tags
                      setTags(prev => prev ? `${prev}, ${actress.name}` : actress.name);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-400 border border-pink-500/30 rounded-full text-xs font-medium hover:bg-pink-500/30 transition-colors"
                  >
                    {actress.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entity Selection Dropdown */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tag Celebrity</label>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Select celebrity...</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name_en} ({entity.entity_type})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Category Buttons */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              📂 Category (Quick Select)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.id
                      ? `bg-gradient-to-r ${cat.color} text-white`
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Caption (Telugu/English)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption... (e.g., 'Latest photoshoot 🔥' or 'సమంత కొత్త ఫోటోషూట్')"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hot, glamour, saree, photoshoot"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {['hot', 'glamour', 'saree', 'bikini', 'fitness', 'traditional', 'western', 'photoshoot', 'magazine'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags(prev => prev ? `${prev}, ${tag}` : tag)}
                  className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded hover:bg-gray-700"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url || saving}
            className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Media'}
          </button>
        </div>
      </div>
    </div>
  );
}
