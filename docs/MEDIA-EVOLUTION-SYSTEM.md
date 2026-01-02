# Media-Aware Data Evolution System

A comprehensive system for improving Telugu movie data quality through intelligent gap analysis, tiered media sourcing, entity normalization, and continuous discovery.

## 📊 Current State

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Movies in Index | 2,626 | - | ✅ Complete |
| Enriched Movies | 1,000 | 2,200+ | 🔄 In Progress |
| Backdrop Coverage | 41% | 75% | ⚠️ Needs Work |
| Visual Completeness | 41% | 90% | ⚠️ Needs Work |
| Entity Confidence | 0.83 | 0.90 | ✅ Good |
| Review Coverage | 100% | 95%+ | ✅ Exceeds Target |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MEDIA-AWARE DATA EVOLUTION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1                    PHASE 2-3                   PHASE 4             │
│  Coverage Gap               Media Enhancement           Entity              │
│  Analysis                   Pipeline                    Normalization       │
│  ┌─────────────┐           ┌─────────────┐             ┌─────────────┐     │
│  │ Analyze     │           │ Tier 1:TMDB │             │ Canonical   │     │
│  │ Missing     │──────────▶│ Tier 2:Wiki │────────────▶│ Names       │     │
│  │ Fields      │           │ Tier 3:Fall │             │ Duplicates  │     │
│  └─────────────┘           └─────────────┘             └─────────────┘     │
│         │                         │                           │             │
│         ▼                         ▼                           ▼             │
│  PHASE 5                    PHASE 6                     PHASE 7             │
│  Smart Tags                 Story Graph                 Continuous          │
│  ┌─────────────┐           ┌─────────────┐             Discovery            │
│  │ Narrative   │           │ Story Arcs  │             ┌─────────────┐     │
│  │ Tone        │           │ Timelines   │             │ TMDB Delta  │     │
│  │ Cultural    │           │ Auto-Link   │             │ Safe Mode   │     │
│  └─────────────┘           └─────────────┘             └─────────────┘     │
│         │                         │                           │             │
│         └─────────────────────────┴───────────────────────────┘             │
│                                   │                                          │
│                                   ▼                                          │
│                          PHASE 9: METRICS                                    │
│                          ┌─────────────────────────────────────┐            │
│                          │ Visual Completeness | Depth Score   │            │
│                          │ Entity Confidence  | Tier Distrib.  │            │
│                          └─────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase Details

### Phase 1: Coverage Gap Analysis

**Purpose:** Diagnose WHY movies are missing or incomplete.

**Command:**
```bash
pnpm movies:coverage:analyze
```

**Output:** `coverage_gap_report.json` containing:
- Gap summary by type (missing backdrop, low cast, no genres)
- Coverage by decade
- Priority classification (critical, high, medium, low)
- Actionable recommendations

**Gap Classifications:**
| Code | Description |
|------|-------------|
| `MISSING_BACKDROP` | No backdrop image |
| `MISSING_FROM_INDEX` | Not in canonical index |
| `OLDER_DECADE_PRE_1990` | Historical movie with limited data |
| `CAST_UNDER_5` | Fewer than 5 cast members |
| `NO_DIRECTOR` | Director information missing |
| `NO_GENRES` | Genre classification missing |

---

### Phase 2: Media Source Tiers

**Purpose:** Define trust levels for image sources.

**Tier System:**

| Tier | Sources | Trust Level | Use Case |
|------|---------|-------------|----------|
| **Tier 1** | TMDB posters, backdrops, stills, profiles | Authoritative | Primary source |
| **Tier 2** | Wikimedia Commons (CC), Wikipedia infobox, YouTube thumbnails | Curated | Fallback when Tier 1 unavailable |
| **Tier 3** | Festival stills (IFFI, SIIMA), Studio promos | Fallback | Last resort |

**Explicitly Disallowed:**
- ❌ Instagram scraping
- ❌ Pinterest
- ❌ Google Images
- ❌ Fan uploads
- ❌ Twitter/Facebook

**Image Metadata Stored:**
```typescript
{
  source: string,
  trust_tier: 1 | 2 | 3,
  license: string,
  resolution_score: number,  // 0-100
  aspect_ratio: string,
  verified: boolean,
  fetched_at: string
}
```

---

### Phase 3: Media Enhancement Pipeline

**Purpose:** Increase backdrop and poster coverage using tiered sources.

**Commands:**
```bash
# Enhance backdrops (default focus)
pnpm movies:enrich:media --tiered

# Dry run (preview only)
pnpm movies:enrich:media:dry

# Focus on specific type
pnpm movies:enrich:media:poster
pnpm movies:enrich:media:backdrop
pnpm movies:enrich:media:both

# Filter by decade
pnpm movies:enrich:media --tiered --decade=2020
```

**Features:**
- Language fallback chain: `te-IN → en-US → null`
- Resolution scoring (higher = better)
- Aspect ratio validation (16:9 for backdrops, 2:3 for posters)
- **Never overwrites** valid images unless replacement scores higher

---

### Phase 4: Entity Normalization

**Purpose:** Standardize entity names, detect duplicates, find collaborations.

**Commands:**
```bash
# Analyze without changes
pnpm entities:normalize

# Apply normalization
pnpm entities:normalize --fix

# Find duplicate entities
pnpm entities:normalize --duplicates

# Detect frequent collaborations
pnpm entities:normalize --collaborations

# Career phase analysis
pnpm entities:normalize --career-phases
```

**Name Normalization Rules:**
- Consistent capitalization
- Remove extra spaces
- Handle variations (Jr., Jr, Junior)
- Common star name mappings

**Collaboration Detection:**
- Actor-Director pairs (e.g., Allu Arjun + Sukumar: 5 films)
- Hero-Heroine pairs (e.g., Venkatesh + Soundarya: 6 films)

**Career Phases:**
| Phase | Criteria |
|-------|----------|
| Debut | ≤2 films |
| Rising | ≤10 films, <5 years active |
| Peak | ≥30 films, ≥10 years |
| Veteran | ≥50 films, ≥25 years |
| Legend | ≥100 films, ≥40 years |

---

### Phase 5: Smart Tag System

**Purpose:** Generate structured, deterministic tags from movie data.

**Commands:**
```bash
# Preview tags
pnpm tags:rebuild

# Apply tags
pnpm tags:rebuild --apply

# Show available tag types
pnpm tags:rebuild --stats
```

**Tag Categories:**

| Category | Examples |
|----------|----------|
| **Narrative** | revenge, family, political, romance, action, comedy, thriller |
| **Tone** | mass, experimental, emotional, commercial, artistic, realistic |
| **Cultural** | village, festival, mythology, telangana, coastal_andhra, nri |
| **Career** | debut, comeback, peak, career_best |

**Derivation Sources:**
- TMDB genres
- Keyword patterns in titles/synopses
- Cast/crew relationships

---

### Phase 6: Connected Story Graph

**Purpose:** Link related content into multi-day story arcs.

**Features:**
- Story arc creation with timeline
- Event types: initial_report, update, resolution
- Auto-linking posts to movies/celebrities
- Status tracking: developing, resolved, ongoing

**Example Arc:**
```
Story: "Pushpa 2 Release Journey"
├── Day 1: Teaser announcement
├── Day 15: Trailer release
├── Day 30: Pre-release event
└── Day 45: Box office update
```

---

### Phase 7: Continuous Discovery

**Purpose:** Safely discover new Telugu movies from TMDB changes.

**Commands:**
```bash
# Check for new movies (last 7 days)
pnpm discover:telugu:delta

# Specify time range
pnpm discover:telugu:delta --days=14

# Add new movies to index
pnpm discover:telugu:delta --apply

# Show discovery status
pnpm discover:telugu:delta --status
```

**Safety Rules:**
- ✅ Only adds to index (not directly to movies)
- ✅ Validates original_language === "te"
- ✅ Duplicate prevention via TMDB ID check
- ✅ Requires separate enrichment step

---

### Phase 9: Metrics Dashboard

**Purpose:** Track data quality improvement over time.

**Command:**
```bash
pnpm media:audit --metrics
```

**Metrics Tracked:**
| Metric | Description |
|--------|-------------|
| Visual Completeness | % with both poster and backdrop |
| Structured Depth | Average fields populated (0-100) |
| Entity Confidence | How complete cast/crew data is (0-1) |
| Media Tier Distribution | Count by source tier |
| Coverage by Decade | Completeness per decade |

---

## 🚀 Recommended Workflow

### Initial Setup (One-Time)

```bash
# 1. Analyze current gaps
pnpm movies:coverage:analyze

# 2. Review the report
cat coverage_gap_report.json | jq '.gap_summary'
```

### Daily/Weekly Enrichment

```bash
# 1. Check for new Telugu movies
pnpm discover:telugu:delta --status

# 2. Enrich pending movies from index
pnpm ingest:movies:smart --limit=100

# 3. Enhance media for recent decades
pnpm movies:enrich:media --tiered --decade=2020 --limit=50

# 4. Generate reviews for new movies
pnpm reviews:coverage --target=0.95
```

### Data Quality Maintenance

```bash
# Normalize entity names monthly
pnpm entities:normalize --fix

# Rebuild tags after major updates
pnpm tags:rebuild --apply

# Full audit
pnpm media:audit --metrics
```

---

## 📁 File Structure

```
lib/media-evolution/
├── types.ts                    # Type definitions
├── coverage-gap-analyzer.ts    # Phase 1
├── media-enhancement.ts        # Phase 2 & 3
├── entity-normalizer.ts        # Phase 4
├── smart-tags.ts               # Phase 5
├── story-graph.ts              # Phase 6
├── continuous-discovery.ts     # Phase 7
├── metrics.ts                  # Phase 9
└── index.ts                    # Module exports

scripts/
├── movies-coverage-analyze.ts
├── movies-enrich-media.ts
├── entities-normalize.ts
├── tags-rebuild.ts
├── discover-telugu-delta.ts
└── media-audit.ts
```

---

## 🎯 Success Targets

| Goal | Current | Target | Timeline |
|------|---------|--------|----------|
| Index Coverage | 24% | 85% | 2 weeks |
| Backdrop Coverage | 41% | 75% | 1 week |
| Visual Completeness | 41% | 90% | 2 weeks |
| Entity Confidence | 0.83 | 0.90 | 1 week |

---

## 🚨 Non-Negotiable Rules

1. **No social media scraping** - Instagram, Pinterest, Twitter are banned
2. **No unlicensed images** - All images must have tracked licenses
3. **No data overwriting** - Existing valid data is preserved
4. **TMDB is authoritative** - Primary source for movie data
5. **Enrichment over ingestion** - Add to index first, enrich separately
6. **All operations logged** - Traceable and recomputable

