/**
 * SAFE RESET CLI
 *
 * Usage:
 *   pnpm run safe-reset --dry-run
 *   pnpm run safe-reset --preserve-analytics --preserve-learnings
 *   pnpm run safe-reset --full
 */

import 'dotenv/config';
import { safeReset, safeDeletePosts, getDeletionCandidates } from '../lib/admin/safe-delete';
import { runLearningCycle } from '../lib/intelligence/learning-engine';

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

interface CLIArgs {
  dryRun: boolean;
  preserveAnalytics: boolean;
  preserveLearnings: boolean;
  useLearnings: boolean;
  full: boolean;
  status?: string;
  olderThan?: number; // days
  verbose: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    preserveAnalytics: args.includes('--preserve-analytics') || !args.includes('--no-analytics'),
    preserveLearnings: args.includes('--preserve-learnings') || !args.includes('--no-learnings'),
    useLearnings: args.includes('--use-learnings'),
    full: args.includes('--full'),
    status: args.find(a => a.startsWith('--status='))?.split('=')[1],
    olderThan: parseInt(args.find(a => a.startsWith('--older-than='))?.split('=')[1] || '0'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = parseArgs();

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('   🔄 TELUGUVIBES SAFE RESET');
  console.log('════════════════════════════════════════════════════════════\n');

  if (args.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be applied\n');
  }

  console.log('Options:');
  console.log(`  Preserve Analytics: ${args.preserveAnalytics ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Preserve Learnings: ${args.preserveLearnings ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Use Learnings for Rebuild: ${args.useLearnings ? 'YES ✅' : 'NO ❌'}`);
  
  if (args.status) {
    console.log(`  Target Status: ${args.status}`);
  }
  
  if (args.olderThan) {
    console.log(`  Older Than: ${args.olderThan} days`);
  }

  console.log('\n');

  try {
    // Show what will be affected
    console.log('📊 Scanning content...\n');

    const candidates = await getDeletionCandidates({
      status: args.status,
      olderThan: args.olderThan ? new Date(Date.now() - args.olderThan * 24 * 60 * 60 * 1000) : undefined,
    });

    console.log(`Found ${candidates.count} posts to process\n`);

    if (args.verbose && candidates.posts.length > 0) {
      console.log('Sample posts:');
      for (const post of candidates.posts.slice(0, 5)) {
        console.log(`  - ${post.title?.slice(0, 50) || post.id} (${post.status})`);
      }
      if (candidates.count > 5) {
        console.log(`  ... and ${candidates.count - 5} more\n`);
      }
    }

    if (candidates.count === 0) {
      console.log('✅ Nothing to reset!\n');
      return;
    }

    // Confirm (in real CLI, would prompt user)
    if (!args.dryRun) {
      console.log('⚡ Proceeding with reset...\n');
    }

    // Perform reset
    if (args.full) {
      // Full reset
      const result = await safeReset({
        preserveAnalytics: args.preserveAnalytics,
        preserveLearnings: args.preserveLearnings,
        useLearningsForRebuild: args.useLearnings,
        dryRun: args.dryRun,
      });

      console.log('\n📊 RESET RESULTS');
      console.log('-'.repeat(50));
      console.log(`Archived: ${result.archivedCount}`);
      console.log(`Deleted: ${result.deletedCount}`);
      console.log(`Learnings applied: ${result.learningsApplied}`);
      console.log(`Ready to rebuild: ${result.readyToRebuild ? 'YES ✅' : 'NO ❌'}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        for (const err of result.errors) {
          console.log(`  - ${err}`);
        }
      }
    } else {
      // Targeted delete
      const result = await safeDeletePosts({
        status: args.status,
        olderThan: args.olderThan ? new Date(Date.now() - args.olderThan * 24 * 60 * 60 * 1000) : undefined,
        preserveAnalytics: args.preserveAnalytics,
        preserveLearnings: args.preserveLearnings,
        dryRun: args.dryRun,
      });

      console.log('\n📊 DELETE RESULTS');
      console.log('-'.repeat(50));
      console.log(`Deleted: ${result.deletedCount}`);
      console.log(`Archived: ${result.archivedCount}`);
      console.log(`Analytics preserved: ${result.analyticsPreserved}`);
      console.log(`Learnings preserved: ${result.learningsPreserved}`);

      if (result.undoToken) {
        console.log(`\n🔙 Undo token (valid 30 min): ${result.undoToken.slice(0, 20)}...`);
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        for (const err of result.errors) {
          console.log(`  - ${err}`);
        }
      }
    }

    // If using learnings, trigger a learning cycle first
    if (args.useLearnings && !args.dryRun) {
      console.log('\n📚 Updating learnings before rebuild...');
      const learningResult = await runLearningCycle();
      console.log(`  Generated ${learningResult.learningsGenerated} new learnings`);
    }

    console.log('\n✨ Done!\n');

    if (!args.dryRun && args.full) {
      console.log('Next step: Run ingestion to rebuild content');
      console.log('  pnpm ingest:smart --use-learnings\n');
    }

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

main();

