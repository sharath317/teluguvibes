/**
 * EXTENDED INTELLIGENCE CLI
 *
 * Extended commands for data refinement, validation, and bulk fixes.
 *
 * Commands:
 *   pnpm intel:sync --scope=movies --mode=refine
 *   pnpm intel:sync --scope=celebrities --include=historic
 *   pnpm intel:validate --target=reviews
 *   pnpm intel:images --recheck-licenses
 *   pnpm intel:admin --bulk-fix=genres
 */

import { refineData } from '../../lib/refinement/data-refiner';
import { validateEntity } from '../../lib/validation/ai-validator';
import { executeBulkAction } from '../../lib/admin/bulk-operations';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

interface CLIArgs {
  command: string;
  scope?: string;
  mode?: string;
  target?: string;
  includeHistoric?: boolean;
  recheckLicenses?: boolean;
  bulkFix?: string;
  dryRun?: boolean;
  limit?: number;
  verbose?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    command: 'sync',
  };

  for (const arg of args) {
    if (arg.startsWith('--scope=')) {
      parsed.scope = arg.split('=')[1];
    } else if (arg.startsWith('--mode=')) {
      parsed.mode = arg.split('=')[1];
    } else if (arg.startsWith('--target=')) {
      parsed.target = arg.split('=')[1];
    } else if (arg === '--include=historic') {
      parsed.includeHistoric = true;
    } else if (arg === '--recheck-licenses') {
      parsed.recheckLicenses = true;
    } else if (arg.startsWith('--bulk-fix=')) {
      parsed.bulkFix = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      parsed.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (['refine', 'validate', 'images', 'admin'].includes(arg)) {
      parsed.command = arg;
    }
  }

  return parsed;
}

// ============================================================
// COMMAND HANDLERS
// ============================================================

async function handleRefine(args: CLIArgs): Promise<void> {
  console.log('\n🔄 DATA REFINEMENT ENGINE');
  console.log('='.repeat(50));

  const results = await refineData({
    target_table: args.scope,
    dry_run: args.dryRun,
    limit: args.limit || 50,
    min_confidence_threshold: 0.70,
    max_age_days: args.includeHistoric ? 365 : 30,
  });

  console.log('\n📊 REFINEMENT SUMMARY');
  console.log('-'.repeat(50));
  console.log(`Total refined: ${results.length}`);

  const byType: Record<string, number> = {};
  const totalFieldsRefined = results.reduce((sum, r) => {
    byType[r.entity_type] = (byType[r.entity_type] || 0) + 1;
    return sum + r.fields_refined.length;
  }, 0);

  console.log(`Total fields updated: ${totalFieldsRefined}`);
  console.log('\nBy entity type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  if (args.dryRun) {
    console.log('\n⚠️  DRY RUN - No changes applied');
  }

  // Confidence deltas
  if (args.verbose && results.length > 0) {
    console.log('\n📈 CONFIDENCE IMPROVEMENTS');
    console.log('-'.repeat(50));
    for (const r of results.slice(0, 10)) {
      const delta = r.new_confidence - r.previous_confidence;
      const icon = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      console.log(`  ${r.entity_id.slice(0, 8)}... ${icon} ${(delta * 100).toFixed(1)}% (${r.reason})`);
    }
  }
}

async function handleValidate(args: CLIArgs): Promise<void> {
  console.log('\n🔍 AI VALIDATION PIPELINE');
  console.log('='.repeat(50));

  const target = args.target || 'posts';
  const limit = args.limit || 20;

  console.log(`Target: ${target}`);
  console.log(`Limit: ${limit}`);

  // Fetch entities to validate
  const { data: entities } = await supabase
    .from(target)
    .select('*')
    .is('last_validated_at', null)
    .limit(limit);

  if (!entities || entities.length === 0) {
    console.log('\n✅ All entities are validated');
    return;
  }

  console.log(`\nValidating ${entities.length} entities...`);

  let passed = 0;
  let failed = 0;
  const issues: { id: string; issues: string[] }[] = [];

  for (const entity of entities) {
    const result = await validateEntity({
      title_en: entity.title || entity.title_en || entity.name_en,
      overview_en: entity.telugu_body || entity.overview_en || entity.biography_en,
      genres: entity.genres || [],
      poster_url: entity.image_url || entity.poster_url,
      data_sources: entity.data_sources || ['internal'],
    });

    if (result.is_valid) {
      passed++;
    } else {
      failed++;
      issues.push({
        id: entity.id,
        issues: result.issues.map(i => `${i.severity}: ${i.message}`),
      });
    }

    // Update validation timestamp
    if (!args.dryRun) {
      await supabase
        .from(target)
        .update({
          last_validated_at: new Date().toISOString(),
          ai_confidence: result.confidence,
          validation_issues: result.issues,
        })
        .eq('id', entity.id);
    }

    process.stdout.write(result.is_valid ? '.' : 'X');
  }

  console.log('\n');
  console.log('📊 VALIDATION SUMMARY');
  console.log('-'.repeat(50));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (args.verbose && issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND');
    console.log('-'.repeat(50));
    for (const item of issues.slice(0, 5)) {
      console.log(`\n${item.id}:`);
      for (const issue of item.issues) {
        console.log(`  - ${issue}`);
      }
    }
  }
}

async function handleImages(args: CLIArgs): Promise<void> {
  console.log('\n🖼️  IMAGE LICENSE CHECKER');
  console.log('='.repeat(50));

  if (!args.recheckLicenses) {
    console.log('Use --recheck-licenses to scan images');
    return;
  }

  const tables = ['posts', 'movies', 'celebrities'];
  const limit = args.limit || 50;

  let total = 0;
  let violations = 0;

  for (const table of tables) {
    const imageField = table === 'movies' ? 'poster_url' : 'image_url';

    const { data: entities } = await supabase
      .from(table)
      .select(`id, ${imageField}`)
      .not(imageField, 'is', null)
      .limit(limit);

    if (!entities) continue;

    for (const entity of entities) {
      total++;
      const url = entity[imageField];

      // Check for blocked sources
      const blockedPatterns = [
        /google\.(com|co\.\w+)\/images/i,
        /imdb\.com/i,
        /pinterest\./i,
      ];

      const isBlocked = blockedPatterns.some(p => p.test(url));

      if (isBlocked) {
        violations++;
        console.log(`❌ ${table}/${entity.id}: ${url.slice(0, 50)}...`);

        if (!args.dryRun) {
          // Clear the image
          await supabase
            .from(table)
            .update({
              [imageField]: null,
              image_needs_replacement: true,
            })
            .eq('id', entity.id);
        }
      }
    }
  }

  console.log('\n📊 IMAGE SCAN SUMMARY');
  console.log('-'.repeat(50));
  console.log(`Total scanned: ${total}`);
  console.log(`Violations found: ${violations}`);
  console.log(`Cleared: ${args.dryRun ? '0 (dry run)' : violations}`);
}

async function handleAdmin(args: CLIArgs): Promise<void> {
  console.log('\n⚙️  ADMIN BULK OPERATIONS');
  console.log('='.repeat(50));

  if (!args.bulkFix) {
    console.log('Available bulk fixes:');
    console.log('  --bulk-fix=genres     Fix empty/invalid genres');
    console.log('  --bulk-fix=images     Re-attach missing images');
    console.log('  --bulk-fix=titles     Regenerate AI titles');
    console.log('  --bulk-fix=validate   Re-validate all content');
    return;
  }

  const scope = args.scope || 'posts';
  const limit = args.limit || 30;

  console.log(`Bulk fix: ${args.bulkFix}`);
  console.log(`Scope: ${scope}`);
  console.log(`Limit: ${limit}`);

  // Get entities needing fixes
  let query = supabase.from(scope).select('id');

  switch (args.bulkFix) {
    case 'genres':
      query = query.or('genres.is.null,genres.eq.{}');
      break;
    case 'images':
      query = query.is(scope === 'movies' ? 'poster_url' : 'image_url', null);
      break;
    case 'titles':
      query = query.is('title', null);
      break;
    case 'validate':
      query = query.is('last_validated_at', null);
      break;
  }

  const { data: entities } = await query.limit(limit);

  if (!entities || entities.length === 0) {
    console.log('\n✅ No entities need this fix');
    return;
  }

  console.log(`\nFound ${entities.length} entities to fix`);

  // Map bulk fix to action
  const actionMap: Record<string, string> = {
    genres: 'revalidate',
    images: 'reattach_image',
    titles: 'regenerate_title',
    validate: 'revalidate',
  };

  const action = actionMap[args.bulkFix];

  if (!action) {
    console.log('Unknown bulk fix type');
    return;
  }

  const result = await executeBulkAction({
    action: action as any,
    entity_ids: entities.map(e => e.id),
    entity_type: scope as any,
    dry_run: args.dryRun,
  });

  console.log('\n📊 BULK FIX SUMMARY');
  console.log('-'.repeat(50));
  console.log(`Requested: ${result.total_requested}`);
  console.log(`Successful: ${result.successful}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Skipped: ${result.skipped}`);

  if (result.undo_token) {
    console.log(`\nUndo token: ${result.undo_token}`);
    console.log('(Valid for 30 minutes)');
  }

  if (args.dryRun) {
    console.log('\n⚠️  DRY RUN - No changes applied');
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('\n🚀 TELUGUVIBES INTELLIGENCE CLI (EXTENDED)');
  console.log('='.repeat(50));

  if (args.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be applied\n');
  }

  switch (args.command) {
    case 'refine':
      await handleRefine(args);
      break;
    case 'validate':
      await handleValidate(args);
      break;
    case 'images':
      await handleImages(args);
      break;
    case 'admin':
      await handleAdmin(args);
      break;
    default:
      console.log('Available commands:');
      console.log('  refine    - Auto-refine low-confidence data');
      console.log('  validate  - Run AI validation on entities');
      console.log('  images    - Check image licenses');
      console.log('  admin     - Bulk admin operations');
      console.log('\nExamples:');
      console.log('  pnpm intel:cli refine --scope=movies --dry-run');
      console.log('  pnpm intel:cli validate --target=reviews --limit=50');
      console.log('  pnpm intel:cli images --recheck-licenses');
      console.log('  pnpm intel:cli admin --bulk-fix=genres --scope=movies');
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
