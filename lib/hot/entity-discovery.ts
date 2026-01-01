/**
 * Hot Entity Discovery Engine
 * 
 * AUTOMATICALLY discovers Telugu/Indian actresses and celebs
 * from trusted metadata sources.
 * 
 * Sources:
 * - Wikidata (occupation = actress/model/anchor/influencer + Telugu film industry)
 * - TMDB (popular actresses with recent activity)
 * 
 * NO scraping, NO images, NO captions - metadata ONLY
 * 
 * @module lib/hot/entity-discovery
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Types
export interface DiscoveredEntity {
  // Identity
  name_en: string;
  name_te?: string;
  wikidata_id?: string;
  tmdb_id?: number;
  imdb_id?: string;
  
  // Classification
  industry: 'telugu' | 'bollywood' | 'pan-india' | 'south-indian';
  entity_type: 'actress' | 'anchor' | 'model' | 'influencer';
  occupation: string[];
  
  // Scoring
  popularity_score: number;
  tmdb_popularity?: number;
  trend_score: number;
  hot_score?: number;
  
  // Metadata
  birth_date?: string;
  wikipedia_url?: string;
  description?: string;
  
  // Tracking
  discovery_source: 'wikidata' | 'tmdb' | 'manual';
  discovered_at: string;
  last_seen_at: string;
}

export interface DiscoveryResult {
  entities: DiscoveredEntity[];
  sources_checked: string[];
  total_found: number;
  errors: string[];
}

// Wikidata SPARQL endpoint
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

// Occupation QIDs for filtering
const OCCUPATION_QIDS = {
  actress: 'wd:Q33999',
  actor: 'wd:Q10800557',
  model: 'wd:Q4610556',
  anchor: 'wd:Q2722764', // TV presenter
  influencer: 'wd:Q21930755', // Social media personality
  film_actress: 'wd:Q21169216',
};

// Region QIDs
const REGION_QIDS = {
  andhra_pradesh: 'wd:Q1159',
  telangana: 'wd:Q677037',
  hyderabad: 'wd:Q1361',
  india: 'wd:Q668',
};

/**
 * Discover Telugu cinema celebrities from Wikidata
 * Uses SPARQL to find FEMALE actresses specifically in Telugu film industry
 */
export async function discoverFromWikidata(options: {
  limit?: number;
  entityTypes?: ('actress' | 'anchor' | 'model' | 'influencer')[];
  minPopularity?: number;
}): Promise<DiscoveredEntity[]> {
  const { limit = 100, entityTypes = ['actress'], minPopularity = 0 } = options;
  
  // Determine if we need female filter
  const needsFemaleFilter = entityTypes.includes('actress') || entityTypes.includes('model');
  const genderFilter = needsFemaleFilter ? '?person wdt:P21 wd:Q6581072.' : ''; // Q6581072 = female
  
  // Build occupation filter - use film actor (Q10800557) for females in film
  const occupationValues = entityTypes
    .flatMap(type => {
      switch (type) {
        case 'actress': return ['wd:Q33999', 'wd:Q10800557', 'wd:Q21169216']; // actor, film actor
        case 'anchor': return ['wd:Q2722764', 'wd:Q17125263']; // TV presenter, TV host
        case 'model': return ['wd:Q4610556']; // model
        case 'influencer': return ['wd:Q21930755']; // social media personality
        default: return [];
      }
    })
    .join(' ');
  
  // Wikidata property IDs:
  // P21 = sex or gender (Q6581072 = female)
  // P106 = occupation
  // P800 = notable work
  // P2860 = cites work (for filmography)
  // P161 = cast member (reverse lookup)
  // Q2516266 = Telugu cinema
  
  const query = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?personLabelTe
  ?birthDate
  ?wikipedia
  ?imdb
  ?tmdb
  (GROUP_CONCAT(DISTINCT ?occupationLabel; separator=", ") AS ?occupations)
WHERE {
  # Find people with actor/actress occupation
  ?person wdt:P106 ?occupation.
  VALUES ?occupation { ${occupationValues} }
  
  # MUST be female (for actresses/models)
  ${genderFilter}
  
  # Must be linked to Telugu cinema through one of these paths:
  {
    # Direct link: worked in Telugu cinema industry
    ?person wdt:P101 wd:Q2516266.  # field of work = Telugu cinema
  } UNION {
    # Alternative: appeared in a Telugu film
    ?teluguFilm wdt:P161 ?person.  # cast member
    ?teluguFilm wdt:P364 wd:Q8097.  # original language = Telugu
  } UNION {
    # Alternative: notable work is a Telugu film
    ?person wdt:P800 ?notableWork.
    ?notableWork wdt:P364 wd:Q8097.  # original language = Telugu
  } UNION {
    # Alternative: film actor from India with Telugu name/label
    ?person wdt:P106 wd:Q10800557.  # film actor
    ?person wdt:P27 wd:Q668.  # citizen of India
    ?person rdfs:label ?teLabel. 
    FILTER(LANG(?teLabel) = "te")  # has Telugu label
  }
  
  # Only living people
  FILTER NOT EXISTS { ?person wdt:P570 ?deathDate. }
  
  # Get English label (required)
  ?person rdfs:label ?personLabel. FILTER(LANG(?personLabel) = "en")
  
  # Optional Telugu label
  OPTIONAL { ?person rdfs:label ?personLabelTe. FILTER(LANG(?personLabelTe) = "te") }
  
  # Optional metadata
  OPTIONAL { ?person wdt:P569 ?birthDate. }
  OPTIONAL { 
    ?wikipedia schema:about ?person.
    ?wikipedia schema:isPartOf <https://en.wikipedia.org/>.
  }
  OPTIONAL { ?person wdt:P345 ?imdb. }
  OPTIONAL { ?person wdt:P4985 ?tmdb. }
  
  # Occupation labels for display
  ?occupation rdfs:label ?occupationLabel. FILTER(LANG(?occupationLabel) = "en")
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,te". }
}
GROUP BY ?person ?personLabel ?personLabelTe ?birthDate ?wikipedia ?imdb ?tmdb
ORDER BY DESC(?tmdb)
LIMIT ${limit}
`;

  try {
    console.log('🔍 Querying Wikidata for Telugu celebrities...');
    
    const response = await fetch(WIKIDATA_SPARQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com)',
      },
      body: `query=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`SPARQL error: ${response.status}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];
    
    console.log(`✅ Found ${bindings.length} entities from Wikidata`);
    
    const entities: DiscoveredEntity[] = [];
    const now = new Date().toISOString();
    
    for (const binding of bindings) {
      const personUri = binding.person?.value || '';
      const wikidataId = personUri.match(/Q\d+$/)?.[0];
      
      if (!wikidataId) continue;
      
      // Determine entity type from occupations
      const occupations = (binding.occupations?.value || '').toLowerCase();
      let entityType: DiscoveredEntity['entity_type'] = 'actress';
      if (occupations.includes('anchor') || occupations.includes('presenter')) {
        entityType = 'anchor';
      } else if (occupations.includes('model')) {
        entityType = 'model';
      } else if (occupations.includes('influencer')) {
        entityType = 'influencer';
      }
      
      entities.push({
        name_en: binding.personLabel?.value || '',
        name_te: binding.personLabelTe?.value,
        wikidata_id: wikidataId,
        tmdb_id: binding.tmdb?.value ? parseInt(binding.tmdb.value) : undefined,
        imdb_id: binding.imdb?.value,
        industry: 'telugu',
        entity_type: entityType,
        occupation: binding.occupations?.value?.split(', ') || ['actress'],
        popularity_score: 50, // Base score, will be enriched
        trend_score: 0,
        birth_date: binding.birthDate?.value?.split('T')[0],
        wikipedia_url: binding.wikipedia?.value,
        discovery_source: 'wikidata',
        discovered_at: now,
        last_seen_at: now,
      });
    }
    
    return entities;
  } catch (error) {
    console.error('Wikidata discovery error:', error);
    return [];
  }
}

// Known Telugu actresses for TMDB seed discovery
// These are verified Telugu film industry actresses
const TELUGU_ACTRESS_SEEDS = [
  'Samantha Ruth Prabhu',
  'Rashmika Mandanna',
  'Pooja Hegde',
  'Kajal Aggarwal',
  'Tamannaah Bhatia',
  'Anushka Shetty',
  'Nayanthara',
  'Keerthy Suresh',
  'Sai Pallavi',
  'Shruti Haasan',
  'Rakul Preet Singh',
  'Krithi Shetty',
  'Sreeleela',
  'Nabha Natesh',
  'Anupama Parameswaran',
  'Lavanya Tripathi',
  'Rashi Khanna',
  'Payal Rajput',
  'Nidhhi Agerwal',
  'Regina Cassandra',
  'Hebah Patel',
  'Eesha Rebba',
  'Mehreen Pirzada',
  'Nivetha Thomas',
  'Nivetha Pethuraj',
  'Pragya Jaiswal',
  'Varalaxmi Sarathkumar',
  'Trisha Krishnan',
  'Hansika Motwani',
  'Shriya Saran',
];

// Known Telugu anchors for discovery
const TELUGU_ANCHOR_SEEDS = [
  'Sreemukhi',
  'Anasuya Bharadwaj',
  'Rashmi Gautam',
  'Suma Kanakala',
  'Anchor Ravi',
];

/**
 * Discover popular Telugu actresses from TMDB
 * Uses seed names since TMDB doesn't have good keyword search for regional cinema
 */
export async function discoverFromTMDB(options: {
  limit?: number;
  minPopularity?: number;
}): Promise<DiscoveredEntity[]> {
  const { limit = 50, minPopularity = 5 } = options;
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.warn('TMDB_API_KEY not set, skipping TMDB discovery');
    return [];
  }
  
  const entities: DiscoveredEntity[] = [];
  const now = new Date().toISOString();
  
  try {
    console.log('🔍 Discovering from TMDB (using seed names)...');
    
    // Use seed names for accurate discovery
    const searchNames = [...TELUGU_ACTRESS_SEEDS, ...TELUGU_ANCHOR_SEEDS].slice(0, limit);
    
    const seenIds = new Set<number>();
    
    for (const name of searchNames) {
      const searchUrl = `${TMDB_API_BASE}/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}&page=1`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Get the best match (first result with exact name match preferred)
      const person = data.results?.find((p: any) => 
        p.name.toLowerCase() === name.toLowerCase()
      ) || data.results?.[0];
      
      if (!person) continue;
      if (seenIds.has(person.id)) continue;
      if (person.popularity < minPopularity) continue;
      
      seenIds.add(person.id);
      
      // Determine if likely actress
      const knownFor = person.known_for_department?.toLowerCase();
      if (knownFor !== 'acting') continue;
      
      // Get external IDs
      const externalUrl = `${TMDB_API_BASE}/person/${person.id}/external_ids?api_key=${apiKey}`;
      const externalRes = await fetch(externalUrl);
      const externalData = externalRes.ok ? await externalRes.json() : {};
      
      // Determine entity type
      const isAnchor = TELUGU_ANCHOR_SEEDS.includes(name);
      const entityType = isAnchor ? 'anchor' : 'actress';
      
      entities.push({
        name_en: person.name,
        tmdb_id: person.id,
        imdb_id: externalData.imdb_id,
        industry: 'telugu',
        entity_type: entityType,
        occupation: [entityType],
        popularity_score: Math.min(100, person.popularity),
        tmdb_popularity: person.popularity,
        trend_score: 0,
        discovery_source: 'tmdb',
        discovered_at: now,
        last_seen_at: now,
      });
      
      if (entities.length >= limit) break;
      
      // Rate limit to avoid TMDB throttling
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`✅ Found ${entities.length} entities from TMDB`);
    return entities;
  } catch (error) {
    console.error('TMDB discovery error:', error);
    return [];
  }
}

/**
 * Merge entities from multiple sources
 * Deduplicates and combines metadata
 */
export function mergeEntities(
  wikidataEntities: DiscoveredEntity[],
  tmdbEntities: DiscoveredEntity[]
): DiscoveredEntity[] {
  const merged = new Map<string, DiscoveredEntity>();
  
  // Add Wikidata entities first (higher trust)
  for (const entity of wikidataEntities) {
    const key = entity.name_en.toLowerCase();
    merged.set(key, entity);
  }
  
  // Merge TMDB data
  for (const entity of tmdbEntities) {
    const key = entity.name_en.toLowerCase();
    const existing = merged.get(key);
    
    if (existing) {
      // Merge: TMDB provides popularity, Wikidata provides verified IDs
      existing.tmdb_id = existing.tmdb_id || entity.tmdb_id;
      existing.tmdb_popularity = entity.tmdb_popularity;
      existing.popularity_score = Math.max(
        existing.popularity_score,
        entity.popularity_score
      );
    } else {
      merged.set(key, entity);
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Calculate Hot Score for ranking
 * 
 * Formula:
 * hot_score = (instagram_present * 20) +
 *             (tmdb_popularity / 5) +
 *             (trend_score * 0.3) +
 *             (glamour_weight * 10)
 */
export function calculateHotScore(entity: DiscoveredEntity, extras?: {
  hasInstagram?: boolean;
  hasYouTube?: boolean;
  recentActivity?: boolean;
}): number {
  let score = 0;
  
  // Base popularity
  score += entity.popularity_score * 0.4;
  
  // TMDB popularity boost
  if (entity.tmdb_popularity) {
    score += Math.min(20, entity.tmdb_popularity / 5);
  }
  
  // Trend score
  score += entity.trend_score * 0.3;
  
  // Social presence bonus
  if (extras?.hasInstagram) score += 15;
  if (extras?.hasYouTube) score += 10;
  
  // Recent activity bonus
  if (extras?.recentActivity) score += 10;
  
  // Entity type weight (actresses rank higher for glamour)
  const typeWeights: Record<string, number> = {
    actress: 10,
    model: 8,
    anchor: 5,
    influencer: 7,
  };
  score += typeWeights[entity.entity_type] || 0;
  
  return Math.min(100, Math.round(score));
}

/**
 * Save discovered entities to database
 */
export async function saveDiscoveredEntities(
  supabase: SupabaseClient,
  entities: DiscoveredEntity[],
  options: { dryRun?: boolean; updateExisting?: boolean } = {}
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  const { dryRun = false, updateExisting = true } = options;
  const result = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };
  
  for (const entity of entities) {
    try {
      // Check if exists in celebrities table
      const { data: existing } = await supabase
        .from('celebrities')
        .select('id, popularity_score')
        .or(`name_en.ilike.${entity.name_en},wikidata_id.eq.${entity.wikidata_id || 'null'}`)
        .maybeSingle();
      
      if (dryRun) {
        if (existing) {
          console.log(`  [PREVIEW] Would update: ${entity.name_en}`);
          result.updated++;
        } else {
          console.log(`  [PREVIEW] Would add: ${entity.name_en}`);
          result.added++;
        }
        continue;
      }
      
      const record = {
        name_en: entity.name_en,
        name_te: entity.name_te,
        wikidata_id: entity.wikidata_id,
        tmdb_id: entity.tmdb_id,
        imdb_id: entity.imdb_id,
        occupation: entity.occupation,
        popularity_score: entity.popularity_score,
        wikipedia_url: entity.wikipedia_url,
        birth_date: entity.birth_date,
        is_active: true,
        last_synced_at: new Date().toISOString(),
      };
      
      if (existing) {
        if (!updateExisting) {
          result.skipped++;
          continue;
        }
        
        // Only update if new score is higher or data is missing
        if (entity.popularity_score > (existing.popularity_score || 0)) {
          const { error } = await supabase
            .from('celebrities')
            .update(record)
            .eq('id', existing.id);
          
          if (error) throw error;
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('celebrities')
          .insert(record);
        
        if (error) throw error;
        result.added++;
      }
    } catch (error) {
      result.errors.push(`${entity.name_en}: ${error}`);
    }
  }
  
  return result;
}

/**
 * Main discovery function - combines all sources
 */
export async function discoverEntities(options: {
  limit?: number;
  entityTypes?: ('actress' | 'anchor' | 'model' | 'influencer')[];
  sources?: ('wikidata' | 'tmdb')[];
  minPopularity?: number;
}): Promise<DiscoveryResult> {
  const {
    limit = 100,
    entityTypes = ['actress'],
    sources = ['wikidata', 'tmdb'],
    minPopularity = 0,
  } = options;
  
  const result: DiscoveryResult = {
    entities: [],
    sources_checked: [],
    total_found: 0,
    errors: [],
  };
  
  let wikidataEntities: DiscoveredEntity[] = [];
  let tmdbEntities: DiscoveredEntity[] = [];
  
  // Fetch from Wikidata
  if (sources.includes('wikidata')) {
    try {
      result.sources_checked.push('wikidata');
      wikidataEntities = await discoverFromWikidata({
        limit,
        entityTypes,
        minPopularity,
      });
    } catch (error) {
      result.errors.push(`Wikidata: ${error}`);
    }
  }
  
  // Fetch from TMDB
  if (sources.includes('tmdb')) {
    try {
      result.sources_checked.push('tmdb');
      tmdbEntities = await discoverFromTMDB({
        limit,
        minPopularity,
      });
    } catch (error) {
      result.errors.push(`TMDB: ${error}`);
    }
  }
  
  // Merge and deduplicate
  result.entities = mergeEntities(wikidataEntities, tmdbEntities);
  result.total_found = result.entities.length;
  
  // Calculate hot scores
  for (const entity of result.entities) {
    entity.hot_score = calculateHotScore(entity);
  }
  
  // Sort by hot score
  result.entities.sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
  
  // Limit final results
  result.entities = result.entities.slice(0, limit);
  
  return result;
}

// Export for testing
export { OCCUPATION_QIDS, REGION_QIDS };

