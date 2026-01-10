import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Star,
  Calendar,
  Clock,
  Film,
  User,
  Music,
  Camera,
  Clapperboard,
  ThumbsUp,
  ThumbsDown,
  Play,
  ExternalLink,
  Award,
  Eye,
  Heart,
  Share2,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { SchemaScript } from "@/components/seo/SchemaScript";
import {
  generateMovieSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/schema-generator";
import { ReviewInsightsPanel } from "@/components/reviews/ReviewInsightsPanel";
import { CompactSynopsis } from "@/components/reviews/CompactSynopsis";
import { QuickVerdictCard } from "@/components/reviews/QuickVerdictCard";
import { CompactRatings } from "@/components/reviews/CompactRatings";
import { CompactCast } from "@/components/reviews/CompactCast";
import {
  ReviewAccordion,
  PerformanceContent,
  StoryContent,
  DirectionContent,
  CulturalContent,
} from "@/components/reviews/ReviewAccordion";
import { SimilarMoviesCarousel } from "@/components/reviews/SimilarMoviesCarousel";
import {
  getSimilarMovieSections,
  type SimilarSection,
} from "@/lib/movies/similarity-engine";
import { RecommendMeButton } from "@/components/recommendations/RecommendMeButton";
import { MovieBadges } from "@/components/reviews/MovieBadges";
import { MobileSynopsis } from "@/components/reviews/MobileSynopsis";
import { ContentWarnings } from "@/components/reviews/ContentWarnings";
import type { Movie, MovieReview } from "@/types/reviews";
import type { ReviewInsights } from "@/lib/reviews/review-insights";
import {
  isMovieUpcoming,
  getUpcomingLabel,
  shouldHideRating,
} from "@/lib/utils/movie-status";
// Rating utilities available: getRatingCategory, getCategoryLabel, getCategoryColor from "@/lib/ratings/editorial-rating"

// ISR - Revalidate every hour
export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const { data: movie } = await supabase
    .from("movies")
    .select("title_en, title_te, synopsis, poster_url, director, avg_rating")
    .eq("slug", slug)
    .single();

  if (!movie) return { title: "Movie Not Found" };

  return {
    title: `${movie.title_en} Review`,
    description:
      movie.synopsis ||
      `${movie.title_en} directed by ${movie.director}. Rating: ${movie.avg_rating}/10`,
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
    music_director: movie.music_director,
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
    if (dims._type === "editorial_review_v2") {
      editorialReview = dims;
    }
  }

  return {
    movie,
    reviews: reviews || [],
    similarSections,
    insights,
    editorialReview,
  };
}

export default async function MovieReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getMovieData(slug);

  if (!data) notFound();

  const { movie, reviews, similarSections, insights, editorialReview } = data;
  const featuredReview = reviews.find((r) => r.is_featured) || reviews[0];

  // Check if movie is upcoming (not yet released) or has incomplete data
  const isUpcoming = isMovieUpcoming(movie);
  const hideRating = shouldHideRating(movie); // Hide for upcoming OR no release year
  const upcomingLabel = isUpcoming ? getUpcomingLabel(movie) : "";

  // Priority: Editorial verdict > Featured review rating > Our rating > Movie avg (TMDB can be inflated)
  // Don't show rating for upcoming movies or movies without release year
  const displayRating = hideRating
    ? 0
    : editorialReview?.verdict?.final_rating ||
      featuredReview?.overall_rating ||
      movie.our_rating ||
      Math.min(movie.avg_rating || 0, 8.5) || // Cap TMDB rating at 8.5 to prevent inflation
      0;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* ===== MOBILE LAYOUT (< lg) ===== */}
      <div className="lg:hidden">
        {/* Mobile Hero - Compact with Rating at Top */}
        <section className="relative">
          {/* Blurred backdrop */}
          <div className="absolute inset-0 h-[200px]">
            {movie.poster_url && (
              <Image
                src={movie.poster_url}
                alt=""
                fill
                className="object-cover blur-2xl opacity-40"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)]/70 to-[var(--bg-primary)]" />
          </div>

          {/* Floating Share Button - Top Right */}
          <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors">
            <Share2 className="w-4 h-4 text-[var(--text-primary)]" />
          </button>

          {/* Content */}
          <div className="relative px-4 pt-4 pb-3">
            {/* Top Row: Poster + Title + Rating */}
            <div className="flex gap-3">
              {/* Compact Poster */}
              <div className="flex-shrink-0 w-24">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-xl">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title_en}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                      <Film className="w-8 h-8 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title + Meta + Rating */}
              <div className="flex-1 min-w-0">
                {/* Rating Badge - Prominent at top (hide for upcoming/incomplete) */}
                {!hideRating && displayRating > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                      <Star className="w-4 h-4 text-black fill-black" />
                      <span className="text-lg font-bold text-black">
                        {displayRating.toFixed(1)}
                      </span>
                    </div>
                    {/* Badges inline */}
                    <MovieBadges
                      isBlockbuster={movie.is_blockbuster}
                      isUnderrated={movie.is_underrated}
                      isClassic={movie.is_classic}
                      isHit={displayRating >= 7 && !movie.is_blockbuster}
                      compact
                    />
                  </div>
                )}

                {/* Title */}
                <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
                  {movie.title_en}
                </h1>
                {movie.title_te && (
                  <p className="text-sm text-yellow-500/80 mt-0.5 truncate">
                    {movie.title_te}
                  </p>
                )}

                {/* Meta - Compact inline */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-[var(--text-secondary)]">
                  {movie.release_year && <span>{movie.release_year}</span>}
                  {movie.runtime_minutes && (
                    <>
                      <span>•</span>
                      <span>
                        {Math.floor(movie.runtime_minutes / 60)}h{" "}
                        {movie.runtime_minutes % 60}m
                      </span>
                    </>
                  )}
                  {movie.certification && (
                    <>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 border border-[var(--border-secondary)]/50 rounded text-[10px]">
                        {movie.certification}
                      </span>
                    </>
                  )}
                </div>

                {/* Genres - Explicit 20px height pills */}
                <div className="flex gap-1 mt-1.5 items-center flex-wrap">
                  {movie.genres.slice(0, 3).map((genre: string) => (
                    <Link
                      key={genre}
                      href={`/reviews?genre=${genre}`}
                      className="h-5 px-2 rounded text-[10px] text-[var(--text-secondary)] whitespace-nowrap border border-[var(--border-primary)]/50 hover:border-[var(--border-secondary)] inline-flex items-center"
                    >
                      {genre}
                    </Link>
                  ))}
                  {movie.genres.length > 3 && (
                    <span className="h-5 text-[10px] text-[var(--text-tertiary)] inline-flex items-center">
                      +{movie.genres.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Coming Soon Banner - Enhanced for Upcoming Movies */}
            {isUpcoming && (
              <div className="mt-3 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-purple-500/20 border border-orange-500/40 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <span className="text-orange-300 font-bold text-sm block">
                        COMING SOON
                      </span>
                      <span className="text-orange-200/80 text-xs">
                        {upcomingLabel}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-orange-500/30 rounded text-[10px] font-bold text-orange-200 uppercase tracking-wider">
                    Upcoming
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mobile: Synopsis + Cast */}
        <section className="px-4 py-2 border-t border-[var(--border-primary)]/30 relative z-10 bg-[var(--bg-primary)]">
          {/* Synopsis - With expand/collapse */}
          {(editorialReview?.synopsis?.en || movie.synopsis) && (
            <MobileSynopsis
              text={editorialReview?.synopsis?.en || movie.synopsis || ""}
            />
          )}

          {/* Cast - Horizontal scroll with chips */}
          <div
            className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {[
              { role: "Dir", name: movie.director },
              { role: "Hero", name: movie.hero },
              { role: "Heroine", name: movie.heroine },
              { role: "Music", name: movie.music_director },
            ]
              .filter((c) => c.name && c.name !== "N/A")
              .map((cast, i) => (
                <span
                  key={i}
                  className="flex-shrink-0 text-[10px] px-2 py-1 bg-[var(--bg-secondary)]/60 rounded-full border border-[var(--border-primary)]/30"
                >
                  <span className="text-[var(--text-tertiary)]">
                    {cast.role}:
                  </span>{" "}
                  <span className="text-[var(--text-secondary)]">
                    {cast.name}
                  </span>
                </span>
              ))}
            {/* More button */}
            <button className="flex-shrink-0 p-1.5 bg-[var(--bg-secondary)]/60 rounded-full border border-[var(--border-primary)]/30 hover:bg-[var(--bg-tertiary)]/60 transition-colors">
              <MoreVertical className="w-3 h-3 text-[var(--text-secondary)]" />
            </button>
          </div>
        </section>

        {/* Mobile: Quick Actions Row */}
        {movie.trailer_url && (
          <section className="px-4 py-2">
            <a
              href={movie.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-[var(--text-primary)] rounded-lg text-xs font-medium w-full"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Trailer
            </a>
          </section>
        )}

        {/* Mobile: Enriched Verdict Card */}
        {!hideRating &&
          (editorialReview?.why_watch?.length > 0 ||
            editorialReview?.verdict) && (
            <section className="px-4 py-2">
              <div
                className="rounded-xl border border-[var(--border-primary)]/50 overflow-hidden shadow-md"
                style={{
                  background: `linear-gradient(to bottom right, var(--bg-card-gradient-start), var(--bg-card-gradient-end))`,
                }}
              >
                {/* Verdict Header - Enriched */}
                {editorialReview?.verdict && (
                  <div className="px-3 py-2.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-[var(--border-primary)]/30">
                    {/* Top Row: Category + Rating */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎬</span>
                        <span className="text-yellow-400 font-semibold text-sm">
                          {editorialReview.verdict.category || "Recommended"}
                        </span>
                      </div>
                      {editorialReview.verdict.final_rating && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-400 font-bold text-sm">
                            {editorialReview.verdict.final_rating}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tagline */}
                    {editorialReview.verdict.en && (
                      <p className="text-xs text-[var(--text-secondary)] italic line-clamp-2 mb-2">
                        "{editorialReview.verdict.en}"
                      </p>
                    )}

                    {/* Inline Ratings */}
                    {(editorialReview.story_screenplay?.story_score ||
                      editorialReview.direction_technicals
                        ?.direction_score) && (
                      <div
                        className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-2"
                        style={{ scrollbarWidth: "none" }}
                      >
                        {[
                          {
                            label: "Story",
                            score:
                              editorialReview.story_screenplay?.story_score,
                          },
                          {
                            label: "Direction",
                            score:
                              editorialReview.direction_technicals
                                ?.direction_score,
                          },
                          {
                            label: "Music",
                            score:
                              editorialReview.direction_technicals?.music_score,
                          },
                          {
                            label: "Visuals",
                            score:
                              editorialReview.direction_technicals
                                ?.cinematography_score,
                          },
                        ]
                          .filter((r) => r.score && r.score > 0)
                          .map((rating) => (
                            <div
                              key={rating.label}
                              className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--bg-primary)]/60 rounded border border-[var(--border-primary)]/40"
                            >
                              <span className="text-[var(--text-tertiary)] text-[9px]">
                                {rating.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold ${
                                  (rating.score || 0) >= 8
                                    ? "text-green-400"
                                    : (rating.score || 0) >= 6
                                    ? "text-yellow-400"
                                    : "text-orange-400"
                                }`}
                              >
                                {rating.score?.toFixed(1)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Best For Chips */}
                    {editorialReview.why_watch?.best_for?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          Best for:
                        </span>
                        {editorialReview.why_watch.best_for
                          .slice(0, 3)
                          .map((audience: string, i: number) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30"
                            >
                              {audience}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Why Watch */}
                {editorialReview?.why_watch?.length > 0 && (
                  <div className="px-3 py-2.5">
                    <h4 className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Why Watch
                    </h4>
                    <ul className="space-y-1">
                      {(Array.isArray(editorialReview.why_watch)
                        ? editorialReview.why_watch
                        : editorialReview.why_watch.reasons || []
                      )
                        .slice(0, 3)
                        .map((reason: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5"
                          >
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span className="line-clamp-1">{reason}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Why Skip - Collapsed */}
                {editorialReview?.why_skip?.reasons?.length > 0 && (
                  <div className="px-3 py-2 border-t border-[var(--border-primary)]/30">
                    <details className="group">
                      <summary className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] cursor-pointer list-none">
                        <ThumbsDown className="w-3 h-3" />
                        <span>Considerations</span>
                        <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
                      </summary>
                      <ul className="mt-1.5 space-y-1">
                        {editorialReview.why_skip.reasons
                          .slice(0, 2)
                          .map((reason: string, i: number) => (
                            <li
                              key={i}
                              className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5"
                            >
                              <span className="text-orange-400">⚠</span>
                              <span className="line-clamp-1">{reason}</span>
                            </li>
                          ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            </section>
          )}
      </div>

      {/* ===== DESKTOP LAYOUT (>= lg) ===== */}
      <section className="hidden lg:block relative">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent" />
        </div>

        {/* Content - 3 Column Layout */}
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-8">
          <div className="flex gap-6">
            {/* Left: Poster + Trailer */}
            <div className="flex-shrink-0 w-48">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
                {movie.poster_url ? (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title_en}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                    <Film className="w-12 h-12 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>

              {movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-3 px-3 py-2 bg-red-600 text-[var(--text-primary)] rounded-lg text-sm font-medium hover:bg-red-500 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Trailer
                </a>
              )}
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0">
              {/* Title Row with Rating */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-4xl font-bold text-[var(--text-primary)]">
                    {movie.title_en}
                  </h1>
                  {movie.title_te && (
                    <p className="text-xl text-yellow-500 mt-1">
                      {movie.title_te}
                    </p>
                  )}
                </div>
                {displayRating > 0 && !editorialReview && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-yellow-500 rounded-lg">
                    <Star className="w-4 h-4 text-black fill-black" />
                    <span className="text-lg font-bold text-black">
                      {displayRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {movie.release_year && (
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    {movie.release_year}
                  </span>
                )}
                {movie.runtime_minutes && (
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(movie.runtime_minutes / 60)}h{" "}
                    {movie.runtime_minutes % 60}m
                  </span>
                )}
                {movie.certification && (
                  <span className="px-2 py-0.5 border border-[var(--border-secondary)]/50 rounded text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50">
                    {movie.certification}
                  </span>
                )}
              </div>

              {/* Coming Soon Banner - Desktop */}
              {isUpcoming && (
                <div className="mb-4 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-purple-500/20 border border-orange-500/40 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/40 to-red-500/40 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <span className="text-orange-300 font-bold text-lg block">
                          COMING SOON
                        </span>
                        <span className="text-orange-200/80 text-sm">
                          {upcomingLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-3 py-1.5 bg-orange-500/30 rounded-lg text-xs font-bold text-orange-200 uppercase tracking-wider">
                        Upcoming Release
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        Ratings will be available after release
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!hideRating && (
                <div className="mb-4">
                  <MovieBadges
                    isBlockbuster={movie.is_blockbuster}
                    isUnderrated={movie.is_underrated}
                    isClassic={movie.is_classic}
                    isHit={displayRating >= 7 && !movie.is_blockbuster}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {movie.genres.slice(0, 5).map((genre: string) => (
                  <Link
                    key={genre}
                    href={`/reviews?genre=${genre}`}
                    className="px-2 py-0.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] text-xs transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>

              <div className="mb-4">
                <CompactCast
                  cast={[
                    {
                      role: "Director",
                      name: movie.director || "",
                      icon: "director",
                    },
                    { role: "Hero", name: movie.hero || "", icon: "actor" },
                    {
                      role: "Heroine",
                      name: movie.heroine || "",
                      icon: "actress",
                    },
                    {
                      role: "Music",
                      name: movie.music_director || "",
                      icon: "music",
                    },
                    {
                      role: "Producer",
                      name: movie.producer || "",
                      icon: "producer",
                    },
                    ...(movie.supporting_cast || [])
                      .slice(0, 5)
                      .map((actor: { name: string; role?: string }) => ({
                        role: actor.role || "Supporting",
                        name: actor.name,
                        icon: "actor" as const,
                      })),
                  ]}
                  performances={editorialReview?.performances}
                  crew={movie.crew}
                />
              </div>

              {(editorialReview?.synopsis?.en || movie.synopsis) && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                    Synopsis
                  </h3>
                  <CompactSynopsis
                    text={editorialReview?.synopsis?.en || movie.synopsis || ""}
                    teluguText={editorialReview?.synopsis?.te}
                    maxLines={3}
                  />
                </div>
              )}

              {editorialReview && !hideRating && (
                <CompactRatings
                  ratings={[
                    {
                      label: "Story",
                      score: editorialReview.story_screenplay?.story_score || 0,
                      icon: "story",
                    },
                    {
                      label: "Direction",
                      score:
                        editorialReview.direction_technicals?.direction_score ||
                        0,
                      icon: "direction",
                    },
                    {
                      label: "Music",
                      score:
                        editorialReview.direction_technicals?.music_score || 0,
                      icon: "music",
                    },
                    {
                      label: "Cinematography",
                      score:
                        editorialReview.direction_technicals
                          ?.cinematography_score || 0,
                      icon: "camera",
                    },
                    {
                      label: "Pacing",
                      score:
                        editorialReview.story_screenplay?.pacing_score || 0,
                      icon: "pacing",
                    },
                    {
                      label: "Emotion",
                      score:
                        editorialReview.story_screenplay?.emotional_score || 0,
                      icon: "emotion",
                    },
                    {
                      label: "Originality",
                      score:
                        editorialReview.story_screenplay?.originality_score ||
                        0,
                      icon: "original",
                    },
                    {
                      label: "Editing",
                      score:
                        editorialReview.direction_technicals?.editing_score ||
                        0,
                      icon: "editing",
                    },
                  ]}
                />
              )}
            </div>

            {/* Right: Quick Verdict Card */}
            {!hideRating && (
              <div className="w-80 flex-shrink-0">
                <div className="sticky top-4 space-y-4">
                  <QuickVerdictCard
                    whyWatch={editorialReview?.why_watch}
                    whySkip={editorialReview?.why_skip}
                    verdict={editorialReview?.verdict}
                    qualityScore={editorialReview?._quality_score}
                    awards={editorialReview?.awards}
                    culturalHighlights={
                      editorialReview?.cultural_impact
                        ? {
                            legacy_status:
                              editorialReview.cultural_impact.legacy_status,
                            cult_status:
                              editorialReview.cultural_impact.cult_status,
                            memorable_elements:
                              editorialReview.cultural_impact.memorable_elements ||
                              editorialReview.cultural_impact.iconic_elements,
                          }
                        : undefined
                    }
                    isClassic={movie.is_classic}
                    // Consolidated metadata inside the card
                    ageRating={movie.age_rating}
                    audienceFit={movie.audience_fit}
                    watchRecommendation={movie.watch_recommendation}
                    trustScore={movie.data_confidence}
                    trustBreakdown={movie.confidence_breakdown}
                    boxOfficeCategory={movie.box_office_category}
                  />

                  {/* Content Warnings - only if present */}
                  {movie.trigger_warnings && movie.trigger_warnings.length > 0 && (
                    <ContentWarnings 
                      warnings={movie.trigger_warnings} 
                      compact 
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Editorial Review - Accordion Style (hide for upcoming/incomplete movies) */}
      {!hideRating &&
        editorialReview &&
        (editorialReview.performances ||
          editorialReview.story_screenplay ||
          editorialReview.direction_technicals ||
          editorialReview.cultural_impact) && (
          <section className="max-w-7xl mx-auto px-4 py-6 border-t border-[var(--border-primary)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Deep Dive
            </h2>

            <ReviewAccordion
              defaultOpen="performances"
              sections={[
                ...(editorialReview.performances?.lead_actors?.length > 0
                  ? [
                      {
                        id: "performances",
                        title: "Performances",
                        icon: "performances" as const,
                        content: (
                          <PerformanceContent
                            performances={editorialReview.performances}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(editorialReview.story_screenplay
                  ? [
                      {
                        id: "story",
                        title: "Story & Screenplay",
                        icon: "story" as const,
                        content: (
                          <StoryContent
                            story={editorialReview.story_screenplay}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(editorialReview.direction_technicals
                  ? [
                      {
                        id: "direction",
                        title: "Direction & Technicals",
                        icon: "direction" as const,
                        content: (
                          <DirectionContent
                            direction={editorialReview.direction_technicals}
                          />
                        ),
                      },
                    ]
                  : []),
                ...(editorialReview.cultural_impact
                  ? [
                      {
                        id: "cultural",
                        title: "Cultural Impact",
                        icon: "cultural" as const,
                        content: (
                          <CulturalContent
                            cultural={editorialReview.cultural_impact}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        )}

      {/* Featured Review (hide for upcoming/incomplete movies) */}
      {!hideRating && featuredReview && !editorialReview && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-[var(--border-primary)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Featured Review
          </h2>
          <DetailedReviewCard review={featuredReview} />
        </section>
      )}

      {/* Rating Breakdown - Only for non-editorial reviews (hide for upcoming/incomplete movies) */}
      {!hideRating &&
        !editorialReview &&
        (featuredReview?.dimensions || featuredReview?.direction_rating) && (
          <section className="max-w-7xl mx-auto px-4 py-6 border-t border-[var(--border-primary)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Rating Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featuredReview?.dimensions ? (
                Object.entries(featuredReview.dimensions)
                  .slice(0, 8)
                  .map(([key, dim]: [string, any]) => (
                    <RatingBar
                      key={key}
                      label={dim.name_te || dim.name}
                      rating={dim.score}
                      icon={
                        key.includes("music") ? (
                          <Music />
                        ) : key.includes("direct") ? (
                          <Clapperboard />
                        ) : (
                          <Film />
                        )
                      }
                    />
                  ))
              ) : (
                <>
                  <RatingBar
                    label="Direction"
                    rating={featuredReview?.direction_rating}
                    icon={<Clapperboard />}
                  />
                  <RatingBar
                    label="Screenplay"
                    rating={featuredReview?.screenplay_rating}
                    icon={<Film />}
                  />
                  <RatingBar
                    label="Acting"
                    rating={featuredReview?.acting_rating}
                    icon={<User />}
                  />
                  <RatingBar
                    label="Music"
                    rating={featuredReview.music_rating}
                    icon={<Music />}
                  />
                </>
              )}
            </div>
          </section>
        )}

      {/* Director's Vision - Only for non-editorial reviews (hide for upcoming/incomplete movies) */}
      {!hideRating && !editorialReview && featuredReview?.directors_vision && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-[var(--border-primary)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-500" />
            Director's Vision
          </h2>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-[var(--text-secondary)] leading-relaxed italic text-sm">
              "{featuredReview.directors_vision}"
            </p>
          </div>
        </section>
      )}

      {/* Strengths & Weaknesses - Only for non-editorial reviews (hide for upcoming/incomplete movies) */}
      {!hideRating &&
        !editorialReview &&
        featuredReview &&
        (featuredReview.strengths?.length > 0 ||
          featuredReview.weaknesses?.length > 0) && (
          <section className="max-w-7xl mx-auto px-4 py-6 border-t border-[var(--border-primary)]">
            <div className="grid md:grid-cols-2 gap-4">
              {featuredReview.strengths?.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {featuredReview.strengths
                      .slice(0, 4)
                      .map((strength: string, i: number) => (
                        <li
                          key={i}
                          className="text-[var(--text-secondary)] flex items-start gap-2"
                        >
                          <span className="text-green-500">✓</span>
                          {strength}
                        </li>
                      ))}
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
                    {featuredReview.weaknesses
                      .slice(0, 4)
                      .map((weakness: string, i: number) => (
                        <li
                          key={i}
                          className="text-[var(--text-secondary)] flex items-start gap-2"
                        >
                          <span className="text-red-500">✗</span>
                          {weakness}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

      {/* Enhanced Review Insights - Collapsed by default (hide for upcoming/incomplete movies) */}
      {!hideRating && insights && !editorialReview && (
        <section className="max-w-7xl mx-auto px-4 py-6 border-t border-[var(--border-primary)]">
          <ReviewInsightsPanel insights={insights} defaultExpanded={false} />
        </section>
      )}

      {/* Similar Movies - Smart Multi-Row Carousel */}
      {similarSections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-[var(--border-primary)]/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Discover More
            </h2>
            <RecommendMeButton
              prefillLanguage={movie.language || "Telugu"}
              prefillGenres={movie.genres?.slice(0, 2)}
              prefillEra={
                movie.release_year && movie.release_year >= 2020
                  ? "recent"
                  : movie.release_year && movie.release_year >= 2010
                  ? "2010s"
                  : movie.release_year && movie.release_year >= 2000
                  ? "2000s"
                  : movie.release_year && movie.release_year >= 1990
                  ? "90s"
                  : "classics"
              }
              variant="secondary"
            />
          </div>
          <SimilarMoviesCarousel sections={similarSections} />
        </section>
      )}
    </main>
  );
}

function CrewCard({
  icon,
  role,
  name,
}: {
  icon: React.ReactNode;
  role: string;
  name: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[var(--bg-primary)] rounded-xl">
      <div className="p-2 bg-[var(--bg-secondary)] rounded-lg text-yellow-500">
        {icon}
      </div>
      <div>
        <p className="text-[var(--text-tertiary)] text-sm">{role}</p>
        <p className="text-[var(--text-primary)] font-medium">{name}</p>
      </div>
    </div>
  );
}

function RatingBar({
  label,
  rating,
  icon,
}: {
  label: string;
  rating?: number;
  icon: React.ReactNode;
}) {
  if (!rating) return null;
  const percentage = (rating / 10) * 100;

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-yellow-500 font-bold">{rating.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
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
    <div className="bg-[var(--bg-primary)] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
            {(review.reviewer_name || review.author_name || 'R').charAt(0)}
          </div>
          <div>
            <p className="text-[var(--text-primary)] font-medium">
              {review.reviewer_name || review.author_name || 'Reviewer'}
            </p>
            <p className="text-[var(--text-tertiary)] text-sm capitalize">
              {review.reviewer_type} Review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 rounded-full">
          <Star className="w-4 h-4 text-black fill-black" />
          <span className="text-black font-bold">
            {(review.overall_rating ?? review.rating ?? 0).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
          {review.title}
        </h3>
      )}

      {/* Summary */}
      {(review.summary || review.summary_te) && (
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          {review.summary_te || review.summary}
        </p>
      )}

      {/* Detailed Sections */}
      <div className="space-y-4">
        {review.direction_review && (
          <ReviewSection title="Direction" content={review.direction_review} />
        )}
        {review.screenplay_review && (
          <ReviewSection
            title="Screenplay"
            content={review.screenplay_review}
          />
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
        <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
          <h4 className="text-lg font-bold text-yellow-500 mb-2">
            Final Verdict
          </h4>
          <p className="text-[var(--text-secondary)] text-xl">
            {review.verdict_te || review.verdict}
          </p>
          {review.verdict_te &&
            review.verdict &&
            review.verdict_te !== review.verdict && (
              <p className="text-[var(--text-tertiary)] mt-1">
                {review.verdict}
              </p>
            )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 mt-6 pt-6 border-t border-[var(--border-primary)] text-[var(--text-tertiary)] text-sm">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {(review.views ?? 0).toLocaleString()} views
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-4 h-4" />
          {review.helpful_votes ?? 0} found helpful
        </span>
      </div>
    </div>
  );
}

function ReviewSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-yellow-500 mb-1">{title}</h4>
      <p className="text-[var(--text-secondary)] text-sm">{content}</p>
    </div>
  );
}
