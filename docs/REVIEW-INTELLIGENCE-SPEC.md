# Review Intelligence System - Formal Specification

## Version: 2.0 (Hardened)
## Last Updated: January 2026

---

## 1. System Overview

The Review Intelligence System provides structured, confidence-scored movie reviews with multi-dimensional analysis. The system is designed to:

- Generate insightful, non-hallucinated reviews
- Provide structured dimensional scores
- Support tag derivation for categorization
- Enable confidence-based content gating

---

## 2. Review Architecture

### 2.1 Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Review Intelligence                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Template       │  Editorial      │  Review Insights        │
│  Reviews        │  Reviews        │  (Enrichment Layer)     │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Metadata-based  │ AI-Generated    │ Performance Analysis    │
│ Quick fallback  │ Full content    │ Direction Assessment    │
│ No AI required  │ Batched calls   │ Technical Aspects       │
│                 │ 3-batch pattern │ Theme & Impact          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 2.2 Generation Pipeline

```
Movie → Multi-Source Data → Editorial Generator → Enrichment → Storage
              ↓                      ↓
        Parallel Fetches       3 AI Batches (reduced):
        ├── Wikipedia          ├── Batch 1: Synopsis* + Cultural Impact*
        ├── OMDb               ├── Batch 2: Story + Performances + Direction
        ├── Wikidata           └── Batch 3: Perspectives + Watch/Skip + Awards*
        ├── Google KG          
        └── TMDB               * Skipped if factual data available
```

### 2.3 Multi-Source Data Integration (Cost Reduction)

The system integrates multiple external data sources to reduce AI API costs by ~60% when movies have good Wikipedia/OMDb coverage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi-Source Orchestrator                         │
│                 lib/reviews/multi-source-data.ts                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │Wikipedia │  │  OMDb    │  │ Wikidata │  │Google KG │  │ TMDB  │ │
│  │ REST API │  │   API    │  │  SPARQL  │  │   API    │  │(exist)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬───┘ │
│       │             │             │             │            │      │
│       ▼             ▼             ▼             ▼            ▼      │
│  Plot,Reception  Ratings     Awards        Entity Desc   Metadata  │
│  Legacy,Awards   IMDB,RT     Filmfare      Context       Cast,Crew │
│                  Metacritic  Nandi,National                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         30-Day Cache                                 │
│              (Factual data rarely changes)                          │
└─────────────────────────────────────────────────────────────────────┘
```

#### Data Source Priority

| Section | Primary Source | Fallback | AI Role |
|---------|---------------|----------|---------|
| Synopsis | Wikipedia Plot | TMDB/OMDb | Translation only |
| Awards | Wikidata SPARQL | OMDb text | None (factual) |
| Critics POV | OMDb + Wikipedia Reception | TMDB | Synthesis |
| Cultural Impact | Wikipedia Legacy | Google KG | Expansion |
| Ratings | OMDb aggregated | TMDB | None |

#### API Keys Required

| Service | Env Variable | Free Tier |
|---------|--------------|-----------|
| OMDb | `OMDB_API_KEY` | 1,000 req/day |
| Google KG | `GOOGLE_KG_API_KEY` | 100,000 req/day |
| Wikipedia | None | Unlimited |
| Wikidata | None | Unlimited |

#### Files

| File | Purpose |
|------|---------|
| `lib/sources/fetchers/omdb-fetcher.ts` | IMDB, RT, Metacritic ratings |
| `lib/sources/fetchers/google-kg-fetcher.ts` | Entity descriptions |
| `lib/sources/fetchers/wikidata-awards-fetcher.ts` | Telugu film awards |
| `lib/sources/fetchers/wikipedia-fetcher.ts` | Plot, Reception, Legacy sections |
| `lib/reviews/multi-source-data.ts` | Orchestration + caching |

---

## 3. Review Dimensions

### 3.1 Story & Screenplay Dimension

| Field             | Type     | Range   | Description                   |
|-------------------|----------|---------|-------------------------------|
| score             | number   | 0-10    | Overall story quality         |
| highlights        | string[] | -       | Key narrative strengths       |
| weaknesses        | string[] | -       | Areas of improvement          |
| originality       | number   | 0-10    | How fresh is the concept      |
| emotional_depth   | number   | 0-10    | Character emotional resonance |
| pacing            | number   | 0-10    | Narrative flow control        |

### 3.2 Direction Dimension

| Field          | Type   | Options                                        |
|----------------|--------|------------------------------------------------|
| score          | number | 0-10                                           |
| style          | enum   | mass-commercial, class-artistic, balanced, experimental |
| innovation     | number | 0-10                                           |
| vision_clarity | number | 0-10                                           |
| execution      | number | 0-10                                           |

### 3.3 Performance Dimension

| Field             | Type     | Description                      |
|-------------------|----------|----------------------------------|
| name              | string   | Actor name                       |
| score             | number   | 0-10 performance rating          |
| transformation    | number   | Physical/emotional range (0-10)  |
| career_best       | boolean  | Best performance indicator       |
| chemistry         | number   | Co-star chemistry (0-10)         |

### 3.4 Music & BGM Dimension

| Field        | Type   | Description                          |
|--------------|--------|--------------------------------------|
| songs        | number | Song quality (0-10)                  |
| bgm          | number | Background score (0-10)              |
| replay_value | number | Chartbuster potential (0-10)         |
| integration  | number | Narrative fit (0-10)                 |

### 3.5 Emotional Impact Dimension

| Field       | Type   | Description                    |
|-------------|--------|--------------------------------|
| tears       | number | Emotional intensity (0-10)     |
| laughter    | number | Comedy quotient (0-10)         |
| thrill      | number | Edge-of-seat moments (0-10)    |
| inspiration | number | Motivational impact (0-10)     |
| nostalgia   | number | Nostalgic resonance (0-10)     |

### 3.6 Mass vs Class Dimension

| Field            | Type   | Description                      |
|------------------|--------|----------------------------------|
| mass             | number | Mass appeal (0-10)               |
| class            | number | Artistic appeal (0-10)           |
| universal_appeal | number | Cross-demographic (0-10)         |
| family_friendly  | number | Family suitability (0-10)        |

---

## 4. Tag Derivation System

### 4.1 Blockbuster Tags

| Tag              | Derivation Criteria                           |
|------------------|-----------------------------------------------|
| Blockbuster      | `worldwide_gross > 100cr` OR `is_blockbuster` |
| Hit              | `avg_rating >= 7.0` AND box office positive   |
| Super Hit        | `avg_rating >= 7.5` AND `mass_appeal >= 8`    |
| Industry Hit     | Top 10 grosser of year                        |

### 4.2 Quality Tags

| Tag              | Derivation Criteria                           |
|------------------|-----------------------------------------------|
| Classic          | `release_year < 2000` AND `avg_rating >= 7.5` |
| Cult Classic     | Strong fan following, repeat viewings         |
| Hidden Gem       | `avg_rating >= 7` AND low awareness           |
| Critic Favorite  | `critic_score >= 8` OR award-winning          |

### 4.3 Content Tags

| Tag              | Derivation Criteria                           |
|------------------|-----------------------------------------------|
| Family Friendly  | `family_friendly >= 7` AND no violence        |
| Romantic         | Primary genre = Romance                       |
| Action Packed    | `thrill >= 7` OR primary genre = Action       |
| Emotional        | `tears >= 7` OR `emotional_depth >= 7`        |

### 4.4 Warning Tags

| Tag              | Derivation Criteria                           |
|------------------|-----------------------------------------------|
| Dark Theme       | Violence, death, trauma themes                |
| Not For Kids     | Adult content, language                       |
| Slow Burn        | `pacing <= 5` OR runtime > 160min             |

---

## 5. Confidence Scoring

### 5.1 Section Confidence

Each review section has a confidence score (0-1):

```typescript
section_confidence: {
  performances: number;  // Based on cast data availability
  direction: number;     // Based on director filmography
  technical: number;     // Based on credits data
  themes: number;        // Based on synopsis analysis
  scenes: number;        // Based on scene descriptions
  audience: number;      // Based on rating distribution
  comparables: number;   // Based on similar movie matches
}
```

### 5.2 Confidence Calculation

```
confidence = 
  (dataCompleteness × 0.4) +
  (sourceReliability × 0.3) +
  (reviewCount × 0.2) +
  (recency × 0.1)
```

### 5.3 Confidence Thresholds

| Threshold | Action                          |
|-----------|--------------------------------|
| < 0.3     | Hide section                   |
| 0.3-0.5   | Show with "Limited data" badge |
| 0.5-0.7   | Show normally                  |
| > 0.7     | Show with confidence badge     |

---

## 6. Composite Scoring

### 6.1 Composite Score Formula

```
compositeScore =
  (avgRating × 0.35) +
  (dimensionScore × 0.25) +
  (engagementScore × 0.20) +
  (boxOfficeScore × 0.10) +
  (recencyScore × 0.10)
```

### 6.2 Score Components

| Component       | Source                    | Range |
|-----------------|---------------------------|-------|
| avgRating       | External + internal       | 0-10  |
| dimensionScore  | Review dimensions average | 0-10  |
| engagementScore | Content performance       | 0-10  |
| boxOfficeScore  | Normalized gross          | 0-10  |
| recencyScore    | Days since release        | 0-10  |

---

## 7. Editorial Review Structure

### 7.1 Editorial Review V2 Schema

```typescript
interface EditorialReview {
  _type: 'editorial_review_v2';
  
  synopsis: {
    content_en: string;
    content_te: string;
    spoiler_level: 'none' | 'light' | 'moderate';
  };
  
  story_screenplay: {
    analysis: string;
    score: number;
    originality_score: number;
    highlights: string[];
  };
  
  performances: {
    lead_actors: PerformanceDetail[];
    supporting: PerformanceDetail[];
    ensemble_score: number;
  };
  
  direction_technicals: {
    direction_score: number;
    cinematography_notes: string;
    music_notes: string;
    editing_notes: string;
  };
  
  perspectives: {
    critics_pov: string;
    audience_pov: string;
  };
  
  cultural_impact: {
    legacy_status: string;
    cult_status: boolean;
    memorable_elements: string[];
  };
  
  awards: {
    national: string[];
    state: string[];
    filmfare: string[];
    other: string[];
  };
  
  why_watch: string[];
  why_skip: string[];
  
  verdict: {
    summary: string;
    rating: number;
    watch_recommendation: 'must-watch' | 'recommended' | 'optional' | 'skip';
  };
}
```

---

## 8. Review Insights Layer

### 8.1 Purpose

Review Insights is an ADDITIVE layer that extends existing reviews without replacing them.

### 8.2 Insight Types

| Insight Type     | Description                          |
|------------------|--------------------------------------|
| Performance      | Actor-specific analysis              |
| Direction        | Director style and execution         |
| Technical        | Music, cinematography, editing       |
| Themes           | Core themes and cultural relevance   |
| Standout Scenes  | Notable scenes (spoiler-free)        |
| Audience Fit     | Who should watch                     |
| Comparables      | Similar movies with reasons          |

### 8.3 Validation Rules

| Rule                      | Threshold           |
|---------------------------|---------------------|
| Density Score             | ≥ 50 (0-100)        |
| Length Increase           | ≤ 30%               |
| Repetition Penalty        | ≤ 20% duplicate phrases |
| Confidence per section    | ≥ 0.3 to display    |

---

## 9. Audience Signals

### 9.1 Signal Types

```typescript
interface AudienceSignals {
  mood: MoodTag[];              // thrilling, emotional, uplifting, etc.
  family_friendly: boolean;
  age_rating: 'U' | 'U/A' | 'A' | 'S';
  rewatch_potential: 'low' | 'medium' | 'high' | 'cult-classic';
  mass_appeal: number;          // 0-10
  critic_appeal: number;        // 0-10
  kids_friendly: boolean;
  date_movie: boolean;
  festival_worthy: boolean;
}
```

### 9.2 Mood Tags

- thrilling
- emotional
- uplifting
- dark
- nostalgic
- romantic
- intense
- light-hearted
- thought-provoking
- action-packed

---

## 10. Integration Points

### 10.1 Database Tables

| Table           | Purpose                        |
|-----------------|--------------------------------|
| movies          | Core movie data                |
| movie_reviews   | Review content + dimensions    |
| review_insights | Extended analysis layer        |

### 10.2 Key Fields

```sql
-- movie_reviews table
dimensions_json    JSONB   -- ReviewDimensions
audience_signals   JSONB   -- AudienceSignals
confidence_score   FLOAT   -- 0-1
composite_score    FLOAT   -- 0-10
insights           JSONB   -- ReviewInsights
```

---

## 11. Non-Hallucination Rules

### 11.1 Prohibited Content

- Fabricated box office numbers
- Made-up award claims
- Invented quotes from cast/crew
- Fictional scene descriptions
- False historical context

### 11.2 Source Validation

All factual claims must be traceable to:
- TMDB data
- Official sources (Wikipedia, IMDb)
- Verified news articles
- Database records

---

## 12. Code Locations

| Component              | Path                                       |
|------------------------|-------------------------------------------|
| Types                  | `lib/reviews/review-dimensions.types.ts`  |
| Confidence System      | `lib/reviews/confidence-system.ts`        |
| Editorial Generator    | `lib/reviews/editorial-review-generator.ts` |
| Review Insights        | `lib/reviews/review-insights.ts`          |
| Template Reviews       | `lib/reviews/template-reviews.ts`         |
| Multi-Axis Reviews     | `lib/reviews/multi-axis-review.ts`        |

---

## 13. Change Log

| Version | Date       | Changes                                   |
|---------|------------|-------------------------------------------|
| 1.0     | Nov 2025   | Initial review system                     |
| 1.5     | Dec 2025   | Added editorial review generator          |
| 2.0     | Jan 2026   | Formalized, added confidence gating       |

---

*This specification is locked. Review generation logic must maintain backward compatibility.*


