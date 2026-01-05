'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, MessageSquareQuote, Quote, CheckCircle,
  XCircle, Lightbulb, RefreshCw, Sparkles
} from 'lucide-react';

interface POVData {
  pov_text: string;
  pov_type: string;
  is_approved: boolean;
}

interface CitationBlock {
  id: string;
  question: string;
  answer: string;
  schema_type: string;
}

interface OptimizationCheck {
  name: string;
  passed: boolean;
  recommendation?: string;
}

interface POVSuggestion {
  suggested_type: string;
  suggested_text: string;
  reasoning: string;
}

export default function EditorialPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postId } = use(params);
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [pov, setPov] = useState<POVData | null>(null);
  const [povText, setPovText] = useState('');
  const [povType, setPovType] = useState('cultural_context');
  const [suggestions, setSuggestions] = useState<POVSuggestion[]>([]);
  const [citations, setCitations] = useState<CitationBlock[]>([]);
  const [optimization, setOptimization] = useState<{ score: number; checks: OptimizationCheck[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [postId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch post
      const postRes = await fetch(`/api/admin/posts/${postId}`);
      if (postRes.ok) {
        setPost(await postRes.json());
      }

      // Fetch POV data
      const povRes = await fetch(`/api/admin/editorial/pov?postId=${postId}`);
      if (povRes.ok) {
        const data = await povRes.json();
        if (data.pov) {
          setPov(data.pov);
          setPovText(data.pov.pov_text);
          setPovType(data.pov.pov_type);
        }
        setSuggestions(data.suggestions || []);
      }

      // Fetch citation data
      const citationRes = await fetch(`/api/admin/editorial/citations?postId=${postId}`);
      if (citationRes.ok) {
        const data = await citationRes.json();
        setCitations(data.citations || []);
        setOptimization(data.optimization || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }

  async function savePOV() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/editorial/pov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          pov_text: povText,
          pov_type: povType,
          editor_id: 'admin', // Would come from session
          editor_name: 'Admin',
        }),
      });

      if (res.ok) {
        fetchData(); // Refresh
        alert('POV saved successfully!');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to save POV');
    }
    setSaving(false);
  }

  async function generateCitations() {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/editorial/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
        }),
      });

      if (res.ok) {
        fetchData(); // Refresh
        alert('SEO optimization generated!');
      } else {
        alert('Failed to generate citations');
      }
    } catch (error) {
      alert('Failed to generate citations');
    }
    setGenerating(false);
  }

  function useSuggestion(suggestion: POVSuggestion) {
    setPovText(suggestion.suggested_text);
    setPovType(suggestion.suggested_type);
  }

  const povTypes = [
    { value: 'insider_trivia', label: 'Insider Trivia' },
    { value: 'cultural_context', label: 'Cultural Context' },
    { value: 'opinionated_framing', label: 'Editorial Opinion' },
    { value: 'industry_relevance', label: 'Industry Insight' },
    { value: 'personal_anecdote', label: 'Personal Story' },
    { value: 'prediction', label: 'Prediction' },
    { value: 'comparison', label: 'Comparison' },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/editorial"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Editorial
        </Link>
        <h1 className="text-2xl font-bold text-white">{post?.title || 'Post'}</h1>
        <p className="text-gray-400 mt-1">Add human perspective and optimize for AI citations</p>
      </div>

      {/* Optimization Score */}
      {optimization && (
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-white">Zero-Click SEO Score</h2>
            <span className={`text-2xl font-bold ${
              optimization.score >= 75 ? 'text-green-500' :
              optimization.score >= 50 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {optimization.score}%
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {optimization.checks.map((check, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  check.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {check.passed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {check.name}
                  </span>
                </div>
                {check.recommendation && (
                  <p className="text-xs text-gray-500 mt-1">{check.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Human POV Section */}
        <section className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareQuote className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-white">Human POV</h2>
            {pov?.is_approved && (
              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">POV Type</label>
              <select
                value={povType}
                onChange={(e) => setPovType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                {povTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Your Perspective (2-4 sentences)
              </label>
              <textarea
                value={povText}
                onChange={(e) => setPovText(e.target.value)}
                rows={4}
                placeholder="Add insider knowledge, cultural context, or editorial opinion..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Word count: {povText.split(/\s+/).filter(Boolean).length} (min: 20)
              </p>
            </div>

            <button
              onClick={savePOV}
              disabled={saving || povText.split(/\s+/).filter(Boolean).length < 20}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save POV'}
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-300">AI Suggestions</span>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750"
                    onClick={() => useSuggestion(s)}
                  >
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                      {povTypes.find(t => t.value === s.suggested_type)?.label}
                    </span>
                    <p className="text-sm text-gray-300 mt-2">{s.suggested_text}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to use</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Citation Blocks Section */}
        <section className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white">Citation Blocks</h2>
            </div>
            <button
              onClick={generateCitations}
              disabled={generating}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {citations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Quote className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No citation blocks yet</p>
              <p className="text-sm mt-1">Generate Q&A blocks for AI search citations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {citations.map((citation) => (
                <div
                  key={citation.id}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    {citation.schema_type}
                  </span>
                  <p className="text-white font-medium mt-2">Q: {citation.question}</p>
                  <p className="text-gray-300 text-sm mt-2">A: {citation.answer}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href={`/admin/posts/${postId}/edit`}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          Edit Post Content
        </Link>
        <button
          onClick={() => router.push('/admin/editorial')}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Done
        </button>
      </div>
    </div>
  );
}








