#!/usr/bin/env npx tsx
/**
 * AI-ASSISTED GAP FILLING SCRIPT
 * 
 * Uses AI to infer cast and crew information for Telugu movies
 * when other sources have failed.
 * 
 * Usage:
 *   npx tsx scripts/enrich-ai-inference.ts --limit=100
 *   npx tsx scripts/enrich-ai-inference.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Use upgraded Groq key if available
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY_UNLIMITED || process.env.GROQ_API_KEY,
});

const RATE_LIMIT_MS = 1500; // Be nice to the API
const BATCH_SIZE = 5;

interface CLIArgs {
  dryRun: boolean;
  limit: number;
  verbose: boolean;
  field: 'hero' | 'heroine' | 'director' | 'all';
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100'),
    field: (args.find(a => a.startsWith('--field='))?.split('=')[1] as any) || 'all',
  };
}

interface MovieInfo {
  hero?: string;
  heroine?: string;
  director?: string;
}

/**
 * Use AI to infer movie cast/crew information
 */
async function inferMovieInfo(
  title: string,
  year?: number,
  field: 'hero' | 'heroine' | 'director' | 'all' = 'all'
): Promise<MovieInfo> {
  const fieldsToInfer = field === 'all' ? ['hero', 'heroine', 'director'] : [field];
  
  const prompt = `You are a Telugu cinema expert. For the Telugu movie "${title}" (${year || 'unknown year'}), provide the following information:

${fieldsToInfer.includes('hero') ? '- Hero (lead male actor): Name only, no explanations' : ''}
${fieldsToInfer.includes('heroine') ? '- Heroine (lead female actress): Name only, no explanations' : ''}
${fieldsToInfer.includes('director') ? '- Director: Name only, no explanations' : ''}

IMPORTANT RULES:
1. Only provide names you are CONFIDENT about
2. For unknown information, respond with exactly "Unknown"
3. Use English names/spellings
4. No explanations or qualifiers - just the name or "Unknown"

Respond in JSON format:
{
  ${fieldsToInfer.includes('hero') ? '"hero": "Name or Unknown",' : ''}
  ${fieldsToInfer.includes('heroine') ? '"heroine": "Name or Unknown",' : ''}
  ${fieldsToInfer.includes('director') ? '"director": "Name or Unknown"' : ''}
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Filter out "Unknown" values
    const result: MovieInfo = {};
    if (parsed.hero && parsed.hero !== 'Unknown' && parsed.hero.length > 2) {
      result.hero = parsed.hero;
    }
    if (parsed.heroine && parsed.heroine !== 'Unknown' && parsed.heroine.length > 2) {
      result.heroine = parsed.heroine;
    }
    if (parsed.director && parsed.director !== 'Unknown' && parsed.director.length > 2) {
      result.director = parsed.director;
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red('   AI inference error:'), error);
    return {};
  }
}

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║            AI-ASSISTED GAP FILLING SCRIPT                     ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }

  console.log(`  Field to infer: ${chalk.cyan(args.field)}\n`);

  // Build query based on field
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, hero, heroine, director')
    .eq('language', 'Telugu');

  if (args.field === 'hero' || args.field === 'all') {
    query = query.is('hero', null);
  } else if (args.field === 'heroine') {
    query = query.is('heroine', null);
  } else if (args.field === 'director') {
    query = query.is('director', null);
  }

  // Only target verified movies (with our_rating)
  query = query.not('our_rating', 'is', null);
  
  // Prioritize high rated movies (more important to fill)
  query = query.order('our_rating', { ascending: false }).limit(args.limit);

  console.log(chalk.cyan('📋 Fetching movies needing AI inference...'));
  
  const { data: dbMovies, error } = await query;

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  console.log(chalk.green(`   Found ${dbMovies?.length || 0} movies needing inference\n`));

  if (!dbMovies || dbMovies.length === 0) {
    console.log(chalk.green('✅ All movies have required data'));
    process.exit(0);
  }

  let heroUpdates = 0;
  let heroineUpdates = 0;
  let directorUpdates = 0;
  let noData = 0;

  console.log(chalk.cyan('🔄 Running AI inference...\n'));

  for (let i = 0; i < dbMovies.length; i++) {
    const movie = dbMovies[i];
    
    if (args.verbose) {
      console.log(`  [${i + 1}/${dbMovies.length}] ${movie.title_en} (${movie.release_year})`);
    }

    const inferred = await inferMovieInfo(movie.title_en, movie.release_year, args.field);
    
    if (Object.keys(inferred).length === 0) {
      noData++;
      if (args.verbose) {
        console.log(chalk.gray(`    → No data inferred`));
      }
      continue;
    }

    const updates: Record<string, any> = {};
    const changes: string[] = [];

    // Only update fields that are currently null
    if (inferred.hero && !movie.hero) {
      updates.hero = inferred.hero;
      changes.push(`hero: ${inferred.hero}`);
      heroUpdates++;
    }
    if (inferred.heroine && !movie.heroine) {
      updates.heroine = inferred.heroine;
      changes.push(`heroine: ${inferred.heroine}`);
      heroineUpdates++;
    }
    if (inferred.director && !movie.director) {
      updates.director = inferred.director;
      changes.push(`director: ${inferred.director}`);
      directorUpdates++;
    }

    if (Object.keys(updates).length === 0) {
      noData++;
      continue;
    }

    if (args.verbose) {
      console.log(chalk.green(`    → ${changes.join(', ')}`));
    }

    if (!args.dryRun) {
      const { error: updateError } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);

      if (updateError) {
        console.error(chalk.red(`    Error updating:`, updateError.message));
      }
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

    // Progress every batch
    if (!args.verbose && i > 0 && i % BATCH_SIZE === 0) {
      console.log(`  Progress: ${i}/${dbMovies.length}`);
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 AI INFERENCE RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Movies processed:         ${dbMovies.length}`);
  console.log(`  No data available:        ${noData}`);
  console.log('');
  console.log(`  Heroes inferred:          ${chalk.green(heroUpdates)}`);
  console.log(`  Heroines inferred:        ${chalk.green(heroineUpdates)}`);
  console.log(`  Directors inferred:       ${chalk.green(directorUpdates)}`);

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ AI inference complete\n'));
}

main().catch(console.error);

