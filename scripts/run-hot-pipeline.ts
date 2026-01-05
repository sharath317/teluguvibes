#!/usr/bin/env npx tsx
/**
 * Hot Media Auto-Pipeline Runner
 * 
 * Usage:
 *   npx tsx scripts/run-hot-pipeline.ts              # Discover & inject new content
 *   npx tsx scripts/run-hot-pipeline.ts --max=30     # Limit to 30 new items
 *   npx tsx scripts/run-hot-pipeline.ts --review     # Require manual review for all
 *   npx tsx scripts/run-hot-pipeline.ts --insights   # Show learning insights only
 *   npx tsx scripts/run-hot-pipeline.ts --trending   # Update trending scores only
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { runAutoPipeline } from '../lib/hot-media/auto-pipeline';
import { 
  getDiscoveryRecommendations, 
  generateInsights, 
  updateTrendingScores 
} from '../lib/hot-media/learning-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

async function showInsights() {
  console.log('\n📊 Learning Insights\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const recommendations = await getDiscoveryRecommendations(supabase);
  
  console.log('🎯 Priority Celebrities (need fresh content):');
  for (const celeb of recommendations.priorityCelebrities.slice(0, 10)) {
    const gap = celeb.content_gap_days;
    const indicator = gap > 14 ? '🔴' : gap > 7 ? '🟡' : '🟢';
    console.log(`  ${indicator} ${celeb.entity_name.padEnd(25)} | Score: ${celeb.priority_score.toFixed(1).padStart(6)} | Gap: ${gap} days`);
  }
  
  console.log('\n📁 Recommended Categories:');
  for (const cat of recommendations.recommendedCategories) {
    console.log(`  • ${cat}`);
  }
  
  console.log('\n💡 Insights:');
  for (const insight of recommendations.insights) {
    const emoji = insight.trend === 'up' ? '📈' : insight.trend === 'down' ? '📉' : '➡️';
    console.log(`  ${emoji} [${insight.type}] ${insight.recommendation}`);
  }
}

async function updateTrending() {
  console.log('\n📈 Updating Trending Scores\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const updated = await updateTrendingScores(supabase);
  
  console.log(`✅ Updated ${updated} trending scores`);
}

async function runPipeline() {
  const maxItems = parseInt(getArg('max') || '20', 10);
  const requireReview = hasFlag('review');
  
  console.log(`\n🔥 Hot Media Auto-Pipeline`);
  console.log(`   Max items: ${maxItems}`);
  console.log(`   Require review: ${requireReview}\n`);
  
  const result = await runAutoPipeline({
    maxNewItems: maxItems,
    autoPublishThreshold: requireReview ? 100 : 75, // 100 = never auto-publish
    requireReview,
    categories: ['photoshoot', 'fashion', 'traditional', 'western', 'events', 'fitness', 'beach', 'reels'],
    supabaseUrl,
    supabaseKey,
  });
  
  if (result.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    result.errors.forEach(e => console.log(`  • ${e}`));
  }
  
  return result;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  HOT MEDIA AUTO-PIPELINE');
  console.log('═'.repeat(60));
  
  if (hasFlag('insights')) {
    await showInsights();
  } else if (hasFlag('trending')) {
    await updateTrending();
  } else {
    await runPipeline();
  }
  
  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);






