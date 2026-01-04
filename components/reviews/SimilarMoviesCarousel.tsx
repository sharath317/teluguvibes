'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, Clock, Film, Clapperboard, User, Tag, Calendar, Trophy, Sparkles, Heart, Music, Flame, Award } from 'lucide-react';

interface SimilarMovie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  avg_rating?: number;
  release_year?: number;
  runtime_minutes?: number;
  genres?: string[];
  relevanceScore?: number;
}

export interface SimilarSection {
  id: string;
  title: string;
  subtitle?: string;
  movies: SimilarMovie[];
  matchType: 'best' | 'director' | 'hero' | 'heroine' | 'genre' | 'era' | 'tags' | 'rating' | 'classics' | 'blockbusters' | 'recent' | 'music';
  priority: number;
}

interface SimilarMoviesCarouselProps {
  movies?: SimilarMovie[];
  sections?: SimilarSection[];
  title?: string;
}

// Section styling configuration - expanded with more types
const sectionStyles: Record<string, {
  icon: React.ReactNode;
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
}> = {
  best: {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    gradient: 'from-amber-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-amber-700/40',
    iconBg: 'bg-amber-500/25',
    accent: 'text-amber-400',
  },
  director: {
    icon: <Clapperboard className="w-3.5 h-3.5" />,
    gradient: 'from-violet-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-violet-700/40',
    iconBg: 'bg-violet-500/25',
    accent: 'text-violet-400',
  },
  hero: {
    icon: <User className="w-3.5 h-3.5" />,
    gradient: 'from-blue-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-blue-700/40',
    iconBg: 'bg-blue-500/25',
    accent: 'text-blue-400',
  },
  heroine: {
    icon: <Heart className="w-3.5 h-3.5" />,
    gradient: 'from-rose-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-rose-700/40',
    iconBg: 'bg-rose-500/25',
    accent: 'text-rose-400',
  },
  genre: {
    icon: <Tag className="w-3.5 h-3.5" />,
    gradient: 'from-emerald-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-emerald-700/40',
    iconBg: 'bg-emerald-500/25',
    accent: 'text-emerald-400',
  },
  era: {
    icon: <Calendar className="w-3.5 h-3.5" />,
    gradient: 'from-orange-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-orange-700/40',
    iconBg: 'bg-orange-500/25',
    accent: 'text-orange-400',
  },
  tags: {
    icon: <Trophy className="w-3.5 h-3.5" />,
    gradient: 'from-pink-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-pink-700/40',
    iconBg: 'bg-pink-500/25',
    accent: 'text-pink-400',
  },
  rating: {
    icon: <Star className="w-3.5 h-3.5" />,
    gradient: 'from-yellow-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-yellow-700/40',
    iconBg: 'bg-yellow-500/25',
    accent: 'text-yellow-400',
  },
  classics: {
    icon: <Award className="w-3.5 h-3.5" />,
    gradient: 'from-indigo-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-indigo-700/40',
    iconBg: 'bg-indigo-500/25',
    accent: 'text-indigo-400',
  },
  blockbusters: {
    icon: <Flame className="w-3.5 h-3.5" />,
    gradient: 'from-red-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-red-700/40',
    iconBg: 'bg-red-500/25',
    accent: 'text-red-400',
  },
  recent: {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    gradient: 'from-cyan-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-cyan-700/40',
    iconBg: 'bg-cyan-500/25',
    accent: 'text-cyan-400',
  },
  music: {
    icon: <Music className="w-3.5 h-3.5" />,
    gradient: 'from-fuchsia-950/50 via-gray-900/70 to-gray-900/50',
    border: 'border-fuchsia-700/40',
    iconBg: 'bg-fuchsia-500/25',
    accent: 'text-fuchsia-400',
  },
};

// Single section carousel component - compact design for 50% width grid
function SectionCarousel({ 
  movies, 
  title, 
  subtitle,
  matchType = 'best',
}: { 
  movies: SimilarMovie[]; 
  title: string;
  subtitle?: string;
  matchType?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.6;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (!movies || movies.length === 0) return null;

  const style = sectionStyles[matchType] || sectionStyles.best;
  
  // Compact card sizes for 50% width layout
  const cardWidth = 'w-24 md:w-28';
  const posterSize = '(max-width: 768px) 96px, 112px';

  return (
    <div className={`rounded-lg border ${style.border} bg-gradient-to-br ${style.gradient} overflow-hidden h-full`}>
      {/* Header - Fixed layout to prevent overflow */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 min-w-0">
        {/* Title section with flex-shrink */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`p-1.5 rounded-md ${style.iconBg} flex-shrink-0`}>
            <span className={style.accent}>
              {style.icon}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-white truncate">{title}</h3>
            {subtitle && (
              <p className="text-[10px] text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Scroll buttons - fixed width, no shrink */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-1 rounded-full transition-all ${
              canScrollLeft
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-1 rounded-full transition-all ${
              canScrollRight
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto p-3 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex-shrink-0 snap-start"
              onMouseEnter={() => setHoveredId(movie.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card - compact for 50% width sections */}
              <div
                className={`relative ${cardWidth} transition-transform duration-200 ease-out ${
                  hoveredId === movie.id ? 'md:scale-105 md:z-20' : 'z-0'
                }`}
              >
                <Link href={`/reviews/${movie.slug}`} className="block group">
                  <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-800/50 ring-1 ring-white/10 group-hover:ring-white/30 transition-all shadow-md">
                    {movie.poster_url ? (
                      <Image
                        src={movie.poster_url}
                        alt={movie.title_en}
                        fill
                        className="object-cover"
                        sizes={posterSize}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-gray-600" />
                      </div>
                    )}

                    {/* Rating Badge */}
                    {movie.avg_rating && movie.avg_rating > 0 && (
                      <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 bg-black/75 backdrop-blur-sm rounded text-[9px] font-semibold">
                        <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                        <span className="text-white">{movie.avg_rating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-end p-1.5 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-150 ${
                        hoveredId === movie.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <h4 className="text-white font-medium text-[10px] leading-tight line-clamp-2">
                        {movie.title_en}
                      </h4>
                      
                      <div className="flex items-center gap-1 text-gray-400 text-[8px] mt-0.5">
                        {movie.release_year && <span>{movie.release_year}</span>}
                        {movie.genres && movie.genres[0] && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="truncate">{movie.genres[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Title below poster */}
                <div className={`mt-1.5 transition-opacity duration-150 ${hoveredId === movie.id ? 'md:opacity-0' : 'opacity-100'}`}>
                  <p className="text-gray-200 text-[10px] font-medium truncate">{movie.title_en}</p>
                  <p className="text-gray-500 text-[9px] truncate">
                    {movie.release_year}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main component - all sections at 50% width in 2-column grid
export function SimilarMoviesCarousel({ movies, sections, title = "Similar Movies" }: SimilarMoviesCarouselProps) {
  if (sections && sections.length > 0) {
    // Filter sections with at least 3 movies
    const validSections = sections.filter(s => s.movies.length >= 3);
    
    if (validSections.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {validSections.map((section) => (
          <SectionCarousel
            key={section.id}
            movies={section.movies}
            title={section.title}
            subtitle={section.subtitle}
            matchType={section.matchType}
          />
        ))}
      </div>
    );
  }
  
  // Fallback: single section wrapped in grid
  if (movies && movies.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCarousel
          movies={movies}
          title={title}
          matchType="best"
        />
      </div>
    );
  }
  
  return null;
}
