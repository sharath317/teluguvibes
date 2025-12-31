'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Calendar, Briefcase, Link2, Image } from 'lucide-react';

export default function NewCelebrityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name_en: '',
    name_te: '',
    gender: 'male',
    birth_date: '',
    death_date: '',
    birth_place: '',
    occupation: [] as string[],
    short_bio: '',
    short_bio_te: '',
    wikidata_id: '',
    tmdb_id: '',
    imdb_id: '',
    profile_image: '',
    popularity_score: 50,
    is_verified: false,
  });

  const [occupationInput, setOccupationInput] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function addOccupation() {
    if (occupationInput.trim() && !formData.occupation.includes(occupationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        occupation: [...prev.occupation, occupationInput.trim()],
      }));
      setOccupationInput('');
    }
  }

  function removeOccupation(occ: string) {
    setFormData(prev => ({
      ...prev,
      occupation: prev.occupation.filter(o => o !== occ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/celebrities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : null,
          popularity_score: parseFloat(String(formData.popularity_score)),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/celebrities/${data.celebrity.id}`);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save celebrity');
    }

    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/celebrities"
          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Celebrity</h1>
          <p className="text-[#737373]">Create a new celebrity profile</p>
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
                placeholder="e.g., Chiranjeevi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Name (Telugu)
              </label>
              <input
                type="text"
                name="name_te"
                value={formData.name_te}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="e.g., చిరంజీవి"
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
                value={formData.birth_place}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="e.g., Hyderabad, Telangana"
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
                value={formData.birth_date}
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
                value={formData.death_date}
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
              placeholder="e.g., actor, director, producer"
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
            {formData.occupation.length === 0 && (
              <span className="text-[#737373] text-sm">No occupations added</span>
            )}
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
                value={formData.wikidata_id}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="e.g., Q2295655"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                TMDB ID
              </label>
              <input
                type="number"
                name="tmdb_id"
                value={formData.tmdb_id}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="e.g., 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                IMDB ID
              </label>
              <input
                type="text"
                name="imdb_id"
                value={formData.imdb_id}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="e.g., nm0000123"
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
                value={formData.profile_image}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Short Bio (English)
              </label>
              <textarea
                name="short_bio"
                value={formData.short_bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none resize-none"
                placeholder="Brief biography..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">
                Short Bio (Telugu)
              </label>
              <textarea
                name="short_bio_te"
                value={formData.short_bio_te}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none resize-none"
                placeholder="సంక్షిప్త జీవిత చరిత్ర..."
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-1">
                Popularity Score
              </label>
              <input
                type="range"
                name="popularity_score"
                value={formData.popularity_score}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-48"
              />
              <span className="ml-3 text-[#eab308] font-bold">{formData.popularity_score}</span>
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
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/admin/celebrities"
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
            {saving ? 'Saving...' : 'Save Celebrity'}
          </button>
        </div>
      </form>
    </div>
  );
}



