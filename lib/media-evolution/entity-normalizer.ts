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

