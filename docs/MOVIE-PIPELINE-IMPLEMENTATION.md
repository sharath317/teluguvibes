# Telugu Movie Pipeline - Complete Implementation

## Summary

This document outlines the complete implementation of Phases 2-9 for the Telugu movie ingestion pipeline.

---

## Phase 2: Canonical Telugu Movie Discovery ✅

### Created Files
- `supabase-telugu-movie-index.sql` - Schema for canonical movie index
- `lib/movie-index/tmdb-paginator.ts` - Full TMDB paginator for Telugu movies
- `scripts/ingest-tmdb-telugu.ts` - CLI for discovery

### Key Features
- Canonical `telugu_movie_index` table - immutable reference data
- Paginates through `/discover/movie?with_original_language=te`
- Confidence score calculation
- Status: VALID / NEEDS_REVIEW / REJECTED / PENDING

### CLI Commands
```bash
pnpm ingest:tmdb:telugu --status        # View current index status
pnpm ingest:tmdb:telugu --dry           # Preview mode
pnpm ingest:tmdb:telugu                 # Full discovery
pnpm ingest:tmdb:telugu --year=2024     # Single year
pnpm ingest:tmdb:telugu --from=2020     # 2020 to present
pnpm ingest:tmdb:telugu --credits       # Also fetch credits (slower)
```

---

## Phase 3: Data Sanity & Deduplication ✅

### Created Files
- `scripts/validate-movies.ts` - Validation CLI

### Validation Gates
1. **TMDB Verification** - Verify movie exists and is Telugu
2. **Director Validation** - Director must exist
3. **Cast Validation** - Minimum 3 cast members
4. **Image Check** - Poster or backdrop required
5. **Duplicate Detection** - normalized_title + year

### Status Flags
- `VALID` - Passes all gates
- `NEEDS_REVIEW` - Partial pass, manual check needed
- `REJECTED` - Fails critical gates

### CLI Commands
```bash
pnpm intel:validate:movies           # Validate all pending
pnpm intel:validate:movies --fix     # Auto-fix issues
pnpm intel:validate:movies --strict  # Strict mode (rejects more)
```

---

## Phase 4: Smart Data Enrichment ✅

### Created Files
- `scripts/smart-movie-enrichment.ts` - Enrichment CLI

### Enrichment Data
- Full cast (actors, director, music director)
- Genres with confidence
- Runtime, certification
- Posters/backdrops from TMDB
- Hero/heroine extraction
- Data quality score calculation

### CLI Commands
```bash
pnpm ingest:movies:smart            # Enrich pending movies
pnpm ingest:movies:smart --dry      # Preview mode
pnpm ingest:movies:smart --force    # Re-enrich all
```

---

## Phase 5: Review Template Evolution ✅

### Created/Extended Files
- `scripts/generate-canonical-reviews.ts` - Canonical review generator
- Uses existing `lib/reviews/template-reviews.ts`

### Key Features
- Template-first, AI only as enhancer
- One movie → one canonical review
- Multi-axis ratings (Story, Acting, Music, Direction)
- Verdict in Telugu
- Confidence scoring

### CLI Commands
```bash
pnpm reviews:generate              # Generate for movies without reviews
pnpm reviews:generate --dry        # Preview mode
pnpm reviews:generate --canonical  # Only canonical reviews
```

---

## Phase 6: Connected Story Engine ✅

### Created Files
- `lib/story-engine/connected-stories.ts` - Story arc logic
- `lib/story-engine/index.ts` - Module exports
- `supabase-story-arcs.sql` - Schema for story arcs

### Key Features
- Multi-day story arcs
- New post auto-linking to parent story
- Timeline UI auto-generated
- Mini-story summaries
- Story types: breaking, developing, feature, series

### API
```typescript
import { StoryEngine } from '@/lib/story-engine';

// Detect if post belongs to existing story
const connection = await StoryEngine.detectConnection(title, content, category, entities);

// Create new story arc
const arc = await StoryEngine.createArc(initialPost, 'developing');

// Add post to story
await StoryEngine.addPost(storyId, post, 'update');

// Get timeline
const timeline = await StoryEngine.getTimeline(storyId);
```

---

## Phase 7: Quality Enforcement ✅

### Created Files
- `lib/movie-index/quality-enforcement.ts` - Quality gates

### 7 Quality Gates
1. **Image Present & Legal** - TMDB/Wikimedia only
2. **Canonical Index** - Must exist in telugu_movie_index
3. **Cast & Director** - Director + 3 cast minimum
4. **Title Quality** - No malformed titles
5. **Orphan Celebrities** - All cast must have valid names
6. **Genre Confidence** - Valid genre names
7. **Data Quality** - Minimum 50% quality score

### Status Output
- `PUBLISHABLE` - All gates pass
- `NEEDS_REWORK` - Fixable issues
- `BLOCKED` - Manual intervention required

---

## Phase 8: Unified CLI Commands ✅

### All Commands Added to package.json
```bash
# Discovery
pnpm ingest:tmdb:telugu              # Full TMDB discovery
pnpm ingest:tmdb:telugu:dry          # Preview mode
pnpm ingest:tmdb:telugu:status       # Index status
pnpm ingest:tmdb:telugu:recent       # 2020 onwards
pnpm ingest:tmdb:telugu:credits      # With credits (slow)
pnpm ingest:tmdb:telugu:full         # Full with credits

# Validation
pnpm intel:validate:movies           # Validate all
pnpm intel:validate:movies:fix       # Auto-fix
pnpm intel:validate:movies:strict    # Strict mode

# Enrichment
pnpm ingest:movies:smart             # Enrich movies
pnpm ingest:movies:smart:dry         # Preview

# Reviews
pnpm reviews:generate                # Generate reviews
pnpm reviews:generate:dry            # Preview
pnpm reviews:generate:canonical      # Canonical only

# Coverage
pnpm movies:coverage                 # Quick report
pnpm movies:coverage:full            # Detailed report
```

---

## Phase 9: Success Metrics Dashboard ✅

### Created Files
- `scripts/movie-coverage.ts` - Coverage report CLI

### Metrics Tracked
1. **Index Coverage** - % of TMDB Telugu movies indexed
2. **Validation Status** - Valid/NeedsReview/Rejected/Pending
3. **Data Quality** - Poster/Backdrop/Director/Cast coverage
4. **Review Coverage** - % with reviews
5. **Duplicates** - Must be 0

### Success Goals
| Metric | Target |
|--------|--------|
| Index Coverage | ≥90% |
| Valid Movies | ≥80% |
| With Director | ≥70% |
| With 3+ Cast | ≥60% |
| Review Coverage | ≥95% |
| Duplicates | 0 |

---

## Recommended Workflow

```bash
# 1. Run the schema migration (if not done)
# psql -f supabase-telugu-movie-index.sql
# psql -f supabase-story-arcs.sql

# 2. Discover all Telugu movies from TMDB
pnpm ingest:tmdb:telugu --from=1990

# 3. Validate the indexed movies
pnpm intel:validate:movies --fix

# 4. Enrich valid movies with full data
pnpm ingest:movies:smart

# 5. Generate reviews
pnpm reviews:coverage --target=0.95

# 6. Check coverage metrics
pnpm movies:coverage --full
```

---

## What Already Existed (REUSED)

- ✅ TMDB Integration (`lib/movie-db.ts`, `lib/movie-catalogue/tmdb-movies.ts`)
- ✅ Movie Validation (`lib/movie-validation/movie-identity-gate.ts`)
- ✅ Template Reviews (`lib/reviews/template-reviews.ts`)
- ✅ Coverage Engine (`lib/reviews/coverage-engine.ts`)
- ✅ Wikipedia Ingestion (`scripts/ingest-wikipedia-movies.ts`)

---

## What Was Extended

- ♻️ Validation gates with VALID/NEEDS_REVIEW/REJECTED statuses
- ♻️ Template reviews with canonical generation
- ♻️ Movie identity gate with better confidence scoring

---

## What Was Built New

- ❌ `telugu_movie_index` table and schema
- ❌ TMDB full paginator for Telugu movies
- ❌ Smart enrichment pipeline
- ❌ Connected story engine
- ❌ Quality enforcement gates
- ❌ Coverage metrics dashboard

---

## Database Schema Changes

### New Tables
1. `telugu_movie_index` - Canonical Telugu movie index
2. `telugu_movie_ingestion_log` - Ingestion tracking
3. `story_arcs` - Multi-day story arcs
4. `story_posts` - Posts linked to stories

### New Views
1. `movies_pending_enrichment`
2. `telugu_movie_coverage`
3. `active_stories_with_latest`
4. `story_timeline_summary`

### New Indexes
- On status, verification, canonical title, popularity
- GIN index on keywords array






