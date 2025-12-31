/**
 * TeluguVibes Automated Review Pipeline
 * Self-learning movie review system
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

interface MovieContext {
  movie: any;
  tmdbData?: any;
  youtubeData?: any;
  socialData?: any;
  learnings?: ReviewLearning;
}

interface ReviewLearning {
  optimalLength: number;
  bestOpeningStyle: string;
  mostReadSections: string[];
  skippedSections: string[];
  emphasisWeights: Record<string, number>;
}

interface GeneratedReview {
  title: string;
  title_te: string;
  summary: string;
  summary_te: string;
  overall_rating: number;
  direction_rating: number;
  screenplay_rating: number;
  acting_rating: number;
  music_rating: number;
  direction_review: string;
  screenplay_review: string;
  acting_review: string;
  music_review: string;
  directors_vision: string;
  strengths: string[];
  weaknesses: string[];
  verdict: string;
  verdict_te: string;
  worth_watching: boolean;
  recommended_for: string[];
}

// ===== TMDB MOVIE DETECTION =====

export async function detectNewTeluguMovies(): Promise<any[]> {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return [];

  const movies: any[] = [];

  try {
    // Get recently released Telugu movies
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&with_original_language=te&primary_release_date.gte=${thirtyDaysAgo.toISOString().split('T')[0]}&sort_by=popularity.desc`
    );
    const data = await res.json();

    for (const movie of (data.results || []).slice(0, 10)) {
      // Check if we already have this movie
      const { data: existing } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', movie.id)
        .single();

      if (!existing) {
        // Get full details
        const detailRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbKey}&append_to_response=credits,videos`
        );
        const details = await detailRes.json();

        movies.push({
          ...movie,
          ...details,
        });
      }
    }
  } catch (error) {
    console.error('TMDB detection error:', error);
  }

  return movies;
}

// ===== YOUTUBE TRAILER ANALYSIS =====

async function getTrailerEngagement(movieTitle: string): Promise<any> {
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) return null;

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(movieTitle + ' Telugu movie trailer official')}&maxResults=3&order=viewCount&key=${ytKey}`
    );
    const searchData = await searchRes.json();

    if (searchData.items?.length > 0) {
      const videoId = searchData.items[0].id.videoId;

      // Get video stats
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${ytKey}`
      );
      const statsData = await statsRes.json();

      if (statsData.items?.length > 0) {
        const stats = statsData.items[0].statistics;
        return {
          videoId,
          viewCount: parseInt(stats.viewCount || '0'),
          likeCount: parseInt(stats.likeCount || '0'),
          commentCount: parseInt(stats.commentCount || '0'),
          engagementRate: stats.viewCount > 0
            ? ((parseInt(stats.likeCount || '0') + parseInt(stats.commentCount || '0')) / parseInt(stats.viewCount)) * 100
            : 0,
        };
      }
    }
  } catch (error) {
    console.error('YouTube analysis error:', error);
  }

  return null;
}

// ===== GET REVIEW LEARNINGS =====

async function getReviewLearnings(genre: string, starPower: string): Promise<ReviewLearning | null> {
  const { data } = await supabase
    .from('review_learnings')
    .select('*')
    .eq('movie_genre', genre)
    .eq('star_power', starPower)
    .order('sample_size', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return {
      optimalLength: data.optimal_length,
      bestOpeningStyle: data.best_opening_style,
      mostReadSections: data.most_read_sections || [],
      skippedSections: data.skipped_sections || [],
      emphasisWeights: data.emphasis_weights || {},
    };
  }

  // Return defaults
  return {
    optimalLength: 800,
    bestOpeningStyle: 'hook_question',
    mostReadSections: ['verdict', 'acting_review', 'summary'],
    skippedSections: ['cinematography_review'],
    emphasisWeights: {
      acting: 1.2,
      story: 1.0,
      direction: 0.9,
      music: 0.8,
    },
  };
}

// ===== GENERATE REVIEW WITH AI =====

async function generateReviewWithAI(context: MovieContext): Promise<GeneratedReview | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const { movie, tmdbData, youtubeData, learnings } = context;

  // Build adaptive prompt based on learnings
  let sectionOrder = ['summary', 'direction', 'acting', 'music', 'verdict'];
  if (learnings?.mostReadSections) {
    sectionOrder = learnings.mostReadSections;
  }

  const emphasis = learnings?.emphasisWeights || {};
  const wordCount = learnings?.optimalLength || 800;

  const prompt = `You are a Telugu movie critic writing for TeluguVibes.
Generate a comprehensive movie review in Telugu (English names allowed).

MOVIE DETAILS:
- Title: ${movie.title}
- Release Date: ${movie.release_date}
- Genres: ${movie.genres?.map((g: any) => g.name).join(', ')}
- Director: ${tmdbData?.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown'}
- Cast: ${tmdbData?.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ')}
- Synopsis: ${movie.overview || 'Not available'}

TRAILER ENGAGEMENT:
- Views: ${youtubeData?.viewCount || 'Unknown'}
- Engagement Rate: ${youtubeData?.engagementRate?.toFixed(2) || 'Unknown'}%

LEARNING-BASED INSTRUCTIONS:
- Target word count: ${wordCount} words
- Prioritize sections: ${sectionOrder.join(', ')}
- Emphasis weights: ${JSON.stringify(emphasis)}
- Opening style: ${learnings?.bestOpeningStyle || 'engaging_hook'}

GENERATE A JSON OBJECT WITH:
{
  "title": "Review title in Telugu",
  "title_te": "Same as title",
  "summary": "50-word summary",
  "summary_te": "Telugu summary",
  "overall_rating": 7.5, // 0-10
  "direction_rating": 7.0,
  "screenplay_rating": 7.0,
  "acting_rating": 8.0,
  "music_rating": 7.5,
  "direction_review": "Director's approach review in Telugu (100+ words)",
  "screenplay_review": "Story and screenplay review in Telugu (100+ words)",
  "acting_review": "Acting performances review in Telugu (100+ words)",
  "music_review": "Music and BGM review in Telugu (50+ words)",
  "directors_vision": "What director was trying to convey",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1"],
  "verdict": "Final verdict in Telugu",
  "verdict_te": "Same as verdict",
  "worth_watching": true,
  "recommended_for": ["Family", "Action fans"]
}

Be fair, balanced, and insightful. Focus on Telugu cinema context.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Review generation error:', error);
  }

  return null;
}

// ===== MAIN PIPELINE =====

export async function runReviewPipeline(): Promise<{
  newMovies: number;
  reviewsGenerated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let reviewsGenerated = 0;

  // 1. Detect new Telugu movies
  const newMovies = await detectNewTeluguMovies();
  console.log(`Found ${newMovies.length} new Telugu movies`);

  for (const movie of newMovies) {
    try {
      // 2. Insert movie into database (only use columns that exist)
      const { data: insertedMovie, error: movieError } = await supabase
        .from('movies')
        .insert({
          title_en: movie.title,
          title_te: movie.original_title !== movie.title ? movie.original_title : null,
          slug: generateSlug(movie.title),
          tmdb_id: movie.id,
          release_date: movie.release_date,
          release_year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
          genres: movie.genres?.map((g: any) => g.name) || [],
          poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          synopsis: movie.overview,
          director: movie.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
          cast_members: movie.credits?.cast?.slice(0, 10).map((c: any) => ({
            name: c.name,
            character: c.character,
          })),
          our_rating: movie.vote_average,
        })
        .select()
        .single();

      if (movieError) {
        errors.push(`Movie insert error for ${movie.title}: ${movieError.message}`);
        continue;
      }

      // 3. Get additional context
      const youtubeData = await getTrailerEngagement(movie.title);
      const primaryGenre = movie.genres?.[0]?.name || 'Drama';
      const starPower = determineStarPower(movie.credits?.cast || []);
      const learnings = await getReviewLearnings(primaryGenre, starPower);

      // 4. Generate review
      const review = await generateReviewWithAI({
        movie,
        tmdbData: movie,
        youtubeData,
        learnings: learnings || undefined,
      });

      if (review && insertedMovie) {
        // 5. Store review as draft (only use columns that exist)
        const { error: reviewError } = await supabase
          .from('movie_reviews')
          .insert({
            movie_id: insertedMovie.id,
            reviewer_name: 'TeluguVibes AI',
            overall_rating: review.overall_rating || 7,
            direction_rating: review.direction_rating,
            acting_rating: review.acting_rating,
            music_rating: review.music_rating,
            summary: review.summary,
            verdict: review.verdict,
            status: 'draft',
          });

        if (reviewError) {
          errors.push(`Review insert error for ${movie.title}: ${reviewError.message}`);
        } else {
          reviewsGenerated++;
        }
      }
    } catch (error) {
      errors.push(`Pipeline error for ${movie.title}: ${error}`);
    }
  }

  return {
    newMovies: newMovies.length,
    reviewsGenerated,
    errors,
  };
}

// ===== LEARN FROM REVIEW PERFORMANCE =====

export async function learnFromReviewPerformance(): Promise<void> {
  console.log('Learning from review performance...');

  // Get reviews with performance data
  const { data: reviews } = await supabase
    .from('movie_reviews')
    .select(`
      id,
      movie_id,
      overall_rating,
      views,
      likes,
      movies!inner(genres)
    `)
    .eq('status', 'published')
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (!reviews || reviews.length < 5) {
    console.log('Not enough reviews for learning');
    return;
  }

  // Group by genre
  const genreStats = new Map<string, {
    highPerformers: any[];
    lowPerformers: any[];
  }>();

  for (const review of reviews) {
    const genres = (review as any).movies?.genres || [];
    const primaryGenre = genres[0] || 'Unknown';

    const stats = genreStats.get(primaryGenre) || { highPerformers: [], lowPerformers: [] };

    if ((review.views || 0) > 100) {
      stats.highPerformers.push(review);
    } else {
      stats.lowPerformers.push(review);
    }

    genreStats.set(primaryGenre, stats);
  }

  // Update learnings per genre
  for (const [genre, stats] of genreStats) {
    if (stats.highPerformers.length < 2) continue;

    // Calculate average ratings of high performers
    const avgRating = stats.highPerformers.reduce((sum, r) => sum + r.overall_rating, 0) / stats.highPerformers.length;

    await supabase
      .from('review_learnings')
      .upsert({
        movie_genre: genre,
        movie_scale: 'all',
        star_power: 'all',
        optimal_length: 800, // Would be calculated from actual content length
        best_opening_style: 'engaging_hook',
        sample_reviews: stats.highPerformers.slice(0, 5).map(r => r.id),
        sample_size: stats.highPerformers.length,
        confidence: Math.min(1, stats.highPerformers.length / 20),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'movie_genre,movie_scale,star_power',
      });
  }

  console.log('Review learnings updated');
}

// ===== HELPERS =====

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100) + '-' + Date.now().toString(36);
}

function determineStarPower(cast: any[]): string {
  // List of A-list Telugu actors
  const aListActors = [
    'Prabhas', 'Mahesh Babu', 'Allu Arjun', 'Jr NTR', 'Ram Charan',
    'Chiranjeevi', 'Vijay Deverakonda', 'Ravi Teja', 'Nani',
  ];

  for (const actor of cast.slice(0, 3)) {
    if (aListActors.some(a => actor.name?.includes(a))) {
      return 'A-list';
    }
  }

  return 'emerging';
}

// ===== OTT RELEASE TRACKING =====

export async function trackOTTReleases(): Promise<void> {
  // This would integrate with OTT platform APIs or scrape announcements
  // For now, we'll check TMDB for streaming availability

  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return;

  const { data: movies } = await supabase
    .from('movies')
    .select('id, tmdb_id, title_en')
    .is('ott_release_date', null)
    .not('tmdb_id', 'is', null);

  for (const movie of (movies || [])) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}/watch/providers?api_key=${tmdbKey}`
      );
      const data = await res.json();

      const inProviders = data.results?.IN;
      if (inProviders?.flatrate || inProviders?.rent) {
        const platforms = [
          ...(inProviders.flatrate || []),
          ...(inProviders.rent || []),
        ].map((p: any) => ({
          name: p.provider_name,
          logo: p.logo_path,
        }));

        await supabase
          .from('movies')
          .update({
            ott_platforms: platforms,
            ott_release_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', movie.id);

        // Create OTT release record
        for (const platform of platforms) {
          await supabase.from('ott_releases').insert({
            movie_id: movie.id,
            platform: platform.name,
            release_date: new Date().toISOString().split('T')[0],
            is_confirmed: true,
          });
        }
      }
    } catch (error) {
      console.error(`OTT check error for ${movie.title_en}:`, error);
    }
  }
}
