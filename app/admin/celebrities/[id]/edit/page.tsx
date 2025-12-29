'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Calendar, Briefcase, Link2, Image } from 'lucide-react';

interface Celebrity {
  id: string;
  name_en: string;
  name_te?: string;
  gender: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  occupation: string[];
  short_bio?: string;
  short_bio_te?: string;
  wikidata_id?: string;
  tmdb_id?: number;
  imdb_id?: string;
  profile_image?: string;
  popularity_score: number;
  is_verified: boolean;
  is_active: boolean;
}

export default function EditCelebrityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Celebrity | null>(null);
  const [occupationInput, setOccupationInput] = useState('');

  useEffect(() => {
    fetchCelebrity();
  }, [id]);

  async function fetchCelebrity() {
    try {
      const res = await fetch(`/api/admin/celebrities/${id}`);
      const data = await res.json();

      if (data.celebrity) {
        setFormData({
          ...data.celebrity,
          birth_date: data.celebrity.birth_date?.split('T')[0] || '',
          death_date: data.celebrity.death_date?.split('T')[0] || '',
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (!formData) return;

    const { name, value, type } = e.target;
    setFormData(prev => prev ? {
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    } : null);
  }

  function addOccupation() {
    if (!formData) return;
    if (occupationInput.trim() && !formData.occupation.includes(occupationInput.trim())) {
      setFormData(prev => prev ? {
        ...prev,
        occupation: [...prev.occupation, occupationInput.trim()],
      } : null);
      setOccupationInput('');
    }
  }

  function removeOccupation(occ: string) {
    if (!formData) return;
    setFormData(prev => prev ? {
      ...prev,
      occupation: prev.occupation.filter(o => o !== occ),
    } : null);
  }

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);

    try {
      const payload = {
        name_en: formData.name_en,
        name_te: formData.name_te || null,
        gender: formData.gender,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
        birth_place: formData.birth_place || null,
        occupation: formData.occupation || [],
        short_bio: formData.short_bio || null,
        short_bio_te: formData.short_bio_te || null,
        wikidata_id: formData.wikidata_id || null,
        tmdb_id: formData.tmdb_id ? parseInt(String(formData.tmdb_id)) : null,
        imdb_id: formData.imdb_id || null,
        profile_image: formData.profile_image || null,
        popularity_score: parseFloat(String(formData.popularity_score)) || 50,
        is_verified: formData.is_verified ?? false,
        is_active: formData.is_active ?? true,
      };

      console.log('Saving celebrity:', payload);

      const res = await fetch(`/api/admin/celebrities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/admin/celebrities/${id}`);
      } else {
        console.error('Save error response:', data);
        alert(`Error: ${data.error || 'Unknown error'}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save celebrity');
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#737373]">Loading...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Celebrity Not Found</h2>
        <Link href="/admin/celebrities" className="text-[#eab308] hover:underline">
          Back to Celebrities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/admin/celebrities/${id}`}
          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Celebrity</h1>
          <p className="text-[#737373]">{formData.name_en}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#eab308]" />
            Basic Information
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Name (English) *
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Name (Telugu)
              </label>
              <input
                type="text"
                name="name_te"
                value={formData.name_te || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Birth Place
              </label>
              <input
                type="text"
                name="birth_place"
                value={formData.birth_place || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#eab308]" />
            Dates
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Birth Date
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Death Date (if applicable)
              </label>
              <input
                type="date"
                name="death_date"
                value={formData.death_date || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Occupation */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#eab308]" />
            Occupation
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={occupationInput}
              onChange={(e) => setOccupationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOccupation())}
              className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              placeholder="Add occupation..."
            />
            <button
              type="button"
              onClick={addOccupation}
              className="px-4 py-2 bg-[#262626] hover:bg-[#333] rounded-lg transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.occupation.map((occ) => (
              <span
                key={occ}
                className="px-3 py-1 bg-[#eab308]/20 text-[#eab308] rounded-full text-sm flex items-center gap-2"
              >
                {occ}
                <button
                  type="button"
                  onClick={() => removeOccupation(occ)}
                  className="hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* External IDs */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#eab308]" />
            External IDs
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Wikidata ID
              </label>
              <input
                type="text"
                name="wikidata_id"
                value={formData.wikidata_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                TMDB ID
              </label>
              <input
                type="number"
                name="tmdb_id"
                value={formData.tmdb_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                IMDB ID
              </label>
              <input
                type="text"
                name="imdb_id"
                value={formData.imdb_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Media & Bio */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-[#eab308]" />
            Media & Bio
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Profile Image URL
              </label>
              <input
                type="url"
                name="profile_image"
                value={formData.profile_image || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Short Bio (English)
              </label>
              <textarea
                name="short_bio"
                value={formData.short_bio || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Short Bio (Telugu)
              </label>
              <textarea
                name="short_bio_te"
                value={formData.short_bio_te || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-1">
                Popularity Score
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  name="popularity_score"
                  value={formData.popularity_score}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-48"
                />
                <span className="text-[#eab308] font-bold">{formData.popularity_score}</span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
                className="w-5 h-5 rounded border-[#262626] bg-[#0a0a0a] text-[#eab308] focus:ring-[#eab308]"
              />
              <span className="text-[#ededed]">Verified Profile</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded border-[#262626] bg-[#0a0a0a] text-[#eab308] focus:ring-[#eab308]"
              />
              <span className="text-[#ededed]">Active</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/admin/celebrities/${id}`}
            className="px-6 py-2 bg-[#262626] hover:bg-[#333] rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !formData.name_en}
            className="flex items-center gap-2 px-6 py-2 bg-[#eab308] hover:bg-[#ca9a06] text-black font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
