'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Eye, Edit, Trash2, Check, X,
  Instagram, Youtube, Twitter, Image as ImageIcon, Flame, Star,
  AlertTriangle, Shield, Sparkles, RefreshCw, Copy, Wand2
} from 'lucide-react';
import Image from 'next/image';
import type { MediaEntity, GlamCategory, SafetyRisk, CaptionVariant } from '@/types/media';
import { GLAM_CATEGORIES } from '@/types/media';

// Safety badge colors
const SAFETY_COLORS: Record<SafetyRisk, { bg: string; text: string; icon: string }> = {
  safe: { bg: 'bg-green-500/20', text: 'text-green-500', icon: '✅' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', icon: '🟢' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', icon: '🟡' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-500', icon: '🟠' },
  blocked: { bg: 'bg-red-500/20', text: 'text-red-500', icon: '🔴' },
  pending: { bg: 'bg-gray-500/20', text: 'text-gray-500', icon: '⏳' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  archived: 'bg-gray-500/20 text-gray-500',
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  twitter: <Twitter className="w-4 h-4 text-blue-400" />,
  image: <ImageIcon className="w-4 h-4 text-gray-400" />,
};

interface HotMedia {
  id: string;
  entity_id?: string;
  entity_name?: string;
  entity_type?: string;
  platform: string;
  source_url?: string;
  embed_html?: string;
  thumbnail_url?: string;
  category: string;
  tags: string[];
  ai_caption_variants: CaptionVariant[];
  selected_caption?: string;
  caption_te?: string;
  confidence_score: number;
  safety_risk: SafetyRisk;
  requires_review: boolean;
  is_blocked: boolean;
  is_featured: boolean;
  is_hot: boolean;
  status: string;
  views: number;
  created_at: string;
  media_entities?: MediaEntity;
}

export default function AdminHotMediaPage() {
  const router = useRouter();
  const [media, setMedia] = useState<HotMedia[]>([]);
  const [entities, setEntities] = useState<MediaEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        params.set('limit', '50');

        const [mediaRes, entitiesRes] = await Promise.all([
          fetch(`/api/hot-media?${params.toString()}`),
          fetch('/api/hot-media/entities?limit=100'),
        ]);

        const mediaData = await mediaRes.json();
        const entitiesData = await entitiesRes.json();

        setMedia(mediaData.media || []);
        setEntities(entitiesData.entities || []);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchData();
  }, [statusFilter, categoryFilter]);

  // Actions
  async function handleApprove(id: string) {
    try {
      await fetch(`/api/hot-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      setMedia(media.map(m => m.id === id ? { ...m, status: 'approved' } : m));
    } catch (error) {
      console.error('Approve error:', error);
    }
  }

  async function handleReject(id: string) {
    try {
      await fetch(`/api/hot-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      setMedia(media.map(m => m.id === id ? { ...m, status: 'rejected' } : m));
    } catch (error) {
      console.error('Reject error:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this hot media?')) return;
    try {
      await fetch(`/api/hot-media/${id}`, { method: 'DELETE' });
      setMedia(media.filter(m => m.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  async function handleToggle(id: string, field: 'is_hot' | 'is_featured', currentValue: boolean) {
    try {
      await fetch(`/api/hot-media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      setMedia(media.map(m => m.id === id ? { ...m, [field]: !currentValue } : m));
    } catch (error) {
      console.error('Toggle error:', error);
    }
  }

  // Stats
  const stats = {
    pending: media.filter(m => m.status === 'pending').length,
    approved: media.filter(m => m.status === 'approved').length,
    needsReview: media.filter(m => m.requires_review).length,
    blocked: media.filter(m => m.is_blocked).length,
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Flame className="w-6 h-6 text-orange-500" />
            Hot Media Manager
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>AI-powered glamour content management</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
        >
          <Plus className="w-5 h-5" />
          Add Hot Media
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.pending}</div>
          <div className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>⏳</span> Pending Review
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          <div className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>✅</span> Approved
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="text-2xl font-bold text-yellow-500">{stats.needsReview}</div>
          <div className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>🟡</span> Needs Review
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="text-2xl font-bold text-red-500">{stats.blocked}</div>
          <div className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>🔴</span> Blocked
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
              style={{
                backgroundColor: statusFilter === status ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                color: statusFilter === status ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <option value="all">All Categories</option>
          {GLAM_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
          ))}
        </select>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Flame className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No hot media found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
          >
            Add First Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onDelete={() => handleDelete(item.id)}
              onToggleHot={() => handleToggle(item.id, 'is_hot', item.is_hot)}
              onToggleFeatured={() => handleToggle(item.id, 'is_featured', item.is_featured)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddHotMediaModal
          entities={entities}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newMedia) => {
            setMedia([newMedia, ...media]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Media Card with Safety Badge
function MediaCard({
  item,
  onApprove,
  onReject,
  onDelete,
  onToggleHot,
  onToggleFeatured,
}: {
  item: HotMedia;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onToggleHot: () => void;
  onToggleFeatured: () => void;
}) {
  const safety = SAFETY_COLORS[item.safety_risk] || SAFETY_COLORS.pending;
  const category = GLAM_CATEGORIES.find(c => c.id === item.category);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Thumbnail */}
      <div className="relative aspect-video">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            {PLATFORM_ICONS[item.platform]}
          </div>
        )}

        {/* Safety Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${safety.bg} ${safety.text}`}>
          <span>{safety.icon}</span>
          <span className="capitalize">{item.safety_risk}</span>
        </div>

        {/* Platform Badge */}
        <div className="absolute top-2 left-2 p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          {PLATFORM_ICONS[item.platform]}
        </div>

        {/* Status Overlay */}
        {item.status === 'pending' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-3 py-1 bg-yellow-500/90 text-black rounded-full text-sm font-medium">
              Pending Review
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Entity & Category */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
            {item.entity_name || 'Unknown'}
          </span>
          {category && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {category.emoji} {category.label}
            </span>
          )}
        </div>

        {/* Caption Preview */}
        <p className="text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {item.selected_caption || 'No caption'}
        </p>

        {/* AI Confidence */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.confidence_score}%`,
                backgroundColor: item.confidence_score > 70 ? '#22c55e' : item.confidence_score > 40 ? '#eab308' : '#ef4444'
              }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {item.confidence_score}% AI
          </span>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-1">
            {item.status === 'pending' && (
              <>
                <button onClick={onApprove} className="p-1.5 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30" title="Approve">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={onReject} className="p-1.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30" title="Reject">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onToggleHot}
              className={`p-1.5 rounded ${item.is_hot ? 'bg-orange-500/20 text-orange-500' : ''}`}
              style={{ backgroundColor: item.is_hot ? undefined : 'var(--bg-tertiary)', color: item.is_hot ? undefined : 'var(--text-tertiary)' }}
              title="Toggle Hot"
            >
              <Flame className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleFeatured}
              className={`p-1.5 rounded ${item.is_featured ? 'bg-yellow-500/20 text-yellow-500' : ''}`}
              style={{ backgroundColor: item.is_featured ? undefined : 'var(--bg-tertiary)', color: item.is_featured ? undefined : 'var(--text-tertiary)' }}
              title="Toggle Featured"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <Eye className="w-3 h-3 inline mr-1" />{item.views}
            </span>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-500" style={{ color: 'var(--text-tertiary)' }} title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Entity Buttons
const QUICK_ENTITIES = [
  'Samantha', 'Rashmika', 'Pooja Hegde', 'Kajal', 'Tamanna',
  'Anupama', 'Sreemukhi', 'Anasuya', 'Keerthy', 'Nabha'
];

// Add Hot Media Modal with AI Analysis
function AddHotMediaModal({
  entities,
  onClose,
  onSuccess,
}: {
  entities: MediaEntity[];
  onClose: () => void;
  onSuccess: (media: HotMedia) => void;
}) {
  const [step, setStep] = useState<'paste' | 'analyze' | 'review'>('paste');
  const [url, setUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [category, setCategory] = useState<string>('');
  const [customCaption, setCustomCaption] = useState('');

  // Analyze URL
  async function handleAnalyze() {
    if (!url) return;
    setLoading(true);
    setStep('analyze');

    try {
      const res = await fetch('/api/hot-media/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, entity_name: entityName || 'Celebrity' }),
      });

      const data = await res.json();

      if (data.success) {
        setAnalysis(data);
        setCategory(data.analysis.suggestedCategory);
        setStep('review');
      } else {
        alert(data.error || 'Analysis failed');
        setStep('paste');
      }
    } catch (error) {
      console.error('Analyze error:', error);
      alert('Analysis failed');
      setStep('paste');
    }

    setLoading(false);
  }

  // Save media
  async function handleSave() {
    setSaving(true);

    try {
      const selectedCaption = analysis?.analysis?.captions?.[selectedCaptionIndex]?.text || customCaption;

      const res = await fetch('/api/hot-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          entity_id: entityId || null,
          entity_name: entityName,
          category,
          caption_override: selectedCaption,
          is_featured: false,
          is_hot: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.media);
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save');
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wand2 className="w-5 h-5 text-purple-500" />
            Add Hot Media (AI-Powered)
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1: Paste URL */}
          {step === 'paste' && (
            <>
              {/* URL Input */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Paste Instagram / YouTube / Twitter URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  className="w-full px-4 py-3 rounded-lg text-base"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)'
                  }}
                />
              </div>

              {/* Quick Entity Selection */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  🔥 Quick Select Celebrity
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ENTITIES.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setEntityName(name);
                        const match = entities.find(e => e.name_en.toLowerCase().includes(name.toLowerCase()));
                        if (match) setEntityId(match.id);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        entityName === name
                          ? 'bg-pink-500 text-white'
                          : 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entity Dropdown */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Or Select from List
                </label>
                <select
                  value={entityId}
                  onChange={(e) => {
                    setEntityId(e.target.value);
                    const entity = entities.find(ent => ent.id === e.target.value);
                    if (entity) setEntityName(entity.name_en);
                  }}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  <option value="">Select celebrity...</option>
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name_en} ({entity.entity_type})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!url}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
              >
                <Sparkles className="w-5 h-5" />
                Analyze with AI
              </button>
            </>
          )}

          {/* Step 2: Loading */}
          {step === 'analyze' && loading && (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin" style={{ color: 'var(--brand-primary)' }} />
              <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
                AI is analyzing the content...
              </p>
              <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
                <p>✓ Validating URL</p>
                <p>✓ Fetching embed data</p>
                <p>✓ Generating captions</p>
                <p>✓ Running safety check</p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && analysis && (
            <>
              {/* Preview */}
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  {PLATFORM_ICONS[analysis.validation.platform]}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {analysis.validation.platformInfo.name}
                  </span>
                  {analysis.embed.authorName && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      by {analysis.embed.authorName}
                    </span>
                  )}
                </div>

                {analysis.embed.thumbnailUrl && (
                  <Image
                    src={analysis.embed.thumbnailUrl}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="w-full rounded-lg object-cover"
                    unoptimized
                  />
                )}
              </div>

              {/* Safety Badge */}
              <div className={`flex items-center gap-3 p-3 rounded-lg ${SAFETY_COLORS[analysis.safety.risk as SafetyRisk]?.bg}`}>
                <Shield className={`w-5 h-5 ${SAFETY_COLORS[analysis.safety.risk as SafetyRisk]?.text}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${SAFETY_COLORS[analysis.safety.risk as SafetyRisk]?.text}`}>
                      {analysis.safety.badge.icon} {analysis.safety.badge.label}
                    </span>
                    {analysis.safety.autoApproveEligible && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                        Auto-approve eligible
                      </span>
                    )}
                  </div>
                  {analysis.safety.requiresReview && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      ⚠️ Manual review required
                    </p>
                  )}
                </div>
              </div>

              {/* AI Captions */}
              <div>
                <label className="block text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Wand2 className="w-4 h-4 text-purple-500" />
                  AI-Generated Captions (Select one)
                </label>
                <div className="space-y-2">
                  {analysis.analysis.captions.map((caption: CaptionVariant, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedCaptionIndex(index)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedCaptionIndex === index ? 'border-purple-500' : ''
                      }`}
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: selectedCaptionIndex === index ? 'rgb(168, 85, 247)' : 'var(--border-primary)'
                      }}
                    >
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{caption.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                          {caption.style}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {Math.round(caption.confidence * 100)}% confidence
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Caption */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Or Write Custom Caption
                </label>
                <textarea
                  value={customCaption}
                  onChange={(e) => {
                    setCustomCaption(e.target.value);
                    if (e.target.value) setSelectedCaptionIndex(-1);
                  }}
                  placeholder="Type your own caption..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg resize-none"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)'
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Category (AI Suggested: {analysis.analysis.suggestedCategory})
                </label>
                <div className="flex flex-wrap gap-2">
                  {GLAM_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        category === cat.id
                          ? `bg-gradient-to-r ${cat.color} text-white`
                          : ''
                      }`}
                      style={{
                        backgroundColor: category === cat.id ? undefined : 'var(--bg-tertiary)',
                        color: category === cat.id ? undefined : 'var(--text-secondary)'
                      }}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => { setStep('paste'); setAnalysis(null); }}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || analysis.safety.risk === 'blocked'}
                  className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : analysis.safety.risk === 'blocked' ? (
                    '🚫 Blocked - Cannot Save'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Hot Media
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

