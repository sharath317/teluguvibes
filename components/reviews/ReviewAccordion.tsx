'use client';

import { useState } from 'react';
import { ChevronDown, User, Film, Clapperboard, Eye, Heart, Globe, Star, Music, Award, Trophy, Medal } from 'lucide-react';

interface AccordionSection {
  id: string;
  title: string;
  icon: 'performances' | 'story' | 'direction' | 'cultural' | 'perspectives' | 'director' | 'awards';
  content: React.ReactNode;
}

interface ReviewAccordionProps {
  sections: AccordionSection[];
  defaultOpen?: string;
}

// Icon and color config for each section type
const sectionConfig: Record<string, { 
  Icon: any; 
  iconColor: string; 
  bgColor: string; 
  borderColor: string;
}> = {
  performances: { 
    Icon: User, 
    iconColor: 'text-blue-400', 
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  story: { 
    Icon: Film, 
    iconColor: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  direction: { 
    Icon: Clapperboard, 
    iconColor: 'text-amber-400', 
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  cultural: { 
    Icon: Globe, 
    iconColor: 'text-purple-400', 
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  perspectives: { 
    Icon: Eye, 
    iconColor: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  director: { 
    Icon: Eye, 
    iconColor: 'text-rose-400', 
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  awards: { 
    Icon: Trophy, 
    iconColor: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
};

export function ReviewAccordion({ sections, defaultOpen }: ReviewAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen || null);
  
  // Filter out sections without content
  const validSections = sections.filter(s => s.content);
  
  if (validSections.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {validSections.map((section) => {
        const config = sectionConfig[section.icon] || sectionConfig.story;
        const Icon = config.Icon;
        const isOpen = openId === section.id;
        
        return (
          <div 
            key={section.id} 
            className={`rounded-xl border transition-all ${
              isOpen 
                ? `${config.borderColor} bg-gradient-to-br from-gray-900 to-gray-950` 
                : 'border-gray-800/50 bg-gray-900/30 hover:bg-gray-900/50'
            }`}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                <span className="text-white font-medium">{section.title}</span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            {isOpen && (
              <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-200">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper component for performance display in accordion
export function PerformanceContent({ performances }: { performances: any }) {
  if (!performances?.lead_actors?.length) return null;
  
  // Score color based on rating
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-600/30';
    if (score >= 6) return 'bg-amber-500/20 text-amber-400 border-amber-600/30';
    return 'bg-orange-500/20 text-orange-400 border-orange-600/30';
  };
  
  return (
    <div className="space-y-3">
      {performances.lead_actors.map((actor: any, i: number) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white font-medium">{actor.name}</span>
              {actor.score && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${getScoreColor(actor.score)}`}>
                  <Star className="w-3 h-3 fill-current" />
                  {actor.score}/10
                </div>
              )}
            </div>
            {actor.career_significance && (
              <span className="text-amber-500/80 text-xs font-medium">{actor.career_significance}</span>
            )}
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">{actor.analysis}</p>
          </div>
        </div>
      ))}
      {performances.supporting_cast && (
        <div className="p-3 bg-gray-800/20 rounded-lg border border-gray-700/20">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Supporting Cast</span>
          <p className="text-gray-400 text-sm mt-1">{performances.supporting_cast}</p>
        </div>
      )}
      {performances.ensemble_chemistry && (
        <p className="text-gray-500 text-sm italic">{performances.ensemble_chemistry}</p>
      )}
    </div>
  );
}

// Helper for story/screenplay content
export function StoryContent({ story }: { story: any }) {
  if (!story) return null;
  
  return (
    <div className="space-y-4">
      {story.narrative_strength && (
        <div className="p-3 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-lg border border-emerald-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs uppercase tracking-wide font-medium">Narrative</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{story.narrative_strength}</p>
        </div>
      )}
      {story.pacing_analysis && (
        <div className="p-3 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-xs uppercase tracking-wide font-medium">⚡ Pacing</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{story.pacing_analysis}</p>
        </div>
      )}
      {story.emotional_engagement && (
        <div className="p-3 bg-gradient-to-r from-pink-900/20 to-rose-900/20 rounded-lg border border-pink-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-pink-400 text-xs uppercase tracking-wide font-medium">Emotional Impact</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{story.emotional_engagement}</p>
        </div>
      )}
      {/* Scores row */}
      <div className="flex flex-wrap gap-2 pt-2">
        {story.score && (
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
            Story: {story.score}/10
          </span>
        )}
        {story.originality_score && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
            Originality: {story.originality_score}/10
          </span>
        )}
      </div>
    </div>
  );
}

// Helper for direction/technicals content
export function DirectionContent({ direction }: { direction: any }) {
  if (!direction) return null;
  
  return (
    <div className="space-y-4">
      {direction.direction_style && (
        <div className="p-3 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-lg border border-amber-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 text-xs uppercase tracking-wide font-medium">Direction Style</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{direction.direction_style}</p>
        </div>
      )}
      {direction.cinematography_highlights && (
        <div className="p-3 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-cyan-400 text-xs uppercase tracking-wide font-medium">📷 Cinematography</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{direction.cinematography_highlights}</p>
        </div>
      )}
      {direction.music_bgm_impact && (
        <div className="p-3 bg-gradient-to-r from-purple-900/20 to-violet-900/20 rounded-lg border border-purple-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-400 text-xs uppercase tracking-wide font-medium">Music & BGM</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{direction.music_bgm_impact}</p>
        </div>
      )}
      {direction.editing_notes && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/20">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Editing</span>
          <p className="text-gray-400 text-sm mt-1">{direction.editing_notes}</p>
        </div>
      )}
      {/* Scores row */}
      <div className="flex flex-wrap gap-2 pt-2">
        {direction.score && (
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
            Direction: {direction.score}/10
          </span>
        )}
        {direction.music_score && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
            Music: {direction.music_score}/10
          </span>
        )}
        {direction.cinematography_score && (
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
            Cinematography: {direction.cinematography_score}/10
          </span>
        )}
      </div>
    </div>
  );
}

// Helper for cultural impact content
export function CulturalContent({ cultural }: { cultural: any }) {
  if (!cultural) return null;
  
  // Check if there's any actual content
  const hasContent = cultural.legacy_status || 
    cultural.cultural_significance || 
    cultural.influence_on_cinema || 
    (cultural.memorable_elements && cultural.memorable_elements.length > 0) ||
    cultural.legacy || // Old field name
    cultural.influence; // Old field name
  
  if (!hasContent) return null;
  
  return (
    <div className="space-y-4">
      {cultural.legacy_status && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold shadow-lg">
            {cultural.legacy_status}
          </span>
          {cultural.cult_status && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium border border-amber-500/30">
              🔥 Cult Status
            </span>
          )}
        </div>
      )}
      {(cultural.cultural_significance || cultural.legacy) && (
        <div className="p-3 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-lg border border-purple-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-400 text-xs uppercase tracking-wide font-medium">Cultural Significance</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{cultural.cultural_significance || cultural.legacy}</p>
        </div>
      )}
      {(cultural.influence_on_cinema || cultural.influence) && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/20">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Influence on Cinema</span>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{cultural.influence_on_cinema || cultural.influence}</p>
        </div>
      )}
      {((cultural.memorable_elements && cultural.memorable_elements.length > 0) || 
        (cultural.iconic_elements && cultural.iconic_elements.length > 0)) && (
        <div>
          <span className="text-gray-500 text-xs uppercase tracking-wide">Memorable Elements</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(cultural.memorable_elements || cultural.iconic_elements || []).map((el: string, i: number) => (
              <span 
                key={i} 
                className="px-2.5 py-1 bg-gradient-to-r from-gray-800 to-gray-800/50 text-gray-300 rounded-lg text-xs border border-gray-700/30"
              >
                ✨ {el}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for awards content
export function AwardsContent({ awards }: { awards: any }) {
  if (!awards) return null;
  
  const hasAwards = (awards.national_awards?.length > 0) ||
                   (awards.filmfare_awards?.length > 0) ||
                   (awards.nandi_awards?.length > 0) ||
                   (awards.other_awards?.length > 0) ||
                   (awards.box_office_records?.length > 0);
  
  if (!hasAwards) return null;
  
  return (
    <div className="space-y-4">
      {/* National Awards */}
      {awards.national_awards?.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-lg border border-yellow-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-xs uppercase tracking-wide font-medium">National Awards</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {awards.national_awards.map((award: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs font-medium">
                🏆 {award}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Filmfare Awards */}
      {awards.filmfare_awards?.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-lg border border-orange-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-xs uppercase tracking-wide font-medium">Filmfare Awards</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {awards.filmfare_awards.map((award: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-medium">
                🎭 {award}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Nandi Awards */}
      {awards.nandi_awards?.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-lg border border-blue-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Medal className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs uppercase tracking-wide font-medium">Nandi Awards</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {awards.nandi_awards.map((award: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                🎬 {award}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Box Office Records */}
      {awards.box_office_records?.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-lg border border-emerald-700/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400 text-xs uppercase tracking-wide font-medium">📊 Box Office Records</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {awards.box_office_records.map((record: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs font-medium">
                💰 {record}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Other Awards */}
      {awards.other_awards?.length > 0 && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/20">
          <span className="text-gray-500 text-xs uppercase tracking-wide">Other Achievements</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {awards.other_awards.map((award: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs">
                🌟 {award}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
