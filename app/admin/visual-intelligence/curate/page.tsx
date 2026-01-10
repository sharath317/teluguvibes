'use client';

/**
 * ARCHIVAL IMAGE CURATION PAGE
 * 
 * Admin interface for adding and managing archival images with proper
 * source provenance, licensing, and attribution.
 * 
 * Features:
 * - Movie search and selection
 * - Image URL input with preview
 * - Source type and license selection
 * - Attribution text generation
 * - Bulk CSV import
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Image as ImageIcon,
  Upload,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  Eye,
  Plus,
  FileText,
  Building,
  Newspaper,
  BookOpen,
  Users,
  Film,
} from 'lucide-react';
import {
  KNOWN_SOURCES,
  calculateArchivalConfidence,
  generateAttributionText,
  getSuggestedLicense,
} from '@/lib/visual-intelligence/archival-sources';
import {
  VISUAL_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  LICENSE_TYPE_LABELS,
} from '@/lib/visual-intelligence/types';
import type {
  VisualType,
  ArchivalSourceType,
  LicenseType,
  ArchivalSource,
} from '@/lib/visual-intelligence/types';

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  release_year: number | null;
  hero: string | null;
  poster_url: string | null;
}

interface FormData {
  movie_id: string;
  movie_title: string;
  image_url: string;
  image_type: VisualType;
  source_name: string;
  source_type: ArchivalSourceType;
  license_type: LicenseType;
  attribution_text: string;
  year_estimated: number | null;
  description: string;
  is_primary: boolean;
  provenance_notes: string;
}

const INITIAL_FORM: FormData = {
  movie_id: '',
  movie_title: '',
  image_url: '',
  image_type: 'archival_still',
  source_name: '',
  source_type: 'government_archive',
  license_type: 'archive_license',
  attribution_text: '',
  year_estimated: null,
  description: '',
  is_primary: false,
  provenance_notes: '',
};

// ============================================================
// ICON MAPPING
// ============================================================

const sourceTypeIcons: Partial<Record<ArchivalSourceType, typeof Building>> = {
  government_archive: Building,
  state_cultural_dept: Building,
  university: BookOpen,
  museum: Building,
  magazine: FileText,
  newspaper: Newspaper,
  book: BookOpen,
  family_archive: Users,
  film_society: Film,
  community: Users,
  private_collection: Users,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CuratePage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Search for movies
  const searchMovies = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.movies || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchMovies(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMovies]);

  // Auto-generate attribution when source changes
  useEffect(() => {
    if (form.source_name && form.source_type) {
      const source: ArchivalSource = {
        source_name: form.source_name,
        source_type: form.source_type,
        license_type: form.license_type,
        year_estimated: form.year_estimated || undefined,
      };
      const attribution = generateAttributionText(source);
      setForm(f => ({ ...f, attribution_text: attribution }));
    }
  }, [form.source_name, form.source_type, form.year_estimated, form.license_type]);

  // Auto-suggest license when source type changes
  useEffect(() => {
    const suggestedLicense = getSuggestedLicense(form.source_type);
    setForm(f => ({ ...f, license_type: suggestedLicense }));
  }, [form.source_type]);

  // Select movie from search
  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setForm(f => ({
      ...f,
      movie_id: movie.id,
      movie_title: movie.title_en,
      year_estimated: movie.release_year,
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  // Clear selected movie
  const handleClearMovie = () => {
    setSelectedMovie(null);
    setForm(f => ({
      ...f,
      movie_id: '',
      movie_title: '',
      year_estimated: null,
    }));
  };

  // Select known source
  const handleSelectKnownSource = (sourceCode: string) => {
    const source = KNOWN_SOURCES.find(s => s.code === sourceCode);
    if (source) {
      setForm(f => ({
        ...f,
        source_name: source.name,
        source_type: source.type,
        license_type: source.typicalLicense,
      }));
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.movie_id || !form.image_url || !form.source_name) {
      setSaveResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const confidence = calculateArchivalConfidence(
        form.source_type,
        form.image_type,
        false
      );

      const payload = {
        ...form,
        confidence_score: confidence,
      };

      const res = await fetch('/api/admin/visual-intelligence/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSaveResult({ success: true, message: 'Archival image saved successfully!' });
        // Reset form but keep movie selected
        setForm(f => ({
          ...INITIAL_FORM,
          movie_id: f.movie_id,
          movie_title: f.movie_title,
          year_estimated: f.year_estimated,
        }));
      } else {
        setSaveResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch (error) {
      setSaveResult({ success: false, message: 'Error saving archival image' });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate current confidence
  const currentConfidence = calculateArchivalConfidence(
    form.source_type,
    form.image_type,
    false
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/visual-intelligence"
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Visual Intelligence
          </Link>
          <h1 className="text-3xl font-bold mb-2">Curate Archival Image</h1>
          <p className="text-gray-400">
            Add legal archival imagery with proper provenance and attribution
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowBulkImport(false)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              !showBulkImport ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Plus className="w-4 h-4" />
            Single Image
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showBulkImport ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
        </div>

        {!showBulkImport ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Movie Selection */}
            <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-500" />
                Select Movie
              </h2>

              {selectedMovie ? (
                <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                  {selectedMovie.poster_url && (
                    <img
                      src={selectedMovie.poster_url}
                      alt={selectedMovie.title_en}
                      className="w-12 h-18 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{selectedMovie.title_en}</h3>
                    <p className="text-sm text-gray-400">
                      {selectedMovie.release_year} • {selectedMovie.hero || 'Unknown'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMovie}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a movie..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-gray-500 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-10 max-h-64 overflow-auto">
                      {searchResults.map((movie) => (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => handleSelectMovie(movie)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-3"
                        >
                          {movie.poster_url ? (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="w-8 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-12 bg-gray-700 rounded flex items-center justify-center">
                              <Film className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{movie.title_en}</div>
                            <div className="text-sm text-gray-400">
                              {movie.release_year} • {movie.hero || 'Unknown'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Image Details */}
            <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                Image Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">
                    Image URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => {
                      setForm(f => ({ ...f, image_url: e.target.value }));
                      setImagePreviewError(false);
                    }}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Image Preview */}
                {form.image_url && (
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Preview</label>
                    <div className="relative w-32 h-48 bg-gray-800 rounded-lg overflow-hidden">
                      {!imagePreviewError ? (
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={() => setImagePreviewError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Image Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.image_type}
                    onChange={(e) => setForm(f => ({ ...f, image_type: e.target.value as VisualType }))}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(VISUAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Year Estimated */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Year (Estimated)</label>
                  <input
                    type="number"
                    value={form.year_estimated || ''}
                    onChange={(e) => setForm(f => ({ ...f, year_estimated: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="1954"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of the image..."
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Is Primary */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_primary}
                      onChange={(e) => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-orange-500"
                    />
                    <span>Set as primary image for this movie</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Source & License */}
            <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-green-500" />
                Source & Provenance
              </h2>

              {/* Quick Select Known Sources */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Quick Select Known Source</label>
                <div className="flex flex-wrap gap-2">
                  {KNOWN_SOURCES.slice(0, 8).map((source) => {
                    const Icon = sourceTypeIcons[source.type] || Building;
                    return (
                      <button
                        key={source.code}
                        type="button"
                        onClick={() => handleSelectKnownSource(source.code)}
                        className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
                          form.source_name === source.name
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {source.code.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Source Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.source_name}
                    onChange={(e) => setForm(f => ({ ...f, source_name: e.target.value }))}
                    placeholder="e.g., National Film Archive of India"
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                  />
                </div>

                {/* Source Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Source Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.source_type}
                    onChange={(e) => setForm(f => ({ ...f, source_type: e.target.value as ArchivalSourceType }))}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                  >
                    {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* License Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    License Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.license_type}
                    onChange={(e) => setForm(f => ({ ...f, license_type: e.target.value as LicenseType }))}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                  >
                    {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Confidence Score (Auto-calculated) */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Confidence Score (Auto)
                  </label>
                  <div className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        currentConfidence >= 0.8 ? 'bg-green-500' :
                        currentConfidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">{Math.round(currentConfidence * 100)}%</span>
                      <span className="text-gray-500 text-sm">
                        (Tier {currentConfidence >= 0.8 ? 1 : currentConfidence >= 0.6 ? 2 : 3})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attribution Text */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Attribution Text</label>
                  <input
                    type="text"
                    value={form.attribution_text}
                    onChange={(e) => setForm(f => ({ ...f, attribution_text: e.target.value }))}
                    placeholder="Source: NFAI (1954)"
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This text will be displayed with the image for proper credit
                  </p>
                </div>

                {/* Provenance Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Provenance Notes</label>
                  <textarea
                    value={form.provenance_notes}
                    onChange={(e) => setForm(f => ({ ...f, provenance_notes: e.target.value }))}
                    placeholder="How was this image obtained? Any special circumstances?"
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="flex items-center justify-between">
              <div>
                {saveResult && (
                  <div className={`flex items-center gap-2 ${
                    saveResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {saveResult.success ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    {saveResult.message}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setForm(INITIAL_FORM)}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.movie_id || !form.image_url || !form.source_name}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Archival Image
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <BulkImportSection />
        )}
      </div>
    </div>
  );
}

// ============================================================
// BULK IMPORT SECTION
// ============================================================

function BulkImportSection() {
  const [csvContent, setCsvContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleBulkImport = async () => {
    if (!csvContent.trim()) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/visual-intelligence/curate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ success: 0, failed: 0, errors: ['Network error'] });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-purple-500" />
        Bulk CSV Import
      </h2>

      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">
          Paste CSV content with the following columns:
        </p>
        <code className="block bg-gray-800 p-3 rounded text-xs text-gray-300 overflow-x-auto">
          movie_title,image_url,image_type,source_name,source_type,license_type,year_estimated,attribution_text
        </code>
      </div>

      <textarea
        value={csvContent}
        onChange={(e) => setCsvContent(e.target.value)}
        placeholder="Paste your CSV content here..."
        rows={10}
        className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm resize-none mb-4"
      />

      {result && (
        <div className="mb-4 p-4 rounded-lg bg-gray-800">
          <div className="flex gap-4 mb-2">
            <span className="text-green-400">Success: {result.success}</span>
            <span className="text-red-400">Failed: {result.failed}</span>
          </div>
          {result.errors.length > 0 && (
            <div className="text-red-400 text-sm">
              <p className="font-medium">Errors:</p>
              <ul className="list-disc list-inside">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleBulkImport}
        disabled={isProcessing || !csvContent.trim()}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg flex items-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Import CSV
          </>
        )}
      </button>
    </div>
  );
}

