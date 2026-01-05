'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CompactSynopsisProps {
  text: string;
  teluguText?: string;
  maxLines?: number;
}

export function CompactSynopsis({ text, teluguText, maxLines = 3 }: CompactSynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Estimate if text needs truncation (roughly 60 chars per line)
  const needsTruncation = text.length > maxLines * 80;
  
  return (
    <div className="relative">
      <div className={`text-gray-400 leading-relaxed ${!isExpanded && needsTruncation ? 'line-clamp-3' : ''}`}>
        {text}
      </div>
      
      {/* Telugu synopsis - only show when expanded */}
      {isExpanded && teluguText && (
        <p className="text-gray-500 leading-relaxed mt-3 italic border-l-2 border-yellow-500/30 pl-3">
          {teluguText}
        </p>
      )}
      
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mt-2 text-yellow-500 hover:text-yellow-400 text-sm font-medium transition-colors"
        >
          {isExpanded ? (
            <>Show less <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show more <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}


