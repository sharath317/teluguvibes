'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Instagram, Youtube, Twitter, Check, X } from 'lucide-react';
import type { MediaEntity, EntityType } from '@/types/media';

const ENTITY_TYPES: EntityType[] = ['actress', 'anchor', 'influencer', 'model', 'singer'];

export default function AdminMediaEntitiesPage() {
  const [entities, setEntities] = useState<MediaEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function fetchEntities() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (searchQuery) params.set('search', searchQuery);
        params.set('limit', '100');

        const res = await fetch(`/api/admin/media/entities?${params}`);
        const data = await res.json();
        setEntities(data.entities || []);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchEntities();
  }, [typeFilter, searchQuery]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this entity? This will also remove associated media posts.')) return;
    try {
      await fetch(`/api/admin/media/entities/${id}`, { method: 'DELETE' });
      setEntities(entities.filter(e => e.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  async function handleToggleVerify(entity: MediaEntity) {
    try {
      await fetch(`/api/admin/media/entities/${entity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !entity.is_verified }),
      });
      setEntities(entities.map(e =>
        e.id === entity.id ? { ...e, is_verified: !e.is_verified } : e
      ));
    } catch (error) {
      console.error('Toggle verify error:', error);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Entities</h1>
          <p className="text-gray-400">Manage actresses, anchors, and influencers</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Entity
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${typeFilter === 'all' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            All
          </button>
          {ENTITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                ${typeFilter === type ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entities.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No entities found. Add some celebrities to get started!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="bg-gray-900 rounded-xl overflow-hidden group hover:ring-2 hover:ring-yellow-500/50 transition-all"
            >
              {/* Profile Image */}
              <div className="relative aspect-square bg-gray-800">
                {entity.profile_image ? (
                  <img
                    src={entity.profile_image}
                    alt={entity.name_en}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                    {entity.name_en.charAt(0)}
                  </div>
                )}

                {/* Verified Badge */}
                {entity.is_verified && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggleVerify(entity)}
                    className={`p-2 rounded-lg ${entity.is_verified ? 'bg-gray-700' : 'bg-blue-500'}`}
                    title={entity.is_verified ? 'Remove verification' : 'Verify'}
                  >
                    <Check className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(entity.id)}
                    className="p-2 bg-red-500 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-white font-medium truncate">{entity.name_en}</h3>
                {entity.name_te && (
                  <p className="text-gray-500 text-sm truncate">{entity.name_te}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-yellow-500 capitalize">{entity.entity_type}</span>
                  <div className="flex gap-1">
                    {entity.instagram_handle && (
                      <Instagram className="w-4 h-4 text-pink-500" />
                    )}
                    {entity.youtube_channel_id && (
                      <Youtube className="w-4 h-4 text-red-500" />
                    )}
                    {entity.twitter_handle && (
                      <Twitter className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entity Modal */}
      {showAddModal && (
        <AddEntityModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(entity) => {
            setEntities([entity, ...entities]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddEntityModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (entity: MediaEntity) => void;
}) {
  const [formData, setFormData] = useState({
    name_en: '',
    name_te: '',
    entity_type: 'actress' as EntityType,
    instagram_handle: '',
    youtube_channel_id: '',
    twitter_handle: '',
    profile_image: '',
    popularity_score: 50,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!formData.name_en) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/media/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(data.entity);
      } else {
        alert('Failed to create entity');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to create entity');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Add Entity</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name (English) *</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="Rashmika Mandanna"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Name (Telugu)</label>
            <input
              type="text"
              value={formData.name_te}
              onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
              placeholder="రష్మిక"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Type *</label>
            <select
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as EntityType })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Social Handles */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Instagram Handle</label>
            <input
              type="text"
              value={formData.instagram_handle}
              onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
              placeholder="rashmika_mandanna"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Profile Image URL</label>
            <input
              type="url"
              value={formData.profile_image}
              onChange={(e) => setFormData({ ...formData, profile_image: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Popularity */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Popularity Score: {formData.popularity_score}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.popularity_score}
              onChange={(e) => setFormData({ ...formData, popularity_score: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name_en}
            className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Entity'}
          </button>
        </div>
      </div>
    </div>
  );
}



