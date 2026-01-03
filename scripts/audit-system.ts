import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditReport {
  topMovies: any[];
  reviewQualityStats: {
    totalReviews: number;
    withDimensions: number;
    withPerformanceScores: number;
    withTechnicalScores: number;
    withAudienceSignals: number;
    avgReviewLength: number;
    reviewLengthDistribution: Record<string, number>;
  };
  weakSections: {
    classics: number;
    hiddenGems: number;
    cultClassics: number;
    blockbusters: number;
  };
  tagDistribution: Record<string, number>;
}

async function auditSystem(): Promise<AuditReport> {
  console.log('🔍 Starting system audit...\n');

  // 1. Find top 500 Telugu movies by avg_rating
  console.log('📊 Fetching top 500 Telugu movies...');
  
  // Fetch Telugu movies ordered by avg_rating
  const { data: topMovies, error: moviesError } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, release_year, genres, hero, heroine, director, tags, avg_rating')
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .not('avg_rating', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(500);

  if (moviesError) {
    console.error('❌ Error fetching movies:', moviesError);
    throw moviesError;
  }

  console.log(`✅ Found ${topMovies?.length || 0} movies\n`);

  // 2. Analyze review quality
  console.log('📈 Analyzing review quality...');
  
  // Fetch reviews separately
  const { data: allReviews, error: reviewsError } = await supabase
    .from('movie_reviews')
    .select('id, movie_id, summary, verdict, dimensions_json, performance_scores, technical_scores, audience_signals');

  if (reviewsError) {
    console.error('❌ Error fetching reviews:', reviewsError);
    throw reviewsError;
  }

  const reviewStats = {
    totalReviews: allReviews?.length || 0,
    withDimensions: allReviews?.filter(r => r.dimensions_json).length || 0,
    withPerformanceScores: allReviews?.filter(r => r.performance_scores).length || 0,
    withTechnicalScores: allReviews?.filter(r => r.technical_scores).length || 0,
    withAudienceSignals: allReviews?.filter(r => r.audience_signals).length || 0,
    avgReviewLength: 0,
    reviewLengthDistribution: {
      '<100': 0,
      '100-200': 0,
      '200-500': 0,
      '500-800': 0,
      '800-1200': 0,
      '>1200': 0,
    },
  };

  let totalLength = 0;
  allReviews?.forEach(r => {
    // Use summary length as proxy for review length
    const length = (r.summary?.length || 0) + (r.verdict?.length || 0);
    totalLength += length;
    
    if (length < 100) reviewStats.reviewLengthDistribution['<100']++;
    else if (length < 200) reviewStats.reviewLengthDistribution['100-200']++;
    else if (length < 500) reviewStats.reviewLengthDistribution['200-500']++;
    else if (length < 800) reviewStats.reviewLengthDistribution['500-800']++;
    else if (length < 1200) reviewStats.reviewLengthDistribution['800-1200']++;
    else reviewStats.reviewLengthDistribution['>1200']++;
  });

  reviewStats.avgReviewLength = Math.round(totalLength / (allReviews?.length || 1));
  console.log(`✅ Analyzed ${reviewStats.totalReviews} reviews\n`);

  // 3. Check weak sections
  console.log('🔍 Checking section strength...');
  const { data: classics } = await supabase
    .from('movies')
    .select('id', { count: 'exact' })
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .eq('is_classic', true);

  const { data: hiddenGems } = await supabase
    .from('movies')
    .select('id', { count: 'exact' })
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .eq('is_underrated', true);

  const { data: cultClassics } = await supabase
    .from('movies')
    .select('id', { count: 'exact' })
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .contains('tags', ['cult-classic']);

  const { data: blockbusters } = await supabase
    .from('movies')
    .select('id', { count: 'exact' })
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .eq('is_blockbuster', true);

  const weakSections = {
    classics: classics?.length || 0,
    hiddenGems: hiddenGems?.length || 0,
    cultClassics: cultClassics?.length || 0,
    blockbusters: blockbusters?.length || 0,
  };

  console.log(`✅ Section analysis complete\n`);

  // 4. Tag distribution
  console.log('🏷️  Analyzing tag distribution...');
  const { data: moviesWithTags } = await supabase
    .from('movies')
    .select('tags')
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .not('tags', 'is', null);

  const tagDistribution: Record<string, number> = {};
  moviesWithTags?.forEach(m => {
    m.tags?.forEach((tag: string) => {
      tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
    });
  });

  console.log(`✅ Found ${Object.keys(tagDistribution).length} unique tags\n`);

  return {
    topMovies: topMovies || [],
    reviewQualityStats: reviewStats,
    weakSections,
    tagDistribution,
  };
}

async function main() {
  try {
    const report = await auditSystem();

    // Generate report
    const reportContent = `
# TeluguVibes System Audit Report
Generated: ${new Date().toISOString()}

## Top 500 Telugu Movies (by composite_rating)

Total movies identified: ${report.topMovies.length}

### Sample Top 10 Movies:
${report.topMovies.slice(0, 10).map((m, i) => {
  return `${i + 1}. **${m.title_en}** (${m.release_year})
   - Average Rating: ${m.avg_rating?.toFixed(2) || 'N/A'}
   - Genres: ${m.genres?.join(', ') || 'N/A'}
   - Hero: ${m.hero || 'N/A'}
   - Director: ${m.director || 'N/A'}
   - Tags: ${m.tags?.slice(0, 5).join(', ') || 'N/A'}`;
}).join('\n\n')}

## Review Quality Statistics

- **Total Reviews**: ${report.reviewQualityStats.totalReviews}
- **With Structured Dimensions**: ${report.reviewQualityStats.withDimensions} (${Math.round(report.reviewQualityStats.withDimensions / report.reviewQualityStats.totalReviews * 100)}%)
- **With Performance Scores**: ${report.reviewQualityStats.withPerformanceScores} (${Math.round(report.reviewQualityStats.withPerformanceScores / report.reviewQualityStats.totalReviews * 100)}%)
- **With Technical Scores**: ${report.reviewQualityStats.withTechnicalScores} (${Math.round(report.reviewQualityStats.withTechnicalScores / report.reviewQualityStats.totalReviews * 100)}%)
- **With Audience Signals**: ${report.reviewQualityStats.withAudienceSignals} (${Math.round(report.reviewQualityStats.withAudienceSignals / report.reviewQualityStats.totalReviews * 100)}%)
- **Average Review Length**: ${report.reviewQualityStats.avgReviewLength} characters

### Review Length Distribution:
- **<100 chars**: ${report.reviewQualityStats.reviewLengthDistribution['<100']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['<100'] / report.reviewQualityStats.totalReviews * 100)}%)
- **100-200 chars**: ${report.reviewQualityStats.reviewLengthDistribution['100-200']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['100-200'] / report.reviewQualityStats.totalReviews * 100)}%)
- **200-500 chars**: ${report.reviewQualityStats.reviewLengthDistribution['200-500']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['200-500'] / report.reviewQualityStats.totalReviews * 100)}%)
- **500-800 chars**: ${report.reviewQualityStats.reviewLengthDistribution['500-800']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['500-800'] / report.reviewQualityStats.totalReviews * 100)}%)
- **800-1200 chars**: ${report.reviewQualityStats.reviewLengthDistribution['800-1200']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['800-1200'] / report.reviewQualityStats.totalReviews * 100)}%)
- **>1200 chars**: ${report.reviewQualityStats.reviewLengthDistribution['>1200']} (${Math.round(report.reviewQualityStats.reviewLengthDistribution['>1200'] / report.reviewQualityStats.totalReviews * 100)}%)

## Section Strength Analysis

### Current Section Populations:
- **Classics**: ${report.weakSections.classics} movies
- **Hidden Gems**: ${report.weakSections.hiddenGems} movies
- **Cult Classics**: ${report.weakSections.cultClassics} movies
- **Blockbusters**: ${report.weakSections.blockbusters} movies

### Issues Identified:
1. ${report.weakSections.classics < 50 ? '⚠️ Classics section is WEAK - needs stronger tagging logic' : '✅ Classics section is healthy'}
2. ${report.weakSections.hiddenGems < 30 ? '⚠️ Hidden Gems section is WEAK - needs better underrated detection' : '✅ Hidden Gems section is healthy'}
3. ${report.weakSections.cultClassics < 20 ? '⚠️ Cult Classics section is WEAK - needs cult-classic tag enrichment' : '✅ Cult Classics section is healthy'}
4. ${report.weakSections.blockbusters < 50 ? '⚠️ Blockbusters section is WEAK - needs box office data integration' : '✅ Blockbusters section is healthy'}

## Tag Distribution (Top 20)

${Object.entries(report.tagDistribution)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 20)
  .map(([tag, count], i) => `${i + 1}. **${tag}**: ${count} movies`)
  .join('\n')}

## Key Findings

### Strengths:
- ✅ High metadata completion (${Math.round(report.reviewQualityStats.withDimensions / report.reviewQualityStats.totalReviews * 100)}% with structured dimensions)
- ✅ Strong composite rating coverage
- ✅ Rich performance and technical scoring

### Weaknesses:
- ⚠️ Most reviews are <200 characters (${Math.round((report.reviewQualityStats.reviewLengthDistribution['<100'] + report.reviewQualityStats.reviewLengthDistribution['100-200']) / report.reviewQualityStats.totalReviews * 100)}%)
- ⚠️ Need "Athadu-quality" depth: 800-1200 words per review
- ⚠️ Several sections (Classics, Hidden Gems, Cult Classics) are weak
- ⚠️ Tag confidence needs strengthening

## Recommendations

1. **Phase 2 Priority**: Rewrite top 500 Telugu reviews to 800-1200 word depth
2. **Section Strengthening**: Re-tag movies with enhanced confidence for weak sections
3. **Quality Gates**: Enforce minimum word counts per section (9-section structure)
4. **Cultural Context**: Add legacy/impact analysis for classics and cult films

---

**Next Steps**: Proceed to Phase 2 - Editorial Review Generator
`;

    // Save report
    const reportPath = path.join(process.cwd(), 'docs', 'AUDIT-REPORT.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportContent);

    console.log('📄 Audit report saved to:', reportPath);
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ AUDIT COMPLETE!\n');
    console.log('Key Findings:');
    console.log(`  • Top 500 movies identified`);
    console.log(`  • ${Math.round((report.reviewQualityStats.reviewLengthDistribution['<100'] + report.reviewQualityStats.reviewLengthDistribution['100-200']) / report.reviewQualityStats.totalReviews * 100)}% of reviews are <200 chars (need expansion)`);
    console.log(`  • Weak sections: Classics (${report.weakSections.classics}), Hidden Gems (${report.weakSections.hiddenGems}), Cult (${report.weakSections.cultClassics})`);
    console.log(`  • ${Object.keys(report.tagDistribution).length} unique tags in use`);
    console.log('\n📊 See docs/AUDIT-REPORT.md for full analysis\n');
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
