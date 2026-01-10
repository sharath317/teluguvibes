# Telugu Portal Enrichment System v3.0

## Overview

This document describes the comprehensive enrichment system for the Telugu Portal movie database. The system is designed to automatically enrich movie data from multiple sources with intelligent fallbacks, confidence scoring, lifecycle tracking, and **high-performance execution modes**.

## What's New in v3.0

- ⚡ **Fast Mode**: 5x faster with 50 concurrent operations (50ms rate limit)
- 🚀 **Turbo Mode**: 10x faster with 100 concurrent operations (25ms rate limit)
- 🔄 **Multi-Pass Mode**: Strategic 4-pass execution for optimal signal building
- 📊 **Parallel Execution**: Independent phases run simultaneously
- ✅ **Checkpointing**: Auto-resume on failure with session tracking

## Performance Comparison

| Mode | Concurrency | Rate Limit | 100 Movies | 500 Movies |
|------|-------------|------------|------------|------------|
| Normal | 20 | 200ms | ~35 min | ~120 min |
| Fast | 50 | 50ms | ~7 min | ~25 min |
| Turbo | 100 | 25ms | ~3.5 min | ~12 min |

## Architecture

### 6-Layer Enrichment Pipeline

```
╔══════════════════════════════════════════════════════════════════════╗
║           MASTER ORCHESTRATOR v3.0 (enrich-master.ts)                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  LAYER 1: Core Data (PARALLEL)                                       ║
║  ├── images           Posters: TMDB → Wikipedia → Wikimedia → Archive║
║  └── cast-crew        Hero, heroine, director, music, supporting     ║
║                                                                      ║
║  LAYER 2: Classifications (SEQUENTIAL with dependencies)             ║
║  ├── genres-direct    Direct genre fetch (runs FIRST)                ║
║  ├── auto-tags        Mood/quality tags (needs genres)               ║
║  ├── safe-classification  Primary genre & age rating (consensus)     ║
║  ├── taxonomy         Era, decade, tone, style tags                  ║
║  ├── age-rating-legacy    TMDB-based fallback                        ║
║  └── content-flags    Biopic, remake, pan-india, sequel              ║
║                                                                      ║
║  LAYER 3: Derived Intelligence (PARALLEL)                            ║
║  ├── audience-fit     Family, date, group, discussion-worthy         ║
║  └── trigger-warnings Content warnings from genres/synopsis          ║
║                                                                      ║
║  LAYER 4: Extended Metadata (PARALLEL)                               ║
║  ├── tagline          TMDB → Wiki → AI generation                    ║
║  ├── telugu-synopsis  Telugu Wiki → Groq Translation                 ║
║  └── trivia           Box office, production trivia                  ║
║                                                                      ║
║  LAYER 5: Trust & Graph (PARALLEL)                                   ║
║  ├── trust-confidence Confidence scoring with trust badges           ║
║  └── collaborations   Actor-director collabs, milestones             ║
║                                                                      ║
║  LAYER 6: Validation & Audit (SEQUENTIAL)                            ║
║  ├── cross-verify     Multi-source validation, anomaly detection     ║
║  ├── comparison-validation  Secondary sources (RT, Google KG)        ║
║  └── validation       Final validation pass with report              ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

## Data Sources

### Source Tiers (for confidence scoring)

| Tier | Weight | Sources |
|------|--------|---------|
| 1 (Authoritative) | 0.90-1.0 | Wikipedia, TMDB, Wikidata, IMDB |
| 2 (Reliable) | 0.70-0.80 | OMDB, Internet Archive, News Sources |
| 3 (Needs Verification) | 0.30-0.40 | Fan Sites, AI Inference, Generated |

### Waterfall Enrichment Strategy

Each enrichment phase follows a priority-based waterfall:

```
Wikipedia (Primary) → TMDB → Wikidata → IMDB → OMDB → AI Inference
```

## New Database Schema

### Migration 020: Taxonomy & Categorization

```sql
-- Primary/Secondary genre hierarchy
ALTER TABLE movies ADD COLUMN primary_genre TEXT;
ALTER TABLE movies ADD COLUMN secondary_genres TEXT[];

-- Era/Decade classification
ALTER TABLE movies ADD COLUMN era TEXT;  -- 'Golden Era', 'Mass Era', etc.
ALTER TABLE movies ADD COLUMN decade TEXT;  -- '1990s', '2000s', etc.

-- Tone and Style
ALTER TABLE movies ADD COLUMN tone TEXT;  -- 'light_entertainment', 'intense', etc.
ALTER TABLE movies ADD COLUMN style_tags TEXT[];

-- Content sensitivity
ALTER TABLE movies ADD COLUMN content_sensitivity JSONB;
ALTER TABLE movies ADD COLUMN content_type TEXT;  -- 'fact', 'archive', 'opinion'
ALTER TABLE movies ADD COLUMN audience_suitability TEXT;
```

### Migration 021: Trust & Confidence Scoring

```sql
-- Confidence score (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN data_confidence DECIMAL(3,2);

-- Explainability breakdown
ALTER TABLE movies ADD COLUMN confidence_breakdown JSONB;
-- {
--   "source_count": 4,
--   "source_tiers": {"tier1": 2, "tier2": 1, "tier3": 1},
--   "field_completeness": 0.88,
--   "explanation": "Verified by 2 authoritative sources"
-- }

-- Trust badge for UI
ALTER TABLE movies ADD COLUMN trust_badge TEXT;
-- Values: 'verified', 'high', 'medium', 'low', 'unverified'
```

### Migration 022: Relationship Graph

```sql
-- Professional collaborations
CREATE TABLE collaborations (
  entity1_type TEXT,  -- 'actor', 'director', 'music_director'
  entity1_name TEXT,
  entity2_type TEXT,
  entity2_name TEXT,
  collaboration_count INTEGER,
  hit_rate DECIMAL(3,2),
  notable_films TEXT[]
);

-- Narrative events (career milestones, controversies)
CREATE TABLE narrative_events (
  event_type TEXT,  -- 'career_turning_point', 'controversy', 'milestone'
  event_label TEXT,
  entity_names TEXT[],
  movie_titles TEXT[],
  significance_score INTEGER
);

-- Career milestones
CREATE TABLE career_milestones (
  entity_type TEXT,
  entity_name TEXT,
  milestone_type TEXT,  -- 'debut', 'first_hit', 'blockbuster', '100th_film'
  movie_title TEXT,
  year INTEGER
);
```

### Migration 023: Enrichment Lifecycle

```sql
-- Per-phase enrichment tracking
CREATE TABLE enrichment_lifecycle (
  movie_id UUID,
  phase TEXT,
  last_enriched_at TIMESTAMPTZ,
  failure_count INTEGER,
  retry_eligible BOOLEAN,
  source_used TEXT
);

-- Freshness tracking
CREATE TABLE data_freshness (
  movie_id UUID,
  overall_staleness_score DECIMAL(3,2),
  needs_review BOOLEAN,
  auto_downgraded BOOLEAN
);
```

## Enrichment Scripts

### Core Scripts

| Script | Purpose | Sources |
|--------|---------|---------|
| `enrich-images-fast.ts` | Poster images | TMDB, Wikipedia, Wikimedia, Archive |
| `enrich-cast-crew.ts` | Cast & crew data | TMDB, Wikipedia, Wikidata |
| `enrich-taxonomy.ts` | Genre/era/tone classification | Internal rules |
| `enrich-age-rating.ts` | Censor classification | TMDB |
| `enrich-content-flags.ts` | Biopic/remake/sequel flags | TMDB, Wikipedia |
| `auto-tag-movies.ts` | Mood/quality/audience tags | Derived from data |
| `enrich-audience-fit.ts` | Audience suitability | Derived from genres/rating |
| `enrich-trigger-warnings.ts` | Content warnings | Genre/keyword analysis |
| `enrich-tagline.ts` | Movie taglines | TMDB, Wikipedia |
| `enrich-telugu-synopsis.ts` | Telugu synopsis | Telugu Wikipedia, AI |
| `enrich-trivia.ts` | Box office & trivia | Wikipedia |
| `enrich-trust-confidence.ts` | Trust scoring | Multiple sources |
| `enrich-collaborations.ts` | Relationship graph | Internal data |

### Master Orchestrator v3.0

```bash
# ⚡ FAST MODE - 5x faster (RECOMMENDED)
npx tsx scripts/enrich-master.ts --full --fast --execute

# 🚀 TURBO MODE - 10x faster (may hit API limits)
npx tsx scripts/enrich-master.ts --full --turbo --execute

# 🔄 MULTI-PASS MODE - Optimal signal building
npx tsx scripts/enrich-master.ts --multi-pass --fast --execute

# Standard enrichment (all 18 phases)
npx tsx scripts/enrich-master.ts --full --execute

# Run specific layer
npx tsx scripts/enrich-master.ts --layer=1 --execute
npx tsx scripts/enrich-master.ts --layer=4 --fast --execute

# Run single phase
npx tsx scripts/enrich-master.ts --phase=images --execute
npx tsx scripts/enrich-master.ts --phase=telugu-synopsis --fast --execute

# Resume from checkpoint
npx tsx scripts/enrich-master.ts --resume --execute

# Check status
npx tsx scripts/enrich-master.ts --status

# Custom concurrency and limits
npx tsx scripts/enrich-master.ts --full --concurrency=50 --limit=500 --execute

# Filter by director/actor
npx tsx scripts/enrich-master.ts --full --actor="Mahesh Babu" --execute
npx tsx scripts/enrich-master.ts --full --director="Rajamouli" --execute
```

### Multi-Pass Mode

Multi-pass ensures signals are populated before classification runs:

| Pass | Name | Phases |
|------|------|--------|
| 1 | BUILD SIGNALS | images, cast-crew, genres-direct, auto-tags |
| 2 | CLASSIFY | safe-classification, taxonomy, age-rating, content-flags |
| 3 | EXTENDED | tagline, telugu-synopsis, trivia, trust-confidence |
| 4 | VALIDATE | cross-verify, comparison-validation, validation |

## Trust & Confidence Scoring

### Calculation Formula

```
Confidence = (FieldCompleteness × 0.40) + 
             (SourceQuality × 0.35) + 
             (SourceCountBonus × 0.15) + 
             (RatingAlignment × 0.10) - 
             AgePenalty
```

### Trust Badges (Updated v3.0)

| Badge | Confidence | Requirements |
|-------|------------|--------------|
| `verified` | 85%+ | 2+ Tier-1 sources, high field completeness |
| `high` | 65-84% | Multiple sources, good coverage |
| `medium` | 45-64% | Basic data coverage |
| `low` | 25-44% | Limited sources |
| `unverified` | <25% | Needs enrichment |

**Note:** Thresholds adjusted in v3.0 to be more achievable while maintaining quality.

### UI Display

```tsx
<TrustBadge 
  badge={movie.trust_badge}
  confidence={movie.data_confidence}
  breakdown={movie.confidence_breakdown}
  showTooltip={true}  // "Why this score?"
/>
```

## Era Classifications

| Era | Years | Characteristics |
|-----|-------|-----------------|
| Golden Era | 1940-1970 | Theatrical, classical music, mythological |
| Romantic Era | 1970-1990 | Family dramas, love stories, comedy |
| Mass Era | 1990-2005 | Mass masala, action, faction dramas |
| New Wave | 2005-2015 | Experimental, urban, realistic |
| Pan-Indian | 2015+ | Big budget, VFX, multi-lingual |

## Content Surfaces (Frontend)

### Movie Detail Page
- Trust badge with "Why?" tooltip
- Era/decade badge
- Tone indicators
- Content warnings (if applicable)
- Audience suitability badge

### Actor/Director Profile
- Career milestones timeline
- Top collaborators
- Hit rate statistics
- Notable films

### Genre/Era Hubs
- Era-specific collections
- Tone-based browsing
- Decade retrospectives

### Editorial Content
- AI-assisted articles
- Curated collections
- Clearly labeled speculative content

## Logging & Monitoring

### Enrichment Logger

```typescript
// Track before/after changes
enrichmentLogger.logChange('synopsis', oldValue, newValue, 'Wikipedia', 0.95);

// Detect anomalies
anomalyDetector.checkAgeRatingAnomaly(movie, 'U', ['Horror', 'Adult']);
```

### Reports

Generated after each enrichment run:
- `reports/enrichment-{session_id}.md`
- `reports/validation-{timestamp}.md`

## Running Migrations

```bash
# Apply migrations in order
psql $DATABASE_URL -f migrations/020-taxonomy-categorization.sql
psql $DATABASE_URL -f migrations/021-trust-scoring.sql
psql $DATABASE_URL -f migrations/022-relationship-graph.sql
psql $DATABASE_URL -f migrations/023-enrichment-lifecycle.sql
```

## Performance Considerations

### Speed Modes (v3.0)

| Mode | Concurrency | Rate Limit | Use Case |
|------|-------------|------------|----------|
| Normal | 20 | 200ms | Standard operations, API-friendly |
| Fast | 50 | 50ms | Daily enrichment, production |
| Turbo | 100 | 25ms | Bulk backfill, may hit API limits |

### Configuration

- **Rate Limiting**: 25-200ms between API calls (mode-dependent)
- **Batch Processing**: 100-500 movies per phase (configurable)
- **Concurrency**: 20-100 parallel requests (mode-dependent)
- **Checkpointing**: Auto-resume on failure with session tracking
- **Staleness**: 90-day refresh cycle
- **Parallel Execution**: Independent phases run simultaneously

### Recommended Commands

```bash
# Daily enrichment (fast, safe)
npx tsx scripts/enrich-master.ts --multi-pass --fast --execute

# Full backfill (maximum speed)
npx tsx scripts/enrich-master.ts --full --turbo --execute --limit=500

# Targeted layer refresh
npx tsx scripts/enrich-master.ts --layer=4 --fast --execute
```

## Future Enhancements

1. **Semantic Search**: Enable search by era, tone, mood
2. **Recommendation Engine**: Use similarity scores
3. **Editorial Dashboard**: Manual review queue
4. **API Endpoints**: Expose trust scores and collaborations
5. **Freshness Alerts**: Automated re-enrichment triggers

