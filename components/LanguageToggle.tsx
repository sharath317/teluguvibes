'use client';

/**
 * Language Toggle Component
 * 
 * Switches between Telugu and English with a beautiful animated toggle.
 */

import { useLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'icon' | 'pill' | 'full';
  className?: string;
}

export function LanguageToggle({ variant = 'pill', className = '' }: LanguageToggleProps) {
  const { lang, toggleLang, isEnglish } = useLanguage();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleLang}
        className={`p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all touch-target haptic group ${className}`}
        aria-label={`Switch to ${isEnglish ? 'Telugu' : 'English'}`}
        title={isEnglish ? 'తెలుగులో చూడండి' : 'View in English'}
      >
        <Globe className="w-5 h-5 icon-animate group-hover:text-[var(--brand-primary)]" style={{ color: 'var(--text-secondary)' }} />
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <div 
          className="flex items-center rounded-full p-0.5"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => !isEnglish && toggleLang()}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all haptic ${
              !isEnglish 
                ? 'text-white shadow-md' 
                : 'hover:bg-[var(--bg-hover)]'
            }`}
            style={!isEnglish ? { 
              background: 'linear-gradient(135deg, var(--brand-primary), #ea580c)',
            } : {
              color: 'var(--text-secondary)',
            }}
          >
            తెలుగు
          </button>
          <button
            onClick={() => isEnglish || toggleLang()}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all haptic ${
              isEnglish 
                ? 'text-white shadow-md' 
                : 'hover:bg-[var(--bg-hover)]'
            }`}
            style={isEnglish ? { 
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            } : {
              color: 'var(--text-secondary)',
            }}
          >
            English
          </button>
        </div>
      </div>
    );
  }

  // Default: pill variant
  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all touch-target haptic group ${className}`}
      style={{ 
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
      }}
      aria-label={`Switch to ${isEnglish ? 'Telugu' : 'English'}`}
    >
      <Globe className="w-3.5 h-3.5 icon-animate" style={{ color: 'var(--text-tertiary)' }} />
      <span 
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: 'var(--text-primary)' }}
      >
        {isEnglish ? 'EN' : 'తె'}
      </span>
      <span 
        className="text-[10px] hidden sm:inline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {isEnglish ? '→ తెలుగు' : '→ EN'}
      </span>
    </button>
  );
}

export default LanguageToggle;






