/**
 * Trend-Historic Fusion System
 * AI Content Strategy Engine for Telugu Cinema
 *
 * Fuses current trends with historic data for high-engagement hybrid content
 *
 * Examples:
 * - "NTR birthday today: Top 5 performances that shaped Telugu cinema"
 * - "Why ANR movies still trend on OTT"
 * - "Prabhas success: How Chiranjeevi paved the way"
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface TrendSignal {
  id: string;
  entity_type: 'person' | 'movie' | 'topic';
  entity_id: string | null;
  entity_name: string;
  entity_name_te: string | null;
  signal_source: string;
  signal_type: string;
  signal_strength: number;
  trigger_reason: string | null;
  detected_at: string;
}

export interface HistoricMatch {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  match_type: string;
  relevance_score: number;
  match_reason: string;
}

export interface ContentRecommendation {
  id: string;
  recommendation_type: string;
  suggested_title: string;
  suggested_title_te: string | null;
  suggested_hook: string | null;
  trend_context: {
    source: string;
    strength: number;
    trigger: string | null;
  };
  historic_context: {
    name: string;
    era: string | null;
    occupation: string[] | null;
  };
  relevance_score: number;
  timeliness_score: number;
  engagement_probability: number;
  combined_score: number;
  status: string;
}

export interface FusionSuggestion {
  trend: TrendSignal;
  historicMatches: HistoricMatch[];
  recommendations: ContentRecommendation[];
  overall_score: number;
}

// ============================================================
// TREND SIGNAL DETECTION
// ============================================================

/**
 * Ingest trend signals from various sources
 */
export async function ingestTrendSignals(): Promise<{
  tmdb: number;
  youtube: number;
  news: number;
  total: number;
}> {
  const results = { tmdb: 0, youtube: 0, news: 0, total: 0 };

  // Ingest from TMDB trending
  results.tmdb = await ingestTMDBTrending();

  // Ingest from YouTube (if API available)
  // results.youtube = await ingestYouTubeTrending();

  // Ingest from news mentions
  // results.news = await ingestNewsMentions();

  results.total = results.tmdb + results.youtube + results.news;

  return results;
}

/**
 * Ingest trending entities from TMDB
 */
async function ingestTMDBTrending(): Promise<number> {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return 0;

  let ingested = 0;

  try {
    // Get trending movies (Telugu)
    const trendingMovies = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=te-IN`
    ).then(r => r.json());

    // Get trending people
    const trendingPeople = await fetch(
      `https://api.themoviedb.org/3/trending/person/day?api_key=${TMDB_API_KEY}`
    ).then(r => r.json());

    // Process movies
    for (const movie of (trendingMovies.results || []).slice(0, 20)) {
      // Check if it's Telugu
      if (movie.original_language !== 'te') continue;

      // Check if movie exists in our catalogue
      const { data: existingMovie } = await supabase
        .from('catalogue_movies')
        .select('id, title_en, title_te')
        .eq('tmdb_id', movie.id)
        .single();

      // Create signal
      await supabase.from('entity_trend_signals').upsert({
        entity_type: 'movie',
        entity_id: existingMovie?.id || null,
        entity_name: movie.title || movie.original_title,
        entity_name_te: existingMovie?.title_te || null,
        signal_source: 'tmdb_trending',
        signal_type: 'trending_movie',
        signal_strength: Math.min(100, movie.popularity),
        raw_score: movie.popularity,
        trigger_reason: 'TMDB daily trending',
        detected_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_name,signal_source,detected_at::date',
        ignoreDuplicates: true,
      });

      ingested++;
    }

    // Process people
    for (const person of (trendingPeople.results || []).slice(0, 20)) {
      // Check if person exists in our knowledge graph
      const { data: existingPerson } = await supabase
        .from('kg_persons')
        .select('id, name_en, name_te')
        .eq('tmdb_id', person.id)
        .single();

      if (!existingPerson) {
        // Try by name
        const { data: byName } = await supabase
          .from('kg_persons')
          .select('id, name_en, name_te')
          .ilike('name_en', person.name)
          .single();

        if (byName) {
          await supabase.from('entity_trend_signals').upsert({
            entity_type: 'person',
            entity_id: byName.id,
            entity_name: person.name,
            entity_name_te: byName.name_te,
            signal_source: 'tmdb_trending',
            signal_type: 'trending_person',
            signal_strength: Math.min(100, person.popularity),
            raw_score: person.popularity,
            trigger_reason: 'TMDB daily trending',
            detected_at: new Date().toISOString(),
          }, {
            onConflict: 'entity_name,signal_source,detected_at::date',
            ignoreDuplicates: true,
          });

          ingested++;
        }
      }
    }
  } catch (error) {
    console.error('TMDB ingestion error:', error);
  }

  return ingested;
}

/**
 * Detect internal search spikes
 */
export async function detectSearchSpikes(): Promise<number> {
  // This would analyze internal search logs
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Get recent trend signals
 */
export async function getRecentTrendSignals(
  hours: number = 48,
  minStrength: number = 30
): Promise<TrendSignal[]> {
  const { data, error } = await supabase
    .from('entity_trend_signals')
    .select('*')
    .gte('detected_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .gte('signal_strength', minStrength)
    .order('signal_strength', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching trend signals:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// RELEVANCE SCORING
// ============================================================

/**
 * Calculate entity relevance score
 * Combines: trend strength, base popularity, historic significance
 */
export function calculateRelevanceScore(params: {
  trendStrength: number;
  basePopularity: number;
  historicSignificance: number;
  timeSinceDetection: number; // hours
  isLegendary: boolean;
  isMilestone: boolean;
}): number {
  const {
    trendStrength,
    basePopularity,
    historicSignificance,
    timeSinceDetection,
    isLegendary,
    isMilestone,
  } = params;

  // Base score from trend strength (0-40 points)
  const trendScore = (trendStrength / 100) * 40;

  // Popularity bonus (0-25 points)
  const popularityScore = (basePopularity / 100) * 25;

  // Historic significance (0-20 points)
  const historicScore = (historicSignificance / 100) * 20;

  // Time decay (lose 2 points per 12 hours after first 24)
  const decayHours = Math.max(0, timeSinceDetection - 24);
  const timeDecay = Math.min(15, (decayHours / 12) * 2);

  // Bonuses
  const legendBonus = isLegendary ? 10 : 0;
  const milestoneBonus = isMilestone ? 8 : 0;

  const total = trendScore + popularityScore + historicScore + legendBonus + milestoneBonus - timeDecay;

  return Math.max(0, Math.min(100, total));
}

/**
 * Calculate match relevance between trend and historic entity
 */
export function calculateMatchRelevance(params: {
  matchType: string;
  nameSimilarity: number;
  sharedFilms: number;
  sameEra: boolean;
  sameGenre: boolean;
  mentorRelation: boolean;
}): number {
  const { matchType, nameSimilarity, sharedFilms, sameEra, sameGenre, mentorRelation } = params;

  let score = 0;

  // Match type base scores
  const matchTypeScores: Record<string, number> = {
    'name_similarity': 35,
    'mentor_relation': 45,
    'collaboration': 40,
    'same_franchise': 50,
    'remake_original': 45,
    'era': 25,
    'genre': 20,
    'comparison': 30,
  };

  score += matchTypeScores[matchType] || 20;

  // Name similarity bonus
  if (nameSimilarity > 0.8) score += 20;
  else if (nameSimilarity > 0.5) score += 10;

  // Shared films bonus
  score += Math.min(20, sharedFilms * 4);

  // Era/genre bonuses
  if (sameEra) score += 8;
  if (sameGenre) score += 5;
  if (mentorRelation) score += 15;

  return Math.min(100, score);
}

/**
 * Calculate engagement probability
 */
export function calculateEngagementProbability(params: {
  relevanceScore: number;
  timelinessScore: number;
  entityPopularity: number;
  contentType: string;
  isMilestone: boolean;
  hasVisualContent: boolean;
}): number {
  const { relevanceScore, timelinessScore, entityPopularity, contentType, isMilestone, hasVisualContent } = params;

  // Base from relevance and timeliness
  let score = (relevanceScore * 0.35) + (timelinessScore * 0.25);

  // Popularity boost
  score += (entityPopularity / 100) * 20;

  // Content type multipliers
  const contentMultipliers: Record<string, number> = {
    'trend_tribute': 1.2,
    'ott_classic': 1.15,
    'comparison': 1.25,
    'nostalgia_spike': 1.3,
    'legacy_connection': 1.1,
    'remake_original': 1.2,
  };

  score *= contentMultipliers[contentType] || 1.0;

  // Bonuses
  if (isMilestone) score *= 1.15;
  if (hasVisualContent) score *= 1.1;

  return Math.min(100, Math.round(score));
}

// ============================================================
// HISTORIC MATCHING
// ============================================================

/**
 * Find historic entities related to a trend signal
 */
export async function findHistoricMatches(
  signal: TrendSignal
): Promise<HistoricMatch[]> {
  const matches: HistoricMatch[] = [];

  // Strategy 1: Name similarity (NTR Jr → NTR Sr)
  if (signal.entity_type === 'person') {
    const nameParts = signal.entity_name.split(' ');
    const firstName = nameParts[0];

    const { data: nameMatches } = await supabase
      .from('kg_persons')
      .select('id, name_en, name_te, era, popularity_score, debut_year')
      .or(`name_en.ilike.%${firstName}%`)
      .neq('id', signal.entity_id || '')
      .lt('debut_year', 2000)
      .order('popularity_score', { ascending: false })
      .limit(3);

    for (const match of nameMatches || []) {
      matches.push({
        entity_id: match.id,
        entity_name: match.name_en,
        entity_type: 'person',
        match_type: 'name_similarity',
        relevance_score: calculateMatchRelevance({
          matchType: 'name_similarity',
          nameSimilarity: 0.7,
          sharedFilms: 0,
          sameEra: false,
          sameGenre: false,
          mentorRelation: false,
        }),
        match_reason: `Similar name: ${match.name_en} (${match.era || 'classic'} era)`,
      });
    }
  }

  // Strategy 2: Filmography connections
  if (signal.entity_id) {
    const { data: filmographyMatches } = await supabase
      .from('kg_filmography')
      .select(`
        movie_title_en,
        kg_persons!inner (
          id, name_en, name_te, era, debut_year
        )
      `)
      .eq('person_id', signal.entity_id)
      .limit(10);

    // Find other actors in same movies
    if (filmographyMatches) {
      const movieTitles = filmographyMatches.map(f => f.movie_title_en);

      const { data: coActors } = await supabase
        .from('kg_filmography')
        .select(`
          person_id,
          kg_persons!inner (
            id, name_en, name_te, era, debut_year, popularity_score
          )
        `)
        .in('movie_title_en', movieTitles)
        .neq('person_id', signal.entity_id || '')
        .limit(20);

      // Group by person and count
      const coActorCounts: Record<string, { count: number; person: any }> = {};
      for (const ca of coActors || []) {
        const person = ca.kg_persons as any;
        if (!person || person.debut_year >= 2000) continue;

        if (!coActorCounts[person.id]) {
          coActorCounts[person.id] = { count: 0, person };
        }
        coActorCounts[person.id].count++;
      }

      // Add top collaborators
      const topCollaborators = Object.entries(coActorCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);

      for (const [personId, { count, person }] of topCollaborators) {
        if (!matches.find(m => m.entity_id === personId)) {
          matches.push({
            entity_id: personId,
            entity_name: person.name_en,
            entity_type: 'person',
            match_type: 'collaboration',
            relevance_score: calculateMatchRelevance({
              matchType: 'collaboration',
              nameSimilarity: 0,
              sharedFilms: count,
              sameEra: false,
              sameGenre: false,
              mentorRelation: false,
            }),
            match_reason: `Collaborated in ${count} films together`,
          });
        }
      }
    }
  }

  // Strategy 3: Same era legends
  if (signal.entity_type === 'person') {
    const { data: eraLegends } = await supabase
      .from('kg_persons')
      .select('id, name_en, name_te, era, popularity_score')
      .lt('debut_year', 1990)
      .gte('popularity_score', 70)
      .neq('id', signal.entity_id || '')
      .order('popularity_score', { ascending: false })
      .limit(3);

    for (const legend of eraLegends || []) {
      if (!matches.find(m => m.entity_id === legend.id)) {
        matches.push({
          entity_id: legend.id,
          entity_name: legend.name_en,
          entity_type: 'person',
          match_type: 'era',
          relevance_score: calculateMatchRelevance({
            matchType: 'era',
            nameSimilarity: 0,
            sharedFilms: 0,
            sameEra: true,
            sameGenre: false,
            mentorRelation: false,
          }),
          match_reason: `Telugu cinema legend from ${legend.era || 'classic'} era`,
        });
      }
    }
  }

  // Sort by relevance
  return matches.sort((a, b) => b.relevance_score - a.relevance_score);
}

// ============================================================
// CONTENT RECOMMENDATION ENGINE
// ============================================================

/**
 * Generate hybrid content recommendations
 */
export async function generateRecommendations(
  signal: TrendSignal,
  matches: HistoricMatch[]
): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = [];

  if (matches.length === 0) return recommendations;

  const topMatch = matches[0];

  // Determine recommendation types based on match type
  const recommendationTypes: { type: string; condition: boolean }[] = [
    {
      type: 'trend_tribute',
      condition: signal.signal_strength > 60 && topMatch.match_type === 'name_similarity'
    },
    {
      type: 'legacy_connection',
      condition: topMatch.match_type === 'collaboration' || topMatch.match_type === 'name_similarity'
    },
    {
      type: 'comparison',
      condition: signal.entity_type === 'person' && topMatch.entity_type === 'person'
    },
    {
      type: 'era_comparison',
      condition: topMatch.match_type === 'era'
    },
  ];

  for (const { type, condition } of recommendationTypes) {
    if (!condition) continue;

    const suggestion = await generateSingleRecommendation(signal, topMatch, type);
    if (suggestion) {
      recommendations.push(suggestion);
    }
  }

  return recommendations;
}

/**
 * Generate a single content recommendation
 */
async function generateSingleRecommendation(
  signal: TrendSignal,
  match: HistoricMatch,
  recommendationType: string
): Promise<ContentRecommendation | null> {
  // Build title and hook based on type
  let title: string;
  let titleTe: string;
  let hook: string;

  switch (recommendationType) {
    case 'trend_tribute':
      title = `${match.entity_name}: Top 5 Performances That Shaped Telugu Cinema`;
      titleTe = `${match.entity_name}: తెలుగు సినిమాను రూపుదిద్దిన టాప్ 5 పెర్ఫార్మెన్సెస్`;
      hook = `${signal.entity_name} ట్రెండ్ అవుతున్న సమయంలో, ${match.entity_name} అజరామర నటనను తిరిగి చూద్దాం.`;
      break;

    case 'legacy_connection':
      title = `How ${signal.entity_name}'s Success Echoes ${match.entity_name}'s Legacy`;
      titleTe = `${signal.entity_name} విజయంలో ${match.entity_name} వారసత్వం`;
      hook = `తెలుగు సినిమా చరిత్రలో ఒక తరం మరొక తరానికి ఎలా స్ఫూర్తినిస్తుందో చూద్దాం.`;
      break;

    case 'comparison':
      title = `${signal.entity_name} vs ${match.entity_name}: A Cross-Generation Comparison`;
      titleTe = `${signal.entity_name} vs ${match.entity_name}: రెండు తరాల పోలిక`;
      hook = `తెలుగు సినిమాలో రెండు సూపర్‌స్టార్ల మధ్య ఆసక్తికరమైన పోలిక.`;
      break;

    case 'era_comparison':
      title = `From ${match.entity_name}'s Era to ${signal.entity_name}: Telugu Cinema's Evolution`;
      titleTe = `${match.entity_name} కాలం నుండి ${signal.entity_name} వరకు: తెలుగు సినిమా పరిణామం`;
      hook = `తెలుగు సినిమా ఎన్ని మార్పులు చూసిందో గుర్తు చేసుకుందాం.`;
      break;

    default:
      title = `${match.entity_name}: Why This Legend Matters Today`;
      titleTe = `${match.entity_name}: ఈ రోజు ఈ లెజెండ్ ఎందుకు ముఖ్యం`;
      hook = `${signal.entity_name} గురించి మాట్లాడుకుంటున్నప్పుడు, ${match.entity_name} గురించి కూడా తెలుసుకుందాం.`;
  }

  // Calculate scores
  const relevanceScore = match.relevance_score;
  const timelinessScore = Math.min(100, signal.signal_strength * 1.2);
  const engagementProbability = calculateEngagementProbability({
    relevanceScore,
    timelinessScore,
    entityPopularity: signal.signal_strength,
    contentType: recommendationType,
    isMilestone: false,
    hasVisualContent: true,
  });

  // Insert into database
  const { data, error } = await supabase
    .from('fusion_content_recommendations')
    .insert({
      recommendation_type: recommendationType,
      primary_trend_signal_id: signal.id,
      trend_context: {
        source: signal.signal_source,
        strength: signal.signal_strength,
        trigger: signal.trigger_reason,
      },
      historic_entity_ids: [match.entity_id],
      historic_context: {
        name: match.entity_name,
        match_type: match.match_type,
        match_reason: match.match_reason,
      },
      suggested_title: title,
      suggested_title_te: titleTe,
      suggested_hook: hook,
      relevance_score: relevanceScore,
      timeliness_score: timelinessScore,
      engagement_probability: engagementProbability,
      status: 'pending',
      relevance_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recommendation:', error);
    return null;
  }

  return data as ContentRecommendation;
}

// ============================================================
// MAIN FUSION PIPELINE
// ============================================================

/**
 * Run the full Trend-Historic Fusion pipeline
 */
export async function runFusionPipeline(): Promise<{
  signals_ingested: number;
  signals_processed: number;
  matches_found: number;
  recommendations_generated: number;
  top_recommendations: ContentRecommendation[];
}> {
  console.log('\n🔮 ============================================');
  console.log('   TREND-HISTORIC FUSION PIPELINE');
  console.log('============================================\n');

  const result = {
    signals_ingested: 0,
    signals_processed: 0,
    matches_found: 0,
    recommendations_generated: 0,
    top_recommendations: [] as ContentRecommendation[],
  };

  try {
    // Step 1: Ingest fresh trend signals
    console.log('📡 Step 1: Ingesting trend signals...');
    const ingested = await ingestTrendSignals();
    result.signals_ingested = ingested.total;
    console.log(`  Ingested: ${ingested.total} signals`);

    // Step 2: Get unprocessed signals
    console.log('\n📊 Step 2: Processing signals...');
    const { data: unprocessedSignals } = await supabase
      .from('entity_trend_signals')
      .select('*')
      .eq('is_processed', false)
      .gte('signal_strength', 40)
      .order('signal_strength', { ascending: false })
      .limit(20);

    // Step 3: Find historic matches for each signal
    console.log('\n🔗 Step 3: Finding historic matches...');
    for (const signal of unprocessedSignals || []) {
      result.signals_processed++;

      const matches = await findHistoricMatches(signal);
      result.matches_found += matches.length;

      if (matches.length > 0) {
        console.log(`  ${signal.entity_name}: ${matches.length} matches`);

        // Store matches
        for (const match of matches.slice(0, 3)) {
          await supabase.from('trend_historic_matches').upsert({
            signal_id: signal.id,
            historic_entity_type: match.entity_type,
            historic_entity_id: match.entity_id,
            historic_entity_name: match.entity_name,
            relevance_score: match.relevance_score,
            match_type: match.match_type,
            match_reason: match.match_reason,
          }, {
            onConflict: 'signal_id,historic_entity_id',
            ignoreDuplicates: true,
          });
        }

        // Step 4: Generate recommendations
        const recommendations = await generateRecommendations(signal, matches);
        result.recommendations_generated += recommendations.length;

        if (recommendations.length > 0) {
          result.top_recommendations.push(...recommendations);
        }
      }

      // Mark signal as processed
      await supabase
        .from('entity_trend_signals')
        .update({ is_processed: true, recommendation_generated: matches.length > 0 })
        .eq('id', signal.id);
    }

    // Sort recommendations by combined score
    result.top_recommendations.sort((a, b) => b.combined_score - a.combined_score);
    result.top_recommendations = result.top_recommendations.slice(0, 10);

    console.log('\n📊 ============================================');
    console.log('   PIPELINE SUMMARY');
    console.log('============================================');
    console.log(`  Signals Ingested: ${result.signals_ingested}`);
    console.log(`  Signals Processed: ${result.signals_processed}`);
    console.log(`  Matches Found: ${result.matches_found}`);
    console.log(`  Recommendations: ${result.recommendations_generated}`);
    console.log('============================================\n');

  } catch (error) {
    console.error('Fusion pipeline error:', error);
  }

  return result;
}

/**
 * Get top content recommendations
 */
export async function getTopRecommendations(
  limit: number = 10,
  status: string[] = ['pending', 'approved']
): Promise<ContentRecommendation[]> {
  const { data, error } = await supabase
    .from('fusion_content_recommendations')
    .select('*')
    .in('status', status)
    .gt('relevance_expires_at', new Date().toISOString())
    .order('combined_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }

  return data || [];
}

/**
 * Approve a recommendation and generate draft
 */
export async function approveAndGenerateDraft(
  recommendationId: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Get recommendation
    const { data: rec } = await supabase
      .from('fusion_content_recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (!rec) {
      return { success: false, error: 'Recommendation not found' };
    }

    // Generate slug
    const slug = rec.suggested_title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50) + '-' + Date.now();

    // Create draft post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title: rec.suggested_title,
        slug,
        telugu_body: rec.suggested_hook || '',
        category: 'entertainment',
        status: 'draft',
      })
      .select('id')
      .single();

    if (postError) {
      return { success: false, error: postError.message };
    }

    // Update recommendation status
    await supabase
      .from('fusion_content_recommendations')
      .update({
        status: 'approved',
        post_id: post.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId);

    return { success: true, postId: post.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get entity relevance history (for trend detection)
 */
export async function getEntityRelevanceHistory(
  entityId: string,
  days: number = 30
): Promise<{
  date: string;
  relevance: number;
  change: number;
}[]> {
  const { data } = await supabase
    .from('entity_relevance_history')
    .select('snapshot_date, overall_relevance, relevance_change')
    .eq('entity_id', entityId)
    .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  return (data || []).map(d => ({
    date: d.snapshot_date,
    relevance: d.overall_relevance,
    change: d.relevance_change,
  }));
}

/**
 * Detect relevance spikes (for alerts)
 */
export async function detectRelevanceSpikes(
  minChange: number = 20
): Promise<{
  entity_id: string;
  entity_name: string;
  spike_level: string;
  change: number;
}[]> {
  const { data } = await supabase
    .from('entity_relevance_history')
    .select('entity_id, entity_name, relevance_change')
    .eq('snapshot_date', new Date().toISOString().split('T')[0])
    .gte('relevance_change', minChange)
    .order('relevance_change', { ascending: false });

  return (data || []).map(d => ({
    entity_id: d.entity_id,
    entity_name: d.entity_name,
    spike_level: d.relevance_change > 40 ? 'major' : d.relevance_change > 25 ? 'moderate' : 'minor',
    change: d.relevance_change,
  }));
}
