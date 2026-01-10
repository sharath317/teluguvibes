'use client';

import { useState } from 'react';
import { 
  AlertTriangle, Skull, Heart, Pill, Siren, 
  Flame, Eye, Dog, Frown, ChevronDown 
} from 'lucide-react';

type TriggerWarning = 
  | 'violence'
  | 'death'
  | 'trauma'
  | 'abuse'
  | 'substance-use'
  | 'suicide'
  | 'sexual-content'
  | 'gore'
  | 'disturbing-imagery'
  | 'animal-harm';

interface ContentWarningsProps {
  warnings?: TriggerWarning[] | string[] | null;
  ageRating?: string | null;
  compact?: boolean;
}

const warningConfig: Record<TriggerWarning, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'violence': {
    label: 'Violence',
    icon: <Siren className="w-3.5 h-3.5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    description: 'Contains violent content',
  },
  'death': {
    label: 'Death',
    icon: <Skull className="w-3.5 h-3.5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    description: 'Themes of death or dying',
  },
  'trauma': {
    label: 'Trauma',
    icon: <Frown className="w-3.5 h-3.5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Traumatic experiences depicted',
  },
  'abuse': {
    label: 'Abuse',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    description: 'Depicts abusive situations',
  },
  'substance-use': {
    label: 'Substance Use',
    icon: <Pill className="w-3.5 h-3.5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    description: 'Drug or alcohol use shown',
  },
  'suicide': {
    label: 'Suicide',
    icon: <Heart className="w-3.5 h-3.5" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/30',
    description: 'Contains suicide themes',
  },
  'sexual-content': {
    label: 'Sexual Content',
    icon: <Heart className="w-3.5 h-3.5" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    description: 'Adult sexual content',
  },
  'gore': {
    label: 'Gore',
    icon: <Flame className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-600/10 border-red-600/30',
    description: 'Graphic violent imagery',
  },
  'disturbing-imagery': {
    label: 'Disturbing',
    icon: <Eye className="w-3.5 h-3.5" />,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/30',
    description: 'Disturbing visual content',
  },
  'animal-harm': {
    label: 'Animal Harm',
    icon: <Dog className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    description: 'Animal cruelty depicted',
  },
};

export function ContentWarnings({ warnings, ageRating, compact = false }: ContentWarningsProps) {
  const [expanded, setExpanded] = useState(false);
  
  const validWarnings = (warnings || [])
    .filter((w): w is TriggerWarning => w in warningConfig);

  if (validWarnings.length === 0 && !ageRating) return null;

  const displayWarnings = compact && !expanded 
    ? validWarnings.slice(0, 3) 
    : validWarnings;

  return (
    <div className="space-y-2">
      {!compact && (
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Content Warnings
        </h4>
      )}
      
      <div className="flex flex-wrap gap-1.5">
        {displayWarnings.map((warning) => {
          const config = warningConfig[warning];
          return (
            <span
              key={warning}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${config.color} ${config.bgColor}`}
              title={config.description}
            >
              {config.icon}
              {config.label}
            </span>
          );
        })}
        
        {compact && validWarnings.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)]/30"
          >
            +{validWarnings.length - 3}
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {ageRating && (
        <p className="text-xs text-[var(--text-secondary)]">
          This film is rated <span className="font-medium text-[var(--text-primary)]">{ageRating}</span>
        </p>
      )}
    </div>
  );
}

// Single warning pill for inline use
export function WarningPill({ warning }: { warning: TriggerWarning }) {
  const config = warningConfig[warning];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${config.color} ${config.bgColor}`}
      title={config.description}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

