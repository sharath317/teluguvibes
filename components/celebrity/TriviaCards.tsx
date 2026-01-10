'use client';

/**
 * Trivia Cards Component
 * Displays fun facts and trivia in expandable cards
 */

import { useState } from 'react';
import { ChevronDown, CheckCircle, Sparkles, User, Briefcase, GraduationCap, Users } from 'lucide-react';
import type { CelebrityTrivia, TriviaCategory } from '@/lib/celebrity/types';

interface TriviaCardsProps {
  trivia: CelebrityTrivia[];
  className?: string;
}

export function TriviaCards({ trivia, className = '' }: TriviaCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TriviaCategory | null>(null);

  if (trivia.length === 0) {
    return null;
  }

  // Group by category (filter out undefined values)
  const categories = [...new Set(trivia.map(t => t.category).filter((c): c is TriviaCategory => c !== undefined))];
  
  const filteredTrivia = activeCategory 
    ? trivia.filter(t => t.category === activeCategory)
    : trivia;

  return (
    <section className={`${className}`}>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <span>Did You Know?</span>
        <span className="text-sm font-normal text-gray-400">({trivia.length} facts)</span>
      </h2>

      {/* Category filters */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <CategoryButton
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            icon={Sparkles}
            label="All"
          />
          {categories.map(category => (
            <CategoryButton
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              icon={getCategoryIcon(category)}
              label={formatCategoryLabel(category)}
            />
          ))}
        </div>
      )}

      {/* Trivia cards */}
      <div className="space-y-3">
        {filteredTrivia.map((item, index) => (
          <TriviaCard
            key={item.id || index}
            item={item}
            isExpanded={expandedId === (item.id || String(index))}
            onToggle={() => setExpandedId(
              expandedId === (item.id || String(index)) ? null : (item.id || String(index))
            )}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
        active
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function TriviaCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: CelebrityTrivia;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = getCategoryIcon(item.category || 'other');
  const hasTeluguText = item.trivia_text_te && item.trivia_text_te !== item.trivia_text;

  return (
    <div 
      className={`bg-gray-800/50 rounded-lg overflow-hidden transition-all ${
        isExpanded ? 'ring-1 ring-yellow-500/30' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-800/80 transition-colors"
      >
        {/* Icon */}
        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-yellow-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-gray-200 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {item.trivia_text}
          </p>
          
          {item.is_verified && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>

        {/* Expand indicator */}
        {(hasTeluguText || (item.trivia_text?.length ?? 0) > 100) && (
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && hasTeluguText && (
        <div className="px-4 pb-4 ml-11">
          <div className="pt-3 border-t border-gray-700">
            <p className="text-orange-400 text-sm">
              {item.trivia_text_te}
            </p>
          </div>
        </div>
      )}

      {/* Source link */}
      {isExpanded && item.source_url && (
        <div className="px-4 pb-4 ml-11">
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            Source →
          </a>
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(category: string): any {
  const icons: Record<string, any> = {
    personal: User,
    career: Briefcase,
    fun_fact: Sparkles,
    controversy: Sparkles,
    family: Users,
    education: GraduationCap,
  };
  return icons[category] || Sparkles;
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    personal: 'Personal',
    career: 'Career',
    fun_fact: 'Fun Facts',
    controversy: 'Controversies',
    family: 'Family',
    education: 'Education',
  };
  return labels[category] || category;
}


