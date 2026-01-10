'use client';

import { AlertTriangle, X, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';

type ContentType = 'speculative' | 'editorial' | 'fan-theory' | 'what-if';

interface SpeculativeDisclaimerProps {
  type?: ContentType;
  dismissable?: boolean;
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
}

const typeConfig: Record<ContentType, {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}> = {
  'speculative': {
    title: 'Speculative Content',
    description: 'This content is based on speculation and is not factual. It is meant for entertainment purposes only.',
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  'editorial': {
    title: 'Editorial Content',
    description: 'This content represents editorial opinions and analysis. It may contain subjective viewpoints.',
    icon: <Info className="w-5 h-5" />,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  'fan-theory': {
    title: 'Fan Theory',
    description: 'This is a fan-created theory based on available information. It is not confirmed or official.',
    icon: <Sparkles className="w-5 h-5" />,
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  'what-if': {
    title: 'What-If Scenario',
    description: 'This is a fictional exploration of an alternate scenario. It is not based on real events.',
    icon: <Sparkles className="w-5 h-5" />,
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    iconColor: 'text-pink-400',
  },
};

export function SpeculativeDisclaimer({ 
  type = 'speculative', 
  dismissable = false,
  variant = 'banner',
  className = ''
}: SpeculativeDisclaimerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;

  const config = typeConfig[type];

  if (variant === 'compact') {
    return (
      <span 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.bgColor} border ${config.borderColor} ${config.iconColor} ${className}`}
        title={config.description}
      >
        {config.icon}
        {config.title}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 p-2 rounded-lg ${config.bgColor} border ${config.borderColor} ${className}`}>
        <span className={config.iconColor}>{config.icon}</span>
        <p className="text-xs text-[var(--text-secondary)]">
          <span className={`font-medium ${config.iconColor}`}>{config.title}:</span>{' '}
          {config.description}
        </p>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={`relative p-4 rounded-xl ${config.bgColor} border ${config.borderColor} ${className}`}>
      {dismissable && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.iconColor}`}>
          {config.icon}
        </div>
        
        <div className="flex-1 pr-6">
          <h4 className={`font-semibold ${config.iconColor} mb-1`}>
            {config.title}
          </h4>
          <p className="text-sm text-[var(--text-secondary)]">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// Page-level wrapper for speculative content
export function SpeculativeContentWrapper({ 
  children,
  type = 'speculative',
}: { 
  children: React.ReactNode;
  type?: ContentType;
}) {
  return (
    <div className="space-y-4">
      <SpeculativeDisclaimer type={type} variant="banner" />
      
      {/* Visual separator to indicate speculative zone */}
      <div className="relative">
        {/* Border indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-amber-500 via-orange-500 to-amber-500 opacity-50" />
        
        <div className="pl-4">
          {children}
        </div>
      </div>
    </div>
  );
}

