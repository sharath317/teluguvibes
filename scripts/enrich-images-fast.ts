#!/usr/bin/env npx tsx
/**
 * FAST IMAGE ENRICHMENT (PARALLEL) v2
 * 
 * Uses the ExecutionController for 10-20x faster enrichment.
 * Fetches images from multiple sources in parallel batches.
 * 
 * Sources (in priority order):
 * 1. TMDB (0.95 confidence) - Best for modern films
 * 2. Wikipedia (0.90 confidence) - Great for Telugu films with wiki pages
 * 3. Wikimedia Commons (0.85 confidence) - Free licensed images
 * 4. Internet Archive (0.75 confidence) - Archival content
 * 
 * Usage:
 *   npx tsx scripts/enrich-images-fast.ts --limit=500
 *   npx tsx scripts/enrich-images-fast.ts --limit=500 --execute
 *   npx tsx scripts/enrich-images-fast.ts --concurrency=30 --execute
 *   npx tsx scripts/enrich-images-fast.ts --decade=1990 --execute
 *   npx tsx scripts/enrich-images-fast.ts --recent --execute  # 2010+ only
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================
// CONFIG
// ============================================================

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Movie {
  id: string;
  title_en: string;
  release_year: number;
  poster_url: string | null;
  tmdb_id: number | null;
}

interface EnrichmentResult {
  movieId: string;
  poster_url: string | null;
  source: string;
  confidence: number;
}

// ============================================================
// WIKIPEDIA API - Very effective for Telugu films!
// ============================================================

async function tryWikipedia(title: string, year: number): Promise<{ poster_url: string | null; confidence: number }> {
  try {
    const wikiTitle = title.replace(/ /g, '_');
    
    // Try different Wikipedia page patterns (Telugu films often have these)
    const patterns = [
      `${wikiTitle}_(${year}_film)`,
      `${wikiTitle}_(Telugu_film)`,
      `${wikiTitle}_(film)`,
      wikiTitle,
    ];
    
    for (const pattern of patterns) {
      const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Check if this is actually a film page (not a person or other)
      const description = (data.description || '').toLowerCase();
      const extract = (data.extract || '').toLowerCase();
      const isFilm = description.includes('film') || 
                     description.includes('movie') ||
                     extract.includes('telugu') ||
                     extract.includes('directed by') ||
                     extract.includes('starring');
      
      if (data.thumbnail?.source && isFilm) {
        // Convert thumbnail to full size
        const thumbUrl = data.thumbnail.source;
        const fullUrl = thumbUrl
          .replace('/thumb/', '/')
          .replace(/\/[0-9]+px-[^/]+$/, '');
        
        return { poster_url: fullUrl, confidence: 0.90 };
      }
    }
    return { poster_url: null, confidence: 0 };
  } catch {
    return { poster_url: null, confidence: 0 };
  }
}

// ============================================================
// SOURCE FETCHERS
// ============================================================

async function tryTMDB(title: string, year: number): Promise<{ poster_url: string | null; confidence: number }> {
  if (!TMDB_API_KEY) return { poster_url: null, confidence: 0 };
  
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=en-US`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) return { poster_url: null, confidence: 0 };
    
    const movie = data.results.find((m: any) => m.original_language === 'te') || data.results[0];
    
    if (movie.poster_path) {
      return {
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        confidence: 0.95,
      };
    }
    return { poster_url: null, confidence: 0 };
  } catch {
    return { poster_url: null, confidence: 0 };
  }
}

async function tryWikimediaCommons(title: string, year: number): Promise<{ poster_url: string | null; confidence: number }> {
  try {
    const searchTerms = [
      `${title} ${year} Telugu film`,
      `${title} Telugu movie`,
    ];
    
    for (const term of searchTerms) {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&format=json&origin=*`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TeluguPortal/1.0' }
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const results = data.query?.search || [];
      
      for (const result of results.slice(0, 3)) {
        const fileTitle = result.title;
        if (!fileTitle.match(/\.(jpg|jpeg|png|gif)$/i)) continue;
        
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
        const infoRes = await fetch(infoUrl, {
          headers: { 'User-Agent': 'TeluguPortal/1.0' }
        });
        
        if (!infoRes.ok) continue;
        
        const infoData = await infoRes.json();
        const page = Object.values(infoData.query?.pages || {})[0] as any;
        const imageInfo = page?.imageinfo?.[0];
        
        if (imageInfo?.url) {
          const license = imageInfo.extmetadata?.LicenseShortName?.value || '';
          if (license.includes('CC') || license.includes('Public domain') || license.includes('PD')) {
            return { poster_url: imageInfo.url, confidence: 0.85 };
          }
        }
      }
    }
    return { poster_url: null, confidence: 0 };
  } catch {
    return { poster_url: null, confidence: 0 };
  }
}

async function tryInternetArchive(title: string, year: number): Promise<{ poster_url: string | null; confidence: number }> {
  try {
    const query = `${title} Telugu ${year}`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title&rows=5&output=json`;
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/1.0' }
    });
    
    if (!res.ok) return { poster_url: null, confidence: 0 };
    
    const data = await res.json();
    const docs = data.response?.docs || [];
    
    for (const doc of docs) {
      if (!doc.title?.toLowerCase().includes(title.toLowerCase().split(' ')[0])) continue;
      
      const metaUrl = `https://archive.org/metadata/${doc.identifier}`;
      const metaRes = await fetch(metaUrl, {
        headers: { 'User-Agent': 'TeluguPortal/1.0' }
      });
      
      if (!metaRes.ok) continue;
      
      const meta = await metaRes.json();
      const files = meta.files || [];
      
      const imageFile = files.find((f: any) =>
        f.format?.includes('JPEG') ||
        f.format?.includes('PNG') ||
        f.name?.match(/\.(jpg|jpeg|png|gif)$/i)
      );
      
      if (imageFile) {
        return {
          poster_url: `https://archive.org/download/${doc.identifier}/${imageFile.name}`,
          confidence: 0.75,
        };
      }
    }
    return { poster_url: null, confidence: 0 };
  } catch {
    return { poster_url: null, confidence: 0 };
  }
}

// ============================================================
// MAIN ENRICHMENT FUNCTION (for single movie)
// ============================================================

async function enrichMovie(movie: Movie): Promise<EnrichmentResult> {
  const { title_en, release_year } = movie;
  
  // Try TMDB first (fastest, best quality)
  let result = await tryTMDB(title_en, release_year);
  if (result.poster_url) {
    return { movieId: movie.id, ...result, source: 'tmdb' };
  }
  
  // Try Wikipedia (very effective for Telugu films!)
  result = await tryWikipedia(title_en, release_year);
  if (result.poster_url) {
    return { movieId: movie.id, ...result, source: 'wikipedia' };
  }
  
  // Try Wikimedia Commons (free licensed images)
  result = await tryWikimediaCommons(title_en, release_year);
  if (result.poster_url) {
    return { movieId: movie.id, ...result, source: 'wikimedia' };
  }
  
  // Try Internet Archive (archival content)
  result = await tryInternetArchive(title_en, release_year);
  if (result.poster_url) {
    return { movieId: movie.id, ...result, source: 'internet_archive' };
  }
  
  return { movieId: movie.id, poster_url: null, source: 'none', confidence: 0 };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
  const decadeArg = args.find(a => a.startsWith('--decade='));
  const recentOnly = args.includes('--recent');
  const oldOnly = args.includes('--old');
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 25;
  const decade = decadeArg ? parseInt(decadeArg.split('=')[1]) : null;
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║         FAST IMAGE ENRICHMENT (PARALLEL) v2                   ║
║    TMDB → Wikipedia → Wikimedia Commons → Internet Archive    ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  console.log(`  Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log(`  Limit: ${limit} movies`);
  console.log(`  Concurrency: ${concurrency} parallel requests`);
  if (decade) console.log(`  Decade: ${decade}s`);
  if (recentOnly) console.log(`  Filter: 2010+ only`);
  if (oldOnly) console.log(`  Filter: Pre-1990 only`);
  console.log(`  Sources: TMDB → Wikipedia → Wikimedia → Archive\n`);
  
  // Build query with filters
  console.log('  Fetching movies with placeholder images...');
  
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, poster_url, tmdb_id')
    .eq('language', 'Telugu')
    .or('poster_url.is.null,poster_url.ilike.%placeholder%');
  
  // Apply decade filter
  if (decade) {
    query = query.gte('release_year', decade).lt('release_year', decade + 10);
  } else if (recentOnly) {
    query = query.gte('release_year', 2010);
  } else if (oldOnly) {
    query = query.lt('release_year', 1990);
  }
  
  const { data: movies, error } = await query
    .order('release_year', { ascending: false })
    .limit(limit);
  
  if (error || !movies) {
    console.error(chalk.red(`  Error: ${error?.message}`));
    return;
  }
  
  console.log(`  Found ${chalk.cyan(movies.length)} movies to process\n`);
  
  if (movies.length === 0) {
    console.log(chalk.green('  ✅ No placeholder images found!'));
    return;
  }
  
  const startTime = Date.now();
  
  // Stats
  const stats = {
    tmdb: 0,
    wikipedia: 0,
    wikimedia: 0,
    internet_archive: 0,
    none: 0,
  };
  
  let enriched = 0;
  let failed = 0;
  
  // Run in parallel with progress
  console.log('  Processing...\n');
  
  // Process with concurrency control
  const results: EnrichmentResult[] = [];
  const batchSize = concurrency;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, Math.min(i + batchSize, movies.length));
    
    const batchPromises = batch.map(async (movie) => {
      try {
        return await enrichMovie(movie);
      } catch (error) {
        failed++;
        return { movieId: movie.id, poster_url: null, source: 'none', confidence: 0 } as EnrichmentResult;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const res of batchResults) {
      results.push(res);
      if (res && res.source) {
        stats[res.source as keyof typeof stats]++;
        if (res.poster_url) enriched++;
      }
    }
    
    const completed = Math.min(i + batchSize, movies.length);
    const pct = Math.round((completed / movies.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% (${completed}/${movies.length}) | Enriched: ${enriched}`);
  }
  
  console.log('\n');
  
  // Apply updates to database
  if (!dryRun && enriched > 0) {
    console.log('  Applying updates to database...');
    
    let updated = 0;
    const successResults = results.filter(r => r.poster_url);
    
    // Batch update in chunks of 50
    for (let i = 0; i < successResults.length; i += 50) {
      const chunk = successResults.slice(i, i + 50);
      
      for (const result of chunk) {
        const { error: updateError } = await supabase
          .from('movies')
          .update({
            poster_url: result.poster_url,
            poster_confidence: result.confidence,
            poster_visual_type: 'original_poster',
            archival_source: {
              source_name: result.source,
              acquisition_date: new Date().toISOString(),
            },
          })
          .eq('id', result.movieId);
        
        if (!updateError) updated++;
      }
    }
    
    console.log(`  Updated ${chalk.green(updated)} movies in database\n`);
  }
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const speed = (movies.length / parseFloat(duration)).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 ENRICHMENT SUMMARY
═══════════════════════════════════════════════════════════`));
  console.log(`  Processed:    ${movies.length} movies`);
  console.log(`  Enriched:     ${chalk.green(enriched)} movies (${Math.round(enriched/movies.length*100)}%)`);
  console.log(`  Failed:       ${failed} tasks`);
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Speed:        ${chalk.cyan(speed)} movies/sec`);
  console.log(`
  By Source:`);
  console.log(`    TMDB:             ${stats.tmdb}`);
  console.log(`    Wikipedia:        ${stats.wikipedia}`);
  console.log(`    Wikimedia:        ${stats.wikimedia}`);
  console.log(`    Internet Archive: ${stats.internet_archive}`);
  console.log(`    No image found:   ${stats.none}`);
  
  if (dryRun) {
    console.log(chalk.yellow(`
  [DRY RUN] No changes were made.
  Run with --execute to apply changes.`));
  } else {
    console.log(chalk.green(`
  ✅ Enrichment complete!`));
  }
}

main().catch(console.error);

