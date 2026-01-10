/**
 * Anomaly Detector
 * 
 * Detects data anomalies during enrichment using rules from cross-verify-audit.ts:
 * - Actor age validation
 * - Year/slug mismatch detection
 * - Data plausibility checks
 * - Source conflict detection
 */

import type { AnomalyFlag, AnomalyType, AnomalySeverity } from './types';

// ============================================================
// ACTOR BIRTH YEARS (from cross-verify-audit.ts)
// ============================================================

const ACTOR_BIRTH_YEARS: Record<string, number> = {
  // Legendary actors
  'Akkineni Nageswara Rao': 1923,
  'ANR': 1923,
  'Nageshwara Rao': 1923,
  'N. T. Rama Rao': 1923,
  'NTR': 1923,
  'Savitri': 1935,
  'S. V. Ranga Rao': 1918,
  'Ghantasala': 1922,
  'Relangi': 1910,
  'Sobhan Babu': 1937,
  'Krishna': 1943,
  'Superstar Krishna': 1943,

  // Classic era actors
  'Chiranjeevi': 1955,
  'Venkatesh': 1960,
  'Balakrishna': 1960,
  'Nagarjuna': 1959,
  'Mohan Babu': 1952,
  'Rajendra Prasad': 1956,
  'Jagapathi Babu': 1962,
  'Srikanth': 1968,
  
  // Current generation
  'Mahesh Babu': 1975,
  'Pawan Kalyan': 1971,
  'Jr. NTR': 1983,
  'Allu Arjun': 1982,
  'Ram Charan': 1985,
  'Prabhas': 1979,
  'Ravi Teja': 1968,
  'Nani': 1984,
  'Vijay Deverakonda': 1989,
  'Ram Pothineni': 1988,
  'Sai Dharam Tej': 1986,
  'Sharwanand': 1984,
  'Nithin': 1983,
  'Varun Tej': 1990,
  
  // Heroines (classic)
  'Jayasudha': 1958,
  'Sridevi': 1963,
  'Jayaprada': 1962,
  'Radhika': 1965,
  
  // Heroines (current)
  'Samantha': 1987,
  'Anushka Shetty': 1981,
  'Trisha': 1983,
  'Tamannaah': 1989,
  'Kajal Aggarwal': 1985,
  'Nayanthara': 1984,
  'Rashmika Mandanna': 1996,
  'Pooja Hegde': 1990,

  // Directors
  'K. Viswanath': 1930,
  'Bapu': 1933,
  'K. Raghavendra Rao': 1942,
  'S.S. Rajamouli': 1973,
  'Sukumar': 1970,
  'Trivikram': 1972,
  'Koratala Siva': 1975,
  'Vamsi Paidipally': 1978,
};

// Minimum acting age - actors typically don't debut before age 16
const MINIMUM_ACTING_AGE = 16;

// ============================================================
// ANOMALY DETECTION FUNCTIONS
// ============================================================

/**
 * Check if actor could have acted in a movie based on their age
 */
export function checkActorAge(
  actorName: string,
  movieYear: number
): AnomalyFlag | null {
  // Normalize actor name
  const normalizedName = actorName.trim();
  
  // Look up birth year
  let birthYear = ACTOR_BIRTH_YEARS[normalizedName];
  
  // Try partial matches
  if (!birthYear) {
    for (const [name, year] of Object.entries(ACTOR_BIRTH_YEARS)) {
      if (normalizedName.includes(name) || name.includes(normalizedName)) {
        birthYear = year;
        break;
      }
    }
  }
  
  if (!birthYear) {
    return null; // Can't verify without birth year
  }
  
  const ageAtRelease = movieYear - birthYear;
  
  if (ageAtRelease < MINIMUM_ACTING_AGE) {
    return {
      type: 'ACTOR_TOO_YOUNG',
      severity: 'HIGH',
      message: `${actorName} would have been ${ageAtRelease} years old in ${movieYear} (born ${birthYear})`,
      suggestedAction: `Verify release year or actor name for this movie`,
      autoFixable: false,
      metadata: {
        actorName,
        birthYear,
        movieYear,
        ageAtRelease,
      },
    };
  }
  
  // Warning for very young actors (16-20)
  if (ageAtRelease < 20) {
    return {
      type: 'ACTOR_TOO_YOUNG',
      severity: 'LOW',
      message: `${actorName} would have been only ${ageAtRelease} years old in ${movieYear}`,
      suggestedAction: `Consider if this was a debut or early career film`,
      autoFixable: false,
      metadata: {
        actorName,
        birthYear,
        movieYear,
        ageAtRelease,
      },
    };
  }
  
  return null;
}

/**
 * Check for year/slug mismatch
 */
export function checkYearSlugMismatch(
  slug: string,
  releaseYear: number
): AnomalyFlag | null {
  // Extract year from slug (format: movie-name-1990)
  const slugYearMatch = slug.match(/-(\d{4})$/);
  
  if (!slugYearMatch) {
    return null; // Slug doesn't contain year
  }
  
  const slugYear = parseInt(slugYearMatch[1]);
  
  if (slugYear !== releaseYear) {
    return {
      type: 'YEAR_MISMATCH',
      severity: slugYear - releaseYear > 5 ? 'HIGH' : 'MEDIUM',
      message: `Slug year (${slugYear}) doesn't match release year (${releaseYear})`,
      suggestedAction: `Update slug to use correct year, or verify release year`,
      autoFixable: true,
      metadata: {
        slug,
        slugYear,
        releaseYear,
        difference: Math.abs(slugYear - releaseYear),
      },
    };
  }
  
  return null;
}

/**
 * Check for implausible data values
 */
export function checkDataPlausibility(
  field: string,
  value: unknown
): AnomalyFlag | null {
  switch (field) {
    case 'runtime_minutes':
    case 'runtime': {
      const runtime = Number(value);
      if (runtime > 0 && runtime < 30) {
        return {
          type: 'DATA_IMPLAUSIBLE',
          severity: 'MEDIUM',
          message: `Runtime of ${runtime} minutes is unusually short for a feature film`,
          suggestedAction: `Verify if this is a short film or if data is in wrong units`,
          autoFixable: false,
          metadata: { field, value: runtime },
        };
      }
      if (runtime > 300) {
        return {
          type: 'DATA_IMPLAUSIBLE',
          severity: 'MEDIUM',
          message: `Runtime of ${runtime} minutes is unusually long`,
          suggestedAction: `Verify this is not a multi-part film counted together`,
          autoFixable: false,
          metadata: { field, value: runtime },
        };
      }
      break;
    }
    
    case 'release_year':
    case 'year': {
      const year = Number(value);
      if (year < 1920) {
        return {
          type: 'DATA_IMPLAUSIBLE',
          severity: 'HIGH',
          message: `Release year ${year} predates Telugu cinema`,
          suggestedAction: `Verify release year - Telugu cinema started around 1930s`,
          autoFixable: false,
          metadata: { field, value: year },
        };
      }
      if (year > new Date().getFullYear() + 1) {
        return {
          type: 'DATA_IMPLAUSIBLE',
          severity: 'HIGH',
          message: `Release year ${year} is in the future`,
          suggestedAction: `Mark as upcoming or fix the year`,
          autoFixable: false,
          metadata: { field, value: year },
        };
      }
      break;
    }
    
    case 'avg_rating':
    case 'rating': {
      const rating = Number(value);
      if (rating < 0 || rating > 10) {
        return {
          type: 'DATA_IMPLAUSIBLE',
          severity: 'HIGH',
          message: `Rating ${rating} is outside valid range (0-10)`,
          suggestedAction: `Fix rating value or check rating scale`,
          autoFixable: false,
          metadata: { field, value: rating },
        };
      }
      break;
    }
  }
  
  return null;
}

/**
 * Check for source conflicts between old and new values
 */
export function checkSourceConflict(
  field: string,
  oldValue: unknown,
  newValue: unknown,
  oldSource: string,
  newSource: string
): AnomalyFlag | null {
  // Skip if no old value
  if (oldValue === null || oldValue === undefined) {
    return null;
  }
  
  // Skip if values are the same
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
    return null;
  }
  
  // For arrays, check overlap percentage
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const oldSet = new Set(oldValue.map(String));
    const newSet = new Set(newValue.map(String));
    const intersection = [...oldSet].filter(x => newSet.has(x));
    const overlap = intersection.length / Math.max(oldSet.size, newSet.size);
    
    if (overlap < 0.5) {
      return {
        type: 'SOURCE_CONFLICT',
        severity: 'MEDIUM',
        message: `${field}: Less than 50% overlap between ${oldSource} and ${newSource} data`,
        suggestedAction: `Manually review which source is more accurate`,
        autoFixable: false,
        metadata: {
          field,
          oldSource,
          newSource,
          oldValue,
          newValue,
          overlapPercentage: overlap * 100,
        },
      };
    }
  }
  
  // For strings, check similarity
  if (typeof oldValue === 'string' && typeof newValue === 'string') {
    const similarity = calculateStringSimilarity(oldValue, newValue);
    
    if (similarity < 0.7) {
      return {
        type: 'SOURCE_CONFLICT',
        severity: 'MEDIUM',
        message: `${field}: Significant difference between ${oldSource} and ${newSource}`,
        suggestedAction: `Review conflicting values: "${oldValue}" vs "${newValue}"`,
        autoFixable: false,
        metadata: {
          field,
          oldSource,
          newSource,
          oldValue,
          newValue,
          similarity,
        },
      };
    }
  }
  
  return null;
}

/**
 * Check confidence threshold
 */
export function checkLowConfidence(
  field: string,
  confidence: number,
  threshold: number = 0.5
): AnomalyFlag | null {
  if (confidence < threshold) {
    return {
      type: 'LOW_CONFIDENCE',
      severity: confidence < 0.3 ? 'HIGH' : 'MEDIUM',
      message: `${field}: Confidence ${(confidence * 100).toFixed(0)}% is below threshold`,
      suggestedAction: `Seek additional sources to verify this data`,
      autoFixable: false,
      metadata: { field, confidence, threshold },
    };
  }
  
  return null;
}

/**
 * Check for missing required fields
 */
export function checkMissingRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): AnomalyFlag[] {
  const anomalies: AnomalyFlag[] = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    
    if (value === null || value === undefined || value === '') {
      anomalies.push({
        type: 'MISSING_REQUIRED',
        severity: 'HIGH',
        message: `Required field '${field}' is missing`,
        suggestedAction: `Enrich ${field} from available sources`,
        autoFixable: false,
        metadata: { field },
      });
    }
  }
  
  return anomalies;
}

// ============================================================
// COMPREHENSIVE ANOMALY CHECK
// ============================================================

export interface AnomalyCheckResult {
  anomalies: AnomalyFlag[];
  needsReview: boolean;
  reviewReasons: string[];
}

/**
 * Run all anomaly checks on a movie
 */
export function runAllAnomalyChecks(
  movie: {
    slug?: string;
    release_year?: number;
    hero?: string;
    heroine?: string;
    director?: string;
    cast?: string[];
    runtime_minutes?: number;
    avg_rating?: number;
    [key: string]: unknown;
  }
): AnomalyCheckResult {
  const anomalies: AnomalyFlag[] = [];
  const reviewReasons: string[] = [];
  
  // Year/slug mismatch
  if (movie.slug && movie.release_year) {
    const yearCheck = checkYearSlugMismatch(movie.slug, movie.release_year);
    if (yearCheck) {
      anomalies.push(yearCheck);
      reviewReasons.push(yearCheck.message);
    }
  }
  
  // Actor age checks
  const actorsToCheck = [
    movie.hero,
    movie.heroine,
    ...(movie.cast || []),
  ].filter(Boolean) as string[];
  
  for (const actor of actorsToCheck) {
    if (movie.release_year) {
      const ageCheck = checkActorAge(actor, movie.release_year);
      if (ageCheck && ageCheck.severity !== 'LOW') {
        anomalies.push(ageCheck);
        reviewReasons.push(ageCheck.message);
      }
    }
  }
  
  // Data plausibility checks
  const fieldsToCheck = ['runtime_minutes', 'release_year', 'avg_rating'];
  for (const field of fieldsToCheck) {
    if (movie[field] !== undefined) {
      const plausibilityCheck = checkDataPlausibility(field, movie[field]);
      if (plausibilityCheck) {
        anomalies.push(plausibilityCheck);
        reviewReasons.push(plausibilityCheck.message);
      }
    }
  }
  
  // Missing required fields
  const requiredFields = ['title_en', 'release_year', 'slug'];
  const missingChecks = checkMissingRequired(movie as Record<string, unknown>, requiredFields);
  anomalies.push(...missingChecks);
  reviewReasons.push(...missingChecks.map(a => a.message));
  
  // Determine if manual review needed
  const needsReview = anomalies.some(
    a => a.severity === 'CRITICAL' || a.severity === 'HIGH'
  );
  
  return { anomalies, needsReview, reviewReasons };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate string similarity (Dice coefficient)
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2).toLowerCase());
  }
  
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2).toLowerCase());
  }
  
  const intersection = [...bigrams1].filter(x => bigrams2.has(x)).length;
  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Get actor birth year from database
 */
export function getActorBirthYear(actorName: string): number | null {
  const normalizedName = actorName.trim();
  
  if (ACTOR_BIRTH_YEARS[normalizedName]) {
    return ACTOR_BIRTH_YEARS[normalizedName];
  }
  
  // Try partial match
  for (const [name, year] of Object.entries(ACTOR_BIRTH_YEARS)) {
    if (normalizedName.includes(name) || name.includes(normalizedName)) {
      return year;
    }
  }
  
  return null;
}

/**
 * Add a new actor birth year to the database
 */
export function addActorBirthYear(actorName: string, birthYear: number): void {
  ACTOR_BIRTH_YEARS[actorName] = birthYear;
}

