/**
 * EDITORIAL REVIEW GENERATOR
 * 
 * Generates comprehensive, "Athadu-quality" movie reviews with 9-section structure.
 * Uses AI-assisted analysis combined with structured templates.
 * 
 * Data Sources (Legal):
 * - TMDB: Metadata, cast, crew, ratings
 * - IMDb: Ratings, vote counts (no review copying)
 * - Wikipedia: Plot summaries, production notes (factual only)
 * - Internal: Enriched dimensions, performance scores, audience signals
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { smartAI } from '../ai/smart-key-manager';

// ============================================================
// AI PROVIDER CONFIGURATION
// ============================================================

type AIProvider = 'groq' | 'openai' | 'cohere' | 'huggingface';

const AI_CONFIG = {
  provider: (process.env.AI_PROVIDER as AIProvider) || 'groq',
  groq: {
    model: 'llama-3.3-70b-versatile',
  },
  openai: {
    model: 'gpt-4o-mini', // Cost-effective, good at JSON
  },
  cohere: {
    model: 'command-r-plus', // Good for structured outputs
  },
  huggingface: {
    model: 'meta-llama/Llama-3.3-70B-Instruct', // Open source alternative
    endpoint: 'https://api-inference.huggingface.co/models/',
  },
};

// ============================================================
// TYPES
// ============================================================

export interface EditorialReview {
  // 1. Synopsis (200-250 words)
  synopsis: {
    en: string;
    te: string;
    spoiler_free: boolean;
  };
  
  // 2. Story & Screenplay (150-200 words) with scores
  story_screenplay: {
    narrative_strength: string;
    story_score: number;
    pacing_analysis: string;
    pacing_score: number;
    emotional_engagement: string;
    emotional_score: number;
    originality_score: number;
  };
  
  // 3. Performances (200-250 words)
  performances: {
    lead_actors: Array<{
      name: string;
      analysis: string;
      career_significance: string;
      score: number;
    }>;
    supporting_cast: string;
    ensemble_chemistry: string;
  };
  
  // 4. Direction & Technicals (150-200 words) with scores
  direction_technicals: {
    direction_style: string;
    direction_score: number;
    cinematography_highlights: string;
    cinematography_score: number;
    music_bgm_impact: string;
    music_score: number;
    editing_notes: string;
    editing_score: number;
  };
  
  // 5. Audience vs Critics POV (100-150 words)
  perspectives: {
    audience_reception: string;
    critic_consensus: string;
    divergence_points: string[];
  };
  
  // 6. Why You Should Watch (80-100 words)
  why_watch: {
    reasons: string[];
    best_for: string[];
  };
  
  // 7. Why You May Skip (60-80 words)
  why_skip: {
    drawbacks: string[];
    not_for: string[];
  };
  
  // 8. Cultural/Legacy Value (100-150 words)
  cultural_impact: {
    cultural_significance: string;
    influence_on_cinema: string;
    memorable_elements: string[];
    legacy_status: string;
    cult_status: boolean;
  };
  
  // 9. Awards & Achievements (optional)
  awards?: {
    national_awards?: string[];
    filmfare_awards?: string[];
    nandi_awards?: string[];
    other_awards?: string[];
    box_office_records?: string[];
  };
  
  // 10. Final Verdict (50-80 words)
  verdict: {
    category: 'blockbuster' | 'classic' | 'cult' | 'hidden-gem' | 'must-watch' | 'one-time-watch' | 'skippable' | 'average' | 'recommended';
    en: string;
    te: string;
    final_rating: number;
    confidence_score: number;
  };
  
  // Metadata
  sources_used: string[];
  generated_at: string;
  quality_score: number;
}

interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  release_year?: number;
  release_date?: string;
  genres?: string[];
  hero?: string;
  heroine?: string;
  director?: string;
  overview?: string;
  tagline?: string;
  avg_rating?: number;
  tags?: string[];
}

interface ReviewDataSources {
  movie: Movie;
  review_rating?: number; // From movie_reviews.overall_rating - more reliable than movies.avg_rating
  enriched_dimensions?: any;
  performance_scores?: any;
  technical_scores?: any;
  audience_signals?: any;
  tmdb_metadata?: {
    overview: string;
    tagline: string;
    popularity: number;
    vote_average: number;
  };
}

// ============================================================
// GENERATOR CLASS
// ============================================================

// Smart AI client handles all key management, routing, and fallback
// See lib/ai/smart-key-manager.ts for implementation

export class EditorialReviewGenerator {
  private supabase: ReturnType<typeof createClient>;
  private preferredProvider: AIProvider;

  constructor() {
    // Smart AI client will be initialized on first use
    // It handles all key management, validation, routing, and fallback
    this.preferredProvider = (process.env.AI_PROVIDER as AIProvider) || 'groq';

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get AI client with current key (supports rotation)
   */
  private getAIClient(provider: AIProvider): { 
    groq?: Groq; 
    openai?: OpenAI; 
    cohereKey?: string;
    huggingfaceKey?: string;
    key: string | null;
    provider: AIProvider;
  } {
    const { keyManager } = require('../ai/key-manager');
    const key = keyManager.getKey(provider);
    
    if (!key) return { key: null, provider };

    if (provider === 'openai') {
      return { openai: new OpenAI({ apiKey: key }), key, provider };
    } else if (provider === 'groq') {
      return { groq: new Groq({ apiKey: key }), key, provider };
    } else if (provider === 'cohere') {
      return { cohereKey: key, key, provider };
    } else if (provider === 'huggingface') {
      return { huggingfaceKey: key, key, provider };
    }
    return { key: null, provider };
  }

  /**
   * Make Cohere API call
   */
  private async cohereCompletion(key: string, prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.cohere.model,
        message: prompt,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const err = new Error(error.message || `Cohere API error: ${response.status}`);
      (err as any).status = response.status;
      throw err;
    }

    const data = await response.json();
    return data.text || '';
  }

  /**
   * Make HuggingFace API call
   */
  private async huggingfaceCompletion(key: string, prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch(`${AI_CONFIG.huggingface.endpoint}${AI_CONFIG.huggingface.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const err = new Error(error.error || `HuggingFace API error: ${response.status}`);
      (err as any).status = response.status;
      throw err;
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
  }

  /**
   * Clean and parse JSON from AI response (handles markdown code blocks, control chars, etc.)
   */
  private parseAIResponse(content: string): any {
    // Remove markdown code blocks if present
    let cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Remove control characters that break JSON
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');
    
    // Fix common issues: unescaped quotes in strings, trailing commas
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    return JSON.parse(cleaned);
  }

  /**
   * Make AI completion call using Smart Key Manager
   * Features: Pre-validation, intelligent routing, timeout-based switching, parallel support
   */
  private async aiCompletion(prompt: string, maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
    // Use the smart AI client which handles all key rotation, validation, and fallback
    return await smartAI.complete(prompt, {
      maxTokens,
      temperature,
      timeout: 60000, // 60 second timeout per request
    });
  }

  /**
   * Generate a comprehensive editorial review for a movie
   */
  async generateReview(movieId: string): Promise<EditorialReview> {
    console.log(`\n🎬 Generating editorial review for movie: ${movieId}`);

    // 1. Gather all data sources
    const sources = await this.gatherDataSources(movieId);
    
    // 2. Generate each section using AI
    const synopsis = await this.generateSynopsis(sources);
    const storyScreenplay = await this.generateStoryScreenplay(sources);
    const performances = await this.generatePerformances(sources);
    const directionTechnicals = await this.generateDirectionTechnicals(sources);
    const perspectives = await this.generatePerspectives(sources);
    const whyWatch = await this.generateWhyWatch(sources);
    const whySkip = await this.generateWhySkip(sources);
    const culturalImpact = await this.generateCulturalImpact(sources);
    const awards = await this.generateAwards(sources);
    
    // 3. Generate verdict with calculated scores from other sections
    const generatedScores = {
      storyScore: storyScreenplay?.score || storyScreenplay?.originality_score || 0,
      directionScore: directionTechnicals?.score || directionTechnicals?.direction_score || 0,
      performanceScores: (performances?.lead_actors || [])
        .map((a: any) => a?.score)
        .filter((s: any) => s && s > 0),
    };
    const verdict = await this.generateVerdict(sources, culturalImpact, generatedScores);

    const review: EditorialReview = {
      synopsis,
      story_screenplay: storyScreenplay,
      performances,
      direction_technicals: directionTechnicals,
      perspectives,
      why_watch: whyWatch,
      why_skip: whySkip,
      cultural_impact: culturalImpact,
      awards,
      verdict,
      sources_used: ['tmdb', 'internal_enrichment', AI_CONFIG.provider],
      generated_at: new Date().toISOString(),
      quality_score: 0, // Will be calculated
    };

    // 4. Calculate quality score
    review.quality_score = this.calculateQualityScore(review);

    return review;
  }

  /**
   * Gather all data sources for review generation
   */
  private async gatherDataSources(movieId: string): Promise<ReviewDataSources> {
    const { data: movie } = await this.supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single();

    if (!movie) {
      throw new Error(`Movie not found: ${movieId}`);
    }

    // Fetch enriched review data including overall_rating for proper rating calculation
    const { data: review } = await this.supabase
      .from('movie_reviews')
      .select('overall_rating, composite_score, dimensions_json, performance_scores, technical_scores, audience_signals')
      .eq('movie_id', movieId)
      .single();

    return {
      movie,
      review_rating: review?.overall_rating || review?.composite_score || 0,
      enriched_dimensions: review?.dimensions_json,
      performance_scores: review?.performance_scores,
      technical_scores: review?.technical_scores,
      audience_signals: review?.audience_signals,
      tmdb_metadata: {
        overview: movie.overview || '',
        tagline: movie.tagline || '',
        popularity: 0,
        vote_average: movie.avg_rating || 0,
      },
    };
  }

  /**
   * Generate Synopsis section (200-250 words) with retry logic
   */
  private async generateSynopsis(sources: ReviewDataSources): Promise<EditorialReview['synopsis']> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Generate English synopsis first (more reliable)
        const englishPrompt = `You are a Telugu film critic. Write a 200-250 word spoiler-free synopsis.

MOVIE: ${sources.movie.title_en}
YEAR: ${sources.movie.release_year}
GENRES: ${sources.movie.genres?.join(', ') || 'Drama'}
DIRECTOR: ${sources.movie.director || 'Unknown'}
HERO: ${sources.movie.hero || 'Unknown'}
HEROINE: ${sources.movie.heroine || 'Unknown'}
${sources.tmdb_metadata?.overview ? `PLOT HINT: ${sources.tmdb_metadata.overview.substring(0, 200)}` : ''}

Rules:
- Focus on setup, not resolution
- Highlight unique premise
- Mention key characters by name
- Set the tone (action-packed, emotional, thriller, etc.)

Return ONLY valid JSON (no markdown):
{"en": "Your 200-250 word English synopsis here", "spoiler_free": true}`;

        const englishContent = await this.aiCompletion(englishPrompt, 800, 0.7);
        const englishResult = this.parseAIResponse(englishContent);
        
        // Step 2: Generate Telugu synopsis separately (avoids JSON issues with Telugu text)
        let teluguSynopsis = '';
        try {
          const teluguPrompt = `Translate this movie synopsis to Telugu (200-250 words). Keep film terminology in English if needed.

MOVIE: ${sources.movie.title_te || sources.movie.title_en}
SYNOPSIS: ${englishResult.en}

Return ONLY the Telugu text, no JSON, no quotes.`;

          teluguSynopsis = await this.aiCompletion(teluguPrompt, 800, 0.7);
          // Clean up any quotes or JSON artifacts
          teluguSynopsis = teluguSynopsis.replace(/^["'{]|["'}]$/g, '').trim();
        } catch (teluguError) {
          // Fallback Telugu
          teluguSynopsis = `${sources.movie.title_te || sources.movie.title_en} ఒక ${sources.movie.genres?.[0] || 'డ్రామా'} చిత్రం. ${sources.movie.director || ''} దర్శకత్వం వహించారు.`;
        }
        
        return {
          en: englishResult.en || `${sources.movie.title_en} is a ${sources.movie.genres?.[0] || 'drama'} film.`,
          te: teluguSynopsis,
          spoiler_free: true,
        };
        
      } catch (error) {
        if (attempt < maxRetries) {
          console.log(`   ⟳ Synopsis retry ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
        } else {
          console.error('Error generating synopsis after retries:', error);
        }
      }
    }
    
    // Final fallback
    return {
      en: `${sources.movie.title_en} is a ${sources.movie.genres?.[0] || 'drama'} film directed by ${sources.movie.director || 'a talented filmmaker'}. Released in ${sources.movie.release_year}, this ${sources.movie.genres?.join('/')} movie stars ${sources.movie.hero || 'the lead actor'} and ${sources.movie.heroine || 'the lead actress'} in pivotal roles.`,
      te: `${sources.movie.title_te || sources.movie.title_en} ఒక ${sources.movie.genres?.[0] || 'డ్రామా'} చిత్రం. ${sources.movie.director || ''} దర్శకత్వం వహించారు.`,
      spoiler_free: true,
    };
  }

  /**
   * Generate Story & Screenplay section (150-200 words) with scores
   */
  private async generateStoryScreenplay(sources: ReviewDataSources): Promise<EditorialReview['story_screenplay']> {
    const dimensions = sources.enriched_dimensions;
    const movieRating = sources.movie.avg_rating || 7;
    
    const prompt = `Analyze the story and screenplay for ${sources.movie.title_en} (${sources.movie.release_year}).

GENRES: ${sources.movie.genres?.join(', ') || 'Drama'}
MOVIE RATING: ${movieRating}/10
DIRECTOR: ${sources.movie.director || 'Unknown'}
${dimensions?.story_screenplay ? `EXISTING STORY SCORE: ${dimensions.story_screenplay.score}/10` : ''}

Analyze story/screenplay with descriptions AND scores (1-10):
1. Narrative/Story - plot structure, conflict, resolution. Rate 1-10
2. Pacing - is it engaging throughout or has slow parts? Rate 1-10
3. Emotional engagement - how well does it connect? Rate 1-10
4. Originality - how fresh is the concept? Rate 1-10

Scores should be realistic and proportional to movie rating of ${movieRating}/10.

Return ONLY valid JSON (no markdown):
{
  "narrative_strength": "50-word analysis of story structure",
  "story_score": 8,
  "pacing_analysis": "50-word analysis of pacing",
  "pacing_score": 7,
  "emotional_engagement": "50-word analysis of emotional connect",
  "emotional_score": 8,
  "originality_score": 7
}`;

    try {
      const content = await this.aiCompletion(prompt, 800, 0.6);
      const result = this.parseAIResponse(content);
      
      // Validate and normalize scores
      return {
        narrative_strength: result.narrative_strength || 'The narrative follows a traditional structure.',
        story_score: Math.min(10, Math.max(1, result.story_score || Math.round(movieRating))),
        pacing_analysis: result.pacing_analysis || 'The pacing is consistent throughout.',
        pacing_score: Math.min(10, Math.max(1, result.pacing_score || Math.round(movieRating - 0.5))),
        emotional_engagement: result.emotional_engagement || 'The film engages the audience emotionally.',
        emotional_score: Math.min(10, Math.max(1, result.emotional_score || Math.round(movieRating))),
        originality_score: Math.min(10, Math.max(1, result.originality_score || 6)),
      };
    } catch (error) {
      console.error('Error generating story/screenplay:', error);
      const baseScore = Math.round(movieRating);
      return {
        narrative_strength: 'The narrative follows a traditional structure.',
        story_score: baseScore,
        pacing_analysis: 'The pacing is consistent throughout.',
        pacing_score: baseScore,
        emotional_engagement: 'The film engages the audience emotionally.',
        emotional_score: baseScore,
        originality_score: 6.0,
      };
    }
  }

  /**
   * Generate Performances section (200-250 words) with validated scores
   */
  private async generatePerformances(sources: ReviewDataSources): Promise<EditorialReview['performances']> {
    const perfScores = sources.performance_scores;
    const movieRating = sources.movie.avg_rating || 7;
    const isHit = sources.movie.is_blockbuster || movieRating >= 7;
    
    // Minimum scores based on movie success
    const minActorScore = isHit ? 7 : 5;
    const minActressScore = isHit ? 6 : 4;
    
    const prompt = `Analyze performances in ${sources.movie.title_en} (${sources.movie.release_year}).

MOVIE RATING: ${movieRating}/10
IS HIT/BLOCKBUSTER: ${isHit ? 'Yes' : 'No'}
HERO: ${sources.movie.hero || 'Unknown'}
HEROINE: ${sources.movie.heroine || 'Unknown'}
GENRES: ${sources.movie.genres?.join(', ') || 'Drama'}
${perfScores ? `EXISTING PERFORMANCE DATA: ${JSON.stringify(perfScores)}` : ''}

Analyze lead performances with scores that reflect the movie's success:
- For a ${isHit ? 'hit/blockbuster' : 'regular'} movie with ${movieRating}/10 rating
- Hero score should be between ${minActorScore}-10
- Heroine score should be between ${minActressScore}-10

Write 200-250 words analyzing each actor's:
1. Performance quality and screen presence
2. Character depth and emotional range
3. Career significance of this role

Return ONLY valid JSON (no markdown):
{
  "lead_actors": [
    {
      "name": "${sources.movie.hero || 'Unknown'}",
      "analysis": "80-word performance analysis",
      "career_significance": "Career-best/Iconic/Breakout etc.",
      "score": 8
    },
    {
      "name": "${sources.movie.heroine || 'Unknown'}",
      "analysis": "80-word performance analysis",
      "career_significance": "Strong presence/Breakout role etc.",
      "score": 7
    }
  ],
  "supporting_cast": "50-word supporting cast analysis",
  "ensemble_chemistry": "40-word chemistry analysis"
}`;

    try {
      const content = await this.aiCompletion(prompt, 1000, 0.6);
      const result = this.parseAIResponse(content);
      
      // Validate and apply minimum scores
      if (result.lead_actors && Array.isArray(result.lead_actors)) {
        result.lead_actors = result.lead_actors.map((actor: any, index: number) => {
          const isHeroRole = index === 0;
          const minScore = isHeroRole ? minActorScore : minActressScore;
          const maxScore = 10;
          
          // Ensure score is within bounds and proportional to movie rating
          let score = actor.score || (movieRating * 0.9);
          score = Math.max(minScore, Math.min(maxScore, score));
          
          // For hit movies, boost scores proportionally
          if (isHit && score < movieRating - 1) {
            score = Math.round((movieRating - 0.5) * 10) / 10;
          }
          
          return {
            ...actor,
            score: Math.round(score * 10) / 10, // Round to 1 decimal
          };
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error generating performances:', error);
      // Fallback with proper minimum scores
      const heroScore = Math.max(minActorScore, Math.round(movieRating * 0.95));
      const heroineScore = Math.max(minActressScore, Math.round(movieRating * 0.9));
      
      return {
        lead_actors: [
          {
            name: sources.movie.hero || 'Unknown',
            analysis: 'Delivers a compelling performance that anchors the film.',
            career_significance: isHit ? 'One of the notable roles in their career' : 'Solid performance',
            score: heroScore,
          },
          {
            name: sources.movie.heroine || 'Unknown',
            analysis: 'Brings charm and depth to the role.',
            career_significance: isHit ? 'Strong screen presence' : 'Decent performance',
            score: heroineScore,
          },
        ],
        supporting_cast: 'The supporting cast provides solid backing to the leads.',
        ensemble_chemistry: 'The cast works well together with good chemistry.',
      };
    }
  }

  /**
   * Generate Direction & Technicals section (150-200 words) with scores
   */
  private async generateDirectionTechnicals(sources: ReviewDataSources): Promise<EditorialReview['direction_technicals']> {
    const techScores = sources.technical_scores;
    const movieRating = sources.movie.avg_rating || 7;
    
    const prompt = `Analyze direction and technical aspects of ${sources.movie.title_en} (${sources.movie.release_year}).

DIRECTOR: ${sources.movie.director || 'Unknown'}
MUSIC: ${sources.movie.music_director || 'Unknown'}
CINEMATOGRAPHY: ${sources.movie.cinematographer || 'Unknown'}
MOVIE RATING: ${movieRating}/10
GENRES: ${sources.movie.genres?.join(', ') || 'Drama'}
${techScores ? `EXISTING TECHNICAL SCORES: ${JSON.stringify(techScores)}` : ''}

Analyze technical aspects with both descriptions AND scores (1-10):
1. Direction style - Is it mass-commercial, class-artistic, or balanced? Rate 1-10
2. Cinematography - Visual style, framing, color palette. Rate 1-10
3. Music & BGM - Songs quality, background score impact. Rate 1-10
4. Editing - Pacing, transitions, runtime efficiency. Rate 1-10

The scores should be realistic and proportional to the movie rating of ${movieRating}/10.

Return ONLY valid JSON (no markdown):
{
  "direction_style": "50-word analysis of direction approach",
  "direction_score": 8,
  "cinematography_highlights": "40-word analysis of visuals",
  "cinematography_score": 7,
  "music_bgm_impact": "40-word analysis of music/BGM",
  "music_score": 8,
  "editing_notes": "40-word analysis of editing",
  "editing_score": 7
}`;

    try {
      const content = await this.aiCompletion(prompt, 800, 0.6);
      const result = this.parseAIResponse(content);
      
      // Validate and normalize scores
      return {
        direction_style: result.direction_style || 'Balanced directorial approach.',
        direction_score: Math.min(10, Math.max(1, result.direction_score || Math.round(movieRating))),
        cinematography_highlights: result.cinematography_highlights || 'Visually appealing cinematography.',
        cinematography_score: Math.min(10, Math.max(1, result.cinematography_score || Math.round(movieRating - 0.5))),
        music_bgm_impact: result.music_bgm_impact || 'The music complements the narrative.',
        music_score: Math.min(10, Math.max(1, result.music_score || Math.round(movieRating))),
        editing_notes: result.editing_notes || 'Crisp editing maintains the pace.',
        editing_score: Math.min(10, Math.max(1, result.editing_score || Math.round(movieRating - 0.5))),
      };
    } catch (error) {
      console.error('Error generating direction/technicals:', error);
      // Fallback with scores based on movie rating
      const baseScore = Math.round(movieRating);
      return {
        direction_style: 'The director brings a balanced approach.',
        direction_score: baseScore,
        cinematography_highlights: 'Visually appealing cinematography.',
        cinematography_score: baseScore,
        music_bgm_impact: 'The music complements the narrative.',
        music_score: baseScore,
        editing_notes: 'Crisp editing maintains the pace.',
        editing_score: baseScore,
      };
    }
  }

  /**
   * Generate Audience vs Critics POV section (100-150 words)
   */
  private async generatePerspectives(sources: ReviewDataSources): Promise<EditorialReview['perspectives']> {
    const audienceSignals = sources.audience_signals;
    
    const prompt = `Analyze audience vs critics perspectives for ${sources.movie.title_en}.

RATING: ${sources.movie.avg_rating || 'N/A'}/10
${audienceSignals ? `AUDIENCE SIGNALS: ${JSON.stringify(audienceSignals)}` : ''}

Write 100-150 words analyzing:
1. Audience reception (mass appeal, family-friendly, etc.)
2. Critic consensus
3. Divergence points (where opinions differ)

Return ONLY valid JSON:
{
  "audience_reception": "Analysis (50 words)",
  "critic_consensus": "Analysis (50 words)",
  "divergence_points": ["Point 1", "Point 2"]
}`;

    try {
      const content = await this.aiCompletion(prompt, 600, 0.6);
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error generating perspectives:', error);
      return {
        audience_reception: 'The film resonates well with audiences.',
        critic_consensus: 'Critics appreciate the craftsmanship.',
        divergence_points: ['Pacing', 'Climax'],
      };
    }
  }

  /**
   * Generate Why You Should Watch section (80-100 words)
   */
  private async generateWhyWatch(sources: ReviewDataSources): Promise<EditorialReview['why_watch']> {
    const prompt = `List reasons to watch ${sources.movie.title_en}.

GENRES: ${sources.movie.genres?.join(', ')}
RATING: ${sources.movie.avg_rating || 'N/A'}/10

Provide 3-5 honest reasons and best audience types.

Return ONLY valid JSON:
{
  "reasons": ["Reason 1", "Reason 2", "Reason 3"],
  "best_for": ["family audience", "action fans", "etc."]
}`;

    try {
      const content = await this.aiCompletion(prompt, 400, 0.6);
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error generating why watch:', error);
      return {
        reasons: ['Engaging story', 'Strong performances'],
        best_for: ['General audience'],
      };
    }
  }

  /**
   * Generate Why You May Skip section (60-80 words)
   */
  private async generateWhySkip(sources: ReviewDataSources): Promise<EditorialReview['why_skip']> {
    const prompt = `List valid drawbacks for ${sources.movie.title_en}.

Be honest about weaknesses (pacing, predictability, etc.).

Return ONLY valid JSON:
{
  "drawbacks": ["Drawback 1", "Drawback 2"],
  "not_for": ["slow pacing lovers", "etc."]
}`;

    try {
      const content = await this.aiCompletion(prompt, 400, 0.6);
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error generating why skip:', error);
      return {
        drawbacks: ['Predictable plot'],
        not_for: ['Viewers seeking novelty'],
      };
    }
  }

  /**
   * Generate Cultural/Legacy Value section (100-150 words)
   */
  private async generateCulturalImpact(sources: ReviewDataSources): Promise<EditorialReview['cultural_impact']> {
    const isOld = sources.movie.release_year && sources.movie.release_year < 2010;
    const isBlockbuster = sources.movie.is_blockbuster;
    const isClassic = sources.movie.is_classic;
    
    const prompt = `Analyze cultural impact and legacy of ${sources.movie.title_en} (${sources.movie.release_year}).

MOVIE TYPE: ${isOld ? 'Classic film' : 'Recent film'}
IS BLOCKBUSTER: ${isBlockbuster ? 'Yes' : 'No'}
IS CLASSIC: ${isClassic ? 'Yes' : 'No'}
HERO: ${sources.movie.hero}
GENRES: ${sources.movie.genres?.join(', ')}

Write 100-150 words analyzing:
1. Cultural significance in Telugu cinema
2. Memorable elements (iconic dialogues, scenes, songs, catchphrases)
3. Influence on later films or trends
4. Legacy status (Cult Classic, Industry Hit, Fan Favorite, etc.)

Return ONLY valid JSON:
{
  "cultural_significance": "How this film impacted Telugu cinema culture (50 words)",
  "influence_on_cinema": "How it influenced later films or trends (40 words)",
  "memorable_elements": ["Iconic dialogue 1", "Famous scene", "Popular song"],
  "legacy_status": "${isBlockbuster ? 'Blockbuster' : isClassic ? 'Classic' : 'Notable Film'}",
  "cult_status": ${isOld || isBlockbuster}
}`;

    try {
      const content = await this.aiCompletion(prompt, 600, 0.6);
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error generating cultural impact:', error);
      return {
        cultural_significance: `${sources.movie.title_en} has made its mark in Telugu cinema with memorable performances.`,
        influence_on_cinema: 'The film has influenced subsequent films in the genre.',
        memorable_elements: [],
        legacy_status: isBlockbuster ? 'Blockbuster' : 'Notable Film',
        cult_status: false,
      };
    }
  }

  /**
   * Generate Awards section (if movie has notable achievements)
   */
  private async generateAwards(sources: ReviewDataSources): Promise<EditorialReview['awards']> {
    const isBlockbuster = sources.movie.is_blockbuster;
    const isClassic = sources.movie.is_classic;
    
    // Only generate awards for blockbusters or classics
    if (!isBlockbuster && !isClassic && sources.movie.release_year > 2020) {
      return undefined;
    }

    const prompt = `List known awards and achievements for ${sources.movie.title_en} (${sources.movie.release_year}).

HERO: ${sources.movie.hero}
DIRECTOR: ${sources.movie.director}
MUSIC: ${sources.movie.music_director}
IS BLOCKBUSTER: ${isBlockbuster ? 'Yes' : 'No'}

Return ONLY valid JSON. If no known awards, return empty arrays:
{
  "national_awards": [],
  "filmfare_awards": ["Best Actor - ${sources.movie.hero}"],
  "nandi_awards": [],
  "other_awards": [],
  "box_office_records": ["Highest grosser of the year"]
}`;

    try {
      const content = await this.aiCompletion(prompt, 400, 0.5);
      const parsed = this.parseAIResponse(content);
      
      // Only return if there are actual awards
      const hasAwards = ((parsed.national_awards?.length || 0) > 0) ||
                       ((parsed.filmfare_awards?.length || 0) > 0) ||
                       ((parsed.nandi_awards?.length || 0) > 0) ||
                       ((parsed.other_awards?.length || 0) > 0) ||
                       ((parsed.box_office_records?.length || 0) > 0);
      
      return hasAwards ? parsed : undefined;
    } catch (error) {
      console.error('Error generating awards:', error);
      return undefined;
    }
  }

  /**
   * Generate Final Verdict section (50-80 words) with proper rating calculation
   */
  private async generateVerdict(
    sources: ReviewDataSources,
    culturalImpact: EditorialReview['cultural_impact'],
    generatedScores?: {
      storyScore?: number;
      directionScore?: number;
      performanceScores?: number[];
    }
  ): Promise<EditorialReview['verdict']> {
    // Calculate proper rating from multiple sources (NOT just avg_rating which can be inflated)
    const rating = this.calculateFinalRating(sources, generatedScores);
    
    // Determine category based on calculated rating and movie attributes
    let category: EditorialReview['verdict']['category'] = 'one-time-watch';
    const isBlockbuster = sources.movie.is_blockbuster;
    const isClassic = sources.movie.is_classic;
    const isUnderrated = sources.movie.is_underrated;
    
    if (rating >= 8.5 && (isBlockbuster || isClassic)) category = 'must-watch';
    else if (rating >= 8.0) category = culturalImpact.cult_status ? 'cult' : 'blockbuster';
    else if (rating >= 7.0) category = isUnderrated ? 'hidden-gem' : 'recommended';
    else if (rating >= 6.0) category = 'one-time-watch';
    else if (rating >= 5.0) category = 'average';
    else category = 'skippable';

    const prompt = `Write a final verdict for ${sources.movie.title_en} (${sources.movie.release_year}).

CALCULATED RATING: ${rating.toFixed(1)}/10
CATEGORY: ${category}
IS BLOCKBUSTER: ${isBlockbuster ? 'Yes' : 'No'}
IS CLASSIC: ${isClassic ? 'Yes' : 'No'}

Write 50-80 words in both Telugu and English summarizing the film's overall quality.
Be honest and balanced. Match the tone to the rating (don't oversell a 6/10 movie).

Return ONLY valid JSON:
{
  "category": "${category}",
  "final_rating": ${rating.toFixed(1)},
  "en": "English verdict (50-80 words)",
  "te": "Telugu verdict (50-80 words)",
  "confidence_score": 0.85
}`;

    try {
      const content = await this.aiCompletion(prompt, 400, 0.6);
      const parsed = this.parseAIResponse(content);
      // Ensure category and rating match our logic
      parsed.category = category;
      parsed.final_rating = Math.round(rating * 10) / 10;
      return parsed;
    } catch (error) {
      console.error('Error generating verdict:', error);
      return {
        category,
        final_rating: Math.round(rating * 10) / 10,
        te: `${sources.movie.title_te || sources.movie.title_en} ఒక ${rating >= 7 ? 'బాగుండే' : 'సగటు'} చిత్రం.`,
        en: `${sources.movie.title_en} is a ${category.replace('-', ' ')} film that scores ${rating.toFixed(1)}/10.`,
        confidence_score: 0.7,
      };
    }
  }

  /**
   * Calculate proper final rating from multiple sources
   */
  private calculateFinalRating(
    sources: ReviewDataSources,
    generatedScores?: {
      storyScore?: number;
      directionScore?: number;
      performanceScores?: number[];
    }
  ): number {
    const scores: number[] = [];
    const weights: number[] = [];
    
    // 1. Existing review's overall_rating (weight: 30%) - most reliable if exists
    // Fetched from movie_reviews table, not the inflated movies.avg_rating
    if (sources.review_rating && sources.review_rating > 0 && sources.review_rating <= 10) {
      scores.push(sources.review_rating);
      weights.push(0.30);
    }
    
    // 2. Generated story score (weight: 20%)
    if (generatedScores?.storyScore && generatedScores.storyScore > 0) {
      scores.push(generatedScores.storyScore);
      weights.push(0.20);
    }
    
    // 3. Generated direction score (weight: 20%)
    if (generatedScores?.directionScore && generatedScores.directionScore > 0) {
      scores.push(generatedScores.directionScore);
      weights.push(0.20);
    }
    
    // 4. Average of performance scores (weight: 15%)
    if (generatedScores?.performanceScores && generatedScores.performanceScores.length > 0) {
      const avgPerf = generatedScores.performanceScores.reduce((a, b) => a + b, 0) / generatedScores.performanceScores.length;
      scores.push(avgPerf);
      weights.push(0.15);
    }
    
    // 5. TMDB/avg_rating as fallback (weight: 15%) - but cap it at 8.5 to prevent inflation
    const tmdbRating = Math.min(sources.movie.avg_rating || 5.0, 8.5);
    if (scores.length < 3) {
      scores.push(tmdbRating);
      weights.push(0.15);
    }
    
    // If we have no scores at all, use a conservative default
    if (scores.length === 0) {
      return 6.0;
    }
    
    // Normalize weights
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Calculate weighted average
    let finalRating = 0;
    for (let i = 0; i < scores.length; i++) {
      finalRating += scores[i] * normalizedWeights[i];
    }
    
    // Clamp between 1 and 10
    finalRating = Math.max(1, Math.min(10, finalRating));
    
    // Round to 1 decimal
    return Math.round(finalRating * 10) / 10;
  }

  /**
   * Calculate quality score for the generated review
   */
  private calculateQualityScore(review: EditorialReview): number {
    let score = 0;
    let maxScore = 0;

    // Synopsis (15 points)
    maxScore += 15;
    const synopsisText = review.synopsis?.en || '';
    const synopsisLength = synopsisText.split(' ').length;
    if (synopsisLength >= 200 && synopsisLength <= 250) score += 15;
    else if (synopsisLength >= 150) score += 10;
    else score += 5;

    // Story/Screenplay (10 points)
    maxScore += 10;
    const originalityScore = review.story_screenplay?.originality_score || 0;
    if (originalityScore >= 7) score += 10;
    else if (originalityScore >= 5) score += 7;
    else score += 4;

    // Performances (15 points)
    maxScore += 15;
    const leadActors = review.performances?.lead_actors || [];
    if (leadActors.length >= 2) score += 15;
    else if (leadActors.length === 1) score += 10;
    else score += 5;

    // Direction/Technicals (10 points)
    maxScore += 10;
    score += 10; // Always award if present

    // Perspectives (10 points)
    maxScore += 10;
    const divergencePoints = review.perspectives?.divergence_points || [];
    if (divergencePoints.length >= 2) score += 10;
    else score += 7;

    // Why Watch/Skip (10 points each = 20)
    maxScore += 20;
    const watchReasons = review.why_watch?.reasons || [];
    const skipDrawbacks = review.why_skip?.drawbacks || [];
    if (watchReasons.length >= 3) score += 10;
    else score += 5;
    if (skipDrawbacks.length >= 2) score += 10;
    else score += 5;

    // Cultural Impact (10 points)
    maxScore += 10;
    const iconicElements = review.cultural_impact?.iconic_elements || [];
    if (iconicElements.length >= 2) score += 10;
    else if (iconicElements.length === 1) score += 7;
    else score += 5;

    // Verdict (10 points)
    maxScore += 10;
    const confidenceScore = review.verdict?.confidence_score || 0;
    if (confidenceScore >= 0.8) score += 10;
    else if (confidenceScore >= 0.6) score += 7;
    else score += 5;

    return score / maxScore;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export async function generateEditorialReview(movieId: string): Promise<EditorialReview> {
  const generator = new EditorialReviewGenerator();
  return await generator.generateReview(movieId);
}
