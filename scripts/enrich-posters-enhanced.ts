#!/usr/bin/env npx tsx
/**
 * ENHANCED POSTER ENRICHMENT v2.0
 * 
 * Multi-source waterfall for maximum coverage:
 * 
 * Priority 1: TMDB (if tmdb_id exists) - 0.95 confidence
 * Priority 2: TMDB Search (by title+year) - 0.90 confidence  
 * Priority 3: English Wikipedia - 0.85 confidence
 * Priority 4: Telugu Wikipedia - 0.80 confidence (great for classics!)
 * Priority 5: Wikimedia Commons - 0.75 confidence
 * Priority 6: Wikidata (via Q-ID) - 0.70 confidence
 * Priority 7: Internet Archive - 0.65 confidence
 * Priority 8: Google CSE (if configured) - 0.60 confidence
 * 
 * Features:
 * - Parallel batch processing (configurable concurrency)
 * - Decade-based targeting (--decade=1980)
 * - Recent/Classic filters (--recent, --classic)
 * - Telugu Wikipedia for classic films
 * - Confidence scoring and source tracking
 * - Rate limiting per source
 * 
 * Usage:
 *   npx tsx scripts/enrich-posters-enhanced.ts --limit=500 --execute
 *   npx tsx scripts/enrich-posters-enhanced.ts --decade=1980 --execute
 *   npx tsx scripts/enrich-posters-enhanced.ts --classic --execute  # pre-1990
 *   npx tsx scripts/enrich-posters-enhanced.ts --recent --execute   # 2010+
 *   npx tsx scripts/enrich-posters-enhanced.ts --concurrency=30 --execute
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  release_year: number;
  poster_url: string | null;
  tmdb_id: number | null;
  wikidata_id?: string | null;
  director?: string;
  hero?: string;
}

interface PosterResult {
  poster_url: string | null;
  source: string;
  confidence: number;
}

// ============================================================
// SOURCE 1: TMDB (Direct ID lookup)
// ============================================================
async function tryTMDBDirect(tmdbId: number): Promise<PosterResult> {
  if (!TMDB_API_KEY || !tmdbId) return { poster_url: null, source: 'tmdb_direct', confidence: 0 };
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
    if (!res.ok) return { poster_url: null, source: 'tmdb_direct', confidence: 0 };
    
    const data = await res.json();
    if (data.poster_path) {
      return {
        poster_url: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
        source: 'tmdb_direct',
        confidence: 0.95,
      };
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'tmdb_direct', confidence: 0 };
}

// ============================================================
// SOURCE 2: TMDB Search (by title + year)
// ============================================================
async function tryTMDBSearch(title: string, year: number): Promise<PosterResult> {
  if (!TMDB_API_KEY) return { poster_url: null, source: 'tmdb_search', confidence: 0 };
  
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=en-US`;
    const res = await fetch(searchUrl);
    if (!res.ok) return { poster_url: null, source: 'tmdb_search', confidence: 0 };
    
    const data = await res.json();
    if (!data.results?.length) return { poster_url: null, source: 'tmdb_search', confidence: 0 };
    
    // Prefer Telugu language results
    const movie = data.results.find((m: any) => m.original_language === 'te') || data.results[0];
    
    if (movie.poster_path) {
      return {
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        source: 'tmdb_search',
        confidence: 0.90,
      };
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'tmdb_search', confidence: 0 };
}

// ============================================================
// SOURCE 3: English Wikipedia
// ============================================================
async function tryEnglishWikipedia(title: string, year: number): Promise<PosterResult> {
  try {
    const wikiTitle = title.replace(/ /g, '_');
    const patterns = [
      `${wikiTitle}_(${year}_film)`,
      `${wikiTitle}_(Telugu_film)`,
      `${wikiTitle}_(${year}_Telugu_film)`,
      `${wikiTitle}_(film)`,
      wikiTitle,
    ];
    
    for (const pattern of patterns) {
      const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/2.0 (movie-archive)' }
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const description = (data.description || '').toLowerCase();
      const extract = (data.extract || '').toLowerCase();
      const isFilm = description.includes('film') || 
                     description.includes('movie') ||
                     extract.includes('telugu') ||
                     extract.includes('directed by');
      
      if (data.thumbnail?.source && isFilm) {
        // Convert thumbnail to higher resolution
        const thumbUrl = data.thumbnail.source;
        const fullUrl = thumbUrl
          .replace('/thumb/', '/')
          .replace(/\/[0-9]+px-[^/]+$/, '');
        
        return { poster_url: fullUrl, source: 'wikipedia_en', confidence: 0.85 };
      }
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'wikipedia_en', confidence: 0 };
}

// ============================================================
// SOURCE 4: Telugu Wikipedia (Great for classic films!)
// ============================================================
async function tryTeluguWikipedia(title: string, titleTe: string | undefined, year: number): Promise<PosterResult> {
  try {
    // Try Telugu title first if available
    const searchTerms = titleTe 
      ? [titleTe, `${title} (సినిమా)`, `${title} (${year} సినిమా)`, title]
      : [`${title} (సినిమా)`, `${title} (${year} సినిమా)`, title];
    
    for (const term of searchTerms) {
      const wikiTitle = term.replace(/ /g, '_');
      const apiUrl = `https://te.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
      
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/2.0 (movie-archive)' }
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      
      if (data.thumbnail?.source) {
        const thumbUrl = data.thumbnail.source;
        const fullUrl = thumbUrl
          .replace('/thumb/', '/')
          .replace(/\/[0-9]+px-[^/]+$/, '');
        
        return { poster_url: fullUrl, source: 'wikipedia_te', confidence: 0.80 };
      }
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'wikipedia_te', confidence: 0 };
}

// ============================================================
// SOURCE 5: Wikimedia Commons
// ============================================================
async function tryWikimediaCommons(title: string, year: number, director?: string): Promise<PosterResult> {
  try {
    const searchTerms = [
      `${title} ${year} Telugu film poster`,
      `${title} Telugu movie poster`,
      director ? `${title} ${director} film` : null,
    ].filter(Boolean) as string[];
    
    for (const term of searchTerms) {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&format=json&origin=*`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TeluguPortal/2.0' }
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const results = data.query?.search || [];
      
      for (const result of results.slice(0, 5)) {
        const fileTitle = result.title;
        if (!fileTitle.match(/\.(jpg|jpeg|png|gif)$/i)) continue;
        
        // Get image info
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
        const infoRes = await fetch(infoUrl, {
          headers: { 'User-Agent': 'TeluguPortal/2.0' }
        });
        
        if (!infoRes.ok) continue;
        
        const infoData = await infoRes.json();
        const page = Object.values(infoData.query?.pages || {})[0] as any;
        const imageInfo = page?.imageinfo?.[0];
        
        if (imageInfo?.url) {
          const license = imageInfo.extmetadata?.LicenseShortName?.value || '';
          if (license.includes('CC') || license.includes('Public domain') || license.includes('PD')) {
            return { poster_url: imageInfo.url, source: 'wikimedia', confidence: 0.75 };
          }
        }
      }
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'wikimedia', confidence: 0 };
}

// ============================================================
// SOURCE 6: Wikidata (via Q-ID)
// ============================================================
async function tryWikidata(wikidataId: string | null | undefined): Promise<PosterResult> {
  if (!wikidataId) return { poster_url: null, source: 'wikidata', confidence: 0 };
  
  try {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/2.0' }
    });
    
    if (!res.ok) return { poster_url: null, source: 'wikidata', confidence: 0 };
    
    const data = await res.json();
    const entity = data.entities?.[wikidataId];
    
    // P18 is the image property
    const imageClaim = entity?.claims?.P18?.[0];
    if (imageClaim?.mainsnak?.datavalue?.value) {
      const filename = imageClaim.mainsnak.datavalue.value;
      const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
      const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}`;
      
      return { poster_url: imageUrl, source: 'wikidata', confidence: 0.70 };
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'wikidata', confidence: 0 };
}

// ============================================================
// SOURCE 7: Internet Archive
// ============================================================
async function tryInternetArchive(title: string, year: number): Promise<PosterResult> {
  try {
    const query = `${title} Telugu ${year} poster`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title&rows=5&output=json`;
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/2.0' }
    });
    
    if (!res.ok) return { poster_url: null, source: 'archive', confidence: 0 };
    
    const data = await res.json();
    const docs = data.response?.docs || [];
    
    for (const doc of docs) {
      if (!doc.title?.toLowerCase().includes(title.toLowerCase().split(' ')[0])) continue;
      
      const metaUrl = `https://archive.org/metadata/${doc.identifier}`;
      const metaRes = await fetch(metaUrl, {
        headers: { 'User-Agent': 'TeluguPortal/2.0' }
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
          source: 'archive',
          confidence: 0.65,
        };
      }
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'archive', confidence: 0 };
}

// ============================================================
// SOURCE 8: Google Custom Search (if configured)
// ============================================================
async function tryGoogleCSE(title: string, year: number): Promise<PosterResult> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
    return { poster_url: null, source: 'google', confidence: 0 };
  }
  
  try {
    const query = `${title} ${year} Telugu movie poster`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&searchType=image&q=${encodeURIComponent(query)}&num=5`;
    
    const res = await fetch(url);
    if (!res.ok) return { poster_url: null, source: 'google', confidence: 0 };
    
    const data = await res.json();
    const items = data.items || [];
    
    // Find poster-like image (aspect ratio ~2:3)
    for (const item of items) {
      const width = item.image?.width || 0;
      const height = item.image?.height || 0;
      const aspectRatio = height / width;
      
      if (aspectRatio > 1.2 && aspectRatio < 1.8) {
        return { poster_url: item.link, source: 'google', confidence: 0.60 };
      }
    }
    
    // Return first result if no poster-like image
    if (items[0]?.link) {
      return { poster_url: items[0].link, source: 'google', confidence: 0.55 };
    }
  } catch { /* ignore */ }
  return { poster_url: null, source: 'google', confidence: 0 };
}

// ============================================================
// WATERFALL ENRICHMENT
// ============================================================
async function enrichPoster(movie: Movie): Promise<PosterResult> {
  const { title_en, title_te, release_year, tmdb_id, wikidata_id, director } = movie;
  
  // Priority 1: TMDB Direct (if we have ID)
  if (tmdb_id) {
    const result = await tryTMDBDirect(tmdb_id);
    if (result.poster_url) return result;
  }
  
  // Priority 2: TMDB Search
  let result = await tryTMDBSearch(title_en, release_year);
  if (result.poster_url) return result;
  
  // Priority 3: English Wikipedia
  result = await tryEnglishWikipedia(title_en, release_year);
  if (result.poster_url) return result;
  
  // Priority 4: Telugu Wikipedia (especially good for classics)
  result = await tryTeluguWikipedia(title_en, title_te, release_year);
  if (result.poster_url) return result;
  
  // Priority 5: Wikimedia Commons
  result = await tryWikimediaCommons(title_en, release_year, director);
  if (result.poster_url) return result;
  
  // Priority 6: Wikidata
  result = await tryWikidata(wikidata_id);
  if (result.poster_url) return result;
  
  // Priority 7: Internet Archive
  result = await tryInternetArchive(title_en, release_year);
  if (result.poster_url) return result;
  
  // Priority 8: Google CSE (if configured)
  result = await tryGoogleCSE(title_en, release_year);
  if (result.poster_url) return result;
  
  return { poster_url: null, source: 'none', confidence: 0 };
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
  const classic = args.includes('--classic');
  const recent = args.includes('--recent');
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1]) : 20;
  const decade = decadeArg ? parseInt(decadeArg.split('=')[1]) : null;
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║              ENHANCED POSTER ENRICHMENT v2.0                         ║
║                                                                      ║
║   Sources: TMDB → Wikipedia EN → Wikipedia TE → Wikimedia →          ║
║            Wikidata → Internet Archive → Google CSE                  ║
╚══════════════════════════════════════════════════════════════════════╝
`));
  
  console.log(`  Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('EXECUTE')}`);
  console.log(`  Limit: ${limit} movies`);
  console.log(`  Concurrency: ${concurrency} parallel`);
  if (decade) console.log(`  Filter: ${decade}s only`);
  if (classic) console.log(`  Filter: Classic films (pre-1990)`);
  if (recent) console.log(`  Filter: Recent films (2010+)`);
  console.log(`  TMDB API: ${TMDB_API_KEY ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Google CSE: ${GOOGLE_CSE_API_KEY ? chalk.green('✓') : chalk.gray('Not configured')}`);
  console.log('');
  
  // Build query
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, poster_url, tmdb_id, wikidata_id, director, hero')
    .eq('language', 'Telugu')
    .or('poster_url.is.null,poster_url.ilike.%placeholder%');
  
  if (decade) {
    query = query.gte('release_year', decade).lt('release_year', decade + 10);
  } else if (classic) {
    query = query.lt('release_year', 1990);
  } else if (recent) {
    query = query.gte('release_year', 2010);
  }
  
  const { data: movies, error } = await query
    .order('release_year', { ascending: false })
    .limit(limit);
  
  if (error || !movies) {
    console.error(chalk.red(`  Error: ${error?.message}`));
    return;
  }
  
  console.log(`  Found ${chalk.cyan(movies.length)} movies missing posters\n`);
  
  if (movies.length === 0) {
    console.log(chalk.green('  ✅ All movies have posters!'));
    return;
  }
  
  const startTime = Date.now();
  
  // Stats by source
  const stats: Record<string, number> = {
    tmdb_direct: 0,
    tmdb_search: 0,
    wikipedia_en: 0,
    wikipedia_te: 0,
    wikimedia: 0,
    wikidata: 0,
    archive: 0,
    google: 0,
    none: 0,
  };
  
  let enriched = 0;
  let updated = 0;
  
  // Process in batches
  console.log('  Processing...\n');
  
  for (let i = 0; i < movies.length; i += concurrency) {
    const batch = movies.slice(i, Math.min(i + concurrency, movies.length));
    
    const results = await Promise.all(
      batch.map(async (movie) => {
        try {
          const result = await enrichPoster(movie);
          return { movie, result };
        } catch {
          return { movie, result: { poster_url: null, source: 'none', confidence: 0 } as PosterResult };
        }
      })
    );
    
    // Process results
    for (const { movie, result } of results) {
      stats[result.source] = (stats[result.source] || 0) + 1;
      
      if (result.poster_url) {
        enriched++;
        
        if (!dryRun) {
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
            .eq('id', movie.id);
          
          if (!updateError) updated++;
        }
      }
    }
    
    // Progress
    const completed = Math.min(i + concurrency, movies.length);
    const pct = Math.round((completed / movies.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% (${completed}/${movies.length}) | Found: ${enriched}`);
    
    // Small delay between batches
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n');
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const speed = (movies.length / parseFloat(duration)).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════════════════
📊 ENHANCED POSTER ENRICHMENT SUMMARY
═══════════════════════════════════════════════════════════════════════`));
  console.log(`  Processed:    ${movies.length} movies`);
  console.log(`  Found:        ${chalk.green(enriched)} posters (${Math.round(enriched/movies.length*100)}%)`);
  if (!dryRun) console.log(`  Updated:      ${chalk.green(updated)} in database`);
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Speed:        ${chalk.cyan(speed)} movies/sec`);
  
  console.log(`\n  By Source:`);
  console.log(`    TMDB (direct):     ${stats.tmdb_direct}`);
  console.log(`    TMDB (search):     ${stats.tmdb_search}`);
  console.log(`    Wikipedia EN:      ${stats.wikipedia_en}`);
  console.log(`    Wikipedia TE:      ${stats.wikipedia_te}`);
  console.log(`    Wikimedia:         ${stats.wikimedia}`);
  console.log(`    Wikidata:          ${stats.wikidata}`);
  console.log(`    Internet Archive:  ${stats.archive}`);
  console.log(`    Google CSE:        ${stats.google}`);
  console.log(`    Not found:         ${stats.none}`);
  
  if (dryRun) {
    console.log(chalk.yellow(`
  [DRY RUN] No changes were made.
  Run with --execute to apply changes.`));
  } else {
    console.log(chalk.green(`
  ✅ Poster enrichment complete!`));
  }
  
  // Recommendations
  const remaining = stats.none;
  if (remaining > 0) {
    console.log(chalk.cyan(`
  💡 Recommendations for remaining ${remaining} movies:`));
    if (!GOOGLE_CSE_API_KEY) {
      console.log(`     - Configure Google CSE API for additional coverage`);
    }
    console.log(`     - Try --classic flag for pre-1990 films (Telugu Wikipedia)`);
    console.log(`     - Manual review may be needed for very obscure films`);
  }
}

main().catch(console.error);

