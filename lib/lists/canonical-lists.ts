/**
 * CANONICAL LISTS - Auto-Generated "Best Of" Lists
 * 
 * Generates versioned, auto-generated lists like:
 * - Best Movies of [Year]
 * - Top [Director] Films
 * - Essential [Genre] Telugu Movies
 * - [Actor]'s Greatest Performances
 * 
 * Each list is versioned and stored for consistency.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type ListType = 
  | 'best_of_year'
  | 'top_by_director'
  | 'top_by_actor'
  | 'genre_essentials'
  | 'decade_classics'
  | 'blockbusters'
  | 'underrated_gems'
  | 'cult_classics'
  | 'critic_favorites'
  | 'audience_favorites'
  | 'debut_directors'
  | 'music_highlights'
  | 'cinematography_showcase';

export interface ListCriteria {
  list_type: ListType;
  parameter?: string; // Year, director name, genre, etc.
  min_rating?: number;
  min_votes?: number;
  limit?: number;
  exclude_ids?: string[];
}

export interface ListMovie {
  id: string;
  rank: number;
  title_en: string;
  title_te?: string;
  release_year: number;
  director?: string;
  hero?: string;
  rating: number;
  vote_count: number;
  reason_en: string; // Why this movie is on the list
  reason_te: string;
  poster_url?: string;
  badges?: string[]; // 'blockbuster', 'award-winner', 'cult-classic'
}

export interface CanonicalList {
  id: string;
  list_type: ListType;
  title_en: string;
  title_te: string;
  description_en: string;
  description_te: string;
  parameter?: string;
  movies: ListMovie[];
  version: number;
  generated_at: string;
  valid_until?: string; // For time-sensitive lists
  is_active: boolean;
  metadata: {
    total_candidates: number;
    selection_criteria: string;
    confidence_score: number;
  };
}

export interface ListGenerationResult {
  success: boolean;
  list?: CanonicalList;
  error?: string;
  candidates_evaluated: number;
}

// ============================================================
// LIST TEMPLATES
// ============================================================

const LIST_TEMPLATES: Record<ListType, {
  title_en: (param?: string) => string;
  title_te: (param?: string) => string;
  description_en: (param?: string) => string;
  description_te: (param?: string) => string;
}> = {
  best_of_year: {
    title_en: (year) => `Best Telugu Movies of ${year}`,
    title_te: (year) => `${year} బెస్ట్ తెలుగు సినిమాలు`,
    description_en: (year) => `The top-rated Telugu films released in ${year}, ranked by critic and audience reception.`,
    description_te: (year) => `${year}లో విడుదలైన టాప్ తెలుగు సినిమాలు, విమర్శకులు మరియు ప్రేక్షకుల రేటింగ్ ఆధారంగా.`,
  },
  top_by_director: {
    title_en: (director) => `${director}'s Best Films`,
    title_te: (director) => `${director} బెస్ట్ సినిమాలు`,
    description_en: (director) => `The greatest films directed by ${director}, showcasing their finest work.`,
    description_te: (director) => `${director} దర్శకత్వం వహించిన గొప్ప సినిమాలు.`,
  },
  top_by_actor: {
    title_en: (actor) => `${actor}'s Greatest Performances`,
    title_te: (actor) => `${actor} గొప్ప పెర్ఫార్మెన్సులు`,
    description_en: (actor) => `The most memorable roles and performances by ${actor}.`,
    description_te: (actor) => `${actor} చేసిన అత్యుత్తమ పాత్రలు మరియు పెర్ఫార్మెన్సులు.`,
  },
  genre_essentials: {
    title_en: (genre) => `Essential ${genre} Telugu Movies`,
    title_te: (genre) => `ఎసెన్షియల్ ${genre} తెలుగు సినిమాలు`,
    description_en: (genre) => `Must-watch ${genre} films that define the genre in Telugu cinema.`,
    description_te: (genre) => `తెలుగు సినిమాలో ${genre} జానర్‌ను నిర్వచించే తప్పనిసరి సినిమాలు.`,
  },
  decade_classics: {
    title_en: (decade) => `Classic Telugu Movies of the ${decade}s`,
    title_te: (decade) => `${decade}ల క్లాసిక్ తెలుగు సినిమాలు`,
    description_en: (decade) => `Timeless Telugu films from the ${decade}s that continue to inspire.`,
    description_te: (decade) => `${decade}ల నుండి ఇప్పటికీ ప్రేరేపించే తెలుగు సినిమాలు.`,
  },
  blockbusters: {
    title_en: () => 'Telugu Blockbusters of All Time',
    title_te: () => 'ఆల్ టైమ్ తెలుగు బ్లాక్‌బస్టర్లు',
    description_en: () => 'The biggest commercial hits in Telugu cinema history.',
    description_te: () => 'తెలుగు సినిమా చరిత్రలో అతిపెద్ద వాణిజ్య విజయాలు.',
  },
  underrated_gems: {
    title_en: () => 'Underrated Telugu Gems You Must Watch',
    title_te: () => 'మీరు చూడాల్సిన అండర్‌రేటెడ్ తెలుగు రత్నాలు',
    description_en: () => 'Brilliant films that deserved more recognition.',
    description_te: () => 'మరింత గుర్తింపు పొందవలసిన అద్భుతమైన సినిమాలు.',
  },
  cult_classics: {
    title_en: () => 'Telugu Cult Classics',
    title_te: () => 'తెలుగు కల్ట్ క్లాసిక్స్',
    description_en: () => 'Films with devoted followings and lasting cultural impact.',
    description_te: () => 'అంకితమైన అనుచరులు మరియు శాశ్వత సాంస్కృతిక ప్రభావం ఉన్న సినిమాలు.',
  },
  critic_favorites: {
    title_en: () => 'Critics\' Choice Telugu Movies',
    title_te: () => 'విమర్శకుల ఎంపిక తెలుగు సినిమాలు',
    description_en: () => 'Films acclaimed by critics for their artistic merit.',
    description_te: () => 'వారి కళాత్మక మెరిట్ కోసం విమర్శకులు ప్రశంసించిన సినిమాలు.',
  },
  audience_favorites: {
    title_en: () => 'Audience Favorites - Telugu',
    title_te: () => 'ప్రేక్షకుల ఫేవరిట్స్ - తెలుగు',
    description_en: () => 'Films loved by audiences across generations.',
    description_te: () => 'తరాలవారీ ప్రేక్షకులు ఇష్టపడిన సినిమాలు.',
  },
  debut_directors: {
    title_en: () => 'Best Debut Director Films - Telugu',
    title_te: () => 'బెస్ట్ డెబ్యూ డైరెక్టర్ సినిమాలు - తెలుగు',
    description_en: () => 'Outstanding first films by talented new directors.',
    description_te: () => 'ప్రతిభావంతమైన కొత్త దర్శకుల అద్భుతమైన మొదటి సినిమాలు.',
  },
  music_highlights: {
    title_en: () => 'Telugu Movies with Best Music',
    title_te: () => 'బెస్ట్ మ్యూజిక్ ఉన్న తెలుగు సినిమాలు',
    description_en: () => 'Films with exceptional music and background scores.',
    description_te: () => 'అసాధారణమైన సంగీతం మరియు నేపథ్య స్కోర్లు ఉన్న సినిమాలు.',
  },
  cinematography_showcase: {
    title_en: () => 'Visually Stunning Telugu Films',
    title_te: () => 'విజువల్‌గా అద్భుతమైన తెలుగు సినిమాలు',
    description_en: () => 'Films celebrated for their exceptional cinematography.',
    description_te: () => 'వారి అసాధారణమైన ఛాయాగ్రహణం కోసం ప్రశంసించబడిన సినిమాలు.',
  },
};

// ============================================================
// REASON GENERATORS
// ============================================================

const REASON_TEMPLATES: Record<ListType, (movie: any) => { en: string; te: string }> = {
  best_of_year: (movie) => ({
    en: `Rated ${movie.vote_average?.toFixed(1) || 'N/A'} with ${movie.vote_count || 0} reviews. ${movie.director ? `Directed by ${movie.director}.` : ''}`,
    te: `${movie.vote_average?.toFixed(1) || 'N/A'} రేటింగ్, ${movie.vote_count || 0} రివ్యూలు. ${movie.director ? `దర్శకత్వం: ${movie.director}.` : ''}`,
  }),
  top_by_director: (movie) => ({
    en: `Released in ${movie.release_year}. A ${getAudienceReception(movie.vote_average)} film showcasing the director's vision.`,
    te: `${movie.release_year}లో విడుదల. దర్శకుని దృష్టిని ప్రదర్శించే ${getAudienceReceptionTe(movie.vote_average)} సినిమా.`,
  }),
  top_by_actor: (movie) => ({
    en: `${movie.character_name ? `Played ${movie.character_name}.` : ''} A ${getAudienceReception(movie.vote_average)} performance.`,
    te: `${movie.character_name ? `${movie.character_name} పాత్రలో.` : ''} ${getAudienceReceptionTe(movie.vote_average)} పెర్ఫార్మెన్స్.`,
  }),
  genre_essentials: (movie) => ({
    en: `A defining ${movie.primary_genre || 'genre'} film. ${movie.vote_average >= 7.5 ? 'Critically acclaimed.' : ''}`,
    te: `${movie.primary_genre || 'జానర్'}ను నిర్వచించే సినిమా. ${movie.vote_average >= 7.5 ? 'విమర్శకుల ప్రశంసలు పొందింది.' : ''}`,
  }),
  decade_classics: (movie) => ({
    en: `A ${movie.release_year} classic that defined its era.`,
    te: `${movie.release_year} క్లాసిక్, తన యుగాన్ని నిర్వచించింది.`,
  }),
  blockbusters: (movie) => ({
    en: `Industry hit with massive commercial success. ${movie.hero ? `Starring ${movie.hero}.` : ''}`,
    te: `భారీ వాణిజ్య విజయం సాధించిన ఇండస్ట్రీ హిట్. ${movie.hero ? `హీరో: ${movie.hero}.` : ''}`,
  }),
  underrated_gems: (movie) => ({
    en: `High quality (${movie.vote_average?.toFixed(1)}) but low visibility. Deserves more attention.`,
    te: `అధిక నాణ్యత (${movie.vote_average?.toFixed(1)}) కానీ తక్కువ దృశ్యమానత. మరింత శ్రద్ధకు అర్హత.`,
  }),
  cult_classics: (movie) => ({
    en: `Gained devoted following over time. A true cult favorite.`,
    te: `కాలక్రమేణా అంకితమైన అనుచరులను పొందింది. నిజమైన కల్ట్ ఫేవరిట్.`,
  }),
  critic_favorites: (movie) => ({
    en: `Acclaimed for ${movie.notable_aspect || 'artistic merit'}. Rating: ${movie.vote_average?.toFixed(1)}.`,
    te: `${movie.notable_aspect || 'కళాత్మక మెరిట్'} కోసం ప్రశంసించబడింది. రేటింగ్: ${movie.vote_average?.toFixed(1)}.`,
  }),
  audience_favorites: (movie) => ({
    en: `Loved by ${movie.vote_count || 'many'} viewers. A crowd-pleaser.`,
    te: `${movie.vote_count || 'అనేక'} ప్రేక్షకులు ఇష్టపడ్డారు. ఆడియెన్స్ ఫేవరిట్.`,
  }),
  debut_directors: (movie) => ({
    en: `Impressive directorial debut by ${movie.director}. Released ${movie.release_year}.`,
    te: `${movie.director} అద్భుతమైన డైరెక్టోరియల్ డెబ్యూ. ${movie.release_year}లో విడుదల.`,
  }),
  music_highlights: (movie) => ({
    en: `Music by ${movie.music_director || 'acclaimed composer'}. Songs and BGM stand out.`,
    te: `${movie.music_director || 'ప్రసిద్ధ సంగీత దర్శకుడు'} సంగీతం. పాటలు మరియు BGM ప్రత్యేకం.`,
  }),
  cinematography_showcase: (movie) => ({
    en: `Visual masterpiece by ${movie.cinematographer || 'talented DOP'}. Stunning frames throughout.`,
    te: `${movie.cinematographer || 'ప్రతిభావంతమైన DOP'} విజువల్ మాస్టర్‌పీస్. అద్భుతమైన ఫ్రేమ్‌లు.`,
  }),
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getAudienceReception(rating: number): string {
  if (rating >= 8) return 'highly acclaimed';
  if (rating >= 7) return 'well-received';
  if (rating >= 6) return 'positively received';
  return 'notable';
}

function getAudienceReceptionTe(rating: number): string {
  if (rating >= 8) return 'అత్యుత్తమ';
  if (rating >= 7) return 'మంచి';
  if (rating >= 6) return 'సానుకూల';
  return 'గుర్తించదగిన';
}

function getBadges(movie: any): string[] {
  const badges: string[] = [];
  
  if (movie.vote_average >= 8 && movie.vote_count >= 1000) {
    badges.push('blockbuster');
  }
  if (movie.is_classic) {
    badges.push('classic');
  }
  if (movie.awards?.length > 0) {
    badges.push('award-winner');
  }
  if (movie.is_underrated) {
    badges.push('underrated');
  }
  if (movie.vote_count < 200 && movie.vote_average >= 7.5) {
    badges.push('hidden-gem');
  }
  
  return badges;
}

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// ============================================================
// QUERY BUILDERS
// ============================================================

interface MovieRecord {
  id: string;
  title_en: string;
  title_te?: string;
  release_year: number;
  director?: string;
  hero?: string;
  vote_average?: number;
  vote_count?: number;
  poster_url?: string;
  genres?: string[];
  is_classic?: boolean;
  is_underrated?: boolean;
  awards?: any[];
  music_director?: string;
  cinematographer?: string;
}

async function queryMoviesForList(
  supabase: SupabaseClient,
  criteria: ListCriteria
): Promise<MovieRecord[]> {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, director, hero, vote_average, vote_count, poster_url, genres, is_classic, is_underrated, awards, music_director, cinematographer')
    .eq('is_published', true);

  // Apply type-specific filters
  switch (criteria.list_type) {
    case 'best_of_year':
      query = query.eq('release_year', parseInt(criteria.parameter || '2024'));
      break;
    case 'top_by_director':
      query = query.eq('director', criteria.parameter);
      break;
    case 'top_by_actor':
      query = query.eq('hero', criteria.parameter);
      break;
    case 'genre_essentials':
      query = query.contains('genres', [criteria.parameter]);
      break;
    case 'decade_classics':
      const decadeStart = parseInt(criteria.parameter || '2020');
      query = query.gte('release_year', decadeStart).lt('release_year', decadeStart + 10);
      break;
    case 'blockbusters':
      query = query.gte('vote_average', 7).gte('vote_count', 500);
      break;
    case 'underrated_gems':
      query = query.gte('vote_average', 7).lt('vote_count', 200);
      break;
    case 'cult_classics':
      query = query.eq('is_classic', true);
      break;
    case 'critic_favorites':
      query = query.gte('vote_average', 7.5);
      break;
    case 'audience_favorites':
      query = query.gte('vote_count', 1000);
      break;
  }

  // Apply common filters
  if (criteria.min_rating) {
    query = query.gte('vote_average', criteria.min_rating);
  }
  if (criteria.min_votes) {
    query = query.gte('vote_count', criteria.min_votes);
  }
  if (criteria.exclude_ids?.length) {
    query = query.not('id', 'in', `(${criteria.exclude_ids.join(',')})`);
  }

  // Order by rating and limit
  query = query.order('vote_average', { ascending: false }).limit(criteria.limit || 25);

  const { data, error } = await query;

  if (error) {
    console.error('Query error:', error);
    return [];
  }

  return data as MovieRecord[];
}

// ============================================================
// LIST GENERATION
// ============================================================

export async function generateList(criteria: ListCriteria): Promise<ListGenerationResult> {
  const supabase = getSupabaseClient();
  
  try {
    // Fetch candidates
    const candidates = await queryMoviesForList(supabase, criteria);
    
    if (candidates.length === 0) {
      return {
        success: false,
        error: 'No movies found matching criteria',
        candidates_evaluated: 0,
      };
    }

    // Get template
    const template = LIST_TEMPLATES[criteria.list_type];
    const reasonGenerator = REASON_TEMPLATES[criteria.list_type];

    // Build list movies
    const listMovies: ListMovie[] = candidates.map((movie, index) => {
      const reason = reasonGenerator(movie);
      return {
        id: movie.id,
        rank: index + 1,
        title_en: movie.title_en,
        title_te: movie.title_te,
        release_year: movie.release_year,
        director: movie.director,
        hero: movie.hero,
        rating: movie.vote_average || 0,
        vote_count: movie.vote_count || 0,
        reason_en: reason.en,
        reason_te: reason.te,
        poster_url: movie.poster_url,
        badges: getBadges(movie),
      };
    });

    // Build canonical list
    const canonicalList: CanonicalList = {
      id: `${criteria.list_type}_${criteria.parameter || 'all'}_${Date.now()}`,
      list_type: criteria.list_type,
      title_en: template.title_en(criteria.parameter),
      title_te: template.title_te(criteria.parameter),
      description_en: template.description_en(criteria.parameter),
      description_te: template.description_te(criteria.parameter),
      parameter: criteria.parameter,
      movies: listMovies,
      version: 1,
      generated_at: new Date().toISOString(),
      is_active: true,
      metadata: {
        total_candidates: candidates.length,
        selection_criteria: JSON.stringify(criteria),
        confidence_score: calculateListConfidence(listMovies),
      },
    };

    return {
      success: true,
      list: canonicalList,
      candidates_evaluated: candidates.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      candidates_evaluated: 0,
    };
  }
}

function calculateListConfidence(movies: ListMovie[]): number {
  if (movies.length === 0) return 0;
  
  // Factors: rating spread, vote count, completeness
  const avgRating = movies.reduce((sum, m) => sum + m.rating, 0) / movies.length;
  const avgVotes = movies.reduce((sum, m) => sum + m.vote_count, 0) / movies.length;
  const hasPosters = movies.filter(m => m.poster_url).length / movies.length;
  
  let confidence = 0.5; // Base
  
  if (avgRating >= 7) confidence += 0.2;
  if (avgVotes >= 500) confidence += 0.15;
  if (hasPosters >= 0.9) confidence += 0.15;
  
  return Math.min(1, confidence);
}

// ============================================================
// LIST STORAGE & RETRIEVAL
// ============================================================

export async function saveList(list: CanonicalList): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  
  // Check for existing version
  const { data: existing } = await supabase
    .from('canonical_lists')
    .select('version')
    .eq('list_type', list.list_type)
    .eq('parameter', list.parameter || '')
    .order('version', { ascending: false })
    .limit(1);
  
  const newVersion = existing?.length ? (existing[0].version as number) + 1 : 1;
  
  // Deactivate previous versions
  await supabase
    .from('canonical_lists')
    .update({ is_active: false })
    .eq('list_type', list.list_type)
    .eq('parameter', list.parameter || '');
  
  // Insert new version
  const { error } = await supabase.from('canonical_lists').insert({
    ...list,
    version: newVersion,
    movies: JSON.stringify(list.movies),
    metadata: JSON.stringify(list.metadata),
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function getActiveList(
  listType: ListType,
  parameter?: string
): Promise<CanonicalList | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('canonical_lists')
    .select('*')
    .eq('list_type', listType)
    .eq('parameter', parameter || '')
    .eq('is_active', true)
    .limit(1);
  
  if (error || !data?.length) {
    return null;
  }
  
  const record = data[0];
  return {
    ...record,
    movies: typeof record.movies === 'string' ? JSON.parse(record.movies) : record.movies,
    metadata: typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata,
  } as CanonicalList;
}

export async function getListHistory(
  listType: ListType,
  parameter?: string
): Promise<CanonicalList[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('canonical_lists')
    .select('*')
    .eq('list_type', listType)
    .eq('parameter', parameter || '')
    .order('version', { ascending: false });
  
  if (error || !data) {
    return [];
  }
  
  return data.map((record) => ({
    ...record,
    movies: typeof record.movies === 'string' ? JSON.parse(record.movies) : record.movies,
    metadata: typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata,
  })) as CanonicalList[];
}

// ============================================================
// BATCH GENERATION
// ============================================================

export async function generateYearlyLists(startYear: number, endYear: number): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const results = { generated: 0, failed: 0, errors: [] as string[] };
  
  for (let year = startYear; year <= endYear; year++) {
    const result = await generateList({
      list_type: 'best_of_year',
      parameter: year.toString(),
      min_rating: 6.0,
      limit: 25,
    });
    
    if (result.success && result.list) {
      const saveResult = await saveList(result.list);
      if (saveResult.success) {
        results.generated++;
      } else {
        results.failed++;
        results.errors.push(`Year ${year}: ${saveResult.error}`);
      }
    } else {
      results.failed++;
      results.errors.push(`Year ${year}: ${result.error}`);
    }
  }
  
  return results;
}

export async function generateDirectorLists(directors: string[]): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const results = { generated: 0, failed: 0, errors: [] as string[] };
  
  for (const director of directors) {
    const result = await generateList({
      list_type: 'top_by_director',
      parameter: director,
      min_rating: 5.0,
      limit: 15,
    });
    
    if (result.success && result.list && result.list.movies.length >= 3) {
      const saveResult = await saveList(result.list);
      if (saveResult.success) {
        results.generated++;
      } else {
        results.failed++;
        results.errors.push(`${director}: ${saveResult.error}`);
      }
    } else if (result.list && result.list.movies.length < 3) {
      // Skip directors with too few movies
      continue;
    } else {
      results.failed++;
      results.errors.push(`${director}: ${result.error}`);
    }
  }
  
  return results;
}

export async function generateGenreLists(): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const genres = ['Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror', 'Family'];
  const results = { generated: 0, failed: 0, errors: [] as string[] };
  
  for (const genre of genres) {
    const result = await generateList({
      list_type: 'genre_essentials',
      parameter: genre,
      min_rating: 6.5,
      limit: 20,
    });
    
    if (result.success && result.list) {
      const saveResult = await saveList(result.list);
      if (saveResult.success) {
        results.generated++;
      } else {
        results.failed++;
        results.errors.push(`${genre}: ${saveResult.error}`);
      }
    } else {
      results.failed++;
      results.errors.push(`${genre}: ${result.error}`);
    }
  }
  
  return results;
}

// ============================================================
// FEATURED LISTS
// ============================================================

export async function generateFeaturedLists(): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const featuredTypes: ListType[] = [
    'blockbusters',
    'underrated_gems',
    'cult_classics',
    'critic_favorites',
    'audience_favorites',
  ];
  
  const results = { generated: 0, failed: 0, errors: [] as string[] };
  
  for (const listType of featuredTypes) {
    const result = await generateList({
      list_type: listType,
      limit: 25,
    });
    
    if (result.success && result.list) {
      const saveResult = await saveList(result.list);
      if (saveResult.success) {
        results.generated++;
      } else {
        results.failed++;
        results.errors.push(`${listType}: ${saveResult.error}`);
      }
    } else {
      results.failed++;
      results.errors.push(`${listType}: ${result.error}`);
    }
  }
  
  return results;
}

