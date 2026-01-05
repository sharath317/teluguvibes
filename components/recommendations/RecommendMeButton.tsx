'use client';

/**
 * Client-side "Recommend Me" button with modal
 * For use in Server Components (like review pages)
 */

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { RecommendMeModal } from './RecommendMeModal';
import type { EraPreference } from '@/lib/movies/recommend-me';

interface RecommendMeButtonProps {
  prefillLanguage?: string;
  prefillGenres?: string[];
  prefillEra?: EraPreference;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function RecommendMeButton({
  prefillLanguage,
  prefillGenres,
  prefillEra,
  variant = 'primary',
  className = '',
}: RecommendMeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseStyles = variant === 'primary'
    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20'
    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
          transition-all ${baseStyles} ${className}
        `}
      >
        <Wand2 className="w-4 h-4" />
        <span>Recommend Me</span>
      </button>

      <RecommendMeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        prefillLanguage={prefillLanguage}
        prefillGenres={prefillGenres}
        prefillEra={prefillEra}
      />
    </>
  );
}

