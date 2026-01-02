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

  const { data: similar } = await supabase
    .from("movies")
    .select("id, title_en, slug, poster_url, avg_rating, release_year")
    .eq("is_published", true)
    .neq("id", movie.id)
    .overlaps("genres", movie.genres)
    .order("avg_rating", { ascending: false })
    .limit(6);

  // Fetch review insights if available (from featured review or movie)
  let insights: ReviewInsights | null = null;
  const featuredReview = reviews?.find((r) => r.is_featured) || reviews?.[0];
  if (featuredReview?.insights) {
    insights = featuredReview.insights as ReviewInsights;
  }

  return { movie, reviews: reviews || [], similar: similar || [], insights };
}

export default async function MovieReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getMovieData(slug);

  if (!data) notFound();

  const { movie, reviews, similar, insights } = data;
  const featuredReview = reviews.find(r => r.is_featured) || reviews[0];
  
  // Use review's overall_rating if movie has no avg_rating
  const displayRating = movie.avg_rating || movie.our_rating || featuredReview?.overall_rating || 0;

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

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-12">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl mx-auto md:mx-0">
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
                    <Film className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Trailer Button */}
              {movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-64 mt-4 mx-auto md:mx-0 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500 transition-colors"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Trailer
                </a>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {movie.title_en}
              </h1>
              {movie.title_te && (
                <p className="text-2xl text-yellow-500 mb-4">
                  {movie.title_te}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.is_blockbuster && (
                  <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                    🎬 Blockbuster
                  </span>
                )}
                {movie.is_underrated && (
                  <span className="px-3 py-1 bg-purple-500 text-white text-sm font-bold rounded-full">
                    💎 Underrated Gem
                  </span>
                )}
                {movie.is_classic && (
                  <span className="px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full">
                    ⭐ Classic
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-gray-400 mb-6">
                {movie.release_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {movie.release_year}
                  </span>
                )}
                {movie.runtime_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.floor(movie.runtime_minutes / 60)}h{" "}
                    {movie.runtime_minutes % 60}m
                  </span>
                )}
                {movie.certification && (
                  <span className="px-2 py-0.5 border border-gray-600 rounded text-sm">
                    {movie.certification}
                  </span>
                )}
              </div>

              {/* Rating */}
              {displayRating > 0 && (
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center">
                      <span className="text-2xl font-bold text-black">
                        {displayRating.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= displayRating / 2
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {reviews.length > 0
                          ? `${reviews.length} review${
                              reviews.length > 1 ? "s" : ""
                            }`
                          : "No reviews yet"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres.map((genre: string) => (
                  <Link
                    key={genre}
                    href={`/reviews?genre=${genre}`}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 text-sm transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>

              {/* Synopsis */}
              {movie.synopsis && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Synopsis
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {movie.synopsis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cast & Crew */}
      <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Cast & Crew</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {movie.director && (
            <CrewCard
              icon={<Clapperboard />}
              role="Director"
              name={movie.director}
            />
          )}
          {movie.hero && (
            <CrewCard icon={<User />} role="Lead Actor" name={movie.hero} />
          )}
          {movie.heroine && (
            <CrewCard
              icon={<User />}
              role="Lead Actress"
              name={movie.heroine}
            />
          )}
          {movie.music_director && (
            <CrewCard
              icon={<Music />}
              role="Music"
              name={movie.music_director}
            />
          )}
          {movie.cinematographer && (
            <CrewCard
              icon={<Camera />}
              role="Cinematography"
              name={movie.cinematographer}
            />
          )}
          {movie.writer && (
            <CrewCard icon={<Film />} role="Writer" name={movie.writer} />
          )}
        </div>
      </section>

      {/* Featured Review */}
      {featuredReview && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Featured Review
          </h2>
          <DetailedReviewCard review={featuredReview} />
        </section>
      )}

      {/* Rating Breakdown */}
      {featuredReview &&
        (featuredReview.dimensions || featuredReview.direction_rating) && (
          <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-6">
              Rating Breakdown
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredReview.dimensions ? (
                // Use dimensions from template reviews
                <>
                  {Object.entries(featuredReview.dimensions).map(
                    ([key, dim]: [string, any]) => (
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
                    )
                  )}
                </>
              ) : (
                // Use direct rating fields
                <>
                  <RatingBar
                    label="Direction"
                    rating={featuredReview.direction_rating}
                    icon={<Clapperboard />}
                  />
                  <RatingBar
                    label="Screenplay"
                    rating={featuredReview.screenplay_rating}
                    icon={<Film />}
                  />
                  <RatingBar
                    label="Acting"
                    rating={featuredReview.acting_rating}
                    icon={<User />}
                  />
                  <RatingBar
                    label="Music"
                    rating={featuredReview.music_rating}
                    icon={<Music />}
                  />
                  <RatingBar
                    label="Cinematography"
                    rating={featuredReview.cinematography_rating}
                    icon={<Camera />}
                  />
                  <RatingBar
                    label="Production"
                    rating={featuredReview.production_rating}
                    icon={<Award />}
                  />
                  <RatingBar
                    label="Entertainment"
                    rating={featuredReview.entertainment_rating}
                    icon={<Heart />}
                  />
                </>
              )}
            </div>
          </section>
        )}

      {/* Director's Vision */}
      {featuredReview?.directors_vision && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Eye className="w-6 h-6 text-yellow-500" />
            Director's Vision
          </h2>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
            <p className="text-gray-300 leading-relaxed italic">
              "{featuredReview.directors_vision}"
            </p>
          </div>
        </section>
      )}

      {/* Strengths & Weaknesses */}
      {featuredReview &&
        (featuredReview.strengths?.length > 0 ||
          featuredReview.weaknesses?.length > 0) && (
          <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
            <div className="grid md:grid-cols-2 gap-6">
              {featuredReview.strengths?.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {featuredReview.strengths.map(
                      (strength: string, i: number) => (
                        <li
                          key={i}
                          className="text-gray-300 flex items-start gap-2"
                        >
                          <span className="text-green-500">✓</span>
                          {strength}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {featuredReview.weaknesses?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5" />
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {featuredReview.weaknesses.map(
                      (weakness: string, i: number) => (
                        <li
                          key={i}
                          className="text-gray-300 flex items-start gap-2"
                        >
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

      {/* Enhanced Review Insights */}
      {insights && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
          <ReviewInsightsPanel insights={insights} defaultExpanded={true} />
        </section>
      )}

      {/* Similar Movies */}
      {similar.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Similar Movies</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {similar.map((m: any) => (
              <Link key={m.id} href={`/reviews/${m.slug}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                  {m.poster_url ? (
                    <Image
                      src={m.poster_url}
                      alt={m.title_en}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold">
                      {(m.avg_rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2 truncate group-hover:text-white transition-colors">
                  {m.title_en}
                </p>
              </Link>
            ))}
          </div>
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
