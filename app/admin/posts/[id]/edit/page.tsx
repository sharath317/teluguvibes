'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Eye, Trash2, AlertTriangle, 
  CheckCircle, Shield, FileText, Plus, X, Info
} from 'lucide-react';
import type { Post, Category } from '@/types/database';
import {
  ContentSector,
  ContentType,
  VerificationStatus,
  AudienceProfile,
  ContentSensitivityLevel,
  SECTOR_DEFINITIONS,
  CONTENT_TYPE_LABELS,
  AUDIENCE_PROFILE_LABELS,
  SENSITIVITY_LEVEL_CONFIG,
  VERIFICATION_STATUS_CONFIG,
  getSectorOptions,
  getSubsectorOptions,
  getContentTypeOptions,
  getSectorDefinition,
  requiresFictionalLabel,
  getRequiredDisclaimerType,
  isContentTypeAllowedForSector,
} from '@/types/content-sectors';

// Legacy categories for backward compatibility
const categories: { value: Category; label: string }[] = [
  { value: 'gossip', label: 'గాసిప్ (Gossip)' },
  { value: 'sports', label: 'స్పోర్ట్స్ (Sports)' },
  { value: 'politics', label: 'రాజకీయాలు (Politics)' },
  { value: 'entertainment', label: 'వినోదం (Entertainment)' },
  { value: 'trending', label: 'ట్రెండింగ్ (Trending)' },
];

// Extended post interface with new fields
interface ExtendedPost extends Post {
  content_type?: ContentType;
  content_sector?: ContentSector;
  content_subsector?: string;
  audience_profile?: AudienceProfile;
  sensitivity_level?: ContentSensitivityLevel;
  fact_confidence_score?: number;
  source_count?: number;
  source_refs?: Array<{ id: string; sourceName: string; sourceUrl?: string; trustLevel: number }>;
  verification_status?: VerificationStatus;
  fictional_label?: boolean;
  requires_disclaimer?: boolean;
  disclaimer_type?: string;
  historical_period?: string;
  geo_context?: string;
  age_group?: string;
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [post, setPost] = useState<ExtendedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Basic form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [teluguBody, setTeluguBody] = useState('');
  const [category, setCategory] = useState<Category>('entertainment');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [imageUrls, setImageUrls] = useState('');

  // New content platform fields
  const [contentType, setContentType] = useState<ContentType>('article');
  const [contentSector, setContentSector] = useState<ContentSector>('general');
  const [contentSubsector, setContentSubsector] = useState<string>('');
  const [audienceProfile, setAudienceProfile] = useState<AudienceProfile>('general');
  const [sensitivityLevel, setSensitivityLevel] = useState<ContentSensitivityLevel>('none');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('draft');
  const [factConfidenceScore, setFactConfidenceScore] = useState(0);
  const [fictionalLabel, setFictionalLabel] = useState(false);
  const [requiresDisclaimer, setRequiresDisclaimer] = useState(false);
  const [disclaimerType, setDisclaimerType] = useState('');
  const [historicalPeriod, setHistoricalPeriod] = useState('');
  const [geoContext, setGeoContext] = useState('');
  
  // Source references
  const [sourceRefs, setSourceRefs] = useState<Array<{
    id: string;
    sourceName: string;
    sourceUrl: string;
    trustLevel: number;
  }>>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  // Auto-update based on sector changes
  useEffect(() => {
    const sectorDef = getSectorDefinition(contentSector);
    
    // Update audience profile to sector default
    if (sectorDef.defaultAudienceProfile !== audienceProfile) {
      setAudienceProfile(sectorDef.defaultAudienceProfile);
    }
    
    // Check if fictional label is required
    if (requiresFictionalLabel(contentSector) && !fictionalLabel) {
      setFictionalLabel(true);
      setMessage({ 
        type: 'warning', 
        text: `${sectorDef.name} requires fictional label to be set` 
      });
    }
    
    // Check if disclaimer is required
    const requiredDisclaimer = getRequiredDisclaimerType(contentSector);
    if (requiredDisclaimer && !requiresDisclaimer) {
      setRequiresDisclaimer(true);
      setDisclaimerType(requiredDisclaimer);
    }
    
    // Reset subsector if sector changes
    setContentSubsector('');
  }, [contentSector]);

  async function fetchPost() {
    try {
      const res = await fetch(`/api/admin/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedPost = data.post as ExtendedPost;
        setPost(fetchedPost);
        
        // Basic fields
        setTitle(fetchedPost.title);
        setSlug(fetchedPost.slug);
        setTeluguBody(fetchedPost.telugu_body || '');
        setCategory(fetchedPost.category);
        setStatus(fetchedPost.status === 'published' ? 'published' : 'draft');
        setImageUrls(fetchedPost.image_urls?.join('\n') || '');
        
        // Extended fields
        setContentType(fetchedPost.content_type || 'article');
        setContentSector(fetchedPost.content_sector || 'general');
        setContentSubsector(fetchedPost.content_subsector || '');
        setAudienceProfile(fetchedPost.audience_profile || 'general');
        setSensitivityLevel(fetchedPost.sensitivity_level || 'none');
        setVerificationStatus(fetchedPost.verification_status || 'draft');
        setFactConfidenceScore(fetchedPost.fact_confidence_score || 0);
        setFictionalLabel(fetchedPost.fictional_label || false);
        setRequiresDisclaimer(fetchedPost.requires_disclaimer || false);
        setDisclaimerType(fetchedPost.disclaimer_type || '');
        setHistoricalPeriod(fetchedPost.historical_period || '');
        setGeoContext(fetchedPost.geo_context || '');
        setSourceRefs((fetchedPost.source_refs || []).map(ref => ({
          ...ref,
          sourceUrl: ref.sourceUrl || ''
        })));
        
        // Show advanced if any extended fields are set
        if (fetchedPost.content_sector && fetchedPost.content_sector !== 'general') {
          setShowAdvanced(true);
        }
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
    
    // Check if verification status is locked
    if (verificationStatus === 'locked') {
      setMessage({ type: 'error', text: 'Locked content cannot be edited' });
      return;
    }
    
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Basic fields
          title,
          slug,
          telugu_body: teluguBody,
          category,
          status,
          image_urls: imageUrls.split('\n').map(url => url.trim()).filter(Boolean),
          
          // Extended fields
          content_type: contentType,
          content_sector: contentSector,
          content_subsector: contentSubsector || null,
          audience_profile: audienceProfile,
          sensitivity_level: sensitivityLevel,
          verification_status: verificationStatus,
          fact_confidence_score: factConfidenceScore,
          source_count: sourceRefs.length,
          source_refs: sourceRefs,
          fictional_label: fictionalLabel,
          requires_disclaimer: requiresDisclaimer,
          disclaimer_type: requiresDisclaimer ? disclaimerType : null,
          historical_period: historicalPeriod || null,
          geo_context: geoContext || null,
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

  function addSource() {
    if (!newSourceName.trim()) return;
    
    const newSource = {
      id: Date.now().toString(),
      sourceName: newSourceName.trim(),
      sourceUrl: newSourceUrl.trim(),
      trustLevel: 0.5,
    };
    
    setSourceRefs([...sourceRefs, newSource]);
    setNewSourceName('');
    setNewSourceUrl('');
  }

  function removeSource(sourceId: string) {
    setSourceRefs(sourceRefs.filter(s => s.id !== sourceId));
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

  const sectorDef = getSectorDefinition(contentSector);
  const subsectorOptions = getSubsectorOptions(contentSector);
  const verificationConfig = VERIFICATION_STATUS_CONFIG[verificationStatus];
  const sensitivityConfig = SENSITIVITY_LEVEL_CONFIG[sensitivityLevel];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#737373]" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Post</h1>
          
          {/* Verification Badge */}
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: verificationConfig.color + '20', color: verificationConfig.color }}
          >
            {verificationConfig.label}
          </span>
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

      {/* Messages */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/50 text-green-400'
            : message.type === 'warning'
            ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400'
            : 'bg-red-500/10 border border-red-500/50 text-red-400'
        }`}>
          {message.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Locked Warning */}
      {verificationStatus === 'locked' && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/50 text-blue-400 flex items-center gap-3">
          <Shield className="w-5 h-5" />
          This content is locked and cannot be edited. Contact an admin to unlock.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Fields Section */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Basic Information
          </h2>
          
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
              disabled={verificationStatus === 'locked'}
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
              disabled={verificationStatus === 'locked'}
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
                disabled={verificationStatus === 'locked'}
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
                disabled={verificationStatus === 'locked'}
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
              disabled={verificationStatus === 'locked'}
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
              disabled={verificationStatus === 'locked'}
            />
          </div>
        </div>

        {/* Content Platform Fields Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-xl text-white hover:bg-[#222] transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#eab308]" />
            Content Intelligence & Classification
          </span>
          <span className="text-[#737373]">
            {showAdvanced ? '▼' : '▶'}
          </span>
        </button>

        {/* Content Platform Fields Section */}
        {showAdvanced && (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-6">
            {/* Sector & Type */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Content Sector
                </label>
                <select
                  value={contentSector}
                  onChange={(e) => setContentSector(e.target.value as ContentSector)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  disabled={verificationStatus === 'locked'}
                >
                  {getSectorOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {subsectorOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[#737373] mb-2">
                    Subsector
                  </label>
                  <select
                    value={contentSubsector}
                    onChange={(e) => setContentSubsector(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                    disabled={verificationStatus === 'locked'}
                  >
                    <option value="">Select subsector...</option>
                    {subsectorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  disabled={verificationStatus === 'locked'}
                >
                  {getContentTypeOptions().map((opt) => (
                    <option 
                      key={opt.value} 
                      value={opt.value}
                      disabled={!isContentTypeAllowedForSector(opt.value, contentSector)}
                    >
                      {opt.label} {!isContentTypeAllowedForSector(opt.value, contentSector) ? '(not allowed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audience & Sensitivity */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Audience Profile
                </label>
                <select
                  value={audienceProfile}
                  onChange={(e) => setAudienceProfile(e.target.value as AudienceProfile)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  disabled={verificationStatus === 'locked'}
                >
                  {Object.entries(AUDIENCE_PROFILE_LABELS).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label} ({config.ageRange})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Sensitivity Level
                </label>
                <select
                  value={sensitivityLevel}
                  onChange={(e) => setSensitivityLevel(e.target.value as ContentSensitivityLevel)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  disabled={verificationStatus === 'locked'}
                  style={{ borderColor: sensitivityConfig.color }}
                >
                  {Object.entries(SENSITIVITY_LEVEL_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
                {sensitivityConfig.requiresWarning && (
                  <p className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Requires content warning
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Verification Status
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  style={{ borderColor: verificationConfig.color }}
                >
                  {Object.entries(VERIFICATION_STATUS_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Labels & Toggles */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg">
                <input
                  type="checkbox"
                  id="fictionalLabel"
                  checked={fictionalLabel}
                  onChange={(e) => setFictionalLabel(e.target.checked)}
                  className="w-5 h-5 rounded border-[#262626] bg-[#0a0a0a] text-[#eab308] focus:ring-[#eab308]"
                  disabled={verificationStatus === 'locked' || requiresFictionalLabel(contentSector)}
                />
                <label htmlFor="fictionalLabel" className="text-white">
                  <span className="font-medium">Fictional/Speculative Content</span>
                  <p className="text-xs text-[#737373] mt-1">
                    Mark if this is fictional, speculative, or what-if content
                  </p>
                </label>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg">
                <input
                  type="checkbox"
                  id="requiresDisclaimer"
                  checked={requiresDisclaimer}
                  onChange={(e) => setRequiresDisclaimer(e.target.checked)}
                  className="w-5 h-5 rounded border-[#262626] bg-[#0a0a0a] text-[#eab308] focus:ring-[#eab308]"
                  disabled={verificationStatus === 'locked' || !!getRequiredDisclaimerType(contentSector)}
                />
                <label htmlFor="requiresDisclaimer" className="text-white">
                  <span className="font-medium">Requires Disclaimer</span>
                  <p className="text-xs text-[#737373] mt-1">
                    Add a disclaimer notice to this content
                  </p>
                </label>
              </div>
            </div>

            {/* Disclaimer Type */}
            {requiresDisclaimer && (
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Disclaimer Type
                </label>
                <select
                  value={disclaimerType}
                  onChange={(e) => setDisclaimerType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  disabled={verificationStatus === 'locked'}
                >
                  <option value="">Select disclaimer type...</option>
                  <option value="medical">Medical Disclaimer</option>
                  <option value="legal">Legal Disclaimer</option>
                  <option value="fictional">Fictional Content Notice</option>
                  <option value="sensitive">Sensitive Content Warning</option>
                  <option value="kids_parental">Parental Guidance</option>
                </select>
              </div>
            )}

            {/* Confidence Score */}
            <div>
              <label className="block text-sm font-medium text-[#737373] mb-2">
                Fact Confidence Score: {factConfidenceScore}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={factConfidenceScore}
                onChange={(e) => setFactConfidenceScore(Number(e.target.value))}
                className="w-full h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer"
                disabled={verificationStatus === 'locked'}
              />
              <div className="flex justify-between text-xs text-[#737373] mt-1">
                <span>Unverified</span>
                <span>Fully Verified</span>
              </div>
            </div>

            {/* Context Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Historical Period
                </label>
                <input
                  type="text"
                  value={historicalPeriod}
                  onChange={(e) => setHistoricalPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  placeholder="e.g., 1990s, Golden Era, Pre-Independence"
                  disabled={verificationStatus === 'locked'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Geographic Context
                </label>
                <input
                  type="text"
                  value={geoContext}
                  onChange={(e) => setGeoContext(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                  placeholder="e.g., Telangana, Andhra Pradesh, Tollywood"
                  disabled={verificationStatus === 'locked'}
                />
              </div>
            </div>

            {/* Source References */}
            <div>
              <label className="block text-sm font-medium text-[#737373] mb-2">
                Source References ({sourceRefs.length})
              </label>
              
              {/* Existing Sources */}
              {sourceRefs.length > 0 && (
                <div className="space-y-2 mb-4">
                  {sourceRefs.map((source) => (
                    <div 
                      key={source.id}
                      className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#262626] rounded-lg"
                    >
                      <div>
                        <span className="text-white font-medium">{source.sourceName}</span>
                        {source.sourceUrl && (
                          <a 
                            href={source.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-[#eab308] hover:underline"
                          >
                            View Source
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSource(source.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                        disabled={verificationStatus === 'locked'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add New Source */}
              {verificationStatus !== 'locked' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                    placeholder="Source name..."
                  />
                  <input
                    type="url"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] transition-colors"
                    placeholder="Source URL (optional)..."
                  />
                  <button
                    type="button"
                    onClick={addSource}
                    className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Sector Info */}
            <div className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#eab308] mt-0.5" />
                <div>
                  <h4 className="text-white font-medium">{sectorDef.icon} {sectorDef.name}</h4>
                  <p className="text-sm text-[#737373] mt-1">{sectorDef.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sectorDef.requiresFictionalLabel && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                        Requires Fictional Label
                      </span>
                    )}
                    {sectorDef.requiresDisclaimer && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Requires {sectorDef.disclaimerType} Disclaimer
                      </span>
                    )}
                    <span 
                      className="px-2 py-1 text-xs rounded"
                      style={{ 
                        backgroundColor: sectorDef.color + '20', 
                        color: sectorDef.color 
                      }}
                    >
                      {sectorDef.isFamilySafeDefault ? 'Family Safe' : 'Adult Content'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/posts"
            className="px-6 py-3 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || verificationStatus === 'locked'}
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
