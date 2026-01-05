/**
 * Editorial Audit Script for Remaining Telugu Movies
 * 
 * Applies rating benchmarks, normalizes categories, and adds cult tags
 * Following strict editorial guidelines with no fan-service inflation
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// BENCHMARK DEFINITIONS
// ============================================================================

type Category = 'masterpiece' | 'must-watch' | 'mass-classic' | 'highly-recommended' | 'watchable' | 'one-time-watch';

interface RatingRange {
  min: number;
  max: number;
  category: Category;
  boost: number;
}

const RATING_RANGES: RatingRange[] = [
  { min: 9.2, max: 10.0, category: 'masterpiece', boost: 0.8 },
  { min: 8.6, max: 9.1, category: 'must-watch', boost: 0.4 },
  { min: 8.2, max: 8.5, category: 'mass-classic', boost: 0.6 },
  { min: 7.8, max: 8.1, category: 'highly-recommended', boost: 0.2 },
  { min: 6.8, max: 7.7, category: 'watchable', boost: -0.2 },
  { min: 0, max: 6.7, category: 'one-time-watch', boost: -0.4 },
];

// Verified canonical masterpieces (9.0+ only)
const VERIFIED_MASTERPIECES = new Set([
  'mayabazar-1957', 'pathala-bhairavi-1951', 'malliswari-1951',
  'sankarabharanam-1980', 'sagara-sangamam-1983', 'rrr-2022',
  'magadheera-2009', 'baahubali-2-the-conclusion-2017',
  'sri-venkateswara-mahatmyam-1960', 'lava-kusa-1963'
]);

// Verified mass classics (blockbusters with cultural impact)
const VERIFIED_MASS_CLASSICS = new Set([
  'athadu-2005', 'pokiri-2006', 'okkadu-2003', 'khaleja-2010',
  'rangasthalam-2018', 'arjun-reddy-2017', 'eega-2012',
  'dookudu-2011', 'gabbar-singh-2012', 'julayi-2012',
  'race-gurram-2014', 'temper-2015', 'srimanthudu-2015',
  'attarintiki-daredi-2013', 'geetha-govindam-2018',
  'pushpa-the-rise-2021', 'ala-vaikunthapurramuloo-2020'
]);

// Movies with suspicious TMDB ratings that need capping
const OVERRATED_CAPS: Record<string, number> = {
  'killer-1992': 7.5,
  'crrush-2021': 7.2,
  'sher-2015': 7.0,
  'maisamma-ips-2007': 6.5,
  'kerintha-2015': 7.0,
  'sainma-2015': 7.2,
  'yagam-2010': 7.0,
  'malini-co-2015': 6.8,
  'kanchanamala-cable-tv-2005': 7.5,
  'kudirithe-kappu-coffee-2011': 7.5,
  'akhanda-2-thaandavam-2025': 7.5,
  'telugu-veera-levara-1995': 7.0,
  'lakshmi-nivasam-1968': 7.5,
};

// Known cult classics
const CULT_CLASSICS = new Set([
  'mayabazar-1957', 'pathala-bhairavi-1951', 'sagara-sangamam-1983',
  'sankarabharanam-1980', 'swayamkrushi-1987', 'geethanjali-1989',
  'kshana-kshanam-1991', 'aditya-369-1991', 'money-1993',
  'gaayam-1993', 'april-1st-vidudala-1991', 'chantabbai-1986',
  'ladies-tailor-1986', 'aha-naa-pellanta-1987', 'mister-pellam-1993',
  'samsaram-oka-chadarangam-1987', 'pelli-pustakam-1991',
  'jagadeka-veerudu-athiloka-sundari-1990', 'kondaveeti-donga-1990',
  'gang-leader-1991', 'rowdy-alludu-1991', 'gharana-mogudu-1992',
  'allari-alludu-1993', 'muta-mestri-1993', 'pedarayudu-1995',
  'pellichesukundam-1996', 'ninne-pelladatha-1996',
  'preminchukundam-raa-1997', 'anaganaga-oka-roju-1997',
  'khushi-2001', 'nuvvostanante-nenoddantana-2005',
  'bommarillu-2006', 'godavari-2006', 'happy-2006',
  'jalsa-2008', 'kick-2009', 'arjun-reddy-2017',
  'ala-modalaindi-2011', 'pelli-choopulu-2016'
]);

// Recent films (post-2020) that shouldn't get legacy boosts
const RECENT_FILMS_YEAR = 2020;

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

interface Movie {
  slug: string;
  title: string;
  year: number | null;
  hero: string | null;
  director: string | null;
  tmdb_rating: number | null;
}

interface AuditedMovie extends Movie {
  original_rating: number | null;
  adjusted_rating: number;
  category: Category;
  cult: boolean;
  change: 'upgraded' | 'downgraded' | 'unchanged' | 'new';
  reason: string;
}

interface AuditReport {
  total_movies: number;
  upgrades: number;
  downgrades: number;
  unchanged: number;
  overrated_flags: string[];
  underrated_flags: string[];
  cult_discovered: string[];
  category_distribution: Record<Category, number>;
  movies: AuditedMovie[];
}

function getCategoryFromRating(rating: number): Category {
  for (const range of RATING_RANGES) {
    if (rating >= range.min && rating <= range.max) {
      return range.category;
    }
  }
  return 'one-time-watch';
}

function calculateAdjustedRating(movie: Movie): { rating: number; reason: string } {
  const slug = movie.slug;
  const tmdbRating = movie.tmdb_rating || 5.0;
  const year = movie.year || 2020;
  
  let adjustedRating = tmdbRating;
  let reasons: string[] = [];
  
  // Step 1: Apply overrated caps for suspicious TMDB ratings
  if (OVERRATED_CAPS[slug]) {
    const cap = OVERRATED_CAPS[slug];
    if (adjustedRating > cap) {
      adjustedRating = cap;
      reasons.push(`capped from ${tmdbRating} to ${cap} (suspicious TMDB)`);
    }
  }
  
  // Step 2: Apply verified masterpiece boost
  if (VERIFIED_MASTERPIECES.has(slug)) {
    adjustedRating = Math.max(adjustedRating, 9.0);
    if (adjustedRating < 9.2) adjustedRating = 9.2;
    reasons.push('verified masterpiece boost');
  }
  
  // Step 3: Apply verified mass classic boost
  if (VERIFIED_MASS_CLASSICS.has(slug)) {
    if (adjustedRating < 8.2) {
      adjustedRating = Math.min(adjustedRating + 0.6, 8.5);
      reasons.push('mass classic boost +0.6');
    }
  }
  
  // Step 4: Cap recent films without legacy
  if (year >= RECENT_FILMS_YEAR && !VERIFIED_MASS_CLASSICS.has(slug)) {
    if (adjustedRating > 8.5) {
      adjustedRating = 8.5;
      reasons.push(`recent film cap (${year})`);
    }
  }
  
  // Step 5: Apply era-based adjustments for classics
  if (year && year < 1980 && adjustedRating >= 7.0) {
    // Pre-1980 films with good ratings get a small legacy boost
    if (!VERIFIED_MASTERPIECES.has(slug)) {
      adjustedRating = Math.min(adjustedRating + 0.3, 8.9);
      reasons.push('pre-1980 legacy boost +0.3');
    }
  }
  
  // Step 6: Apply cult classic boost
  if (CULT_CLASSICS.has(slug) && adjustedRating < 8.0) {
    adjustedRating = Math.min(adjustedRating + 0.2, 8.0);
    reasons.push('cult classic boost +0.2');
  }
  
  // Step 7: Floor at 5.0, ceiling at 9.5
  adjustedRating = Math.max(5.0, Math.min(9.5, adjustedRating));
  
  // Round to 1 decimal
  adjustedRating = Math.round(adjustedRating * 10) / 10;
  
  return {
    rating: adjustedRating,
    reason: reasons.length > 0 ? reasons.join('; ') : 'no adjustment'
  };
}

function determineCult(movie: Movie): boolean {
  const slug = movie.slug;
  const year = movie.year || 2020;
  
  // Explicit cult classics
  if (CULT_CLASSICS.has(slug)) return true;
  
  // Films 25+ years old with decent rating
  if (year < 2000 && (movie.tmdb_rating || 0) >= 7.0) {
    return true;
  }
  
  // Films 15+ years old with high rating
  if (year < 2010 && (movie.tmdb_rating || 0) >= 8.0) {
    return true;
  }
  
  return false;
}

function auditMovie(movie: Movie): AuditedMovie {
  const { rating, reason } = calculateAdjustedRating(movie);
  const category = getCategoryFromRating(rating);
  const cult = determineCult(movie);
  
  const originalRating = movie.tmdb_rating;
  let change: 'upgraded' | 'downgraded' | 'unchanged' | 'new' = 'new';
  
  if (originalRating !== null) {
    const diff = rating - originalRating;
    if (diff > 0.3) change = 'upgraded';
    else if (diff < -0.3) change = 'downgraded';
    else change = 'unchanged';
  }
  
  return {
    ...movie,
    original_rating: originalRating,
    adjusted_rating: rating,
    category,
    cult,
    change,
    reason
  };
}

// ============================================================================
// MAIN AUDIT
// ============================================================================

async function runAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EDITORIAL AUDIT: Remaining Telugu Movies');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Load remaining movies
  const remainingData = JSON.parse(fs.readFileSync('docs/REMAINING-MOVIES.json', 'utf-8'));
  
  const allMovies: Movie[] = [
    ...remainingData.movies.blockbusters.map((m: any) => ({ ...m, title: m.title, year: m.year })),
    ...remainingData.movies.classics.map((m: any) => ({ ...m, title: m.title, year: m.year })),
    ...remainingData.movies.high_rated.map((m: any) => ({ ...m, title: m.title, year: m.year })),
    ...remainingData.movies.mid_rated.map((m: any) => ({ ...m, title: m.title, year: m.year })),
    ...remainingData.movies.low_rated.map((m: any) => ({ ...m, title: m.title, year: m.year })),
  ];
  
  console.log(`📚 Loaded ${allMovies.length} movies for audit`);
  console.log('');
  
  // Run audit on all movies
  const auditedMovies: AuditedMovie[] = [];
  const report: AuditReport = {
    total_movies: allMovies.length,
    upgrades: 0,
    downgrades: 0,
    unchanged: 0,
    overrated_flags: [],
    underrated_flags: [],
    cult_discovered: [],
    category_distribution: {
      'masterpiece': 0,
      'must-watch': 0,
      'mass-classic': 0,
      'highly-recommended': 0,
      'watchable': 0,
      'one-time-watch': 0
    },
    movies: []
  };
  
  for (const movie of allMovies) {
    const audited = auditMovie(movie);
    auditedMovies.push(audited);
    
    // Track changes
    if (audited.change === 'upgraded') {
      report.upgrades++;
      report.underrated_flags.push(`${audited.title} (${audited.year}): ${audited.original_rating} → ${audited.adjusted_rating}`);
    } else if (audited.change === 'downgraded') {
      report.downgrades++;
      report.overrated_flags.push(`${audited.title} (${audited.year}): ${audited.original_rating} → ${audited.adjusted_rating}`);
    } else {
      report.unchanged++;
    }
    
    // Track category distribution
    report.category_distribution[audited.category]++;
    
    // Track cult discoveries
    if (audited.cult && audited.category !== 'masterpiece' && audited.category !== 'must-watch') {
      report.cult_discovered.push(`${audited.title} (${audited.year}) - ${audited.category}`);
    }
  }
  
  report.movies = auditedMovies;
  
  // Output summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AUDIT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Total Movies: ${report.total_movies}`);
  console.log(`Upgrades: ${report.upgrades}`);
  console.log(`Downgrades: ${report.downgrades}`);
  console.log(`Unchanged: ${report.unchanged}`);
  console.log('');
  
  console.log('CATEGORY DISTRIBUTION:');
  for (const [cat, count] of Object.entries(report.category_distribution)) {
    const bar = '█'.repeat(Math.ceil(count / 100));
    console.log(`  ${cat.padEnd(20)}: ${count.toString().padStart(5)} ${bar}`);
  }
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 OVERRATED (Downgraded)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  report.overrated_flags.slice(0, 30).forEach(f => console.log(`  ${f}`));
  if (report.overrated_flags.length > 30) {
    console.log(`  ... and ${report.overrated_flags.length - 30} more`);
  }
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟢 UNDERRATED (Upgraded)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  report.underrated_flags.slice(0, 30).forEach(f => console.log(`  ${f}`));
  if (report.underrated_flags.length > 30) {
    console.log(`  ... and ${report.underrated_flags.length - 30} more`);
  }
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 CULT CLASSICS DISCOVERED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  report.cult_discovered.slice(0, 50).forEach(f => console.log(`  ${f}`));
  if (report.cult_discovered.length > 50) {
    console.log(`  ... and ${report.cult_discovered.length - 50} more`);
  }
  console.log('');
  
  // Save outputs
  const auditOutput = {
    summary: {
      total_movies: report.total_movies,
      upgrades: report.upgrades,
      downgrades: report.downgrades,
      unchanged: report.unchanged,
      category_distribution: report.category_distribution
    },
    movies: {
      masterpiece: auditedMovies.filter(m => m.category === 'masterpiece'),
      'must-watch': auditedMovies.filter(m => m.category === 'must-watch'),
      'mass-classic': auditedMovies.filter(m => m.category === 'mass-classic'),
      'highly-recommended': auditedMovies.filter(m => m.category === 'highly-recommended'),
      watchable: auditedMovies.filter(m => m.category === 'watchable'),
      'one-time-watch': auditedMovies.filter(m => m.category === 'one-time-watch'),
    },
    flags: {
      overrated: report.overrated_flags,
      underrated: report.underrated_flags,
      cult_discovered: report.cult_discovered
    }
  };
  
  fs.writeFileSync('docs/AUDITED-MOVIES.json', JSON.stringify(auditOutput, null, 2));
  console.log('📄 Saved to docs/AUDITED-MOVIES.json');
  
  // Generate markdown report
  let markdown = `# Editorial Audit Report\n\n`;
  markdown += `**Generated**: ${new Date().toISOString().split('T')[0]}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n|--------|-------|\n`;
  markdown += `| Total Movies | ${report.total_movies} |\n`;
  markdown += `| Upgrades | ${report.upgrades} |\n`;
  markdown += `| Downgrades | ${report.downgrades} |\n`;
  markdown += `| Unchanged | ${report.unchanged} |\n\n`;
  
  markdown += `## Category Distribution\n\n`;
  markdown += `| Category | Count | % |\n|----------|-------|---|\n`;
  for (const [cat, count] of Object.entries(report.category_distribution)) {
    const pct = ((count / report.total_movies) * 100).toFixed(1);
    markdown += `| ${cat} | ${count} | ${pct}% |\n`;
  }
  markdown += `\n`;
  
  markdown += `## Top Masterpieces\n\n`;
  auditOutput.movies.masterpiece.slice(0, 10).forEach(m => {
    markdown += `- **${m.title}** (${m.year}) - ${m.adjusted_rating} ${m.cult ? '🔥 CULT' : ''}\n`;
  });
  markdown += `\n`;
  
  markdown += `## Top Mass Classics\n\n`;
  auditOutput.movies['mass-classic'].slice(0, 20).forEach(m => {
    markdown += `- **${m.title}** (${m.year}) - ${m.adjusted_rating} ${m.cult ? '🔥 CULT' : ''}\n`;
  });
  markdown += `\n`;
  
  markdown += `## Overrated (Top 20 Downgrades)\n\n`;
  markdown += `| Movie | Year | Before | After | Reason |\n|-------|------|--------|-------|--------|\n`;
  auditedMovies
    .filter(m => m.change === 'downgraded')
    .sort((a, b) => (b.original_rating || 0) - b.adjusted_rating - ((a.original_rating || 0) - a.adjusted_rating))
    .slice(0, 20)
    .forEach(m => {
      markdown += `| ${m.title} | ${m.year} | ${m.original_rating} | ${m.adjusted_rating} | ${m.reason} |\n`;
    });
  markdown += `\n`;
  
  markdown += `## Underrated (Top 20 Upgrades)\n\n`;
  markdown += `| Movie | Year | Before | After | Reason |\n|-------|------|--------|-------|--------|\n`;
  auditedMovies
    .filter(m => m.change === 'upgraded')
    .sort((a, b) => (b.adjusted_rating - (b.original_rating || 0)) - (a.adjusted_rating - (a.original_rating || 0)))
    .slice(0, 20)
    .forEach(m => {
      markdown += `| ${m.title} | ${m.year} | ${m.original_rating} | ${m.adjusted_rating} | ${m.reason} |\n`;
    });
  markdown += `\n`;
  
  markdown += `---\n\n*This report was auto-generated by the editorial audit script.*\n`;
  
  fs.writeFileSync('docs/AUDIT-REMAINING-REPORT.md', markdown);
  console.log('📄 Saved to docs/AUDIT-REMAINING-REPORT.md');
}

runAudit();


