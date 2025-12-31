/**
 * NEXT-GEN MOVIE REVIEW SYSTEM
 *
 * Multi-axis intelligence, not blog text.
 *
 * Dimensions:
 * - Story & Screenplay
 * - Direction
 * - Acting (lead + supporting)
 * - Music & BGM
 * - Cinematography
 * - Editing & Pacing
 * - Emotional Impact
 * - Rewatch Value
 * - Mass vs Class Appeal
 *
 * Features:
 * - Similar movies engine
 * - Comparable verdicts
 * - Genre-accurate analysis
 */

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface ReviewDimension {
  name: string;
  name_te: string;
  score: number;        // 0-10
  analysis_te: string;  // Telugu analysis
  analysis_en: string;  // English analysis
  highlights: string[]; // Key points
}

export interface MultiAxisReview {
  movie_id: string;
  movie_title: string;
  movie_title_te?: string;

  // Overall
  overall_score: number;          // 0-10
  verdict: 'masterpiece' | 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  verdict_te: string;
  one_liner_te: string;
  one_liner_en: string;

  // Dimensions
  dimensions: {
    story_screenplay: ReviewDimension;
    direction: ReviewDimension;
    acting_lead: ReviewDimension;
    acting_supporting: ReviewDimension;
    music_bgm: ReviewDimension;
    cinematography: ReviewDimension;
    editing_pacing: ReviewDimension;
    emotional_impact: ReviewDimension;
    rewatch_value: ReviewDimension;
    mass_vs_class: ReviewDimension;
  };

  // Analysis
  strengths: string[];
  weaknesses: string[];
  target_audience: string[];

  // Comparisons
  similar_movies: SimilarMovie[];
  comparable_performances: ComparablePerformance[];

  // Meta
  is_ai_generated: boolean;
  needs_human_review: boolean;
  confidence: number;
  generated_at: string;
}

export interface SimilarMovie {
  movie_id?: string;
  title: string;
  title_te?: string;
  year?: number;
  similarity_reason: string;
  similarity_type: 'director' | 'actor' | 'genre' | 'era' | 'theme' | 'tone';
  similarity_score: number; // 0-1
}

export interface ComparablePerformance {
  actor: string;
  movie: string;
  character?: string;
  comparison_note: string;
}

// ============================================================
// DIMENSION DEFINITIONS
// ============================================================

const DIMENSION_DEFINITIONS = {
  story_screenplay: {
    name: 'Story & Screenplay',
    name_te: 'కథ & స్క్రీన్‌ప్లే',
    aspects: ['originality', 'engagement', 'logic', 'dialogues', 'twists'],
  },
  direction: {
    name: 'Direction',
    name_te: 'దర్శకత్వం',
    aspects: ['vision', 'execution', 'style', 'consistency', 'innovation'],
  },
  acting_lead: {
    name: 'Lead Acting',
    name_te: 'హీరో/హీరోయిన్ నటన',
    aspects: ['intensity', 'range', 'chemistry', 'screen_presence', 'transformation'],
  },
  acting_supporting: {
    name: 'Supporting Cast',
    name_te: 'సహాయ నటీనటులు',
    aspects: ['impact', 'casting', 'memorable_moments', 'balance'],
  },
  music_bgm: {
    name: 'Music & BGM',
    name_te: 'సంగీతం & BGM',
    aspects: ['songs', 'background_score', 'sync_with_visuals', 'replay_value'],
  },
  cinematography: {
    name: 'Cinematography',
    name_te: 'ఛాయాగ్రహణం',
    aspects: ['visuals', 'lighting', 'framing', 'color_grading', 'action_sequences'],
  },
  editing_pacing: {
    name: 'Editing & Pacing',
    name_te: 'ఎడిటింగ్ & పేసింగ్',
    aspects: ['flow', 'runtime', 'transitions', 'unnecessary_scenes'],
  },
  emotional_impact: {
    name: 'Emotional Impact',
    name_te: 'భావోద్వేగ ప్రభావం',
    aspects: ['tears', 'laughter', 'thrill', 'inspiration', 'connection'],
  },
  rewatch_value: {
    name: 'Rewatch Value',
    name_te: 'మళ్ళీ చూడాలనిపించే విలువ',
    aspects: ['entertainment', 'depth', 'family_friendly', 'cult_potential'],
  },
  mass_vs_class: {
    name: 'Mass vs Class Appeal',
    name_te: 'మాస్ vs క్లాస్',
    aspects: ['mass_moments', 'class_elements', 'universal_appeal', 'niche'],
  },
};

// ============================================================
// REVIEW GENERATOR
// ============================================================

export class MultiAxisReviewGenerator {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Generate a comprehensive multi-axis review
   */
  async generateReview(
    movie: {
      id: string;
      title: string;
      title_te?: string;
      director?: string;
      hero?: string;
      heroine?: string;
      genres?: string[];
      release_year?: number;
      overview?: string;
      cast?: { name: string; character?: string }[];
    },
    context?: {
      trailer_sentiment?: string;
      social_buzz?: string;
      audience_reception?: string;
    }
  ): Promise<MultiAxisReview> {
    console.log(`🎬 Generating multi-axis review for: ${movie.title}`);

    // Generate dimension scores via AI
    const dimensionAnalysis = await this.analyzeAllDimensions(movie, context);

    // Find similar movies
    const similarMovies = await this.findSimilarMovies(movie);

    // Find comparable performances
    const comparables = await this.findComparablePerformances(movie);

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(dimensionAnalysis);

    // Determine verdict
    const verdict = this.determineVerdict(overallScore);

    // Generate one-liners
    const oneLiner = await this.generateOneLiner(movie, overallScore, verdict);

    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(dimensionAnalysis);

    // Identify target audience
    const targetAudience = this.identifyTargetAudience(dimensionAnalysis, movie.genres);

    return {
      movie_id: movie.id,
      movie_title: movie.title,
      movie_title_te: movie.title_te,
      overall_score: overallScore,
      verdict,
      verdict_te: this.getVerdictTe(verdict),
      one_liner_te: oneLiner.te,
      one_liner_en: oneLiner.en,
      dimensions: dimensionAnalysis,
      strengths,
      weaknesses,
      target_audience: targetAudience,
      similar_movies: similarMovies,
      comparable_performances: comparables,
      is_ai_generated: true,
      needs_human_review: true,
      confidence: this.calculateConfidence(dimensionAnalysis),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Analyze all dimensions via AI
   */
  private async analyzeAllDimensions(
    movie: any,
    context?: any
  ): Promise<MultiAxisReview['dimensions']> {
    const prompt = `You are a Telugu film critic. Analyze this movie across all dimensions.

MOVIE: ${movie.title} (${movie.title_te || ''})
DIRECTOR: ${movie.director || 'Unknown'}
HERO: ${movie.hero || 'Unknown'}
HEROINE: ${movie.heroine || 'Unknown'}
GENRES: ${(movie.genres || []).join(', ')}
YEAR: ${movie.release_year || 'Unknown'}
CAST: ${movie.cast?.map((c: any) => `${c.name}${c.character ? ` as ${c.character}` : ''}`).join(', ') || 'Unknown'}

${movie.overview ? `SYNOPSIS: ${movie.overview}` : ''}
${context?.trailer_sentiment ? `TRAILER REACTION: ${context.trailer_sentiment}` : ''}
${context?.social_buzz ? `SOCIAL BUZZ: ${context.social_buzz}` : ''}

For each dimension, provide:
- Score (0-10)
- Analysis in Telugu (2-3 sentences)
- Analysis in English (2-3 sentences)
- 2-3 highlight points

Return ONLY valid JSON:
{
  "story_screenplay": {
    "score": 7.5,
    "analysis_te": "కథ చాలా బాగుంది...",
    "analysis_en": "The story is engaging...",
    "highlights": ["Highlight 1", "Highlight 2"]
  },
  "direction": { ... },
  "acting_lead": { ... },
  "acting_supporting": { ... },
  "music_bgm": { ... },
  "cinematography": { ... },
  "editing_pacing": { ... },
  "emotional_impact": { ... },
  "rewatch_value": { ... },
  "mass_vs_class": { ... }
}

Be honest and balanced. Telugu audiences appreciate authenticity.`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 3000,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = this.parseJSON(response);

      // Build dimensions with defaults
      const dimensions: MultiAxisReview['dimensions'] = {} as any;

      for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
        const aiDimension = parsed[key] || {};
        dimensions[key as keyof typeof dimensions] = {
          name: def.name,
          name_te: def.name_te,
          score: aiDimension.score || 5,
          analysis_te: aiDimension.analysis_te || 'విశ్లేషణ అందుబాటులో లేదు',
          analysis_en: aiDimension.analysis_en || 'Analysis not available',
          highlights: aiDimension.highlights || [],
        };
      }

      return dimensions;
    } catch (error) {
      console.error('Dimension analysis failed:', error);
      return this.getDefaultDimensions();
    }
  }

  /**
   * Find similar movies based on multiple factors
   */
  private async findSimilarMovies(movie: any): Promise<SimilarMovie[]> {
    const similar: SimilarMovie[] = [];

    // By director
    if (movie.director) {
      const { data: directorMovies } = await supabase
        .from('movies')
        .select('id, title_en, title_te, release_year')
        .eq('director', movie.director)
        .neq('id', movie.id)
        .limit(2);

      for (const m of (directorMovies || [])) {
        similar.push({
          movie_id: m.id,
          title: m.title_en,
          title_te: m.title_te,
          year: m.release_year,
          similarity_reason: `Same director: ${movie.director}`,
          similarity_type: 'director',
          similarity_score: 0.85,
        });
      }
    }

    // By hero
    if (movie.hero) {
      const { data: heroMovies } = await supabase
        .from('movies')
        .select('id, title_en, title_te, release_year')
        .eq('hero', movie.hero)
        .neq('id', movie.id)
        .limit(2);

      for (const m of (heroMovies || [])) {
        similar.push({
          movie_id: m.id,
          title: m.title_en,
          title_te: m.title_te,
          year: m.release_year,
          similarity_reason: `Same lead actor: ${movie.hero}`,
          similarity_type: 'actor',
          similarity_score: 0.75,
        });
      }
    }

    // By genre
    if (movie.genres && movie.genres.length > 0) {
      const { data: genreMovies } = await supabase
        .from('movies')
        .select('id, title_en, title_te, release_year, genres')
        .contains('genres', [movie.genres[0]])
        .neq('id', movie.id)
        .limit(2);

      for (const m of (genreMovies || [])) {
        similar.push({
          movie_id: m.id,
          title: m.title_en,
          title_te: m.title_te,
          year: m.release_year,
          similarity_reason: `Same genre: ${movie.genres[0]}`,
          similarity_type: 'genre',
          similarity_score: 0.65,
        });
      }
    }

    // Deduplicate and sort by similarity
    const unique = similar.reduce((acc, curr) => {
      if (!acc.find(m => m.title === curr.title)) {
        acc.push(curr);
      }
      return acc;
    }, [] as SimilarMovie[]);

    return unique.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
  }

  /**
   * Find comparable performances
   */
  private async findComparablePerformances(movie: any): Promise<ComparablePerformance[]> {
    const comparables: ComparablePerformance[] = [];

    // Find other performances by the same actor
    if (movie.hero) {
      const { data: otherMovies } = await supabase
        .from('movies')
        .select('title_en')
        .eq('hero', movie.hero)
        .neq('id', movie.id)
        .order('popularity_score', { ascending: false })
        .limit(1);

      if (otherMovies?.[0]) {
        comparables.push({
          actor: movie.hero,
          movie: otherMovies[0].title_en,
          comparison_note: `Similar intensity to their role in ${otherMovies[0].title_en}`,
        });
      }
    }

    return comparables;
  }

  /**
   * Calculate overall score from dimensions
   */
  private calculateOverallScore(dimensions: MultiAxisReview['dimensions']): number {
    const weights: Record<string, number> = {
      story_screenplay: 0.20,
      direction: 0.15,
      acting_lead: 0.15,
      acting_supporting: 0.05,
      music_bgm: 0.10,
      cinematography: 0.08,
      editing_pacing: 0.07,
      emotional_impact: 0.10,
      rewatch_value: 0.05,
      mass_vs_class: 0.05,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, dim] of Object.entries(dimensions)) {
      const weight = weights[key] || 0.05;
      totalWeight += weight;
      weightedSum += dim.score * weight;
    }

    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }

  /**
   * Determine verdict from score
   */
  private determineVerdict(score: number): MultiAxisReview['verdict'] {
    if (score >= 9) return 'masterpiece';
    if (score >= 8) return 'excellent';
    if (score >= 6.5) return 'good';
    if (score >= 5) return 'average';
    if (score >= 3.5) return 'below_average';
    return 'poor';
  }

  private getVerdictTe(verdict: MultiAxisReview['verdict']): string {
    const map = {
      masterpiece: 'మాస్టర్‌పీస్',
      excellent: 'అద్భుతం',
      good: 'మంచిది',
      average: 'యావరేజ్',
      below_average: 'నిరాశపరిచింది',
      poor: 'పేలవం',
    };
    return map[verdict];
  }

  /**
   * Generate one-liner summary
   */
  private async generateOneLiner(
    movie: any,
    score: number,
    verdict: string
  ): Promise<{ te: string; en: string }> {
    try {
      const prompt = `Write a one-line review summary for this Telugu movie.

Movie: ${movie.title}
Score: ${score}/10
Verdict: ${verdict}
Director: ${movie.director || 'Unknown'}
Hero: ${movie.hero || 'Unknown'}

Return JSON:
{
  "te": "One line in Telugu (emotional, authentic)",
  "en": "One line in English"
}`;

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = this.parseJSON(response);
      return {
        te: parsed.te || 'మంచి సినిమా',
        en: parsed.en || 'A decent movie',
      };
    } catch {
      return {
        te: 'మంచి సినిమా',
        en: 'A decent movie',
      };
    }
  }

  /**
   * Identify strengths and weaknesses from dimensions
   */
  private identifyStrengthsWeaknesses(dimensions: MultiAxisReview['dimensions']): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [, dim] of Object.entries(dimensions)) {
      if (dim.score >= 8) {
        strengths.push(`${dim.name}: ${dim.highlights[0] || 'Excellent'}`);
      } else if (dim.score <= 4) {
        weaknesses.push(`${dim.name}: Needs improvement`);
      }
    }

    return {
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 3),
    };
  }

  /**
   * Identify target audience
   */
  private identifyTargetAudience(
    dimensions: MultiAxisReview['dimensions'],
    genres?: string[]
  ): string[] {
    const audience: string[] = [];

    // Based on mass vs class
    if (dimensions.mass_vs_class.score >= 7) {
      audience.push('Mass audience');
    }
    if (dimensions.emotional_impact.score >= 7) {
      audience.push('Family audience');
    }
    if (genres?.includes('Action')) {
      audience.push('Action lovers');
    }
    if (genres?.includes('Romance')) {
      audience.push('Romance fans');
    }
    if (dimensions.rewatch_value.score >= 7) {
      audience.push('Multiple viewing enthusiasts');
    }

    return audience.length > 0 ? audience : ['General audience'];
  }

  private calculateConfidence(dimensions: MultiAxisReview['dimensions']): number {
    // Confidence based on how many dimensions have highlights
    let confidence = 0.7;
    for (const dim of Object.values(dimensions)) {
      if (dim.highlights.length > 0) confidence += 0.02;
      if (dim.analysis_te.length > 20) confidence += 0.01;
    }
    return Math.min(1, confidence);
  }

  private parseJSON(response: string): any {
    try {
      let clean = response.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      return JSON.parse(clean);
    } catch {
      return {};
    }
  }

  private getDefaultDimensions(): MultiAxisReview['dimensions'] {
    const dims: any = {};
    for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
      dims[key] = {
        name: def.name,
        name_te: def.name_te,
        score: 5,
        analysis_te: 'విశ్లేషణ అందుబాటులో లేదు',
        analysis_en: 'Analysis not available',
        highlights: [],
      };
    }
    return dims;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export async function generateMultiAxisReview(
  movie: Parameters<MultiAxisReviewGenerator['generateReview']>[0],
  context?: Parameters<MultiAxisReviewGenerator['generateReview']>[1]
): Promise<MultiAxisReview> {
  const generator = new MultiAxisReviewGenerator();
  return generator.generateReview(movie, context);
}
