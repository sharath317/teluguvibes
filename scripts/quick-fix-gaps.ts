#!/usr/bin/env npx tsx
/**
 * Quick Fix Gaps Script
 * 
 * Fills small gaps in movie data that can be derived easily:
 * - era: derived from release_year
 * - decade: derived from release_year  
 * - heroine: fetched from TMDB if tmdb_id exists
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// CLI args
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const FIX_ERA = args.includes('--era') || args.includes('--all');
const FIX_DECADE = args.includes('--decade') || args.includes('--all');
const FIX_HEROINE = args.includes('--heroine') || args.includes('--all');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500');

// Era derivation from release year
function deriveEra(year: number): string {
    if (year < 1950) return 'Pre-Golden';
    if (year < 1960) return 'Golden Era';
    if (year < 1970) return 'Silver Era';
    if (year < 1980) return 'Classic Era';
    if (year < 1990) return 'Star Era';
    if (year < 2000) return 'Commercial Era';
    if (year < 2010) return 'Transition Era';
    if (year < 2020) return 'Pan-India Era';
    return 'Digital Era';
}

// Decade derivation from release year
function deriveDecade(year: number): string {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
}

// Fetch heroine from TMDB
async function fetchHeroineFromTMDB(tmdbId: number): Promise<string | null> {
    if (!TMDB_API_KEY || !tmdbId) return null;
    
    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        const cast = data.cast || [];
        
        // Find first female cast member
        for (const person of cast) {
            if (person.gender === 1 && person.known_for_department === 'Acting') {
                return person.name;
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

async function fixEraMissing(): Promise<number> {
    console.log(chalk.cyan('\n📅 Fixing missing ERA values...'));
    
    const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title_en, release_year')
        .eq('language', 'Telugu')
        .is('era', null)
        .not('release_year', 'is', null)
        .limit(LIMIT);
    
    if (error) {
        console.error(chalk.red('  Error fetching movies:'), error.message);
        return 0;
    }
    
    if (!movies || movies.length === 0) {
        console.log(chalk.green('  ✅ No movies need era fix'));
        return 0;
    }
    
    console.log(`  Found ${movies.length} movies to fix`);
    
    let fixed = 0;
    for (const movie of movies) {
        const era = deriveEra(movie.release_year);
        
        if (EXECUTE) {
            const { error: updateError } = await supabase
                .from('movies')
                .update({ era })
                .eq('id', movie.id);
            
            if (!updateError) {
                fixed++;
                console.log(chalk.gray(`    ✓ ${movie.title_en} (${movie.release_year}) → ${era}`));
            }
        } else {
            console.log(chalk.gray(`    [DRY] ${movie.title_en} (${movie.release_year}) → ${era}`));
            fixed++;
        }
    }
    
    return fixed;
}

async function fixDecadeMissing(): Promise<number> {
    console.log(chalk.cyan('\n📆 Fixing missing DECADE values...'));
    
    const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title_en, release_year')
        .eq('language', 'Telugu')
        .is('decade', null)
        .not('release_year', 'is', null)
        .limit(LIMIT);
    
    if (error) {
        console.error(chalk.red('  Error fetching movies:'), error.message);
        return 0;
    }
    
    if (!movies || movies.length === 0) {
        console.log(chalk.green('  ✅ No movies need decade fix'));
        return 0;
    }
    
    console.log(`  Found ${movies.length} movies to fix`);
    
    let fixed = 0;
    for (const movie of movies) {
        const decade = deriveDecade(movie.release_year);
        
        if (EXECUTE) {
            const { error: updateError } = await supabase
                .from('movies')
                .update({ decade })
                .eq('id', movie.id);
            
            if (!updateError) {
                fixed++;
                console.log(chalk.gray(`    ✓ ${movie.title_en} (${movie.release_year}) → ${decade}`));
            }
        } else {
            console.log(chalk.gray(`    [DRY] ${movie.title_en} (${movie.release_year}) → ${decade}`));
            fixed++;
        }
    }
    
    return fixed;
}

async function fixHeroineMissing(): Promise<number> {
    console.log(chalk.cyan('\n👩 Fixing missing HEROINE values...'));
    
    const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title_en, tmdb_id')
        .eq('language', 'Telugu')
        .is('heroine', null)
        .not('tmdb_id', 'is', null)
        .limit(LIMIT);
    
    if (error) {
        console.error(chalk.red('  Error fetching movies:'), error.message);
        return 0;
    }
    
    if (!movies || movies.length === 0) {
        console.log(chalk.green('  ✅ No movies need heroine fix'));
        return 0;
    }
    
    console.log(`  Found ${movies.length} movies to fix`);
    
    let fixed = 0;
    for (const movie of movies) {
        const heroine = await fetchHeroineFromTMDB(movie.tmdb_id);
        
        if (heroine) {
            if (EXECUTE) {
                const { error: updateError } = await supabase
                    .from('movies')
                    .update({ heroine })
                    .eq('id', movie.id);
                
                if (!updateError) {
                    fixed++;
                    console.log(chalk.gray(`    ✓ ${movie.title_en} → ${heroine}`));
                }
            } else {
                console.log(chalk.gray(`    [DRY] ${movie.title_en} → ${heroine}`));
                fixed++;
            }
        } else {
            console.log(chalk.yellow(`    ⚠ ${movie.title_en} - No heroine found in TMDB`));
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return fixed;
}

async function main(): Promise<void> {
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           QUICK FIX GAPS SCRIPT                                      ║
║   Fill era, decade, heroine from simple derivation / TMDB            ║
╚══════════════════════════════════════════════════════════════════════╝
`));
    
    console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
    console.log(`  Limit: ${LIMIT} movies per fix`);
    
    if (!FIX_ERA && !FIX_DECADE && !FIX_HEROINE) {
        console.log(chalk.yellow(`
  Usage:
    --all          Fix all gaps (era, decade, heroine)
    --era          Fix missing era values
    --decade       Fix missing decade values
    --heroine      Fix missing heroine values (requires TMDB)
    --execute      Apply changes (default is dry run)
    --limit=N      Max movies to fix (default: 500)
    
  Examples:
    npx tsx scripts/quick-fix-gaps.ts --all --execute
    npx tsx scripts/quick-fix-gaps.ts --era --decade --execute
    npx tsx scripts/quick-fix-gaps.ts --heroine --limit=100 --execute
`));
        return;
    }
    
    const results: Record<string, number> = {};
    
    if (FIX_ERA) {
        results.era = await fixEraMissing();
    }
    
    if (FIX_DECADE) {
        results.decade = await fixDecadeMissing();
    }
    
    if (FIX_HEROINE) {
        results.heroine = await fixHeroineMissing();
    }
    
    // Summary
    console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════════════
📊 FIX SUMMARY
═══════════════════════════════════════════════════════════════════`));
    
    for (const [field, count] of Object.entries(results)) {
        console.log(`  ${field.padEnd(12)}: ${chalk.green(count)} movies ${EXECUTE ? 'fixed' : 'would be fixed'}`);
    }
    
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`  ${'TOTAL'.padEnd(12)}: ${chalk.cyan(total)} movies`);
    
    if (!EXECUTE) {
        console.log(chalk.yellow(`
  ⚠️  DRY RUN - No changes were made.
  Run with --execute to apply changes.`));
    } else {
        console.log(chalk.green(`
  ✅ Gap fixes complete!`));
    }
}

main().catch(console.error);

