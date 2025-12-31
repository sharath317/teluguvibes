/**
 * WHY THIS MOVIE WORKED / FAILED
 *
 * One-time post-release analysis (7 days after release).
 * Generated once, stored forever, never updated.
 *
 * WHY THIS APPROACH:
 * - Run once at 7 days post-release (enough data collected)
 * - Permanent storage (evergreen content)
 * - Structured factors for SEO
 * - Comparable movies for internal linking
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface MovieData {
  id: string;
  title_en: string;
  title_te?: string;
  release_date: string;
  genre?: string;
  runtime?: number;
  cast?: string[];
  director?: string;
}

interface MovieAnalysisResult {
  movie_id: string;
  verdict: 'hit' | 'superhit' | 'blockbuster' | 'average' | 'flop' | 'disaster';
  what_worked_te: string;
  what_failed_te: string;
  audience_mismatch_te: string;
  comparable_movies_te: string;
  one_line_verdict_te: string;
  success_factors: string[];
  failure_factors: string[];
}

/**
 * Check if movie already has analysis
 */
export async function hasMovieAnalysis(movieId: string): Promise<boolean> {
  const { data } = await supabase
    .from('movie_analysis')
    .select('id')
    .eq('movie_id', movieId)
    .single();

  return !!data;
}

/**
 * Get movies that need analysis (7+ days since release, no analysis yet)
 */
export async function getMoviesNeedingAnalysis(limit: number = 10) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, release_date, genre')
    .lte('release_date', sevenDaysAgo.toISOString().split('T')[0])
    .gte('release_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
    .limit(limit * 2); // Fetch more to filter

  if (!movies) return [];

  // Filter out movies that already have analysis
  const movieIds = movies.map(m => m.id);
  const { data: existingAnalyses } = await supabase
    .from('movie_analysis')
    .select('movie_id')
    .in('movie_id', movieIds);

  const analyzedIds = new Set((existingAnalyses || []).map(a => a.movie_id));

  return movies.filter(m => !analyzedIds.has(m.id)).slice(0, limit);
}

/**
 * Determine verdict based on box office data
 */
function determineVerdict(budget: number, boxOffice: number): {
  verdict: string;
  recovery: number;
} {
  const recovery = budget > 0 ? (boxOffice / budget) * 100 : 0;

  let verdict: string;
  if (recovery >= 300) verdict = 'blockbuster';
  else if (recovery >= 200) verdict = 'superhit';
  else if (recovery >= 100) verdict = 'hit';
  else if (recovery >= 75) verdict = 'average';
  else if (recovery >= 50) verdict = 'flop';
  else verdict = 'disaster';

  return { verdict, recovery };
}

/**
 * Generate movie analysis using AI
 */
export async function generateMovieAnalysis(movie: MovieData): Promise<MovieAnalysisResult | null> {
  console.log(`📊 Generating analysis for: ${movie.title_en}`);

  // Check if already analyzed
  const alreadyAnalyzed = await hasMovieAnalysis(movie.id);
  if (alreadyAnalyzed) {
    console.log(`⏭️ Already analyzed: ${movie.title_en}`);
    return null;
  }

  // Fetch additional data
  const { data: boxOfficeData } = await supabase
    .from('movie_box_office')
    .select('*')
    .eq('movie_id', movie.id)
    .single();

  const budget = boxOfficeData?.budget || 0;
  const boxOffice = boxOfficeData?.worldwide_gross || boxOfficeData?.domestic_gross || 0;
  const { verdict, recovery } = determineVerdict(budget, boxOffice);

  // Find comparable movies (same genre, similar time period)
  const { data: comparableMovies } = await supabase
    .from('movies')
    .select('id, title_en, title_te')
    .eq('genre', movie.genre)
    .neq('id', movie.id)
    .limit(5);

  const prompt = `You are a Telugu film critic. Analyze why this movie succeeded or failed.

MOVIE: ${movie.title_te || movie.title_en}
GENRE: ${movie.genre || 'Unknown'}
RELEASE: ${movie.release_date}
BUDGET: ₹${budget.toLocaleString()} Cr (estimated)
BOX OFFICE: ₹${boxOffice.toLocaleString()} Cr
RECOVERY: ${recovery.toFixed(0)}%
VERDICT: ${verdict.toUpperCase()}

CAST: ${movie.cast?.join(', ') || 'Unknown'}
DIRECTOR: ${movie.director || 'Unknown'}

COMPARABLE MOVIES: ${(comparableMovies || []).map(m => m.title_en).join(', ')}

Generate a structured Telugu analysis:

1. what_worked_te: What aspects of the movie worked well? (2-3 sentences in Telugu)
2. what_failed_te: What didn't work? (2-3 sentences in Telugu)
3. audience_mismatch_te: Was there a mismatch between target audience and actual audience? (1-2 sentences)
4. comparable_movies_te: How does it compare to similar movies? (1-2 sentences)
5. one_line_verdict_te: One-line summary (catchy, quotable)
6. success_factors: Array of factors that helped ["story", "music", "star_power", "timing", etc.]
7. failure_factors: Array of factors that hurt ["weak_script", "poor_marketing", "competition", etc.]

Return as JSON only. No markdown.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    // Parse JSON
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '');
    }

    const analysis = JSON.parse(cleanJson);

    // Store analysis (permanent, never updated)
    const { error } = await supabase.from('movie_analysis').insert({
      movie_id: movie.id,
      movie_title: movie.title_en,
      release_date: movie.release_date,
      budget_estimate: budget,
      box_office_estimate: boxOffice,
      verdict,
      recovery_percentage: recovery,
      what_worked_te: analysis.what_worked_te || '',
      what_failed_te: analysis.what_failed_te || '',
      audience_mismatch_te: analysis.audience_mismatch_te || '',
      comparable_movies_te: analysis.comparable_movies_te || '',
      one_line_verdict_te: analysis.one_line_verdict_te || '',
      success_factors: analysis.success_factors || [],
      failure_factors: analysis.failure_factors || [],
      comparable_movies: (comparableMovies || []).map(m => ({
        id: m.id,
        title: m.title_en,
      })),
      is_final: true,
    });

    if (error) {
      console.error('Failed to store analysis:', error);
      return null;
    }

    console.log(`✅ Analysis generated for: ${movie.title_en} (${verdict})`);

    return {
      movie_id: movie.id,
      verdict: verdict as any,
      what_worked_te: analysis.what_worked_te,
      what_failed_te: analysis.what_failed_te,
      audience_mismatch_te: analysis.audience_mismatch_te,
      comparable_movies_te: analysis.comparable_movies_te,
      one_line_verdict_te: analysis.one_line_verdict_te,
      success_factors: analysis.success_factors,
      failure_factors: analysis.failure_factors,
    };
  } catch (error) {
    console.error('Analysis generation failed:', error);
    return null;
  }
}

/**
 * Process all movies needing analysis (cron job)
 */
export async function processMoviesForAnalysis(): Promise<{ processed: number; errors: number }> {
  console.log('📊 Processing movies for analysis...');

  const movies = await getMoviesNeedingAnalysis(5); // Process 5 at a time
  let processed = 0;
  let errors = 0;

  for (const movie of movies) {
    const result = await generateMovieAnalysis(movie);
    if (result) {
      processed++;
    } else {
      errors++;
    }
    // Delay between API calls
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`✅ Analysis complete: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

/**
 * Get movie analysis by ID
 */
export async function getMovieAnalysis(movieId: string) {
  const { data } = await supabase
    .from('movie_analysis')
    .select('*')
    .eq('movie_id', movieId)
    .single();

  return data;
}

/**
 * Get all analyses by verdict type
 */
export async function getAnalysesByVerdict(verdict: string, limit: number = 10) {
  const { data } = await supabase
    .from('movie_analysis')
    .select('*')
    .eq('verdict', verdict)
    .order('release_date', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get recent movie analyses
 */
export async function getRecentAnalyses(limit: number = 10) {
  const { data } = await supabase
    .from('movie_analysis')
    .select(`
      *,
      movies (poster_url, genre)
    `)
    .order('generated_at', { ascending: false })
    .limit(limit);

  return data || [];
}
