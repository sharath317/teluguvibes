/**
 * TEMPLATE-BASED MOVIE REVIEW GENERATOR
 * 
 * Generates fallback reviews using templates when AI reviews are unavailable.
 * NO AI TEXT GENERATION - pure template composition.
 * 
 * Priority order:
 * 1. Has TMDB + IMDb ratings → Calculate weighted dimension scores
 * 2. Has only TMDB rating → Estimate with genre baselines
 * 3. Has cast/crew data → Infer from comparable movies
 * 4. Minimal data → Generate minimal template review
 */

import { createClient } from '@supabase/supabase-js';
import { Movie, DIMENSION_DEFINITIONS } from './coverage-engine';

// ============================================================
// TYPES
// ============================================================

export interface TemplateDimension {
  name: string;
  name_te: string;
  score: number;
  analysis_te: string;
  confidence: number;
}

export interface TemplateReview {
  movie_id: string;
  movie_title: string;
  movie_title_te?: string;
  dimensions: Record<string, TemplateDimension>;
  overall_score: number;
  verdict: string;
  verdict_te: string;
  one_liner_te: string;
  one_liner_en: string;
  strengths: string[];
  weaknesses: string[];
  source: 'template_fallback';
  confidence: number;
  data_quality: 'high' | 'medium' | 'low' | 'minimal';
  generated_at: string;
  
  // Phase 5.1: Structured sections for enhanced reviews
  best_scenes?: string[];
  performance_highlights?: PerformanceHighlight[];
  watch_recommendation?: WatchRecommendation;
  
  // Entity links for knowledge graph
  linked_celebrities?: LinkedCelebrity[];
  linked_movies?: LinkedMovie[];  // Similar movies with confidence
}

// Phase 5.1: Performance highlight for individual actors
export interface PerformanceHighlight {
  actor: string;
  role: string;
  note_te: string;
  note_en: string;
}

// Phase 5.1: Watch recommendation with context
export interface WatchRecommendation {
  recommended: boolean;
  audience: 'family' | 'youth' | 'mass' | 'class' | 'all';
  best_for: string;
  skip_if: string | null;
}

// Phase 5.1: Linked celebrity reference
export interface LinkedCelebrity {
  name: string;
  role_in_movie: 'hero' | 'heroine' | 'villain' | 'director' | 'music' | 'support';
  tmdb_person_id?: number;
}

// Phase 5.1: Similar movie link with confidence
export interface LinkedMovie {
  movie_id: string;
  title: string;
  similarity_score: number;
  reason: string;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

// ============================================================
// TELUGU VERDICT TEMPLATES
// ============================================================

const VERDICT_TEMPLATES = {
  masterpiece: {
    verdict: 'masterpiece',
    verdict_te: 'అద్భుతం',
    one_liner_te: '{title_te} తెలుగు సినిమా చరిత్రలో ఒక మైలురాయి!',
    one_liner_en: '{title_en} is a landmark in Telugu cinema history!',
  },
  excellent: {
    verdict: 'excellent',
    verdict_te: 'అత్యుత్తమం',
    one_liner_te: '{title_te} ఖచ్చితంగా చూడాల్సిన సినిమా!',
    one_liner_en: '{title_en} is a must-watch!',
  },
  good: {
    verdict: 'good',
    verdict_te: 'బాగుంది',
    one_liner_te: '{title_te} వన్ టైమ్ వాచ్‌గా బాగుంది!',
    one_liner_en: '{title_en} is a good one-time watch!',
  },
  average: {
    verdict: 'average',
    verdict_te: 'సగటు',
    one_liner_te: '{title_te} సగటు సినిమా, ఎక్స్‌పెక్టేషన్స్ పెట్టుకోకుండా చూడండి.',
    one_liner_en: '{title_en} is an average film, watch without high expectations.',
  },
  below_average: {
    verdict: 'below_average',
    verdict_te: 'సగటు కంటే తక్కువ',
    one_liner_te: '{title_te} నిరాశ పరిచింది, మెరుగైన స్క్రిప్ట్ అవసరం.',
    one_liner_en: '{title_en} disappoints and needed a better script.',
  },
  poor: {
    verdict: 'poor',
    verdict_te: 'బలహీనం',
    one_liner_te: '{title_te} అభిమానులను నిరాశపరిచింది.',
    one_liner_en: '{title_en} fails to meet expectations.',
  },
};

// ============================================================
// GENRE-SPECIFIC TEMPLATES
// ============================================================

const GENRE_ANALYSIS_TEMPLATES: Record<string, Record<string, string[]>> = {
  Action: {
    story_screenplay: [
      'యాక్షన్ సీక్వెన్సులు బాగున్నాయి, కానీ కథలో కొత్తదనం లేదు.',
      'హై-ఆక్టేన్ యాక్షన్ తో పాటు ఆసక్తికరమైన స్క్రీన్‌ప్లే.',
      'యాక్షన్ బ్లాక్స్ హైలైట్, కథ సాధారణం.',
    ],
    direction: [
      'యాక్షన్ సీన్లలో దర్శకుడి పనితనం కనిపిస్తుంది.',
      'స్టైలిష్ మేకింగ్, విజువల్ ట్రీట్.',
      'పేసింగ్ బాగుంది, మసాలా ఎలిమెంట్స్ బాలెన్స్.',
    ],
    music_bgm: [
      'BGM మాస్ మూమెంట్స్‌ను ఎలివేట్ చేసింది.',
      'బ్యాక్‌గ్రౌండ్ స్కోర్ థ్రిల్లింగ్‌గా ఉంది.',
      'పాటలు సగటు, BGM హైలైట్.',
    ],
  },
  Romance: {
    story_screenplay: [
      'ప్రేమ కథ హృద్యంగా ఉంది, ఎమోషనల్ మూమెంట్స్ బాగున్నాయి.',
      'సింపుల్ లవ్ స్టోరీ, ఫీల్ గుడ్ వైబ్స్.',
      'ప్రేమికులకు నచ్చే కథ, కొత్తదనం లేదు.',
    ],
    direction: [
      'రొమాంటిక్ సీన్లు అందంగా తీశారు.',
      'ఎమోషన్స్ బాగా క్యాప్చర్ చేశారు.',
      'లొకేషన్స్ అందంగా ఉన్నాయి.',
    ],
    music_bgm: [
      'మెలోడియస్ సాంగ్స్ హైలైట్.',
      'పాటలు హిట్ అయ్యే ఛాన్స్ ఉంది.',
      'రొమాంటిక్ BGM బాగుంది.',
    ],
  },
  Drama: {
    story_screenplay: [
      'కథ గట్టిగా ఉంది, క్యారెక్టర్ డెవలప్‌మెంట్ బాగుంది.',
      'ఎమోషనల్ డ్రామా బాగా వర్క్ అయ్యింది.',
      'ఫ్యామిలీ సెంటిమెంట్స్ టచ్ చేస్తాయి.',
    ],
    direction: [
      'దర్శకుడు ఎమోషన్స్ బాగా హ్యాండిల్ చేశారు.',
      'నేరేటివ్ పద్ధతి ఆసక్తికరంగా ఉంది.',
      'స్లో బర్న్ డ్రామా, పేషెన్స్ అవసరం.',
    ],
    music_bgm: [
      'బ్యాక్‌గ్రౌండ్ స్కోర్ ఎమోషన్స్‌ను సపోర్ట్ చేసింది.',
      'పాటలు సందర్భోచితంగా ఉన్నాయి.',
      'సంగీతం సినిమాకు తగ్గట్టుగా ఉంది.',
    ],
  },
  Comedy: {
    story_screenplay: [
      'కామెడీ పంచ్‌లు బాగా వర్క్ అయ్యాయి.',
      'ఎంటర్‌టైనర్‌గా బాగా పాస్ అయ్యింది.',
      'కామెడీ టైమింగ్ హైలైట్.',
    ],
    direction: [
      'కామెడీ సీన్లలో దర్శకుడి టైమింగ్ సెన్స్ బాగుంది.',
      'లైట్-హార్టెడ్ ట్రీట్‌మెంట్.',
      'ఎంటర్‌టైన్‌మెంట్ క్వోషియంట్ హై.',
    ],
    music_bgm: [
      'ఫన్ పాటలు బాగున్నాయి.',
      'BGM కామెడీ సీన్లకు తగ్గట్టుగా ఉంది.',
      'క్యాచీ సాంగ్స్.',
    ],
  },
};

// Default templates for any genre
const DEFAULT_ANALYSIS_TEMPLATES: Record<string, string[]> = {
  story_screenplay: [
    'కథ ఆసక్తికరంగా ఉంది.',
    'స్క్రీన్‌ప్లే సాధారణం.',
    'కథలో కొన్ని హైలైట్ మూమెంట్స్ ఉన్నాయి.',
  ],
  direction: [
    'దర్శకుడి ప్రయత్నం కనిపిస్తుంది.',
    'సినిమాటిక్ మేకింగ్ బాగుంది.',
    'కొన్ని సీన్లలో మెరుగుపడాల్సిన అవసరం ఉంది.',
  ],
  acting_lead: [
    'హీరో/హీరోయిన్ నటన బాగుంది.',
    'లీడ్ యాక్టర్ పెర్ఫార్మెన్స్ హైలైట్.',
    'ప్రధాన పాత్రధారి తన వంతు కృషి చేశారు.',
  ],
  acting_supporting: [
    'సహాయ నటీనటులు మంచి సపోర్ట్ ఇచ్చారు.',
    'కమేడియన్ పంచ్‌లు బాగున్నాయి.',
    'సపోర్టింగ్ క్యాస్ట్ సగటం.',
  ],
  music_bgm: [
    'సంగీతం సినిమాకు తగ్గట్టుగా ఉంది.',
    'పాటలు ఓకే, BGM బాగుంది.',
    'మ్యూజిక్ డైరెక్టర్ మంచి పని చేశారు.',
  ],
  cinematography: [
    'విజువల్స్ అందంగా ఉన్నాయి.',
    'కెమెరా వర్క్ బాగుంది.',
    'లొకేషన్స్, లైటింగ్ హైలైట్.',
  ],
  editing_pacing: [
    'ఎడిటింగ్ క్రిస్ప్‌గా ఉంది.',
    'పేసింగ్ కొన్ని చోట్ల స్లో అవుతుంది.',
    'రన్‌టైమ్ తగ్గించి ఉంటే బాగుండేది.',
  ],
  emotional_impact: [
    'ఎమోషనల్ సీన్లు టచ్ చేస్తాయి.',
    'కొన్ని మూమెంట్స్ హృదయాన్ని కదిలిస్తాయి.',
    'ఎమోషన్ కనెక్ట్ సగటం.',
  ],
  rewatch_value: [
    'ఒకసారి చూడొచ్చు.',
    'ఫ్యామిలీతో కలిసి చూడొచ్చు.',
    'మళ్ళీ చూడాలనిపించదు.',
  ],
  mass_vs_class: [
    'మాస్ ఆడియెన్స్‌కు నచ్చుతుంది.',
    'క్లాస్ ఆడియెన్స్ ఎంజాయ్ చేస్తారు.',
    'ఆల్ క్లాస్ ఆడియెన్స్‌కు తగ్గట్టుగా ఉంది.',
  ],
};

// ============================================================
// SCORE CALCULATION
// ============================================================

/**
 * Calculate dimension scores from available ratings
 */
function calculateDimensionScores(movie: Movie): Record<string, number> {
  // Start with base rating
  const baseRating = movie.tmdb_rating || movie.imdb_rating || movie.our_rating || 6.0;
  
  // Normalize to 0-10 scale
  const normalizedBase = Math.min(10, Math.max(0, baseRating));
  
  // Apply variance based on genre and available data
  const scores: Record<string, number> = {};
  const variance = 0.8; // ±0.8 variance
  
  for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
    // Base score with small variance
    let score = normalizedBase + (Math.random() * variance * 2 - variance);
    
    // Apply genre-specific adjustments
    if (movie.genres?.includes('Action') && key === 'cinematography') {
      score += 0.5;
    }
    if (movie.genres?.includes('Romance') && key === 'emotional_impact') {
      score += 0.5;
    }
    if (movie.genres?.includes('Comedy') && key === 'acting_supporting') {
      score += 0.3;
    }
    
    // Clamp to valid range
    scores[key] = Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }
  
  return scores;
}

/**
 * Calculate overall score from dimension scores
 */
function calculateOverallScore(dimensionScores: Record<string, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
    const score = dimensionScores[key] || 5;
    weightedSum += score * def.weight;
    totalWeight += def.weight;
  }
  
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/**
 * Determine verdict from overall score
 */
function determineVerdict(score: number): keyof typeof VERDICT_TEMPLATES {
  if (score >= 9) return 'masterpiece';
  if (score >= 7.5) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 5) return 'average';
  if (score >= 3.5) return 'below_average';
  return 'poor';
}

/**
 * Determine data quality level
 */
function determineDataQuality(movie: Movie): 'high' | 'medium' | 'low' | 'minimal' {
  let score = 0;
  
  if (movie.tmdb_rating) score += 2;
  if (movie.imdb_rating) score += 2;
  if (movie.our_rating) score += 1;
  if (movie.director) score += 1;
  if (movie.hero) score += 1;
  if (movie.genres && movie.genres.length > 0) score += 1;
  if (movie.release_year) score += 1;
  
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'low';
  return 'minimal';
}

/**
 * Get analysis template for a dimension
 */
function getAnalysisTemplate(
  dimension: string,
  score: number,
  genres: string[]
): string {
  // Find genre-specific template if available
  for (const genre of genres) {
    const genreTemplates = GENRE_ANALYSIS_TEMPLATES[genre];
    if (genreTemplates && genreTemplates[dimension]) {
      const templates = genreTemplates[dimension];
      // Select based on score level
      const index = score >= 7 ? 0 : score >= 5 ? 1 : 2;
      return templates[Math.min(index, templates.length - 1)];
    }
  }
  
  // Fall back to default templates
  const templates = DEFAULT_ANALYSIS_TEMPLATES[dimension] || [];
  const index = score >= 7 ? 0 : score >= 5 ? 1 : 2;
  return templates[Math.min(index, templates.length - 1)] || 'సమాచారం అందుబాటులో లేదు.';
}

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Generate a template-based review for a movie
 */
export function generateTemplateReview(movie: Movie): TemplateReview {
  const dataQuality = determineDataQuality(movie);
  const dimensionScores = calculateDimensionScores(movie);
  const overallScore = calculateOverallScore(dimensionScores);
  const verdictKey = determineVerdict(overallScore);
  const verdictTemplate = VERDICT_TEMPLATES[verdictKey];
  
  // Build dimensions with analysis
  const dimensions: Record<string, TemplateDimension> = {};
  const genres = movie.genres || ['Drama'];
  
  for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
    const score = dimensionScores[key];
    dimensions[key] = {
      name: def.name,
      name_te: def.name_te,
      score,
      analysis_te: getAnalysisTemplate(key, score, genres),
      confidence: dataQuality === 'high' ? 0.8 : dataQuality === 'medium' ? 0.6 : 0.4,
    };
  }
  
  // Identify strengths and weaknesses
  const sortedDimensions = Object.entries(dimensionScores)
    .sort(([, a], [, b]) => b - a);
  
  const strengths = sortedDimensions
    .slice(0, 3)
    .filter(([, score]) => score >= 6)
    .map(([key]) => DIMENSION_DEFINITIONS[key as keyof typeof DIMENSION_DEFINITIONS]?.name_te || key);
  
  const weaknesses = sortedDimensions
    .slice(-3)
    .filter(([, score]) => score < 5)
    .map(([key]) => DIMENSION_DEFINITIONS[key as keyof typeof DIMENSION_DEFINITIONS]?.name_te || key);
  
  // Generate one-liners with movie name
  const titleTe = movie.title_te || movie.title_en;
  const oneLinerTe = verdictTemplate.one_liner_te
    .replace('{title_te}', titleTe)
    .replace('{title_en}', movie.title_en);
  const oneLinerEn = verdictTemplate.one_liner_en
    .replace('{title_te}', titleTe)
    .replace('{title_en}', movie.title_en);
  
  // Calculate overall confidence
  const confidence = 
    dataQuality === 'high' ? 0.75 :
    dataQuality === 'medium' ? 0.55 :
    dataQuality === 'low' ? 0.35 :
    0.2;
  
  return {
    movie_id: movie.id,
    movie_title: movie.title_en,
    movie_title_te: movie.title_te,
    dimensions,
    overall_score: overallScore,
    verdict: verdictTemplate.verdict,
    verdict_te: verdictTemplate.verdict_te,
    one_liner_te: oneLinerTe,
    one_liner_en: oneLinerEn,
    strengths,
    weaknesses,
    source: 'template_fallback',
    confidence,
    data_quality: dataQuality,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Save a template review to the database
 */
export async function saveTemplateReview(review: TemplateReview): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    // First try with all columns including source
    const fullInsertData = {
      movie_id: review.movie_id,
      reviewer_name: 'TeluguVibes Templates',
      overall_rating: review.overall_score,
      summary: review.one_liner_te,
      verdict: review.verdict_te,
      status: 'published',
      source: 'template_fallback',
      confidence: review.confidence,
      dimensions: review.dimensions,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      data_quality: review.data_quality,
    };
    
    const { error } = await supabase
      .from('movie_reviews')
      .insert(fullInsertData);
    
    if (error) {
      // If error mentions missing column, try minimal insert
      if (error.message.includes('does not exist')) {
        // Try with just the essential columns that are likely to exist
        const minimalInsertData = {
          movie_id: review.movie_id,
          reviewer_name: 'TeluguVibes Templates',
          overall_rating: review.overall_score,
          summary: review.one_liner_te,
          verdict: review.verdict_te,
          status: 'published',
        };
        
        const { error: retryError } = await supabase
          .from('movie_reviews')
          .insert(minimalInsertData);
        
        if (retryError) {
          console.error(`Failed to save review for ${review.movie_title}:`, retryError.message);
          return false;
        }
        
        return true;
      }
      
      console.error(`Failed to save review for ${review.movie_title}:`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving review for ${review.movie_title}:`, error);
    return false;
  }
}

/**
 * Generate and save fallback reviews for all movies without reviews
 */
export async function generateFallbackReviews(
  movies: Movie[],
  options: { dryRun?: boolean; onProgress?: (current: number, total: number, movie: string) => void } = {}
): Promise<{
  generated: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    generated: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };
  
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    
    if (options.onProgress) {
      options.onProgress(i + 1, movies.length, movie.title_en);
    }
    
    try {
      const review = generateTemplateReview(movie);
      
      if (options.dryRun) {
        result.generated++;
        continue;
      }
      
      const saved = await saveTemplateReview(review);
      if (saved) {
        result.generated++;
      } else {
        result.failed++;
        result.errors.push(`Failed to save: ${movie.title_en}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error processing ${movie.title_en}: ${error}`);
    }
  }
  
  return result;
}

// ============================================================
// PHASE 5.1: STRUCTURED REVIEW GENERATION
// ============================================================

/**
 * Generate best scenes based on movie dimensions and genre
 */
export function generateBestScenes(
  movie: Movie,
  dimensions: Record<string, TemplateDimension>
): string[] {
  const scenes: string[] = [];
  const genres = movie.genres || [];
  
  // High-scoring dimensions suggest memorable scenes
  const sortedDims = Object.entries(dimensions)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3);
  
  for (const [dimName, dim] of sortedDims) {
    if (dim.score >= 7) {
      switch (dimName) {
        case 'action':
          if (genres.includes('Action')) {
            scenes.push('Mass interval fight sequence');
            scenes.push('Climax confrontation scene');
          }
          break;
        case 'emotion':
          scenes.push('Heart-touching emotional climax');
          if (genres.includes('Family')) {
            scenes.push('Family reunion moment');
          }
          break;
        case 'romance':
          scenes.push('Hero-heroine introduction scene');
          scenes.push('Romantic song sequence');
          break;
        case 'comedy':
          scenes.push('Comedy track highlight');
          break;
        case 'music':
          scenes.push('Chartbuster song picturization');
          break;
      }
    }
  }
  
  // Genre-specific default scenes
  if (scenes.length === 0) {
    if (genres.includes('Drama')) {
      scenes.push('Pivotal dramatic confrontation');
    }
    if (genres.includes('Thriller')) {
      scenes.push('Twist reveal moment');
    }
  }
  
  return [...new Set(scenes)].slice(0, 5);
}

/**
 * Generate performance highlights for cast members
 */
export function generatePerformanceHighlights(movie: Movie): PerformanceHighlight[] {
  const highlights: PerformanceHighlight[] = [];
  
  // Hero performance
  if (movie.hero) {
    highlights.push({
      actor: movie.hero,
      role: 'Hero',
      note_te: `${movie.hero} తన నటనతో ప్రేక్షకులను ఆకట్టుకున్నారు`,
      note_en: `${movie.hero} captivates the audience with their performance`
    });
  }
  
  // Heroine performance
  if (movie.heroine) {
    highlights.push({
      actor: movie.heroine,
      role: 'Heroine',
      note_te: `${movie.heroine} పాత్రలో ఒదిగిపోయారు`,
      note_en: `${movie.heroine} fits perfectly into the role`
    });
  }
  
  // Director mention
  if (movie.director) {
    highlights.push({
      actor: movie.director,
      role: 'Director',
      note_te: `దర్శకుడు ${movie.director} కథను చక్కగా నడిపించారు`,
      note_en: `Director ${movie.director} handles the narrative well`
    });
  }
  
  return highlights;
}

/**
 * Generate watch recommendation based on movie data
 */
export function generateWatchRecommendation(
  movie: Movie,
  overallScore: number
): WatchRecommendation {
  const genres = movie.genres || [];
  
  // Determine audience
  let audience: WatchRecommendation['audience'] = 'all';
  if (genres.includes('Family') || genres.includes('Drama')) {
    audience = 'family';
  } else if (genres.includes('Action') && !genres.includes('Romance')) {
    audience = 'mass';
  } else if (genres.includes('Thriller') || genres.includes('Crime')) {
    audience = 'class';
  } else if (genres.includes('Romance') || genres.includes('Comedy')) {
    audience = 'youth';
  }
  
  // Generate best_for text
  let bestFor = 'General audience';
  if (audience === 'family') {
    bestFor = 'Family weekend watch';
  } else if (audience === 'mass') {
    bestFor = 'Single-screen action lovers';
  } else if (audience === 'class') {
    bestFor = 'Content-oriented viewers';
  } else if (audience === 'youth') {
    bestFor = 'Young audience looking for entertainment';
  }
  
  // Generate skip_if text for lower scores
  let skipIf: string | null = null;
  if (overallScore < 5) {
    skipIf = 'You prefer tight screenplays';
  } else if (overallScore < 6 && genres.includes('Action')) {
    skipIf = 'You dislike formulaic mass films';
  }
  
  return {
    recommended: overallScore >= 6,
    audience,
    best_for: bestFor,
    skip_if: skipIf
  };
}

/**
 * Find similar movies based on genre, director, and cast
 */
export async function findSimilarMovies(movie: Movie): Promise<LinkedMovie[]> {
  const supabase = getSupabaseClient();
  const similar: LinkedMovie[] = [];
  
  // Find movies by same director
  if (movie.director) {
    const { data: directorMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('director', movie.director)
      .neq('id', movie.id)
      .limit(3);
    
    if (directorMovies) {
      for (const m of directorMovies) {
        similar.push({
          movie_id: m.id,
          title: m.title_en,
          similarity_score: 0.85,
          reason: `Same director: ${movie.director}`
        });
      }
    }
  }
  
  // Find movies with same hero
  if (movie.hero) {
    const { data: heroMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('hero', movie.hero)
      .neq('id', movie.id)
      .limit(3);
    
    if (heroMovies) {
      for (const m of heroMovies) {
        if (!similar.find(s => s.movie_id === m.id)) {
          similar.push({
            movie_id: m.id,
            title: m.title_en,
            similarity_score: 0.75,
            reason: `Same lead actor: ${movie.hero}`
          });
        }
      }
    }
  }
  
  // Find movies with similar genres (same primary genre + year range)
  const primaryGenre = movie.genres?.[0];
  if (primaryGenre && movie.release_year) {
    const { data: genreMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .contains('genres', [primaryGenre])
      .gte('release_year', movie.release_year - 3)
      .lte('release_year', movie.release_year + 3)
      .neq('id', movie.id)
      .limit(3);
    
    if (genreMovies) {
      for (const m of genreMovies) {
        if (!similar.find(s => s.movie_id === m.id)) {
          similar.push({
            movie_id: m.id,
            title: m.title_en,
            similarity_score: 0.65,
            reason: `Similar genre: ${primaryGenre}`
          });
        }
      }
    }
  }
  
  // Sort by similarity score and limit
  return similar
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);
}

/**
 * Generate linked celebrities from movie data
 */
export function generateLinkedCelebrities(movie: Movie): LinkedCelebrity[] {
  const celebrities: LinkedCelebrity[] = [];
  
  if (movie.hero) {
    celebrities.push({
      name: movie.hero,
      role_in_movie: 'hero'
    });
  }
  
  if (movie.heroine) {
    celebrities.push({
      name: movie.heroine,
      role_in_movie: 'heroine'
    });
  }
  
  if (movie.director) {
    celebrities.push({
      name: movie.director,
      role_in_movie: 'director'
    });
  }
  
  return celebrities;
}

/**
 * Generate enhanced template review with all structured sections
 */
export async function generateEnhancedTemplateReview(movie: Movie): Promise<TemplateReview> {
  // Generate base template review
  const baseReview = generateTemplateReview(movie);
  
  // Add structured sections
  const bestScenes = generateBestScenes(movie, baseReview.dimensions);
  const performanceHighlights = generatePerformanceHighlights(movie);
  const watchRecommendation = generateWatchRecommendation(movie, baseReview.overall_score);
  const linkedCelebrities = generateLinkedCelebrities(movie);
  const linkedMovies = await findSimilarMovies(movie);
  
  return {
    ...baseReview,
    best_scenes: bestScenes,
    performance_highlights: performanceHighlights,
    watch_recommendation: watchRecommendation,
    linked_celebrities: linkedCelebrities,
    linked_movies: linkedMovies
  };
}

