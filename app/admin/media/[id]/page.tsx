'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye, ExternalLink } from 'lucide-react';
import { EmbedRenderer } from '@/components/media/EmbedRenderer';
import type { MediaPost, MediaEntity, MediaCategory, MediaStatus } from '@/types/media';

const CATEGORIES: MediaCategory[] = [
  'general', 'photoshoot', 'event', 'movie_promotion',
  'traditional', 'casual', 'fitness', 'travel', 'behind_the_scenes'
];

const STATUSES: MediaStatus[] = ['pending', 'approved', 'rejected', 'archived'];

export default function EditMediaPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<MediaPost | null>(null);
  const [entities, setEntities] = useState<MediaEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    entity_id: '',
    title: '',
    caption: '',
    caption_te: '',
    tags: '',
    category: 'general' as MediaCategory,
    status: 'pending' as MediaStatus,
    is_featured: false,
    is_hot: false,
    moderation_notes: '',
  });

  // Fetch post and entities
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [postRes, entitiesRes] = await Promise.all([
          fetch(`/api/admin/media/posts/${id}`),
          fetch('/api/admin/media/entities?limit=100'),
        ]);

        if (!postRes.ok) {
          alert('Post not found');
          router.push('/admin/media');
          return;
        }

        const postData = await postRes.json();
        const entitiesData = await entitiesRes.json();

        setPost(postData.post);
        setEntities(entitiesData.entities || []);

        // Populate form
        setFormData({
          entity_id: postData.post.entity_id || '',
          title: postData.post.title || '',
          caption: postData.post.caption || '',
          caption_te: postData.post.caption_te || '',
          tags: (postData.post.tags || []).join(', '),
          category: postData.post.category || 'general',
          status: postData.post.status || 'pending',
          is_featured: postData.post.is_featured || false,
          is_hot: postData.post.is_hot || false,
          moderation_notes: postData.post.moderation_notes || '',
        });
      } catch (error) {
        console.error('Fetch error:', error);
        alert('Failed to load post');
      }
      setLoading(false);
    }

    if (id) {
      fetchData();
    }
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: formData.entity_id || null,
          title: formData.title || null,
          caption: formData.caption || null,
          caption_te: formData.caption_te || null,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          category: formData.category,
          status: formData.status,
          is_featured: formData.is_featured,
          is_hot: formData.is_hot,
          moderation_notes: formData.moderation_notes || null,
        }),
      });

      if (res.ok) {
        router.push('/admin/media');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save changes');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this media post?')) return;

    try {
      const res = await fetch(`/api/admin/media/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/media');
      } else {
        alert('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete');
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/4" />
          <div className="h-64 bg-gray-800 rounded" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Post not found</p>
      </div>
    );
  }

  const hasEmbed = post.embed_html && post.media_type !== 'image';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Media Post</h1>
            <p className="text-gray-400 text-sm">
              {post.media_type.replace('_', ' ')} • {post.source}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={post.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Original
          </a>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-medium text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </h3>
          </div>
          <div className="p-4">
            {hasEmbed ? (
              <EmbedRenderer
                embedHtml={post.embed_html!}
                mediaType={post.media_type}
                fallbackThumbnail={post.thumbnail_url}
                title={post.title}
              />
            ) : (
              <img
                src={post.image_url || post.thumbnail_url || '/placeholder-media.svg'}
                alt={post.title || 'Media'}
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">{post.views.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">Views</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{post.likes.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">Likes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{post.shares.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">Shares</div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          {/* Entity */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tagged Celebrity</label>
            <select
              value={formData.entity_id}
              onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">None</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name_en} ({entity.entity_type})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Optional title..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Caption (English)</label>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              placeholder="Add a caption..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Caption (Telugu)</label>
            <textarea
              value={formData.caption_te}
              onChange={(e) => setFormData({ ...formData, caption_te: e.target.value })}
              placeholder="తెలుగులో వివరణ..."
              rows={2}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="hot, saree, photoshoot"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MediaCategory })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MediaStatus })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_hot}
                onChange={(e) => setFormData({ ...formData, is_hot: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-white">🔥 Hot</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-white">⭐ Featured</span>
            </label>
          </div>

          {/* Moderation Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Moderation Notes (Internal)</label>
            <textarea
              value={formData.moderation_notes}
              onChange={(e) => setFormData({ ...formData, moderation_notes: e.target.value })}
              placeholder="Internal notes..."
              rows={2}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
