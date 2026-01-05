# Social Handle Ingestion & Glamour Metadata System

## Overview

The Social Handle Ingestion System is a **metadata-only** system that collects official, public social handles of actresses and celebrities from trusted sources. It supports Hot & Glamour content generation while maintaining strict legal compliance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SOCIAL PROFILES SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │   Wikidata    │   │  Wikipedia    │   │     TMDB      │         │
│  │   P2003/P2002 │   │  Ext Links    │   │  external_ids │         │
│  │   /P2397      │   │  (Infobox)    │   │     API       │         │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘         │
│          │                   │                   │                  │
│          └───────────────────┼───────────────────┘                  │
│                              ▼                                      │
│                  ┌─────────────────────┐                            │
│                  │  Unified Fetcher    │                            │
│                  │  (source-adapters)  │                            │
│                  └──────────┬──────────┘                            │
│                             │                                       │
│                             ▼                                       │
│          ┌──────────────────────────────────────┐                   │
│          │         Confidence Engine            │                   │
│          │  • Cross-source validation           │                   │
│          │  • Name similarity scoring           │                   │
│          │  • Fan page detection               │                   │
│          └──────────────────┬───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│          ┌──────────────────────────────────────┐                   │
│          │         Safety Validators            │                   │
│          │  • Political content flags          │                   │
│          │  • Adult content detection          │                   │
│          │  • AdSense compliance              │                   │
│          └──────────────────┬───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │  celebrity_social_  │                            │
│                  │     profiles        │                            │
│                  │    (Supabase)       │                            │
│                  └─────────────────────┘                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Strict Rules (Non-Negotiable)

| ❌ NOT ALLOWED | ✅ ALLOWED |
|----------------|------------|
| Scraping Instagram/Twitter pages | Using Wikidata SPARQL queries |
| Downloading images or videos | oEmbed URLs only |
| Copying captions verbatim | Metadata storage (handles, URLs) |
| Private or inferred handles | Official API endpoints |
| Fan pages, unofficial accounts | Verified official profiles |

## Data Sources

### 1. Wikidata (Primary - Highest Confidence)

```sparql
# Properties used:
P2003 - Instagram username
P2002 - Twitter username
P2397 - YouTube channel ID
P2013 - Facebook ID
P7085 - TikTok username
P345  - IMDB ID
P856  - Official website
```

Confidence: **0.8** (80%)

### 2. Wikipedia (Secondary)

- Parses external links from Wikipedia infoboxes
- Uses REST API only (no HTML scraping)
- Cross-validates with celebrity name

Confidence: **0.6** (60%)

### 3. TMDB (Supporting)

- Uses `/person/{id}/external_ids` API
- Confirms handles from other sources
- Boosts confidence when matching

Confidence: **0.7** (70%)

## Database Schema

### `celebrity_social_profiles`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| celebrity_id | UUID | FK to celebrities |
| platform | ENUM | instagram, youtube, twitter, etc. |
| handle | TEXT | Username (without @) |
| profile_url | TEXT | Full profile URL |
| source | ENUM | wikidata, wikipedia, tmdb, manual |
| confidence_score | DECIMAL | 0.0 to 1.0 |
| verified | BOOLEAN | Admin verified |
| verification_method | TEXT | How it was verified |
| is_active | BOOLEAN | Profile active |
| is_official | BOOLEAN | Official account |
| is_primary | BOOLEAN | Primary for platform |

### Related Tables

- `social_ingestion_log` - Tracks ingestion runs
- `social_blocked_handles` - Blocked fan pages, etc.

## Confidence Scoring

| Factor | Score Adjustment |
|--------|------------------|
| Wikidata match | +0.5 |
| Wikipedia link | +0.3 |
| TMDB confirmation | +0.2 |
| Cross-source match | +0.2 |
| Name similarity (high) | +0.1 |
| Official suffix | +0.05 |
| Name mismatch | -0.3 |

### Status Thresholds

| Status | Confidence | Action |
|--------|------------|--------|
| VERIFIED | ≥ 0.8 | Auto-approve |
| PROBABLE | 0.6 – 0.79 | Auto-approve with flag |
| NEEDS_REVIEW | 0.4 – 0.59 | Manual review required |
| REJECTED | < 0.4 | Do not store |

## CLI Commands

```bash
# Full ingestion from all sources
pnpm run ingest:social

# Preview mode (no database writes)
pnpm run ingest:social:dry

# Wikidata only
pnpm run ingest:social:wikidata

# TMDB only
pnpm run ingest:social:tmdb

# Update existing handles if confidence improves
pnpm run ingest:social:update

# Single celebrity
pnpm run ingest:social --celebrity="Rashmika Mandanna"

# With custom confidence threshold
pnpm run ingest:social --confidence=0.8 --limit=50
```

## API Endpoints

### GET `/api/celebrity/[id]/social`

Returns social profiles for a celebrity.

Query params:
- `platform` - Filter by platform
- `verified` - Only verified (true/false)
- `include_embed` - Include embed HTML

Response:
```json
{
  "success": true,
  "celebrity": { "id": "...", "name_en": "..." },
  "profiles": [
    {
      "platform": "instagram",
      "handle": "rashmika_mandanna",
      "profile_url": "https://instagram.com/rashmika_mandanna/",
      "confidence": 95,
      "verified": true
    }
  ],
  "by_platform": { "instagram": [...] },
  "links_grid_html": "..."
}
```

### POST `/api/celebrity/[id]/social`

Add a new profile (admin).

### PATCH `/api/celebrity/[id]/social`

Update profile (verify, toggle active, set primary).

### DELETE `/api/celebrity/[id]/social`

Delete profile (optionally block).

## Admin UI

The `SocialProfilesTab` component provides:

- View all profiles by platform
- Confidence badges
- Verified status toggle
- Set primary account
- Embed preview
- Add manual profiles
- Delete/block profiles

## Safety & Compliance

### Blocked Patterns

The system auto-rejects handles matching:

- `*_fans`, `*_fc`, `*fanclub` - Fan pages
- `unofficial*`, `fake*`, `parody*` - Fake accounts
- `*_updates`, `*_daily` - Aggregator accounts

### Safety Checks

| Check | Severity | Action |
|-------|----------|--------|
| Political content | Medium | Flag for review |
| Adult indicators | High/Low | Block or flag |
| Fake/unofficial | High | Block |
| Violence indicators | Critical | Block |
| Copyright risk | High | Flag |
| TOS violation | Medium | Flag |

### AdSense Compliance

Profiles are scored for sensuality (0-100):
- < 50: Safe for ads
- 50-70: Review recommended
- > 70: Caution required

## Integration with Hot Media

The social profiles feed into:

1. **Hot Media Generator** - Uses verified handles for content discovery
2. **Glamour Content AI** - Fetches recent posts via oEmbed
3. **Browser Personalization** - Tracks viewed celebrities
4. **Trend Intelligence** - Correlates social activity with trends

## Wikidata SPARQL Query

```sparql
SELECT DISTINCT
  ?person
  ?personLabel
  ?instagram
  ?twitter
  ?youtube
  ?facebook
  ?imdb
  ?website
WHERE {
  # Find Telugu cinema actors/actresses
  ?person wdt:P106 ?occupation.
  VALUES ?occupation { wd:Q33999 wd:Q10800557 wd:Q2526255 wd:Q28389 }
  
  # Telugu region connection
  {
    ?person wdt:P27 wd:Q668.
    ?person wdt:P19 ?birthPlace.
    ?birthPlace wdt:P131* ?region.
    VALUES ?region { wd:Q1159 wd:Q677037 }
  } UNION {
    ?person wdt:P937 wd:Q1352.
  }
  
  # Fetch social handles
  OPTIONAL { ?person wdt:P2003 ?instagram. }
  OPTIONAL { ?person wdt:P2002 ?twitter. }
  OPTIONAL { ?person wdt:P2397 ?youtube. }
  OPTIONAL { ?person wdt:P2013 ?facebook. }
  OPTIONAL { ?person wdt:P345 ?imdb. }
  OPTIONAL { ?person wdt:P856 ?website. }
  
  FILTER(BOUND(?instagram) || BOUND(?twitter) || BOUND(?youtube))
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 500
```

## Performance Considerations

- **Batch Processing** - Fetch multiple celebrities in batches
- **Rate Limiting** - Respects API rate limits (Wikidata: 30/min, TMDB: 40/10s)
- **Caching** - SPARQL results cached
- **No Background Polling** - CLI/cron triggered only

## Testing

```bash
# Test the CLI in dry run mode
pnpm run ingest:social:dry --limit=5

# Test single celebrity
pnpm run ingest:social --dry --celebrity="Samantha Ruth Prabhu"

# Verify API endpoint
curl "http://localhost:3000/api/celebrity/CELEBRITY_ID/social"
```

## Files

| File | Purpose |
|------|---------|
| `lib/social/source-adapters.ts` | Wikidata, Wikipedia, TMDB adapters |
| `lib/social/confidence-engine.ts` | Confidence scoring & validation |
| `lib/social/oembed.ts` | oEmbed embed generation |
| `lib/social/safety-validators.ts` | Safety & compliance checks |
| `lib/social/index.ts` | Module exports |
| `scripts/ingest-social.ts` | CLI ingestion tool |
| `app/api/celebrity/[id]/social/route.ts` | API endpoint |
| `components/admin/SocialProfilesTab.tsx` | Admin UI component |
| `supabase-social-profiles-schema.sql` | Database schema |






