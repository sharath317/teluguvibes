'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, Clock, Film, Clapperboard, User, Tag, Calendar, Trophy, Sparkles } from 'lucide-react';

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
  matchType: 'best' | 'director' | 'hero' | 'genre' | 'era' | 'tags' | 'rating';
  priority: number;
}

interface SimilarMoviesCarouselProps {
  movies?: SimilarMovie[];
  sections?: SimilarSection[];
  title?: string;
}

// Section styling configuration
const sectionStyles: Record<string, {
  icon: React.ReactNode;
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
}> = {
  best: {
    icon: <Sparkles className="w-4 h-4" />,
    gradient: 'from-amber-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-amber-800/30',
    iconBg: 'bg-amber-500/20',
    accent: 'text-amber-400',
  },
  director: {
    icon: <Clapperboard className="w-4 h-4" />,
    gradient: 'from-violet-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-violet-800/30',
    iconBg: 'bg-violet-500/20',
    accent: 'text-violet-400',
  },
  hero: {
    icon: <User className="w-4 h-4" />,
    gradient: 'from-blue-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-blue-800/30',
    iconBg: 'bg-blue-500/20',
    accent: 'text-blue-400',
  },
  genre: {
    icon: <Tag className="w-4 h-4" />,
    gradient: 'from-emerald-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-emerald-800/30',
    iconBg: 'bg-emerald-500/20',
    accent: 'text-emerald-400',
  },
  era: {
    icon: <Calendar className="w-4 h-4" />,
    gradient: 'from-orange-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-orange-800/30',
    iconBg: 'bg-orange-500/20',
    accent: 'text-orange-400',
  },
  tags: {
    icon: <Trophy className="w-4 h-4" />,
    gradient: 'from-pink-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-pink-800/30',
    iconBg: 'bg-pink-500/20',
    accent: 'text-pink-400',
  },
  rating: {
    icon: <Star className="w-4 h-4" />,
    gradient: 'from-yellow-950/40 via-gray-900/60 to-gray-900/40',
    border: 'border-yellow-800/30',
    iconBg: 'bg-yellow-500/20',
    accent: 'text-yellow-400',
  },
};

// Single section carousel component
function SectionCarousel({ 
  movies, 
  title, 
  subtitle,
  matchType = 'best',
  isCompact = false,
}: { 
  movies: SimilarMovie[]; 
  title: string;
  subtitle?: string;
  matchType?: string;
  isCompact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
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
      const scrollAmount = scrollRef.current.clientWidth * 0.7;
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
  
  // Card sizes based on compact mode
  const cardWidth = isCompact ? 'w-28 md:w-32' : 'w-32 md:w-36';
  const posterSize = isCompact ? '(max-width: 768px) 112px, 128px' : '(max-width: 768px) 128px, 144px';

  return (
    <div className={`rounded-xl border ${style.border} bg-gradient-to-br ${style.gradient} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.iconBg}`}>
            <span className={style.accent}>
              {style.icon}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Scroll buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-1.5 rounded-full transition-all ${
              canScrollLeft
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-1.5 rounded-full transition-all ${
              canScrollRight
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto p-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex-shrink-0 snap-start"
              onMouseEnter={() => setHoveredId(movie.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card */}
              <div
                className={`relative ${cardWidth} transition-transform duration-300 ease-out ${
                  hoveredId === movie.id ? 'md:scale-105 md:z-20' : 'z-0'
                }`}
              >
                <Link href={`/reviews/${movie.slug}`} className="block group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800/50 ring-1 ring-white/10 group-hover:ring-white/25 transition-all shadow-lg">
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
                        <Film className="w-8 h-8 text-gray-600" />
                      </div>
                    )}

                    {/* Rating Badge */}
                    {movie.avg_rating && movie.avg_rating > 0 && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded-md text-[10px] font-semibold">
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-white">{movie.avg_rating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black via-black/70 to-transparent transition-opacity duration-200 ${
                        hoveredId === movie.id ? 'opacity-100' : 'opacity-0 md:opacity-0'
                      }`}
                    >
                      <h4 className="text-white font-semibold text-[11px] leading-tight mb-0.5 line-clamp-2">
                        {movie.title_en}
                      </h4>
                      
                      {movie.title_te && (
                        <p className="text-amber-400 text-[9px] mb-1 truncate">{movie.title_te}</p>
                      )}
                      
                      <div className="flex items-center gap-1 text-gray-400 text-[9px]">
                        {movie.release_year && <span>{movie.release_year}</span>}
                        {movie.runtime_minutes && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2 h-2" />
                              {formatRuntime(movie.runtime_minutes)}
                            </span>
                          </>
                        )}
                      </div>

                      {movie.genres && movie.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span
                              key={genre}
                              className="px-1.5 py-0.5 bg-white/15 rounded text-[8px] text-gray-300"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Title below poster */}
                <div className={`mt-2 transition-opacity duration-200 ${hoveredId === movie.id ? 'md:opacity-0' : 'opacity-100'}`}>
                  <p className="text-gray-200 text-[11px] font-medium truncate">{movie.title_en}</p>
                  <p className="text-gray-500 text-[10px] truncate">
                    {movie.release_year}
                    {movie.genres && movie.genres[0] && ` • ${movie.genres[0]}`}
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

// Main component with flexible layout
export function SimilarMoviesCarousel({ movies, sections, title = "Similar Movies" }: SimilarMoviesCarouselProps) {
  if (sections && sections.length > 0) {
    // Separate sections into full-width (8+) and compact (7 or fewer)
    const fullWidthSections = sections.filter(s => s.movies.length >= 8);
    const compactSections = sections.filter(s => s.movies.length < 8 && s.movies.length >= 3);
    
    return (
      <div className="space-y-4">
        {/* Full-width sections */}
        {fullWidthSections.map((section) => (
          <SectionCarousel
            key={section.id}
            movies={section.movies}
            title={section.title}
            subtitle={section.subtitle}
            matchType={section.matchType}
            isCompact={false}
          />
        ))}
        
        {/* Compact sections in a 2-column grid on desktop */}
        {compactSections.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compactSections.map((section) => (
              <SectionCarousel
                key={section.id}
                movies={section.movies}
                title={section.title}
                subtitle={section.subtitle}
                matchType={section.matchType}
                isCompact={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Fallback: single section
  if (movies && movies.length > 0) {
    return (
      <SectionCarousel
        movies={movies}
        title={title}
        matchType="best"
        isCompact={movies.length < 8}
      />
    );
  }
  
  return null;
}
