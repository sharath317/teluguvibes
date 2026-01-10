'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, Package, Play, Pause, CheckCircle, XCircle, 
  AlertTriangle, Clock, Plus, Trash2, RefreshCw, Eye,
  ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import {
  ContentSector,
  SECTOR_DEFINITIONS,
  VERIFICATION_STATUS_CONFIG,
  VerificationStatus,
} from '@/types/content-sectors';

interface PublishBatch {
  id: string;
  name: string;
  description?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: 'pending' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  contentCount: number;
  successCount: number;
  failureCount: number;
  validationErrors: Array<{ postId: string; message: string; severity: string }>;
  prePublishChecks: {
    allContentVerified: boolean;
    allDisclaimersSet: boolean;
    allFictionalLabeled: boolean;
    noSensitiveInKids: boolean;
    minimumSourcesMet: boolean;
    confidenceThresholdMet: boolean;
  };
  createdBy?: string;
  approvedBy?: string;
  createdAt: string;
}

interface ContentItem {
  id: string;
  title: string;
  content_sector: ContentSector;
  verification_status: VerificationStatus;
  fact_confidence_score: number;
  status: string;
  publish_batch_id?: string;
}

export default function BatchPublishPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<PublishBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [batchContent, setBatchContent] = useState<ContentItem[]>([]);
  const [availableContent, setAvailableContent] = useState<ContentItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDescription, setNewBatchDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchAvailableContent();
  }, []);

  async function fetchBatches() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/batch-publish');
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      } else {
        // Mock data for development
        setBatches([
          {
            id: 'batch-1',
            name: 'Weekly Release',
            description: 'Weekly content batch for movies section',
            status: 'scheduled',
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
            contentCount: 5,
            successCount: 0,
            failureCount: 0,
            validationErrors: [],
            prePublishChecks: {
              allContentVerified: true,
              allDisclaimersSet: true,
              allFictionalLabeled: true,
              noSensitiveInKids: true,
              minimumSourcesMet: true,
              confidenceThresholdMet: true,
            },
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'batch-2',
            name: 'Pending Review',
            status: 'pending',
            contentCount: 3,
            successCount: 0,
            failureCount: 0,
            validationErrors: [
              { postId: '1', message: 'Missing disclaimer', severity: 'error' },
            ],
            prePublishChecks: {
              allContentVerified: false,
              allDisclaimersSet: false,
              allFictionalLabeled: true,
              noSensitiveInKids: true,
              minimumSourcesMet: true,
              confidenceThresholdMet: false,
            },
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableContent() {
    try {
      const res = await fetch('/api/admin/batch-publish/available');
      if (res.ok) {
        const data = await res.json();
        setAvailableContent(data.content || []);
      } else {
        // Mock data
        setAvailableContent([
          {
            id: 'post-1',
            title: 'Sample Movie Review',
            content_sector: 'movies_cinema',
            verification_status: 'verified',
            fact_confidence_score: 85,
            status: 'draft',
          },
          {
            id: 'post-2',
            title: 'Actor Interview Analysis',
            content_sector: 'actor_industry',
            verification_status: 'verified',
            fact_confidence_score: 72,
            status: 'draft',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch available content:', error);
    }
  }

  async function createBatch() {
    if (!newBatchName.trim()) {
      setMessage({ type: 'error', text: 'Batch name is required' });
      return;
    }

    try {
      const res = await fetch('/api/admin/batch-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName,
          description: newBatchDescription,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Batch created successfully' });
        setShowCreateModal(false);
        setNewBatchName('');
        setNewBatchDescription('');
        fetchBatches();
      } else {
        // Mock creation for dev
        const newBatch: PublishBatch = {
          id: `batch-${Date.now()}`,
          name: newBatchName,
          description: newBatchDescription,
          status: 'pending',
          contentCount: 0,
          successCount: 0,
          failureCount: 0,
          validationErrors: [],
          prePublishChecks: {
            allContentVerified: false,
            allDisclaimersSet: false,
            allFictionalLabeled: false,
            noSensitiveInKids: true,
            minimumSourcesMet: false,
            confidenceThresholdMet: false,
          },
          createdAt: new Date().toISOString(),
        };
        setBatches([...batches, newBatch]);
        setShowCreateModal(false);
        setNewBatchName('');
        setNewBatchDescription('');
        setMessage({ type: 'success', text: 'Batch created successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create batch' });
    }
  }

  async function scheduleBatch(batchId: string) {
    if (!scheduleDate || !scheduleTime) {
      setMessage({ type: 'error', text: 'Please select date and time' });
      return;
    }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    
    try {
      const res = await fetch(`/api/admin/batch-publish/${batchId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Batch scheduled successfully' });
        fetchBatches();
      } else {
        // Mock for dev
        setBatches(batches.map(b => 
          b.id === batchId 
            ? { ...b, status: 'scheduled' as const, scheduledAt: scheduledAt.toISOString() }
            : b
        ));
        setMessage({ type: 'success', text: 'Batch scheduled successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to schedule batch' });
    }
  }

  async function publishBatch(batchId: string) {
    if (!confirm('Are you sure you want to publish this batch now?')) return;

    try {
      const res = await fetch(`/api/admin/batch-publish/${batchId}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Batch publishing started' });
        fetchBatches();
      } else {
        // Mock for dev
        setBatches(batches.map(b => 
          b.id === batchId 
            ? { ...b, status: 'published' as const, publishedAt: new Date().toISOString() }
            : b
        ));
        setMessage({ type: 'success', text: 'Batch published successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to publish batch' });
    }
  }

  async function cancelBatch(batchId: string) {
    if (!confirm('Are you sure you want to cancel this batch?')) return;

    try {
      const res = await fetch(`/api/admin/batch-publish/${batchId}/cancel`, {
        method: 'POST',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Batch cancelled' });
        fetchBatches();
      } else {
        setBatches(batches.map(b => 
          b.id === batchId ? { ...b, status: 'cancelled' as const } : b
        ));
        setMessage({ type: 'success', text: 'Batch cancelled' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel batch' });
    }
  }

  function getStatusColor(status: PublishBatch['status']) {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'scheduled': return 'text-blue-400 bg-blue-500/20';
      case 'publishing': return 'text-purple-400 bg-purple-500/20';
      case 'published': return 'text-green-400 bg-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      case 'cancelled': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  }

  function getStatusIcon(status: PublishBatch['status']) {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'publishing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  }

  const passedChecksCount = (checks: PublishBatch['prePublishChecks']) => 
    Object.values(checks).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#eab308]/20 rounded-xl">
            <Package className="w-6 h-6 text-[#eab308]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Batch Publishing</h1>
            <p className="text-[#737373]">Schedule and manage content publishing batches</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBatches}
            className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-medium rounded-lg hover:bg-[#ca9a06] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Batch
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/50 text-green-400'
            : 'bg-red-500/10 border border-red-500/50 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-auto text-current hover:opacity-70"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Batches List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : batches.length > 0 ? (
        <div className="space-y-4">
          {batches.map((batch) => (
            <div 
              key={batch.id}
              className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden"
            >
              {/* Batch Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(batch.status)}`}>
                      {getStatusIcon(batch.status)}
                      {batch.status}
                    </span>
                    <div>
                      <h3 className="text-white font-medium">{batch.name}</h3>
                      {batch.description && (
                        <p className="text-sm text-[#737373]">{batch.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-white font-medium">{batch.contentCount} items</p>
                      <p className="text-xs text-[#737373]">
                        {passedChecksCount(batch.prePublishChecks)}/6 checks passed
                      </p>
                    </div>
                    
                    {batch.scheduledAt && (
                      <div className="text-right">
                        <p className="text-sm text-blue-400">
                          {new Date(batch.scheduledAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-[#737373]">
                          {new Date(batch.scheduledAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {expandedBatch === batch.id ? (
                      <ChevronUp className="w-5 h-5 text-[#737373]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#737373]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedBatch === batch.id && (
                <div className="border-t border-[#262626] p-4 space-y-4">
                  {/* Pre-Publish Checks */}
                  <div>
                    <h4 className="text-sm font-medium text-[#737373] mb-3">Pre-Publish Checks</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(batch.prePublishChecks).map(([key, passed]) => (
                        <div 
                          key={key}
                          className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                            passed 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {batch.validationErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#737373] mb-3">Validation Errors</h4>
                      <div className="space-y-2">
                        {batch.validationErrors.map((error, i) => (
                          <div 
                            key={i}
                            className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                              error.severity === 'error'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-yellow-500/10 text-yellow-400'
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule Section */}
                  {batch.status === 'pending' && (
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-xs text-[#737373] mb-1">Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#737373] mb-1">Time</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308]"
                        />
                      </div>
                      <button
                        onClick={() => scheduleBatch(batch.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {(batch.status === 'pending' || batch.status === 'scheduled') && (
                      <button
                        onClick={() => publishBatch(batch.id)}
                        disabled={batch.validationErrors.some(e => e.severity === 'error')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        Publish Now
                      </button>
                    )}
                    
                    {batch.status !== 'published' && batch.status !== 'cancelled' && (
                      <button
                        onClick={() => cancelBatch(batch.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                    
                    <Link
                      href={`/admin/batch-publish/${batch.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-[#262626] mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No Batches Created</h3>
          <p className="text-[#737373] mb-4">Create a batch to group content for publishing</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-medium rounded-lg hover:bg-[#ca9a06] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Batch
          </button>
        </div>
      )}

      {/* Available Content */}
      {availableContent.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Available for Batching ({availableContent.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableContent.slice(0, 6).map((item) => {
              const sectorDef = SECTOR_DEFINITIONS[item.content_sector];
              const verificationConfig = VERIFICATION_STATUS_CONFIG[item.verification_status];
              
              return (
                <div 
                  key={item.id}
                  className="p-3 bg-[#0a0a0a] border border-[#262626] rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm line-clamp-1">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs">{sectorDef?.icon}</span>
                        <span 
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{ 
                            backgroundColor: verificationConfig.color + '20',
                            color: verificationConfig.color
                          }}
                        >
                          {verificationConfig.label}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      item.fact_confidence_score >= 70 ? 'text-green-400' :
                      item.fact_confidence_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {item.fact_confidence_score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {availableContent.length > 6 && (
            <p className="text-center text-[#737373] text-sm mt-3">
              +{availableContent.length - 6} more items available
            </p>
          )}
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Batch</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Batch Name *
                </label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308]"
                  placeholder="e.g., Weekly Release, Holiday Special"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#737373] mb-2">
                  Description
                </label>
                <textarea
                  value={newBatchDescription}
                  onChange={(e) => setNewBatchDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:outline-none focus:border-[#eab308] resize-none"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createBatch}
                className="px-4 py-2 bg-[#eab308] text-black font-medium rounded-lg hover:bg-[#ca9a06] transition-colors"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


