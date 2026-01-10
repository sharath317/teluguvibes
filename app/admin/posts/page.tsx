'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import type { Post, Category } from '@/types/database';

const categoryLabels: Partial<Record<Category, string>> = {
  gossip: 'గాసిప్',
  sports: 'స్పోర్ట్స్',
  politics: 'రాజకీయాలు',
  entertainment: 'వినోదం',
  trending: 'ట్రెండింగ్',
  news: 'వార్తలు',
  movies: 'సినిమాలు',
  photos: 'ఫోటోలు',
  videos: 'వీడియోలు',
  hot: 'హాట్',
  editorial: 'ఎడిటోరియల్',
  stories: 'కథలు',
  quizzes: 'క్విజ్‌లు',
  memes: 'మీమ్స్',
  'web-series': 'వెబ్ సిరీస్',
  jobs: 'ఉద్యోగాలు',
  astrology: 'జ్యోతిషం',
  lifestyle: 'జీవనశైలి',
  reviews: 'రివ్యూలు',
  interviews: 'ఇంటర్వ్యూలు',
  features: 'ఫీచర్లు',
};

const categoryColors: Partial<Record<Category, string>> = {
  gossip: 'bg-pink-500',
  sports: 'bg-blue-500',
  politics: 'bg-red-500',
  entertainment: 'bg-purple-500',
  news: 'bg-yellow-500',
  movies: 'bg-red-600',
  photos: 'bg-violet-500',
  videos: 'bg-cyan-500',
  hot: 'bg-orange-500',
  editorial: 'bg-green-500',
  stories: 'bg-blue-600',
  quizzes: 'bg-purple-600',
  memes: 'bg-amber-500',
  'web-series': 'bg-teal-500',
  jobs: 'bg-slate-500',
  astrology: 'bg-indigo-500',
  lifestyle: 'bg-rose-500',
  reviews: 'bg-emerald-500',
  interviews: 'bg-sky-500',
  features: 'bg-fuchsia-500',
  trending: 'bg-[#eab308]',
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/posts');
      if (res.ok) {
        const data = await res.json();
        // API returns data.data, not data.posts
        setPosts(data.data || data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
        setMessage({ type: 'success', text: 'Post deleted successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete post' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete post' });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Posts ({posts.length})</h1>
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-[#737373] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Post
        </Link>
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

      {loading ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-[#262626] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-white mb-2">No posts yet</h2>
          <p className="text-[#737373] mb-6">
            Create your first post to get started!
          </p>
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create First Post
          </Link>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0a0a0a] border-b border-[#262626]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#737373]">Title</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#737373]">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#737373]">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#737373]">Views</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#737373]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-6 py-4">
                    <div className="max-w-md truncate text-white">{post.title}</div>
                    <div className="text-xs text-[#737373] mt-1">{post.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`${categoryColors[post.category] || 'bg-gray-500'} px-2 py-1 rounded text-xs font-bold text-white`}>
                      {categoryLabels[post.category] || post.category || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      post.status === 'published'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#737373]">
                    {(post.views || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {post.status === 'published' && (
                        <Link
                          href={`/post/${post.slug}`}
                          target="_blank"
                          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                          title="View live post"
                        >
                          <Eye className="w-4 h-4 text-[#737373]" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </Link>
                      <button
                        onClick={() => deletePost(post.id, post.title)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
