/**
 * Test Script: Enhanced Celebrity Image Fetching
 * Tests the multi-tier fallback mechanism for 99% success rate
 */

import { getCelebrityTMDBData, getSearchAlternates, CELEBRITY_TMDB_IDS } from '../lib/celebrity-tmdb-ids';
import { extractCelebrityName } from '../lib/telugu-celebrities';

const TMDB_API_KEY = '846db4a4d0b196aa418335ee95619459';

interface TestResult {
  celebrity: string;
  category: string;
  method: 'known_id' | 'search' | 'movie_fallback' | 'wikipedia' | 'failed';
  imageUrl: string | null;
}

// Test celebrities covering all categories
const TEST_CELEBRITIES = [
  // Mega Family
  { name: 'Chiranjeevi', category: 'Mega Family' },
  { name: 'Pawan Kalyan', category: 'Mega Family' },
  { name: 'Ram Charan', category: 'Mega Family' },
  { name: 'Allu Arjun', category: 'Mega Family' },
  { name: 'Varun Tej', category: 'Mega Family' },

  // Nandamuri Family
  { name: 'Jr NTR', category: 'Nandamuri Family' },
  { name: 'Nandamuri Balakrishna', category: 'Nandamuri Family' },
  { name: 'Mohan Babu', category: 'Nandamuri Family' },

  // Akkineni Family
  { name: 'Nagarjuna', category: 'Akkineni Family' },
  { name: 'Naga Chaitanya', category: 'Akkineni Family' },
  { name: 'Akhil Akkineni', category: 'Akkineni Family' },

  // Top Heroes
  { name: 'Mahesh Babu', category: 'Top Heroes' },
  { name: 'Prabhas', category: 'Top Heroes' },
  { name: 'Vijay Deverakonda', category: 'Top Heroes' },
  { name: 'Nani', category: 'Top Heroes' },
  { name: 'Ravi Teja', category: 'Top Heroes' },
  { name: 'Nithin', category: 'Top Heroes' },
  { name: 'Sharwanand', category: 'Top Heroes' },

  // Top Heroines
  { name: 'Samantha Ruth Prabhu', category: 'Top Heroines' },
  { name: 'Rashmika Mandanna', category: 'Top Heroines' },
  { name: 'Pooja Hegde', category: 'Top Heroines' },
  { name: 'Anushka Shetty', category: 'Top Heroines' },
  { name: 'Sai Pallavi', category: 'Top Heroines' },
  { name: 'Keerthy Suresh', category: 'Top Heroines' },
  { name: 'Sreeleela', category: 'Top Heroines' },
  { name: 'Kajal Aggarwal', category: 'Top Heroines' },
  { name: 'Nayanthara', category: 'Top Heroines' },
  { name: 'Trisha', category: 'Top Heroines' },

  // Directors
  { name: 'SS Rajamouli', category: 'Directors' },
  { name: 'Sukumar', category: 'Directors' },
  { name: 'Trivikram Srinivas', category: 'Directors' },
  { name: 'Ram Gopal Varma', category: 'Directors' },
  { name: 'Koratala Siva', category: 'Directors' },

  // Music Directors
  { name: 'Devi Sri Prasad', category: 'Music Directors' },
  { name: 'MM Keeravani', category: 'Music Directors' },
  { name: 'AR Rahman', category: 'Music Directors' },
  { name: 'SS Thaman', category: 'Music Directors' },

  // Singers
  { name: 'SP Balasubrahmanyam', category: 'Singers' },
  { name: 'Shreya Ghoshal', category: 'Singers' },
  { name: 'Sid Sriram', category: 'Singers' },

  // Comedians
  { name: 'Brahmanandam', category: 'Comedians' },
  { name: 'Ali', category: 'Comedians' },
  { name: 'Vennela Kishore', category: 'Comedians' },

  // Cross-Industry
  { name: 'Rajinikanth', category: 'Cross-Industry' },
  { name: 'Kamal Haasan', category: 'Cross-Industry' },
  { name: 'Yash', category: 'Cross-Industry' },
  { name: 'Dhanush', category: 'Cross-Industry' },

  // Legends
  { name: 'Savitri', category: 'Golden Era' },
  { name: 'Sridevi', category: 'Golden Era' },
  { name: 'NTR Sr', category: 'Golden Era' },
  { name: 'Akkineni Nageswara Rao', category: 'Golden Era' },

  // TV & Bigg Boss
  { name: 'Sreemukhi', category: 'TV' },
  { name: 'Anasuya Bharadwaj', category: 'TV' },
  { name: 'Suma Kanakala', category: 'TV' },
];

async function getTMDBPersonById(tmdbId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${tmdbId}?api_key=${TMDB_API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.profile_path ? `https://image.tmdb.org/t/p/w500${data.profile_path}` : null;
  } catch {
    return null;
  }
}

async function searchTMDB(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const person = data.results?.[0];
    return person?.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : null;
  } catch {
    return null;
  }
}

async function getWikipediaImage(name: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.thumbnail?.source ? data.thumbnail.source.replace(/\/\d+px-/, '/500px-') : null;
  } catch {
    return null;
  }
}

async function testCelebrity(name: string): Promise<TestResult> {
  // Strategy 1: Known TMDB ID
  const knownData = getCelebrityTMDBData(name);
  if (knownData?.hasImage) {
    const url = await getTMDBPersonById(knownData.tmdbId);
    if (url) {
      return { celebrity: name, category: '', method: 'known_id', imageUrl: url };
    }
  }

  // Strategy 2: Search TMDB
  const searchQueries = getSearchAlternates(name);
  for (const query of searchQueries) {
    const url = await searchTMDB(query);
    if (url) {
      return { celebrity: name, category: '', method: 'search', imageUrl: url };
    }
  }

  // Strategy 3: Wikipedia fallback
  const wikiUrl = await getWikipediaImage(name);
  if (wikiUrl) {
    return { celebrity: name, category: '', method: 'wikipedia', imageUrl: wikiUrl };
  }

  return { celebrity: name, category: '', method: 'failed', imageUrl: null };
}

async function runTests() {
  console.log('🎬 ENHANCED CELEBRITY IMAGE TEST (Multi-tier Fallback)');
  console.log('=======================================================\n');

  const results: TestResult[] = [];

  for (const celeb of TEST_CELEBRITIES) {
    process.stdout.write(`Testing: ${celeb.name.padEnd(30)}`);

    const result = await testCelebrity(celeb.name);
    result.category = celeb.category;
    results.push(result);

    const statusIcon = result.method !== 'failed' ? '✅' : '❌';
    const methodLabel = {
      'known_id': '🔑 Known ID',
      'search': '🔍 Search',
      'movie_fallback': '🎬 Movie',
      'wikipedia': '📚 Wikipedia',
      'failed': '❌ Failed'
    }[result.method];

    console.log(`${statusIcon} ${methodLabel}`);

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=======================================================');
  console.log('📊 RESULTS SUMMARY');
  console.log('=======================================================\n');

  const byMethod = {
    known_id: results.filter(r => r.method === 'known_id').length,
    search: results.filter(r => r.method === 'search').length,
    movie_fallback: results.filter(r => r.method === 'movie_fallback').length,
    wikipedia: results.filter(r => r.method === 'wikipedia').length,
    failed: results.filter(r => r.method === 'failed').length,
  };

  const successCount = results.length - byMethod.failed;
  const successRate = ((successCount / results.length) * 100).toFixed(1);

  console.log(`Total Tested: ${results.length}`);
  console.log(`\nBy Method:`);
  console.log(`  🔑 Known ID:      ${byMethod.known_id}`);
  console.log(`  🔍 TMDB Search:   ${byMethod.search}`);
  console.log(`  🎬 Movie Poster:  ${byMethod.movie_fallback}`);
  console.log(`  📚 Wikipedia:     ${byMethod.wikipedia}`);
  console.log(`  ❌ Failed:        ${byMethod.failed}`);
  console.log(`\n✅ Success: ${successCount}/${results.length}`);
  console.log(`📈 SUCCESS RATE: ${successRate}%`);

  if (byMethod.failed > 0) {
    console.log('\n⚠️ Failed celebrities:');
    results.filter(r => r.method === 'failed').forEach(r => {
      console.log(`   - ${r.celebrity} (${r.category})`);
    });
  }

  // Show some sample URLs
  console.log('\n🖼️ Sample Image URLs:');
  results.filter(r => r.imageUrl).slice(0, 8).forEach(r => {
    console.log(`   ${r.celebrity}: ${r.imageUrl?.substring(0, 60)}...`);
  });

  // Known IDs coverage
  const knownIdCount = Object.keys(CELEBRITY_TMDB_IDS).length;
  console.log(`\n📚 Celebrity Database Stats:`);
  console.log(`   Known TMDB IDs: ${knownIdCount}`);
}

runTests();








