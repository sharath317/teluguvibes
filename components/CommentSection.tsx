'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { MessageCircle, Send, AlertCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { isPositive } from '@/lib/profanity-filter';
import type { Comment } from '@/types/database';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    fetchComments();
    subscribeToComments();
  }, [postId]);

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToComments() {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as Comment]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  function scrollToBottom() {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!authorName.trim() || !content.trim()) {
      setError('పేరు మరియు కామెంట్ అవసరం');
      return;
    }

    // Check for profanity/negativity
    if (!isPositive(content)) {
      setError('దయచేసి సానుకూల కామెంట్లు మాత్రమే పోస్ట్ చేయండి');
      return;
    }

    if (!isPositive(authorName)) {
      setError('దయచేసి సరైన పేరు నమోదు చేయండి');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        author_name: authorName.trim(),
        content: content.trim(),
      });

      if (error) throw error;

      setContent('');
      // Keep author name for convenience
    } catch (err) {
      console.error('Failed to post comment:', err);
      setError('కామెంట్ పోస్ట్ చేయడంలో విఫలమైంది');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 md:p-6">
      <h3 className="font-bold text-xl text-white flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-[#eab308]" />
        కామెంట్లు ({comments.length})
      </h3>

      {/* Comments list */}
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[#262626] rounded w-1/4 mb-2" />
                <div className="h-10 bg-[#262626] rounded" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-[#737373] py-8">
            మొదటి కామెంట్ పెట్టండి! 🎉
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="మీ పేరు"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={50}
          className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white placeholder-[#737373] focus:border-[#eab308] focus:outline-none transition-colors"
        />

        <div className="flex gap-2">
          <textarea
            placeholder="మీ కామెంట్ రాయండి... (సానుకూల కామెంట్లు మాత్రమే)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white placeholder-[#737373] focus:border-[#eab308] focus:outline-none transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !authorName.trim() || !content.trim()}
          className="flex items-center justify-center gap-2 w-full py-2 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="animate-spin">⏳</span>
              పోస్ట్ చేస్తోంది...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              కామెంట్ పోస్ట్ చేయండి
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const timeAgo = formatTimeAgo(comment.created_at);

  return (
    <div className="p-3 bg-[#0a0a0a] rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[#eab308]">{comment.author_name}</span>
        <span className="text-xs text-[#737373]">{timeAgo}</span>
      </div>
      <p className="text-[#ededed] text-sm leading-relaxed">{comment.content}</p>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ఇప్పుడే';
  if (diffMins < 60) return `${diffMins} నిమి`;
  if (diffHours < 24) return `${diffHours} గం`;
  return `${diffDays} రోజులు`;
}
