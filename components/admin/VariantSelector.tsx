'use client';

/**
 * VARIANT SELECTOR COMPONENT
 *
 * Allows editors to select from AI-generated content variants.
 */

import { useState } from 'react';
import Image from 'next/image';
import type { ContentVariant, ImageCandidate } from '@/lib/intelligence/types';

interface VariantSelectorProps {
  variants: ContentVariant[];
  imageOptions: ImageCandidate[];
  recommendedVariantId?: string;
  recommendedImageUrl?: string;
  onSelect: (variantId: string, imageUrl: string) => void;
}

export function VariantSelector({
  variants,
  imageOptions,
  recommendedVariantId,
  recommendedImageUrl,
  onSelect,
}: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>(recommendedVariantId || variants[0]?.id || '');
  const [selectedImage, setSelectedImage] = useState<string>(recommendedImageUrl || imageOptions[0]?.url || '');
  const [activeTab, setActiveTab] = useState<'content' | 'images'>('content');

  const handleApply = () => {
    onSelect(selectedVariant, selectedImage);
  };

  const currentVariant = variants.find(v => v.id === selectedVariant);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Select Best Variant
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose from AI-generated options or create your own
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'content'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Content ({variants.length})
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'images'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Images ({imageOptions.length})
        </button>
      </div>

      {/* Content Variants */}
      {activeTab === 'content' && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {variants.map((variant) => (
            <div
              key={variant.id}
              onClick={() => setSelectedVariant(variant.id)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${selectedVariant === variant.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {variant.angle}
                  </span>
                  {variant.id === recommendedVariantId && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                      ⭐ Recommended
                    </span>
                  )}
                </div>
                <span className="text-sm font-mono text-gray-500">{variant.score}%</span>
              </div>

              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                {variant.title_te || variant.title}
              </h4>

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {variant.excerpt}
              </p>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 italic">
                {variant.reasoning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Image Options */}
      {activeTab === 'images' && (
        <div className="p-4 grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {imageOptions.map((image, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(image.url)}
              className={`
                relative aspect-video rounded-lg overflow-hidden cursor-pointer
                ${selectedImage === image.url
                  ? 'ring-2 ring-orange-500'
                  : 'hover:opacity-80'
                }
              `}
            >
              <Image
                src={image.url}
                alt={`Option ${idx + 1}`}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-medium">
                    {image.source}
                  </span>
                  <span className="text-xs text-white/80">
                    {Math.round(image.score)}%
                  </span>
                </div>
              </div>
              {image.url === recommendedImageUrl && (
                <div className="absolute top-1 right-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">
                  ⭐
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {currentVariant && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview
          </h4>
          <div className="flex gap-4">
            {selectedImage && (
              <div className="relative w-24 h-16 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={selectedImage}
                  alt="Selected"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-gray-900 dark:text-white truncate">
                {currentVariant.title_te}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {currentVariant.excerpt}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          Apply Selection
        </button>
      </div>
    </div>
  );
}

/**
 * MINI VARIANT INDICATOR
 * Shows how many variants are available
 */
interface VariantIndicatorProps {
  count: number;
  onClick?: () => void;
}

export function VariantIndicator({ count, onClick }: VariantIndicatorProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
    >
      <span>🔄</span>
      <span>{count} variants</span>
    </button>
  );
}



