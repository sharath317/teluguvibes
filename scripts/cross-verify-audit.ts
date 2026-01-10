#!/usr/bin/env npx tsx
/**
 * CROSS-VERIFICATION AUDIT v2.0
 * 
 * Smart audit system that identifies movies with potentially wrong data by:
 * 1. Actor birth year validation (can't act before being born/too young)
 * 2. Year/slug mismatch detection
 * 3. Data anomaly patterns
 * 4. Cross-reference validation
 * 5. Director filmography validation
 * 
 * Usage:
 *   npx tsx scripts/cross-verify-audit.ts                    # Full audit
 *   npx tsx scripts/cross-verify-audit.ts --actor="Krishna"  # Audit specific actor
 *   npx tsx scripts/cross-verify-audit.ts --fix              # Auto-fix obvious issues
 *   npx tsx scripts/cross-verify-audit.ts --export           # Export issues to JSON
 *   npx tsx scripts/cross-verify-audit.ts --severity=HIGH    # Filter by severity
 *   npx tsx scripts/cross-verify-audit.ts --decade=1990      # Filter by decade
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// COMPREHENSIVE ACTOR DATABASE
// ============================================================

const ACTOR_BIRTH_YEARS: Record<string, number> = {
  // LEGENDARY ACTORS (Pre-1950)
  'Chittor V. Nagaiah': 1904,
  'V. Nagayya': 1904,
  'S.V. Ranga Rao': 1918,
  'Relangi Venkata Ramaiah': 1910,
  'Relangi': 1910,
  'Gummadi Venkateswara Rao': 1927,
  'Gummadi': 1927,
  'Kanta Rao': 1924,
  'Jaggayya': 1928,
  'Sarada': 1945,
  
  // GOLDEN ERA HEROES (1920s-1940s birth)
  'N.T. Rama Rao': 1923,
  'NTR': 1923,
  'Akkineni Nageswara Rao': 1924,
  'ANR': 1924,
  'Nagabhushanam': 1924,
  'Kongara Jaggaiah': 1928,
  'Haranath': 1928,
  'Jamuna': 1936,
  'Savitri': 1935,
  'Sobhan Babu': 1937,
  'Shoban Babu': 1937,
  'Krishnam Raju': 1940,
  'Uppalapati Krishnam Raju': 1940,
  
  // SUPERSTAR ERA (1940s-1960s birth)
  'Krishna': 1943,
  'Superstar Krishna': 1943,
  'Ghattamaneni Krishna': 1943,
  'Mohan Babu': 1950,
  'M. Mohan Babu': 1950,
  'Rajendra Prasad': 1954,
  'Chiranjeevi': 1955,
  'Megastar Chiranjeevi': 1955,
  'Konidela Chiranjeevi': 1955,
  'Nagarjuna': 1959,
  'Nagarjuna Akkineni': 1959,
  'Akkineni Nagarjuna': 1959,
  'Nandamuri Balakrishna': 1960,
  'Balakrishna': 1960,
  'NBK': 1960,
  'Venkatesh': 1960,
  'Daggubati Venkatesh': 1960,
  'Victory Venkatesh': 1960,
  'Jagapathi Babu': 1962,
  'Jagapati Babu': 1962,
  'Suman': 1960,
  'Sarath Kumar': 1954,
  'R. Sarathkumar': 1954,
  
  // 1960s-1970s BIRTH
  'Ravi Teja': 1968,
  'Mass Maharaja Ravi Teja': 1968,
  'Srikanth': 1968,
  'Pawan Kalyan': 1971,
  'Power Star Pawan Kalyan': 1971,
  'Konidela Pawan Kalyan': 1971,
  'Sunil': 1973,
  'Sunil Varma': 1973,
  'Mahesh Babu': 1975,
  'Prince Mahesh Babu': 1975,
  'Ghattamaneni Mahesh Babu': 1975,
  'Nandamuri Kalyan Ram': 1978,
  'Kalyan Ram': 1978,
  'Prabhas': 1979,
  'Rebel Star Prabhas': 1979,
  'Uppalapati Venkata Satyanarayana Prabhas Raju': 1979,
  'Siddharth': 1979,
  'Siddharth Suryanarayan': 1979,
  
  // NEW GENERATION (1980s birth)
  'Allu Arjun': 1982,
  'Stylish Star Allu Arjun': 1982,
  'Bunny': 1982,
  'N.T. Rama Rao Jr.': 1983,
  'Jr. NTR': 1983,
  'NTR Jr.': 1983,
  'Young Tiger NTR': 1983,
  'Nithin': 1983,
  'Nithiin': 1983,
  'Nani': 1984,
  'Natural Star Nani': 1984,
  'Naveen Babu Ghanta': 1984,
  'Rana Daggubati': 1984,
  'Sharwanand': 1984,
  'Ram Pothineni': 1988,
  'Ram': 1988,
  'RAPO': 1988,
  'Ram Charan': 1985,
  'Ram Charan Tej': 1985,
  'Mega Power Star Ram Charan': 1985,
  'Naga Chaitanya': 1986,
  'Akkineni Naga Chaitanya': 1986,
  'Chay': 1986,
  'Bellamkonda Sreenivas': 1987,
  'Bellamkonda Sai Sreenivas': 1987,
  
  // 1990s BIRTH (Young Heroes)
  'Varun Tej': 1990,
  'Varun Tej Konidela': 1990,
  'Mega Prince Varun Tej': 1990,
  'Sundeep Kishan': 1987,
  'Aadi Saikumar': 1991,
  'Aadi': 1991,
  'Nikhil Siddhartha': 1984,
  'Nikhil': 1984,
  'Sushanth': 1983,
  'Sushanth A': 1983,
  'Naveen Polishetty': 1989,
  'Vishwak Sen': 1994,
  'Vijay Deverakonda': 1989,
  'Rowdy Vijay Deverakonda': 1989,
  'Sree Vishnu': 1985,
  'Satyadev': 1983,
  'Satyadev Kancharana': 1983,
  'Adivi Sesh': 1985,
  'Raj Tarun': 1991,
  
  // CHARACTER ACTORS & SUPPORTING
  'Murali Mohan': 1949,
  'Chandra Mohan': 1946,
  'Rao Gopal Rao': 1937,
  'Gollapudi Maruti Rao': 1939,
  'Kaikala Satyanarayana': 1935,
  'Sarath Babu': 1951,
  'Tanikella Bharani': 1956,
  'Brahmanandam': 1956,
  'Kota Srinivasa Rao': 1948,
  'M.S. Narayana': 1951,
  'Venu Madhav': 1968,
  'Ali': 1968,
  'Supreeth': 1967,
  'Prakash Raj': 1965,
  'Nassar': 1958,
  'Posani Krishna Murali': 1961,
  'Prudhviraj': 1962,
  'Raghu Babu': 1962,
  'Jaya Prakash Reddy': 1946,
  'Ajay': 1970,
  'Ajay Ghosh': 1970,
  'Subbaraju': 1974,
  'Vennela Kishore': 1980,
  'Saptagiri': 1983,
  'Priyadarshi': 1987,
  'Rahul Ramakrishna': 1988,
  
  // HEROINES
  'Anushka Shetty': 1981,
  'Samantha Ruth Prabhu': 1987,
  'Samantha': 1987,
  'Kajal Aggarwal': 1985,
  'Tamanna Bhatia': 1989,
  'Tamannaah': 1989,
  'Pooja Hegde': 1990,
  'Rashmika Mandanna': 1996,
  'Keerthy Suresh': 1992,
  'Sai Pallavi': 1992,
  'Shruti Haasan': 1986,
  'Rakul Preet Singh': 1990,
  'Nayanthara': 1984,
  'Trisha': 1983,
  'Trisha Krishnan': 1983,
  'Hansika Motwani': 1991,
  'Ileana D\'Cruz': 1987,
  'Ileana': 1987,
  'Shriya Saran': 1982,
  'Genelia D\'Souza': 1987,
  'Genelia': 1987,
  'Bhoomika Chawla': 1978,
  'Bhumika Chawla': 1978,
  'Soundarya': 1972,
  'Ramya Krishna': 1970,
  'Ramya Krishnan': 1970,
  'Roja': 1973,
  'Roja Selvamani': 1973,
  'Meena': 1976,
  'Simran': 1976,
  'Simran Bagga': 1976,
  'Laila': 1977,
  'Sneha': 1981,
  'Sneha Prasanna': 1981,
  'Asin': 1985,
  'Asin Thottumkal': 1985,
  'Priyamani': 1984,
  'Priya Mani': 1984,
  'Nithya Menen': 1988,
  'Nithya Menon': 1988,
  'Regina Cassandra': 1990,
  'Lavanya Tripathi': 1990,
  'Rashi Khanna': 1990,
  'Raashi Khanna': 1990,
  'Nabha Natesh': 1995,
  'Krithi Shetty': 2003,
  'Sreeleela': 2001,
  
  // CLASSIC HEROINES
  'Shobana': 1970,
  'Shobhana': 1970,
  'Vijayashanti': 1965,
  'Vijayashanthi': 1965,
  'Sridevi': 1963,
  'Jayasudha': 1958,
  'Jayaprada': 1962,
  'Jaya Prada': 1962,
  'Radhika': 1966,
  'Radhika Sarathkumar': 1966,
  'Suhasini': 1961,
  'Suhasini Maniratnam': 1961,
  'Bhanupriya': 1966,
  'Radha': 1958,
  'Silk Smitha': 1960,
  'Madhavi': 1965,
  'Revathi': 1966,
  
  // DIRECTORS (for cross-reference)
  'S.S. Rajamouli': 1973,
  'Rajamouli': 1973,
  'Trivikram Srinivas': 1971,
  'Trivikram': 1971,
  'Sukumar': 1970,
  'Koratala Siva': 1973,
  'Boyapati Srinu': 1970,
  'Harish Shankar': 1978,
  'Anil Ravipudi': 1984,
  'Parasuram': 1981,
  'Vamshi Paidipally': 1978,
  
  // MULTI-INDUSTRY ACTORS
  'Rajinikanth': 1950,
  'Kamal Haasan': 1954,
  'Mammootty': 1951,
  'Mohanlal': 1960,
  'Ajith Kumar': 1971,
  'Vijay': 1974,
  'Thalapathy Vijay': 1974,
  'Suriya': 1975,
  'Dhanush': 1983,
  'Karthi': 1977,
  'Vikram': 1966,
  'Chiyaan Vikram': 1966,
  
  // BOLLYWOOD CROSSOVERS
  'Amitabh Bachchan': 1942,
  'Shah Rukh Khan': 1965,
  'Salman Khan': 1965,
  'Aamir Khan': 1965,
  'Hrithik Roshan': 1974,
  'Akshay Kumar': 1967,
  'Ajay Devgn': 1969,
  'Ranveer Singh': 1985,
  'Ranbir Kapoor': 1982,
  'Deepika Padukone': 1986,
  'Alia Bhatt': 1993,
  'Katrina Kaif': 1983,
  'Priyanka Chopra': 1982,
  
  // OLDER GENERATION ACTORS
  'Bhanuchander': 1958,
  'Vinod Kumar': 1960,
  'Rajasekhar': 1960,
  'Dr. Rajasekhar': 1960,
  'Naresh': 1960,
  'Srihari': 1960,
  'Dharmavarapu Subramanyam': 1956,
  'Sudhakar': 1948,
  'Allu Ramalingaiah': 1922,
  'Padmanabham': 1931,
  'Ramana Reddy': 1920,
  'Mikkilineni': 1910,
};

// Minimum acting age (typically 15-18 for leads, 5 for child roles)
const MIN_LEAD_AGE = 15;
const MIN_CHILD_ROLE_AGE = 5;

// ============================================================
// TYPES
// ============================================================

interface AuditIssue {
  movieId: string;
  slug: string;
  title: string;
  dbYear: number;
  issueType: 'ACTOR_TOO_YOUNG' | 'YEAR_SLUG_MISMATCH' | 'IMPOSSIBLE_YEAR' | 'DUPLICATE_TITLE_YEAR' | 'SUSPICIOUS_DATA' | 'MISSING_DATA' | 'DATA_CONFLICT';
  details: string;
  hero?: string;
  heroine?: string;
  director?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedFix?: string;
  autoFixable?: boolean;
  fixData?: Record<string, unknown>;
}

interface AuditStats {
  totalMovies: number;
  totalIssues: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byDecade: Record<string, number>;
  actorsWithIssues: string[];
}

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    actor?: string;
    fix?: boolean;
    export?: boolean;
    severity?: string;
    decade?: number;
    limit?: number;
    verbose?: boolean;
  } = {};

  for (const arg of args) {
    if (arg.startsWith('--actor=')) {
      options.actor = arg.split('=')[1];
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--export') {
      options.export = true;
    } else if (arg.startsWith('--severity=')) {
      options.severity = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--decade=')) {
      options.decade = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

// ============================================================
// AUDIT FUNCTIONS
// ============================================================

async function fetchMovies(options: ReturnType<typeof parseArgs>) {
  let query = supabase
    .from('movies')
    .select('id, slug, title_en, title_te, release_year, hero, heroine, director, synopsis, poster_url, tmdb_id')
    .order('release_year', { ascending: true });

  if (options.actor) {
    query = query.or(`hero.ilike.%${options.actor}%,heroine.ilike.%${options.actor}%`);
  }

  if (options.decade) {
    const startYear = options.decade;
    const endYear = options.decade + 9;
    query = query.gte('release_year', startYear).lte('release_year', endYear);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching movies:', error);
    return [];
  }

  return data || [];
}

function checkActorAge(
  personName: string,
  movieYear: number,
  role: 'hero' | 'heroine' | 'director'
): { valid: boolean; issue?: Partial<AuditIssue> } {
  const birthYear = ACTOR_BIRTH_YEARS[personName];
  
  if (!birthYear) {
    return { valid: true }; // Can't validate unknown actors
  }

  const age = movieYear - birthYear;

  if (age < 0) {
    return {
      valid: false,
      issue: {
        issueType: 'IMPOSSIBLE_YEAR',
        details: `${personName} (born ${birthYear}) listed as ${role} in movie from ${movieYear} - IMPOSSIBLE (${age} years before birth)`,
        severity: 'CRITICAL',
        suggestedFix: `Verify correct year and ${role} for this movie. ${personName} started career around ${birthYear + MIN_LEAD_AGE}.`,
        autoFixable: false,
      }
    };
  }

  if (role !== 'director' && age < MIN_CHILD_ROLE_AGE) {
    return {
      valid: false,
      issue: {
        issueType: 'IMPOSSIBLE_YEAR',
        details: `${personName} was only ${age} years old in ${movieYear} (born ${birthYear}) - too young even for child role`,
        severity: 'CRITICAL',
        suggestedFix: `This is likely wrong data. Check if year or cast is incorrect.`,
        autoFixable: false,
      }
    };
  }

  if (role !== 'director' && age < MIN_LEAD_AGE) {
    return {
      valid: false,
      issue: {
        issueType: 'ACTOR_TOO_YOUNG',
        details: `${personName} was only ${age} years old in ${movieYear} (born ${birthYear}) - verify if this is a child role`,
        severity: 'HIGH',
        suggestedFix: `If not a child role, verify correct year or cast`,
        autoFixable: false,
      }
    };
  }

  return { valid: true };
}

function checkYearSlugMismatch(slug: string, releaseYear: number): { valid: boolean; issue?: Partial<AuditIssue> } {
  const slugYear = slug.match(/-(\d{4})$/)?.[1];
  
  if (slugYear && parseInt(slugYear) !== releaseYear) {
    return {
      valid: false,
      issue: {
        issueType: 'YEAR_SLUG_MISMATCH',
        details: `Slug says ${slugYear} but release_year is ${releaseYear}`,
        severity: 'MEDIUM',
        suggestedFix: `Update slug to match year or verify correct year`,
        autoFixable: true,
        fixData: { slug: slug.replace(/-\d{4}$/, `-${releaseYear}`) }
      }
    };
  }

  return { valid: true };
}

function checkSuspiciousPatterns(movie: {
  title_en: string;
  release_year: number;
  hero?: string;
  synopsis?: string;
  poster_url?: string;
}): Partial<AuditIssue>[] {
  const issues: Partial<AuditIssue>[] = [];

  // Check for American movie synopsis mixed with Telugu movie
  if (movie.synopsis) {
    const suspiciousPatterns = [
      /American (crime |action |drama )?film/i,
      /Hollywood/i,
      /Los Angeles|New York|California/i,
      /20th Century Fox|Warner Bros|Universal/i,
      /Charles Bronson|Clint Eastwood/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(movie.synopsis)) {
        issues.push({
          issueType: 'DATA_CONFLICT',
          details: `Synopsis appears to be from a different (possibly American) movie: matches pattern "${pattern.source}"`,
          severity: 'CRITICAL',
          suggestedFix: `Clear synopsis and re-fetch from Telugu movie sources`,
          autoFixable: true,
          fixData: { synopsis: null, synopsis_te: null }
        });
        break;
      }
    }
  }

  // Future year movies (unless upcoming)
  if (movie.release_year > 2027) {
    issues.push({
      issueType: 'SUSPICIOUS_DATA',
      details: `Release year ${movie.release_year} is in the far future`,
      severity: 'LOW',
      suggestedFix: `Verify release year`,
    });
  }

  // Very old movies with modern actors
  if (movie.release_year < 1940 && movie.hero) {
    const birthYear = ACTOR_BIRTH_YEARS[movie.hero];
    if (birthYear && birthYear > 1920) {
      issues.push({
        issueType: 'SUSPICIOUS_DATA',
        details: `Movie from ${movie.release_year} has ${movie.hero} (born ${birthYear}) - verify this is correct`,
        severity: 'HIGH',
        suggestedFix: `Cross-reference with Wikipedia for correct cast`,
      });
    }
  }

  return issues;
}

async function runAudit(options: ReturnType<typeof parseArgs>) {
  console.log('\n🔍 CROSS-VERIFICATION AUDIT v2.0\n');
  console.log('='.repeat(70));
  
  if (options.actor) {
    console.log(`🎭 Filtering by actor: ${options.actor}`);
  }
  if (options.decade) {
    console.log(`📅 Filtering by decade: ${options.decade}s`);
  }
  if (options.severity) {
    console.log(`⚠️  Filtering by severity: ${options.severity}`);
  }
  console.log('');

  const issues: AuditIssue[] = [];
  const movies = await fetchMovies(options);

  if (movies.length === 0) {
    console.log('No movies found matching criteria.');
    return { issues: [], stats: null };
  }

  console.log(`📊 Analyzing ${movies.length} movies...\n`);

  // Progress tracking
  let processed = 0;
  const progressInterval = Math.max(1, Math.floor(movies.length / 20));

  for (const movie of movies) {
    processed++;
    if (processed % progressInterval === 0) {
      process.stdout.write(`\r  Progress: ${Math.round((processed / movies.length) * 100)}%`);
    }

    // 1. Check hero age
    if (movie.hero) {
      // Handle multiple heroes
      const heroes = movie.hero.split(',').map((h: string) => h.trim());
      for (const hero of heroes) {
        const result = checkActorAge(hero, movie.release_year, 'hero');
        if (!result.valid && result.issue) {
          issues.push({
            movieId: movie.id,
            slug: movie.slug,
            title: movie.title_en,
            dbYear: movie.release_year,
            hero: movie.hero,
            heroine: movie.heroine,
            director: movie.director,
            ...result.issue,
          } as AuditIssue);
        }
      }
    }

    // 2. Check heroine age
    if (movie.heroine) {
      const heroines = movie.heroine.split(',').map((h: string) => h.trim());
      for (const heroine of heroines) {
        const result = checkActorAge(heroine, movie.release_year, 'heroine');
        if (!result.valid && result.issue) {
          issues.push({
            movieId: movie.id,
            slug: movie.slug,
            title: movie.title_en,
            dbYear: movie.release_year,
            hero: movie.hero,
            heroine: movie.heroine,
            director: movie.director,
            ...result.issue,
          } as AuditIssue);
        }
      }
    }

    // 3. Check year/slug mismatch
    if (movie.slug && movie.release_year) {
      const result = checkYearSlugMismatch(movie.slug, movie.release_year);
      if (!result.valid && result.issue) {
        issues.push({
          movieId: movie.id,
          slug: movie.slug,
          title: movie.title_en,
          dbYear: movie.release_year,
          hero: movie.hero,
          heroine: movie.heroine,
          director: movie.director,
          ...result.issue,
        } as AuditIssue);
      }
    }

    // 4. Check suspicious patterns
    const suspiciousIssues = checkSuspiciousPatterns(movie);
    for (const issue of suspiciousIssues) {
      issues.push({
        movieId: movie.id,
        slug: movie.slug,
        title: movie.title_en,
        dbYear: movie.release_year,
        hero: movie.hero,
        heroine: movie.heroine,
        director: movie.director,
        ...issue,
      } as AuditIssue);
    }
  }

  console.log('\r  Progress: 100%\n');

  // 5. Check for duplicates
  console.log('🔄 Checking for duplicates...');
  const titleYearMap = new Map<string, typeof movies>();
  for (const movie of movies) {
    const key = `${movie.title_en?.toLowerCase()}-${movie.release_year}`;
    if (!titleYearMap.has(key)) {
      titleYearMap.set(key, []);
    }
    titleYearMap.get(key)!.push(movie);
  }

  for (const [, dupes] of titleYearMap) {
    if (dupes.length > 1) {
      for (const movie of dupes.slice(1)) {
        issues.push({
          movieId: movie.id,
          slug: movie.slug,
          title: movie.title_en,
          dbYear: movie.release_year,
          hero: movie.hero,
          heroine: movie.heroine,
          director: movie.director,
          issueType: 'DUPLICATE_TITLE_YEAR',
          details: `Found ${dupes.length} movies with same title+year: ${dupes.map(d => d.slug).join(', ')}`,
          severity: 'MEDIUM',
          suggestedFix: `Check if these are duplicates or different movies`,
        });
      }
    }
  }

  // Filter by severity if specified
  let filteredIssues = issues;
  if (options.severity) {
    filteredIssues = issues.filter(i => i.severity === options.severity);
  }

  // Calculate stats
  const stats: AuditStats = {
    totalMovies: movies.length,
    totalIssues: filteredIssues.length,
    bySeverity: {},
    byType: {},
    byDecade: {},
    actorsWithIssues: [],
  };

  const actorsSet = new Set<string>();
  for (const issue of filteredIssues) {
    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
    stats.byType[issue.issueType] = (stats.byType[issue.issueType] || 0) + 1;
    
    const decade = Math.floor(issue.dbYear / 10) * 10;
    stats.byDecade[decade] = (stats.byDecade[decade] || 0) + 1;
    
    if (issue.hero) actorsSet.add(issue.hero);
    if (issue.heroine) actorsSet.add(issue.heroine);
  }
  stats.actorsWithIssues = [...actorsSet];

  return { issues: filteredIssues, stats };
}

function printReport(issues: AuditIssue[], stats: AuditStats | null) {
  if (!stats) return;

  console.log('\n' + '='.repeat(70));
  console.log('📊 AUDIT SUMMARY\n');

  console.log(`📽️  Total movies analyzed: ${stats.totalMovies}`);
  console.log(`📝 Total issues found: ${stats.totalIssues}\n`);

  console.log('BY SEVERITY:');
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severityEmoji: Record<string, string> = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
  };
  for (const sev of severityOrder) {
    if (stats.bySeverity[sev]) {
      console.log(`  ${severityEmoji[sev]} ${sev}: ${stats.bySeverity[sev]}`);
    }
  }

  console.log('\nBY TYPE:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  • ${type}: ${count}`);
  }

  console.log('\nBY DECADE:');
  const decades = Object.keys(stats.byDecade).sort();
  for (const decade of decades) {
    console.log(`  • ${decade}s: ${stats.byDecade[decade]}`);
  }

  // Print critical issues
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  if (criticalIssues.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🔴 CRITICAL ISSUES (Need immediate attention)\n');

    for (const issue of criticalIssues.slice(0, 50)) {
      console.log(`📽️  ${issue.title} (${issue.dbYear})`);
      console.log(`    Slug: ${issue.slug}`);
      console.log(`    Type: ${issue.issueType}`);
      console.log(`    Issue: ${issue.details}`);
      if (issue.hero) console.log(`    Hero: ${issue.hero}`);
      if (issue.heroine) console.log(`    Heroine: ${issue.heroine}`);
      console.log(`    Fix: ${issue.suggestedFix}`);
      console.log('');
    }

    if (criticalIssues.length > 50) {
      console.log(`... and ${criticalIssues.length - 50} more CRITICAL issues\n`);
    }
  }

  // Print high severity issues
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  if (highIssues.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🟠 HIGH SEVERITY ISSUES\n');

    for (const issue of highIssues.slice(0, 30)) {
      console.log(`📽️  ${issue.title} (${issue.dbYear}): ${issue.details}`);
    }

    if (highIssues.length > 30) {
      console.log(`... and ${highIssues.length - 30} more HIGH severity issues\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Audit complete!\n');
}

async function autoFix(issues: AuditIssue[]) {
  const fixableIssues = issues.filter(i => i.autoFixable && i.fixData);
  
  if (fixableIssues.length === 0) {
    console.log('No auto-fixable issues found.');
    return;
  }

  console.log(`\n🔧 Auto-fixing ${fixableIssues.length} issues...\n`);

  let fixed = 0;
  for (const issue of fixableIssues) {
    const { error } = await supabase
      .from('movies')
      .update(issue.fixData!)
      .eq('id', issue.movieId);

    if (!error) {
      fixed++;
      console.log(`  ✓ Fixed: ${issue.title} - ${issue.issueType}`);
    } else {
      console.log(`  ✗ Failed: ${issue.title} - ${error.message}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed}/${fixableIssues.length} issues`);
}

function exportIssues(issues: AuditIssue[], stats: AuditStats | null) {
  const exportData = {
    generatedAt: new Date().toISOString(),
    stats,
    issues,
  };

  const filename = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
  writeFileSync(resolve(process.cwd(), 'docs', filename), JSON.stringify(exportData, null, 2));
  console.log(`\n📄 Exported to docs/${filename}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const options = parseArgs();
  
  console.log('\n🎬 Telugu Movie Database Cross-Verification Audit');
  console.log(`📊 Actor database contains ${Object.keys(ACTOR_BIRTH_YEARS).length} entries\n`);

  const { issues, stats } = await runAudit(options);

  printReport(issues, stats);

  if (options.export && stats) {
    exportIssues(issues, stats);
  }

  if (options.fix) {
    await autoFix(issues);
  }
}

main().catch(console.error);
