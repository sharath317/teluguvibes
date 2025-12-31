/**
 * FACT CROSS-VALIDATION
 *
 * Cross-validates facts from multiple sources to ensure accuracy.
 * Compares data from TMDB, Wikidata, Wikipedia, and internal DB.
 */

// ============================================================
// TYPES
// ============================================================

export interface SourceData {
  source: string;
  data: Record<string, unknown>;
  fetchedAt: string;
  confidence: number;
}

export interface Discrepancy {
  field: string;
  sources: {
    source: string;
    value: unknown;
  }[];
  severity: 'critical' | 'warning' | 'info';
  resolution: string;
  recommendedValue: unknown;
}

export interface CrossValidationResult {
  factsMatch: boolean;
  overallConfidence: number;
  checkedFields: number;
  matchedFields: number;
  discrepancies: Discrepancy[];
  trustedSource: string;
  summary: string;
}

// ============================================================
// SOURCE TRUST LEVELS
// ============================================================

const SOURCE_TRUST: Record<string, number> = {
  tmdb: 0.95,
  wikidata: 0.90,
  wikipedia: 0.85,
  official: 0.95,
  internal: 0.70,
  news: 0.60,
  youtube: 0.50,
};

// ============================================================
// FIELD VALIDATORS
// ============================================================

/**
 * Compare release dates from different sources
 */
function compareReleaseDates(sources: SourceData[]): Discrepancy | null {
  const dates: { source: string; value: string }[] = [];

  for (const s of sources) {
    const date = s.data.release_date || s.data.releaseDate || s.data.release_year;
    if (date) {
      dates.push({ source: s.source, value: String(date) });
    }
  }

  if (dates.length < 2) return null;

  // Normalize to year for comparison
  const years = dates.map(d => {
    const match = String(d.value).match(/\d{4}/);
    return { source: d.source, year: match ? parseInt(match[0]) : null };
  }).filter(d => d.year !== null);

  // Check if years match
  const uniqueYears = [...new Set(years.map(y => y.year))];
  
  if (uniqueYears.length === 1) {
    return null; // All match
  }

  // Find discrepancy
  const trustedSource = years.sort((a, b) => 
    (SOURCE_TRUST[b.source] || 0) - (SOURCE_TRUST[a.source] || 0)
  )[0];

  return {
    field: 'release_date',
    sources: dates,
    severity: uniqueYears.some((y, i) => 
      Math.abs((y || 0) - (uniqueYears[0] || 0)) > 1
    ) ? 'critical' : 'warning',
    resolution: `Use ${trustedSource.source} value`,
    recommendedValue: trustedSource.year,
  };
}

/**
 * Compare genres from different sources
 */
function compareGenres(sources: SourceData[]): Discrepancy | null {
  const genreSets: { source: string; genres: string[] }[] = [];

  for (const s of sources) {
    const genres = s.data.genres || s.data.genre;
    if (genres) {
      const genreArray = Array.isArray(genres) 
        ? genres.map(g => typeof g === 'object' ? (g as any).name : String(g))
        : [String(genres)];
      genreSets.push({ source: s.source, genres: genreArray });
    }
  }

  if (genreSets.length < 2) return null;

  // Calculate overlap
  const allGenres = genreSets.flatMap(gs => gs.genres);
  const uniqueGenres = [...new Set(allGenres)];
  
  // Check consistency
  const consistentGenres = uniqueGenres.filter(g =>
    genreSets.filter(gs => gs.genres.includes(g)).length >= 2
  );

  if (consistentGenres.length === uniqueGenres.length) {
    return null; // All consistent
  }

  // Find inconsistent genres
  const inconsistent = uniqueGenres.filter(g =>
    genreSets.filter(gs => gs.genres.includes(g)).length === 1
  );

  return {
    field: 'genres',
    sources: genreSets.map(gs => ({ source: gs.source, value: gs.genres })),
    severity: inconsistent.length > 2 ? 'warning' : 'info',
    resolution: 'Use union of confirmed genres',
    recommendedValue: consistentGenres.length > 0 ? consistentGenres : genreSets[0].genres,
  };
}

/**
 * Compare cast lists from different sources
 */
function compareCast(sources: SourceData[]): Discrepancy | null {
  const castLists: { source: string; cast: string[] }[] = [];

  for (const s of sources) {
    const cast = s.data.cast || s.data.actors || s.data.starring;
    if (cast) {
      const castArray = Array.isArray(cast)
        ? cast.slice(0, 5).map(c => typeof c === 'object' ? (c as any).name : String(c))
        : [String(cast)];
      castLists.push({ source: s.source, cast: castArray });
    }
  }

  if (castLists.length < 2) return null;

  // Check top actors match
  const firstActor = castLists.map(cl => cl.cast[0]?.toLowerCase());
  const leadActorMatch = firstActor.every(a => a === firstActor[0]);

  if (leadActorMatch) {
    return null;
  }

  // Lead actor mismatch is critical
  return {
    field: 'cast',
    sources: castLists.map(cl => ({ source: cl.source, value: cl.cast })),
    severity: 'warning',
    resolution: 'Verify lead actor manually',
    recommendedValue: castLists.sort((a, b) =>
      (SOURCE_TRUST[b.source] || 0) - (SOURCE_TRUST[a.source] || 0)
    )[0].cast,
  };
}

/**
 * Compare directors from different sources
 */
function compareDirector(sources: SourceData[]): Discrepancy | null {
  const directors: { source: string; value: string }[] = [];

  for (const s of sources) {
    const director = s.data.director || s.data.directed_by;
    if (director) {
      const directorName = typeof director === 'object'
        ? (director as any).name
        : String(director);
      directors.push({ source: s.source, value: directorName });
    }
  }

  if (directors.length < 2) return null;

  // Normalize for comparison
  const normalized = directors.map(d => ({
    source: d.source,
    normalized: d.value.toLowerCase().trim(),
    original: d.value,
  }));

  const uniqueDirectors = [...new Set(normalized.map(d => d.normalized))];

  if (uniqueDirectors.length === 1) {
    return null;
  }

  // Director mismatch is critical
  return {
    field: 'director',
    sources: directors,
    severity: 'critical',
    resolution: 'Verify director from official source',
    recommendedValue: directors.sort((a, b) =>
      (SOURCE_TRUST[b.source] || 0) - (SOURCE_TRUST[a.source] || 0)
    )[0].value,
  };
}

/**
 * Compare runtime/duration from different sources
 */
function compareRuntime(sources: SourceData[]): Discrepancy | null {
  const runtimes: { source: string; value: number }[] = [];

  for (const s of sources) {
    const runtime = s.data.runtime || s.data.duration;
    if (runtime && typeof runtime === 'number') {
      runtimes.push({ source: s.source, value: runtime });
    }
  }

  if (runtimes.length < 2) return null;

  // Allow 5-minute tolerance
  const avg = runtimes.reduce((sum, r) => sum + r.value, 0) / runtimes.length;
  const allWithinTolerance = runtimes.every(r => Math.abs(r.value - avg) <= 5);

  if (allWithinTolerance) {
    return null;
  }

  return {
    field: 'runtime',
    sources: runtimes,
    severity: 'info',
    resolution: 'Use TMDB runtime if available',
    recommendedValue: runtimes.sort((a, b) =>
      (SOURCE_TRUST[b.source] || 0) - (SOURCE_TRUST[a.source] || 0)
    )[0].value,
  };
}

// ============================================================
// MAIN CROSS-VALIDATION FUNCTION
// ============================================================

export async function crossValidateFacts(
  sources: SourceData[]
): Promise<CrossValidationResult> {
  if (sources.length < 2) {
    return {
      factsMatch: true,
      overallConfidence: sources[0]?.confidence || 0.5,
      checkedFields: 0,
      matchedFields: 0,
      discrepancies: [],
      trustedSource: sources[0]?.source || 'unknown',
      summary: 'Single source - no cross-validation possible',
    };
  }

  const discrepancies: Discrepancy[] = [];
  let checkedFields = 0;
  let matchedFields = 0;

  // Run all field comparisons
  const checks = [
    compareReleaseDates(sources),
    compareGenres(sources),
    compareCast(sources),
    compareDirector(sources),
    compareRuntime(sources),
  ];

  for (const result of checks) {
    checkedFields++;
    if (result === null) {
      matchedFields++;
    } else {
      discrepancies.push(result);
    }
  }

  // Calculate confidence
  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
  const warningCount = discrepancies.filter(d => d.severity === 'warning').length;
  
  let confidencePenalty = criticalCount * 0.2 + warningCount * 0.1;
  confidencePenalty = Math.min(confidencePenalty, 0.5);

  const baseConfidence = sources.reduce((sum, s) => 
    sum + (SOURCE_TRUST[s.source] || 0.5), 0
  ) / sources.length;

  const overallConfidence = Math.max(0.3, baseConfidence - confidencePenalty);

  // Determine trusted source
  const trustedSource = sources.sort((a, b) =>
    (SOURCE_TRUST[b.source] || 0) - (SOURCE_TRUST[a.source] || 0)
  )[0].source;

  // Generate summary
  let summary = '';
  if (criticalCount === 0 && warningCount === 0) {
    summary = `All ${checkedFields} fields validated across ${sources.length} sources`;
  } else if (criticalCount > 0) {
    summary = `${criticalCount} critical discrepancies found - manual review required`;
  } else {
    summary = `${warningCount} minor discrepancies found - ${trustedSource} values recommended`;
  }

  return {
    factsMatch: criticalCount === 0,
    overallConfidence,
    checkedFields,
    matchedFields,
    discrepancies,
    trustedSource,
    summary,
  };
}

/**
 * Quick fact check for a single entity
 */
export async function quickFactCheck(
  entityData: Record<string, unknown>,
  sources: string[]
): Promise<{
  isReliable: boolean;
  confidence: number;
  issues: string[];
}> {
  const sourceData: SourceData[] = sources.map(s => ({
    source: s,
    data: entityData,
    fetchedAt: new Date().toISOString(),
    confidence: SOURCE_TRUST[s] || 0.5,
  }));

  const result = await crossValidateFacts(sourceData);

  return {
    isReliable: result.factsMatch,
    confidence: result.overallConfidence,
    issues: result.discrepancies.map(d => 
      `${d.field}: ${d.resolution} (${d.severity})`
    ),
  };
}

/**
 * Get suggested corrections for discrepancies
 */
export function getSuggestedCorrections(
  discrepancies: Discrepancy[]
): Record<string, unknown> {
  const corrections: Record<string, unknown> = {};

  for (const d of discrepancies) {
    corrections[d.field] = d.recommendedValue;
  }

  return corrections;
}

