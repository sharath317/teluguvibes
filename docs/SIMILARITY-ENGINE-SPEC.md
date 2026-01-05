# Smart Similar Movies Engine - Formal Specification

## Version: 2.0 (Hardened)
## Last Updated: January 2026

---

## 1. System Overview

The Smart Similar Movies Engine provides intelligent movie recommendations based on multi-dimensional similarity scoring. The system is designed to:

- Generate 6-8 meaningful sections per movie
- Provide 30-40+ similar movie recommendations
- Never return empty sections
- Be deterministic and explainable

---

## 2. Scoring Model (LOCKED)

### 2.1 Relevance Score Formula

```
relevanceScore =
  (directorMatch × 0.25) +
  (heroMatch × 0.20) +
  (genreOverlap × 0.20) +
  (eraProximity × 0.10) +
  (tagMatch × 0.15) +
  (ratingTierMatch × 0.10)
```

**Total Weight: 1.00**

### 2.2 Dimension Weights (DO NOT CHANGE)

| Dimension      | Weight | Rationale                        |
|----------------|--------|----------------------------------|
| Director       | 0.25   | Auteur continuity                |
| Lead Actor     | 0.20   | Star-driven discovery            |
| Genre Overlap  | 0.20   | Taste similarity                 |
| Era Proximity  | 0.10   | Nostalgia/temporal relevance     |
| Tag Match      | 0.15   | Cultural classification          |
| Rating Tier    | 0.10   | Quality floor guarantee          |

---

## 3. Matching Dimensions

### 3.1 Director Match
- **Source Field**: `director`
- **Logic**: Exact string match (case-insensitive)
- **Score**: Binary (1.0 if match, 0.0 if not)

### 3.2 Lead Actor Match
- **Source Field**: `hero`
- **Logic**: Exact string match (case-insensitive)
- **Score**: Binary (1.0 if match, 0.0 if not)

### 3.3 Genre Overlap
- **Source Field**: `genres[]`
- **Logic**: Set intersection / source genre count
- **Score**: Continuous (0.0 to 1.0)
- **Formula**: `matchCount / sourceGenres.length`

### 3.4 Era Proximity
- **Source Field**: `release_year`
- **Logic**: Year difference scoring
- **Score Tiers**:
  - ≤2 years: 1.0
  - ≤5 years: 0.8
  - ≤10 years: 0.5
  - ≤20 years: 0.3
  - >20 years: 0.1

### 3.5 Tag Match
- **Source Fields**: `is_blockbuster`, `is_classic`, `is_underrated`
- **Logic**: Matching boolean tags
- **Score**: `matchingTags / totalTags`

### 3.6 Rating Tier Match
- **Source Fields**: `our_rating`, `avg_rating`
- **Logic**: Rating difference scoring
- **Score Tiers**:
  - ≤0.5 diff: 1.0
  - ≤1.0 diff: 0.8
  - ≤1.5 diff: 0.5
  - ≤2.0 diff: 0.3
  - >2.0 diff: 0.1

---

## 4. Section Priority Rules

### 4.1 Priority Hierarchy (Highest to Lowest)

| Priority | Section ID         | Title Pattern                    | Match Type     |
|----------|-------------------|----------------------------------|----------------|
| 100      | best-matches      | "You May Also Like"              | best           |
| 95       | director          | "More from {Director}"           | director       |
| 90       | hero              | "More with {Hero}"               | hero           |
| 85       | heroine           | "Films with {Heroine}"           | heroine        |
| 80       | genre-primary     | "{Genre} Movies"                 | genre          |
| 75       | era               | "{Decade}s Telugu Hits"          | era            |
| 70       | music             | "Music by {Music Director}"      | music          |
| 65       | genre-secondary   | "{Genre} Movies"                 | genre          |
| 60       | classics          | "Telugu Classics"                | classics       |
| 55       | blockbusters      | "Blockbuster Hits"               | blockbusters   |
| 50       | hidden-gems       | "Hidden Gems"                    | tags           |
| 45       | highly-rated      | "Top Rated Telugu"               | rating         |
| 40       | recent-hits       | "Recent Hits"                    | recent         |

### 4.2 Section Requirements

- **Minimum movies per section**: 3
- **Maximum movies per section**: 8
- **Maximum sections returned**: 8
- **Fallback guarantee**: Always include at least 3 sections

### 4.3 Deduplication Rules

1. Movies appearing in "Best Matches" are excluded from subsequent sections
2. Each movie can only appear in ONE section
3. Sections are populated in priority order
4. Lower-priority sections receive remaining unique movies

---

## 5. Fallback Sections (Guaranteed)

When primary sections (director, hero, genre, era) have insufficient data, the system falls back to:

| Fallback Section | Query Criteria                  | Guaranteed Data |
|------------------|--------------------------------|-----------------|
| Telugu Classics  | `is_classic = true`            | Yes             |
| Blockbusters     | `is_blockbuster = true`        | Yes             |
| Hidden Gems      | `is_underrated = true`         | Yes             |
| Top Rated        | `avg_rating >= 7.0`            | Yes             |
| Recent Hits      | `release_year >= current-5`    | Yes             |

---

## 6. Query Execution

### 6.1 Parallel Query Strategy

All category queries execute in parallel using `Promise.all()`:

```typescript
const results = await Promise.all([
  findByDirector(source),
  findByHero(source),
  findByHeroine(source),
  findByMusicDirector(source),
  findByGenre(source, primaryGenre),
  findByGenre(source, secondaryGenre),
  findByEra(source),
  findClassics(source),
  findBlockbusters(source),
  findHiddenGems(source),
  findHighlyRated(source),
  findRecentHits(source),
]);
```

### 6.2 Base Query Filters

All queries include:
- `is_published = true`
- `id != source.id`
- `poster_url IS NOT NULL`
- `ORDER BY avg_rating DESC`
- `LIMIT 8`

---

## 7. Best Matches Calculation

The "Best Matches" section is computed by:

1. Collecting all movies from:
   - Director matches
   - Hero matches
   - Heroine matches
   - Primary genre matches
   - Era matches
   - Highly rated movies

2. Deduplicating by movie ID

3. Calculating relevance score for each unique movie

4. Sorting by relevance score (descending)

5. Taking top 8 movies

---

## 8. UI Contract

### 8.1 Section Interface

```typescript
interface SimilarSection {
  id: string;
  title: string;
  subtitle?: string;
  movies: SimilarMovie[];
  matchType: 'best' | 'director' | 'hero' | 'heroine' | 'genre' | 
             'era' | 'tags' | 'rating' | 'classics' | 'blockbusters' | 
             'recent' | 'music';
  priority: number;
}
```

### 8.2 Layout Specification

- **Grid**: 2-column on desktop (`md:grid-cols-2`)
- **Mobile**: Single column
- **Section Width**: All sections 50%
- **Card Width**: Compact (`w-24 md:w-28`)
- **Scroll**: Horizontal within sections

---

## 9. Performance Considerations

- **Parallel Queries**: 12 queries execute simultaneously
- **Query Limit**: 8 movies per query = 96 max candidates
- **Deduplication**: In-memory using `Set<string>`
- **Scoring**: O(n) where n = unique candidates

---

## 10. Backward Compatibility

### 10.1 Preserved Behavior
- Existing `SimilarMovie` interface unchanged
- `SimilarSection` interface extended (additive only)
- Legacy `matchType` values still supported
- Priority-based ordering preserved

### 10.2 Non-Breaking Extensions
- New `matchType` values: `heroine`, `classics`, `blockbusters`, `recent`, `music`
- New section categories (fallbacks)
- Increased `MAX_SECTIONS` from 3 to 8

---

## 11. Monitoring & Validation

### 11.1 Success Criteria

| Metric                       | Target     |
|------------------------------|------------|
| Sections returned            | 5-8        |
| Total similar movies         | 30-40+     |
| Empty sections               | 0          |
| Average relevance score      | > 0.3      |

### 11.2 Error Conditions

- Source movie not found → Return empty array
- All queries fail → Return fallback sections only
- No movies match any criteria → Return Top Rated + Classics

---

## 12. Change Log

| Version | Date       | Changes                                           |
|---------|------------|---------------------------------------------------|
| 1.0     | Dec 2025   | Initial implementation (3 sections max)           |
| 2.0     | Jan 2026   | Expanded to 8 sections, added fallbacks, formalized |

---

## 13. Code Location

- **Engine**: `lib/movies/similarity-engine.ts`
- **UI Component**: `components/reviews/SimilarMoviesCarousel.tsx`
- **Integration**: `app/reviews/[slug]/page.tsx`

---

*This specification is locked. Any changes require versioning and backward compatibility analysis.*


