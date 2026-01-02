#!/usr/bin/env npx tsx
/**
 * Phase 4: Entity Normalization CLI
 * 
 * Normalizes entity names, detects duplicates, finds collaborations.
 * 
 * Usage:
 *   pnpm entities:normalize              # Dry run analysis
 *   pnpm entities:normalize --fix        # Apply normalization
 *   pnpm entities:normalize --duplicates # Find duplicates only
 *   pnpm entities:normalize --collaborations  # Find actor-director pairs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import {
  normalizeEntities,
  detectDuplicateEntities,
  detectCollaborations,
  enrichEntitiesWithCareerPhase
} from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const findDuplicates = args.includes('--duplicates');
  const findCollaborations = args.includes('--collaborations');
  const careerPhases = args.includes('--career-phases');

  console.log(chalk.bold.cyan('\n👥 ENTITY NORMALIZATION\n'));

  try {
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

