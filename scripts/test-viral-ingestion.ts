/**
 * Test Script: Viral Content Ingestion
 *
 * Run with: npx ts-node --esm scripts/test-viral-ingestion.ts
 *
 * Tests individual fetchers and the full pipeline.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (Next.js convention)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function testYouTubeFetcher() {
  console.log('\n📺 Testing YouTube Trending Fetcher...\n');

  const { fetchYouTubeTrending, calculateYouTubeViralScore } = await import('../lib/viral-content/youtube-trending');

  try {
    const trending = await fetchYouTubeTrending({
      maxResults: 10,
      teluguOnly: true,
    });

    console.log(`Found ${trending.length} Telugu trending videos:\n`);

    for (const video of trending.slice(0, 5)) {
      const viralScore = calculateYouTubeViralScore(video);
      console.log(`  📹 ${video.title.slice(0, 60)}...`);
      console.log(`     Views: ${video.viewCount.toLocaleString()} | Likes: ${video.likeCount.toLocaleString()}`);
      console.log(`     Viral Score: ${viralScore.toFixed(1)}`);
      console.log(`     Channel: ${video.channelTitle}`);
      console.log('');
    }

    return trending;
  } catch (error) {
    console.error('YouTube test failed:', error);
    return [];
  }
}

async function testRedditFetcher() {
  console.log('\n📱 Testing Reddit Hot Fetcher...\n');

  const { fetchRedditHot, calculateRedditViralScore, getEmbeddableRedditPosts } = await import('../lib/viral-content/reddit-hot');

  try {
    const hotPosts = await fetchRedditHot({
      maxPerSubreddit: 10,
      minScore: 20,
    });

    console.log(`Found ${hotPosts.length} hot Reddit posts:\n`);

    const embeddable = getEmbeddableRedditPosts(hotPosts);
    console.log(`Embeddable posts (with media links): ${embeddable.length}\n`);

    for (const post of hotPosts.slice(0, 5)) {
      const viralScore = calculateRedditViralScore(post);
      console.log(`  📝 r/${post.subreddit}: ${post.title.slice(0, 50)}...`);
      console.log(`     Score: ${post.score} | Comments: ${post.numComments}`);
      console.log(`     Media Type: ${post.mediaType} | Platform: ${post.extractedPlatform || 'N/A'}`);
      console.log(`     Viral Score: ${viralScore.toFixed(1)}`);
      console.log('');
    }

    return hotPosts;
  } catch (error) {
    console.error('Reddit test failed:', error);
    return [];
  }
}

async function testTwitterFetcher() {
  console.log('\n🐦 Testing Twitter Embed Fetcher...\n');

  const { fetchTwitterEmbed, calculateTwitterViralScore } = await import('../lib/viral-content/twitter-viral');

  // Test with a known Telugu cinema tweet (example)
  const testUrls = [
    'https://twitter.com/AlwaysRamCharan/status/1700000000000000000', // Example - may not exist
  ];

  try {
    for (const url of testUrls) {
      console.log(`  Testing: ${url}`);
      const result = await fetchTwitterEmbed(url);

      if (result) {
        const viralScore = calculateTwitterViralScore(result);
        console.log(`  ✅ Fetched: @${result.authorName}`);
        console.log(`     Hashtags: ${result.hashtags.join(', ') || 'None'}`);
        console.log(`     Viral Score: ${viralScore.toFixed(1)}`);
      } else {
        console.log(`  ❌ Failed to fetch (tweet may not exist or be private)`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Twitter test failed:', error);
  }
}

async function testModeration() {
  console.log('\n🛡️ Testing Content Moderation...\n');

  const { moderateContent, getModerationLabel } = await import('../lib/viral-content/moderation');

  const testCases = [
    {
      title: 'Pushpa 2 Official Trailer | Allu Arjun | Sukumar',
      sourceType: 'youtube' as const,
      sourceId: 'UCqYPhGiB9tkShZsq9CGkZDw', // T-Series Telugu
      mediaType: 'youtube_video' as const,
      viralScore: 85,
      externalViews: 5000000,
    },
    {
      title: 'Random controversial video with bad content',
      sourceType: 'youtube' as const,
      sourceId: 'unknown_channel',
      mediaType: 'youtube_video' as const,
      viralScore: 45,
      externalViews: 1000,
    },
    {
      title: 'Leaked footage - do not share',
      sourceType: 'reddit' as const,
      sourceId: 'tollywood',
      mediaType: 'youtube_video' as const,
      viralScore: 60,
    },
  ];

  for (const testCase of testCases) {
    const result = moderateContent(testCase);
    const label = getModerationLabel(result.decision);

    console.log(`  📋 "${testCase.title.slice(0, 50)}..."`);
    console.log(`     Decision: ${label.label} (${result.confidence}% confidence)`);
    console.log(`     Reasons: ${result.reasons.join(', ')}`);
    console.log(`     Flags: ${result.flags.join(', ') || 'None'}`);
    console.log('');
  }
}

async function testFullPipeline() {
  console.log('\n🔥 Testing Full Viral Ingestion Pipeline...\n');
  console.log('⚠️  This will write to the database!\n');

  const { ingestViralContent, getIngestionStats } = await import('../lib/viral-content');

  try {
    // Get stats before
    const statsBefore = await getIngestionStats();
    console.log('Stats before ingestion:');
    console.log(`  Last 24h: ${statsBefore.last_24h} posts`);
    console.log(`  Pending moderation: ${statsBefore.pending_moderation} posts\n`);

    // Run ingestion
    console.log('Running ingestion pipeline...\n');
    const result = await ingestViralContent();

    console.log('\n📊 Ingestion Results:');
    console.log(`  Total Fetched: ${result.total_fetched}`);
    console.log(`  Total Processed: ${result.total_processed}`);
    console.log(`  Auto-Approved: ${result.auto_approved}`);
    console.log(`  Pending Review: ${result.pending_review}`);
    console.log(`  Auto-Rejected: ${result.auto_rejected}`);
    console.log(`  Duplicates Skipped: ${result.duplicates_skipped}`);
    console.log(`  Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n  ❌ Errors:');
      for (const err of result.errors) {
        console.log(`     - ${err}`);
      }
    }

  } catch (error) {
    console.error('Pipeline test failed:', error);
  }
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   TeluguVibes Viral Content Test Suite     ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  switch (testType) {
    case 'youtube':
      await testYouTubeFetcher();
      break;
    case 'reddit':
      await testRedditFetcher();
      break;
    case 'twitter':
      await testTwitterFetcher();
      break;
    case 'moderation':
      await testModeration();
      break;
    case 'pipeline':
      await testFullPipeline();
      break;
    case 'all':
    default:
      await testYouTubeFetcher();
      await testRedditFetcher();
      await testTwitterFetcher();
      await testModeration();
      // Note: Full pipeline test is opt-in since it writes to DB
      console.log('\n💡 To test the full pipeline (writes to DB), run:');
      console.log('   npx ts-node --esm scripts/test-viral-ingestion.ts pipeline\n');
  }

  console.log('\n✅ Test suite completed!\n');
}

main().catch(console.error);
