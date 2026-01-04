/**
 * Editorial Category Audit
 * 
 * Systematic cleanup of movie classifications:
 * 1. Rename "blockbuster" → "mass-classic"
 * 2. Add "cult" tag (true/false)
 * 3. Apply category rule engine
 * 4. Detect duplicates and conflicts
 * 5. Generate audit report
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const CATEGORY_DEFINITIONS = {
  'masterpiece': {
    min: 9.0,
    definition: 'Canonical Telugu cinema. Cross-generational impact. Studied and referenced.',
  },
  'must-watch': {
    min: 8.5,
    definition: 'Culturally or artistically significant. Ages well. Strong critical legacy.',
  },
  'mass-classic': {
    min: 8.0,
    definition: 'Wide popular recognition. Strong theatrical presence. Repeat value.',
  },
  'highly-recommended': {
    min: 7.5,
    definition: 'Quality entertainment. Worth seeking out.',
  },
  'recommended': {
    min: 7.0,
    definition: 'Solid viewing experience. Good for fans of genre/star.',
  },
  'watchable': {
    min: 6.5,
    definition: 'Enjoyable but non-essential. Niche or time-bound appeal.',
  },
  'one-time-watch': {
    min: 0,
    definition: 'Disposable. Little repeat or cultural value.',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CURATED LISTS FOR OVERRIDES
// ════════════════════════════════════════════════════════════════════════════

// Verified masterpieces (9.0+ only - cannot be changed)
const VERIFIED_MASTERPIECES = new Set([
  'mayabazar-1957',
  'pathala-bhairavi-1951',
  'malliswari-1951',
  'sagara-sangamam-1983',
  'rrr-2022',
  'magadheera-2009',
  'sri-venkateswara-mahatmyam-1960',
]);

// Devotional/Literary films that should be must-watch, not mass-classic
const ARTISTIC_FILMS = new Set([
  'sri-venkateswara-mahatmyam-1960',
  'kanyasulkam-1955',
  'sankarabharanam-1980',
  'swathi-kiranam-1992',
  'sagara-sangamam-1983',
  'thyagayya-1981',
  'mahanati-2018',
  'sri-ramaanjaneya-yuddham-1975',
  'bhookailas-1958',
  'lava-kusa-1963',
  'narthanasala-1963',
]);

// Commercial entertainers that should be mass-classic, not must-watch
const COMMERCIAL_ENTERTAINERS = new Set([
  'crrush-2021',
  'killer-1992',
  'kerintha-2015',
  'sher-2015',
  'yagam-2010',
  'maisamma-ips-2007',
  'malini-co-2015',
  'kudirithe-kappu-coffee-2011',
  'sainma-2015',
  'ashwamedham-1992',
  'telugu-veera-levara-1995',
]);

// Curated cult films (gained appreciation over time)
const CULT_FILMS = new Set([
  'kanchanamala-cable-tv-2005',
  'avakai-biryani-2008',
  'aditya-369-1991',
  'maryada-ramanna-2010',
  'bhairava-dweepam-1994',
  'anand-1971',
  'pushpak-vimaan-2024',
  'aa-okkati-adakku-1992',
  'dongala-bandi-2008',
  'yamaleela-1994',
  'money-1993',
  'chantabbai-1986',
  'ladies-tailor-1986',
  'aha-naa-pellanta-1987',
  'golmaal-2003',
  'pelli-pustakam-1991',
  'subhalagnam-1994',
  'i-liked-the-girl-1999',
]);

// Films that are niche/dated and should be watchable
const NICHE_FILMS = new Set([
  // Add specific slugs if needed for demotions
]);

// ════════════════════════════════════════════════════════════════════════════
// AUDIT TRACKING
// ════════════════════════════════════════════════════════════════════════════

interface AuditChange {
  title: string;
  slug: string;
  year: number;
  oldCategory: string;
  newCategory: string;
  reason: string;
  cultTagAdded: boolean;
}

interface AuditStats {
  totalMovies: number;
  categoryRenames: number;
  categoryOverrides: number;
  cultTagsAdded: number;
  duplicatesFound: string[];
  conflicts: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CORE AUDIT FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function shouldBeCult(slug: string, releaseYear: number, isBlockbuster: boolean, rating: number): boolean {
  // Explicitly curated cult films
  if (CULT_FILMS.has(slug)) return true;
  
  // Auto-detect: old film (15+ years), not a blockbuster flag, but high rating
  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;
  
  if (age >= 15 && !isBlockbuster && rating >= 7.8) {
    return true;
  }
  
  return false;
}

function determineCategory(
  slug: string,
  rating: number,
  currentCategory: string
): { category: string; reason: string } {
  // Rule A: Masterpiece - only verified list
  if (VERIFIED_MASTERPIECES.has(slug) && rating >= 9.0) {
    return { category: 'masterpiece', reason: 'verified_masterpiece' };
  }
  
  // Rule B: Artistic films → must-watch (regardless of rating in 8.0-9.0 range)
  if (ARTISTIC_FILMS.has(slug) && rating >= 8.0) {
    return { category: 'must-watch', reason: 'artistic_or_devotional' };
  }
  
  // Rule C: Commercial entertainers → mass-classic (cap at mass-classic)
  if (COMMERCIAL_ENTERTAINERS.has(slug)) {
    return { category: 'mass-classic', reason: 'commercial_entertainer' };
  }
  
  // Rule D: Niche films → watchable
  if (NICHE_FILMS.has(slug)) {
    return { category: 'watchable', reason: 'niche_or_dated' };
  }
  
  // Default: Rating-based assignment
  if (rating >= 9.0 && VERIFIED_MASTERPIECES.has(slug)) {
    return { category: 'masterpiece', reason: 'rating_based' };
  } else if (rating >= 8.5) {
    return { category: 'must-watch', reason: 'rating_based' };
  } else if (rating >= 8.0) {
    return { category: 'mass-classic', reason: 'rating_based' };
  } else if (rating >= 7.5) {
    return { category: 'highly-recommended', reason: 'rating_based' };
  } else if (rating >= 7.0) {
    return { category: 'recommended', reason: 'rating_based' };
  } else if (rating >= 6.5) {
    return { category: 'watchable', reason: 'rating_based' };
  } else {
    return { category: 'one-time-watch', reason: 'rating_based' };
  }
}

function detectDuplicates(movies: any[]): string[] {
  const titleYearMap = new Map<string, string[]>();
  const duplicates: string[] = [];
  
  for (const movie of movies) {
    const key = movie.movies.title_en?.toLowerCase().trim();
    if (!titleYearMap.has(key)) {
      titleYearMap.set(key, []);
    }
    titleYearMap.get(key)!.push(`${movie.movies.slug} (${movie.movies.release_year})`);
  }
  
  for (const [title, slugs] of titleYearMap) {
    if (slugs.length > 1) {
      duplicates.push(`"${title}": ${slugs.join(', ')}`);
    }
  }
  
  return duplicates;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN AUDIT FUNCTION
// ════════════════════════════════════════════════════════════════════════════

async function runAudit(applyChanges: boolean = false) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 EDITORIAL CATEGORY AUDIT ${applyChanges ? '(APPLYING)' : '(DRY RUN)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Fetch all reviews
  let allReviews: any[] = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('movie_reviews')
      .select(`
        id,
        movie_id,
        dimensions_json,
        movies!inner(
          title_en,
          slug,
          release_year,
          is_blockbuster,
          is_classic
        )
      `)
      .not('dimensions_json', 'is', null)
      .range(offset, offset + 500);

    if (error) {
      console.error('Error fetching reviews:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allReviews = allReviews.concat(data);
    offset += 500;
    if (data.length < 500) break;
  }

  const reviewsWithVerdict = allReviews.filter(
    r => r.dimensions_json?.verdict?.final_rating
  );

  console.log(`📊 Found ${reviewsWithVerdict.length} movies with verdicts`);
  console.log('');

  // Stats tracking
  const stats: AuditStats = {
    totalMovies: reviewsWithVerdict.length,
    categoryRenames: 0,
    categoryOverrides: 0,
    cultTagsAdded: 0,
    duplicatesFound: [],
    conflicts: [],
  };

  const changes: AuditChange[] = [];
  const categoryDistBefore: Record<string, number> = {};
  const categoryDistAfter: Record<string, number> = {};

  // Detect duplicates first
  stats.duplicatesFound = detectDuplicates(reviewsWithVerdict);

  for (const review of reviewsWithVerdict) {
    const movie = review.movies;
    const ed = review.dimensions_json;
    const rating = ed.verdict?.final_rating || 0;
    let oldCategory = ed.verdict?.category || 'unknown';
    
    // Track before distribution
    categoryDistBefore[oldCategory] = (categoryDistBefore[oldCategory] || 0) + 1;
    
    // Step 1: Global rename blockbuster → mass-classic
    if (oldCategory === 'blockbuster') {
      oldCategory = 'mass-classic';
      stats.categoryRenames++;
    }
    
    // Step 2: Determine correct category based on rules
    const { category: newCategory, reason } = determineCategory(
      movie.slug,
      rating,
      oldCategory
    );
    
    // Step 3: Determine cult tag
    const isCult = shouldBeCult(
      movie.slug,
      movie.release_year || 2020,
      movie.is_blockbuster || false,
      rating
    );
    
    const existingCult = ed.verdict?.cult || false;
    if (isCult && !existingCult) {
      stats.cultTagsAdded++;
    }
    
    // Track after distribution
    categoryDistAfter[newCategory] = (categoryDistAfter[newCategory] || 0) + 1;
    
    // Record if changed
    const originalCategory = ed.verdict?.category || 'unknown';
    if (originalCategory !== newCategory || (isCult && !existingCult)) {
      if (originalCategory !== newCategory && originalCategory !== 'blockbuster') {
        stats.categoryOverrides++;
      }
      
      changes.push({
        title: movie.title_en,
        slug: movie.slug,
        year: movie.release_year,
        oldCategory: originalCategory,
        newCategory,
        reason,
        cultTagAdded: isCult && !existingCult,
      });
    }
    
    // Apply changes if requested
    if (applyChanges) {
      const updatedDimensions = {
        ...ed,
        verdict: {
          ...ed.verdict,
          category: newCategory,
          cult: isCult,
        },
      };

      await supabase
        .from('movie_reviews')
        .update({ dimensions_json: updatedDimensions })
        .eq('id', review.id);
    }
  }

  // Print results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CATEGORY DISTRIBUTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('BEFORE → AFTER:');
  
  const allCategories = new Set([...Object.keys(categoryDistBefore), ...Object.keys(categoryDistAfter)]);
  for (const cat of allCategories) {
    const before = categoryDistBefore[cat] || 0;
    const after = categoryDistAfter[cat] || 0;
    const diff = after - before;
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
    console.log(`  ${cat.padEnd(20)}: ${before.toString().padStart(3)} → ${after.toString().padStart(3)} (${diffStr})`);
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AUDIT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Total movies:           ${stats.totalMovies}`);
  console.log(`  Category renames:       ${stats.categoryRenames} (blockbuster → mass-classic)`);
  console.log(`  Category overrides:     ${stats.categoryOverrides}`);
  console.log(`  Cult tags added:        ${stats.cultTagsAdded}`);
  console.log(`  Duplicates found:       ${stats.duplicatesFound.length}`);
  console.log('');

  if (stats.duplicatesFound.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  DUPLICATES DETECTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const dup of stats.duplicatesFound) {
      console.log(`  ${dup}`);
    }
    console.log('');
  }

  // Show category changes
  const overrides = changes.filter(c => c.oldCategory !== 'blockbuster' && c.oldCategory !== c.newCategory);
  if (overrides.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 CATEGORY OVERRIDES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('| Movie                                    | Year | From             | To               | Reason                  |');
    console.log('|------------------------------------------|------|------------------|------------------|-------------------------|');
    for (const c of overrides.slice(0, 30)) {
      console.log(`| ${c.title.substring(0, 40).padEnd(40)} | ${c.year} | ${c.oldCategory.padEnd(16)} | ${c.newCategory.padEnd(16)} | ${c.reason.padEnd(23)} |`);
    }
    if (overrides.length > 30) {
      console.log(`... and ${overrides.length - 30} more`);
    }
    console.log('');
  }

  // Show cult tags added
  const cultAdded = changes.filter(c => c.cultTagAdded);
  if (cultAdded.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎭 CULT TAGS ADDED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    for (const c of cultAdded) {
      console.log(`  ✓ ${c.title} (${c.year})`);
    }
    console.log('');
  }

  // Generate report file
  const report = generateReport(stats, changes, categoryDistBefore, categoryDistAfter);
  fs.writeFileSync('docs/EDITORIAL-AUDIT-REPORT.md', report);
  console.log('📄 Report written to docs/EDITORIAL-AUDIT-REPORT.md');
  console.log('');

  if (!applyChanges) {
    console.log('⚠️  DRY RUN - Run with --apply to apply changes');
  } else {
    console.log('✅ Changes applied to database!');
  }
}

function generateReport(
  stats: AuditStats,
  changes: AuditChange[],
  before: Record<string, number>,
  after: Record<string, number>
): string {
  const date = new Date().toISOString().split('T')[0];
  
  let report = `# Editorial Category Audit Report

Generated: ${date}

## Summary

| Metric | Value |
|--------|-------|
| Total Movies Audited | ${stats.totalMovies} |
| Category Renames (blockbuster → mass-classic) | ${stats.categoryRenames} |
| Category Overrides | ${stats.categoryOverrides} |
| Cult Tags Added | ${stats.cultTagsAdded} |
| Duplicates Found | ${stats.duplicatesFound.length} |

## Category Distribution

| Category | Before | After | Change |
|----------|--------|-------|--------|
`;

  const allCategories = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const cat of allCategories) {
    const b = before[cat] || 0;
    const a = after[cat] || 0;
    const diff = a - b;
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
    report += `| ${cat} | ${b} | ${a} | ${diffStr} |\n`;
  }

  report += `
## Category Definitions

| Category | Definition |
|----------|------------|
| **masterpiece** | Canonical Telugu cinema. Cross-generational impact. Studied and referenced. |
| **must-watch** | Culturally or artistically significant. Ages well. Strong critical legacy. |
| **mass-classic** | Wide popular recognition. Strong theatrical presence. Repeat value. |
| **highly-recommended** | Quality entertainment. Worth seeking out. |
| **recommended** | Solid viewing experience. Good for fans of genre/star. |
| **watchable** | Enjoyable but non-essential. Niche or time-bound appeal. |
| **one-time-watch** | Disposable. Little repeat or cultural value. |

## Cult Tag

The \`cult\` tag is orthogonal to categories. It indicates films that gained appreciation over time, often after initial mixed reception.

Criteria:
- Film is 15+ years old
- Not initially a box-office hit
- High current rating (7.8+) OR appears in curated cult list

`;

  // Category overrides
  const overrides = changes.filter(c => c.oldCategory !== 'blockbuster' && c.oldCategory !== c.newCategory);
  if (overrides.length > 0) {
    report += `## Category Overrides

| Movie | Year | From | To | Reason |
|-------|------|------|-----|--------|
`;
    for (const c of overrides) {
      report += `| ${c.title} | ${c.year} | ${c.oldCategory} | ${c.newCategory} | ${c.reason} |\n`;
    }
    report += '\n';
  }

  // Cult tags
  const cultAdded = changes.filter(c => c.cultTagAdded);
  if (cultAdded.length > 0) {
    report += `## Cult Tags Added

`;
    for (const c of cultAdded) {
      report += `- ${c.title} (${c.year})\n`;
    }
    report += '\n';
  }

  // Duplicates
  if (stats.duplicatesFound.length > 0) {
    report += `## Duplicates Detected

The following movies have multiple entries:

`;
    for (const dup of stats.duplicatesFound) {
      report += `- ${dup}\n`;
    }
    report += '\n';
  }

  report += `---

*This report was auto-generated by the editorial category audit script.*
`;

  return report;
}

const applyChanges = process.argv.includes('--apply');
runAudit(applyChanges);

