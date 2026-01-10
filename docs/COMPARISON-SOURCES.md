# Comparison Sources Architecture

## Overview

This document describes the comparison source system added to the Telugu Portal enrichment pipeline. These sources are used **exclusively for validation and confidence scoring** - they never overwrite primary data.

## Key Principles

1. **Additive Only**: No existing data is deleted or overwritten
2. **Confidence-Only**: Sources adjust confidence scores, not primary data
3. **Conflict Triggers Review**: Disagreements increase uncertainty
4. **Feature Flag Protected**: All sources disabled by default
5. **Compliant**: Rate-limited, cached, respects robots.txt

## Architecture Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENRICHMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │ PRIMARY SOURCES  │     │ COMPARISON ONLY  │                 │
│  │ (Data Writers)   │     │ (Confidence)     │                 │
│  ├──────────────────┤     ├──────────────────┤                 │
│  │ • TMDB           │     │ • Rotten Tomatoes│                 │
│  │ • Wikipedia      │     │ • Filmibeat      │                 │
│  │ • Wikidata       │     │ • Idlebrain      │                 │
│  │ • OMDB           │     │ • JioSaavn       │                 │
│  │ • IMDb           │     │ • YouTube        │                 │
│  └────────┬─────────┘     │ • Google KG      │                 │
│           │               └────────┬─────────┘                 │
│           │                        │                           │
│           ▼                        ▼                           │
│  ┌──────────────────────────────────────────┐                  │
│  │         MULTI-SOURCE VALIDATOR           │                  │
│  ├──────────────────────────────────────────┤                  │
│  │  • Validates primary data                │                  │
│  │  • Calculates confidence adjustment      │                  │
│  │  • Detects conflicts                     │                  │
│  │  • Flags for manual review               │                  │
│  └────────────────┬─────────────────────────┘                  │
│                   │                                            │
│                   ▼                                            │
│  ┌──────────────────────────────────────────┐                  │
│  │              DATABASE                     │                  │
│  ├──────────────────────────────────────────┤                  │
│  │  movies.comparison_signals     (JSONB)   │                  │
│  │  movies.confidence_breakdown   (JSONB)   │                  │
│  │  movies.comparison_alignment   (NUMERIC) │                  │
│  │  movies.needs_manual_review    (BOOLEAN) │                  │
│  │  movies.last_verified_at       (TIMESTAMP)│                 │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Confidence Scoring Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONFIDENCE SCORING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BASE CONFIDENCE (from primary sources)                      │
│     ├── Field completeness: 0-40%                              │
│     ├── Source diversity: 0-20%                                │
│     └── Data freshness: 0-10%                                  │
│                                                                 │
│  2. COMPARISON ADJUSTMENT (-20% to +20%)                       │
│     ├── Agreement bonus:                                       │
│     │   ├── 3+ sources agree: +15%                            │
│     │   └── 2 sources agree: +10%                             │
│     │                                                          │
│     └── Conflict penalty:                                      │
│         ├── High severity: -15% each                          │
│         ├── Medium severity: -8% each                         │
│         └── Low severity: -3% each                            │
│                                                                 │
│  3. FINAL CONFIDENCE = BASE + ADJUSTMENT (clamped 0-100%)      │
│                                                                 │
│  4. MANUAL REVIEW FLAG                                         │
│     Set if:                                                    │
│     ├── Any high-severity conflict                            │
│     ├── 2+ medium-severity conflicts                          │
│     └── Adjustment < -10%                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Source Details

### 1. Rotten Tomatoes (`rotten_tomatoes`)

| Property | Value |
|----------|-------|
| **Tier** | AGGREGATOR (2) |
| **Weight** | 0.7 |
| **Rate Limit** | 12 req/min |
| **Cache** | 30 days |
| **Feature Flag** | `comparison_rotten_tomatoes` |

**Signals Captured:**
- `critic_score` (numeric, 0-100)
- `audience_score` (numeric, 0-100)
- `freshness` (categorical: certified_fresh/fresh/rotten)
- `cast_count` (numeric, validation)

**Legal Notes:**
- Public search API only
- No review text stored
- Numeric scores only

### 2. Filmibeat (`filmibeat`)

| Property | Value |
|----------|-------|
| **Tier** | COMMUNITY (3) |
| **Weight** | 0.5 |
| **Rate Limit** | 10 req/min |
| **Cache** | 30 days |
| **Feature Flag** | `comparison_filmibeat` |

**Signals Captured:**
- `rating` (numeric, 0-100)
- `cast_match` (boolean)
- `genre` (categorical)

**Legal Notes:**
- Indian cinema focused
- Public data only

### 3. Idlebrain/GreatAndhra Sentiment (`idlebrain_sentiment`)

| Property | Value |
|----------|-------|
| **Tier** | COMMUNITY (3) |
| **Weight** | 0.5 |
| **Rate Limit** | 6 req/min |
| **Cache** | 90 days |
| **Feature Flag** | `comparison_idlebrain` |

**Signals Captured:**
- `sentiment` (categorical: very_positive/positive/mixed/negative/very_negative)
- `verdict` (categorical: blockbuster/hit/average/flop)
- `verdict_score` (numeric, 0-100)
- `has_coverage` (boolean)

**Legal Notes:**
- Telugu review sites
- Sentiment classification only
- NO review text stored

### 4. Music Popularity (`music_popularity`)

| Property | Value |
|----------|-------|
| **Tier** | SIGNAL (4) |
| **Weight** | 0.3 |
| **Rate Limit** | 10 req/min |
| **Cache** | 7 days |
| **Feature Flag** | `comparison_jiosaavn` |

**Signals Captured:**
- `play_count_bucket` (bucket: very_low to very_high)
- `track_count` (numeric)
- `has_soundtrack` (boolean)
- `spotify_popularity` (numeric, 0-100)

**Legal Notes:**
- Public API only
- No audio content stored

### 5. YouTube Trailer Visibility (`trailer_visibility`)

| Property | Value |
|----------|-------|
| **Tier** | SIGNAL (4) |
| **Weight** | 0.3 |
| **Rate Limit** | 10 req/min |
| **Cache** | 7 days |
| **Feature Flag** | `comparison_youtube` |

**Signals Captured:**
- `has_trailer` (boolean)
- `view_count_bucket` (bucket)
- `engagement_bucket` (bucket)
- `official_channel` (boolean)
- `trailer_age_days` (numeric)

**Legal Notes:**
- Official YouTube Data API
- No video content stored
- Visibility buckets only

### 6. Google Knowledge Graph (`google_kg`)

| Property | Value |
|----------|-------|
| **Tier** | PRIMARY (1) |
| **Weight** | 1.0 |
| **Rate Limit** | 100 req/min |
| **Cache** | 90 days |
| **Feature Flag** | `comparison_google_kg` |

**Signals Captured:**
- `entity_confirmed` (boolean)
- `entity_score` (numeric, 0-100)
- `is_movie_type` (boolean)
- `has_kg_description` (boolean)
- `description_length_bucket` (bucket)
- `has_wikipedia_link` (boolean)

**Legal Notes:**
- Official Google API
- Entity validation only
- No text stored

## Usage

### Enable Comparison Sources

```typescript
import { ComparisonOrchestrator } from '@/lib/sources/comparison';

// Enable all sources
ComparisonOrchestrator.enableAll();

// Or enable individual sources
import { enableFeature } from '@/lib/sources/comparison';
enableFeature('comparison_sources_enabled'); // Master switch
enableFeature('comparison_rotten_tomatoes');
enableFeature('comparison_google_kg');
```

### Fetch Comparison Data

```typescript
import { comparisonOrchestrator } from '@/lib/sources/comparison';

const query = {
  tmdbId: 123456,
  titleEn: 'Pushpa 2',
  releaseYear: 2024,
  director: 'Sukumar',
  hero: 'Allu Arjun',
  context: { language: 'Telugu' },
};

const result = await comparisonOrchestrator.fetchAll(query);
console.log(result.confidenceAdjustment); // -0.2 to +0.2
console.log(result.alignmentScore);       // 0 to 1
console.log(result.needsManualReview);    // boolean
```

### Run Comparison Validation

```bash
# Dry run (no changes)
npx tsx scripts/enrich-comparison-validation.ts --dry

# Execute with sources enabled
npx tsx scripts/enrich-comparison-validation.ts --execute --enable-sources --limit=100

# As part of full enrichment
npx tsx scripts/enrich-master.ts --multi-pass --execute
```

## Database Schema

### New Columns (movies table)

| Column | Type | Description |
|--------|------|-------------|
| `comparison_signals` | JSONB | Aggregated signals from comparison sources |
| `confidence_breakdown` | JSONB | Detailed breakdown of confidence calculation |
| `last_verified_at` | TIMESTAMPTZ | Last comparison validation timestamp |
| `field_provenance` | JSONB | Per-field source tracking |
| `comparison_alignment_score` | NUMERIC(4,3) | Alignment with comparison sources |
| `needs_manual_review` | BOOLEAN | Flag for conflicting data |
| `review_reason` | TEXT | Reason for manual review |

### New Tables

- `comparison_cache`: Cache for API responses (30-day expiry)
- `comparison_conflicts`: Audit log of detected conflicts
- `verification_history`: History of validation runs

## Performance & Safety

### Rate Limiting
- All sources rate-limited (see table above)
- 1.2x buffer applied automatically
- Shared rate limit state across adapters

### Caching
- Default 30-day cache for most sources
- 7-day cache for volatile data (music, trailers)
- 90-day cache for stable data (sentiment, KG)

### Compliance
- `robots.txt` compliance (where applicable)
- User-Agent: `TeluguPortal/1.0 (movie-archive; validation-only)`
- No bulk scraping
- No copyrighted content storage

### Feature Flags
- Master switch: `comparison_sources_enabled`
- Individual source flags: `comparison_<source>`
- All disabled by default

## Troubleshooting

### Common Issues

1. **No data from sources**
   - Check feature flags are enabled
   - Verify API keys are set (YouTube, Google KG, Spotify)
   - Check rate limit hasn't been exceeded

2. **High conflict rate**
   - Normal for older movies (less online coverage)
   - Review threshold settings in validator

3. **Slow performance**
   - Reduce concurrency
   - Increase cache duration
   - Check network latency

## Future Enhancements

- [ ] Add more Telugu-specific sources (123Telugu, Greatandhra reviews)
- [ ] Implement distributed caching (Redis)
- [ ] Add source health monitoring
- [ ] Implement automatic conflict resolution rules
- [ ] Add ML-based confidence calibration

