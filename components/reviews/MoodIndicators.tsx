'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart, Zap, Laugh, Ghost, Swords, Baby, Brain, 
  Sparkles, Music, Mountain, Clock, Film, Flame,
  HeartCrack, Smile, Crown, PartyPopper, AlertTriangle
} from 'lucide-react';

interface MoodOption {
  id: string;
  label: string;
  labelTe?: string;
  icon: any;
  color: string;
  bgGradient: string;
  description: string;
  query: string; // Query param for filtering
}

const moods: MoodOption[] = [
  {
    id: 'action',
    label: 'Action Packed',
    labelTe: 'యాక్షన్',
    icon: Zap,
    color: 'text-red-400',
    bgGradient: 'from-red-900/40 to-orange-900/30',
    description: 'High-octane fights & stunts',
    query: 'mood=action',
  },
  {
    id: 'emotional',
    label: 'Emotional',
    labelTe: 'ఎమోషనల్',
    icon: HeartCrack,
    color: 'text-pink-400',
    bgGradient: 'from-pink-900/40 to-rose-900/30',
    description: 'Tear-jerkers & heartfelt stories',
    query: 'mood=emotional',
  },
  {
    id: 'comedy',
    label: 'Comedy',
    labelTe: 'కామెడీ',
    icon: Laugh,
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-900/40 to-amber-900/30',
    description: 'Laugh-out-loud entertainment',
    query: 'mood=comedy',
  },
  {
    id: 'thriller',
    label: 'Thrilling',
    labelTe: 'థ్రిల్లింగ్',
    icon: Ghost,
    color: 'text-purple-400',
    bgGradient: 'from-purple-900/40 to-indigo-900/30',
    description: 'Edge-of-seat suspense',
    query: 'mood=thriller',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    labelTe: 'రొమాంటిక్',
    icon: Heart,
    color: 'text-rose-400',
    bgGradient: 'from-rose-900/40 to-pink-900/30',
    description: 'Love stories & chemistry',
    query: 'mood=romantic',
  },
  {
    id: 'family',
    label: 'Family',
    labelTe: 'ఫ్యామిలీ',
    icon: Baby,
    color: 'text-green-400',
    bgGradient: 'from-green-900/40 to-emerald-900/30',
    description: 'Watch with everyone',
    query: 'mood=family',
  },
  {
    id: 'mass',
    label: 'Mass',
    labelTe: 'మాస్',
    icon: Flame,
    color: 'text-orange-400',
    bgGradient: 'from-orange-900/40 to-red-900/30',
    description: 'Whistle-worthy moments',
    query: 'mood=mass',
  },
  {
    id: 'classic',
    label: 'Classic',
    labelTe: 'క్లాసిక్',
    icon: Crown,
    color: 'text-amber-400',
    bgGradient: 'from-amber-900/40 to-yellow-900/30',
    description: 'Timeless masterpieces',
    query: 'mood=classic',
  },
  {
    id: 'feel-good',
    label: 'Feel Good',
    labelTe: 'ఫీల్ గుడ్',
    icon: Smile,
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-900/40 to-teal-900/30',
    description: 'Uplifting & positive vibes',
    query: 'mood=feel-good',
  },
  {
    id: 'musical',
    label: 'Musical',
    labelTe: 'మ్యూజికల్',
    icon: Music,
    color: 'text-violet-400',
    bgGradient: 'from-violet-900/40 to-purple-900/30',
    description: 'Great songs & music',
    query: 'mood=musical',
  },
  {
    id: 'intense',
    label: 'Intense',
    labelTe: 'ఇంటెన్స్',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgGradient: 'from-red-900/50 to-gray-900/30',
    description: 'Dark & gripping narratives',
    query: 'mood=intense',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    labelTe: 'అడ్వెంచర్',
    icon: Mountain,
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-900/40 to-green-900/30',
    description: 'Epic journeys & exploration',
    query: 'mood=adventure',
  },
];

interface MoodIndicatorsProps {
  activeMood?: string;
  onMoodSelect?: (moodId: string) => void;
  compact?: boolean;
}

export function MoodIndicators({ activeMood, onMoodSelect, compact = false }: MoodIndicatorsProps) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleMoods = compact && !showAll ? moods.slice(0, 6) : moods;
  
  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Browse by Mood
          </h3>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {visibleMoods.map((mood) => {
          const Icon = mood.icon;
          const isActive = activeMood === mood.id;
          
          if (onMoodSelect) {
            return (
              <button
                key={mood.id}
                onClick={() => onMoodSelect(mood.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  isActive 
                    ? `bg-gradient-to-r ${mood.bgGradient} border-${mood.color.split('-')[1]}-500/50 ring-2 ring-${mood.color.split('-')[1]}-500/20`
                    : 'bg-gray-900/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? mood.color : 'text-gray-400 group-hover:' + mood.color}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {mood.label}
                </span>
              </button>
            );
          }
          
          return (
            <Link
              key={mood.id}
              href={`/reviews?${mood.query}`}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${mood.bgGradient} border border-gray-700/30 hover:border-gray-600 transition-all hover:scale-105`}
            >
              <Icon className={`w-4 h-4 ${mood.color}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{mood.label}</span>
                {!compact && (
                  <span className="text-[10px] text-gray-400">{mood.description}</span>
                )}
              </div>
            </Link>
          );
        })}
        
        {compact && moods.length > 6 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 text-sm transition-all border border-gray-700/30"
          >
            +{moods.length - 6} more
          </button>
        )}
      </div>
    </div>
  );
}

// Export moods for use in filtering logic
export { moods };
export type { MoodOption };


