# Recommend Me Feature

Personalized movie recommendation system that lets users optionally choose preferences and get curated movie suggestions.

## Overview

The "Recommend Me" feature provides a full-screen modal interface where users can:
- Select preferred languages (Telugu, Hindi, Tamil, etc.)
- Choose genres (Action, Drama, Romance, etc.)
- Pick moods (Feel-good, Intense, Emotional, etc.)
- Select eras (90s, 2000s, 2010s, Recent, Classics)
- Enable special filters (Family-friendly, Blockbusters, Hidden gems)

All preferences are **optional**. With zero input, the system recommends movies from the full catalogue based on ratings and popularity.

## Entry Points

### 1. Reviews Landing Page (`/reviews`)
- CTA button in the sticky filter bar
- Pre-fills with currently selected language

### 2. Movie Review Page (`/reviews/[slug]`)
- CTA button near "Similar Movies" section  
- Pre-fills preferences based on current movie:
  - Language from movie
  - First 2 genres from movie
  - Era based on release year

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Entry Points                             │
│  /reviews (page.tsx)          /reviews/[slug] (page.tsx)        │
│       ↓                              ↓                           │
│  RecommendMeModal           RecommendMeButton (client wrapper)   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer                                     │
│  POST /api/recommendations                                       │
│  Accepts: { languages, genres, moods, era, toggles }            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Orchestration Layer                              │
│  lib/movies/recommend-me.ts                                     │
│  - Builds Supabase queries based on preferences                 │
│  - Runs queries in parallel                                     │
│  - Deduplicates results                                         │
│  - Returns SimilarSection[] (same format as similarity-engine)  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    UI Components                                 │
│  SimilarMoviesCarousel (reused from Similar Movies feature)     │
│  - 2-column grid layout                                         │
│  - Section-specific styling                                     │
│  - Hover effects and scroll navigation                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User opens modal** → Scroll position saved, body scroll locked
2. **User selects preferences** → Local component state updated
3. **User clicks "Get Recommendations"** → POST to `/api/recommendations`
4. **API calls orchestration layer** → Parallel Supabase queries
5. **Results returned as sections** → Displayed using `SimilarMoviesCarousel`
6. **User clicks movie** → Navigates to movie review page
7. **User closes modal** → Scroll position restored

## File Structure

```
lib/movies/recommend-me.ts          # Orchestration layer
app/api/recommendations/route.ts    # API endpoint (POST & GET)
components/recommendations/
  ├── RecommendMeModal.tsx          # Full modal with preferences UI
  └── RecommendMeButton.tsx         # Client wrapper for server components
```

## Preferences Schema

```typescript
interface RecommendMePreferences {
  languages?: string[];           // Telugu, Hindi, Tamil, etc.
  genres?: string[];              // Action, Drama, etc.
  moods?: MoodPreference[];       // feel-good, intense, etc.
  era?: EraPreference[];          // 90s, 2000s, 2010s, recent, classics
  familyFriendly?: boolean;
  blockbustersOnly?: boolean;
  hiddenGems?: boolean;
  highlyRatedOnly?: boolean;
  criticsChoice?: boolean;
  excludeMovieId?: string;        // Exclude current movie from results
}
```

## Section Types Generated

The system generates up to 8 sections with 6-8 movies each:

| Section | Condition | Priority |
|---------|-----------|----------|
| Perfect For You | Always (combined best results) | 100 |
| [Genre] Movies | For each selected genre | 90-85 |
| [Mood] Vibes | For each selected mood | 80-75 |
| [Era] Hits | For each selected era | 70-65 |
| Blockbuster Hits | If blockbusters toggle on | 60 |
| Hidden Gems | If hidden gems toggle on | 55 |
| Timeless Classics | If classics era selected or no era | 50 |
| Critics' Favorites | Always (fallback) | 45 |
| Recent Releases | Always (fallback) | 40 |

## Mood to Genre Mapping

Moods are translated to genre filters:

| Mood | Genres |
|------|--------|
| feel-good | Comedy, Family, Romance |
| intense | Action, Thriller, Crime |
| emotional | Drama, Romance, Family |
| inspirational | Drama, Biography, Sports |
| light-hearted | Comedy, Romance, Family |
| dark | Thriller, Crime, Horror |
| mass | Action, Drama |
| thought-provoking | Drama, Mystery, Crime |

## UX Considerations

### Scroll Preservation
- Scroll position saved before modal opens
- Body scroll locked while modal is open
- Scroll position restored after modal closes

### Keyboard Navigation
- ESC key closes modal
- Focus trapped within modal

### Mobile Responsiveness
- Full-screen modal on mobile
- Chips wrap naturally
- Carousel scrolls horizontally

### Zero-Input Fallback
If user selects nothing:
- Defaults to Telugu language
- Returns top-rated movies across categories
- Always returns at least 3 sections

## Extending the Feature

### Adding New Moods
1. Add to `MoodPreference` type in `lib/movies/recommend-me.ts`
2. Add mood-to-genre mapping in `getMoodGenres()`
3. Add to `MOODS` array in `RecommendMeModal.tsx`

### Adding New Eras
1. Add to `EraPreference` type
2. Update `getYearRangeForEra()` function
3. Add to `ERAS` array in modal

### Adding New Languages
Add to `LANGUAGES` array in `RecommendMeModal.tsx`

## Performance

- All category queries run in parallel
- Results deduplicated using Set
- Maximum 8 sections returned
- Movie cards use Next.js Image optimization
- Modal loads lazily (not rendered until opened)

## Reused Components

- `SimilarMoviesCarousel` from similarity engine
- `SimilarSection` type from similarity engine
- Section styling configuration
- Modal pattern from DedicationsWidget

