'use client';

import { 
  User, Clapperboard, Music, Camera, Film, ChevronRight, Star,
  Megaphone, Pencil, Palette
} from 'lucide-react';
import { useState } from 'react';

interface CastMember {
  role: string;
  name: string;
  icon: 'director' | 'actor' | 'actress' | 'music' | 'camera' | 'writer' | 'producer' | 'art';
}

interface CompactCastProps {
  cast: CastMember[];
  performances?: {
    lead_actors?: Array<{ name: string; score: number; career_significance?: string }>;
  };
}

// Role-based styling with unique colors and icons
const roleStyles: Record<string, { 
  Icon: any; 
  bg: string; 
  iconColor: string; 
  borderColor: string;
}> = {
  director: { 
    Icon: Clapperboard, 
    bg: 'from-amber-900/40 to-amber-900/20',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-700/40',
  },
  actor: { 
    Icon: User, 
    bg: 'from-blue-900/40 to-blue-900/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-700/40',
  },
  actress: { 
    Icon: User, 
    bg: 'from-pink-900/40 to-pink-900/20',
    iconColor: 'text-pink-400',
    borderColor: 'border-pink-700/40',
  },
  music: { 
    Icon: Music, 
    bg: 'from-purple-900/40 to-purple-900/20',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-700/40',
  },
  camera: { 
    Icon: Camera, 
    bg: 'from-cyan-900/40 to-cyan-900/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-700/40',
  },
  writer: { 
    Icon: Pencil, 
    bg: 'from-green-900/40 to-green-900/20',
    iconColor: 'text-green-400',
    borderColor: 'border-green-700/40',
  },
  producer: { 
    Icon: Megaphone, 
    bg: 'from-orange-900/40 to-orange-900/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-orange-700/40',
  },
  art: { 
    Icon: Palette, 
    bg: 'from-rose-900/40 to-rose-900/20',
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-700/40',
  },
};

const getStyle = (icon: string) => {
  return roleStyles[icon] || roleStyles.actor;
};

// Score color based on rating
const getScoreColor = (score: number) => {
  if (score >= 8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-600/30';
  if (score >= 6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-600/30';
  return 'bg-orange-500/20 text-orange-400 border-orange-600/30';
};

export function CompactCast({ cast, performances }: CompactCastProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Filter out empty cast members
  const validCast = cast.filter(c => c.name);
  
  if (validCast.length === 0) return null;
  
  // Show first 4, rest on expand
  const visibleCast = showAll ? validCast : validCast.slice(0, 4);
  
  return (
    <div className="flex flex-wrap gap-2">
      {visibleCast.map((member, i) => {
        const style = getStyle(member.icon);
        const Icon = style.Icon;
        const performance = performances?.lead_actors?.find(a => 
          a.name.toLowerCase().includes(member.name.toLowerCase().split(' ')[0])
        );
        
        return (
          <div 
            key={i} 
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r ${style.bg} border ${style.borderColor} hover:border-gray-600 transition-all cursor-default`}
          >
            <div className={`p-1.5 rounded-md bg-gray-900/50 ${style.iconColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-medium truncate max-w-[120px]">
                {member.name}
              </span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                {member.role}
              </span>
            </div>
            {performance && performance.score > 0 && (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${getScoreColor(performance.score)}`}>
                <Star className="w-2.5 h-2.5 fill-current" />
                {performance.score}
              </div>
            )}
          </div>
        );
      })}
      
      {validCast.length > 4 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-gray-300 text-sm transition-all border border-gray-700/30"
        >
          +{validCast.length - 4} more
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
