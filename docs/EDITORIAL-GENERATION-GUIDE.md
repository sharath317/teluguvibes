# Editorial Review Generation Guide

## Overview

This document outlines the steps to generate high-quality editorial reviews for Telugu movies using the AI-powered review generator.

---

## Prerequisites

1. **AI API Keys** in `.env.local`:
   - `GROQ_API_KEY` (primary - 6 keys available)
   - `OPENAI_API_KEY` (fallback - 5 valid keys)

2. **Multi-Source API Keys** (optional, reduces AI costs by ~60%):
   - `OMDB_API_KEY` - Ratings from IMDB, RT, Metacritic
   - `GOOGLE_KG_API_KEY` - Entity descriptions and context

3. **Movies with images**: Only movies with `poster_url` are processed

4. **Movies with ratings**: Only movies with `our_rating` are prioritized

---

## Multi-Source Data Pipeline (NEW)

Before calling AI, the system fetches factual data from external sources:

```
Movie → Multi-Source Fetcher → Cache Check → AI (only for missing data)
              ↓
         Parallel:
         ├── Wikipedia (Plot, Reception, Legacy)
         ├── OMDb (Ratings, Awards text)
         ├── Wikidata (Structured awards via SPARQL)
         └── Google KG (Entity descriptions)
```

### Benefits
- **60-75% fewer AI calls** when Wikipedia/OMDb have good coverage
- **Factual accuracy** - awards, ratings come from authoritative sources
- **30-day cache** - factual data rarely changes

### Test Multi-Source
```bash
pnpm tsx scripts/test-multi-source.ts
```

---

## Commands

### 1. Dry Run (Test without saving)
```bash
npx tsx scripts/rewrite-editorial-reviews.ts --dry-run --limit=10
```

### 2. Generate for Top 100 Movies
```bash
npx tsx scripts/rewrite-editorial-reviews.ts --limit=100 --batch=10
```

### 3. Generate with Custom Start Position
```bash
npx tsx scripts/rewrite-editorial-reviews.ts --limit=50 --batch=10 --start=100
```

### 4. Run in Background
```bash
npx tsx scripts/rewrite-editorial-reviews.ts --limit=500 --batch=10 2>&1 | tee logs/editorial-$(date +%Y%m%d).log &
```

---

## Quality Requirements

| Metric | Threshold | Action |
|--------|-----------|--------|
| Quality Score | ≥ 85% | Accept immediately |
| Quality Score | 80-84% | Accept after retries |
| Quality Score | < 80% | Skip (retry up to 2 times) |

### Quality Score Components:
- **Synopsis length**: 100-200 words optimal
- **Performance scores**: Lead actors should have scores 6-10
- **Cultural impact**: Should include memorable elements
- **Verdict**: Must have category and final_rating

---

## What Gets Generated

Each editorial review includes 9 sections:

1. **Synopsis** (English + Telugu)
2. **Story & Screenplay** (with scores)
3. **Performances** (lead + supporting actors with scores)
4. **Direction & Technicals** (direction, music, cinematography scores)
5. **Perspectives** (audience vs critics POV)
6. **Why Watch** (reasons + target audience)
7. **Why Skip** (concerns + warnings)
8. **Cultural Impact** (legacy, significance, memorable elements)
9. **Verdict** (category, rating, confidence)

---

## Monitoring Progress

### Check Current Status
```bash
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase.from('movie_reviews').select('dimensions_json').not('dimensions_json', 'is', null);
  const v2 = data?.filter(r => r.dimensions_json?._type === 'editorial_review_v2') || [];
  console.log('Editorial Reviews (v2):', v2.length);
})();
"
```

### View Logs
```bash
tail -f logs/editorial-*.log
```

---

## Troubleshooting

### Rate Limits
- Groq: 6 keys with automatic rotation
- If all keys exhausted, wait 5 minutes
- Script automatically switches to OpenAI as fallback

### Low Quality Scores
- Movies with limited TMDB data may score lower
- Older movies (pre-1960) often lack detailed info
- Script retries up to 2 times before skipping

### Missing Images
First enrich images:
```bash
npx tsx scripts/enrich-images-only.ts --limit=500
```

---

## Cost Tracking

Estimated cost per movie: ~$0.003 (using Groq)
- 100 movies: ~$0.30
- 500 movies: ~$1.50
- 1000 movies: ~$3.00

---

## Sample Output

After running, verify at:
- http://localhost:3000/reviews/athadu-2005
- http://localhost:3000/reviews/magadheera-2009
- http://localhost:3000/reviews/mayabazar-1957

---

## Latest Run Results (2026-01-05)

### Batch 1: 100 Movies with Upgraded Groq Key
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FINAL RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Total Processed:   100 movies
   ✅ Success Rate:      100%
   ⭐ Avg Quality Score: 86.7%
   ⏱️  Duration:         12.6 minutes
   📈 Rate:              8.0 movies/minute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Total Editorial Reviews: 108
- Average Quality Score: 86.6%
- Top scores reaching 95%

---

## Why Not 100% Quality Score?

The quality score is calculated based on:
1. **Synopsis length** (optimal: 100-200 words)
2. **Performance scores** (lead actors should have scores)
3. **Cultural impact** (memorable elements required)
4. **Verdict completeness** (category + rating)

**Current limitations:**
- Older movies (pre-1960) have limited TMDB data
- Some movies lack detailed cast/crew info
- AI variability in content length

**Realistic targets:**
- 85%+ = Good quality (current avg)
- 90%+ = Excellent quality (achievable for well-documented movies)
- 95%+ = Premium quality (top tier movies with rich data)

---

*Last updated: 2026-01-05*

