'use client';

import { useState, useEffect } from 'react';
import { Check, X, Trash2, Heart, Clock, Star, Eye } from 'lucide-react';
import type { Dedication } from '@/types/reviews';
import { DEDICATION_TYPE_LABELS, ANIMATION_CONFIG } from '@/types/reviews';

export default function AdminDedicationsPage() {
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    async function fetchDedications() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/dedications?status=${statusFilter}&limit=100`);
        const data = await res.json();
        setDedications(data.dedications || []);
      } catch (error) {
        console.error('Fetch error:', error);
      }
      setLoading(false);
    }

    fetchDedications();
  }, [statusFilter]);

  async function handleApprove(id: string, isPremium = false) {
    try {
      await fetch(`/api/admin/dedications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', is_premium: isPremium }),
      });
      setDedications(dedications.map(d =>
        d.id === id ? { ...d, status: 'approved', is_premium: isPremium } : d
      ));
    } catch (error) {
      console.error('Approve error:', error);
    }
  }

  async function handleReject(id: string) {
    try {
      await fetch(`/api/admin/dedications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      setDedications(dedications.map(d =>
        d.id === id ? { ...d, status: 'rejected' } : d
      ));
    } catch (error) {
      console.error('Reject error:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this dedication?')) return;
    try {
      await fetch(`/api/admin/dedications/${id}`, { method: 'DELETE' });
      setDedications(dedications.filter(d => d.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  const pendingCount = dedications.filter(d => d.status === 'pending').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Dedications Manager
          </h1>
          <p className="text-gray-400">Moderate user-submitted dedications</p>
        </div>

        {pendingCount > 0 && (
          <div className="px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg font-medium">
            {pendingCount} pending review
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              statusFilter === status
                ? 'bg-pink-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Dedications List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : dedications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {statusFilter === 'all' ? '' : statusFilter} dedications</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {dedications.map((dedication) => (
            <DedicationCard
              key={dedication.id}
              dedication={dedication}
              onApprove={(isPremium) => handleApprove(dedication.id, isPremium)}
              onReject={() => handleReject(dedication.id)}
              onDelete={() => handleDelete(dedication.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DedicationCard({
  dedication,
  onApprove,
  onReject,
  onDelete,
}: {
  dedication: Dedication;
  onApprove: (isPremium: boolean) => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const typeConfig = DEDICATION_TYPE_LABELS[dedication.dedication_type];
  const animConfig = ANIMATION_CONFIG[dedication.animation_type];

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    approved: 'bg-green-500/20 text-green-500',
    rejected: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-start justify-between gap-4">
        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{typeConfig.icon}</span>
            <div>
              <span className="text-pink-400 font-medium">{typeConfig.label}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusColors[dedication.status]}`}>
                {dedication.status}
              </span>
              {dedication.is_premium && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full text-xs">
                  ⭐ Premium
                </span>
              )}
            </div>
          </div>

          {/* To/From */}
          <div className="mb-2">
            <span className="text-gray-500">To: </span>
            <span className="text-white font-medium">{dedication.to_name}</span>
            {dedication.to_relation && (
              <span className="text-gray-500 ml-1">({dedication.to_relation})</span>
            )}
          </div>
          <div className="mb-3">
            <span className="text-gray-500">From: </span>
            <span className="text-white">{dedication.from_name}</span>
            {dedication.from_location && (
              <span className="text-gray-500 ml-1">({dedication.from_location})</span>
            )}
          </div>

          {/* Message */}
          <div className="bg-gray-800 rounded-lg p-3 mb-3">
            <p className="text-gray-300">"{dedication.message}"</p>
          </div>

          {/* Celebrity */}
          {dedication.celebrity_name && (
            <div className="text-sm text-gray-500 mb-2">
              <span>Celebrity: </span>
              <span className="text-yellow-500">{dedication.celebrity_name}</span>
            </div>
          )}

          {/* Animation & Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              {animConfig.emoji} {dedication.animation_type}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(dedication.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {dedication.views} views
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {dedication.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(false)}
                className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
                title="Approve"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => onApprove(true)}
                className="flex items-center gap-1 px-3 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 transition-colors"
                title="Approve as Premium"
              >
                <Star className="w-4 h-4" />
                Premium
              </button>
              <button
                onClick={onReject}
                className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                title="Reject"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}








