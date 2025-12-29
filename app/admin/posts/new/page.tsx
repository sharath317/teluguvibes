'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/types/database';

const categories: { value: Category; label: string }[] = [
  { value: 'gossip', label: 'గాసిప్' },
  { value: 'sports', label: 'స్పోర్ట్స్' },
  { value: 'politics', label: 'రాజకీయాలు' },
  { value: 'entertainment', label: 'వినోదం' },
  { value: 'trending', label: 'ట్రెండింగ్' },
];

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [teluguBody, setTeluguBody] = useState('');
  const [category, setCategory] = useState<Category>('entertainment');
  const [imageUrls, setImageUrls] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          telugu_body: teluguBody,
          category,
          image_urls: imageUrls.split('\n').filter(Boolean),
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create post');
      }

      router.push('/admin/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/posts"
          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#737373]" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Create New Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Title (శీర్షిక) *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="వార్త శీర్షిక రాయండి..."
            className="w-full px-4 py-3 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-[#737373] focus:border-[#eab308] focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Category (విభాగం) *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-3 bg-[#141414] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Telugu Body */}
        <div>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Content (విషయం) *
          </label>
          <textarea
            value={teluguBody}
            onChange={(e) => setTeluguBody(e.target.value)}
            required
            rows={12}
            placeholder="వార్త విషయం తెలుగులో రాయండి..."
            className="w-full px-4 py-3 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-[#737373] focus:border-[#eab308] focus:outline-none resize-none"
          />
          <p className="text-xs text-[#737373] mt-1">
            Tip: Use double line breaks for paragraphs
          </p>
        </div>

        {/* Image URLs */}
        <div>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image URLs (one per line)
            </span>
          </label>
          <textarea
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            rows={3}
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            className="w-full px-4 py-3 bg-[#141414] border border-[#262626] rounded-lg text-white placeholder-[#737373] focus:border-[#eab308] focus:outline-none resize-none font-mono text-sm"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Status
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="w-4 h-4 accent-[#eab308]"
              />
              <span className="text-[#ededed]">Save as Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="w-4 h-4 accent-[#eab308]"
              />
              <span className="text-[#ededed]">Publish Now</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Post'}
          </button>
          <Link
            href="/admin/posts"
            className="px-6 py-3 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

