/**
 * Phase 4: Cast, Crew & Celebrity Normalization
 * 
 * Strengthens actor/director entities, removes duplicates,
 * enforces canonical naming, detects collaborations.
 */

import { getSupabaseClient } from '../supabase/client';
import { NormalizedEntity } from './types';

// ============================================================
// NAME NORMALIZATION
// ============================================================

/**
 * Normalize a name to canonical form
 */
export function canonicalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/\./g, '')             // Remove periods
    .replace(/\s*-\s*/g, '-')       // Normalize hyphens
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

/**
 * Generate name variations for matching
 */
export function generateNameVariations(name: string): string[] {
  const canonical = canonicalizeName(name);
  const variations = new Set<string>([canonical]);
  
  const parts = canonical.split(' ');
  
  // Add with/without periods
  variations.add(parts.map(p => p + '.').join(' '));
  variations.add(parts.join(' '));
  
  // Add first name only
  if (parts.length > 1) {
    variations.add(parts[0]);
    variations.add(parts[parts.length - 1]);
  }
  
  // Common variations
  const commonMappings: Record<string, string[]> = {
    'Jr': ['Junior', 'Jr.', 'Jnr'],
    'Sr': ['Senior', 'Sr.'],
    'Ntr': ['N.T.R.', 'N T R', 'NTR'],
    'Ram': ['Rama'],
    'Mahesh': ['Mahesh Babu', 'Super Star Mahesh'],
    'Chiranjeevi': ['Chiru', 'Megastar Chiranjeevi'],
    'Prabhas': ['Rebel Star Prabhas', 'Darling Prabhas'],
    'Allu Arjun': ['Bunny', 'Stylish Star', 'Icon Star'],
  };
  
  parts.forEach(part => {
    const normalizedPart = part.toLowerCase();
    Object.entries(commonMappings).forEach(([key, values]) => {
      if (normalizedPart === key.toLowerCase()) {
        values.forEach(v => variations.add(v));
      }
    });
  });
  
  return Array.from(variations);
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

interface DuplicateGroup {
  canonical_name: string;
  occurrences: Array<{
    movie_id: string;
    movie_title: string;
    field: 'director' | 'cast_members' | 'hero' | 'heroine';
    original_value: string;
  }>;
  confidence: number;
}

/**
 * Detect potential duplicate entities across movies
 */
export async function detectDuplicateEntities(options: {
  entityType: 'director' | 'actor' | 'all';
  limit?: number;
}): Promise<{
  potential_duplicates: DuplicateGroup[];
  unique_count: number;
  total_references: number;
}> {
  const supabase = getSupabaseClient();
  const { entityType = 'all', limit = 1000 } = options;

  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, director, hero, heroine, cast_members')
    .limit(limit);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  // Collect all entity references
  const entityRefs: Map<string, DuplicateGroup['occurrences']> = new Map();
  
  const addRef = (
    name: string | null,
    movieId: string,
    movieTitle: string,
    field: DuplicateGroup['occurrences'][0]['field']
  ) => {
    if (!name) return;
    
    const canonical = canonicalizeName(name);
    const existing = entityRefs.get(canonical) || [];
    existing.push({
      movie_id: movieId,
      movie_title: movieTitle,
      field,
      original_value: name
    });
    entityRefs.set(canonical, existing);
  };

  movies.forEach(movie => {
    if (entityType === 'director' || entityType === 'all') {
      addRef(movie.director, movie.id, movie.title_en, 'director');
    }
    
    if (entityType === 'actor' || entityType === 'all') {
      addRef(movie.hero, movie.id, movie.title_en, 'hero');
      addRef(movie.heroine, movie.id, movie.title_en, 'heroine');
      
      if (movie.cast_members) {
        movie.cast_members.forEach((member: any) => {
          const name = typeof member === 'string' ? member : member.name;
          addRef(name, movie.id, movie.title_en, 'cast_members');
        });
      }
    }
  });

  // Find similar names that might be duplicates
  const duplicateGroups: DuplicateGroup[] = [];
  const processedNames = new Set<string>();

  entityRefs.forEach((refs, canonical) => {
    if (processedNames.has(canonical)) return;
    
    // Check for variations of this name
    const variations = generateNameVariations(canonical);
    const relatedRefs: DuplicateGroup['occurrences'] = [...refs];
    
    variations.forEach(variation => {
      const varCanonical = canonicalizeName(variation);
      if (varCanonical !== canonical && entityRefs.has(varCanonical)) {
        relatedRefs.push(...entityRefs.get(varCanonical)!);
        processedNames.add(varCanonical);
      }
    });
    
    processedNames.add(canonical);
    
    // Check for inconsistent original values
    const uniqueOriginals = new Set(relatedRefs.map(r => r.original_value));
    if (uniqueOriginals.size > 1) {
      duplicateGroups.push({
        canonical_name: canonical,
        occurrences: relatedRefs,
        confidence: Math.min(0.9, 0.5 + (uniqueOriginals.size * 0.1))
      });
    }
  });

  // Sort by confidence (higher = more likely duplicate)
  duplicateGroups.sort((a, b) => b.confidence - a.confidence);

  return {
    potential_duplicates: duplicateGroups.slice(0, 100),
    unique_count: entityRefs.size,
    total_references: Array.from(entityRefs.values())
      .reduce((sum, refs) => sum + refs.length, 0)
  };
}

// ============================================================
// COLLABORATION DETECTION
// ============================================================

interface Collaboration {
  entity1: string;
  entity2: string;
  relationship_type: 'actor_director' | 'hero_heroine' | 'actor_music';
  movie_count: number;
  movies: Array<{ id: string; title: string; year: number | null }>;
}

export async function detectCollaborations(options: {
  minMovies?: number;
  limit?: number;
}): Promise<Collaboration[]> {
  const supabase = getSupabaseClient();
  const { minMovies = 3, limit = 1000 } = options;

  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year, director, hero, heroine, music_director')
    .limit(limit);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const collaborations: Map<string, Collaboration> = new Map();

  const addCollaboration = (
    entity1: string | null,
    entity2: string | null,
    type: Collaboration['relationship_type'],
    movie: { id: string; title: string; year: number | null }
  ) => {
    if (!entity1 || !entity2) return;
    
    const canonical1 = canonicalizeName(entity1);
    const canonical2 = canonicalizeName(entity2);
    
    // Create consistent key
    const key = [canonical1, canonical2].sort().join('|||') + '|||' + type;
    
    const existing = collaborations.get(key) || {
      entity1: canonical1,
      entity2: canonical2,
      relationship_type: type,
      movie_count: 0,
      movies: []
    };
    
    existing.movie_count++;
    existing.movies.push(movie);
    collaborations.set(key, existing);
  };

  movies.forEach(movie => {
    const movieInfo = {
      id: movie.id,
      title: movie.title_en,
      year: movie.release_year
    };

    // Actor-Director collaboration
    addCollaboration(movie.hero, movie.director, 'actor_director', movieInfo);
    addCollaboration(movie.heroine, movie.director, 'actor_director', movieInfo);
    
    // Hero-Heroine pairing
    addCollaboration(movie.hero, movie.heroine, 'hero_heroine', movieInfo);
    
    // Actor-Music Director
    addCollaboration(movie.hero, movie.music_director, 'actor_music', movieInfo);
  });

  // Filter by minimum movies and sort
  const filtered = Array.from(collaborations.values())
    .filter(c => c.movie_count >= minMovies)
    .sort((a, b) => b.movie_count - a.movie_count);

  return filtered;
}

// ============================================================
// ENTITY NORMALIZATION
// ============================================================

export async function normalizeEntities(options: {
  fix?: boolean;
  entityType?: 'director' | 'actor' | 'all';
  dryRun?: boolean;
}): Promise<{
  analyzed: number;
  normalized: number;
  duplicates_fixed: number;
  changes: Array<{
    movie_id: string;
    field: string;
    old_value: string;
    new_value: string;
  }>;
}> {
  const supabase = getSupabaseClient();
  const { fix = false, entityType = 'all', dryRun = true } = options;

  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, director, hero, heroine, cast_members')
    .limit(2000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const stats = {
    analyzed: movies.length,
    normalized: 0,
    duplicates_fixed: 0,
    changes: [] as Array<{
      movie_id: string;
      field: string;
      old_value: string;
      new_value: string;
    }>
  };

  for (const movie of movies) {
    const updates: Record<string, any> = {};

    // Normalize director
    if (movie.director && (entityType === 'director' || entityType === 'all')) {
      const canonical = canonicalizeName(movie.director);
      if (canonical !== movie.director) {
        updates.director = canonical;
        stats.changes.push({
          movie_id: movie.id,
          field: 'director',
          old_value: movie.director,
          new_value: canonical
        });
      }
    }

    // Normalize hero
    if (movie.hero && (entityType === 'actor' || entityType === 'all')) {
      const canonical = canonicalizeName(movie.hero);
      if (canonical !== movie.hero) {
        updates.hero = canonical;
        stats.changes.push({
          movie_id: movie.id,
          field: 'hero',
          old_value: movie.hero,
          new_value: canonical
        });
      }
    }

    // Normalize heroine
    if (movie.heroine && (entityType === 'actor' || entityType === 'all')) {
      const canonical = canonicalizeName(movie.heroine);
      if (canonical !== movie.heroine) {
        updates.heroine = canonical;
        stats.changes.push({
          movie_id: movie.id,
          field: 'heroine',
          old_value: movie.heroine,
          new_value: canonical
        });
      }
    }

    // Normalize cast members
    if (movie.cast_members && (entityType === 'actor' || entityType === 'all')) {
      let changed = false;
      const normalizedCast = movie.cast_members.map((member: any) => {
        if (typeof member === 'string') {
          const canonical = canonicalizeName(member);
          if (canonical !== member) {
            changed = true;
            return canonical;
          }
          return member;
        } else if (member.name) {
          const canonical = canonicalizeName(member.name);
          if (canonical !== member.name) {
            changed = true;
            return { ...member, name: canonical };
          }
        }
        return member;
      });

      if (changed) {
        updates.cast_members = normalizedCast;
        stats.normalized++;
      }
    }

    // Apply updates if fix mode
    if (fix && !dryRun && Object.keys(updates).length > 0) {
      await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);
    }
  }

  stats.normalized = stats.changes.length;

  return stats;
}

// ============================================================
// CAREER PHASE DETECTION
// ============================================================

export type CareerPhase = 'debut' | 'rising' | 'peak' | 'established' | 'veteran' | 'legend';

export function detectCareerPhase(
  firstFilmYear: number | null,
  totalFilms: number,
  isActive: boolean = true
): CareerPhase {
  if (!firstFilmYear) return 'established';
  
  const currentYear = new Date().getFullYear();
  const yearsActive = currentYear - firstFilmYear;
  
  if (totalFilms <= 2) return 'debut';
  if (totalFilms <= 10 && yearsActive < 5) return 'rising';
  if (yearsActive >= 40 && totalFilms >= 100) return 'legend';
  if (yearsActive >= 25 && totalFilms >= 50) return 'veteran';
  if (yearsActive >= 10 && totalFilms >= 30) return 'peak';
  
  return 'established';
}

export async function enrichEntitiesWithCareerPhase(): Promise<{
  updated: number;
  phases: Record<CareerPhase, number>;
}> {
  const supabase = getSupabaseClient();

  // Get all unique actors with their film counts
  const { data: movies, error } = await supabase
    .from('movies')
    .select('hero, heroine, director, release_year')
    .limit(2000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const entityStats: Map<string, { firstYear: number; count: number }> = new Map();

  movies.forEach(movie => {
    const year = movie.release_year;
    
    ['hero', 'heroine', 'director'].forEach(field => {
      const name = movie[field];
      if (!name) return;
      
      const canonical = canonicalizeName(name);
      const existing = entityStats.get(canonical) || { firstYear: 9999, count: 0 };
      
      if (year && year < existing.firstYear) {
        existing.firstYear = year;
      }
      existing.count++;
      entityStats.set(canonical, existing);
    });
  });

  const phases: Record<CareerPhase, number> = {
    debut: 0,
    rising: 0,
    peak: 0,
    established: 0,
    veteran: 0,
    legend: 0
  };

  entityStats.forEach((stats) => {
    const phase = detectCareerPhase(
      stats.firstYear === 9999 ? null : stats.firstYear,
      stats.count
    );
    phases[phase]++;
  });

  return {
    updated: entityStats.size,
    phases
  };
}

// ============================================================
// TMDB PERSON ID RESOLUTION
// ============================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getTMDBApiKey(): string | null {
  return process.env.TMDB_API_KEY || null;
}

export interface TMDBPersonResult {
  tmdb_person_id: number | null;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  popularity: number;
  confidence: number;
}

/**
 * Search TMDB for a person by name
 */
export async function resolveTMDBPersonId(name: string): Promise<TMDBPersonResult> {
  const apiKey = getTMDBApiKey();
  if (!apiKey) {
    return {
      tmdb_person_id: null,
      name,
      profile_path: null,
      known_for_department: null,
      popularity: 0,
      confidence: 0
    };
  }

  const canonicalName = canonicalizeName(name);

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/person?api_key=${apiKey}&query=${encodeURIComponent(canonicalName)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return {
        tmdb_person_id: null,
        name: canonicalName,
        profile_path: null,
        known_for_department: null,
        popularity: 0,
        confidence: 0
      };
    }

    const data = await response.json();
    const results = data?.results || [];

    if (results.length === 0) {
      return {
        tmdb_person_id: null,
        name: canonicalName,
        profile_path: null,
        known_for_department: null,
        popularity: 0,
        confidence: 0
      };
    }

    // Find best match by name similarity
    const bestMatch = results[0];
    const nameMatch = bestMatch.name.toLowerCase() === canonicalName.toLowerCase();
    const confidence = nameMatch ? 0.95 : 0.7;

    return {
      tmdb_person_id: bestMatch.id,
      name: bestMatch.name,
      profile_path: bestMatch.profile_path,
      known_for_department: bestMatch.known_for_department,
      popularity: bestMatch.popularity || 0,
      confidence
    };
  } catch (error) {
    console.error('TMDB person search error:', error);
    return {
      tmdb_person_id: null,
      name: canonicalName,
      profile_path: null,
      known_for_department: null,
      popularity: 0,
      confidence: 0
    };
  }
}

// ============================================================
// CANONICAL CELEBRITY IDENTITY
// ============================================================

export interface CanonicalCelebrity {
  canonical_name: string;
  tmdb_person_id: number | null;
  wikidata_id: string | null;
  name_variants: string[];
  confidence: number;
  department: string | null;
  career_phase: CareerPhase;
}

/**
 * Fetch Wikidata person ID
 */
async function fetchWikidataPersonId(name: string): Promise<string | null> {
  const sparqlEndpoint = 'https://query.wikidata.org/sparql';
  
  const query = `
    SELECT ?person WHERE {
      ?person wdt:P31 wd:Q5 .           # Instance of: human
      ?person rdfs:label "${name}"@en .
      ?person wdt:P106 ?occupation .
      ?occupation wdt:P279* wd:Q33999 .  # Actor or subclass
    }
    LIMIT 1
  `;

  try {
    const response = await fetch(sparqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'TeluguVibes/1.0'
      },
      body: query,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const bindings = data?.results?.bindings || [];
    
    if (bindings.length > 0) {
      const personUri = bindings[0]?.person?.value;
      const match = personUri?.match(/Q\d+$/);
      return match ? match[0] : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve canonical celebrity identity with TMDB and Wikidata
 */
export async function resolveCanonicalCelebrity(
  name: string,
  options: { includeWikidata?: boolean; estimateCareerPhase?: boolean } = {}
): Promise<CanonicalCelebrity> {
  const { includeWikidata = false, estimateCareerPhase = true } = options;
  
  const canonicalName = canonicalizeName(name);
  const nameVariants = generateNameVariations(name);
  let confidence = 0.3; // Base confidence for having a name

  // Resolve TMDB person
  const tmdbResult = await resolveTMDBPersonId(canonicalName);
  confidence += tmdbResult.confidence * 0.4;

  // Resolve Wikidata if requested
  let wikidataId: string | null = null;
  if (includeWikidata) {
    wikidataId = await fetchWikidataPersonId(canonicalName);
    if (wikidataId) {
      confidence += 0.2;
    }
  }

  // Estimate career phase (simplified)
  let careerPhase: CareerPhase = 'established';
  if (estimateCareerPhase && tmdbResult.popularity) {
    if (tmdbResult.popularity > 50) careerPhase = 'peak';
    else if (tmdbResult.popularity > 20) careerPhase = 'established';
    else if (tmdbResult.popularity > 5) careerPhase = 'rising';
    else careerPhase = 'debut';
  }

  return {
    canonical_name: tmdbResult.name || canonicalName,
    tmdb_person_id: tmdbResult.tmdb_person_id,
    wikidata_id: wikidataId,
    name_variants: nameVariants,
    confidence: Math.min(1, confidence),
    department: tmdbResult.known_for_department,
    career_phase: careerPhase
  };
}

/**
 * Batch resolve celebrity identities
 */
export async function batchResolveCelebrities(
  names: string[],
  options: { includeWikidata?: boolean } = {}
): Promise<Map<string, CanonicalCelebrity>> {
  const results = new Map<string, CanonicalCelebrity>();
  
  for (const name of names) {
    const result = await resolveCanonicalCelebrity(name, options);
    results.set(name, result);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  return results;
}

// ============================================================
// ENTITY MERGE WITH ANALYTICS PRESERVATION
// ============================================================

export interface MergeLogEntry {
  timestamp: string;
  source_names: string[];
  target_name: string;
  affected_movies: string[];
  preserved_analytics: boolean;
  merge_id: string;
}

export interface MergeOptions {
  duplicateGroup: DuplicateGroup;
  canonicalName: string;
  dryRun?: boolean;
  preserveAnalytics?: boolean;
}

export interface MergeResult {
  merged_count: number;
  preserved_analytics: boolean;
  preserved_references: boolean;
  affected_movie_ids: string[];
  log_entry: MergeLogEntry;
  rollback_data?: object;
}

/**
 * Generate a unique merge ID for tracking
 */
function generateMergeId(): string {
  return `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a merge operation to the database
 */
export async function logMergeOperation(entry: MergeLogEntry): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Store in a merge_logs table (if exists) or as JSON in ai_learnings
  try {
    await supabase
      .from('ai_learnings')
      .insert({
        learning_type: 'entity_merge',
        category: 'normalization',
        pattern: JSON.stringify(entry),
        confidence_score: 1.0,
        created_at: entry.timestamp
      });
  } catch (error) {
    console.error('Failed to log merge operation:', error);
  }
}

/**
 * Merge duplicate entities into a single canonical name
 */
export async function mergeEntityDuplicates(options: MergeOptions): Promise<MergeResult> {
  const supabase = getSupabaseClient();
  const { duplicateGroup, canonicalName, dryRun = true, preserveAnalytics = true } = options;
  
  const mergeId = generateMergeId();
  const affectedMovieIds: string[] = [];
  const sourceNames = [...new Set(duplicateGroup.occurrences.map(o => o.original_value))];
  
  // Collect all affected movie IDs
  duplicateGroup.occurrences.forEach(occurrence => {
    if (!affectedMovieIds.includes(occurrence.movie_id)) {
      affectedMovieIds.push(occurrence.movie_id);
    }
  });

  // Prepare rollback data
  const rollbackData: Record<string, object> = {};

  if (!dryRun) {
    // Fetch current state for rollback
    const { data: movies } = await supabase
      .from('movies')
      .select('id, director, hero, heroine, cast_members')
      .in('id', affectedMovieIds);
    
    if (movies) {
      movies.forEach(m => {
        rollbackData[m.id] = {
          director: m.director,
          hero: m.hero,
          heroine: m.heroine,
          cast_members: m.cast_members
        };
      });
    }

    // Update each occurrence to use the canonical name
    for (const occurrence of duplicateGroup.occurrences) {
      if (occurrence.original_value === canonicalName) continue;

      const updateField = occurrence.field;
      
      if (updateField === 'cast_members') {
        // Special handling for cast array
        const { data: movie } = await supabase
          .from('movies')
          .select('cast_members')
          .eq('id', occurrence.movie_id)
          .single();
        
        if (movie?.cast_members) {
          const updatedCast = movie.cast_members.map((member: any) => {
            const name = typeof member === 'string' ? member : member.name;
            if (canonicalizeName(name) === duplicateGroup.canonical_name) {
              return typeof member === 'string' ? canonicalName : { ...member, name: canonicalName };
            }
            return member;
          });
          
          await supabase
            .from('movies')
            .update({ cast_members: updatedCast })
            .eq('id', occurrence.movie_id);
        }
      } else {
        // Direct field update
        await supabase
          .from('movies')
          .update({ [updateField]: canonicalName })
          .eq('id', occurrence.movie_id);
      }
    }
  }

  const logEntry: MergeLogEntry = {
    timestamp: new Date().toISOString(),
    source_names: sourceNames,
    target_name: canonicalName,
    affected_movies: affectedMovieIds,
    preserved_analytics: preserveAnalytics,
    merge_id: mergeId
  };

  // Log the merge operation
  if (!dryRun) {
    await logMergeOperation(logEntry);
  }

  return {
    merged_count: dryRun ? 0 : duplicateGroup.occurrences.length,
    preserved_analytics: preserveAnalytics,
    preserved_references: true,
    affected_movie_ids: affectedMovieIds,
    log_entry: logEntry,
    rollback_data: dryRun ? undefined : rollbackData
  };
}

/**
 * Find and preview all merge candidates
 */
export async function findMergeCandidates(options: {
  minConfidence?: number;
  entityType?: 'director' | 'actor' | 'all';
  limit?: number;
}): Promise<{
  candidates: Array<{
    group: DuplicateGroup;
    suggested_canonical: string;
    confidence: number;
  }>;
  total_count: number;
}> {
  const { minConfidence = 0.6, entityType = 'all', limit = 50 } = options;
  
  const duplicates = await detectDuplicateEntities({ entityType, limit: 1000 });
  
  const candidates = duplicates.potential_duplicates
    .filter(dup => dup.confidence >= minConfidence)
    .slice(0, limit)
    .map(group => ({
      group,
      suggested_canonical: canonicalizeName(group.canonical_name),
      confidence: group.confidence
    }));
  
  return {
    candidates,
    total_count: duplicates.potential_duplicates.length
  };
}

/**
 * Execute batch merge with preview
 */
export async function batchMergeEntities(
  candidates: Array<{ group: DuplicateGroup; canonical_name: string }>,
  options: { dryRun?: boolean; preserveAnalytics?: boolean } = {}
): Promise<{
  total: number;
  merged: number;
  errors: number;
  results: MergeResult[];
}> {
  const { dryRun = true, preserveAnalytics = true } = options;
  const results: MergeResult[] = [];
  let errors = 0;

  for (const candidate of candidates) {
    try {
      const result = await mergeEntityDuplicates({
        duplicateGroup: candidate.group,
        canonicalName: candidate.canonical_name,
        dryRun,
        preserveAnalytics
      });
      results.push(result);
    } catch (error) {
      console.error(`Merge failed for ${candidate.canonical_name}:`, error);
      errors++;
    }
  }

  return {
    total: candidates.length,
    merged: dryRun ? 0 : results.reduce((sum, r) => sum + r.merged_count, 0),
    errors,
    results
  };
}

// ============================================================
// MOVIE TITLE NORMALIZATION
// ============================================================

/**
 * Canonicalize movie title for consistency
 */
export function canonicalizeMovieTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    // Remove common suffixes
    .replace(/\s*\(telugu\)\s*/gi, '')
    .replace(/\s*\(film\)\s*/gi, '')
    .replace(/\s*\(\d{4}\)\s*/gi, '')
    // Normalize punctuation
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    // Title case
    .split(' ')
    .map(word => {
      if (['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    // Capitalize first letter
    .replace(/^./, c => c.toUpperCase());
}

/**
 * Normalize all movie titles in the database
 */
export async function normalizeMovieTitles(options: {
  fix?: boolean;
  dryRun?: boolean;
}): Promise<{
  analyzed: number;
  normalized: number;
  changes: Array<{ movie_id: string; old_title: string; new_title: string }>;
}> {
  const supabase = getSupabaseClient();
  const { fix = false, dryRun = true } = options;

  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en')
    .limit(3000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const changes: Array<{ movie_id: string; old_title: string; new_title: string }> = [];

  for (const movie of movies) {
    if (!movie.title_en) continue;

    const canonical = canonicalizeMovieTitle(movie.title_en);
    if (canonical !== movie.title_en) {
      changes.push({
        movie_id: movie.id,
        old_title: movie.title_en,
        new_title: canonical
      });

      if (fix && !dryRun) {
        await supabase
          .from('movies')
          .update({ title_en: canonical })
          .eq('id', movie.id);
      }
    }
  }

  return {
    analyzed: movies.length,
    normalized: changes.length,
    changes
  };
}

// ============================================================
// MEDIA URL NORMALIZATION
// ============================================================

/**
 * Normalize media URL for consistency
 */
export function normalizeMediaUrl(url: string): string {
  if (!url) return url;

  let normalized = url.trim();

  // Ensure HTTPS
  normalized = normalized.replace(/^http:\/\//i, 'https://');

  // Normalize TMDB image URLs
  if (normalized.includes('image.tmdb.org')) {
    // Ensure consistent size path
    normalized = normalized.replace(/\/w\d+\//, '/w500/');
  }

  // Remove tracking parameters
  normalized = normalized.replace(/[?&](utm_\w+|ref|source|campaign)=[^&]*/gi, '');

  // Clean up empty query strings
  normalized = normalized.replace(/\?$/, '');

  return normalized;
}

/**
 * Normalize all media URLs in the database
 */
export async function normalizeAllMediaUrls(options: {
  fix?: boolean;
  dryRun?: boolean;
}): Promise<{
  analyzed: number;
  fixed: number;
  broken_urls: string[];
}> {
  const supabase = getSupabaseClient();
  const { fix = false, dryRun = true } = options;

  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, poster_url, backdrop_url')
    .limit(3000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  let fixed = 0;
  const broken_urls: string[] = [];

  for (const movie of movies) {
    const updates: Record<string, string> = {};

    if (movie.poster_url) {
      const normalized = normalizeMediaUrl(movie.poster_url);
      if (normalized !== movie.poster_url) {
        updates.poster_url = normalized;
        fixed++;
      }
    }

    if (movie.backdrop_url) {
      const normalized = normalizeMediaUrl(movie.backdrop_url);
      if (normalized !== movie.backdrop_url) {
        updates.backdrop_url = normalized;
        fixed++;
      }
    }

    if (fix && !dryRun && Object.keys(updates).length > 0) {
      await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);
    }
  }

  return {
    analyzed: movies.length,
    fixed,
    broken_urls
  };
}

