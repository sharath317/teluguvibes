/**
 * WIKIDATA SOURCE FETCHER
 *
 * Fetches Telugu cinema entities using SPARQL queries.
 * Primary source for historic data (pre-TMDB era).
 *
 * Filters:
 * - Only Telugu cinema related entities
 * - Actors, actresses, directors, music directors
 */

import type { RawEntity, RawCelebrityData, RawMovieData, TargetType } from '../types';

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Main entry point
 */
export async function fetchFromWikidata(
  limit: number,
  targets: TargetType[]
): Promise<RawEntity[]> {
  const entities: RawEntity[] = [];

  // Fetch celebrities
  if (targets.includes('celebrities')) {
    const celebrities = await fetchTeluguCelebrities(limit);
    entities.push(...celebrities);
  }

  // Fetch movies
  if (targets.includes('movies')) {
    const movies = await fetchTeluguMovies(Math.floor(limit / 2));
    entities.push(...movies);
  }

  return entities;
}

/**
 * Fetch Telugu cinema personalities from Wikidata
 */
async function fetchTeluguCelebrities(limit: number): Promise<RawEntity[]> {
  const query = `
    SELECT DISTINCT ?person ?personLabel ?personLabelTe ?birthDate ?deathDate ?genderLabel
                    ?occupationLabel ?image ?tmdbId
    WHERE {
      # Telugu cinema actors, directors, etc.
      ?person wdt:P106 ?occupation.
      ?occupation wdt:P279* wd:Q33999. # Subclass of actor

      # Must be associated with Telugu cinema
      {
        ?person wdt:P2435 ?filmography.
        ?filmography wdt:P364 wd:Q8097. # Telugu language
      } UNION {
        ?person wdt:P27 wd:Q668. # Indian nationality
        ?person rdfs:label ?teLabel.
        FILTER(LANG(?teLabel) = "te")
      }

      # Optional properties
      OPTIONAL { ?person wdt:P569 ?birthDate. }
      OPTIONAL { ?person wdt:P570 ?deathDate. }
      OPTIONAL { ?person wdt:P21 ?gender. }
      OPTIONAL { ?person wdt:P18 ?image. }
      OPTIONAL { ?person wdt:P4985 ?tmdbId. }
      OPTIONAL {
        ?person rdfs:label ?personLabelTe.
        FILTER(LANG(?personLabelTe) = "te")
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,te". }
    }
    LIMIT ${limit}
  `;

  try {
    const response = await executeSparqlQuery(query);
    const results = response?.results?.bindings || [];

    return results.map((r: any) => {
      const rawData: RawCelebrityData = {
        type: 'celebrity',
        wikidata_id: extractQId(r.person?.value),
        tmdb_id: r.tmdbId?.value ? parseInt(r.tmdbId.value) : undefined,
        gender: r.genderLabel?.value?.toLowerCase(),
        birth_date: r.birthDate?.value,
        death_date: r.deathDate?.value,
        occupation: r.occupationLabel?.value ? [r.occupationLabel.value] : [],
        image_url: r.image?.value,
      };

      return {
        entity_type: 'celebrity' as const,
        source: 'wikidata' as const,
        source_id: `wikidata_${extractQId(r.person?.value)}`,
        name_en: r.personLabel?.value || 'Unknown',
        name_te: r.personLabelTe?.value,
        data: rawData,
        fetched_at: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.warn('  ⚠ Wikidata celebrities query failed:', error);
    return [];
  }
}

/**
 * Fetch Telugu films from Wikidata
 */
async function fetchTeluguMovies(limit: number): Promise<RawEntity[]> {
  const query = `
    SELECT DISTINCT ?film ?filmLabel ?filmLabelTe ?releaseDate ?directorLabel
                    ?duration ?imdbId ?tmdbId
    WHERE {
      ?film wdt:P31 wd:Q11424. # Instance of film
      ?film wdt:P364 wd:Q8097. # Original language: Telugu

      # Optional properties
      OPTIONAL { ?film wdt:P577 ?releaseDate. }
      OPTIONAL { ?film wdt:P57 ?director. }
      OPTIONAL { ?film wdt:P2047 ?duration. }
      OPTIONAL { ?film wdt:P345 ?imdbId. }
      OPTIONAL { ?film wdt:P4947 ?tmdbId. }
      OPTIONAL {
        ?film rdfs:label ?filmLabelTe.
        FILTER(LANG(?filmLabelTe) = "te")
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,te". }
    }
    ORDER BY DESC(?releaseDate)
    LIMIT ${limit}
  `;

  try {
    const response = await executeSparqlQuery(query);
    const results = response?.results?.bindings || [];

    return results.map((r: any) => {
      const rawData: RawMovieData = {
        type: 'movie',
        wikidata_id: extractQId(r.film?.value),
        tmdb_id: r.tmdbId?.value ? parseInt(r.tmdbId.value) : undefined,
        title_en: r.filmLabel?.value || 'Unknown',
        title_te: r.filmLabelTe?.value,
        release_date: r.releaseDate?.value,
        runtime: r.duration?.value ? parseInt(r.duration.value) : undefined,
      };

      return {
        entity_type: 'movie' as const,
        source: 'wikidata' as const,
        source_id: `wikidata_${extractQId(r.film?.value)}`,
        name_en: r.filmLabel?.value || 'Unknown',
        name_te: r.filmLabelTe?.value,
        data: rawData,
        fetched_at: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.warn('  ⚠ Wikidata movies query failed:', error);
    return [];
  }
}

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparqlQuery(query: string): Promise<any> {
  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com; contact@teluguvibes.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Extract Q-ID from Wikidata URI
 */
function extractQId(uri: string | undefined): string {
  if (!uri) return '';
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : '';
}
