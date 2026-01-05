/**
 * Generate Comprehensive Analysis Report
 * 
 * Creates detailed analysis of current Telugu movies database
 * with top/bottom 100 for each category
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Movie {
  id: string;
  slug: string;
  title_en: string;
  release_year: number | null;
  our_rating: number | null;
  verdict: string | null;
  tmdb_id: number | null;
  hero: string | null;
  director: string | null;
  genres: string[] | null;
  is_blockbuster: boolean | null;
  is_classic: boolean | null;
}

async function generateAnalysisReport() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 GENERATING COMPREHENSIVE ANALYSIS REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Fetch all Telugu movies
  let allMovies: Movie[] = [];
  let offset = 0;
  const limit = 1000;

  console.log('📚 Fetching all movies from database...');
  while (true) {
    const { data, error } = await supabase
      .from('movies')
      .select('id, slug, title_en, release_year, our_rating, verdict, tmdb_id, hero, director, genres, is_blockbuster, is_classic')
      .eq('language', 'Telugu')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching movies:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allMovies = allMovies.concat(data);
    offset += limit;
  }

  console.log(`📊 Found ${allMovies.length} Telugu movies`);
  console.log('');

  // Sort by rating
  const moviesWithRating = allMovies.filter(m => m.our_rating && m.our_rating > 0);
  moviesWithRating.sort((a, b) => (b.our_rating || 0) - (a.our_rating || 0));

  // Group by category
  const categories: Record<string, Movie[]> = {
    'masterpiece': [],
    'must-watch': [],
    'mass-classic': [],
    'highly-recommended': [],
    'watchable': [],
    'one-time-watch': [],
    'uncategorized': []
  };

  for (const movie of allMovies) {
    const cat = movie.verdict || 'uncategorized';
    if (categories[cat]) {
      categories[cat].push(movie);
    } else {
      categories['uncategorized'].push(movie);
    }
  }

  // Sort each category by rating
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => (b.our_rating || 0) - (a.our_rating || 0));
  }

  // Era analysis
  const eras: Record<string, Movie[]> = {
    'Pre-1970 (Golden Age)': [],
    '1970-1989 (Classics)': [],
    '1990-2009 (Modern Era)': [],
    '2010-2019 (Contemporary)': [],
    '2020-Present (Current)': []
  };

  for (const movie of moviesWithRating) {
    const year = movie.release_year || 2020;
    if (year < 1970) eras['Pre-1970 (Golden Age)'].push(movie);
    else if (year < 1990) eras['1970-1989 (Classics)'].push(movie);
    else if (year < 2010) eras['1990-2009 (Modern Era)'].push(movie);
    else if (year < 2020) eras['2010-2019 (Contemporary)'].push(movie);
    else eras['2020-Present (Current)'].push(movie);
  }

  // Generate comprehensive report
  let report = `# 🎬 Telugu Movies Comprehensive Analysis Report\n\n`;
  report += `**Generated**: ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `---\n\n`;

  // Executive Summary
  report += `## 📋 Executive Summary\n\n`;
  report += `| Metric | Value |\n|--------|-------|\n`;
  report += `| Total Movies in Database | ${allMovies.length} |\n`;
  report += `| Movies with Ratings | ${moviesWithRating.length} |\n`;
  report += `| Average Rating | ${(moviesWithRating.reduce((s, m) => s + (m.our_rating || 0), 0) / moviesWithRating.length).toFixed(2)} |\n`;
  report += `| Highest Rating | ${moviesWithRating[0]?.our_rating?.toFixed(1) || 'N/A'} |\n`;
  report += `| Lowest Rating | ${moviesWithRating[moviesWithRating.length - 1]?.our_rating?.toFixed(1) || 'N/A'} |\n\n`;

  // Category Distribution
  report += `## 📊 Category Distribution\n\n`;
  report += `| Category | Count | % | Avg Rating | Rating Range |\n`;
  report += `|----------|-------|---|------------|---------------|\n`;
  for (const [cat, movies] of Object.entries(categories)) {
    if (movies.length === 0) continue;
    const avgRating = movies.filter(m => m.our_rating).length > 0
      ? (movies.reduce((sum, m) => sum + (m.our_rating || 0), 0) / movies.filter(m => m.our_rating).length).toFixed(2)
      : 'N/A';
    const minRating = Math.min(...movies.filter(m => m.our_rating).map(m => m.our_rating || 0));
    const maxRating = Math.max(...movies.filter(m => m.our_rating).map(m => m.our_rating || 0));
    const pct = ((movies.length / allMovies.length) * 100).toFixed(1);
    report += `| **${cat}** | ${movies.length} | ${pct}% | ${avgRating} | ${minRating.toFixed(1)} - ${maxRating.toFixed(1)} |\n`;
  }
  report += '\n';

  // Era Distribution
  report += `## 📅 Era Distribution\n\n`;
  report += `| Era | Count | Avg Rating |\n`;
  report += `|-----|-------|------------|\n`;
  for (const [era, movies] of Object.entries(eras)) {
    const avgRating = movies.length > 0
      ? (movies.reduce((sum, m) => sum + (m.our_rating || 0), 0) / movies.length).toFixed(2)
      : 'N/A';
    report += `| ${era} | ${movies.length} | ${avgRating} |\n`;
  }
  report += '\n';

  // TOP 100 OVERALL
  report += `---\n\n`;
  report += `## 🏆 TOP 100 MOVIES (Overall)\n\n`;
  report += `| # | Title | Year | Rating | Category | Hero | Director |\n`;
  report += `|---|-------|------|--------|----------|------|----------|\n`;
  moviesWithRating.slice(0, 100).forEach((m, i) => {
    report += `| ${i + 1} | **${m.title_en}** | ${m.release_year || 'N/A'} | ${m.our_rating?.toFixed(1)} | ${m.verdict || 'N/A'} | ${m.hero || '-'} | ${m.director || '-'} |\n`;
  });
  report += '\n';

  // BOTTOM 100 OVERALL
  report += `## 📉 BOTTOM 100 MOVIES (Overall)\n\n`;
  report += `| # | Title | Year | Rating | Category |\n`;
  report += `|---|-------|------|--------|----------|\n`;
  const bottom100 = [...moviesWithRating].reverse().slice(0, 100);
  bottom100.forEach((m, i) => {
    report += `| ${i + 1} | ${m.title_en} | ${m.release_year || 'N/A'} | ${m.our_rating?.toFixed(1)} | ${m.verdict || 'N/A'} |\n`;
  });
  report += '\n';

  // Per-Category Analysis
  for (const [cat, movies] of Object.entries(categories)) {
    if (movies.length === 0) continue;

    report += `---\n\n`;
    report += `## 📁 ${cat.toUpperCase()}\n\n`;
    report += `**Total**: ${movies.length} movies\n\n`;

    // Top 100 in this category
    const top100 = movies.slice(0, 100);
    report += `### Top ${Math.min(100, movies.length)} in ${cat}\n\n`;
    report += `| # | Title | Year | Rating | Hero | Director |\n`;
    report += `|---|-------|------|--------|------|----------|\n`;
    top100.forEach((m, i) => {
      report += `| ${i + 1} | **${m.title_en}** | ${m.release_year || 'N/A'} | ${m.our_rating?.toFixed(1) || 'N/A'} | ${m.hero || '-'} | ${m.director || '-'} |\n`;
    });
    report += '\n';

    // Bottom 100 if category has > 100 movies
    if (movies.length > 100) {
      const bottom = [...movies].reverse().slice(0, 100);
      report += `### Bottom 100 in ${cat}\n\n`;
      report += `| # | Title | Year | Rating |\n`;
      report += `|---|-------|------|--------|\n`;
      bottom.forEach((m, i) => {
        report += `| ${i + 1} | ${m.title_en} | ${m.release_year || 'N/A'} | ${m.our_rating?.toFixed(1) || 'N/A'} |\n`;
      });
      report += '\n';
    }
  }

  // Era-wise Top Movies
  report += `---\n\n`;
  report += `## 📅 TOP MOVIES BY ERA\n\n`;
  for (const [era, movies] of Object.entries(eras)) {
    if (movies.length === 0) continue;
    report += `### ${era}\n\n`;
    report += `| # | Title | Year | Rating | Category |\n`;
    report += `|---|-------|------|--------|----------|\n`;
    movies.sort((a, b) => (b.our_rating || 0) - (a.our_rating || 0)).slice(0, 20).forEach((m, i) => {
      report += `| ${i + 1} | **${m.title_en}** | ${m.release_year} | ${m.our_rating?.toFixed(1)} | ${m.verdict || 'N/A'} |\n`;
    });
    report += '\n';
  }

  // Write reports
  fs.writeFileSync('docs/FULL-ANALYSIS-REPORT.md', report);
  console.log('📄 Full report saved to docs/FULL-ANALYSIS-REPORT.md');

  // Create JSON for programmatic use
  const jsonData = {
    generated_at: new Date().toISOString(),
    summary: {
      total_movies: allMovies.length,
      movies_with_rating: moviesWithRating.length,
      average_rating: parseFloat((moviesWithRating.reduce((s, m) => s + (m.our_rating || 0), 0) / moviesWithRating.length).toFixed(2)),
      highest_rating: moviesWithRating[0]?.our_rating || null,
      lowest_rating: moviesWithRating[moviesWithRating.length - 1]?.our_rating || null
    },
    category_distribution: Object.entries(categories).map(([cat, movies]) => ({
      category: cat,
      count: movies.length,
      percentage: parseFloat(((movies.length / allMovies.length) * 100).toFixed(1)),
      avg_rating: movies.filter(m => m.our_rating).length > 0
        ? parseFloat((movies.reduce((sum, m) => sum + (m.our_rating || 0), 0) / movies.filter(m => m.our_rating).length).toFixed(2))
        : null
    })),
    era_distribution: Object.entries(eras).map(([era, movies]) => ({
      era,
      count: movies.length,
      avg_rating: movies.length > 0
        ? parseFloat((movies.reduce((sum, m) => sum + (m.our_rating || 0), 0) / movies.length).toFixed(2))
        : null
    })),
    top_100_overall: moviesWithRating.slice(0, 100).map((m, i) => ({
      rank: i + 1,
      slug: m.slug,
      title: m.title_en,
      year: m.release_year,
      rating: m.our_rating,
      category: m.verdict,
      hero: m.hero,
      director: m.director
    })),
    bottom_100_overall: bottom100.map((m, i) => ({
      rank: i + 1,
      slug: m.slug,
      title: m.title_en,
      year: m.release_year,
      rating: m.our_rating,
      category: m.verdict
    })),
    by_category: Object.fromEntries(
      Object.entries(categories).map(([cat, movies]) => [
        cat,
        {
          count: movies.length,
          top_100: movies.slice(0, 100).map((m, i) => ({
            rank: i + 1,
            slug: m.slug,
            title: m.title_en,
            year: m.release_year,
            rating: m.our_rating,
            hero: m.hero,
            director: m.director
          })),
          bottom_100: movies.length > 100 
            ? [...movies].reverse().slice(0, 100).map((m, i) => ({
                rank: i + 1,
                slug: m.slug,
                title: m.title_en,
                year: m.release_year,
                rating: m.our_rating
              }))
            : []
        }
      ])
    ),
    by_era: Object.fromEntries(
      Object.entries(eras).map(([era, movies]) => [
        era,
        {
          count: movies.length,
          top_20: movies.sort((a, b) => (b.our_rating || 0) - (a.our_rating || 0)).slice(0, 20).map((m, i) => ({
            rank: i + 1,
            slug: m.slug,
            title: m.title_en,
            year: m.release_year,
            rating: m.our_rating,
            category: m.verdict
          }))
        }
      ])
    )
  };

  fs.writeFileSync('docs/FULL-ANALYSIS-DATA.json', JSON.stringify(jsonData, null, 2));
  console.log('📄 JSON data saved to docs/FULL-ANALYSIS-DATA.json');
  console.log('');

  // Print summary to console
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Total Movies: ${allMovies.length}`);
  console.log(`  Movies with Rating: ${moviesWithRating.length}`);
  console.log(`  Average Rating: ${(moviesWithRating.reduce((s, m) => s + (m.our_rating || 0), 0) / moviesWithRating.length).toFixed(2)}`);
  console.log('');
  console.log('  CATEGORY DISTRIBUTION:');
  for (const [cat, movies] of Object.entries(categories)) {
    if (movies.length === 0) continue;
    const bar = '█'.repeat(Math.min(50, Math.round(movies.length / 30)));
    console.log(`    ${cat.padEnd(20)}: ${String(movies.length).padStart(5)} ${bar}`);
  }
  console.log('');
  console.log('  ERA DISTRIBUTION:');
  for (const [era, movies] of Object.entries(eras)) {
    const bar = '█'.repeat(Math.min(50, Math.round(movies.length / 30)));
    console.log(`    ${era.padEnd(25)}: ${String(movies.length).padStart(5)} ${bar}`);
  }
  console.log('');

  console.log('  🏆 TOP 20 MOVIES:');
  moviesWithRating.slice(0, 20).forEach((m, i) => {
    console.log(`    ${String(i + 1).padStart(2)}. ${m.title_en} (${m.release_year}) - ${m.our_rating?.toFixed(1)} [${m.verdict}]`);
  });
  console.log('');

  console.log('  📉 BOTTOM 20 MOVIES:');
  bottom100.slice(0, 20).forEach((m, i) => {
    console.log(`    ${String(i + 1).padStart(2)}. ${m.title_en} (${m.release_year}) - ${m.our_rating?.toFixed(1)} [${m.verdict}]`);
  });
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Analysis complete! Check docs/FULL-ANALYSIS-REPORT.md for details');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

generateAnalysisReport();


