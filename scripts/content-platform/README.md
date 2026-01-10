# Content Platform Usage Guide

This guide explains how to use the content platform system to fetch, classify, and publish content across all sectors.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                            │
│  TMDB | Wikipedia | Reddit | News | Court Docs | Archives   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  SAFE FETCHER LAYER                         │
│  Rate limiting | ToS compliance | Source validation         │
│  lib/compliance/safe-fetcher.ts                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                CONTENT ENHANCER                             │
│  Fact extraction | Sector detection | Sensitivity tagging   │
│  lib/content/content-enhancer.ts                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTS TABLE                               │
│  content_sector | content_type | verification_status        │
│  fact_confidence_score | source_refs | fictional_label      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                BATCH PUBLISHER                              │
│  Validation rules | Scheduling | Publishing                 │
│  lib/publishing/batch-publisher.ts                          │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Fetch Content for a Sector

```bash
# Fetch movie content
npx tsx scripts/content-platform/fetch-sector-content.ts --sector=movies_cinema --limit=20

# Fetch all sectors
npx tsx scripts/content-platform/fetch-sector-content.ts --all

# Fetch food recipes
npx tsx scripts/content-platform/fetch-sector-content.ts --sector=food_bachelor --limit=10
```

### 2. View Content in Admin

1. Go to `/admin/content-sectors` to browse content by sector
2. Click on a sector to see all content items
3. Click on an item to edit and enhance it

### 3. Publish Content

1. Go to `/admin/batch-publish`
2. Create a new batch
3. Add content items to the batch
4. Validate (checks all rules)
5. Schedule or publish immediately

---

## Content Sectors

| Sector | Description | Required Labels |
|--------|-------------|-----------------|
| `movies_cinema` | Movie reviews, classics, scenes | None |
| `auto_trends` | Daily buzz, trending topics | None |
| `actor_industry` | Celebrity stories, interviews | None |
| `crime_courts` | Legal cases, court documents | Legal disclaimer |
| `archives_buried` | Historical investigations | Sensitive disclaimer |
| `what_if_fiction` | Speculative content | Fictional label |
| `kids_family` | Children's stories, games | Family-safe only |
| `pregnancy_wellness` | Health content | Medical disclaimer |
| `food_bachelor` | Recipes, cooking tips | None |

---

## API Usage

### Enhance Content Programmatically

```typescript
import { enhanceContent } from '@/lib/content/content-enhancer';

const enhanced = await enhanceContent({
  title: 'My Article Title',
  body: 'Article content here...',
  sources: [
    { id: '1', sourceName: 'Wikipedia', trustLevel: 0.85, ... }
  ],
});

console.log(enhanced.suggestedSector);      // 'movies_cinema'
console.log(enhanced.factConfidenceScore);  // 75
console.log(enhanced.requiresDisclaimer);   // false
```

### Validate Before Publishing

```typescript
import { validatePost, isReadyToPublish } from '@/lib/publishing/batch-publisher';

const post = await getPostById(id);
const { ready, blockers } = isReadyToPublish(post);

if (!ready) {
  console.log('Cannot publish:', blockers);
}
```

### Create and Publish Batch

```typescript
import { createBatchPublisher } from '@/lib/publishing/batch-publisher';

const publisher = createBatchPublisher();

// Create batch
const batch = await publisher.createBatch('Weekly Release', 'Movies batch');

// Add content
await publisher.addToBatch(batch.id, [postId1, postId2, postId3]);

// Validate
const { isValid, errors } = await publisher.validateBatch(batch.id);

// Publish
if (isValid) {
  const result = await publisher.publishBatch(batch.id);
  console.log(`Published ${result.publishedCount} items`);
}
```

---

## Database Queries

### Get Content by Sector

```sql
SELECT * FROM posts 
WHERE content_sector = 'movies_cinema'
AND status = 'published'
ORDER BY created_at DESC;
```

### Get Content Needing Review

```sql
SELECT * FROM posts 
WHERE verification_status = 'pending'
AND fact_confidence_score < 50
ORDER BY created_at ASC;
```

### Get Kids-Safe Content

```sql
SELECT * FROM posts 
WHERE content_sector = 'kids_family'
AND sensitivity_level IN ('none', 'mild')
AND audience_profile = 'kids'
AND status = 'published';
```

### Get Content with Disclaimers

```sql
SELECT p.*, d.display_text as disclaimer_text
FROM posts p
JOIN content_disclaimers d ON p.disclaimer_type = d.disclaimer_type
WHERE p.requires_disclaimer = true
AND p.status = 'published';
```

---

## Sector-Specific Scripts

### Movies & Cinema

```bash
# Generate reviews for movies without reviews
npx tsx scripts/content-platform/sectors/movies-generate-reviews.ts

# Find forgotten classics
npx tsx scripts/content-platform/sectors/movies-find-classics.ts --year-before=1990
```

### Kids & Family

```bash
# Import moral stories
npx tsx scripts/content-platform/sectors/kids-import-stories.ts --source=panchatantra

# Classify by age group
npx tsx scripts/content-platform/sectors/kids-classify-age.ts
```

### Crime & Courts

```bash
# Import court cases (public records only)
npx tsx scripts/content-platform/sectors/crime-import-cases.ts --year=2023

# Generate case timelines
npx tsx scripts/content-platform/sectors/crime-generate-timelines.ts
```

---

## Validation Rules

The batch publisher enforces these rules:

1. **minConfidenceScore: 50** - Fact confidence must be at least 50%
2. **requireVerifiedStatus: true** - Content must be verified
3. **requireSourceCount: 1** - At least 1 source for factual content
4. **fictionRequiresLabel: true** - What-if content needs fictional label
5. **wellnessRequiresDisclaimer: true** - Health content needs medical disclaimer
6. **kidsRequiresFamilySafe: true** - Kids content must pass safety checks
7. **lockedContentReadOnly: true** - Locked content cannot be edited

---

## Troubleshooting

### Content Not Classifying Correctly

- Add more keywords to the content body
- Manually set the sector in admin
- Check the `SECTOR_KEYWORDS` in content-enhancer.ts

### Low Confidence Scores

- Add more source references
- Get sources with higher trust levels
- Mark facts as verified in admin

### Disclaimer Not Showing

- Ensure `requires_disclaimer` is true
- Set the correct `disclaimer_type`
- Check `content_disclaimers` table for the type

---

## Next Steps

1. **Implement more fetchers** - Add Reddit, news portal integrations
2. **Add AI enhancement** - Use LLM to improve content quality
3. **Set up cron jobs** - Automate daily content fetching
4. **Add analytics** - Track sector performance


