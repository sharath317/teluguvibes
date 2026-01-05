# 🧠 Intelligence Sync CLI

Production-grade AI ingestion pipeline for the Telugu media platform.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run full sync (smart mode)
pnpm intelligence:sync

# Preview changes without writing
pnpm intelligence:sync:dry

# Verbose output
pnpm intelligence:sync:verbose
```

## Usage

```bash
pnpm intelligence:sync [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--source=<sources>` | Data sources (comma-separated) | `all` |
| `--target=<targets>` | What to update | `all` |
| `--mode=<mode>` | Update strategy | `smart` |
| `--dry-run` | Preview without writing | `false` |
| `--limit=<n>` | Max records per source | `100` |
| `--force-ai` | Force AI enrichment | `false` |
| `--verbose` | Detailed logs | `false` |

### Sources

- `tmdb` - TMDB API (movies, celebrities)
- `wikidata` - Wikidata SPARQL (historic data)
- `youtube` - YouTube interviews (metadata + captions)
- `news` - NewsData.io, GNews (trending topics)

### Targets

- `celebrities` - Celebrity profiles
- `movies` - Movie catalogue
- `reviews` - Auto-generated reviews

### Modes

| Mode | Behavior |
|------|----------|
| `append` | Insert only new records |
| `update` | Overwrite existing records |
| `smart` | **DEFAULT** - Only update missing/weak fields |

## Examples

```bash
# Sync celebrities from TMDB only
pnpm intelligence:sync --source=tmdb --target=celebrities

# Preview what would be updated
pnpm intelligence:sync --dry-run --limit=10

# Force refresh all movie data
pnpm intelligence:sync --target=movies --mode=update --force-ai

# Sync from Wikidata (historic data)
pnpm intelligence:sync --source=wikidata --target=celebrities,movies

# Full verbose sync
pnpm intelligence:sync --verbose --limit=50
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE SYNC                        │
├─────────────────────────────────────────────────────────────┤
│  1. FETCH                                                    │
│     ├── TMDB → movies, celebrities                          │
│     ├── Wikidata → historic entities                        │
│     ├── YouTube → interview metadata                        │
│     └── News → trending topics                              │
├─────────────────────────────────────────────────────────────┤
│  2. DEDUPLICATE                                              │
│     ├── Match by tmdb_id, wikidata_id                       │
│     ├── Match by normalized name                            │
│     └── Filter non-Telugu entities                          │
├─────────────────────────────────────────────────────────────┤
│  3. AI ENRICH (Groq/Gemini)                                 │
│     ├── Generate Telugu biographies                         │
│     ├── Classify era, popularity tier                       │
│     ├── Extract interview insights                          │
│     └── Return structured JSON                              │
├─────────────────────────────────────────────────────────────┤
│  4. UPDATE DECISION                                          │
│     ├── Compare existing vs new                             │
│     ├── Decide per field (keep/update/ignore)               │
│     └── Respect --mode flag                                 │
├─────────────────────────────────────────────────────────────┤
│  5. DATABASE WRITE                                           │
│     ├── Insert/Update to Supabase                           │
│     ├── Version tracking (updated_at, source_tags)          │
│     └── Log AI reasoning to ai_learnings                    │
└─────────────────────────────────────────────────────────────┘
```

## Smart Update Logic

When `--mode=smart` (default):

1. **Empty existing field** → Update with new value
2. **Empty new value** → Keep existing
3. **Both have values** → Compare quality scores:
   - Source reliability (Wikidata > TMDB > YouTube > News)
   - AI confidence
   - Field priority (name > image > bio > metadata)
4. **High-priority fields** → Keep unless new is significantly better

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY= (or GEMINI_API_KEY)
TMDB_API_KEY=
```

Optional:
```
YOUTUBE_API_KEY=
NEWSDATA_API_KEY=
GNEWS_API_KEY=
```

## Output

```
🧠 Intelligence Sync Starting...

Mode: smart
Sources: tmdb, wikidata, youtube, news
Limit: 100

📡 Fetching from TMDB...
  ✓ 45 entities from tmdb

📡 Fetching from WIKIDATA...
  ✓ 38 entities from wikidata

📥 Fetched 83 raw entities

🔍 67 unique entities after deduplication

🤖 AI Enrichment (67 entities)...
  Processing: 67/67

📝 Processing updates (smart mode)...

═══════════════════════════════════════
           SYNC COMPLETE
═══════════════════════════════════════

✔ 83 entities fetched
✔ 67 enriched via AI
✔ 42 updated (smart mode)
⚠ 18 skipped (already complete)
❌ 0 failed
```

## Files

```
scripts/intelligence/
├── run.ts              # CLI entry point
├── types.ts            # Type definitions
├── ai-enricher.ts      # AI processing
├── update-engine.ts    # Update decision logic
├── db-writer.ts        # Database operations
├── deduplicator.ts     # Entity matching
├── sources/
│   ├── tmdb.ts         # TMDB fetcher
│   ├── wikidata.ts     # Wikidata SPARQL
│   ├── youtube.ts      # YouTube metadata
│   ├── news.ts         # News APIs
│   └── internal.ts     # Existing DB records
└── README.md           # This file
```

## Route Integration

Data automatically appears in existing routes:

| Route | Data Used |
|-------|-----------|
| `/admin/celebrities` | Celebrity profiles with bio, era, tier |
| `/reviews` | Auto-generated reviews (marked as AI) |
| `/admin/movies` | Movie catalogue with verdicts |

## Safety

- **Idempotent**: Safe to re-run any time
- **Dry run**: Preview before committing
- **Rate limited**: Respects API limits
- **Cached**: AI results cached per session
- **Versioned**: All changes tracked with timestamps








