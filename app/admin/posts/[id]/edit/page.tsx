'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import type { Post, Category } from '@/types/database';

const categories: { value: Category; label: string }[] = [
  { value: 'gossip', label: 'గాసిప్ (Gossip)' },
  { value: 'sports', label: 'స్పోర్ట్స్ (Sports)' },
  { value: 'politics', label: 'రాజకీయాలు (Politics)' },
  { value: 'entertainment', label: 'వినోదం (Entertainment)' },
  { value: 'trending', label: 'ట్రెండింగ్ (Trending)' },
];

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [teluguBody, setTeluguBody] = useState('');
  const [category, setCategory] = useState<Category>('entertainment');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [imageUrls, setImageUrls] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  async function fetchPost() {
    try {
      const res = await fetch(`/api/admin/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedPost = data.post;
        setPost(fetchedPost);
        setTitle(fetchedPost.title);
        setSlug(fetchedPost.slug);
        setTeluguBody(fetchedPost.telugu_body);
        setCategory(fetchedPost.category);
        setStatus(fetchedPost.status);
        setImageUrls(fetchedPost.image_urls?.join('\n') || '');
      } else {
        setMessage({ type: 'error', text: 'Post not found' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load post' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          telugu_body: teluguBody,
          category,
          status,
          image_urls: imageUrls.split('\n').map(url => url.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Post saved successfully!' });
        setTimeout(() => router.push('/admin/posts'), 1500);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save post' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save post' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/posts');
      } else {
        setMessage({ type: 'error', text: 'Failed to delete post' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete post' });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#262626] rounded animate-pulse" />
        <div className="h-96 bg-[#262626] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-4">Post Not Found</h1>
        <Link href="/admin/posts" className="text-[#eab308] hover:underline">
          ← Back to Posts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#737373]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Post</h1>
        </div>
        <div className="flex items-center gap-2">
          {status === 'published' && (
            <Link
              href={`/post/${slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/50 text-green-400'
            : 'bg-red-500/10 border border-red-500/50 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#737373] mb-2">
              Title (శీర్షిక)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
              placeholder="Enter post title..."
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-[#737373] mb-2">
              Slug (URL)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors font-mono text-sm"
              placeholder="post-url-slug"
              required
            />
          </div>

          {/* Category & Status */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#737373] mb-2">
                Category (విభాగం)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#737373] mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Telugu Body */}
          <div>
            <label className="block text-sm font-medium text-[#737373] mb-2">
              Content (తెలుగు కంటెంట్)
            </label>
            <textarea
              value={teluguBody}
              onChange={(e) => setTeluguBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors resize-y"
              placeholder="వార్త కంటెంట్ ఇక్కడ రాయండి..."
              required
            />
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-sm font-medium text-[#737373] mb-2">
              Image URLs (one per line)
            </label>
            <textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors font-mono text-sm"
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

