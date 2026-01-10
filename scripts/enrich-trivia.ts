/**
 * Trivia & Box Office Enrichment Script
 *
 * Enriches movies with box office data, production trivia, and cultural impact
 *
 * Usage:
 *   npx tsx scripts/enrich-trivia.ts --type=box_office --limit=100 --execute
 *   npx tsx scripts/enrich-trivia.ts --type=trivia --limit=100 --execute
 *   npx tsx scripts/enrich-trivia.ts --decade=2000s --execute
 *
 * Sources:
 *   - Wikipedia (production sections, box office)
 *   - Sacnilk (recent box office data)
 *   - Archive.org (historical records)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '50'));
const EXECUTE = hasFlag('execute');
const TYPE = getArg('type', 'all'); // box_office, trivia, all
const DECADE = getArg('decade', '');

interface BoxOfficeData {
    budget?: string;
    opening_day?: string;
    opening_weekend?: string;
    first_week?: string;
    lifetime_gross?: string;
    verdict?: string;
    records_broken?: string[];
    source: string;
}

interface TriviaData {
    production_trivia?: string[];
    shooting_locations?: string[];
    cultural_impact?: string;
    memorable_dialogues?: string[];
    controversies?: string[];
    awards_notes?: string[];
    source: string;
}

interface Movie {
    id: string;
    title_en: string;
    release_year: number;
    hero?: string;
    director?: string;
    trivia?: unknown;
    box_office?: unknown;
    box_office_category?: string;
}

// ============================================================================
// BOX OFFICE CATEGORY DERIVATION
// ============================================================================

type BoxOfficeCategory = 
    | 'industry-hit'
    | 'blockbuster'
    | 'super-hit'
    | 'hit'
    | 'average'
    | 'below-average'
    | 'disaster';

/**
 * Derives box_office_category from box_office_data
 * Uses budget-to-gross ratio and verdict text
 */
function deriveBoxOfficeCategory(boxOffice: BoxOfficeData): BoxOfficeCategory {
    // 1. Check explicit verdict first
    if (boxOffice.verdict) {
        const verdict = boxOffice.verdict.toLowerCase();
        if (verdict.includes('industry hit') || verdict.includes('all time') || verdict.includes('highest grossing')) {
            return 'industry-hit';
        }
        if (verdict.includes('blockbuster')) {
            return 'blockbuster';
        }
        if (verdict.includes('super hit') || verdict.includes('superhit')) {
            return 'super-hit';
        }
        if (verdict.includes('hit') && !verdict.includes('flop') && !verdict.includes('disaster')) {
            return 'hit';
        }
        if (verdict.includes('average')) {
            return 'average';
        }
        if (verdict.includes('below average') || verdict.includes('flop')) {
            return 'below-average';
        }
        if (verdict.includes('disaster')) {
            return 'disaster';
        }
    }

    // 2. Calculate from numbers if available
    const parseAmount = (str?: string): number => {
        if (!str) return 0;
        // Handle crore/lakhs notation
        const cleanStr = str.toLowerCase().replace(/[₹$,]/g, '').trim();
        const croreMatch = cleanStr.match(/([\d.]+)\s*cr/);
        if (croreMatch) return parseFloat(croreMatch[1]);
        const lakhMatch = cleanStr.match(/([\d.]+)\s*lakh/);
        if (lakhMatch) return parseFloat(lakhMatch[1]) / 100;
        // Try direct number
        const num = parseFloat(cleanStr);
        return isNaN(num) ? 0 : num;
    };

    const budget = parseAmount(boxOffice.budget);
    const lifetime = parseAmount(boxOffice.lifetime_gross);

    if (budget > 0 && lifetime > 0) {
        const ratio = lifetime / budget;
        if (ratio >= 4) return 'industry-hit';
        if (ratio >= 3) return 'blockbuster';
        if (ratio >= 2) return 'super-hit';
        if (ratio >= 1.5) return 'hit';
        if (ratio >= 1) return 'average';
        if (ratio >= 0.5) return 'below-average';
        return 'disaster';
    }

    // 3. Default to 'hit' if we have gross data but no budget
    if (lifetime > 0) {
        // Use lifetime amount to guess
        if (lifetime >= 200) return 'blockbuster';
        if (lifetime >= 100) return 'super-hit';
        if (lifetime >= 50) return 'hit';
        return 'average';
    }

    // 4. Default when no data
    return 'average';
}

// ============================================================================
// BOX OFFICE EXTRACTION
// ============================================================================

async function tryWikipediaBoxOffice(movie: Movie): Promise<BoxOfficeData | null> {
    try {
        const wikiTitle = movie.title_en.replace(/ /g, '_');
        const patterns = [
            `${wikiTitle}_(${movie.release_year}_film)`,
            `${wikiTitle}_(film)`,
            `${wikiTitle}_(Telugu_film)`,
            wikiTitle,
        ];

        for (const pattern of patterns) {
            const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pattern)}`;

            const response = await fetch(apiUrl, {
                headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-enrichment)' },
            });

            if (!response.ok) continue;

            const html = await response.text();

            const result: BoxOfficeData = { source: 'Wikipedia' };

            // Extract budget
            const budgetMatch = html.match(/Budget[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
            if (budgetMatch) {
                result.budget = cleanMoneyValue(budgetMatch[1]);
            }

            // Extract box office gross
            const grossMatch = html.match(/Box[\s]*office[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
            if (grossMatch) {
                result.lifetime_gross = cleanMoneyValue(grossMatch[1]);
            }

            // Look for verdict in article text
            const verdictPatterns = [
                /declared[\s]+(?:a\s+)?(\w+)/i,
                /was[\s]+(?:a\s+)?(?:commercial\s+)?(\w+)/i,
                /(blockbuster|superhit|hit|average|flop|disaster)/i,
            ];

            for (const verdictPattern of verdictPatterns) {
                const match = html.match(verdictPattern);
                if (match) {
                    const verdict = match[1].toLowerCase();
                    if (['blockbuster', 'superhit', 'hit', 'average', 'flop', 'disaster'].includes(verdict)) {
                        result.verdict = verdict;
                        break;
                    }
                }
            }

            // Look for records
            const recordMatterns = [
                /highest[- ]grossing[\s\S]{0,100}(Telugu|Indian|regional)/i,
                /broke[\s\S]{0,50}record/i,
                /first[\s\S]{0,50}to[\s\S]{0,50}(crore|million)/i,
            ];

            const records: string[] = [];
            for (const recordPattern of recordMatterns) {
                const match = html.match(recordPattern);
                if (match) {
                    // Extract surrounding context
                    const idx = html.indexOf(match[0]);
                    const context = html.slice(Math.max(0, idx - 50), idx + match[0].length + 100);
                    const cleanContext = context.replace(/<[^>]+>/g, '').trim();
                    if (cleanContext.length < 200) {
                        records.push(cleanContext);
                    }
                }
            }
            if (records.length > 0) {
                result.records_broken = records;
            }

            if (result.budget || result.lifetime_gross || result.verdict) {
                return result;
            }
        }

        return null;
    } catch {
        return null;
    }
}

function cleanMoneyValue(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]+>/g, '');
    // Extract money amount (₹, Rs, crore, million, etc.)
    const match = text.match(/[\₹$]?\s*[\d.,]+\s*(crore|lakh|million|billion)?/i);
    return match ? match[0].trim() : text.slice(0, 50).trim();
}

// ============================================================================
// TRIVIA EXTRACTION
// ============================================================================

async function tryWikipediaTrivia(movie: Movie): Promise<TriviaData | null> {
    try {
        const wikiTitle = movie.title_en.replace(/ /g, '_');
        const patterns = [
            `${wikiTitle}_(${movie.release_year}_film)`,
            `${wikiTitle}_(film)`,
            `${wikiTitle}_(Telugu_film)`,
            wikiTitle,
        ];

        for (const pattern of patterns) {
            const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pattern)}`;

            const response = await fetch(apiUrl, {
                headers: { 'User-Agent': 'TeluguPortal/1.0' },
            });

            if (!response.ok) continue;

            const html = await response.text();

            const result: TriviaData = { source: 'Wikipedia' };

            // Extract shooting locations
            const locationSection = html.match(/Filming[\s\S]*?<p>([\s\S]*?)<\/p>/i);
            if (locationSection) {
                const locations = [...locationSection[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)]
                    .map((m) => m[1].trim())
                    .filter((loc) => !loc.match(/\d{4}/)); // Filter out years
                if (locations.length > 0) {
                    result.shooting_locations = locations.slice(0, 5);
                }
            }

            // Extract production trivia
            const productionSection = html.match(
                /Production[\s\S]*?<section[^>]*>([\s\S]*?)<\/section>/i
            );
            if (productionSection) {
                const paragraphs = [...productionSection[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
                    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
                    .filter((p) => p.length > 50 && p.length < 300);
                if (paragraphs.length > 0) {
                    result.production_trivia = paragraphs.slice(0, 5);
                }
            }

            // Look for cultural impact
            const receptionSection = html.match(
                /Reception[\s\S]*?<section[^>]*>([\s\S]*?)<\/section>/i
            );
            if (receptionSection) {
                const impactMatch = receptionSection[1].match(
                    /(cult|classic|landmark|influential|pioneering)[\s\S]{0,200}/i
                );
                if (impactMatch) {
                    result.cultural_impact = impactMatch[0].replace(/<[^>]+>/g, '').trim().slice(0, 300);
                }
            }

            // Look for controversies
            const controversyMatch = html.match(
                /Controvers[\s\S]*?<p>([\s\S]*?)<\/p>/i
            );
            if (controversyMatch) {
                const text = controversyMatch[1].replace(/<[^>]+>/g, '').trim();
                if (text.length > 30 && text.length < 300) {
                    result.controversies = [text];
                }
            }

            if (
                result.shooting_locations ||
                result.production_trivia ||
                result.cultural_impact ||
                result.controversies
            ) {
                return result;
            }
        }

        return null;
    } catch {
        return null;
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('🎬 TRIVIA & BOX OFFICE ENRICHMENT SCRIPT');
    console.log('════════════════════════════════════════════════════════════════════════\n');

    console.log(`Mode: ${EXECUTE ? '🔴 EXECUTE' : '🟡 DRY RUN'}`);
    console.log(`Type: ${TYPE}`);
    console.log(`Limit: ${LIMIT} movies`);
    if (DECADE) console.log(`Decade: ${DECADE}`);

    // Build query
    let query = supabase
        .from('movies')
        .select('id, title_en, release_year, hero, director, trivia, box_office')
        .eq('language', 'Telugu')
        .order('release_year', { ascending: false }) // Start with most recent
        .limit(LIMIT);

    if (DECADE) {
        const startYear = parseInt(DECADE.replace('s', ''));
        query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
    }

    const { data: movies, error } = await query;

    if (error) {
        console.error('Error fetching movies:', error);
        return;
    }

    console.log(`\nFound ${movies?.length || 0} movies to process\n`);

    if (!movies || movies.length === 0) {
        console.log('No movies to process.');
        return;
    }

    let enrichedBoxOffice = 0;
    let enrichedTrivia = 0;

    for (const movie of movies) {
        console.log(`\n[${movie.release_year}] ${movie.title_en}`);

        // Box office enrichment
        if (TYPE === 'box_office' || TYPE === 'all') {
            const boxOffice = await tryWikipediaBoxOffice(movie);
            if (boxOffice) {
                enrichedBoxOffice++;
                
                // Derive box_office_category from the data
                const category = deriveBoxOfficeCategory(boxOffice);
                
                console.log(`  📊 Box Office: ${boxOffice.lifetime_gross || 'N/A'} (${boxOffice.verdict || 'N/A'}) → ${category}`);

                if (EXECUTE) {
                    const { error: updateError } = await supabase
                        .from('movies')
                        .update({ 
                            box_office_data: boxOffice,
                            box_office_category: category
                        })
                        .eq('id', movie.id);

                    if (updateError) {
                        console.log(`  ❌ Update failed: ${updateError.message}`);
                    } else {
                        console.log(`  ✅ Box office and category updated`);
                    }
                }
            }
        }

        // Trivia enrichment
        if (TYPE === 'trivia' || TYPE === 'all') {
            const trivia = await tryWikipediaTrivia(movie);
            if (trivia) {
                enrichedTrivia++;
                console.log(`  📝 Trivia: ${trivia.production_trivia?.length || 0} facts, ${trivia.shooting_locations?.length || 0} locations`);

                if (EXECUTE) {
                    const { error: updateError } = await supabase
                        .from('movies')
                        .update({ trivia: trivia })
                        .eq('id', movie.id);

                    if (updateError) {
                        console.log(`  ❌ Update failed: ${updateError.message}`);
                    } else {
                        console.log(`  ✅ Trivia updated`);
                    }
                }
            }
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 300));
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════════════');
    console.log('📊 ENRICHMENT SUMMARY');
    console.log('════════════════════════════════════════════════════════════════════════\n');
    console.log(`Total processed:   ${movies.length}`);
    if (TYPE === 'box_office' || TYPE === 'all') {
        console.log(`Box office found:  ${enrichedBoxOffice}`);
    }
    if (TYPE === 'trivia' || TYPE === 'all') {
        console.log(`Trivia found:      ${enrichedTrivia}`);
    }

    if (!EXECUTE) {
        console.log('\n⚠️  DRY RUN - No changes made. Use --execute to update database.');
    }
}

main().catch(console.error);

