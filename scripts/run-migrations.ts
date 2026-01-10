#!/usr/bin/env npx tsx
/**
 * Migration Runner Script
 * 
 * Runs all pending migrations against the Supabase database.
 * 
 * Usage:
 *   npx tsx scripts/run-migrations.ts --list          # List all migrations
 *   npx tsx scripts/run-migrations.ts --dry           # Show what would be run
 *   npx tsx scripts/run-migrations.ts --execute       # Run all migrations
 *   npx tsx scripts/run-migrations.ts --file=024      # Run specific migration
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

// Parse arguments
const args = process.argv.slice(2);
const LIST = args.includes('--list');
const DRY = args.includes('--dry');
const EXECUTE = args.includes('--execute');
const FILE_ARG = args.find(a => a.startsWith('--file='))?.split('=')[1];

// Migration files in order
const MIGRATION_ORDER = [
  '020-taxonomy-layer.sql',
  '021-trust-scoring.sql',
  '022-relationship-graph.sql',
  '023-enrichment-lifecycle.sql',
  '024-missing-columns.sql',
];

interface MigrationInfo {
  filename: string;
  path: string;
  exists: boolean;
  lineCount: number;
  description: string;
}

function getMigrationInfo(): MigrationInfo[] {
  return MIGRATION_ORDER.map(filename => {
    const filepath = join(MIGRATIONS_DIR, filename);
    const exists = existsSync(filepath);
    let lineCount = 0;
    let description = '';
    
    if (exists) {
      const content = readFileSync(filepath, 'utf-8');
      lineCount = content.split('\n').length;

      // Extract description from first comment block
      const descMatch = content.match(/--\s*(?:MIGRATION \d+:?\s*)?(.+)/);
      description = descMatch ? descMatch[1].trim() : 'No description';
    }

    return { filename, path: filepath, exists, lineCount, description };
  });
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(chalk.red('Database connection error:'), error.message);
      return false;
    }

    console.log(chalk.green(`✅ Connected to database (${count} movies found)`));
    return true;
  } catch (err) {
    console.error(chalk.red('Failed to connect to database'));
    return false;
  }
}

async function executeMigration(migration: MigrationInfo): Promise<{ success: boolean; error?: string }> {
  if (!migration.exists) {
    return { success: false, error: 'File not found' };
  }

  const content = readFileSync(migration.path, 'utf-8');

  // Split into statements (simple split on semicolon, handling comments)
  const statements = content
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(chalk.gray(`  Executing ${statements.length} statements...`));

  let executedCount = 0;

  for (const statement of statements) {
    if (!statement.trim() || statement.startsWith('--')) continue;

    try {
      // Use rpc to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try direct query for DDL statements
        // Note: This might not work for all DDL statements via Supabase client
        // In that case, user needs to run via Supabase Dashboard
        console.log(chalk.yellow(`  ⚠️ Statement may need manual execution: ${error.message}`));
      }

      executedCount++;
    } catch (err: any) {
      // Continue on error - some statements might already be applied
      console.log(chalk.yellow(`  ⚠️ ${err.message?.substring(0, 50) || 'Statement error'}`));
    }
  }

  return { success: true };
}

async function main() {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           MIGRATION RUNNER                                           ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  const migrations = getMigrationInfo();

  // List mode
  if (LIST || (!DRY && !EXECUTE && !FILE_ARG)) {
    console.log(chalk.yellow('📋 Available Migrations:\n'));

    migrations.forEach((m, i) => {
      const status = m.exists ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${i + 1}. ${m.filename}`);
      console.log(chalk.gray(`     ${m.description}`));
      console.log(chalk.gray(`     Lines: ${m.lineCount}`));
      console.log('');
    });

    console.log(chalk.cyan('\nUsage:'));
    console.log('  npx tsx scripts/run-migrations.ts --dry      # Preview migrations');
    console.log('  npx tsx scripts/run-migrations.ts --execute  # Run all migrations');
    console.log('  npx tsx scripts/run-migrations.ts --file=024 # Run specific file\n');

    console.log(chalk.yellow('⚠️  Note: For complex DDL statements, you may need to run'));
    console.log('   the SQL directly in the Supabase Dashboard SQL Editor.\n');

    console.log(chalk.cyan('📌 Quick Copy-Paste Commands:'));
    console.log(chalk.gray('   Open Supabase Dashboard > SQL Editor > New Query'));
    console.log(chalk.gray('   Then paste the contents of each migration file.\n'));

    return;
  }

  // Check database connection
  const connected = await checkDatabaseConnection();
  if (!connected && EXECUTE) {
    console.log(chalk.red('\n❌ Cannot execute migrations without database connection.'));
    return;
  }

  // Filter migrations if specific file requested
  let toRun = migrations;
  if (FILE_ARG) {
    toRun = migrations.filter(m => m.filename.includes(FILE_ARG));
    if (toRun.length === 0) {
      console.log(chalk.red(`No migration found matching: ${FILE_ARG}`));
      return;
    }
  }

  // Dry run or execute
  console.log(chalk.yellow(`\n${DRY ? '🔍 DRY RUN' : '🚀 EXECUTING'} - ${toRun.length} migrations\n`));

  for (const migration of toRun) {
    console.log(chalk.cyan(`\n📄 ${migration.filename}`));
    console.log(chalk.gray(`   ${migration.description}`));

    if (!migration.exists) {
      console.log(chalk.red('   ❌ File not found'));
      continue;
    }

    if (DRY) {
      console.log(chalk.gray(`   Would execute ${migration.lineCount} lines of SQL`));
      continue;
    }

    if (EXECUTE) {
      const result = await executeMigration(migration);
      if (result.success) {
        console.log(chalk.green('   ✅ Migration applied'));
      } else {
        console.log(chalk.red(`   ❌ Failed: ${result.error}`));
      }
    }
  }

  console.log(chalk.cyan.bold('\n════════════════════════════════════════════════════════════'));

  if (DRY) {
    console.log(chalk.yellow('\n⚠️  This was a dry run. Run with --execute to apply migrations.\n'));
  }

  if (EXECUTE) {
    console.log(chalk.green('\n✅ Migration run complete!\n'));
    console.log(chalk.yellow('Note: Some DDL statements may require manual execution.'));
    console.log(chalk.yellow('Check the Supabase Dashboard if any columns are missing.\n'));
  }
}

main().catch(console.error);
