import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Star, Calendar, Clock, Film, User, Music, Camera,
  Clapperboard, ThumbsUp, ThumbsDown, Play, ExternalLink,
  Award, Eye, Heart, Share2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { SchemaScript } from '@/components/seo/SchemaScript';
import { generateMovieSchema, generateBreadcrumbSchema } from '@/lib/seo/schema-generator';
import { ReviewInsightsPanel } from "@/components/reviews/ReviewInsightsPanel";
import { CompactSynopsis } from "@/components/reviews/CompactSynopsis";
import { QuickVerdictCard } from "@/components/reviews/QuickVerdictCard";
import { CompactRatings } from "@/components/reviews/CompactRatings";
import { CompactCast } from "@/components/reviews/CompactCast";
import { ReviewAccordion, PerformanceContent, StoryContent, DirectionContent, CulturalContent } from "@/components/reviews/ReviewAccordion";
import { SimilarMoviesCarousel } from "@/components/reviews/SimilarMoviesCarousel";
import { getSimilarMovieSections, type SimilarSection } from "@/lib/movies/similarity-engine";
import { MovieBadges } from "@/components/reviews/MovieBadges";
import type { Movie, MovieReview } from '@/types/reviews';
import type { ReviewInsights } from "@/lib/reviews/review-insights";

// ISR - Revalidate every hour
export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const { data: movie } = await supabase
    .from('movies')
    .select('title_en, title_te, synopsis, poster_url, director, avg_rating')
    .eq('slug', slug)
    .single();

  if (!movie) return { title: 'Movie Not Found' };

  return {
    title: `${movie.title_en} Review`,
    description: movie.synopsis || `${movie.title_en} directed by ${movie.director}. Rating: ${movie.avg_rating}/10`,
    openGraph: {
      title: `${movie.title_en} - Telugu Movie Review`,
      description: movie.synopsis,
      images: movie.poster_url ? [movie.poster_url] : [],
    },
  };
}

async function getMovieData(slug: string) {
  const { data: movie, error } = await supabase
    .from("movies")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !movie) return null;

  const { data: reviews } = await supabase
    .from("movie_reviews")
    .select("*")
    .eq("movie_id", movie.id)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  // Get smart similar movie sections using the similarity engine
  const similarSections = await getSimilarMovieSections({
    id: movie.id,
    title_en: movie.title_en,
    director: movie.director,
    hero: movie.hero,
    heroine: movie.heroine,
    genres: movie.genres,
    release_year: movie.release_year,
    language: movie.language,
    is_blockbuster: movie.is_blockbuster,
    is_classic: movie.is_classic,
    is_underrated: movie.is_underrated,
    our_rating: movie.our_rating,
    avg_rating: movie.avg_rating,
  });

  // Fetch review insights if available (from featured review or movie)
  let insights: ReviewInsights | null = null;
  const featuredReview = reviews?.find((r) => r.is_featured) || reviews?.[0];
  if (featuredReview?.insights) {
    insights = featuredReview.insights as ReviewInsights;
  }

  // Extract editorial review from dimensions_json if available
  let editorialReview: any = null;
  if (featuredReview?.dimensions_json) {
    const dims = featuredReview.dimensions_json as any;
    if (dims._type === 'editorial_review_v2') {
      editorialReview = dims;
    }
  }

  return { movie, reviews: reviews || [], similarSections, insights, editorialReview };
}

export default async function MovieReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getMovieData(slug);

  if (!data) notFound();

  const { movie, reviews, similarSections, insights, editorialReview } = data;
  const featuredReview = reviews.find(r => r.is_featured) || reviews[0];
  
  // Priority: Editorial review rating > Our rating > Featured review > Movie avg (TMDB can be inflated)
  const displayRating = editorialReview?.verdict?.final_rating 
    || movie.our_rating 
    || featuredReview?.overall_rating 
    || Math.min(movie.avg_rating || 0, 8.5) // Cap TMDB rating at 8.5 to prevent inflation
    || 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section with Backdrop */}
      <section className="relative">
        {/* Backdrop */}
        <div className="absolute inset-0 h-[500px]">
          {movie.backdrop_url ? (
            <Image
              src={movie.backdrop_url}
              alt={movie.title_en}
              fill
              className="object-cover"
              priority
            />
          ) : movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title_en}
              fill
              className="object-cover blur-xl opacity-30"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        </div>

        {/* Content - 3 Column Layout */}
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Poster + Trailer */}
            <div className="flex-shrink-0 lg:w-48">
              <div className="relative w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl mx-auto lg:mx-0">
                {movie.poster_url ? (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title_en}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Film className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Trailer Button - Compact */}
              {movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-48 mt-3 mx-auto lg:mx-0 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Trailer
                </a>
              )}
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white">
                    {movie.title_en}
                  </h1>
                  {movie.title_te && (
                    <p className="text-xl text-yellow-500 mt-1">{movie.title_te}</p>
                  )}
                </div>
                {/* Rating Badge - Only show if NO editorial review (verdict card shows it) */}
                {displayRating > 0 && !editorialReview && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-yellow-500 rounded-lg">
                    <Star className="w-4 h-4 text-black fill-black" />
                    <span className="text-lg font-bold text-black">{displayRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {movie.release_year && (
                  <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    {movie.release_year}
                  </span>
                )}
                {movie.runtime_minutes && (
                  <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(movie.runtime_minutes / 60)}h {movie.runtime_minutes % 60}m
                  </span>
                )}
                {movie.certification && (
                  <span className="px-2 py-0.5 border border-gray-600/50 rounded text-xs text-gray-400 bg-gray-800/50">
                    {movie.certification}
                  </span>
                )}
              </div>

              {/* Badges Row - New Component */}
              <div className="mb-4">
                <MovieBadges 
                  isBlockbuster={movie.is_blockbuster}
                  isUnderrated={movie.is_underrated}
                  isClassic={movie.is_classic}
                  isHit={displayRating >= 7 && !movie.is_blockbuster}
                />
              </div>

              {/* Genres - Compact */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {movie.genres.slice(0, 5).map((genre: string) => (
                  <Link
                    key={genre}
                    href={`/reviews?genre=${genre}`}
                    className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>

              {/* Cast - Compact Inline */}
              <div className="mb-4">
                <CompactCast 
                  cast={[
                    { role: 'Director', name: movie.director || '', icon: 'director' },
                    { role: 'Hero', name: movie.hero || '', icon: 'actor' },
                    { role: 'Heroine', name: movie.heroine || '', icon: 'actress' },
                    { role: 'Music', name: movie.music_director || '', icon: 'music' },
                  ]}
                  performances={editorialReview?.performances}
                />
              </div>

              {/* Synopsis - Compact with Show More */}
              {(editorialReview?.synopsis?.en || movie.synopsis) && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Synopsis
                  </h3>
                  <CompactSynopsis 
                    text={editorialReview?.synopsis?.en || movie.synopsis || ''} 
                    teluguText={editorialReview?.synopsis?.te}
                    maxLines={3}
                  />
                </div>
              )}

              {/* Compact Ratings - Under Synopsis */}
              {editorialReview && (
                <CompactRatings 
                  ratings={[
                    { label: 'Story', score: editorialReview.story_screenplay?.story_score || 0, icon: 'story' },
                    { label: 'Direction', score: editorialReview.direction_technicals?.direction_score || 0, icon: 'direction' },
                    { label: 'Music', score: editorialReview.direction_technicals?.music_score || 0, icon: 'music' },
                    { label: 'Cinematography', score: editorialReview.direction_technicals?.cinematography_score || 0, icon: 'camera' },
                    { label: 'Pacing', score: editorialReview.story_screenplay?.pacing_score || 0, icon: 'pacing' },
                    { label: 'Emotion', score: editorialReview.story_screenplay?.emotional_score || 0, icon: 'emotion' },
                    { label: 'Originality', score: editorialReview.story_screenplay?.originality_score || 0, icon: 'original' },
                    { label: 'Editing', score: editorialReview.direction_technicals?.editing_score || 0, icon: 'editing' },
                  ]}
                  overallRating={undefined} /* Rating shown in verdict card only */
                />
              )}
            </div>

            {/* Right: Quick Verdict Card */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-4 space-y-4">
                <QuickVerdictCard 
                  whyWatch={editorialReview?.why_watch}
                  whySkip={editorialReview?.why_skip}
                  verdict={editorialReview?.verdict}
                  qualityScore={editorialReview?._quality_score}
                  awards={editorialReview?.awards}
                  culturalHighlights={editorialReview?.cultural_impact ? {
                    legacy_status: editorialReview.cultural_impact.legacy_status,
                    cult_status: editorialReview.cultural_impact.cult_status
                  } : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: Quick Verdict (shown below hero on mobile) */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 -mt-4 mb-4">
        <QuickVerdictCard 
          whyWatch={editorialReview?.why_watch}
          whySkip={editorialReview?.why_skip}
          verdict={editorialReview?.verdict}
          qualityScore={editorialReview?._quality_score}
          awards={editorialReview?.awards}
          culturalHighlights={editorialReview?.cultural_impact ? {
            legacy_status: editorialReview.cultural_impact.legacy_status,
            cult_status: editorialReview.cultural_impact.cult_status
          } : undefined}
        />
      </div>

      {/* Editorial Review - Accordion Style */}
      {editorialReview && (editorialReview.performances || editorialReview.story_screenplay || editorialReview.direction_technicals || editorialReview.cultural_impact) && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Deep Dive
          </h2>

          <ReviewAccordion 
            defaultOpen="performances"
            sections={[
              ...(editorialReview.performances?.lead_actors?.length > 0 ? [{
                id: 'performances',
                title: 'Performances',
                icon: 'performances' as const,
                content: <PerformanceContent performances={editorialReview.performances} />
              }] : []),
              ...(editorialReview.story_screenplay ? [{
                id: 'story',
                title: 'Story & Screenplay',
                icon: 'story' as const,
                content: <StoryContent story={editorialReview.story_screenplay} />
              }] : []),
              ...(editorialReview.direction_technicals ? [{
                id: 'direction',
                title: 'Direction & Technicals',
                icon: 'direction' as const,
                content: <DirectionContent direction={editorialReview.direction_technicals} />
              }] : []),
              ...(editorialReview.cultural_impact ? [{
                id: 'cultural',
                title: 'Cultural Impact',
                icon: 'cultural' as const,
                content: <CulturalContent cultural={editorialReview.cultural_impact} />
              }] : []),
            ]}
          />
        </section>
      )}

      {/* Featured Review */}
      {featuredReview && !editorialReview && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Featured Review
          </h2>
          <DetailedReviewCard review={featuredReview} />
        </section>
      )}

      {/* Rating Breakdown - Only for non-editorial reviews */}
      {!editorialReview && (featuredReview?.dimensions || featuredReview?.direction_rating) && (
          <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
            <h2 className="text-lg font-bold text-white mb-4">Rating Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featuredReview?.dimensions ? (
                Object.entries(featuredReview.dimensions).slice(0, 8).map(
                  ([key, dim]: [string, any]) => (
                    <RatingBar
                      key={key}
                      label={dim.name_te || dim.name}
                      rating={dim.score}
                      icon={
                        key.includes("music") ? <Music /> : 
                        key.includes("direct") ? <Clapperboard /> : <Film />
                      }
                    />
                  )
                )
              ) : (
                <>
                  <RatingBar label="Direction" rating={featuredReview?.direction_rating} icon={<Clapperboard />} />
                  <RatingBar label="Screenplay" rating={featuredReview?.screenplay_rating} icon={<Film />} />
                  <RatingBar label="Acting" rating={featuredReview?.acting_rating} icon={<User />} />
                  <RatingBar label="Music" rating={featuredReview.music_rating} icon={<Music />} />
                </>
              )}
            </div>
          </section>
        )}

      {/* Director's Vision - Only for non-editorial reviews */}
      {!editorialReview && featuredReview?.directors_vision && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-500" />
            Director's Vision
          </h2>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-gray-300 leading-relaxed italic text-sm">
              "{featuredReview.directors_vision}"
            </p>
          </div>
        </section>
      )}

      {/* Strengths & Weaknesses - Only for non-editorial reviews */}
      {!editorialReview && featuredReview &&
        (featuredReview.strengths?.length > 0 ||
          featuredReview.weaknesses?.length > 0) && (
          <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
            <div className="grid md:grid-cols-2 gap-4">
              {featuredReview.strengths?.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {featuredReview.strengths.slice(0, 4).map(
                      (strength: string, i: number) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          {strength}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {featuredReview.weaknesses?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    Weaknesses
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {featuredReview.weaknesses.slice(0, 4).map(
                      (weakness: string, i: number) => (
                        <li key={i} className="text-gray-300 flex items-start gap-2">
                          <span className="text-red-500">✗</span>
                          {weakness}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

      {/* Enhanced Review Insights - Collapsed by default */}
      {insights && !editorialReview && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
          <ReviewInsightsPanel insights={insights} defaultExpanded={false} />
        </section>
      )}

      {/* Similar Movies - Smart Multi-Row Carousel */}
      {similarSections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-800">
          <h2 className="text-lg font-bold text-white mb-4">Discover More</h2>
          <SimilarMoviesCarousel sections={similarSections} />
        </section>
      )}
    </main>
  );
}

function CrewCard({ icon, role, name }: { icon: React.ReactNode; role: string; name: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-xl">
      <div className="p-2 bg-gray-800 rounded-lg text-yellow-500">
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm">{role}</p>
        <p className="text-white font-medium">{name}</p>
      </div>
    </div>
  );
}

function RatingBar({ label, rating, icon }: { label: string; rating?: number; icon: React.ReactNode }) {
  if (!rating) return null;
  const percentage = (rating / 10) * 100;

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-400">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-yellow-500 font-bold">{rating.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DetailedReviewCard({ review }: { review: MovieReview }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
            {review.reviewer_name.charAt(0)}
          </div>
          <div>
            <p className="text-white font-medium">{review.reviewer_name}</p>
            <p className="text-gray-500 text-sm capitalize">{review.reviewer_type} Review</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 rounded-full">
          <Star className="w-4 h-4 text-black fill-black" />
          <span className="text-black font-bold">{review.overall_rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h3 className="text-xl font-bold text-white mb-3">{review.title}</h3>
      )}

      {/* Summary */}
      {(review.summary || review.summary_te) && (
        <p className="text-gray-300 leading-relaxed mb-4">{review.summary_te || review.summary}</p>
      )}

      {/* Detailed Sections */}
      <div className="space-y-4">
        {review.direction_review && (
          <ReviewSection title="Direction" content={review.direction_review} />
        )}
        {review.screenplay_review && (
          <ReviewSection title="Screenplay" content={review.screenplay_review} />
        )}
        {review.acting_review && (
          <ReviewSection title="Acting" content={review.acting_review} />
        )}
        {review.music_review && (
          <ReviewSection title="Music" content={review.music_review} />
        )}
      </div>

      {/* Verdict */}
      {(review.verdict || review.verdict_te) && (
        <div className="mt-6 pt-6 border-t border-gray-800">
          <h4 className="text-lg font-bold text-yellow-500 mb-2">Final Verdict</h4>
          <p className="text-gray-300 text-xl">{review.verdict_te || review.verdict}</p>
          {review.verdict_te && review.verdict && review.verdict_te !== review.verdict && (
            <p className="text-gray-500 mt-1">{review.verdict}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-800 text-gray-500 text-sm">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {review.views.toLocaleString()} views
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-4 h-4" />
          {review.helpful_votes} found helpful
        </span>
      </div>
    </div>
  );
}

function ReviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-yellow-500 mb-1">{title}</h4>
      <p className="text-gray-400 text-sm">{content}</p>
    </div>
  );
}
