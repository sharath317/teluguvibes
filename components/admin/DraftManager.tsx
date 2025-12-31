'use client';

/**
 * Draft Manager Component
 *
 * Features:
 * - Show variants side-by-side
 * - Multi-select publish/delete
 * - Regenerate locally
 * - Show source confidence
 */

import React, { useState } from 'react';
import { DraftResult, ContentVariant, ImageOption } from '@/lib/pipeline/draft-pipeline';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DraftManagerProps {
  drafts: DraftResult[];
  onPublish: (draftIndex: number, variantIndex: number) => Promise<void>;
  onDelete: (draftIndex: number) => Promise<void>;
  onRegenerate: (draftIndex: number) => Promise<void>;
  onBulkPublish: (indices: number[]) => Promise<void>;
  onBulkDelete: (indices: number[]) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: 'bg-green-500/20 text-green-400 border-green-500/30',
    review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    rework: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.review}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE BAR
// ═══════════════════════════════════════════════════════════════

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10">{percentage}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VARIANT CARD
// ═══════════════════════════════════════════════════════════════

function VariantCard({
  variant,
  isSelected,
  onSelect
}: {
  variant: ContentVariant;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-white text-sm line-clamp-1">{variant.titleTe || variant.title}</h4>
        <ConfidenceBar confidence={variant.confidence} />
      </div>
      <p className="text-gray-400 text-xs line-clamp-2 mb-2">{variant.excerpt}</p>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{variant.wordCount} words</span>
        <span>{variant.reasoning}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// IMAGE SELECTOR
// ═══════════════════════════════════════════════════════════════

function ImageSelector({
  images,
  selectedIndex,
  onSelect
}: {
  images: ImageOption[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        No images found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(idx)}
          className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
            selectedIndex === idx ? 'border-orange-500' : 'border-transparent hover:border-gray-600'
          }`}
        >
          <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1">
            <span className="text-xs text-white">{img.source}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRAFT CARD
// ═══════════════════════════════════════════════════════════════

function DraftCard({
  draft,
  index,
  isChecked,
  onCheck,
  onPublish,
  onDelete,
  onRegenerate,
}: {
  draft: DraftResult;
  index: number;
  isChecked: boolean;
  onCheck: (checked: boolean) => void;
  onPublish: (variantIndex: number) => void;
  onDelete: () => void;
  onRegenerate: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState(draft.selectedVariant || 0);
  const [selectedImage, setSelectedImage] = useState(draft.selectedImage || 0);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-800">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck(e.target.checked)}
          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
        />

        <div className="flex-1">
          <h3 className="font-semibold text-white">{draft.topic}</h3>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={draft.status} />
            <ConfidenceBar confidence={draft.overallConfidence} />
            <span className="text-xs text-gray-500">{draft.provider}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Variants */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Content Variants</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {draft.variants.map((variant, idx) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  isSelected={selectedVariant === idx}
                  onSelect={() => setSelectedVariant(idx)}
                />
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Images</h4>
            <ImageSelector
              images={draft.images}
              selectedIndex={selectedImage}
              onSelect={setSelectedImage}
            />
          </div>

          {/* Validation Errors */}
          {draft.validationErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-400 mb-1">Validation Issues</h4>
              <ul className="text-xs text-red-300 space-y-1">
                {draft.validationErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onPublish(selectedVariant)}
              disabled={draft.status === 'failed'}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Publish Selected
            </button>
            <button
              onClick={onRegenerate}
              className="px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 rounded-lg transition-colors"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 border border-red-500/50 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DraftManager({
  drafts,
  onPublish,
  onDelete,
  onRegenerate,
  onBulkPublish,
  onBulkDelete,
}: DraftManagerProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheck = (index: number, checked: boolean) => {
    const newChecked = new Set(checkedItems);
    if (checked) {
      newChecked.add(index);
    } else {
      newChecked.delete(index);
    }
    setCheckedItems(newChecked);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setCheckedItems(new Set(drafts.map((_, idx) => idx)));
    } else {
      setCheckedItems(new Set());
    }
  };

  const handleBulkPublish = async () => {
    setIsProcessing(true);
    try {
      await onBulkPublish(Array.from(checkedItems));
      setCheckedItems(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(Array.from(checkedItems));
      setCheckedItems(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats
  const stats = {
    total: drafts.length,
    ready: drafts.filter((d) => d.status === 'ready').length,
    review: drafts.filter((d) => d.status === 'review').length,
    rework: drafts.filter((d) => d.status === 'rework').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Drafts</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.ready}</div>
          <div className="text-sm text-green-400/70">Ready</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.review}</div>
          <div className="text-sm text-yellow-400/70">Need Review</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-400">{stats.rework}</div>
          <div className="text-sm text-orange-400/70">Need Rework</div>
        </div>
      </div>

      {/* Bulk Actions */}
      {checkedItems.size > 0 && (
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-4 flex items-center gap-4">
          <span className="text-gray-300">{checkedItems.size} selected</span>
          <button
            onClick={handleBulkPublish}
            disabled={isProcessing}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Publish Selected
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isProcessing}
            className="border border-red-500/50 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setCheckedItems(new Set())}
            className="text-gray-400 hover:text-white ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Select All */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checkedItems.size === drafts.length && drafts.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
        />
        <span className="text-gray-400 text-sm">Select All</span>
      </div>

      {/* Draft List */}
      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <DraftCard
            key={`${draft.topic}-${index}`}
            draft={draft}
            index={index}
            isChecked={checkedItems.has(index)}
            onCheck={(checked) => handleCheck(index, checked)}
            onPublish={(variantIndex) => onPublish(index, variantIndex)}
            onDelete={() => onDelete(index)}
            onRegenerate={() => onRegenerate(index)}
          />
        ))}
      </div>

      {/* Empty State */}
      {drafts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>No drafts yet. Generate some content!</p>
        </div>
      )}
    </div>
  );
}



