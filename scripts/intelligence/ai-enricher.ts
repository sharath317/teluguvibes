/**
 * AI ENRICHMENT LAYER
 *
 * Uses Groq/Gemini to enrich and normalize raw entities.
 *
 * Responsibilities:
 * - Generate missing biographies in Telugu
 * - Normalize Telugu naming conventions
 * - Classify era and popularity tier
 * - Extract insights from interview transcripts
 * - Ensure structured JSON output
 */

import Groq from 'groq-sdk';
import type {
  RawEntity,
  EnrichedEntity,
  EnrichedCelebrityData,
  EnrichedMovieData,
  EnrichedReviewData,
  RawCelebrityData,
  RawMovieData,
  RawInterviewData,
} from './types';

interface EnricherOptions {
  forceEnrich: boolean;
  verbose: boolean;
}

export class AIEnricher {
  private groq: Groq;
  private options: EnricherOptions;
  private cache: Map<string, EnrichedEntity> = new Map();

  constructor(options: EnricherOptions) {
    this.options = options;
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Enrich a raw entity with AI
   */
  async enrich(entity: RawEntity): Promise<EnrichedEntity | null> {
    // Check cache first
    const cacheKey = `${entity.source}_${entity.source_id}`;
    if (!this.options.forceEnrich && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      let enriched: EnrichedEntity;

      switch (entity.entity_type) {
        case 'celebrity':
          enriched = await this.enrichCelebrity(entity);
          break;
        case 'movie':
          enriched = await this.enrichMovie(entity);
          break;
        case 'interview':
          enriched = await this.enrichInterview(entity);
          break;
        default:
          return null;
      }

      // Cache result
      this.cache.set(cacheKey, enriched);
      return enriched;
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`  ⚠ AI enrichment failed for ${entity.name_en}:`, error);
      }
      return null;
    }
  }

  /**
   * Enrich celebrity entity
   */
  private async enrichCelebrity(entity: RawEntity): Promise<EnrichedEntity> {
    const data = entity.data as RawCelebrityData;

    const prompt = `You are a Telugu cinema expert. Analyze this celebrity and provide enriched data.

INPUT DATA:
Name: ${entity.name_en}
Telugu Name: ${entity.name_te || 'Unknown'}
Gender: ${data.gender || 'Unknown'}
Birth Date: ${data.birth_date || 'Unknown'}
Death Date: ${data.death_date || 'N/A'}
Occupation: ${data.occupation?.join(', ') || 'Unknown'}
Biography: ${data.biography || 'Not available'}
Known For: ${data.known_for?.join(', ') || 'Unknown'}
Filmography: ${data.filmography?.map(f => `${f.title} (${f.year})`).slice(0, 10).join(', ') || 'Unknown'}

INSTRUCTIONS:
Generate a JSON object with these exact fields:

{
  "name_te": "Telugu name in Telugu script",
  "name_aliases": ["list of alternative names"],
  "biography_te": "2-3 sentence biography in Telugu (not transliteration, actual Telugu)",
  "biography_en": "2-3 sentence biography in English",
  "occupation": ["primary occupations"],
  "gender": "male|female|other",
  "birth_date": "YYYY-MM-DD or null",
  "death_date": "YYYY-MM-DD or null",
  "debut_year": number or null,
  "active_years": "e.g. 1980-present or 1950-1990",
  "era": "classic|golden|silver|90s|modern|current",
  "popularity_tier": "legendary|star|popular|known|emerging",
  "primary_role": "actor|actress|director|producer|singer|composer|other",
  "career_highlights": ["3-5 major achievements"],
  "notable_movies": ["top 5 movies"],
  "popularity_score": 0-100,
  "data_completeness": 0-100,
  "reasoning": "Brief explanation of classifications"
}

CLASSIFICATION RULES:
- era: classic (before 1970), golden (1970-1985), silver (1985-1999), 90s (1990-2005), modern (2005-2018), current (2018+)
- popularity_tier: legendary (NTR, ANR level), star (Chiranjeevi, Mahesh level), popular (regular leads), known (supporting), emerging (new)

Return ONLY valid JSON, no markdown.`;

    const response = await this.callAI(prompt);
    const parsed = this.parseJSON(response);

    const enrichedData: EnrichedCelebrityData = {
      type: 'celebrity',
      biography_te: parsed.biography_te || '',
      biography_en: parsed.biography_en || data.biography || '',
      occupation: parsed.occupation || data.occupation || [],
      gender: parsed.gender || data.gender || 'unknown',
      birth_date: parsed.birth_date || data.birth_date,
      death_date: parsed.death_date || data.death_date,
      debut_year: parsed.debut_year,
      active_years: parsed.active_years,
      era: parsed.era || 'modern',
      popularity_tier: parsed.popularity_tier || 'known',
      primary_role: parsed.primary_role || 'actor',
      career_highlights: parsed.career_highlights || [],
      notable_movies: parsed.notable_movies || [],
      popularity_score: parsed.popularity_score || 50,
      data_completeness: parsed.data_completeness || 50,
      image_url: data.image_url,
    };

    return {
      entity_type: 'celebrity',
      source: entity.source,
      source_id: entity.source_id,
      name_en: entity.name_en,
      name_te: parsed.name_te || entity.name_te || '',
      name_aliases: parsed.name_aliases,
      enriched: enrichedData,
      ai_confidence: parsed.data_completeness || 50,
      ai_reasoning: parsed.reasoning || '',
      ai_timestamp: new Date().toISOString(),
      existing_id: (entity as any).existing_id,
      tmdb_id: data.tmdb_id,
      wikidata_id: data.wikidata_id,
    };
  }

  /**
   * Enrich movie entity
   */
  private async enrichMovie(entity: RawEntity): Promise<EnrichedEntity> {
    const data = entity.data as RawMovieData;

    const prompt = `You are a Telugu cinema expert. Analyze this movie and provide enriched data.

INPUT DATA:
Title (English): ${data.title_en}
Title (Telugu): ${data.title_te || 'Unknown'}
Release Date: ${data.release_date || 'Unknown'}
Runtime: ${data.runtime ? `${data.runtime} minutes` : 'Unknown'}
Genres: ${data.genres?.join(', ') || 'Unknown'}
Overview: ${data.overview || 'Not available'}
Cast: ${data.cast?.map(c => `${c.name} as ${c.character}`).slice(0, 5).join(', ') || 'Unknown'}
Crew: ${data.crew?.map(c => `${c.name} (${c.job})`).join(', ') || 'Unknown'}
Budget: ${data.budget ? `₹${data.budget}` : 'Unknown'}
Revenue: ${data.revenue ? `₹${data.revenue}` : 'Unknown'}
Rating: ${data.vote_average || 'Unknown'}

INSTRUCTIONS:
Generate a JSON object with these exact fields:

{
  "title_te": "Telugu title in Telugu script",
  "synopsis_te": "2-3 sentence synopsis in Telugu (actual Telugu, not transliteration)",
  "synopsis_en": "2-3 sentence synopsis in English",
  "genres": ["genre list"],
  "era": "classic|golden|silver|90s|modern|current",
  "movie_type": "commercial|arthouse|experimental|devotional|mythological",
  "verdict": "blockbuster|superhit|hit|average|flop|disaster|unknown",
  "director": "Director name",
  "hero": "Lead actor name",
  "heroine": "Lead actress name",
  "music_director": "Music director name",
  "popularity_score": 0-100,
  "rating": 0-10,
  "data_completeness": 0-100,
  "reasoning": "Brief explanation of verdict classification"
}

VERDICT RULES (if box office data available):
- blockbuster: 300%+ recovery
- superhit: 200-300% recovery
- hit: 100-200% recovery
- average: 75-100% recovery
- flop: 50-75% recovery
- disaster: <50% recovery
- unknown: if no data

Return ONLY valid JSON, no markdown.`;

    const response = await this.callAI(prompt);
    const parsed = this.parseJSON(response);

    const releaseYear = data.release_date ? new Date(data.release_date).getFullYear() : null;

    const enrichedData: EnrichedMovieData = {
      type: 'movie',
      title_en: data.title_en,
      title_te: parsed.title_te || data.title_te || '',
      release_date: data.release_date || '',
      release_year: releaseYear || 0,
      runtime: data.runtime,
      genres: parsed.genres || data.genres || [],
      synopsis_te: parsed.synopsis_te || '',
      synopsis_en: parsed.synopsis_en || data.overview || '',
      era: parsed.era || this.inferEra(releaseYear),
      movie_type: parsed.movie_type || 'commercial',
      budget: data.budget,
      revenue: data.revenue,
      verdict: parsed.verdict,
      director: parsed.director || this.extractCrew(data.crew, 'Director'),
      hero: parsed.hero || this.extractCast(data.cast, 0),
      heroine: parsed.heroine || this.extractCast(data.cast, 1),
      music_director: parsed.music_director || this.extractCrew(data.crew, 'Music Director'),
      poster_url: data.poster_url,
      backdrop_url: data.backdrop_url,
      popularity_score: parsed.popularity_score || data.popularity || 50,
      rating: parsed.rating || data.vote_average,
      data_completeness: parsed.data_completeness || 50,
    };

    return {
      entity_type: 'movie',
      source: entity.source,
      source_id: entity.source_id,
      name_en: data.title_en,
      name_te: parsed.title_te || data.title_te || '',
      enriched: enrichedData,
      ai_confidence: parsed.data_completeness || 50,
      ai_reasoning: parsed.reasoning || '',
      ai_timestamp: new Date().toISOString(),
      existing_id: (entity as any).existing_id,
      tmdb_id: data.tmdb_id,
      wikidata_id: data.wikidata_id,
    };
  }

  /**
   * Enrich interview/news entity
   */
  private async enrichInterview(entity: RawEntity): Promise<EnrichedEntity> {
    const data = entity.data as RawInterviewData;

    // Only process if we have transcript content
    if (!data.transcript && !data.captions) {
      // Return minimal enrichment
      return {
        entity_type: 'interview',
        source: entity.source,
        source_id: entity.source_id,
        name_en: data.celebrity_name,
        name_te: '',
        enriched: {
          type: 'review',
          movie_id: '',
          movie_title: data.title,
          review_te: '',
          review_en: data.transcript || '',
          direction_score: 0,
          screenplay_score: 0,
          acting_score: 0,
          music_score: 0,
          visuals_score: 0,
          overall_score: 0,
          strengths: [],
          weaknesses: [],
          verdict_te: '',
          is_ai_generated: true,
          confidence: 30,
        },
        ai_confidence: 30,
        ai_reasoning: 'No transcript available',
        ai_timestamp: new Date().toISOString(),
      };
    }

    const prompt = `You are analyzing a Telugu celebrity interview. Extract key insights.

CELEBRITY: ${data.celebrity_name}
SOURCE: ${data.source_type}
TITLE: ${data.title}

TRANSCRIPT/CONTENT:
${(data.transcript || data.captions || '').slice(0, 4000)}

INSTRUCTIONS:
Extract and return as JSON:

{
  "celebrity_name_te": "Name in Telugu script",
  "key_insights": [
    {
      "type": "opinion|controversy|trivia|revelation|quote",
      "content_te": "Insight in Telugu",
      "content_en": "Insight in English",
      "topic": "What it's about",
      "importance": 1-100
    }
  ],
  "notable_quotes": [
    {
      "quote": "The quote",
      "context": "Context"
    }
  ],
  "topics_discussed": ["topic1", "topic2"],
  "sentiment": "positive|negative|neutral|mixed",
  "summary_te": "2-3 sentence Telugu summary",
  "summary_en": "2-3 sentence English summary"
}

Focus on:
- Controversial or surprising statements
- Career revelations
- Opinions about other celebrities/movies
- Rare trivia

Return ONLY valid JSON, no markdown.`;

    const response = await this.callAI(prompt);
    const parsed = this.parseJSON(response);

    return {
      entity_type: 'interview',
      source: entity.source,
      source_id: entity.source_id,
      name_en: data.celebrity_name,
      name_te: parsed.celebrity_name_te || '',
      enriched: {
        type: 'review',
        movie_id: '',
        movie_title: data.title,
        review_te: parsed.summary_te || '',
        review_en: parsed.summary_en || '',
        direction_score: 0,
        screenplay_score: 0,
        acting_score: 0,
        music_score: 0,
        visuals_score: 0,
        overall_score: 0,
        strengths: [],
        weaknesses: [],
        verdict_te: '',
        is_ai_generated: true,
        confidence: 70,
      },
      ai_confidence: 70,
      ai_reasoning: `Extracted ${parsed.key_insights?.length || 0} insights`,
      ai_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Call AI API
   */
  private async callAI(prompt: string): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || '{}';
  }

  /**
   * Parse JSON from AI response
   */
  private parseJSON(response: string): any {
    try {
      // Clean potential markdown wrapping
      let clean = response.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      return JSON.parse(clean);
    } catch {
      return {};
    }
  }

  /**
   * Infer era from release year
   */
  private inferEra(year: number | null): 'classic' | 'golden' | 'silver' | '90s' | 'modern' | 'current' {
    if (!year) return 'modern';
    if (year < 1970) return 'classic';
    if (year < 1985) return 'golden';
    if (year < 1995) return 'silver';
    if (year < 2005) return '90s';
    if (year < 2018) return 'modern';
    return 'current';
  }

  /**
   * Extract crew member by job
   */
  private extractCrew(crew: any[] | undefined, job: string): string | undefined {
    return crew?.find(c => c.job === job)?.name;
  }

  /**
   * Extract cast member by order
   */
  private extractCast(cast: any[] | undefined, order: number): string | undefined {
    return cast?.[order]?.name;
  }
}
