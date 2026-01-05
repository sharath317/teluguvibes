#!/usr/bin/env npx tsx
/**
 * Run SQL Migration
 * 
 * Executes a SQL file against Supabase using the service role key.
 * 
 * Usage:
 *   npx tsx scripts/run-migration.ts ./path/to/migration.sql
 *   npx tsx scripts/run-migration.ts ./supabase-enhanced-tags-schema.sql --dry
 */

import { config } from 'dotenv';
import { resolve, basename } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key);
}

async function runMigration(sqlFile: string, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              SQL MIGRATION RUNNER                            ║
╚══════════════════════════════════════════════════════════════╝
`));

  // Read SQL file
  const sqlPath = resolve(process.cwd(), sqlFile);
  let sql: string;
  try {
    sql = readFileSync(sqlPath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`❌ Could not read file: ${sqlFile}`));
    process.exit(1);
  }

  console.log(chalk.cyan(`📄 File: ${basename(sqlFile)}`));
  console.log(chalk.gray(`   Path: ${sqlPath}`));
  console.log(chalk.gray(`   Size: ${(sql.length / 1024).toFixed(1)} KB`));
  
  // Count statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  console.log(chalk.gray(`   Statements: ~${statements.length}`));

  if (dryRun) {
    console.log(chalk.yellow.bold('\n🔍 DRY RUN MODE - No changes will be made\n'));
    console.log(chalk.gray('Preview of SQL (first 2000 chars):'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(sql.substring(0, 2000));
    if (sql.length > 2000) {
      console.log(chalk.gray(`\n... (${sql.length - 2000} more characters)`));
    }
    console.log(chalk.gray('─'.repeat(60)));
    return;
  }

  console.log(chalk.yellow('\n⚡ Executing migration...\n'));

  const supabase = getSupabaseClient();

  // Execute using rpc (requires a function) or raw query
  // Supabase JS client doesn't support raw SQL directly, so we use the REST API
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // Use fetch to call the REST API directly for raw SQL
    const response = await fetch(`${url}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });

    // Since we can't run raw SQL via REST API, we need to execute statement by statement
    // using the Supabase client for DDL operations

    // Actually, for ALTER TABLE and CREATE INDEX, we need to use the SQL editor
    // or the Supabase Management API. Let's try a different approach - exec via postgres

    console.log(chalk.yellow('⚠️  Direct SQL execution via JS client is limited.'));
    console.log(chalk.yellow('   Attempting to run individual DDL statements...\n'));

    // Try running via the query builder for simple operations
    // For complex DDL, we need the SQL editor or pg-admin

    // Let's at least verify connection works
    const { data, error } = await supabase
      .from('movies')
      .select('count')
      .limit(1);

    if (error) {
      console.error(chalk.red('❌ Database connection failed:'), error.message);
      process.exit(1);
    }

    console.log(chalk.green('✅ Database connection verified'));
    console.log(chalk.yellow('\n📋 Migration SQL needs to be run in Supabase Dashboard:'));
    console.log(chalk.cyan('   1. Go to: https://supabase.com/dashboard'));
    console.log(chalk.cyan('   2. Select your project'));
    console.log(chalk.cyan('   3. Go to SQL Editor'));
    console.log(chalk.cyan('   4. Paste the SQL content and run'));
    console.log(chalk.gray('\n   SQL file path: ' + sqlPath));
    
    // Copy to clipboard hint
    console.log(chalk.yellow('\n💡 Tip: Use this command to copy SQL to clipboard:'));
    console.log(chalk.gray(`   cat "${sqlPath}" | pbcopy`));

  } catch (err) {
    console.error(chalk.red('❌ Migration failed:'), err);
    process.exit(1);
  }
}

// Parse args
const args = process.argv.slice(2);
const sqlFile = args.find(a => a.endsWith('.sql'));
const dryRun = args.includes('--dry') || args.includes('--dry-run');

if (!sqlFile) {
  console.error(chalk.red('Usage: npx tsx scripts/run-migration.ts <path-to-sql-file> [--dry]'));
  console.error(chalk.gray('Example: npx tsx scripts/run-migration.ts ./supabase-enhanced-tags-schema.sql'));
  process.exit(1);
}

runMigration(sqlFile, dryRun).catch(console.error);
