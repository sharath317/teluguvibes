/**
 * REVIEW INSIGHTS ENRICHMENT MODULE
 * 
 * Extends existing reviews with deeper film-criticism analysis.
 * Does NOT replace review_core - adds review_insights as a secondary layer.
 * 
 * Features:
 * - Performance analysis (cast-based)
 * - Direction & craft assessment
 * - Technical aspects (selective)
 * - Theme & impact analysis
 * - Confidence-based section gating
 * - Review density validation
 */

import { createClient } from '@supabase/supabase-js';
import { Movie } from './coverage-engine';

// ============================================================
// TYPES
// ============================================================

export interface PerformanceTone {
  type: 'restrained' | 'intense' | 'raw' | 'charismatic' | 'nuanced' | 'commercial';
  description_en: string;
  description_te: string;
}

export interface PerformanceInsight {
  actor: string;
  character?: string;
  role_type: 'lead' | 'supporting' | 'cameo';
  tone: PerformanceTone;
  arc_effectiveness: number;  // 0-1
  note_en: string;
  note_te: string;
  confidence: number;
}

export interface DirectionInsight {
  style: 'grounded' | 'commercial' | 'experimental' | 'classical' | 'hybrid';
  pacing_control: 'tight' | 'measured' | 'uneven' | 'rushed';
  emotional_payoff: 'strong' | 'moderate' | 'weak';
  note_en: string;
  note_te: string;
  confidence: number;
}

export interface TechnicalInsight {
  aspect: 'music' | 'cinematography' | 'editing';
  notable: boolean;
  mood?: string;
  impact_en: string;
  impact_te: string;
  confidence: number;
}

export interface ThemeInsight {
  core_themes: string[];
  cultural_relevance: 'high' | 'moderate' | 'low';
  emotional_resonance: 'deep' | 'surface' | 'minimal';
  note_en: string;
  note_te: string;
  confidence: number;
}

// Phase 2: Standout scene descriptor
export interface StandoutScene {
  scene_type: 'action' | 'emotional' | 'comedy' | 'climax' | 'interval' | 'opening';
  description_en: string;
  description_te: string;
  spoiler_free: boolean;
  confidence: number;
}

// Phase 2: Audience fit recommendation
export interface AudienceFit {
  primary_audience: 'family' | 'youth' | 'mass' | 'class' | 'women' | 'kids' | 'all';
  best_for: string;
  skip_if: string | null;
  ideal_watch_setting: 'theater' | 'home' | 'any';
  confidence: number;
}

// Phase 2: Comparable movie reference
export interface ComparableMovie {
  movie_id?: string;
  movie_title: string;
  similarity_reason: string;
  similarity_score: number;  // 0-1
  validated: boolean;        // true = exists in our DB
}

export interface ReviewInsights {
  movie_id: string;
  movie_title: string;
  
  // Enrichment sections (all optional based on confidence)
  performances?: PerformanceInsight[];
  direction?: DirectionInsight;
  technical?: TechnicalInsight[];
  themes?: ThemeInsight;
  
  // Phase 2: Additional structured sections
  standout_scenes?: StandoutScene[];
  audience_fit?: AudienceFit;
  comparable_movies?: ComparableMovie[];
  
  // Confidence scores per section
  section_confidence: {
    performances: number;
    direction: number;
    technical: number;
    themes: number;
    scenes: number;
    audience: number;
    comparables: number;
  };
  
  // Validation
  density_score: number;        // 0-100, penalizes repetition/generic
  length_increase_percent: number;  // Must be ≤30%
  
  // Metadata
  generated_at: string;
  enrichment_source: 'metadata' | 'ai_assisted';
  needs_review: boolean;
}

export interface MovieContext {
  id: string;
  title_en: string;
  title_te?: string;
  director?: string;
  hero?: string;
  heroine?: string;
  cast_members?: Array<{ name: string; character?: string; role?: string }>;
  genres?: string[];
  release_year?: number;
  keywords?: string[];
  tmdb_rating?: number;
  runtime_minutes?: number;
  awards?: string[];
  production_context?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const CONFIDENCE_THRESHOLDS = {
  INCLUDE: 0.80,        // ≥80% → include section
  SOFT_INSIGHT: 0.60,   // 60-79% → include with soft marker
  EXCLUDE: 0.60         // <60% → do not include
} as const;

const MAX_LENGTH_INCREASE = 0.30;  // 30% max

const PERFORMANCE_TONES: Record<string, PerformanceTone> = {
  restrained: {
    type: 'restrained',
    description_en: 'delivers a restrained, understated performance',
    description_te: 'సంయమనంతో కూడిన నటన అందించారు'
  },
  intense: {
    type: 'intense',
    description_en: 'brings intense energy to the screen',
    description_te: 'తీవ్రమైన శక్తిని తెరకు తీసుకొచ్చారు'
  },
  raw: {
    type: 'raw',
    description_en: 'offers a raw, emotionally honest portrayal',
    description_te: 'నిజాయితీగా, ముడి భావాలతో నటించారు'
  },
  charismatic: {
    type: 'charismatic',
    description_en: 'showcases signature charisma',
    description_te: 'తమ ప్రత్యేక ఆకర్షణను ప్రదర్శించారు'
  },
  nuanced: {
    type: 'nuanced',
    description_en: 'delivers a layered, nuanced performance',
    description_te: 'సూక్ష్మమైన, బహుళ పొరల నటన అందించారు'
  },
  commercial: {
    type: 'commercial',
    description_en: 'delivers crowd-pleasing entertainment',
    description_te: 'ప్రేక్షకులను అలరించే వినోదం అందించారు'
  }
};

const DIRECTION_STYLES = {
  grounded: 'realistic, character-driven storytelling',
  commercial: 'mainstream entertainment with mass appeal',
  experimental: 'unconventional narrative approach',
  classical: 'traditional narrative structure',
  hybrid: 'blend of commercial and artistic sensibilities'
};

const GENERIC_WORDS = [
  'amazing', 'awesome', 'incredible', 'fantastic', 'brilliant',
  'superb', 'outstanding', 'excellent', 'wonderful', 'great',
  'perfect', 'best ever', 'must watch', 'blockbuster'
];

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// CONTEXT ENRICHMENT (Multi-source metadata fetch)
// ============================================================

/**
 * Fetch enriched movie context from multiple sources
 * NO copyrighted text - only metadata signals
 */
export async function fetchMovieContext(movieId: string): Promise<MovieContext | null> {
  const supabase = getSupabaseClient();
  
  const { data: movie, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, title_te, director, hero, heroine,
      cast_members, genres, release_year, tags,
      avg_rating, runtime_minutes, tmdb_id
    `)
    .eq('id', movieId)
    .single();
  
  if (error || !movie) return null;
  
  // Parse cast_members if it's a string
  let castMembers = movie.cast_members;
  if (typeof castMembers === 'string') {
    try {
      castMembers = JSON.parse(castMembers);
    } catch {
      castMembers = castMembers.split(',').map((name: string) => ({ name: name.trim() }));
    }
  }
  
  return {
    id: movie.id,
    title_en: movie.title_en,
    title_te: movie.title_te,
    director: movie.director,
    hero: movie.hero,
    heroine: movie.heroine,
    cast_members: castMembers || [],
    genres: movie.genres || [],
    release_year: movie.release_year,
    keywords: movie.tags || [],  // Use tags as keywords
    tmdb_rating: movie.avg_rating,  // Use avg_rating as tmdb_rating
    runtime_minutes: movie.runtime_minutes
  };
}

// ============================================================
// CONFIDENCE CALCULATORS
// ============================================================

/**
 * Calculate performance analysis confidence
 */
function calculatePerformanceConfidence(context: MovieContext): number {
  let confidence = 0;
  
  // Has cast data
  if (context.cast_members && context.cast_members.length > 0) {
    confidence += 0.3;
    // Has character names
    if (context.cast_members.some(c => c.character)) {
      confidence += 0.2;
    }
    // Has multiple cast members
    if (context.cast_members.length >= 3) {
      confidence += 0.15;
    }
  }
  
  // Has lead actor info (higher weight if no cast_members)
  const hasNoCastMembers = !context.cast_members || context.cast_members.length === 0;
  if (context.hero) confidence += hasNoCastMembers ? 0.35 : 0.15;
  if (context.heroine) confidence += hasNoCastMembers ? 0.25 : 0.1;
  
  // Has genre (helps infer performance style)
  if (context.genres && context.genres.length > 0) {
    confidence += 0.1;
  }
  
  return Math.min(1, confidence);
}

/**
 * Calculate direction analysis confidence
 */
function calculateDirectionConfidence(context: MovieContext): number {
  let confidence = 0;
  
  // Has director info
  if (context.director) confidence += 0.4;
  
  // Has runtime (helps assess pacing)
  if (context.runtime_minutes) confidence += 0.15;
  
  // Has genres (helps infer style)
  if (context.genres && context.genres.length > 0) {
    confidence += 0.2;
  }
  
  // Has keywords (helps infer themes)
  if (context.keywords && context.keywords.length > 0) {
    confidence += 0.15;
  }
  
  // Has rating (helps assess quality)
  if (context.tmdb_rating) confidence += 0.1;
  
  return Math.min(1, confidence);
}

/**
 * Calculate technical analysis confidence
 */
function calculateTechnicalConfidence(context: MovieContext): number {
  let confidence = 0;
  
  // Has genres that typically have notable technical aspects
  const technicalGenres = ['Action', 'Thriller', 'Horror', 'Science Fiction', 'Fantasy'];
  if (context.genres?.some(g => technicalGenres.includes(g))) {
    confidence += 0.3;
  }
  
  // Has rating (suggests notable quality)
  if (context.tmdb_rating && context.tmdb_rating >= 7) {
    confidence += 0.3;
  }
  
  // Has runtime (longer films often have notable scores)
  if (context.runtime_minutes && context.runtime_minutes >= 140) {
    confidence += 0.2;
  }
  
  // Base confidence for any movie
  confidence += 0.2;
  
  return Math.min(1, confidence);
}

/**
 * Calculate theme analysis confidence
 */
function calculateThemeConfidence(context: MovieContext): number {
  let confidence = 0;
  
  // Has keywords (direct theme indicators)
  if (context.keywords && context.keywords.length >= 3) {
    confidence += 0.4;
  } else if (context.keywords && context.keywords.length > 0) {
    confidence += 0.2;
  }
  
  // Has genres (helps infer themes)
  if (context.genres && context.genres.length > 0) {
    confidence += 0.3;
  }
  
  // Has release year (helps cultural context)
  if (context.release_year) confidence += 0.1;
  
  // Has rating (critically acclaimed often have deeper themes)
  if (context.tmdb_rating && context.tmdb_rating >= 7.5) {
    confidence += 0.2;
  }
  
  return Math.min(1, confidence);
}

// ============================================================
// INSIGHT GENERATORS
// ============================================================

/**
 * Generate performance insights for cast members
 */
function generatePerformanceInsights(context: MovieContext): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];
  const genres = context.genres || [];
  
  // Infer performance tone from genre
  function inferTone(isLead: boolean): PerformanceTone {
    if (genres.includes('Action') && isLead) {
      return PERFORMANCE_TONES.intense;
    }
    if (genres.includes('Drama')) {
      return PERFORMANCE_TONES.nuanced;
    }
    if (genres.includes('Comedy')) {
      return PERFORMANCE_TONES.charismatic;
    }
    if (genres.includes('Romance')) {
      return PERFORMANCE_TONES.restrained;
    }
    return PERFORMANCE_TONES.commercial;
  }
  
  // Lead actor
  if (context.hero) {
    const tone = inferTone(true);
    insights.push({
      actor: context.hero,
      role_type: 'lead',
      tone,
      arc_effectiveness: context.tmdb_rating ? (context.tmdb_rating / 10) : 0.7,
      note_en: `${context.hero} ${tone.description_en}, anchoring the narrative effectively.`,
      note_te: `${context.hero} ${tone.description_te}.`,
      confidence: 0.85
    });
  }
  
  // Lead actress
  if (context.heroine) {
    const tone = genres.includes('Romance') ? PERFORMANCE_TONES.nuanced : PERFORMANCE_TONES.charismatic;
    insights.push({
      actor: context.heroine,
      role_type: 'lead',
      tone,
      arc_effectiveness: 0.75,
      note_en: `${context.heroine} complements the lead with a ${tone.type} portrayal.`,
      note_te: `${context.heroine} ${tone.description_te}.`,
      confidence: 0.80
    });
  }
  
  // Supporting cast (if available)
  if (context.cast_members && context.cast_members.length > 0) {
    const supportingCast = context.cast_members
      .filter(c => c.name !== context.hero && c.name !== context.heroine)
      .slice(0, 2);
    
    if (supportingCast.length > 0) {
      const supportNote = supportingCast.length > 1
        ? `The supporting cast, including ${supportingCast.map(c => c.name).join(' and ')}, adds depth to the ensemble.`
        : `${supportingCast[0].name} contributes meaningfully in a supporting role.`;
      
      insights.push({
        actor: supportingCast.map(c => c.name).join(', '),
        role_type: 'supporting',
        tone: PERFORMANCE_TONES.nuanced,
        arc_effectiveness: 0.7,
        note_en: supportNote,
        note_te: 'సహాయ నటీనటులు కథకు బలం చేకూర్చారు.',
        confidence: 0.70
      });
    }
  }
  
  return insights;
}

/**
 * Generate direction insight
 */
function generateDirectionInsight(context: MovieContext): DirectionInsight {
  const genres = context.genres || [];
  
  // Infer direction style from genres
  let style: DirectionInsight['style'] = 'commercial';
  if (genres.includes('Drama') && !genres.includes('Action')) {
    style = 'grounded';
  } else if (genres.includes('Thriller') || genres.includes('Horror')) {
    style = 'experimental';
  } else if (genres.includes('Action') && genres.includes('Drama')) {
    style = 'hybrid';
  }
  
  // Infer pacing from runtime
  let pacing: DirectionInsight['pacing_control'] = 'measured';
  if (context.runtime_minutes) {
    if (context.runtime_minutes <= 120) pacing = 'tight';
    else if (context.runtime_minutes >= 160) pacing = 'uneven';
  }
  
  // Infer emotional payoff from rating
  let payoff: DirectionInsight['emotional_payoff'] = 'moderate';
  if (context.tmdb_rating) {
    if (context.tmdb_rating >= 7.5) payoff = 'strong';
    else if (context.tmdb_rating < 6) payoff = 'weak';
  }
  
  const directorName = context.director || 'The director';
  const styleDesc = DIRECTION_STYLES[style];
  
  return {
    style,
    pacing_control: pacing,
    emotional_payoff: payoff,
    note_en: `${directorName} opts for ${styleDesc}, maintaining ${pacing} control over the narrative. The emotional payoff is ${payoff}.`,
    note_te: `${directorName} ${style === 'commercial' ? 'వాణిజ్య విధానంలో' : 'వినూత్న విధానంలో'} కథను నడిపించారు.`,
    confidence: context.director ? 0.85 : 0.60
  };
}

/**
 * Generate technical insights (selective)
 */
function generateTechnicalInsights(context: MovieContext): TechnicalInsight[] {
  const insights: TechnicalInsight[] = [];
  const genres = context.genres || [];
  const rating = context.tmdb_rating || 0;
  
  // Music insight (only if notable indicators)
  if (rating >= 7 || genres.includes('Musical') || genres.includes('Romance')) {
    insights.push({
      aspect: 'music',
      notable: rating >= 7.5,
      mood: genres.includes('Action') ? 'pulsating' : 'melodic',
      impact_en: rating >= 7.5 
        ? 'The music score elevates key sequences, leaving a lasting impression.'
        : 'The music complements the narrative without overpowering it.',
      impact_te: rating >= 7.5
        ? 'సంగీతం కీలక సన్నివేశాలను ఉన్నతీకరిస్తుంది.'
        : 'సంగీతం కథకు తగినట్లుగా ఉంది.',
      confidence: genres.includes('Musical') ? 0.90 : 0.70
    });
  }
  
  // Cinematography (for visually-driven genres)
  if (genres.includes('Action') || genres.includes('Thriller') || rating >= 7.5) {
    insights.push({
      aspect: 'cinematography',
      notable: rating >= 7.5,
      mood: genres.includes('Action') ? 'dynamic' : 'atmospheric',
      impact_en: `The cinematography captures ${genres.includes('Action') ? 'the action with kinetic energy' : 'the mood effectively'}.`,
      impact_te: 'ఛాయాగ్రహణం దృశ్యాలను ప్రభావవంతంగా చిత్రీకరించింది.',
      confidence: 0.75
    });
  }
  
  return insights;
}

/**
 * Generate theme insights
 */
function generateThemeInsight(context: MovieContext): ThemeInsight {
  const genres = context.genres || [];
  const keywords = context.keywords || [];
  
  // Core themes from genres and keywords
  const themeMap: Record<string, string[]> = {
    'Action': ['heroism', 'justice', 'power'],
    'Drama': ['family', 'relationships', 'conflict'],
    'Romance': ['love', 'commitment', 'sacrifice'],
    'Comedy': ['humor', 'everyday life', 'misunderstandings'],
    'Thriller': ['suspense', 'deception', 'survival'],
    'Crime': ['morality', 'consequence', 'redemption']
  };
  
  let coreThemes: string[] = [];
  for (const genre of genres) {
    if (themeMap[genre]) {
      coreThemes.push(...themeMap[genre]);
    }
  }
  // Add from keywords
  coreThemes.push(...keywords.filter(k => !coreThemes.includes(k)).slice(0, 2));
  coreThemes = [...new Set(coreThemes)].slice(0, 4);
  
  // Cultural relevance (Telugu cinema context)
  const culturalIndicators = ['family', 'tradition', 'honor', 'village', 'festival'];
  const culturalRelevance = coreThemes.some(t => culturalIndicators.includes(t.toLowerCase()))
    ? 'high' : 'moderate';
  
  // Emotional resonance from rating
  let emotionalResonance: ThemeInsight['emotional_resonance'] = 'surface';
  if (context.tmdb_rating && context.tmdb_rating >= 7.5) {
    emotionalResonance = 'deep';
  } else if (context.tmdb_rating && context.tmdb_rating < 6) {
    emotionalResonance = 'minimal';
  }
  
  return {
    core_themes: coreThemes.length > 0 ? coreThemes : ['entertainment', 'conflict'],
    cultural_relevance: culturalRelevance,
    emotional_resonance: emotionalResonance,
    note_en: `At its core, the film explores themes of ${coreThemes.slice(0, 2).join(' and ')}, resonating with ${culturalRelevance === 'high' ? 'Telugu cultural sensibilities' : 'broad audiences'}.`,
    note_te: `ఈ చిత్రం ${coreThemes[0] || 'జీవితం'} గురించి అన్వేషిస్తుంది.`,
    confidence: coreThemes.length >= 2 ? 0.80 : 0.60
  };
}

// ============================================================
// PHASE 2: ADDITIONAL STRUCTURED SECTIONS
// ============================================================

/**
 * Generate standout scene descriptors (spoiler-free)
 */
function generateStandoutScenes(context: MovieContext): StandoutScene[] {
  const scenes: StandoutScene[] = [];
  const genres = context.genres || [];
  const rating = context.tmdb_rating || 0;
  
  // Action movies get action sequence mention
  if (genres.includes('Action') && rating >= 6.5) {
    scenes.push({
      scene_type: 'action',
      description_en: 'A high-energy action sequence that showcases impressive choreography.',
      description_te: 'ఆకట్టుకునే యాక్షన్ సీక్వెన్స్.',
      spoiler_free: true,
      confidence: 0.75
    });
  }
  
  // Drama/Romance get emotional beats
  if ((genres.includes('Drama') || genres.includes('Romance')) && rating >= 7) {
    scenes.push({
      scene_type: 'emotional',
      description_en: 'An emotionally resonant moment between lead characters.',
      description_te: 'హృదయాన్ని తాకే ఎమోషనల్ సీన్.',
      spoiler_free: true,
      confidence: 0.70
    });
  }
  
  // Comedy gets humor highlight
  if (genres.includes('Comedy')) {
    scenes.push({
      scene_type: 'comedy',
      description_en: 'Comedic sequences that deliver genuine laughs.',
      description_te: 'నవ్వించే కామెడీ సన్నివేశాలు.',
      spoiler_free: true,
      confidence: 0.75
    });
  }
  
  // High-rated movies get climax mention
  if (rating >= 7.5) {
    scenes.push({
      scene_type: 'climax',
      description_en: 'A satisfying climax that ties the narrative threads together.',
      description_te: 'సంతృప్తికరమైన క్లైమాక్స్.',
      spoiler_free: true,
      confidence: 0.80
    });
  }
  
  return scenes;
}

/**
 * Determine audience fit for the movie
 */
function generateAudienceFit(context: MovieContext): AudienceFit {
  const genres = context.genres || [];
  const rating = context.tmdb_rating || 0;
  
  // Determine primary audience from genres
  let primary: AudienceFit['primary_audience'] = 'all';
  let bestFor = 'General entertainment seekers';
  let skipIf: string | null = null;
  let setting: AudienceFit['ideal_watch_setting'] = 'any';
  
  if (genres.includes('Family') || genres.includes('Kids')) {
    primary = 'family';
    bestFor = 'Families looking for wholesome entertainment';
    skipIf = null;
    setting = 'any';
  } else if (genres.includes('Action') && (genres.includes('Drama') || genres.includes('Crime'))) {
    primary = 'mass';
    bestFor = 'Fans of masala entertainment with commercial appeal';
    skipIf = 'Looking for subtle, arthouse cinema';
    setting = 'theater';
  } else if (genres.includes('Romance') && !genres.includes('Action')) {
    primary = 'youth';
    bestFor = 'Young audiences and romance enthusiasts';
    skipIf = 'Not a fan of romantic plots';
    setting = 'any';
  } else if (genres.includes('Drama') && rating >= 7.5) {
    primary = 'class';
    bestFor = 'Discerning viewers who appreciate strong narratives';
    skipIf = 'Prefer fast-paced entertainment';
    setting = 'home';
  } else if (genres.includes('Horror') || genres.includes('Thriller')) {
    primary = 'youth';
    bestFor = 'Thrill-seekers and horror enthusiasts';
    skipIf = 'Sensitive to intense sequences';
    setting = 'theater';
  }
  
  return {
    primary_audience: primary,
    best_for: bestFor,
    skip_if: skipIf,
    ideal_watch_setting: setting,
    confidence: 0.75
  };
}

/**
 * Find comparable movies from our database
 */
async function generateComparableMovies(context: MovieContext): Promise<ComparableMovie[]> {
  const comparables: ComparableMovie[] = [];
  const genres = context.genres || [];
  
  // Get Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Find similar movies by genre + era
  if (genres.length > 0 && context.release_year) {
    const { data: similar } = await supabase
      .from('movies')
      .select('id, title_en, genres, release_year')
      .contains('genres', [genres[0]])
      .gte('release_year', context.release_year - 5)
      .lte('release_year', context.release_year + 5)
      .neq('id', context.id)
      .gte('avg_rating', 6.5)
      .limit(3);
    
    if (similar) {
      for (const movie of similar) {
        const sharedGenres = (movie.genres || []).filter((g: string) => genres.includes(g));
        comparables.push({
          movie_id: movie.id,
          movie_title: movie.title_en,
          similarity_reason: `Similar ${sharedGenres[0] || 'genre'} film from the same era`,
          similarity_score: 0.7 + (sharedGenres.length * 0.1),
          validated: true
        });
      }
    }
  }
  
  // Find by same director
  if (context.director) {
    const { data: directorMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('director', context.director)
      .neq('id', context.id)
      .gte('avg_rating', 6)
      .limit(2);
    
    if (directorMovies) {
      for (const movie of directorMovies) {
        if (!comparables.find(c => c.movie_id === movie.id)) {
          comparables.push({
            movie_id: movie.id,
            movie_title: movie.title_en,
            similarity_reason: `Another film by ${context.director}`,
            similarity_score: 0.85,
            validated: true
          });
        }
      }
    }
  }
  
  // Find by same lead actor
  if (context.hero) {
    const { data: actorMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('hero', context.hero)
      .neq('id', context.id)
      .gte('avg_rating', 6.5)
      .limit(2);
    
    if (actorMovies) {
      for (const movie of actorMovies) {
        if (!comparables.find(c => c.movie_id === movie.id)) {
          comparables.push({
            movie_id: movie.id,
            movie_title: movie.title_en,
            similarity_reason: `Another ${context.hero} starrer`,
            similarity_score: 0.80,
            validated: true
          });
        }
      }
    }
  }
  
  return comparables.slice(0, 5); // Max 5 comparables
}

/**
 * Calculate confidence for new sections
 */
function calculateScenesConfidence(context: MovieContext): number {
  let confidence = 0.4;
  if (context.genres && context.genres.length > 0) confidence += 0.2;
  if (context.tmdb_rating && context.tmdb_rating >= 6) confidence += 0.2;
  if (context.runtime_minutes) confidence += 0.1;
  return Math.min(1, confidence);
}

function calculateAudienceConfidence(context: MovieContext): number {
  let confidence = 0.5;
  if (context.genres && context.genres.length > 0) confidence += 0.25;
  if (context.tmdb_rating) confidence += 0.15;
  return Math.min(1, confidence);
}

function calculateComparablesConfidence(context: MovieContext): number {
  let confidence = 0.3;
  if (context.director) confidence += 0.25;
  if (context.hero) confidence += 0.2;
  if (context.genres && context.genres.length > 0) confidence += 0.15;
  return Math.min(1, confidence);
}

// ============================================================
// DENSITY VALIDATOR
// ============================================================

/**
 * Calculate review density score (penalizes fluff)
 */
function calculateDensityScore(insights: ReviewInsights): number {
  let score = 100;
  const allText: string[] = [];
  
  // Collect all text
  if (insights.performances) {
    insights.performances.forEach(p => {
      allText.push(p.note_en);
    });
  }
  if (insights.direction) {
    allText.push(insights.direction.note_en);
  }
  if (insights.technical) {
    insights.technical.forEach(t => allText.push(t.impact_en));
  }
  if (insights.themes) {
    allText.push(insights.themes.note_en);
  }
  
  const fullText = allText.join(' ').toLowerCase();
  
  // Penalize generic words
  for (const word of GENERIC_WORDS) {
    if (fullText.includes(word)) {
      score -= 5;
    }
  }
  
  // Penalize repetition (same word 3+ times)
  const words = fullText.split(/\s+/);
  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 4) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      if (wordCounts[word] > 2) {
        score -= 3;
      }
    }
  }
  
  // Reward specificity (actor names, director name)
  if (insights.performances?.some(p => p.actor)) score += 5;
  if (insights.direction?.note_en.includes(insights.direction.style)) score += 3;
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================

/**
 * Generate review insights for a movie
 * Does NOT replace existing review - adds enrichment layer
 */
export async function generateReviewInsights(
  movieId: string,
  options: {
    confidenceThreshold?: number;
    includeAllSections?: boolean;
  } = {}
): Promise<ReviewInsights | null> {
  const { 
    confidenceThreshold = CONFIDENCE_THRESHOLDS.INCLUDE,
    includeAllSections = false 
  } = options;
  
  // Fetch movie context
  const context = await fetchMovieContext(movieId);
  if (!context) {
    console.warn(`Movie context not found for ID: ${movieId}`);
    return null;
  }
  
  // Calculate section confidences (including Phase 2 sections)
  const sectionConfidence = {
    performances: calculatePerformanceConfidence(context),
    direction: calculateDirectionConfidence(context),
    technical: calculateTechnicalConfidence(context),
    themes: calculateThemeConfidence(context),
    scenes: calculateScenesConfidence(context),
    audience: calculateAudienceConfidence(context),
    comparables: calculateComparablesConfidence(context)
  };
  
  // Initialize insights
  const insights: ReviewInsights = {
    movie_id: movieId,
    movie_title: context.title_en,
    section_confidence: sectionConfidence,
    density_score: 0,
    length_increase_percent: 0,
    generated_at: new Date().toISOString(),
    enrichment_source: 'metadata',
    needs_review: false
  };
  
  // Generate sections based on confidence
  const threshold = includeAllSections ? 0 : confidenceThreshold;
  
  if (sectionConfidence.performances >= threshold) {
    insights.performances = generatePerformanceInsights(context);
  }
  
  if (sectionConfidence.direction >= threshold) {
    insights.direction = generateDirectionInsight(context);
  }
  
  if (sectionConfidence.technical >= threshold) {
    const techInsights = generateTechnicalInsights(context);
    if (techInsights.length > 0) {
      insights.technical = techInsights;
    }
  }
  
  if (sectionConfidence.themes >= threshold) {
    insights.themes = generateThemeInsight(context);
  }
  
  // Phase 2: Additional structured sections
  if (sectionConfidence.scenes >= threshold) {
    const scenes = generateStandoutScenes(context);
    if (scenes.length > 0) {
      insights.standout_scenes = scenes;
    }
  }
  
  if (sectionConfidence.audience >= threshold) {
    insights.audience_fit = generateAudienceFit(context);
  }
  
  if (sectionConfidence.comparables >= threshold) {
    insights.comparable_movies = await generateComparableMovies(context);
  }
  
  // Calculate density score
  insights.density_score = calculateDensityScore(insights);
  
  // Mark as needs review if any section confidence is in soft range
  insights.needs_review = Object.values(sectionConfidence).some(
    c => c >= CONFIDENCE_THRESHOLDS.SOFT_INSIGHT && c < CONFIDENCE_THRESHOLDS.INCLUDE
  );
  
  // Estimate length increase (rough calculation)
  let charCount = 0;
  if (insights.performances) {
    charCount += insights.performances.reduce((sum, p) => sum + p.note_en.length, 0);
  }
  if (insights.direction) charCount += insights.direction.note_en.length;
  if (insights.technical) {
    charCount += insights.technical.reduce((sum, t) => sum + t.impact_en.length, 0);
  }
  if (insights.themes) charCount += insights.themes.note_en.length;
  
  // Assume base review is ~500 chars
  insights.length_increase_percent = Math.round((charCount / 500) * 100) / 100;
  
  // Enforce max length increase
  if (insights.length_increase_percent > MAX_LENGTH_INCREASE) {
    console.warn(`Length increase ${insights.length_increase_percent}% exceeds max ${MAX_LENGTH_INCREASE * 100}%`);
  }
  
  return insights;
}

/**
 * Save review insights to database
 */
export async function saveReviewInsights(insights: ReviewInsights): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('movie_reviews')
    .update({
      insights: insights,
      insights_generated_at: insights.generated_at,
      has_insights: true
    })
    .eq('movie_id', insights.movie_id);
  
  if (error) {
    console.error('Failed to save review insights:', error);
    return false;
  }
  
  return true;
}

/**
 * Batch generate insights for multiple movies
 */
export async function batchGenerateInsights(
  movieIds: string[],
  options: {
    dryRun?: boolean;
    confidenceThreshold?: number;
  } = {}
): Promise<{
  processed: number;
  enriched: number;
  skipped: number;
  errors: number;
  results: Array<{ movie_id: string; status: 'enriched' | 'skipped' | 'error'; confidence: number }>;
}> {
  const { dryRun = true, confidenceThreshold } = options;
  
  const stats = {
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
    results: [] as Array<{ movie_id: string; status: 'enriched' | 'skipped' | 'error'; confidence: number }>
  };
  
  for (const movieId of movieIds) {
    stats.processed++;
    
    try {
      const insights = await generateReviewInsights(movieId, { confidenceThreshold });
      
      if (!insights) {
        stats.skipped++;
        stats.results.push({ movie_id: movieId, status: 'skipped', confidence: 0 });
        continue;
      }
      
      const avgConfidence = Object.values(insights.section_confidence)
        .reduce((a, b) => a + b, 0) / 4;
      
      // Check if any section was included
      const hasContent = insights.performances || insights.direction || 
                         insights.technical || insights.themes;
      
      if (!hasContent) {
        stats.skipped++;
        stats.results.push({ movie_id: movieId, status: 'skipped', confidence: avgConfidence });
        continue;
      }
      
      if (!dryRun) {
        await saveReviewInsights(insights);
      }
      
      stats.enriched++;
      stats.results.push({ movie_id: movieId, status: 'enriched', confidence: avgConfidence });
      
    } catch (error) {
      console.error(`Error processing movie ${movieId}:`, error);
      stats.errors++;
      stats.results.push({ movie_id: movieId, status: 'error', confidence: 0 });
    }
  }
  
  return stats;
}

// ============================================================
// ENTITY LINKING
// ============================================================

/**
 * Link insights to entities (actor, director)
 */
export function linkInsightsToEntities(insights: ReviewInsights): {
  actors: string[];
  directors: string[];
  themes: string[];
} {
  const actors: string[] = [];
  const directors: string[] = [];
  const themes: string[] = [];
  
  if (insights.performances) {
    for (const perf of insights.performances) {
      if (perf.role_type === 'lead' || perf.role_type === 'supporting') {
        actors.push(...perf.actor.split(', '));
      }
    }
  }
  
  if (insights.direction && insights.direction.note_en) {
    // Extract director name (first word before "opts" or "maintains")
    const match = insights.direction.note_en.match(/^([A-Z][a-z]+ ?[A-Z]?[a-z]*)/);
    if (match && match[1] !== 'The') {
      directors.push(match[1].trim());
    }
  }
  
  if (insights.themes) {
    themes.push(...insights.themes.core_themes);
  }
  
  return { actors, directors, themes };
}

