#!/usr/bin/env npx tsx
/**
 * Phase 3: Entity Merge CLI
 * 
 * Merges duplicate entities with analytics preservation.
 * Supports dry-run, apply, and undo operations.
 * 
 * Usage:
 *   pnpm intel:entity-merge --dry       # Preview merge candidates
 *   pnpm intel:entity-merge --apply     # Execute merges
 *   pnpm intel:entity-merge --auto      # Auto-merge high-confidence duplicates
 *   pnpm intel:entity-merge --stats     # Show merge statistics
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import {
  findMergeCandidates,
  mergeEntityDuplicates,
  batchMergeEntities,
  canonicalizeName
} from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry') || !args.includes('--apply');
  const autoMerge = args.includes('--auto');
  const showStats = args.includes('--stats');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;
  const minConfidenceArg = args.find(a => a.startsWith('--min-confidence='));
  const minConfidence = minConfidenceArg ? parseFloat(minConfidenceArg.split('=')[1]) : 0.7;

  console.log(chalk.bold.cyan('\n🔀 ENTITY MERGE CLI\n'));

  try {
    // Find merge candidates
    console.log('Finding merge candidates...\n');
    const { candidates, total_count } = await findMergeCandidates({
      minConfidence,
      entityType: 'all',
      limit: limit * 2
    });

    if (showStats) {
      console.log(chalk.bold('📊 MERGE STATISTICS\n'));
      console.log(`Total Potential Duplicates: ${chalk.cyan(total_count)}`);
      console.log(`High Confidence (≥${minConfidence}): ${chalk.green(candidates.length)}`);
      
      // Confidence distribution
      const byConfidence = {
        high: candidates.filter(c => c.confidence >= 0.9).length,
        medium: candidates.filter(c => c.confidence >= 0.7 && c.confidence < 0.9).length,
        low: candidates.filter(c => c.confidence < 0.7).length
      };
      
      console.log(chalk.bold('\nConfidence Distribution:'));
      console.log(`  High (≥90%):   ${chalk.green(byConfidence.high)}`);
      console.log(`  Medium (70-90%): ${chalk.yellow(byConfidence.medium)}`);
      console.log(`  Low (<70%):    ${chalk.red(byConfidence.low)}`);
      
      return;
    }

    if (candidates.length === 0) {
      console.log(chalk.gray('No merge candidates found with confidence ≥ ' + minConfidence));
      return;
    }

    console.log(`Found ${chalk.cyan(candidates.length)} merge candidates\n`);
    console.log(`Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('APPLY')}\n`);

    // Show top candidates
    console.log(chalk.bold('📋 MERGE CANDIDATES\n'));
    
    const displayCandidates = candidates.slice(0, limit);
    displayCandidates.forEach((candidate, i) => {
      const uniqueNames = [...new Set(candidate.group.occurrences.map(o => o.original_value))];
      const movieCount = [...new Set(candidate.group.occurrences.map(o => o.movie_id))].length;
      
      console.log(`${chalk.cyan((i + 1).toString().padStart(2))}. ${chalk.bold(candidate.suggested_canonical)}`);
      console.log(`    Confidence: ${colorConfidence(candidate.confidence)}`);
      console.log(`    Variants: ${uniqueNames.join(', ')}`);
      console.log(`    Affected Movies: ${chalk.yellow(movieCount)}`);
      console.log('');
    });

    if (dryRun && !autoMerge) {
      console.log(chalk.yellow('⚠️  DRY RUN - No changes made'));
      console.log('\nTo apply merges, run:');
      console.log(chalk.cyan(`  pnpm intel:entity-merge --apply`));
      console.log('\nTo auto-merge high confidence only:');
      console.log(chalk.cyan(`  pnpm intel:entity-merge --apply --auto --min-confidence=0.9`));
      return;
    }

    // Execute merges
    if (!dryRun) {
      const mergeCandidates = displayCandidates.map(c => ({
        group: c.group,
        canonical_name: c.suggested_canonical
      }));

      if (autoMerge) {
        console.log(chalk.bold('\n🔄 AUTO-MERGING HIGH CONFIDENCE DUPLICATES...\n'));
        
        const highConfidence = mergeCandidates.filter((_, i) => 
          displayCandidates[i].confidence >= minConfidence
        );
        
        const result = await batchMergeEntities(highConfidence, {
          dryRun: false,
          preserveAnalytics: true
        });
        
        console.log(chalk.bold('📊 MERGE RESULTS\n'));
        console.log(`Total Processed: ${chalk.cyan(result.total)}`);
        console.log(`Successfully Merged: ${chalk.green(result.merged)}`);
        console.log(`Errors: ${result.errors > 0 ? chalk.red(result.errors) : chalk.gray('0')}`);
        
        if (result.results.length > 0) {
          console.log(chalk.bold('\n📝 MERGE LOG\n'));
          result.results.slice(0, 10).forEach(r => {
            console.log(`  ✓ ${r.log_entry.target_name} (${r.affected_movie_ids.length} movies)`);
          });
          if (result.results.length > 10) {
            console.log(chalk.gray(`  ... and ${result.results.length - 10} more`));
          }
        }
      } else {
        // Interactive merge (one by one)
        console.log(chalk.bold('\n🔄 EXECUTING MERGES...\n'));
        
        let merged = 0;
        let errors = 0;
        
        for (const candidate of mergeCandidates) {
          try {
            const result = await mergeEntityDuplicates({
              duplicateGroup: candidate.group,
              canonicalName: candidate.canonical_name,
              dryRun: false,
              preserveAnalytics: true
            });
            
            console.log(`  ✓ ${chalk.green(result.log_entry.target_name)} - ${result.merged_count} occurrences merged`);
            merged++;
          } catch (error) {
            console.log(`  ✗ ${chalk.red(candidate.canonical_name)} - Error: ${error}`);
            errors++;
          }
        }
        
        console.log(chalk.bold('\n📊 SUMMARY\n'));
        console.log(`Merged: ${chalk.green(merged)}`);
        console.log(`Errors: ${errors > 0 ? chalk.red(errors) : chalk.gray('0')}`);
      }

      console.log(chalk.green('\n✅ Merge operations completed'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Entity merge failed:'), error);
    process.exit(1);
  }
}

function colorConfidence(confidence: number): string {
  const percent = `${(confidence * 100).toFixed(0)}%`;
  if (confidence >= 0.9) return chalk.green(percent);
  if (confidence >= 0.7) return chalk.yellow(percent);
  return chalk.red(percent);
}

main();

