#!/usr/bin/env npx tsx
/**
 * TeluguVibes FREE-FIRST AI CLI
 *
 * Generates high-quality Telugu content using:
 * - Ollama (local AI) as primary
 * - HuggingFace (cloud free) as fallback
 * - Templates as final fallback
 *
 * Usage:
 *   pnpm free:status      - Check AI provider status
 *   pnpm free:run         - Dry run (no DB writes)
 *   pnpm free:run --mode=smart  - Smart update (fill missing fields)
 *   pnpm free:run --verbose     - Show detailed output
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { generateTeluguContent, isOllamaAvailable, GeneratedContent } from '../../lib/pipeline/content-generator';
import { fetchTMDBTrending, fetchGoogleTrendsRSS } from '../../lib/sources/free-fetchers';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0] || 'status';
const flags = {
  mode: args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'dry',
  verbose: args.includes('--verbose'),
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '5'),
  source: args.find(a => a.startsWith('--source='))?.split('=')[1] || 'tmdb',
};

/**
 * Check AI provider status
 */
async function checkStatus(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  TeluguVibes FREE-FIRST AI Status');
  console.log('═══════════════════════════════════════\n');

  // Check Ollama
  const ollamaOk = await isOllamaAvailable();
  console.log(`🤖 Ollama (Local): ${ollamaOk ? '✅ Available' : '❌ Not running'}`);
  if (!ollamaOk) {
    console.log('   → Run: ollama serve');
    console.log('   → Install: ollama pull llama3:8b');
  }

  // Check HuggingFace
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  console.log(`🌐 HuggingFace: ${hfKey ? '✅ API key set' : '⚠️ No API key (optional)'}`);

  // Check Supabase
  try {
    const { error } = await supabase.from('posts').select('id').limit(1);
    console.log(`📊 Supabase: ${error ? '❌ Error' : '✅ Connected'}`);
  } catch {
    console.log('📊 Supabase: ❌ Not configured');
  }

  // Check TMDB
  const tmdbKey = process.env.TMDB_API_KEY;
  console.log(`🎬 TMDB: ${tmdbKey ? '✅ API key set' : '⚠️ No API key'}`);

  console.log('\n───────────────────────────────────────');
  console.log('📌 Recommendation:');
  if (ollamaOk) {
    console.log('   ✅ Ready for content generation!');
    console.log('   → Run: pnpm free:run --mode=smart');
  } else {
    console.log('   → Start Ollama for AI generation');
    console.log('   → Or content will use template fallback');
  }
  console.log('═══════════════════════════════════════\n');
}

/**
 * Fetch topics from sources
 */
async function fetchTopics(): Promise<string[]> {
  const topics: string[] = [];

  console.log(`\n📡 Fetching topics from: ${flags.source}`);

  if (flags.source.includes('tmdb')) {
    try {
      const tmdbData = await fetchTMDBTrending();
      topics.push(...tmdbData.map(m => `${m.title} Telugu movie update`));
      console.log(`   🎬 TMDB: ${tmdbData.length} movies`);
    } catch (e) {
      console.log(`   🎬 TMDB: ❌ Failed`);
    }
  }

  if (flags.source.includes('trends')) {
    try {
      const trendsData = await fetchGoogleTrendsRSS();
      topics.push(...trendsData.map(t => t.title));
      console.log(`   📈 Trends: ${trendsData.length} topics`);
    } catch (e) {
      console.log(`   📈 Trends: ❌ Failed`);
    }
  }

  // Default topics if no external sources
  if (topics.length === 0) {
    topics.push(
      'Allu Arjun Pushpa 2 release date announcement',
      'Prabhas Salaar Part 2 shooting update',
      'Ram Charan Game Changer trailer release',
      'Jr NTR Devara box office collection',
      'Mahesh Babu SSMB29 with Rajamouli',
      'Samantha new projects and comeback',
    );
    console.log(`   📝 Using default topics: ${topics.length}`);
  }

  return topics.slice(0, flags.limit);
}

/**
 * Run content generation pipeline
 */
async function runPipeline(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  TeluguVibes Content Generation');
  console.log(`  Mode: ${flags.mode.toUpperCase()}`);
  console.log('═══════════════════════════════════════');

  // Step 1: Fetch topics
  const topics = await fetchTopics();

  if (topics.length === 0) {
    console.log('\n❌ No topics found. Exiting.');
    return;
  }

  // Step 2: Generate content
  console.log('\n📝 Generating content...\n');

  const generated: GeneratedContent[] = [];
  const failed: string[] = [];

  for (const topic of topics) {
    try {
      const content = await generateTeluguContent(topic);
      if (content) {
        generated.push(content);
        if (flags.verbose) {
          console.log(`   📄 Title: ${content.titleTe?.slice(0, 40)}...`);
          console.log(`   📊 Confidence: ${(content.confidence * 100).toFixed(0)}%`);
        }
      } else {
        failed.push(topic);
      }
    } catch (error) {
      failed.push(topic);
      if (flags.verbose) {
        console.log(`   ❌ Error: ${(error as Error).message}`);
      }
    }
  }

  // Step 3: Report results
  console.log('\n───────────────────────────────────────');
  console.log('📊 Generation Report:');
  console.log(`   ✅ Success: ${generated.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);

  if (generated.length === 0) {
    console.log('\n❌ No content generated. Exiting.');
    return;
  }

  // Step 4: Database operation based on mode
  if (flags.mode === 'dry') {
    console.log('\n📋 DRY RUN - Preview:');
    console.log('───────────────────────────────────────');

    for (const content of generated) {
      const sourceIcon = content.source === 'ollama-ai' ? '🤖' : '📄';
      const sourceLabel = content.source === 'ollama-ai' ? 'Ollama AI' : 'Template';
      console.log(`\n🎬 ${content.titleTe}`);
      console.log(`   📍 Source: ${sourceIcon} ${sourceLabel}`);
      console.log(`   Slug: ${content.slug}`);
      console.log(`   Tags: ${content.tags.slice(0, 3).join(', ')}`);
      console.log(`   Content: ${content.bodyTe?.slice(0, 100)}...`);
      console.log(`   Image: ${content.imageUrl ? '✅' : '❌'}`);
      console.log(`   Confidence: ${(content.confidence * 100).toFixed(0)}%`);
    }

    console.log('\n💡 To write to database, run:');
    console.log('   pnpm free:run --mode=smart');
  } else if (flags.mode === 'smart') {
    console.log('\n📝 SMART UPDATE - Writing to database...');

    let written = 0;
    let skipped = 0;

    for (const content of generated) {
      // Check if similar post exists (by title similarity)
      const { data: existing } = await supabase
        .from('posts')
        .select('id, title')
        .ilike('title', `%${content.tags[0] || ''}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        if (flags.verbose) {
          console.log(`   ⏭️ Skipped (exists): ${content.titleTe?.slice(0, 30)}...`);
        }
        continue;
      }

      // Insert new post
      const { error } = await supabase.from('posts').insert({
        slug: content.slug,
        title: content.titleTe,
        title_te: content.titleTe,
        excerpt: content.excerpt,
        body_te: content.bodyTe,
        telugu_body: content.bodyTe,
        image_url: content.imageUrl,
        image_alt: content.imageAlt,
        image_source: 'Wikipedia',
        image_license: 'CC BY-SA',
        tags: content.tags,
        category: 'entertainment',
        status: content.confidence >= 0.7 ? 'published' : 'draft',
        created_at: new Date().toISOString(),
      });

      if (error) {
        if (flags.verbose) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      } else {
        written++;
        console.log(`   ✅ ${content.titleTe?.slice(0, 40)}...`);
      }
    }

    console.log('\n───────────────────────────────────────');
    console.log(`📊 Database Results:`);
    console.log(`   ✅ Written: ${written}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ Pipeline Complete');
  console.log('═══════════════════════════════════════\n');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    switch (command) {
      case 'status':
        await checkStatus();
        break;
      case 'run':
        await runPipeline();
        break;
      default:
        console.log(`\nUnknown command: ${command}`);
        console.log('\nUsage:');
        console.log('  pnpm free:status      - Check AI provider status');
        console.log('  pnpm free:run         - Dry run (preview)');
        console.log('  pnpm free:run --mode=smart  - Write to database');
        console.log('  pnpm free:run --verbose     - Show details');
        console.log('  pnpm free:run --limit=10    - Generate 10 posts');
        console.log('  pnpm free:run --source=trends  - Use Google Trends');
    }
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
