/**
 * Test Script: TMDB Image Fetching Validation
 *
 * Tests actual TMDB API calls to verify celebrities have images
 */

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMjMxY2RlZDQ1MzAwYWU2ZjAwYjAxODRmZTRkNGU1NSIsIm5iZiI6MTc1MTI2MTQxNy4zNTYsInN1YiI6IjY3OTMzODc5NjVhYWY4ZTZlNjRlYTdlOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.oQQA4PX8RoFIiALhZC_rNwHpQmNYz2FHNdQAz4FLlqw';

interface TestResult {
  celebrity: string;
  category: string;
  tmdbId: number | null;
  imageUrl: string | null;
  status: 'FOUND' | 'NOT_FOUND';
}

const CELEBRITIES_TO_TEST = [
  // Mega Family
  { name: 'Chiranjeevi', category: 'Mega Family' },
  { name: 'Pawan Kalyan', category: 'Mega Family' },
  { name: 'Ram Charan', category: 'Mega Family' },
  { name: 'Allu Arjun', category: 'Mega Family' },

  // Nandamuri Family
  { name: 'Jr NTR', category: 'Nandamuri Family' },
  { name: 'Nandamuri Balakrishna', category: 'Nandamuri Family' },

  // Akkineni Family
  { name: 'Nagarjuna', category: 'Akkineni Family' },
  { name: 'Naga Chaitanya', category: 'Akkineni Family' },

  // Top Heroes
  { name: 'Mahesh Babu', category: 'Top Heroes' },
  { name: 'Prabhas', category: 'Top Heroes' },
  { name: 'Vijay Deverakonda', category: 'Top Heroes' },
  { name: 'Nani', category: 'Top Heroes' },
  { name: 'Ravi Teja', category: 'Top Heroes' },

  // Top Heroines
  { name: 'Samantha Ruth Prabhu', category: 'Top Heroines' },
  { name: 'Rashmika Mandanna', category: 'Top Heroines' },
  { name: 'Pooja Hegde', category: 'Top Heroines' },
  { name: 'Anushka Shetty', category: 'Top Heroines' },
  { name: 'Sai Pallavi', category: 'Top Heroines' },
  { name: 'Sreeleela', category: 'Top Heroines' },
  { name: 'Kajal Aggarwal', category: 'Top Heroines' },

  // Directors
  { name: 'SS Rajamouli', category: 'Directors' },
  { name: 'Sukumar', category: 'Directors' },
  { name: 'Trivikram Srinivas', category: 'Directors' },
  { name: 'Ram Gopal Varma', category: 'Directors' },

  // Music Directors
  { name: 'Devi Sri Prasad', category: 'Music Directors' },
  { name: 'MM Keeravani', category: 'Music Directors' },
  { name: 'AR Rahman', category: 'Music Directors' },

  // Singers
  { name: 'Chinmayi Sripaada', category: 'Singers' },
  { name: 'SP Balasubrahmanyam', category: 'Singers' },
  { name: 'Shreya Ghoshal', category: 'Singers' },

  // Comedians
  { name: 'Brahmanandam', category: 'Comedians' },
  { name: 'Ali', category: 'Comedians' },

  // Legends
  { name: 'Savitri', category: 'Golden Era' },
  { name: 'Akkineni Nageswara Rao', category: 'Golden Era' },

  // Cross-Industry
  { name: 'Rajinikanth', category: 'Cross-Industry' },
  { name: 'Kamal Haasan', category: 'Cross-Industry' },
  { name: 'Yash', category: 'Cross-Industry' },

  // Bigg Boss
  { name: 'Kaushal Manda', category: 'Bigg Boss' },
  { name: 'Sreemukhi', category: 'Bigg Boss' },

  // TV
  { name: 'Suma Kanakala', category: 'TV Personalities' },
  { name: 'Anasuya Bharadwaj', category: 'TV Personalities' },

  // Sports
  { name: 'PV Sindhu', category: 'Sports' },
  { name: 'Virat Kohli', category: 'Sports' },
  { name: 'MS Dhoni', category: 'Sports' },
];

async function searchTMDBPerson(name: string): Promise<{ id: number; profilePath: string | null } | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&language=en-US&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`TMDB API error for ${name}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const person = data.results[0];
      return {
        id: person.id,
        profilePath: person.profile_path,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching for ${name}:`, error);
    return null;
  }
}

async function runTests() {
  console.log('🎬 TMDB CELEBRITY IMAGE TEST');
  console.log('=============================\n');

  const results: TestResult[] = [];

  for (const celeb of CELEBRITIES_TO_TEST) {
    process.stdout.write(`Testing: ${celeb.name.padEnd(30)}`);

    const person = await searchTMDBPerson(celeb.name);

    if (person && person.profilePath) {
      const imageUrl = `https://image.tmdb.org/t/p/w500${person.profilePath}`;
      console.log(`✅ Found (ID: ${person.id})`);
      results.push({
        celebrity: celeb.name,
        category: celeb.category,
        tmdbId: person.id,
        imageUrl,
        status: 'FOUND',
      });
    } else if (person) {
      console.log(`⚠️  Found but no image (ID: ${person.id})`);
      results.push({
        celebrity: celeb.name,
        category: celeb.category,
        tmdbId: person.id,
        imageUrl: null,
        status: 'NOT_FOUND',
      });
    } else {
      console.log(`❌ Not found on TMDB`);
      results.push({
        celebrity: celeb.name,
        category: celeb.category,
        tmdbId: null,
        imageUrl: null,
        status: 'NOT_FOUND',
      });
    }

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=============================');
  console.log('📊 RESULTS SUMMARY');
  console.log('=============================\n');

  const found = results.filter(r => r.status === 'FOUND');
  const notFound = results.filter(r => r.status === 'NOT_FOUND');

  console.log(`Total Tested: ${results.length}`);
  console.log(`✅ Found with Images: ${found.length}`);
  console.log(`❌ Not Found / No Image: ${notFound.length}`);
  console.log(`📈 Success Rate: ${((found.length / results.length) * 100).toFixed(1)}%`);

  if (notFound.length > 0) {
    console.log('\n⚠️  Celebrities NOT found on TMDB:');
    notFound.forEach(r => {
      console.log(`   - ${r.celebrity} (${r.category})`);
    });
  }

  // Group by category
  console.log('\n📂 Results by Category:');
  const categories = [...new Set(results.map(r => r.category))];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catFound = catResults.filter(r => r.status === 'FOUND').length;
    console.log(`   ${cat}: ${catFound}/${catResults.length}`);
  }

  // Show some sample image URLs
  console.log('\n🖼️  Sample Image URLs:');
  found.slice(0, 10).forEach(r => {
    console.log(`   ${r.celebrity}: ${r.imageUrl}`);
  });
}

runTests();



