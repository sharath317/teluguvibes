'use client';

/**
 * SearchBar Component
 * 
 * Expandable search bar for header with:
 * - Expandable/collapsible on mobile
 * - Keyboard shortcuts (Cmd/Ctrl + K)
 * - Recent searches
 * - Quick suggestions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  variant?: 'header' | 'page' | 'mobile';
  placeholder?: string;
  className?: string;
  onClose?: () => void;
}

// Popular search terms (can be fetched from API)
const TRENDING_SEARCHES = [
  'పుష్ప 2',
  'విజయ్ దేవరకొండ',
  'సమంత',
  'రష్మిక',
  'IPL 2026',
];

const MAX_RECENT_SEARCHES = 5;

export function SearchBar({
  variant = 'header',
  placeholder = 'వెతుకు...',
  className = '',
  onClose,
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(variant === 'page');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('teluguvibes-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setShowSuggestions(false);
        onClose?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onClose]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (variant === 'header' && !query) {
          setIsExpanded(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, variant]);

  // Save to recent searches
  const saveSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)]
      .slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem('teluguvibes-recent-searches', JSON.stringify(updated));
  }, [recentSearches]);

  // Handle search submission
  const handleSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    
    saveSearch(trimmed);
    setShowSuggestions(false);
    setIsExpanded(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onClose?.();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('teluguvibes-recent-searches');
  };

  // Compact button (header variant when collapsed)
  if (variant === 'header' && !isExpanded) {
    return (
      <button
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
        aria-label="Search"
        title="వెతుకు (⌘K)"
      >
        <Search className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div 
        className={`flex items-center gap-2 rounded-full transition-all ${
          variant === 'page' 
            ? 'px-4 py-3 text-base' 
            : 'px-3 py-1.5 text-sm'
        }`}
        style={{ 
          background: 'var(--bg-tertiary)', 
          border: showSuggestions ? '1px solid var(--brand-primary)' : '1px solid var(--border-secondary)',
        }}
      >
        <Search 
          className={`flex-shrink-0 ${variant === 'page' ? 'w-5 h-5' : 'w-4 h-4'}`} 
          style={{ color: 'var(--text-tertiary)' }} 
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none min-w-[120px]"
          style={{ color: 'var(--text-primary)' }}
          autoFocus={variant !== 'page'}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        )}
        {variant === 'header' && (
          <button
            onClick={() => {
              setIsExpanded(false);
              setShowSuggestions(false);
              onClose?.();
            }}
            className="p-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors ml-1"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        )}
        <kbd 
          className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded"
          style={{ 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-secondary)',
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-lg overflow-hidden z-50"
          style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-primary)',
          }}
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-secondary)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  ఇటీవల వెతికినవి
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-[10px] hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  తొలగించు
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(term)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {!query && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  ట్రెండింగ్
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(term)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{ 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Query Suggestions */}
          {query && (
            <div className="p-2">
              <button
                onClick={() => handleSearch(query)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  &quot;{query}&quot; కోసం వెతుకు
                </span>
                <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;






