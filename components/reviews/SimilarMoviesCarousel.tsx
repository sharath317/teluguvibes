'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, Clock, Film, ExternalLink, Clapperboard, User, Tag, Calendar, Trophy } from 'lucide-react';

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

// Icon mapping for section types
const sectionIcons: Record<string, React.ReactNode> = {
  best: <Star className="w-4 h-4" />,
  director: <Clapperboard className="w-4 h-4" />,
  hero: <User className="w-4 h-4" />,
  genre: <Tag className="w-4 h-4" />,
  era: <Calendar className="w-4 h-4" />,
  tags: <Trophy className="w-4 h-4" />,
  rating: <Star className="w-4 h-4" />,
};

// Color mapping for section types
const sectionColors: Record<string, string> = {
  best: 'text-yellow-400',
  director: 'text-purple-400',
  hero: 'text-blue-400',
  genre: 'text-emerald-400',
  era: 'text-amber-400',
  tags: 'text-pink-400',
  rating: 'text-yellow-400',
};

// Single row carousel component
function SingleRowCarousel({ 
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
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
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

  const iconColor = sectionColors[matchType] || 'text-yellow-400';

  return (
    <div className="mb-6 last:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={iconColor}>
            {sectionIcons[matchType] || <Star className="w-4 h-4" />}
          </span>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Desktop scroll buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-1.5 rounded-full transition-all ${
              canScrollLeft
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-600 cursor-not-allowed'
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
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Gradient Fade */}
        {canScrollLeft && (
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        )}
        
        {/* Right Gradient Fade */}
        {canScrollRight && (
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex-shrink-0 snap-start relative"
              onMouseEnter={() => setHoveredId(movie.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card Container with hover scale */}
              <div
                className={`relative w-32 md:w-40 transition-all duration-300 ease-out ${
                  hoveredId === movie.id ? 'md:scale-105 md:z-20' : 'z-0'
                }`}
              >
                {/* Poster */}
                <Link href={`/reviews/${movie.slug}`} className="block">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg">
                    {movie.poster_url ? (
                      <Image
                        src={movie.poster_url}
                        alt={movie.title_en}
                        fill
                        className="object-cover transition-transform duration-300"
                        sizes="(max-width: 768px) 128px, 160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-600" />
                      </div>
                    )}

                    {/* Rating Badge */}
                    {movie.avg_rating && movie.avg_rating > 0 && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-medium">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400">{movie.avg_rating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Hover Overlay (Desktop only) */}
                    <div
                      className={`hidden md:flex absolute inset-0 flex-col justify-end p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
                        hoveredId === movie.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {/* Title */}
                      <h4 className="text-white font-bold text-xs leading-tight mb-0.5 line-clamp-2">
                        {movie.title_en}
                      </h4>
                      
                      {/* Telugu Title */}
                      {movie.title_te && (
                        <p className="text-yellow-400 text-[10px] mb-1.5 truncate">{movie.title_te}</p>
                      )}
                      
                      {/* Meta Row */}
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-1.5">
                        {movie.release_year && <span>{movie.release_year}</span>}
                        {movie.runtime_minutes && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRuntime(movie.runtime_minutes)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Genres */}
                      {movie.genres && movie.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span
                              key={genre}
                              className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-gray-300"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* View Review Button */}
                      <div className="flex items-center justify-center gap-1 py-1 bg-yellow-500 hover:bg-yellow-400 rounded text-black text-[10px] font-medium transition-colors">
                        View Review
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Title below poster (Mobile & default state on desktop) */}
                <div className={`mt-1.5 transition-opacity duration-300 ${hoveredId === movie.id ? 'md:opacity-0' : 'opacity-100'}`}>
                  <p className="text-gray-300 text-[11px] font-medium truncate">{movie.title_en}</p>
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

// Main component - supports both single movies array and multiple sections
export function SimilarMoviesCarousel({ movies, sections, title = "Similar Movies" }: SimilarMoviesCarouselProps) {
  // If sections are provided, render multiple rows
  if (sections && sections.length > 0) {
    return (
      <div className="space-y-2">
        {sections.map((section) => (
          <SingleRowCarousel
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
  
  // Fallback: single row with movies array
  if (movies && movies.length > 0) {
    return (
      <SingleRowCarousel
        movies={movies}
        title={title}
        matchType="best"
      />
    );
  }
  
  return null;
}

