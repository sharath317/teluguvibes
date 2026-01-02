#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const TMDB_API_KEY = process.env.TMDB_API_KEY;

interface CLIArgs {
  limit?: number;
  top?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    limit: args.find(a => a.startsWith('--limit=')) 
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1]) 
      : 30,
    top: args.includes('--top'),
  };
}

async function searchTMDBPerson(name: string): Promise<{ id: number; profile_path: string | null } | null> {
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const person = data.results[0];
      return {
        id: person.id,
        profile_path: person.profile_path,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getTopActorsFromMovies() {
  console.log(chalk.cyan('📊 Analyzing top actors from movies table...\n'));
  
  const { data: heroes } = await supabase
    .from('movies')
    .select('hero')
    .not('hero', 'is', null);
  
  const { data: heroines } = await supabase
    .from('movies')
    .select('heroine')
    .not('heroine', 'is', null);
  
  // Count occurrences
  const counts: Record<string, number> = {};
  
  heroes?.forEach(m => {
    if (m.hero) counts[m.hero] = (counts[m.hero] || 0) + 1;
  });
  
  heroines?.forEach(m => {
    if (m.heroine) counts[m.heroine] = (counts[m.heroine] || 0) + 1;
  });
  
  // Sort by count
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name]) => name);
  
  console.log(chalk.gray(`  Top 10: ${sorted.slice(0, 10).join(', ')}\n`));
  
  return sorted;
}

async function main() {
  const args = parseArgs();
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║        CELEBRITY IMAGE ENRICHMENT (TMDB SEARCH)              ║
╚══════════════════════════════════════════════════════════════╝
`));

  let actorsToEnrich: string[] = [];
  
  if (args.top) {
    // Get top actors from movies
    actorsToEnrich = await getTopActorsFromMovies();
    actorsToEnrich = actorsToEnrich.slice(0, args.limit);
  } else {
    // Get celebrities without images from database
    const { data: celebs } = await supabase
      .from('celebrities')
      .select('name_en')
      .is('profile_image', null)
      .limit(args.limit!);
    
    actorsToEnrich = celebs?.map(c => c.name_en) || [];
  }
  
  console.log(chalk.cyan(`\n📋 Processing ${actorsToEnrich.length} actors\n`));
  
  let updated = 0;
  let created = 0;
  let skipped = 0;
  
  for (const actorName of actorsToEnrich) {
    try {
      // Check if celebrity exists
      const { data: existing } = await supabase
        .from('celebrities')
        .select('id, profile_image, tmdb_id')
        .eq('name_en', actorName)
        .single();
      
      // Skip if already has image
      if (existing?.profile_image) {
        console.log(chalk.gray(`  ${actorName}: Already has image`));
        skipped++;
        continue;
      }
      
      // Search TMDB
      const tmdbPerson = await searchTMDBPerson(actorName);
      
      if (!tmdbPerson) {
        console.log(chalk.yellow(`  ${actorName}: Not found on TMDB`));
        skipped++;
        continue;
      }
      
      if (!tmdbPerson.profile_path) {
        console.log(chalk.yellow(`  ${actorName}: No image available`));
        skipped++;
        continue;
      }
      
      const imageUrl = `https://image.tmdb.org/t/p/w185${tmdbPerson.profile_path}`;
      
      if (existing) {
        // Update existing celebrity
        await supabase
          .from('celebrities')
          .update({
            profile_image: imageUrl,
            profile_image_source: 'TMDB',
            tmdb_id: tmdbPerson.id,
          })
          .eq('id', existing.id);
        
        console.log(chalk.green(`✓ ${actorName} (updated)`));
        updated++;
      } else {
        // Create new celebrity entry
        await supabase
          .from('celebrities')
          .insert({
            name_en: actorName,
            profile_image: imageUrl,
            profile_image_source: 'TMDB',
            tmdb_id: tmdbPerson.id,
            is_published: true,
          });
        
        console.log(chalk.green(`✓ ${actorName} (created)`));
        created++;
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error: any) {
      console.error(chalk.red(`  ${actorName}: Error - ${error.message}`));
      skipped++;
    }
  }
  
  console.log(chalk.cyan.bold(`\n╔══════════════════════════════════════════════════════════════╗`));
  console.log(chalk.cyan.bold(`║                       SUMMARY                                 ║`));
  console.log(chalk.cyan.bold(`╚══════════════════════════════════════════════════════════════╝\n`));
  console.log(chalk.green(`  ✅ Updated:  ${updated}`));
  console.log(chalk.blue(`  ➕ Created:  ${created}`));
  console.log(chalk.yellow(`  ⏭️  Skipped:  ${skipped}`));
  console.log(chalk.gray(`  📊 Total:    ${updated + created + skipped}\n`));
}

main().catch(console.error);

