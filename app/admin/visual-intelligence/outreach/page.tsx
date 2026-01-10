'use client';

/**
 * ARCHIVAL OUTREACH TRACKER
 * 
 * Track outreach efforts to archives, family estates, and film societies
 * for acquiring legal archival imagery.
 * 
 * Features:
 * - Create/manage outreach requests
 * - Track status (sent, pending, approved, rejected)
 * - Generate email templates
 * - Source registry with contact info
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Building,
  Users,
  Film,
  AlertCircle,
  ExternalLink,
  Copy,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import {
  KNOWN_SOURCES,
  generateNFAIRequestEmail,
  generateFamilyOutreachTemplate,
} from '@/lib/visual-intelligence/archival-sources';
import type { OutreachStatus, ArchivalSourceType } from '@/lib/visual-intelligence/types';

// ============================================================
// TYPES
// ============================================================

interface OutreachRequest {
  id: string;
  movie_id?: string;
  movie_title?: string;
  request_type: string;
  source_type: ArchivalSourceType;
  contact_name?: string;
  contact_email?: string;
  organization_name?: string;
  status: OutreachStatus;
  created_at: string;
  sent_at?: string;
  response_at?: string;
  request_notes?: string;
  response_notes?: string;
}

// ============================================================
// STATUS CONFIGURATION
// ============================================================

const statusConfig: Partial<Record<OutreachStatus, { label: string; color: string; icon: typeof Clock }>> = {
  draft: { label: 'Draft', color: 'bg-gray-700 text-gray-300', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-900/50 text-blue-300', icon: Send },
  pending_response: { label: 'Awaiting Response', color: 'bg-amber-900/50 text-amber-300', icon: Clock },
  responded: { label: 'Responded', color: 'bg-purple-900/50 text-purple-300', icon: Mail },
  approved: { label: 'Approved', color: 'bg-green-900/50 text-green-300', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-900/50 text-red-300', icon: XCircle },
  partial_approval: { label: 'Partial Approval', color: 'bg-amber-900/50 text-amber-300', icon: AlertCircle },
  negotiating: { label: 'Negotiating', color: 'bg-cyan-900/50 text-cyan-300', icon: Users },
  completed: { label: 'Completed', color: 'bg-green-900/50 text-green-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-700 text-gray-400', icon: XCircle },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OutreachPage() {
  const [requests, setRequests] = useState<OutreachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OutreachStatus | 'all'>('all');

  // Fetch outreach requests
  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/admin/visual-intelligence/outreach');
        const data = await res.json();
        setRequests(data.requests || []);
      } catch (error) {
        console.error('Failed to fetch outreach requests:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  // Filter requests
  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  // Status counts
  const statusCounts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/visual-intelligence"
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Visual Intelligence
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Outreach Tracker</h1>
              <p className="text-gray-400">
                Manage requests to archives, family estates, and film societies
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailGenerator(true)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Templates
              </button>
              <button
                onClick={() => setShowNewRequest(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Request
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total"
            value={requests.length}
            onClick={() => setStatusFilter('all')}
            active={statusFilter === 'all'}
          />
          <StatCard
            label="Pending"
            value={statusCounts['pending_response'] || 0}
            color="amber"
            onClick={() => setStatusFilter('pending_response')}
            active={statusFilter === 'pending_response'}
          />
          <StatCard
            label="Approved"
            value={statusCounts['approved'] || 0}
            color="green"
            onClick={() => setStatusFilter('approved')}
            active={statusFilter === 'approved'}
          />
          <StatCard
            label="Rejected"
            value={statusCounts['rejected'] || 0}
            color="red"
            onClick={() => setStatusFilter('rejected')}
            active={statusFilter === 'rejected'}
          />
          <StatCard
            label="Completed"
            value={statusCounts['completed'] || 0}
            color="green"
            onClick={() => setStatusFilter('completed')}
            active={statusFilter === 'completed'}
          />
        </div>

        {/* Known Sources Registry */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-orange-500" />
            Source Registry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {KNOWN_SOURCES.slice(0, 6).map((source) => (
              <SourceCard
                key={source.code}
                source={source}
                onSelect={() => setSelectedSource(source.code)}
                isSelected={selectedSource === source.code}
              />
            ))}
          </div>
          {KNOWN_SOURCES.length > 6 && (
            <button className="mt-4 text-gray-400 hover:text-white text-sm">
              View all {KNOWN_SOURCES.length} sources →
            </button>
          )}
        </section>

        {/* Outreach Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Outreach Requests
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OutreachStatus | 'all')}
                className="bg-gray-800 rounded px-3 py-1 text-sm border border-gray-700"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
              Loading requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
              <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No outreach requests yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Start reaching out to archives and families to acquire archival imagery
              </p>
              <button
                onClick={() => setShowNewRequest(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* New Request Modal */}
      {showNewRequest && (
        <NewRequestModal
          onClose={() => setShowNewRequest(false)}
          onSave={async (data) => {
            try {
              const res = await fetch('/api/admin/visual-intelligence/outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (res.ok) {
                const newRequest = await res.json();
                setRequests([newRequest.data, ...requests]);
                setShowNewRequest(false);
              }
            } catch (error) {
              console.error('Failed to create request:', error);
            }
          }}
        />
      )}

      {/* Email Generator Modal */}
      {showEmailGenerator && (
        <EmailGeneratorModal onClose={() => setShowEmailGenerator(false)} />
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  color = 'default',
  onClick,
  active,
}: {
  label: string;
  value: number;
  color?: 'default' | 'amber' | 'green' | 'red';
  onClick: () => void;
  active: boolean;
}) {
  const colorClasses = {
    default: 'bg-gray-900 border-gray-800',
    amber: 'bg-amber-900/20 border-amber-800',
    green: 'bg-green-900/20 border-green-800',
    red: 'bg-red-900/20 border-red-800',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border text-left transition-all ${colorClasses[color]} ${
        active ? 'ring-2 ring-orange-500' : 'hover:border-gray-600'
      }`}
    >
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </button>
  );
}

// ============================================================
// SOURCE CARD
// ============================================================

function SourceCard({
  source,
  onSelect,
  isSelected,
}: {
  source: typeof KNOWN_SOURCES[0];
  onSelect: () => void;
  isSelected: boolean;
}) {
  const tierColors = {
    1: 'border-green-700 bg-green-900/10',
    2: 'border-amber-700 bg-amber-900/10',
    3: 'border-gray-700 bg-gray-900/50',
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${tierColors[source.tier as keyof typeof tierColors] || tierColors[3]} ${
        isSelected ? 'ring-2 ring-orange-500' : 'hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
          Tier {source.tier}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          source.accessType === 'open_access' ? 'bg-green-900/50 text-green-300' :
          source.accessType === 'request_required' ? 'bg-amber-900/50 text-amber-300' :
          'bg-red-900/50 text-red-300'
        }`}>
          {source.accessType.replace('_', ' ')}
        </span>
      </div>
      <h3 className="font-medium mb-1">{source.name}</h3>
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{source.description}</p>
      {source.email && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Mail className="w-3 h-3" />
          {source.email}
        </div>
      )}
      {source.website && (
        <a
          href={source.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Website
        </a>
      )}
    </div>
  );
}

// ============================================================
// REQUEST CARD
// ============================================================

function RequestCard({ request }: { request: OutreachRequest }) {
  const status = statusConfig[request.status] || { label: 'Unknown', color: 'bg-gray-700 text-gray-300', icon: Clock };
  const StatusIcon = status.icon;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <span className="text-gray-500 text-xs">
              {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="font-medium mb-1">
            {request.organization_name || request.contact_name || 'Unknown Contact'}
          </h3>
          {request.movie_title && (
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <Film className="w-3 h-3" />
              {request.movie_title}
            </p>
          )}
          {request.contact_email && (
            <p className="text-xs text-gray-500 mt-1">{request.contact_email}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
      {request.request_notes && (
        <p className="text-sm text-gray-500 mt-2 border-t border-gray-800 pt-2">
          {request.request_notes}
        </p>
      )}
    </div>
  );
}

// ============================================================
// NEW REQUEST MODAL
// ============================================================

function NewRequestModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Partial<OutreachRequest>) => void;
}) {
  const [formData, setFormData] = useState<Partial<OutreachRequest>>({
    request_type: 'poster_request',
    source_type: 'government_archive',
    status: 'draft',
  });

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">New Outreach Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Request Type</label>
            <select
              value={formData.request_type}
              onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
              className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
            >
              <option value="poster_request">Poster Request</option>
              <option value="still_request">Still Request</option>
              <option value="bulk_collection">Bulk Collection</option>
              <option value="general_inquiry">General Inquiry</option>
              <option value="partnership">Partnership</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Source Type</label>
            <select
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value as ArchivalSourceType })}
              className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
            >
              <option value="government_archive">Government Archive (NFAI)</option>
              <option value="state_cultural_dept">State Cultural Dept</option>
              <option value="family_archive">Family Estate</option>
              <option value="film_society">Film Society</option>
              <option value="magazine">Magazine</option>
              <option value="newspaper">Newspaper</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Organization Name</label>
            <input
              type="text"
              value={formData.organization_name || ''}
              onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
              placeholder="e.g., National Film Archive of India"
              className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name || ''}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Movie Title (if specific)</label>
            <input
              type="text"
              value={formData.movie_title || ''}
              onChange={(e) => setFormData({ ...formData, movie_title: e.target.value })}
              placeholder="Leave blank for general requests"
              className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.request_notes || ''}
              onChange={(e) => setFormData({ ...formData, request_notes: e.target.value })}
              rows={3}
              className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-orange-600 rounded hover:bg-orange-500"
          >
            Create Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMAIL GENERATOR MODAL
// ============================================================

function EmailGeneratorModal({ onClose }: { onClose: () => void }) {
  const [templateType, setTemplateType] = useState<'nfai' | 'family'>('nfai');
  const [movieTitles, setMovieTitles] = useState('');
  const [actorName, setActorName] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');

  const generateEmail = () => {
    if (templateType === 'nfai') {
      const titles = movieTitles.split('\n').filter(t => t.trim());
      setGeneratedEmail(generateNFAIRequestEmail(titles));
    } else {
      setGeneratedEmail(generateFamilyOutreachTemplate(actorName, movieTitle));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Email Template Generator</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {/* Template Type */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTemplateType('nfai')}
              className={`px-4 py-2 rounded ${templateType === 'nfai' ? 'bg-orange-600' : 'bg-gray-800'}`}
            >
              NFAI Request
            </button>
            <button
              onClick={() => setTemplateType('family')}
              className={`px-4 py-2 rounded ${templateType === 'family' ? 'bg-orange-600' : 'bg-gray-800'}`}
            >
              Family Outreach
            </button>
          </div>

          {/* Inputs */}
          {templateType === 'nfai' ? (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Movie Titles (one per line)</label>
              <textarea
                value={movieTitles}
                onChange={(e) => setMovieTitles(e.target.value)}
                rows={5}
                placeholder="Donga Ramudu&#10;Devadasu&#10;Mayabazar"
                className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700 resize-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Actor Name</label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="e.g., NTR"
                  className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Movie Title</label>
                <input
                  type="text"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="e.g., Devadasu"
                  className="w-full bg-gray-800 rounded px-3 py-2 border border-gray-700"
                />
              </div>
            </div>
          )}

          <button
            onClick={generateEmail}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded mb-4"
          >
            Generate Email
          </button>

          {/* Generated Email */}
          {generatedEmail && (
            <div className="relative">
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
              </button>
              <pre className="bg-gray-800 rounded p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
                {generatedEmail}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

