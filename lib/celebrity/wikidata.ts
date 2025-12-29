/**
 * Wikidata Integration for Telugu Celebrity Data
 * Uses SPARQL queries to fetch actors, actresses, directors
 *
 * Legal: Wikidata is CC0 (public domain)
 */

import type { WikidataPerson } from '@/types/celebrity';

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * SPARQL Query: Fetch Telugu film actors and actresses
 *
 * This query finds people who:
 * - Are Indian film actors/actresses
 * - Have worked in Telugu cinema
 * - Have birth date available
 */
const TELUGU_CELEBRITIES_QUERY = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?personLabelTe
  ?birthDate
  ?deathDate
  ?birthPlaceLabel
  ?image
  ?description
WHERE {
  # Person is a human
  ?person wdt:P31 wd:Q5.

  # Person has one of these occupations
  VALUES ?occupation {
    wd:Q33999   # actor
    wd:Q10800557 # film actor
    wd:Q10798782 # television actor
    wd:Q2526255  # film director
    wd:Q3455803  # film director
  }
  ?person wdt:P106 ?occupation.

  # Person is associated with Telugu cinema OR Indian cinema
  {
    ?person wdt:P101 wd:Q1134009.  # Telugu cinema
  } UNION {
    # Or has worked in films with Telugu language
    ?film wdt:P161 ?person.
    ?film wdt:P364 wd:Q8097.  # Telugu language
  } UNION {
    # Or is from Telugu-speaking regions
    ?person wdt:P27 wd:Q668.  # Indian citizen
    ?person wdt:P19 ?birthPlace.
    ?birthPlace wdt:P131* ?region.
    VALUES ?region { wd:Q1159 wd:Q677037 }  # Andhra Pradesh, Telangana
  }

  # Birth date (required)
  ?person wdt:P569 ?birthDate.

  # Optional: death date
  OPTIONAL { ?person wdt:P570 ?deathDate. }

  # Optional: birth place
  OPTIONAL { ?person wdt:P19 ?birthPlace. }

  # Optional: image
  OPTIONAL { ?person wdt:P18 ?image. }

  # Get Telugu label if available
  OPTIONAL {
    ?person rdfs:label ?personLabelTe.
    FILTER(LANG(?personLabelTe) = "te")
  }

  # Get description
  OPTIONAL {
    ?person schema:description ?description.
    FILTER(LANG(?description) = "en")
  }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,te".
  }
}
ORDER BY DESC(?birthDate)
LIMIT 500
`;

/**
 * SPARQL Query: Fetch single celebrity by Wikidata ID
 */
function getSingleCelebrityQuery(wikidataId: string): string {
  return `
SELECT
  ?person
  ?personLabel
  ?personLabelTe
  ?birthDate
  ?deathDate
  ?birthPlaceLabel
  ?image
  ?description
  ?imdbId
  (GROUP_CONCAT(DISTINCT ?occupationLabel; SEPARATOR=", ") AS ?occupations)
WHERE {
  BIND(wd:${wikidataId} AS ?person)

  ?person wdt:P31 wd:Q5.

  # Birth date
  OPTIONAL { ?person wdt:P569 ?birthDate. }

  # Death date
  OPTIONAL { ?person wdt:P570 ?deathDate. }

  # Birth place
  OPTIONAL { ?person wdt:P19 ?birthPlace. }

  # Image
  OPTIONAL { ?person wdt:P18 ?image. }

  # IMDB ID
  OPTIONAL { ?person wdt:P345 ?imdbId. }

  # Occupations
  OPTIONAL {
    ?person wdt:P106 ?occupation.
    ?occupation rdfs:label ?occupationLabel.
    FILTER(LANG(?occupationLabel) = "en")
  }

  # Telugu label
  OPTIONAL {
    ?person rdfs:label ?personLabelTe.
    FILTER(LANG(?personLabelTe) = "te")
  }

  # Description
  OPTIONAL {
    ?person schema:description ?description.
    FILTER(LANG(?description) = "en")
  }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,te".
  }
}
GROUP BY ?person ?personLabel ?personLabelTe ?birthDate ?deathDate ?birthPlaceLabel ?image ?description ?imdbId
`;
}

/**
 * SPARQL Query: Search celebrity by name
 */
function getSearchByNameQuery(name: string): string {
  const escapedName = name.replace(/"/g, '\\"');
  return `
SELECT DISTINCT
  ?person
  ?personLabel
  ?birthDate
  ?description
  ?image
WHERE {
  ?person wdt:P31 wd:Q5.
  ?person rdfs:label ?label.

  FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
  FILTER(LANG(?label) = "en")

  # Must be actor/director
  VALUES ?occupation {
    wd:Q33999 wd:Q10800557 wd:Q2526255
  }
  ?person wdt:P106 ?occupation.

  OPTIONAL { ?person wdt:P569 ?birthDate. }
  OPTIONAL { ?person wdt:P18 ?image. }
  OPTIONAL {
    ?person schema:description ?description.
    FILTER(LANG(?description) = "en")
  }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
LIMIT 20
`;
}

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparql(query: string): Promise<any[]> {
  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com; contact@teluguvibes.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL error: ${response.status}`);
  }

  const data = await response.json();
  return data.results?.bindings || [];
}

/**
 * Parse Wikidata date format to ISO date
 */
function parseWikidataDate(dateValue?: { value: string }): string | undefined {
  if (!dateValue?.value) return undefined;

  // Wikidata returns dates like "1955-08-22T00:00:00Z"
  const date = new Date(dateValue.value);
  if (isNaN(date.getTime())) return undefined;

  return date.toISOString().split('T')[0];
}

/**
 * Extract Wikidata ID from URI
 */
function extractWikidataId(uri?: { value: string }): string | undefined {
  if (!uri?.value) return undefined;
  const match = uri.value.match(/Q\d+$/);
  return match ? match[0] : undefined;
}

/**
 * Fetch all Telugu celebrities from Wikidata
 */
export async function fetchTeluguCelebrities(): Promise<WikidataPerson[]> {
  console.log('📥 Fetching Telugu celebrities from Wikidata...');

  const results = await executeSparql(TELUGU_CELEBRITIES_QUERY);

  const celebrities: WikidataPerson[] = results.map(row => ({
    id: extractWikidataId(row.person) || '',
    name: row.personLabel?.value || 'Unknown',
    name_te: row.personLabelTe?.value,
    description: row.description?.value,
    birthDate: parseWikidataDate(row.birthDate),
    deathDate: parseWikidataDate(row.deathDate),
    birthPlace: row.birthPlaceLabel?.value,
    image: row.image?.value,
  })).filter(c => c.id && c.name !== 'Unknown');

  console.log(`✅ Found ${celebrities.length} Telugu celebrities`);
  return celebrities;
}

/**
 * Fetch single celebrity by Wikidata ID
 */
export async function fetchCelebrityByWikidataId(wikidataId: string): Promise<WikidataPerson | null> {
  console.log(`📥 Fetching celebrity ${wikidataId} from Wikidata...`);

  const query = getSingleCelebrityQuery(wikidataId);
  const results = await executeSparql(query);

  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: wikidataId,
    name: row.personLabel?.value || 'Unknown',
    name_te: row.personLabelTe?.value,
    description: row.description?.value,
    birthDate: parseWikidataDate(row.birthDate),
    deathDate: parseWikidataDate(row.deathDate),
    birthPlace: row.birthPlaceLabel?.value,
    occupation: row.occupations?.value?.split(', ') || [],
    image: row.image?.value,
  };
}

/**
 * Search celebrities by name
 */
export async function searchCelebrityByName(name: string): Promise<WikidataPerson[]> {
  console.log(`🔍 Searching Wikidata for: ${name}`);

  const query = getSearchByNameQuery(name);
  const results = await executeSparql(query);

  return results.map(row => ({
    id: extractWikidataId(row.person) || '',
    name: row.personLabel?.value || 'Unknown',
    description: row.description?.value,
    birthDate: parseWikidataDate(row.birthDate),
    image: row.image?.value,
  })).filter(c => c.id);
}

/**
 * Fetch Wikipedia summary for a celebrity
 */
export async function fetchWikipediaSummary(name: string): Promise<string | null> {
  const encodedName = encodeURIComponent(name.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedName}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TeluguVibes/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.extract || null;
  } catch (error) {
    console.error('Wikipedia fetch error:', error);
    return null;
  }
}

/**
 * Fetch Wikimedia Commons image URL
 */
export async function fetchWikimediaImage(filename: string): Promise<string | null> {
  // Convert Wikidata image URL to Wikimedia Commons URL
  if (filename.startsWith('http://commons.wikimedia.org')) {
    // Already a Wikimedia URL
    const name = filename.split('/').pop();
    if (!name) return null;

    // Get the direct image URL via Wikimedia API
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(name)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      const pages = data.query?.pages;
      const pageId = Object.keys(pages)[0];
      return pages[pageId]?.imageinfo?.[0]?.thumburl || null;
    } catch {
      return null;
    }
  }

  return filename;
}
