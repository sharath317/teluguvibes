# TeluguVibes CLI Commands Reference

> **Version:** 4.0 - Final Execution Update  
> **Last Updated:** January 2025

---

## 🎬 Movie Ingestion

### TMDB Ingestion by Language

```bash
# Telugu (Primary)
pnpm ingest:tmdb:te                    # Ingest Telugu movies
pnpm ingest:tmdb:telugu                # Alias
pnpm ingest:tmdb:telugu:status         # Check current count
pnpm ingest:tmdb:telugu:recent         # From 2020 onwards
pnpm ingest:tmdb:telugu:full           # From 1990 with credits

# Other Languages (Quality-gated)
pnpm ingest:tmdb:hi                    # Hindi (rating ≥ 7.0)
pnpm ingest:tmdb:ta                    # Tamil (rating ≥ 7.0)
pnpm ingest:tmdb:ml                    # Malayalam (rating ≥ 7.5)
pnpm ingest:tmdb:kn                    # Kannada (rating ≥ 7.0)

# Multi-Language Batch
pnpm movies:ingest:multilang:status    # Check coverage
pnpm movies:ingest:multilang:all       # Ingest all languages
pnpm movies:ingest:multilang:dry       # Preview without changes
```

### Wikipedia Ingestion

```bash
pnpm movies:ingest:wikipedia           # Ingest from Wikipedia lists
pnpm movies:ingest:wikipedia:dry       # Preview only
pnpm movies:ingest:wikipedia:recent    # From 2020 onwards
pnpm movies:ingest:wikipedia:all       # From 1940 onwards
pnpm movies:ingest:wikipedia:strict    # Strict TMDB validation
```

---

## ⚡ Optimized Pipeline Commands (NEW)

> **Speed-optimized commands for faster ingestion and processing**

### Full Optimized Pipeline

```bash
pnpm pipeline:optimized                # Run complete optimized pipeline
pnpm pipeline:optimized --dry          # Preview mode
pnpm pipeline:optimized --limit=500    # Process 500 movies
pnpm pipeline:optimized --skip-validation  # Skip validation stage
```

**Expected Performance:**
- 300 movies enriched in ~2-3 minutes
- 500 movies validated in ~1 minute
- 3-5x faster than standard pipeline

### Individual Optimized Commands

```bash
# Fast Core Ingestion (skip media/reviews/tags)
pnpm ingest:fast:core                  # Discovery + Enrichment only
pnpm ingest:fast:core --limit=300      # Process 300 movies

# Batch Parallel Enrichment
pnpm enrich:batch                      # 25 concurrent batches, 300 movies
pnpm enrich:batch --limit=500          # Process 500 movies
pnpm enrich:batch --concurrency=50     # 50 concurrent operations

# Parallel Validation
pnpm validate:parallel                 # 50 movies per batch
pnpm validate:parallel --limit=500     # Validate 500 movies
pnpm validate:parallel --batch-size=100  # 100 movies per batch

# Chunked TMDB Discovery
pnpm discover:chunk                    # 10-year chunks (default)
pnpm discover:chunk --from=1940 --to=2025  # Full range
pnpm discover:chunk --chunk-size=5     # 5-year chunks
pnpm discover:chunk --resume           # Resume from checkpoint
```

### Performance Comparison

| Command | Before | After | Improvement |
|---------|--------|-------|-------------|
| Movie enrichment (300) | ~360s | ~90s | **4x faster** |
| Validation (500) | ~171s | ~40s | **4x faster** |
| Core ingestion | ~600s | ~180s | **3x faster** |
| TMDB discovery (decade) | N/A | ~60s | **Chunked** |

### Progress Tracking Features

All optimized commands include:
- Real-time progress bars with ETA
- Items/second rate display
- User prompts after 5 minutes (Continue/Skip/Stop)
- Automatic checkpoint saving
- Resume capability for interrupted operations

---

## 🎨 Enrichment

### Movie Enrichment

```bash
pnpm enrich:movies                     # Enrich movie metadata
pnpm enrich:movies:all                 # Enrich all movies
pnpm enrich:movies:full                # Full enrichment + media

pnpm ingest:movies:smart               # Smart enrichment pipeline
pnpm ingest:movies:smart:dry           # Preview only
```

### Media Enrichment

```bash
pnpm movies:enrich:media               # Fill missing images
pnpm movies:enrich:media:dry           # Preview only
pnpm movies:enrich:media:poster        # Posters only
pnpm movies:enrich:media:backdrop      # Backdrops only
pnpm movies:enrich:media:both          # Both types
```

### Review Enhancement

```bash
pnpm reviews:generate                  # Generate template reviews
pnpm reviews:generate:dry              # Preview only
pnpm reviews:generate:canonical        # Canonical reviews

pnpm reviews:enhance                   # Enhance existing reviews
pnpm reviews:enhance:dry               # Preview only
pnpm reviews:enhance:apply             # Apply enhancements
pnpm reviews:enhance:confidence        # Update confidence only
```

### Full Enrichment Pipeline

```bash
pnpm enrich:all                        # Full system enrichment
                                       # Runs: smart enrichment + media + tags + reviews
```

---

## 🏷️ Tagging & Classification

```bash
pnpm movies:auto-tag                   # Auto-tag blockbusters/classics/gems
pnpm movies:auto-tag:dry               # Preview only

pnpm tags:rebuild                      # Rebuild all tags
pnpm tags:rebuild:apply                # Apply changes
pnpm tags:rebuild:stats                # Show statistics
pnpm tags:rebuild:smart                # Smart tag generation
pnpm tags:rebuild:smart:apply          # Apply smart tags
```

---

## 🔍 Intelligence & Audit

### Movie Audit

```bash
pnpm intel:movie-audit                 # Full movie audit
pnpm intel:movie-audit:status          # Current status
pnpm intel:movie-audit:fix             # Auto-fix issues
pnpm intel:movie-audit:duplicates      # Find duplicates
pnpm intel:movie-audit:duplicates:auto # Auto-merge duplicates
pnpm intel:movie-audit:purge           # Purge invalid entries
pnpm intel:movie-audit:strict          # Strict validation
```

### Entity Management

```bash
pnpm intel:entity-audit                # Find duplicate entities
pnpm intel:entity-merge:dry            # Preview merges
pnpm intel:entity-merge:apply          # Apply merges
pnpm intel:entity-merge:auto           # Auto-merge high confidence
pnpm intel:entity-merge:stats          # Merge statistics
```

### Normalization

```bash
pnpm intel:normalize                   # Normalize all
pnpm intel:normalize:movies            # Normalize movie titles
pnpm intel:normalize:celebs            # Normalize celebrity names
pnpm intel:normalize:media             # Normalize media URLs
pnpm intel:normalize:all               # Full normalization
pnpm intel:normalize:all:dry           # Preview only
```

### Validation

```bash
pnpm intel:validate:movies             # Validate movies
pnpm intel:validate:movies:fix         # Auto-fix validation issues
pnpm intel:validate:movies:strict      # Strict validation
```

---

## 📊 Coverage & Analytics

### Movie Coverage

```bash
pnpm movies:coverage                   # Coverage summary
pnpm movies:coverage:full              # Detailed coverage
pnpm movies:coverage:analyze           # Gap analysis
pnpm movies:coverage:analyze:json      # JSON output

pnpm movies:coverage:enforce           # Enforce 95% coverage
pnpm movies:coverage:enforce:dry       # Preview only
pnpm movies:coverage:enforce:apply     # Apply enforcement
pnpm movies:coverage:enforce:status    # Coverage status
```

### Review Coverage

```bash
pnpm reviews:coverage                  # Review coverage (95% target)
pnpm reviews:coverage:status           # Current coverage
pnpm reviews:coverage:dry              # Preview only
pnpm reviews:coverage:strict           # 99% target
```

### Media Audit

```bash
pnpm media:audit                       # Full media audit
pnpm media:audit:missing               # Find missing media
pnpm media:audit:metrics               # Media health metrics
pnpm media:audit:json                  # JSON output
```

---

## 🌟 Hot & Glamour Content

```bash
pnpm hot:pipeline                      # Full hot content pipeline
pnpm hot:discover                      # Discover new celebrities
pnpm hot:ingest                        # Ingest hot content
pnpm hot:ingest:dry                    # Preview only
pnpm hot:ingest:smart                  # Smart ingestion
pnpm hot:ingest:full                   # Full ingestion
pnpm hot:ingest:refresh                # Refresh existing

pnpm hot:refresh                       # Refresh hot media
pnpm hot:telugu                        # Telugu-focused content

pnpm glamour:fetch                     # Fetch glamour images
pnpm glamour:fetch:dry                 # Preview only
pnpm glamour:fetch:clean               # Clean before fetch
```

---

## 🔄 System Operations

### Safe Reset

```bash
pnpm safe-reset                        # Safe reset (keeps analytics)
pnpm safe-reset:dry                    # Preview only
pnpm safe-reset:full                   # Full reset with preservation
```

### Migrations

```bash
pnpm run-migrations                    # Run database migrations
```

### Intelligence Sync

```bash
pnpm intelligence:sync                 # Sync intelligence data
pnpm intelligence:sync:dry             # Preview only
pnpm intelligence:sync:verbose         # Verbose output
```

---

## 📋 Recommended Workflows

### Daily Operations

```bash
# 1. Check coverage
pnpm movies:coverage
pnpm reviews:coverage:status

# 2. Ingest new movies
pnpm ingest:tmdb:te
pnpm movies:ingest:multilang:status

# 3. Enrich new content
pnpm ingest:movies:smart --limit=50
pnpm reviews:generate
```

### Weekly Maintenance

```bash
# 1. Audit and fix issues
pnpm intel:movie-audit:status
pnpm intel:entity-audit
pnpm intel:entity-merge:auto

# 2. Normalize data
pnpm intel:normalize:all:dry
pnpm intel:normalize:all

# 3. Check media health
pnpm media:audit:metrics
pnpm movies:enrich:media
```

### Monthly Deep Clean

```bash
# 1. Full audit
pnpm intel:movie-audit:strict
pnpm intel:entity-audit

# 2. Coverage enforcement
pnpm movies:coverage:enforce:status
pnpm movies:coverage:enforce:apply

# 3. Tag rebuild
pnpm tags:rebuild:smart:apply
```

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| Ingest Telugu | `pnpm ingest:tmdb:te` |
| Ingest Hindi | `pnpm ingest:tmdb:hi` |
| Enrich all | `pnpm enrich:all` |
| Check coverage | `pnpm movies:coverage` |
| Find duplicates | `pnpm intel:movie-audit:duplicates` |
| Auto-tag movies | `pnpm movies:auto-tag` |
| Generate reviews | `pnpm reviews:generate` |
| Full media fill | `pnpm movies:enrich:media` |

---

## 🧹 Data Cleanup Commands (NEW)

### Sample Data Cleanup

```bash
# Remove all sample/placeholder/dummy data
pnpm cleanup:sample            # Execute cleanup
pnpm cleanup:sample:dry        # Preview what will be deleted
```

Cleans:
- Hot media seed data (picsum, unsplash, example.com)
- Invalid movie entries (missing title/language)
- Person names incorrectly stored as movies
- Empty collections
- Orphan reviews

### Orphan Resolution

```bash
pnpm orphan:resolve            # Fix orphan movies (no TMDB ID)
pnpm orphan:resolve:dry        # Preview only
```

---

## 📊 Observability Commands

### Coverage Dashboard

```bash
# Access at /admin/coverage
# API endpoint: /api/admin/coverage
```

Shows:
- Total movies by language
- Verified vs Partial percentages
- Coverage by decade
- Missing data hotspots
- Review coverage

### Health Check

```bash
# API endpoint: /api/health
# Returns: healthy | degraded | unhealthy
```

Checks:
- Database connectivity
- Table counts
- Orphan records
- Last update timestamps

---

## 🎯 Final Production Commands

### Full Pipeline Execution

```bash
# Complete accelerated pipeline
pnpm ingest:accelerated --all && \
pnpm ingest:finalize && \
pnpm orphan:resolve && \
pnpm intel:movie-audit:duplicates --fix
```

### Fast Finalize (Recommended)

```bash
# Fast scoring and promotion (18 movies/sec)
pnpm finalize:fast              # Run fast finalization
pnpm finalize:fast:status       # Check finalization status
pnpm finalize:fast:dry          # Preview mode

# Original finalize (slower, with external gates)
pnpm ingest:finalize            # Full finalize with all gates
pnpm ingest:finalize --skip-dedupe --skip-audit  # Skip slow gates
```

### Auto-Promotion (Visibility Fix)

```bash
# Promote verified movies to UI visibility
pnpm promote:auto               # Run auto-promotion
pnpm promote:auto:status        # Check visibility status
pnpm promote:auto:dry           # Preview mode
```

### Smart Tag Generation (Data-Driven Sections)

```bash
# Generate tags for all movies
pnpm tags:generate              # Generate all tags
pnpm tags:generate:status       # Check tag status
pnpm tags:generate:dry          # Preview mode

# Tags power:
# - Blockbusters, Hidden Gems, Classics
# - Top 10 / Quick Links
# - Year/Month/Decade groupings
# - Actor/Director sections
```

### Derived Sections API

```bash
# API endpoint: /api/sections?type=<type>&language=<lang>
# Types: blockbusters, classics, hidden-gems, top-10, by-actor, by-director, by-decade, recent
```

### Single Language Pipeline

```bash
# Telugu complete flow
pnpm ingest:accelerated --language=te
pnpm finalize:fast

# Other languages (500+ each)
pnpm ingest:accelerated --language=hi
pnpm ingest:accelerated --language=ta
pnpm ingest:accelerated --language=ml
pnpm ingest:accelerated --language=kn
```

---

*CLI Reference v3.2 - January 2025 (Production Hardening Update)*

