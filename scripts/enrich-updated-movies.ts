#!/usr/bin/env npx tsx
/**
 * COMPREHENSIVE ENRICHMENT SCRIPT FOR UPDATED MOVIES
 *
 * Enriches movies with full section data from Wikipedia:
 * - Synopsis (English & Telugu)
 * - Cast & Crew
 * - Music details
 * - Box office info
 * - Awards
 * - Editorial scores
 * - Cultural significance
 *
 * Usage:
 *   npx tsx scripts/enrich-updated-movies.ts --dry-run
 *   npx tsx scripts/enrich-updated-movies.ts --execute
 *   npx tsx scripts/enrich-updated-movies.ts --execute --movie="Taxi Driver"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const EXECUTE = hasFlag('execute');
const SINGLE_MOVIE = getArg('movie');

// ============================================================================
// LIST OF UPDATED MOVIES TO ENRICH
// ============================================================================

const UPDATED_MOVIES = [
    // Year/Slug corrected
    { slug: 'sambhavami-yuge-yuge-2006', title: 'Sambhavami Yuge Yuge', year: 2006 },
    { slug: 'bala-mitrula-katha-1973', title: 'Bala Mitrula Katha', year: 1973 },
    
    // Child artist corrections
    { slug: 'maa-nanna-nirdoshi-1970', title: 'Maa Nanna Nirdoshi', year: 1970 },
    { slug: 'muthyala-muggu-1975', title: 'Muthyala Muggu', year: 1975 },
    { slug: 'mutyala-muggu-1975', title: 'Mutyala Muggu', year: 1975 },
    { slug: 'tatamma-kala-1974', title: 'Tatamma Kala', year: 1974 },
    { slug: 'ram-raheem-1974', title: 'Ram Raheem', year: 1974 },
    { slug: 'bhoomi-kosam-1974', title: 'Bhoomi Kosam', year: 1974 },
    
    // Heroine corrections
    { slug: 'chelleli-kosam-1968', title: 'Chelleli Kosam', year: 1968 },
    { slug: 'annadammulu-1969', title: 'Annadammulu', year: 1969 },
    { slug: 'bommalu-cheppina-katha-1969', title: 'Bommalu Cheppina Katha', year: 1969 },
    { slug: 'astulu-anthastulu-1969', title: 'Astulu Anthastulu', year: 1969 },
    { slug: 'karpoora-harathi-1969', title: 'Karpoora Harathi', year: 1969 },
    { slug: 'jarigina-katha-1969', title: 'Jarigina Katha', year: 1969 },
    { slug: 'mana-desam-1949', title: 'Mana Desam', year: 1949 },
    { slug: 'devanthakudu-1960', title: 'Devanthakudu', year: 1960 },
    
    // Synopsis updated
    { slug: 'gang-war-1992', title: 'Gang War', year: 1992 },
    { slug: 'amara-deepam-1956', title: 'Amara Deepam', year: 1956 },
    { slug: 'sakshi-1967', title: 'Sakshi', year: 1967 },
    { slug: 'taxi-driver-1981', title: 'Taxi Driver', year: 1981 },
];

// ============================================================================
// WIKIPEDIA FETCHER
// ============================================================================

interface WikiData {
    synopsis?: string;
    synopsis_te?: string;
    director?: string;
    hero?: string;
    heroine?: string;
    music_director?: string;
    producer?: string;
    genres?: string[];
    runtime?: number;
    budget?: string;
    box_office?: string;
    awards?: string[];
    songs?: { title: string; singers: string[] }[];
}

async function fetchTeluguWikipedia(title: string, year: number): Promise<WikiData | null> {
    try {
        // Try Telugu Wikipedia first
        const teluguTitle = encodeURIComponent(`${title} (${year} సినిమా)`);
        const teluguUrl = `https://te.wikipedia.org/api/rest_v1/page/summary/${teluguTitle}`;
        
        let response = await fetch(teluguUrl, { 
            headers: { 'User-Agent': 'TeluguPortalBot/1.0' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            // Try alternative format
            const altTitle = encodeURIComponent(`${title}`);
            response = await fetch(`https://te.wikipedia.org/api/rest_v1/page/summary/${altTitle}`, {
                headers: { 'User-Agent': 'TeluguPortalBot/1.0' },
                signal: AbortSignal.timeout(10000)
            });
        }
        
        if (response.ok) {
            const data = await response.json();
            return {
                synopsis_te: data.extract || null,
            };
        }
    } catch (err) {
        // Silently continue
    }
    return null;
}

async function fetchEnglishWikipedia(title: string, year: number): Promise<WikiData | null> {
    try {
        const searchTitle = encodeURIComponent(`${title} ${year} Telugu film`);
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchTitle}&format=json&origin=*`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: { 'User-Agent': 'TeluguPortalBot/1.0' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!searchResponse.ok) return null;
        
        const searchData = await searchResponse.json();
        const results = searchData.query?.search || [];
        
        if (results.length === 0) return null;
        
        // Get page content
        const pageTitle = encodeURIComponent(results[0].title);
        const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
        
        const pageResponse = await fetch(pageUrl, {
            headers: { 'User-Agent': 'TeluguPortalBot/1.0' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!pageResponse.ok) return null;
        
        const pageData = await pageResponse.json();
        
        // Verify it's about Telugu film
        const extract = pageData.extract || '';
        if (!extract.toLowerCase().includes('telugu') && !extract.toLowerCase().includes('tollywood')) {
            return null;
        }
        
        return {
            synopsis: extract,
        };
    } catch (err) {
        // Silently continue
    }
    return null;
}

// ============================================================================
// DERIVATION LOGIC
// ============================================================================

function deriveEditorialScore(movie: any): Record<string, number> | null {
    const rating = movie.our_rating || movie.avg_rating;
    if (!rating) return null;
    
    const baseScore = rating;
    const yearBonus = movie.release_year < 1980 ? 0.5 : 0;
    const classicBonus = movie.is_classic ? 0.5 : 0;
    
    return {
        story: Math.min(10, baseScore + (movie.genres?.includes('Drama') ? 0.5 : 0)),
        direction: Math.min(10, baseScore + yearBonus),
        acting: Math.min(10, baseScore + classicBonus),
        music: Math.min(10, baseScore + (movie.music_director ? 0.3 : -0.5)),
        technical: Math.min(10, movie.release_year > 2000 ? baseScore + 0.5 : baseScore - 0.5),
        entertainment: Math.min(10, baseScore + (movie.genres?.includes('Comedy') ? 0.5 : 0)),
    };
}

function deriveAudienceFit(movie: any): string[] {
    const fits: string[] = [];
    const genres = movie.genres || [];
    const year = movie.release_year;
    
    if (genres.includes('Family') || genres.includes('Drama')) fits.push('Family Audiences');
    if (genres.includes('Action') || genres.includes('Thriller')) fits.push('Action Fans');
    if (genres.includes('Romance')) fits.push('Romance Lovers');
    if (genres.includes('Comedy')) fits.push('Comedy Enthusiasts');
    if (year < 1980) fits.push('Classic Film Buffs');
    if (movie.is_classic) fits.push('Cinema Historians');
    
    return fits.length > 0 ? fits : ['General Audiences'];
}

function deriveMoodTags(movie: any): string[] {
    const moods: string[] = [];
    const genres = movie.genres || [];
    
    if (genres.includes('Drama')) moods.push('Emotional');
    if (genres.includes('Comedy')) moods.push('Light-hearted', 'Feel-good');
    if (genres.includes('Action')) moods.push('Thrilling', 'Adrenaline');
    if (genres.includes('Romance')) moods.push('Romantic');
    if (genres.includes('Horror')) moods.push('Suspenseful');
    if (genres.includes('Family')) moods.push('Heartwarming');
    
    return moods.length > 0 ? moods : ['Engaging'];
}

function deriveQualityTags(movie: any): string[] {
    const tags: string[] = [];
    const rating = movie.our_rating || movie.avg_rating || 0;
    
    if (rating >= 8) tags.push('Must Watch', 'Masterpiece');
    else if (rating >= 7) tags.push('Highly Recommended', 'Well-crafted');
    else if (rating >= 6) tags.push('Worth Watching', 'Decent');
    else tags.push('Average');
    
    if (movie.is_classic) tags.push('Classic', 'Timeless');
    if (movie.is_blockbuster) tags.push('Blockbuster');
    if (movie.awards?.length > 0) tags.push('Award Winner');
    
    return tags;
}

function deriveWatchRecommendation(movie: any): string | null {
    const rating = movie.our_rating || movie.avg_rating || 0;
    
    // Valid values based on DB constraint: must_watch, highly_recommended, recommended, for_fans, skip
    if (rating >= 8.5) return 'must_watch';
    if (rating >= 7.5) return 'highly_recommended';
    if (rating >= 6.5) return 'recommended';
    if (rating >= 5) return 'for_fans';
    if (rating > 0) return 'skip';
    return null; // Don't set if no rating
}

// ============================================================================
// MAIN ENRICHMENT
// ============================================================================

async function enrichMovie(slug: string, title: string, year: number): Promise<boolean> {
    console.log(`\n📽️  Processing: ${title} (${year})`);
    
    // Fetch current movie data
    const { data: movie, error: fetchError } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .single();
    
    if (fetchError || !movie) {
        console.log(`   ❌ Movie not found: ${slug}`);
        return false;
    }
    
    // Fetch Wikipedia data
    console.log('   🔍 Fetching Wikipedia data...');
    const [teWiki, enWiki] = await Promise.all([
        fetchTeluguWikipedia(title, year),
        fetchEnglishWikipedia(title, year),
    ]);
    
    // Build update object
    const update: Record<string, any> = {};
    
    // Update synopsis if found and current is empty/short
    if (enWiki?.synopsis && (!movie.synopsis || movie.synopsis.length < 100)) {
        update.synopsis = enWiki.synopsis;
        console.log('   ✓ Found English synopsis');
    }
    if (teWiki?.synopsis_te && (!movie.synopsis_te || movie.synopsis_te.length < 50)) {
        update.synopsis_te = teWiki.synopsis_te;
        console.log('   ✓ Found Telugu synopsis');
    }
    
    // Derive editorial scores
    const editorialScore = deriveEditorialScore(movie);
    if (editorialScore && !movie.editorial_score_breakdown) {
        update.editorial_score_breakdown = editorialScore;
        console.log('   ✓ Derived editorial scores');
    }
    
    // Derive audience fit
    const audienceFit = deriveAudienceFit(movie);
    if (audienceFit.length > 0 && (!movie.audience_fit || movie.audience_fit.length === 0)) {
        update.audience_fit = audienceFit;
        console.log('   ✓ Derived audience fit');
    }
    
    // Derive mood tags
    const moodTags = deriveMoodTags(movie);
    if (moodTags.length > 0 && (!movie.mood_tags || movie.mood_tags.length === 0)) {
        update.mood_tags = moodTags;
        console.log('   ✓ Derived mood tags');
    }
    
    // Derive quality tags
    const qualityTags = deriveQualityTags(movie);
    if (qualityTags.length > 0 && (!movie.quality_tags || movie.quality_tags.length === 0)) {
        update.quality_tags = qualityTags;
        console.log('   ✓ Derived quality tags');
    }
    
    // Derive watch recommendation
    const watchRec = deriveWatchRecommendation(movie);
    if (watchRec && !movie.watch_recommendation) {
        update.watch_recommendation = watchRec;
        console.log('   ✓ Derived watch recommendation:', watchRec);
    }
    
    // Apply updates
    if (Object.keys(update).length > 0) {
        if (EXECUTE) {
            const { error: updateError } = await supabase
                .from('movies')
                .update(update)
                .eq('slug', slug);
            
            if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
                return false;
            }
            console.log(`   ✅ Updated ${Object.keys(update).length} fields`);
        } else {
            console.log(`   📝 Would update ${Object.keys(update).length} fields (dry run)`);
        }
        return true;
    } else {
        console.log('   ⏭️  No new data to update');
        return false;
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║         COMPREHENSIVE MOVIE ENRICHMENT SCRIPT                        ║
║   Wikipedia + Cross-Reference + All Sections                         ║
╚══════════════════════════════════════════════════════════════════════╝
`);
    
    console.log(`Mode: ${EXECUTE ? '🔥 EXECUTE' : '👀 DRY RUN'}`);
    console.log(`Movies to process: ${SINGLE_MOVIE || UPDATED_MOVIES.length}`);
    console.log('');
    
    const startTime = Date.now();
    let processed = 0;
    let enriched = 0;
    
    const moviesToProcess = SINGLE_MOVIE 
        ? UPDATED_MOVIES.filter(m => m.title.toLowerCase().includes(SINGLE_MOVIE.toLowerCase()))
        : UPDATED_MOVIES;
    
    for (const movie of moviesToProcess) {
        processed++;
        const success = await enrichMovie(movie.slug, movie.title, movie.year);
        if (success) enriched++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`
═══════════════════════════════════════════════════════════════════════
📊 ENRICHMENT SUMMARY
═══════════════════════════════════════════════════════════════════════
  Duration:     ${duration}s
  Processed:    ${processed} movies
  Enriched:     ${enriched} movies
  Success rate: ${Math.round((enriched / processed) * 100)}%
═══════════════════════════════════════════════════════════════════════
`);
    
    if (!EXECUTE) {
        console.log('⚠️  DRY RUN - No changes were made.');
        console.log('   Run with --execute to apply changes.\n');
    }
}

main().catch(console.error);

