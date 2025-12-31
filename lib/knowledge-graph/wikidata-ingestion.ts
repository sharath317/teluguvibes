/**
 * Telugu Cinema Knowledge Graph - Wikidata Ingestion Service
 * Fetches Telugu cinema actors, actresses, directors from 1931 to present
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

// ============================================================
// SPARQL QUERIES
// ============================================================

/**
 * SPARQL Query: Fetch all Telugu cinema actors/actresses
 * Filters:
 * - Occupation contains actor (Q33999) or film actor (Q10800557)
 * - Works in Telugu cinema (Q1135107) OR has Telugu films
 */
export const SPARQL_TELUGU_ACTORS = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?personLabelTe
  ?genderLabel
  ?birthDate
  ?deathDate
  ?birthPlaceLabel
  ?image
  ?imdbId
  ?occupationLabel
WHERE {
  # Find people who are actors/actresses
  ?person wdt:P106 ?occupation .
  VALUES ?occupation {
    wd:Q33999      # actor
    wd:Q10800557   # film actor
    wd:Q3455803    # film director
    wd:Q2526255    # film director
    wd:Q28389      # screenwriter
    wd:Q183945     # film producer
  }

  # Filter by Telugu cinema industry OR has worked in Telugu films
  {
    ?person wdt:P2031 wd:Q1135107 .  # work period (start) in Telugu cinema
  } UNION {
    ?person wdt:P937 wd:Q1352       # work location: Hyderabad
  } UNION {
    # Has nationality India AND occupation in film
    ?person wdt:P27 wd:Q668 .       # citizenship: India
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q1159  # located in: Andhra Pradesh
  } UNION {
    ?person wdt:P27 wd:Q668 .
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q677037 # located in: Telangana
  }

  # Get labels
  OPTIONAL { ?person rdfs:label ?personLabelTe FILTER(LANG(?personLabelTe) = "te") }
  OPTIONAL { ?person wdt:P21 ?gender }
  OPTIONAL { ?person wdt:P569 ?birthDate }
  OPTIONAL { ?person wdt:P570 ?deathDate }
  OPTIONAL { ?person wdt:P19 ?birthPlace }
  OPTIONAL { ?person wdt:P18 ?image }
  OPTIONAL { ?person wdt:P345 ?imdbId }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 2000
`;

/**
 * SPARQL Query: Fetch Telugu film directors specifically
 */
export const SPARQL_TELUGU_DIRECTORS = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?personLabelTe
  ?genderLabel
  ?birthDate
  ?deathDate
  ?image
  ?imdbId
WHERE {
  ?person wdt:P106 wd:Q2526255 .    # film director
  ?person wdt:P27 wd:Q668 .          # Indian

  # Born in Telugu states or works in Hyderabad
  {
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q1159 . # Andhra Pradesh
  } UNION {
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q677037 . # Telangana
  } UNION {
    ?person wdt:P937 wd:Q1352 .      # works in Hyderabad
  }

  OPTIONAL { ?person rdfs:label ?personLabelTe FILTER(LANG(?personLabelTe) = "te") }
  OPTIONAL { ?person wdt:P21 ?gender }
  OPTIONAL { ?person wdt:P569 ?birthDate }
  OPTIONAL { ?person wdt:P570 ?deathDate }
  OPTIONAL { ?person wdt:P18 ?image }
  OPTIONAL { ?person wdt:P345 ?imdbId }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 500
`;

/**
 * SPARQL Query: Fetch filmography for a person
 */
export const SPARQL_FILMOGRAPHY = (wikidataId: string) => `
SELECT DISTINCT
  ?film
  ?filmLabel
  ?filmLabelTe
  ?releaseDate
  ?roleLabel
WHERE {
  wd:${wikidataId} wdt:P106 ?occupation .

  {
    ?film wdt:P161 wd:${wikidataId} .  # cast member
    BIND("actor" AS ?role)
  } UNION {
    ?film wdt:P57 wd:${wikidataId} .   # director
    BIND("director" AS ?role)
  } UNION {
    ?film wdt:P162 wd:${wikidataId} .  # producer
    BIND("producer" AS ?role)
  }

  ?film wdt:P31 wd:Q11424 .            # is a film

  OPTIONAL { ?film rdfs:label ?filmLabelTe FILTER(LANG(?filmLabelTe) = "te") }
  OPTIONAL { ?film wdt:P577 ?releaseDate }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY DESC(?releaseDate)
LIMIT 100
`;

/**
 * SPARQL Query: Fetch legendary actors (pre-1980 debut)
 */
export const SPARQL_LEGENDARY_ACTORS = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?personLabelTe
  ?genderLabel
  ?birthDate
  ?deathDate
  ?image
  ?imdbId
  (YEAR(?birthDate) as ?birthYear)
WHERE {
  ?person wdt:P106 ?occupation .
  VALUES ?occupation { wd:Q33999 wd:Q10800557 }

  ?person wdt:P27 wd:Q668 .           # Indian
  ?person wdt:P569 ?birthDate .

  FILTER(YEAR(?birthDate) < 1965)     # Born before 1965 = debut before 1985

  # Telugu region
  {
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q1159 .
  } UNION {
    ?person wdt:P19 ?birthPlace .
    ?birthPlace wdt:P131* wd:Q677037 .
  }

  OPTIONAL { ?person rdfs:label ?personLabelTe FILTER(LANG(?personLabelTe) = "te") }
  OPTIONAL { ?person wdt:P21 ?gender }
  OPTIONAL { ?person wdt:P570 ?deathDate }
  OPTIONAL { ?person wdt:P18 ?image }
  OPTIONAL { ?person wdt:P345 ?imdbId }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY ?birthYear
LIMIT 500
`;

// ============================================================
// TYPES
// ============================================================

interface WikidataResult {
  person: { value: string };
  personLabel: { value: string };
  personLabelTe?: { value: string };
  genderLabel?: { value: string };
  birthDate?: { value: string };
  deathDate?: { value: string };
  birthPlaceLabel?: { value: string };
  image?: { value: string };
  imdbId?: { value: string };
  occupationLabel?: { value: string };
}

interface PersonEntity {
  wikidata_id: string;
  name_en: string;
  name_te: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_year: number | null;
  death_date: string | null;
  death_year: number | null;
  birth_place: string | null;
  occupation: string[];
  image_url: string | null;
  image_source: string | null;
  imdb_id: string | null;
  source_refs: object[];
  is_actor: boolean;
  is_actress: boolean;
  is_director: boolean;
}

// ============================================================
// INGESTION FUNCTIONS
// ============================================================

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparql(query: string): Promise<any[]> {
  const response = await fetch(WIKIDATA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com)',
    },
    body: `query=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results?.bindings || [];
}

/**
 * Extract Wikidata ID from URI
 */
function extractWikidataId(uri: string): string {
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : uri;
}

/**
 * Parse date from Wikidata format
 */
function parseDate(dateStr: string | undefined): { date: string | null; year: number | null } {
  if (!dateStr) return { date: null, year: null };

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try to extract year
      const yearMatch = dateStr.match(/(\d{4})/);
      return { date: null, year: yearMatch ? parseInt(yearMatch[1]) : null };
    }
    return {
      date: date.toISOString().split('T')[0],
      year: date.getFullYear(),
    };
  } catch {
    return { date: null, year: null };
  }
}

/**
 * Determine gender-based role flags
 */
function determineRoleFlags(gender: string | undefined, occupation: string | undefined): {
  is_actor: boolean;
  is_actress: boolean;
  is_director: boolean;
} {
  const occ = occupation?.toLowerCase() || '';
  const gen = gender?.toLowerCase() || '';

  return {
    is_actor: gen === 'male' && (occ.includes('actor') || occ.includes('film actor')),
    is_actress: gen === 'female' && (occ.includes('actor') || occ.includes('actress')),
    is_director: occ.includes('director'),
  };
}

/**
 * Transform Wikidata result to PersonEntity
 */
function transformPerson(result: WikidataResult): PersonEntity {
  const wikidataId = extractWikidataId(result.person.value);
  const birthParsed = parseDate(result.birthDate?.value);
  const deathParsed = parseDate(result.deathDate?.value);
  const roleFlags = determineRoleFlags(result.genderLabel?.value, result.occupationLabel?.value);

  return {
    wikidata_id: wikidataId,
    name_en: result.personLabel.value,
    name_te: result.personLabelTe?.value || null,
    gender: result.genderLabel?.value?.toLowerCase() || null,
    birth_date: birthParsed.date,
    birth_year: birthParsed.year,
    death_date: deathParsed.date,
    death_year: deathParsed.year,
    birth_place: result.birthPlaceLabel?.value || null,
    occupation: result.occupationLabel?.value ? [result.occupationLabel.value] : [],
    image_url: result.image?.value || null,
    image_source: result.image?.value ? 'wikidata' : null,
    imdb_id: result.imdbId?.value || null,
    source_refs: [{
      source: 'wikidata',
      id: wikidataId,
      url: result.person.value,
      fetched_at: new Date().toISOString(),
    }],
    ...roleFlags,
  };
}

// ============================================================
// DEDUPLICATION STRATEGY
// ============================================================

/**
 * Generate similarity key for deduplication
 * Uses normalized name + birth year
 */
function generateDedupeKey(person: PersonEntity): string {
  const normalizedName = person.name_en
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const birthYear = person.birth_year || 'unknown';

  return `${normalizedName}|${birthYear}`;
}

/**
 * Check for potential duplicates in database
 */
async function findPotentialDuplicates(person: PersonEntity): Promise<string[]> {
  const normalizedName = person.name_en.toLowerCase().trim();

  // Search by similar name
  const { data: nameMatches } = await supabase
    .from('kg_persons')
    .select('id, wikidata_id, name_en, birth_year')
    .or(`name_en.ilike.%${normalizedName}%,aliases.cs.{${normalizedName}}`);

  if (!nameMatches || nameMatches.length === 0) return [];

  // Filter by birth year if available
  if (person.birth_year) {
    return nameMatches
      .filter(m => m.birth_year === person.birth_year || !m.birth_year)
      .map(m => m.id);
  }

  return nameMatches.map(m => m.id);
}

/**
 * Merge duplicate records
 */
async function mergeDuplicates(canonicalId: string, duplicateIds: string[]): Promise<void> {
  // Mark duplicates as non-canonical
  await supabase
    .from('kg_persons')
    .update({
      is_canonical: false,
      canonical_id: canonicalId,
    })
    .in('id', duplicateIds);

  // Add to merge history
  await supabase
    .from('kg_persons')
    .update({
      merge_history: supabase.raw(`merge_history || ?::jsonb`, [
        JSON.stringify({ merged_ids: duplicateIds, merged_at: new Date().toISOString() })
      ]),
    })
    .eq('id', canonicalId);
}

// ============================================================
// MAIN INGESTION FUNCTIONS
// ============================================================

/**
 * Ingest Telugu cinema actors from Wikidata
 */
export async function ingestTeluguActors(): Promise<{
  fetched: number;
  inserted: number;
  updated: number;
  duplicates: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;

  // Create ingestion log
  const { data: logEntry } = await supabase
    .from('kg_ingestion_log')
    .insert({
      source: 'wikidata',
      entity_type: 'person',
      status: 'running',
    })
    .select()
    .single();

  try {
    console.log('Fetching Telugu actors from Wikidata...');
    const results = await executeSparql(SPARQL_TELUGU_ACTORS);
    fetched = results.length;
    console.log(`Fetched ${fetched} results from Wikidata`);

    // Track seen wikidata IDs to handle duplicates in results
    const seenIds = new Set<string>();

    for (const result of results) {
      try {
        const person = transformPerson(result);

        // Skip if already processed in this batch
        if (seenIds.has(person.wikidata_id)) {
          duplicates++;
          continue;
        }
        seenIds.add(person.wikidata_id);

        // Check if exists
        const { data: existing } = await supabase
          .from('kg_persons')
          .select('id')
          .eq('wikidata_id', person.wikidata_id)
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('kg_persons')
            .update({
              name_te: person.name_te || undefined,
              image_url: person.image_url || undefined,
              imdb_id: person.imdb_id || undefined,
              last_enriched_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) {
            errors.push(`Update error for ${person.name_en}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('kg_persons')
            .insert(person);

          if (error) {
            if (error.code === '23505') {
              duplicates++;
            } else {
              errors.push(`Insert error for ${person.name_en}: ${error.message}`);
            }
          } else {
            inserted++;
          }
        }
      } catch (e) {
        errors.push(`Processing error: ${e}`);
      }
    }

    // Update log
    await supabase
      .from('kg_ingestion_log')
      .update({
        total_fetched: fetched,
        total_inserted: inserted,
        total_updated: updated,
        total_duplicates: duplicates,
        total_errors: errors.length,
        error_details: errors.slice(0, 50),
        completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', logEntry?.id);

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    errors.push(`Fatal error: ${errorMsg}`);

    await supabase
      .from('kg_ingestion_log')
      .update({
        total_errors: errors.length,
        error_details: errors,
        completed_at: new Date().toISOString(),
        status: 'failed',
      })
      .eq('id', logEntry?.id);
  }

  return { fetched, inserted, updated, duplicates, errors };
}

/**
 * Ingest legendary actors (pre-1980)
 */
export async function ingestLegendaryActors(): Promise<{
  fetched: number;
  inserted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fetched = 0;
  let inserted = 0;

  try {
    console.log('Fetching legendary Telugu actors from Wikidata...');
    const results = await executeSparql(SPARQL_LEGENDARY_ACTORS);
    fetched = results.length;
    console.log(`Fetched ${fetched} legendary actors`);

    for (const result of results) {
      try {
        const person = transformPerson(result);

        const { error } = await supabase
          .from('kg_persons')
          .upsert(person, { onConflict: 'wikidata_id' });

        if (!error) {
          inserted++;
        } else {
          errors.push(`Error for ${person.name_en}: ${error.message}`);
        }
      } catch (e) {
        errors.push(`Processing error: ${e}`);
      }
    }
  } catch (e) {
    errors.push(`Fatal error: ${e}`);
  }

  return { fetched, inserted, errors };
}

/**
 * Enrich person with filmography
 */
export async function enrichFilmography(personId: string, wikidataId: string): Promise<number> {
  try {
    const query = SPARQL_FILMOGRAPHY(wikidataId);
    const results = await executeSparql(query);

    let inserted = 0;

    for (const result of results) {
      const filmWikidataId = extractWikidataId(result.film.value);
      const dateParsed = parseDate(result.releaseDate?.value);

      const { error } = await supabase
        .from('kg_filmography')
        .upsert({
          person_id: personId,
          wikidata_movie_id: filmWikidataId,
          movie_title_en: result.filmLabel.value,
          movie_title_te: result.filmLabelTe?.value || null,
          release_year: dateParsed.year,
          release_date: dateParsed.date,
          role_type: result.roleLabel?.value || 'actor',
          source: 'wikidata',
          source_id: filmWikidataId,
        }, {
          onConflict: 'person_id,wikidata_movie_id,role_type',
        });

      if (!error) inserted++;
    }

    // Update filmography count
    await supabase
      .from('kg_persons')
      .update({ filmography_count: inserted })
      .eq('id', personId);

    return inserted;
  } catch (e) {
    console.error(`Filmography enrichment failed for ${wikidataId}:`, e);
    return 0;
  }
}

/**
 * Full ingestion pipeline
 */
export async function runFullIngestion(): Promise<{
  actors: { fetched: number; inserted: number; updated: number };
  legendary: { fetched: number; inserted: number };
  directors: { fetched: number; inserted: number };
}> {
  console.log('Starting full Telugu Cinema Knowledge Graph ingestion...');

  // Ingest actors
  const actorResult = await ingestTeluguActors();
  console.log(`Actors: ${actorResult.inserted} inserted, ${actorResult.updated} updated`);

  // Ingest legendary actors
  const legendaryResult = await ingestLegendaryActors();
  console.log(`Legendary: ${legendaryResult.inserted} inserted`);

  // TODO: Ingest directors separately

  return {
    actors: {
      fetched: actorResult.fetched,
      inserted: actorResult.inserted,
      updated: actorResult.updated,
    },
    legendary: {
      fetched: legendaryResult.fetched,
      inserted: legendaryResult.inserted,
    },
    directors: {
      fetched: 0,
      inserted: 0,
    },
  };
}



