/**
 * Telugu Movie Catalogue - Wikidata Movie Ingestion Service
 * Fetches historic Telugu films (1931-2010) from Wikidata
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

// ============================================================
// SPARQL QUERIES FOR TELUGU FILMS
// ============================================================

/**
 * SPARQL Query: Fetch all Telugu films
 * Filters:
 * - Is a film (Q11424)
 * - Original language is Telugu (Q8097)
 * - Country is India (Q668)
 */
export const SPARQL_TELUGU_FILMS = `
SELECT DISTINCT
  ?film
  ?filmLabel
  ?filmLabelTe
  ?releaseDate
  ?runtime
  ?directorLabel
  ?imdbId
  ?boxOffice
  ?image
  (GROUP_CONCAT(DISTINCT ?genreLabel; SEPARATOR=", ") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?castLabel; SEPARATOR=", ") AS ?cast)
WHERE {
  ?film wdt:P31 wd:Q11424 .                 # is a film
  ?film wdt:P364 wd:Q8097 .                 # original language: Telugu
  ?film wdt:P495 wd:Q668 .                  # country: India

  OPTIONAL { ?film rdfs:label ?filmLabelTe FILTER(LANG(?filmLabelTe) = "te") }
  OPTIONAL { ?film wdt:P577 ?releaseDate }
  OPTIONAL { ?film wdt:P2047 ?runtime }
  OPTIONAL { ?film wdt:P57 ?director . ?director rdfs:label ?directorLabel FILTER(LANG(?directorLabel) = "en") }
  OPTIONAL { ?film wdt:P345 ?imdbId }
  OPTIONAL { ?film wdt:P2142 ?boxOffice }
  OPTIONAL { ?film wdt:P18 ?image }
  OPTIONAL { ?film wdt:P136 ?genre . ?genre rdfs:label ?genreLabel FILTER(LANG(?genreLabel) = "en") }
  OPTIONAL { ?film wdt:P161 ?castMember . ?castMember rdfs:label ?castLabel FILTER(LANG(?castLabel) = "en") }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
GROUP BY ?film ?filmLabel ?filmLabelTe ?releaseDate ?runtime ?directorLabel ?imdbId ?boxOffice ?image
LIMIT 2000
`;

/**
 * SPARQL Query: Fetch Telugu films by decade
 */
export const SPARQL_FILMS_BY_DECADE = (startYear: number, endYear: number) => `
SELECT DISTINCT
  ?film
  ?filmLabel
  ?filmLabelTe
  ?releaseDate
  ?runtime
  ?imdbId
  ?image
  (GROUP_CONCAT(DISTINCT ?directorLabel; SEPARATOR=", ") AS ?directors)
  (GROUP_CONCAT(DISTINCT ?producerLabel; SEPARATOR=", ") AS ?producers)
  (GROUP_CONCAT(DISTINCT ?musicLabel; SEPARATOR=", ") AS ?musicDirectors)
  (GROUP_CONCAT(DISTINCT ?genreLabel; SEPARATOR=", ") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?castLabel; SEPARATOR=", ") AS ?cast)
WHERE {
  ?film wdt:P31 wd:Q11424 .
  ?film wdt:P364 wd:Q8097 .
  ?film wdt:P495 wd:Q668 .
  ?film wdt:P577 ?releaseDate .

  FILTER(YEAR(?releaseDate) >= ${startYear} && YEAR(?releaseDate) <= ${endYear})

  OPTIONAL { ?film rdfs:label ?filmLabelTe FILTER(LANG(?filmLabelTe) = "te") }
  OPTIONAL { ?film wdt:P2047 ?runtime }
  OPTIONAL { ?film wdt:P345 ?imdbId }
  OPTIONAL { ?film wdt:P18 ?image }
  OPTIONAL { ?film wdt:P57 ?director . ?director rdfs:label ?directorLabel FILTER(LANG(?directorLabel) = "en") }
  OPTIONAL { ?film wdt:P162 ?producer . ?producer rdfs:label ?producerLabel FILTER(LANG(?producerLabel) = "en") }
  OPTIONAL { ?film wdt:P86 ?music . ?music rdfs:label ?musicLabel FILTER(LANG(?musicLabel) = "en") }
  OPTIONAL { ?film wdt:P136 ?genre . ?genre rdfs:label ?genreLabel FILTER(LANG(?genreLabel) = "en") }
  OPTIONAL { ?film wdt:P161 ?castMember . ?castMember rdfs:label ?castLabel FILTER(LANG(?castLabel) = "en") }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
GROUP BY ?film ?filmLabel ?filmLabelTe ?releaseDate ?runtime ?imdbId ?image
ORDER BY ?releaseDate
LIMIT 500
`;

/**
 * SPARQL Query: Get full details for a specific film
 */
export const SPARQL_FILM_DETAILS = (wikidataId: string) => `
SELECT
  ?film
  ?filmLabel
  ?filmLabelTe
  ?releaseDate
  ?runtime
  ?imdbId
  ?tmdbId
  ?boxOffice
  ?budget
  ?image
  ?plot
  (GROUP_CONCAT(DISTINCT ?directorInfo; SEPARATOR="|") AS ?directors)
  (GROUP_CONCAT(DISTINCT ?producerInfo; SEPARATOR="|") AS ?producers)
  (GROUP_CONCAT(DISTINCT ?musicInfo; SEPARATOR="|") AS ?musicDirectors)
  (GROUP_CONCAT(DISTINCT ?writerInfo; SEPARATOR="|") AS ?writers)
  (GROUP_CONCAT(DISTINCT ?cinematographerInfo; SEPARATOR="|") AS ?cinematographers)
  (GROUP_CONCAT(DISTINCT ?genreInfo; SEPARATOR="|") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?castInfo; SEPARATOR="|") AS ?cast)
WHERE {
  BIND(wd:${wikidataId} AS ?film)

  OPTIONAL { ?film rdfs:label ?filmLabelTe FILTER(LANG(?filmLabelTe) = "te") }
  OPTIONAL { ?film wdt:P577 ?releaseDate }
  OPTIONAL { ?film wdt:P2047 ?runtime }
  OPTIONAL { ?film wdt:P345 ?imdbId }
  OPTIONAL { ?film wdt:P4947 ?tmdbId }
  OPTIONAL { ?film wdt:P2142 ?boxOffice }
  OPTIONAL { ?film wdt:P2130 ?budget }
  OPTIONAL { ?film wdt:P18 ?image }
  OPTIONAL { ?film schema:description ?plot FILTER(LANG(?plot) = "en") }

  OPTIONAL {
    ?film wdt:P57 ?director .
    ?director rdfs:label ?directorLabel FILTER(LANG(?directorLabel) = "en")
    ?director wdt:P345 ?directorImdb
    BIND(CONCAT(?directorLabel, ";", COALESCE(STR(?directorImdb), "")) AS ?directorInfo)
  }

  OPTIONAL {
    ?film wdt:P162 ?producer .
    ?producer rdfs:label ?producerLabel FILTER(LANG(?producerLabel) = "en")
    BIND(?producerLabel AS ?producerInfo)
  }

  OPTIONAL {
    ?film wdt:P86 ?music .
    ?music rdfs:label ?musicLabel FILTER(LANG(?musicLabel) = "en")
    BIND(?musicLabel AS ?musicInfo)
  }

  OPTIONAL {
    ?film wdt:P58 ?writer .
    ?writer rdfs:label ?writerLabel FILTER(LANG(?writerLabel) = "en")
    BIND(?writerLabel AS ?writerInfo)
  }

  OPTIONAL {
    ?film wdt:P344 ?cinematographer .
    ?cinematographer rdfs:label ?cinematographerLabel FILTER(LANG(?cinematographerLabel) = "en")
    BIND(?cinematographerLabel AS ?cinematographerInfo)
  }

  OPTIONAL {
    ?film wdt:P136 ?genre .
    ?genre rdfs:label ?genreLabel FILTER(LANG(?genreLabel) = "en")
    BIND(?genreLabel AS ?genreInfo)
  }

  OPTIONAL {
    ?film wdt:P161 ?castMember .
    ?castMember rdfs:label ?castLabel FILTER(LANG(?castLabel) = "en")
    OPTIONAL { ?film p:P161 ?castStatement . ?castStatement ps:P161 ?castMember . ?castStatement pq:P453 ?role . ?role rdfs:label ?roleLabel FILTER(LANG(?roleLabel) = "en") }
    BIND(CONCAT(?castLabel, ";", COALESCE(?roleLabel, "")) AS ?castInfo)
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
GROUP BY ?film ?filmLabel ?filmLabelTe ?releaseDate ?runtime ?imdbId ?tmdbId ?boxOffice ?budget ?image ?plot
`;

// ============================================================
// TYPES
// ============================================================

interface WikidataFilmResult {
  film: { value: string };
  filmLabel: { value: string };
  filmLabelTe?: { value: string };
  releaseDate?: { value: string };
  runtime?: { value: string };
  imdbId?: { value: string };
  image?: { value: string };
  directors?: { value: string };
  producers?: { value: string };
  musicDirectors?: { value: string };
  genres?: { value: string };
  cast?: { value: string };
}

interface MovieEntity {
  wikidata_id: string;
  title_en: string;
  title_te: string | null;
  slug: string;
  release_date: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  imdb_id: string | null;
  poster_url: string | null;
  poster_source: string;
  director_names: string[];
  producer_names: string[];
  music_director_names: string[];
  hero_names: string[];
  genres: string[];
  source: string;
  source_refs: object[];
}

// ============================================================
// HELPER FUNCTIONS
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
function parseDate(dateStr: string | undefined): {
  date: string | null;
  year: number | null;
  month: number | null;
} {
  if (!dateStr) return { date: null, year: null, month: null };

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const yearMatch = dateStr.match(/(\d{4})/);
      return {
        date: null,
        year: yearMatch ? parseInt(yearMatch[1]) : null,
        month: null
      };
    }
    return {
      date: date.toISOString().split('T')[0],
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  } catch {
    return { date: null, year: null, month: null };
  }
}

/**
 * Parse comma-separated string to array
 */
function parseToArray(str: string | undefined): string[] {
  if (!str) return [];
  return str.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== 'undefined');
}

/**
 * Generate slug from title and year
 */
function generateSlug(title: string, year: number | null): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  return year ? `${normalized}-${year}` : normalized;
}

/**
 * Calculate era from release year
 */
function calculateEra(year: number | null): string | null {
  if (!year) return null;
  if (year < 1940) return 'birth_of_talkies';
  if (year < 1950) return 'early_growth';
  if (year < 1960) return 'golden_age_dawn';
  if (year < 1970) return 'golden_age_peak';
  if (year < 1980) return 'transition';
  if (year < 1990) return 'mass_masala';
  if (year < 2000) return 'commercial_peak';
  if (year < 2010) return 'new_millennium';
  if (year < 2020) return 'pan_india_rise';
  return 'pan_india_dominance';
}

/**
 * Calculate decade from year
 */
function calculateDecade(year: number | null): string | null {
  if (!year) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Transform Wikidata result to MovieEntity
 */
function transformFilm(result: WikidataFilmResult): MovieEntity {
  const wikidataId = extractWikidataId(result.film.value);
  const dateParsed = parseDate(result.releaseDate?.value);

  const directors = parseToArray(result.directors?.value);
  const cast = parseToArray(result.cast?.value);

  // Extract hero names from cast (first few entries are usually leads)
  const heroNames = cast.slice(0, 3);

  return {
    wikidata_id: wikidataId,
    title_en: result.filmLabel.value,
    title_te: result.filmLabelTe?.value || null,
    slug: generateSlug(result.filmLabel.value, dateParsed.year),
    release_date: dateParsed.date,
    release_year: dateParsed.year,
    runtime_minutes: result.runtime?.value ? parseInt(result.runtime.value) : null,
    imdb_id: result.imdbId?.value || null,
    poster_url: result.image?.value || null,
    poster_source: result.image?.value ? 'wikidata' : 'none',
    director_names: directors,
    producer_names: parseToArray(result.producers?.value),
    music_director_names: parseToArray(result.musicDirectors?.value),
    hero_names: heroNames,
    genres: parseToArray(result.genres?.value),
    source: 'wikidata',
    source_refs: [{
      source: 'wikidata',
      id: wikidataId,
      url: result.film.value,
      fetched_at: new Date().toISOString(),
    }],
  };
}

// ============================================================
// INGESTION FUNCTIONS
// ============================================================

/**
 * Ingest Telugu films from Wikidata by decade
 */
export async function ingestFilmsByDecade(
  startYear: number,
  endYear: number
): Promise<{
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
    .from('movie_ingestion_log')
    .insert({
      source: 'wikidata',
      ingestion_type: 'decade',
      decade: `${startYear}s`,
      status: 'running',
    })
    .select()
    .single();

  try {
    console.log(`Fetching Telugu films from ${startYear} to ${endYear}...`);
    const query = SPARQL_FILMS_BY_DECADE(startYear, endYear);
    const results = await executeSparql(query);
    fetched = results.length;
    console.log(`Fetched ${fetched} films from Wikidata`);

    const seenIds = new Set<string>();
    const processedMovies: string[] = [];

    for (const result of results) {
      try {
        const movie = transformFilm(result);

        // Skip if already processed in this batch
        if (seenIds.has(movie.wikidata_id)) {
          duplicates++;
          continue;
        }
        seenIds.add(movie.wikidata_id);

        // Check if exists
        const { data: existing } = await supabase
          .from('catalogue_movies')
          .select('id, wikidata_id')
          .eq('wikidata_id', movie.wikidata_id)
          .single();

        if (existing) {
          // Update existing record with any new data
          const { error } = await supabase
            .from('catalogue_movies')
            .update({
              title_te: movie.title_te || undefined,
              poster_url: movie.poster_url || undefined,
              imdb_id: movie.imdb_id || undefined,
              runtime_minutes: movie.runtime_minutes || undefined,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) {
            errors.push(`Update error for ${movie.title_en}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Check for duplicate by slug
          const { data: slugExists } = await supabase
            .from('catalogue_movies')
            .select('id')
            .eq('slug', movie.slug)
            .single();

          if (slugExists) {
            // Append wikidata ID to make slug unique
            movie.slug = `${movie.slug}-${movie.wikidata_id.toLowerCase()}`;
          }

          // Insert new record
          const { error } = await supabase
            .from('catalogue_movies')
            .insert({
              ...movie,
              era: calculateEra(movie.release_year),
              release_decade: calculateDecade(movie.release_year),
            });

          if (error) {
            if (error.code === '23505') {
              duplicates++;
            } else {
              errors.push(`Insert error for ${movie.title_en}: ${error.message}`);
            }
          } else {
            inserted++;
            processedMovies.push(movie.title_en);
          }
        }
      } catch (e) {
        errors.push(`Processing error: ${e}`);
      }
    }

    // Update ingestion log
    await supabase
      .from('movie_ingestion_log')
      .update({
        total_fetched: fetched,
        total_inserted: inserted,
        total_updated: updated,
        total_duplicates: duplicates,
        total_errors: errors.length,
        movies_processed: processedMovies.slice(0, 100),
        error_details: errors.slice(0, 50),
        completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', logEntry?.id);

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    errors.push(`Fatal error: ${errorMsg}`);

    await supabase
      .from('movie_ingestion_log')
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
 * Ingest all Telugu films from Wikidata
 */
export async function ingestAllTeluguFilms(): Promise<{
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  decades_processed: string[];
}> {
  const decades = [
    [1931, 1939],  // 1930s
    [1940, 1949],  // 1940s
    [1950, 1959],  // 1950s
    [1960, 1969],  // 1960s
    [1970, 1979],  // 1970s
    [1980, 1989],  // 1980s
    [1990, 1999],  // 1990s
    [2000, 2009],  // 2000s
    [2010, 2019],  // 2010s
    [2020, 2024],  // 2020s
  ];

  let total_fetched = 0;
  let total_inserted = 0;
  let total_updated = 0;
  const decades_processed: string[] = [];

  for (const [start, end] of decades) {
    console.log(`\n--- Processing ${start}s ---`);

    const result = await ingestFilmsByDecade(start, end);

    total_fetched += result.fetched;
    total_inserted += result.inserted;
    total_updated += result.updated;
    decades_processed.push(`${start}s`);

    console.log(`${start}s: ${result.inserted} inserted, ${result.updated} updated`);

    // Small delay between decades to be nice to Wikidata
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    total_fetched,
    total_inserted,
    total_updated,
    decades_processed,
  };
}

/**
 * Link movies to persons (actors, directors) in kg_persons table
 */
export async function linkMoviesToPersons(): Promise<{
  processed: number;
  linked: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let linked = 0;

  // Get all movies with crew/cast data
  const { data: movies } = await supabase
    .from('catalogue_movies')
    .select('id, title_en, director_names, hero_names, heroine_names')
    .not('director_names', 'is', null);

  if (!movies) return { processed: 0, linked: 0, errors: ['No movies found'] };

  for (const movie of movies) {
    processed++;

    // Link directors
    for (const directorName of movie.director_names || []) {
      const { data: person } = await supabase
        .from('kg_persons')
        .select('id, name_en, name_te, image_url')
        .ilike('name_en', directorName)
        .single();

      if (person) {
        const { error } = await supabase
          .from('movie_credits')
          .upsert({
            movie_id: movie.id,
            person_id: person.id,
            credit_type: 'director',
            person_name_en: person.name_en,
            person_name_te: person.name_te,
            person_image_url: person.image_url,
            source: 'wikidata',
          }, {
            onConflict: 'movie_id,person_name_en,credit_type,character_name',
          });

        if (!error) linked++;
        else errors.push(`Link error: ${error.message}`);
      }
    }

    // Link heroes
    for (const heroName of movie.hero_names || []) {
      const { data: person } = await supabase
        .from('kg_persons')
        .select('id, name_en, name_te, image_url')
        .ilike('name_en', heroName)
        .single();

      if (person) {
        const { error } = await supabase
          .from('movie_credits')
          .upsert({
            movie_id: movie.id,
            person_id: person.id,
            credit_type: 'cast',
            role_category: 'hero',
            person_name_en: person.name_en,
            person_name_te: person.name_te,
            person_image_url: person.image_url,
            source: 'wikidata',
          }, {
            onConflict: 'movie_id,person_name_en,credit_type,character_name',
          });

        if (!error) linked++;
        else errors.push(`Link error: ${error.message}`);
      }
    }
  }

  return { processed, linked, errors };
}

/**
 * Get stats about the movie catalogue
 */
export async function getCatalogueStats(): Promise<{
  total_movies: number;
  by_decade: Record<string, number>;
  by_era: Record<string, number>;
  with_wikidata: number;
  with_tmdb: number;
}> {
  const { data: movies } = await supabase
    .from('catalogue_movies')
    .select('release_decade, era, wikidata_id, tmdb_id');

  if (!movies) {
    return {
      total_movies: 0,
      by_decade: {},
      by_era: {},
      with_wikidata: 0,
      with_tmdb: 0,
    };
  }

  const by_decade: Record<string, number> = {};
  const by_era: Record<string, number> = {};
  let with_wikidata = 0;
  let with_tmdb = 0;

  for (const movie of movies) {
    if (movie.release_decade) {
      by_decade[movie.release_decade] = (by_decade[movie.release_decade] || 0) + 1;
    }
    if (movie.era) {
      by_era[movie.era] = (by_era[movie.era] || 0) + 1;
    }
    if (movie.wikidata_id) with_wikidata++;
    if (movie.tmdb_id) with_tmdb++;
  }

  return {
    total_movies: movies.length,
    by_decade,
    by_era,
    with_wikidata,
    with_tmdb,
  };
}



