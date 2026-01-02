#!/usr/bin/env npx tsx
/**
 * Phase 4 + 7: Entity & Data Normalization CLI
 * 
 * Normalizes entity names, movie titles, media URLs, detects duplicates, finds collaborations.
 * 
 * Usage:
 *   pnpm entities:normalize              # Dry run analysis (celebrities)
 *   pnpm entities:normalize --fix        # Apply celebrity normalization
 *   pnpm entities:normalize --duplicates # Find duplicates only
 *   pnpm entities:normalize --collaborations  # Find actor-director pairs
 *   pnpm intel:normalize --movies        # Normalize movie titles
 *   pnpm intel:normalize --media         # Normalize media URLs
 *   pnpm intel:normalize --all           # All normalizations
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import {
  normalizeEntities,
  detectDuplicateEntities,
  detectCollaborations,
  enrichEntitiesWithCareerPhase,
  normalizeMovieTitles,
  normalizeAllMediaUrls
} from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const findDuplicates = args.includes('--duplicates');
  const findCollaborations = args.includes('--collaborations');
  const careerPhases = args.includes('--career-phases');
  const normalizeMovies = args.includes('--movies');
  const normalizeMedia = args.includes('--media');
  const normalizeAll = args.includes('--all');

  console.log(chalk.bold.cyan('\n👥 ENTITY & DATA NORMALIZATION\n'));

  try {
    // Phase 7: Movie title normalization
    if (normalizeMovies || normalizeAll) {
      console.log(chalk.bold('🎬 MOVIE TITLE NORMALIZATION\n'));
      console.log(`Mode: ${fix ? chalk.green('FIX') : chalk.yellow('DRY RUN')}\n`);

      const result = await normalizeMovieTitles({
        fix,
        dryRun: !fix
      });

      console.log(`Analyzed: ${chalk.cyan(result.analyzed)}`);
      console.log(`Would Normalize: ${chalk.yellow(result.normalized)}`);

      if (result.changes.length > 0) {
        console.log(chalk.bold('\n🔄 TITLE CHANGES (first 15):\n'));
        result.changes.slice(0, 15).forEach(change => {
          console.log(`"${chalk.red(change.old_title)}" → "${chalk.green(change.new_title)}"`);
        });

        if (result.changes.length > 15) {
          console.log(chalk.gray(`\n... and ${result.changes.length - 15} more`));
        }
      }

      if (!fix && result.normalized > 0) {
        console.log(chalk.yellow('\n⚠️  DRY RUN - No changes were made'));
        console.log('Run with --fix --movies to apply normalization');
      }

      if (!normalizeAll) return;
      console.log('\n' + '─'.repeat(60) + '\n');
    }

    // Phase 7: Media URL normalization
    if (normalizeMedia || normalizeAll) {
      console.log(chalk.bold('🖼️  MEDIA URL NORMALIZATION\n'));
      console.log(`Mode: ${fix ? chalk.green('FIX') : chalk.yellow('DRY RUN')}\n`);

      const result = await normalizeAllMediaUrls({
        fix,
        dryRun: !fix
      });

      console.log(`Analyzed: ${chalk.cyan(result.analyzed)}`);
      console.log(`Would Fix: ${chalk.yellow(result.fixed)}`);
      
      if (result.broken_urls.length > 0) {
        console.log(`Broken URLs: ${chalk.red(result.broken_urls.length)}`);
        console.log(chalk.bold('\n⚠️  BROKEN URLs:\n'));
        result.broken_urls.slice(0, 10).forEach(url => {
          console.log(`  ${chalk.red('✗')} ${url}`);
        });
      }

      if (!fix && result.fixed > 0) {
        console.log(chalk.yellow('\n⚠️  DRY RUN - No changes were made'));
        console.log('Run with --fix --media to apply normalization');
      }

      if (!normalizeAll) return;
      console.log('\n' + '─'.repeat(60) + '\n');
    }

    // Continue with celebrity normalization if --all
    if (normalizeAll) {
      console.log(chalk.bold('👤 CELEBRITY NAME NORMALIZATION\n'));
    }

    if (findDuplicates) {
      console.log(chalk.bold('🔍 Detecting Duplicate Entities...\n'));
      
      const result = await detectDuplicateEntities({ entityType: 'all' });
      
      console.log(`Unique Entities: ${chalk.cyan(result.unique_count)}`);
      console.log(`Total References: ${chalk.cyan(result.total_references)}`);
      console.log(`Potential Duplicates: ${chalk.yellow(result.potential_duplicates.length)}`);

      if (result.potential_duplicates.length > 0) {
        console.log(chalk.bold('\n🔄 POTENTIAL DUPLICATES (top 15):\n'));
        result.potential_duplicates.slice(0, 15).forEach((dup, i) => {
          console.log(`${i + 1}. ${chalk.yellow(dup.canonical_name)} (${dup.occurrences.length} refs, confidence: ${dup.confidence.toFixed(2)})`);
          const uniqueValues = [...new Set(dup.occurrences.map(o => o.original_value))];
          console.log(`   Variations: ${uniqueValues.join(', ')}`);
        });
      }
      return;
    }

    if (findCollaborations) {
      console.log(chalk.bold('🤝 Detecting Collaborations...\n'));
      
      const collaborations = await detectCollaborations({ minMovies: 3 });
      
      console.log(`Found ${chalk.cyan(collaborations.length)} frequent collaborations\n`);

      // Group by type
      const actorDirector = collaborations.filter(c => c.relationship_type === 'actor_director');
      const heroHeroine = collaborations.filter(c => c.relationship_type === 'hero_heroine');

      console.log(chalk.bold('🎬 ACTOR-DIRECTOR PAIRS:'));
      actorDirector.slice(0, 10).forEach((c, i) => {
        console.log(`${i + 1}. ${c.entity1} + ${c.entity2}: ${chalk.green(c.movie_count)} films`);
      });

      console.log(chalk.bold('\n💑 HERO-HEROINE PAIRS:'));
      heroHeroine.slice(0, 10).forEach((c, i) => {
        console.log(`${i + 1}. ${c.entity1} + ${c.entity2}: ${chalk.green(c.movie_count)} films`);
      });
      return;
    }

    if (careerPhases) {
      console.log(chalk.bold('📈 Detecting Career Phases...\n'));
      
      const result = await enrichEntitiesWithCareerPhase();
      
      console.log(`Analyzed ${chalk.cyan(result.updated)} entities\n`);
      console.log(chalk.bold('PHASE DISTRIBUTION:'));
      Object.entries(result.phases).forEach(([phase, count]) => {
        const bar = '█'.repeat(Math.floor(count / 5)) + '░'.repeat(Math.max(0, 20 - Math.floor(count / 5)));
        console.log(`${phase.padEnd(12)} ${bar} ${count}`);
      });
      return;
    }

    // Default: normalize entities
    console.log(`Mode: ${fix ? chalk.green('FIX') : chalk.yellow('DRY RUN')}\n`);

    const result = await normalizeEntities({
      fix,
      entityType: 'all',
      dryRun: !fix
    });

    console.log(chalk.bold('📊 NORMALIZATION RESULTS\n'));
    console.log(`Analyzed: ${chalk.cyan(result.analyzed)}`);
    console.log(`Would Normalize: ${chalk.yellow(result.normalized)}`);
    console.log(`Duplicates Fixed: ${chalk.green(result.duplicates_fixed)}`);

    if (result.changes.length > 0) {
      console.log(chalk.bold('\n🔄 SAMPLE CHANGES (first 15):\n'));
      result.changes.slice(0, 15).forEach(change => {
        console.log(`${chalk.gray(change.field.padEnd(10))} "${chalk.red(change.old_value)}" → "${chalk.green(change.new_value)}"`);
      });

      if (result.changes.length > 15) {
        console.log(chalk.gray(`\n... and ${result.changes.length - 15} more`));
      }
    }

    if (!fix && result.normalized > 0) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes were made'));
      console.log('Run with --fix to apply normalization');
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Normalization failed:'), error);
    process.exit(1);
  }
}

main();

