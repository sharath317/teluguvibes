#!/usr/bin/env npx tsx
/**
 * BATCH VALIDATION SCRIPT
 *
 * Validates movie data across multiple sources with consensus-based auto-fix.
 * - Auto-fixes when 3+ sources agree with 80%+ confidence
 * - Generates markdown report for items needing manual review
 *
 * Usage:
 *   npx tsx scripts/validate-all.ts --limit=100
 *   npx tsx scripts/validate-all.ts --limit=500 --auto-fix
 *   npx tsx scripts/validate-all.ts --auto-fix --report=./reports/validation.md
 *   npx tsx scripts/validate-all.ts --field=director --auto-fix
 *   npx tsx scripts/validate-all.ts --actor=Krishna --auto-fix   # Validate actor's filmography
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import {
    validateMovie,
    validateBatch,
    generateMarkdownReport,
    type ValidationReport,
} from '../lib/validation/multi-source-validator';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '100'));
const AUTO_FIX = hasFlag('auto-fix');
const REPORT_PATH = getArg('report', '');
const FIELD = getArg('field', ''); // hero, heroine, director, music_director, producer
const DECADE = getArg('decade', '');
const HAS_TMDB = hasFlag('has-tmdb');
const ACTOR = getArg('actor', ''); // Filter by actor (hero) filmography

async function main(): Promise<void> {
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           MULTI-SOURCE VALIDATION                                    ║
║     Auto-fix: 3+ sources agree with 80%+ confidence                  ║
╚══════════════════════════════════════════════════════════════════════╝
`));

    console.log(`  Mode: ${AUTO_FIX ? chalk.green('AUTO-FIX ENABLED') : chalk.yellow('REPORT ONLY')}`);
    console.log(`  Limit: ${LIMIT} movies`);
    if (ACTOR) console.log(`  Actor filter: ${chalk.cyan(ACTOR)}`);
    if (FIELD) console.log(`  Field filter: ${FIELD}`);
    if (DECADE) console.log(`  Decade: ${DECADE}`);
    if (REPORT_PATH) console.log(`  Report: ${REPORT_PATH}`);

    // Build query
    let query = supabase
        .from('movies')
        .select('id, title_en, release_year, tmdb_id, hero, heroine, director, music_director, producer')
        .eq('language', 'Telugu');

    // Apply filters
    if (ACTOR) {
        // Filter by actor's filmography (movies where they are the hero)
        query = query.eq('hero', ACTOR);
    }

    if (HAS_TMDB) {
        query = query.not('tmdb_id', 'is', null);
    }

    if (DECADE) {
        const startYear = parseInt(DECADE);
        query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
    }

    if (FIELD) {
        // Filter movies with missing or Unknown values in specific field
        query = query.or(`${FIELD}.is.null,${FIELD}.eq.Unknown`);
    }

    const { data: movies, error } = await query
        .order('release_year', { ascending: false })
        .limit(LIMIT);

    if (error) {
        console.error(chalk.red('Error fetching movies:'), error);
        return;
    }

    console.log(`\n  Found ${chalk.cyan(movies?.length || 0)} movies to validate\n`);

    if (!movies || movies.length === 0) {
        console.log(chalk.green('  ✅ No movies to validate.'));
        return;
    }

    const movieIds = movies.map((m) => m.id);

    console.log('  Validating against TMDB, Wikipedia, Wikidata, OMDB...\n');

    // Run batch validation
    const report = await validateBatch(movieIds, {
        applyAutoFix: AUTO_FIX,
        onProgress: (completed, total) => {
            const pct = Math.round((completed / total) * 100);
            const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
            process.stdout.write(`\r  [${bar}] ${pct}% (${completed}/${total})`);
        },
    });

    console.log('\n\n');

    // Generate and save report
    if (REPORT_PATH) {
        const markdown = generateMarkdownReport(report);
        const reportDir = path.dirname(REPORT_PATH);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(REPORT_PATH, markdown);
        console.log(`  📄 Report saved to: ${chalk.cyan(REPORT_PATH)}\n`);
    }

    // Summary
    console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════════════
📊 VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════`));
    console.log(`  Total movies:     ${report.total_movies}`);
    console.log(`  Auto-fixed:       ${chalk.green(report.auto_fixed.count)}`);
    console.log(`  Needs review:     ${chalk.yellow(report.needs_review.count)}`);

    // Show auto-fixed items
    if (report.auto_fixed.items.length > 0) {
        console.log(chalk.green(`\n  ✅ Auto-Fixed Items (sample):\n`));

        for (const item of report.auto_fixed.items.slice(0, 10)) {
            console.log(`  • [${item.movie}] ${item.field}: "${item.old_value || 'null'}" → "${item.new_value}"`);
            console.log(`    Sources: ${item.sources.join(', ')}`);
        }

        if (report.auto_fixed.items.length > 10) {
            console.log(`\n  ... and ${report.auto_fixed.items.length - 10} more`);
        }
    }

    // Show items needing review
    if (report.needs_review.items.length > 0) {
        console.log(chalk.yellow(`\n  ⚠️  Needs Review (sample):\n`));

        for (const item of report.needs_review.items.slice(0, 5)) {
            console.log(`  • [${item.movie}] ${item.field}: current="${item.current_value || 'null'}"`);
            console.log(`    ${item.recommendation}`);
        }

        if (report.needs_review.items.length > 5) {
            console.log(`\n  ... and ${report.needs_review.items.length - 5} more (see report)`);
        }
    }

    // Field breakdown
    if (report.auto_fixed.items.length > 0 || report.needs_review.items.length > 0) {
        console.log(chalk.cyan(`\n  By Field:`));

        const fieldStats: Record<string, { fixed: number; review: number }> = {};

        for (const item of report.auto_fixed.items) {
            if (!fieldStats[item.field]) fieldStats[item.field] = { fixed: 0, review: 0 };
            fieldStats[item.field].fixed++;
        }

        for (const item of report.needs_review.items) {
            if (!fieldStats[item.field]) fieldStats[item.field] = { fixed: 0, review: 0 };
            fieldStats[item.field].review++;
        }

        for (const [field, stats] of Object.entries(fieldStats)) {
            console.log(`    ${field}: ${stats.fixed} fixed, ${stats.review} need review`);
        }
    }

    if (!AUTO_FIX && report.auto_fixed.count > 0) {
        console.log(chalk.yellow(`
  ⚠️  ${report.auto_fixed.count} items can be auto-fixed.
  Run with --auto-fix to apply changes.`));
    }

    if (!REPORT_PATH && report.needs_review.count > 0) {
        console.log(chalk.yellow(`
  💡 TIP: Use --report=./reports/validation.md to save detailed report.`));
    }

    console.log('');
}

main().catch(console.error);

