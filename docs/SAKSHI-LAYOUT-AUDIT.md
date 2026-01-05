# Sakshi-Inspired Layout Audit & Implementation Plan

## PHASE 1: STRUCTURE AUDIT

### 1. Header / Navbar Components

#### Current State: `components/Header.tsx`
| Feature | Status | Notes |
|---------|--------|-------|
| Logo + Branding | ✅ AS-IS | `తెలుగు వార్తలు` with Newspaper icon |
| Primary Navigation | ✅ AS-IS | Featured tabs with gradients |
| Dropdown Menus | ✅ AS-IS | Categories & Explore dropdowns |
| Mobile Navigation | ✅ AS-IS | Hamburger menu with grid layout |
| Theme Toggle | ✅ AS-IS | Dark/Light mode |
| Sticky Header | ✅ AS-IS | `sticky top-0 z-50` |

**Reuse Decision:** REUSE AS-IS + EXTEND for mega-menu capability

#### Missing for Sakshi-Style:
- ❌ Secondary navigation bar (horizontal category strip)
- ❌ Breaking news ticker integration in header
- ❌ "More" overflow dropdown for excess categories
- ❌ Edition/Language selector

---

### 2. Category Navigation Logic

#### Current State:
```typescript
// NAV_ITEMS in Header.tsx
const NAV_ITEMS = {
  featured: [...],     // Hot, Reviews, Games, Challenges
  categories: [...],   // Gossip, Sports, Politics, Entertainment, Trending
  explore: [...]       // Stories, On This Day, Celebrities, Movies
};
```

#### Category Definitions in `types/database.ts`:
```typescript
export type Category = 'gossip' | 'sports' | 'politics' | 'entertainment' | 'trending';
```

**Reuse Decision:** EXTEND - Add more categories without breaking existing logic

---

### 3. Mega-Menu / Submenu Capability

| Feature | Status |
|---------|--------|
| Simple Dropdown | ✅ Exists |
| Mega-menu (multi-column) | ❌ Missing |
| Hover-activated | ❌ Missing (currently click) |

**Reuse Decision:** EXTEND existing dropdown to support mega-menu layout

---

### 4. Grid vs List Layout Components

#### Existing Layouts:

| Component | Layout Type | Usage |
|-----------|-------------|-------|
| `NewsCard` | Card (Featured + Regular) | Homepage, Category pages |
| `SmallPostCard` | Horizontal list item | Sidebar |
| Homepage grid | 2/3 + 1/3 (lg:grid-cols-3) | Main content + sidebar |
| Category page | Same as homepage | Per-category |

#### Grid Patterns Found:
```css
/* Homepage main grid */
grid lg:grid-cols-3 gap-4

/* News grid */
grid md:grid-cols-2 gap-3

/* Quick links */
grid grid-cols-2 gap-2

/* Mobile menu */
grid grid-cols-2 gap-1
```

**Reuse Decision:** REUSE AS-IS - All grid patterns are already flexible

---

### 5. Card Variants

| Variant | Component | Props | Aspect Ratio |
|---------|-----------|-------|--------------|
| **Hero/Featured** | `NewsCard` | `featured={true}` | 16:9 |
| **Regular** | `NewsCard` | default | 16:10 |
| **Small (Sidebar)** | `SmallPostCard` | `post, index, showViews` | 1:1 thumbnail |
| **Hot Media** | `GalleryCard` | `post, onClick` | 3:4 |
| **Trending Item** | Custom in Hot page | inline | Fixed 80x80 |

**Reuse Decision:** REUSE AS-IS + NEW variant for "headline strip"

---

### 6. Typography Hierarchy

#### From `globals.css`:
```css
/* Headlines */
.text-lg, .text-xl, .text-3xl, .text-4xl

/* Body */
.text-sm, .text-xs, .text-[10px]

/* Font weights */
font-medium, font-bold
```

#### Telugu Font Support:
```css
.font-telugu {
  font-family: 'Noto Sans Telugu', 'Mandali', sans-serif;
}
```

**Reuse Decision:** REUSE AS-IS - Typography scale is comprehensive

---

### 7. Color Usage

#### Design Tokens from `globals.css`:
```css
/* Brand */
--brand-primary: #FF6B00;  /* Orange */
--brand-secondary: #FF8C40;

/* Semantic */
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
--info: #3B82F6;

/* Category Colors */
--category-entertainment: #8B5CF6;
--category-movies: #EC4899;
--category-celebrity: #F59E0B;
--category-trending: #EF4444;
```

#### Gradients in Use:
```css
/* Category headers */
from-pink-500 to-pink-600     /* Gossip */
from-green-500 to-green-600   /* Sports */
from-blue-500 to-blue-600     /* Politics */
from-purple-500 to-purple-600 /* Entertainment */
from-orange-500 to-orange-600 /* Trending */
```

**Reuse Decision:** REUSE AS-IS - Existing palette is rich and consistent

---

### 8. Mobile Navigation Pattern

#### Current Implementation:
- Hamburger icon trigger
- Full-width slide-down menu
- Grid-based category display
- Grouped sections (Featured, Categories, Explore)

**Reuse Decision:** REUSE AS-IS - Mobile nav is already well-structured

---

## Component Reuse Summary

### ✅ REUSE AS-IS (No Changes)
| Component | Location | Why |
|-----------|----------|-----|
| `NewsCard` | `components/NewsCard.tsx` | Featured + Regular variants work |
| `NewsCardSkeleton` | `components/NewsCard.tsx` | Loading states covered |
| `TrendingTicker` | `components/TrendingTicker.tsx` | Breaking news strip |
| `BottomInfoBar` | `components/BottomInfoBar.tsx` | Gold/Weather info |
| `AdSlot` | `components/AdSlot.tsx` | Placeholder ready |
| `RecentPostsSidebar` | `components/RecentPostsSidebar.tsx` | Sidebar panels |

### 🔧 EXTEND (Minor Prop Additions)
| Component | Changes Needed |
|-----------|----------------|
| `Header.tsx` | Add secondary nav bar, mega-menu capability |
| `NewsCard` | Add `compact` variant for dense lists |
| `SmallPostCard` | Add `showCategory` prop |

### 🆕 NEW (Must Create)
| Component | Purpose |
|-----------|---------|
| `CategoryNavBar` | Horizontal category strip below header |
| `SectionHeader` | Reusable section title with "View All" link |
| `HeadlineStrip` | Dense list of headlines (text only) |
| `PhotoGalleryStrip` | Horizontal image carousel for entertainment |
| `OpinionCard` | Editorial/Opinion styled card |
| `VideoCard` | Video thumbnail with play button overlay |

---

## PHASE 2: SAKSHI-STYLE LAYOUT MAPPING

### Top Header Structure
```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  [🔥 Hot] [⭐ Reviews] [🎮 Games]   [☀️/🌙] [☰]    │ <- REUSE Header.tsx
├────────────────────────────────────────────────────────────┤
│ గాసిప్ │ స్పోర్ట్స్ │ రాజకీయాలు │ వినోదం │ ట్రెండింగ్ │ మరిన్ని ▼ │ <- NEW CategoryNavBar
├────────────────────────────────────────────────────────────┤
│ 🔴 LIVE │ Breaking news ticker content...                  │ <- REUSE TrendingTicker
└────────────────────────────────────────────────────────────┘
```

### Homepage Section Order (Sakshi-Inspired)
```
1. Hero Story (Featured NewsCard)           <- REUSE NewsCard featured
2. Top Stories Grid (2-3 columns)           <- REUSE NewsCard grid
3. Category Quick Tabs                      <- EXTEND CategoryPill
4. Entertainment Section (Horizontal)       <- NEW PhotoGalleryStrip
5. Politics Section (Headlines)             <- NEW HeadlineStrip
6. Sports Section (Scores + News)           <- EXTEND BottomInfoBar pattern
7. Opinion/Editorial Strip                  <- NEW OpinionCard
8. Video Section                            <- NEW VideoCard
9. Hot & Glamour Section                    <- REUSE existing Hot components
10. Bottom Info (Gold/Weather)              <- REUSE BottomInfoBar
```

### Component → Sakshi Section Mapping

| Sakshi Section | Existing Component | Changes |
|----------------|-------------------|---------|
| Lead Story | `NewsCard featured` | None |
| News Grid | `NewsCard` | None |
| Breaking Ticker | `TrendingTicker` | None |
| Recent Posts | `RecentPostsSidebar` | None |
| Popular Posts | `RecentPostsSidebar` | None |
| Hot Carousel | `AutoCarousel` from Hot page | Extract & reuse |
| Photo Gallery | `ActressRow` from Hot page | Rename to `HorizontalPhotoStrip` |
| Category Pills | `CategoryPill` in page.tsx | Extract to component |

---

## PHASE 3: MENU & CATEGORY EXTENSION

### Current Category Schema
```typescript
// types/database.ts
type Category = 'gossip' | 'sports' | 'politics' | 'entertainment' | 'trending';
```

### Extended Category Schema (Proposal)
```typescript
// types/database.ts - EXTEND
type Category = 
  | 'gossip' 
  | 'sports' 
  | 'politics' 
  | 'entertainment' 
  | 'trending'
  // New categories
  | 'movies'
  | 'business'
  | 'technology'
  | 'lifestyle'
  | 'districts'
  | 'editorial'
  | 'photos'
  | 'videos';

// New: Category groups for menu organization
const CATEGORY_GROUPS = {
  main: ['gossip', 'sports', 'politics', 'entertainment', 'trending'],
  media: ['photos', 'videos', 'movies'],
  special: ['editorial', 'lifestyle', 'technology'],
  regional: ['districts'],
};
```

### Menu Configuration (Data-Driven)
```typescript
// lib/config/navigation.ts - NEW FILE
export const NAVIGATION_CONFIG = {
  primary: [
    { id: 'gossip', label: 'గాసిప్', emoji: '💬', href: '/category/gossip' },
    { id: 'sports', label: 'స్పోర్ట్స్', emoji: '🏏', href: '/category/sports' },
    { id: 'politics', label: 'రాజకీయాలు', emoji: '🏛️', href: '/category/politics' },
    { id: 'entertainment', label: 'వినోదం', emoji: '🎬', href: '/category/entertainment' },
    { id: 'trending', label: 'ట్రెండింగ్', emoji: '📈', href: '/category/trending' },
  ],
  featured: [
    { id: 'hot', label: '🔥 హాట్', href: '/hot', gradient: 'from-orange-500 to-pink-500' },
    { id: 'reviews', label: '⭐ రివ్యూలు', href: '/reviews', gradient: 'from-yellow-500 to-amber-500' },
  ],
  more: [
    { id: 'photos', label: 'ఫోటోలు', emoji: '📸', href: '/photos' },
    { id: 'videos', label: 'వీడియోలు', emoji: '🎥', href: '/videos' },
    { id: 'editorial', label: 'సంపాదకీయం', emoji: '📝', href: '/editorial' },
  ],
};
```

---

## PHASE 4: UX PATTERN REUSE

### Existing Patterns to Preserve

#### Color Tokens
```css
/* Primary for headers */
background: var(--brand-primary);

/* Accent for highlights */
color: var(--brand-primary);

/* Neutral backgrounds */
background: var(--bg-secondary);
background: var(--bg-tertiary);
```

#### Hover/Focus Patterns
```css
/* Card hover */
transition-all hover:shadow-lg
hover:scale-[1.02]

/* Link hover */
hover:text-[var(--brand-primary)]
hover:bg-[var(--bg-hover)]

/* Focus visible */
:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
```

#### Card Interaction
```css
/* Standard card */
rounded-xl overflow-hidden
border: 1px solid var(--border-primary)

/* Hover state */
hover:border-color: var(--border-primary);
hover:box-shadow: var(--shadow-md);
```

#### Spacing System
```css
/* Container */
container mx-auto px-4

/* Sections */
py-4, py-6, gap-4, gap-6

/* Cards */
p-3, p-4, gap-2, gap-3
```

### Patterns to AVOID Creating
- ❌ New gradients (use existing category gradients)
- ❌ New font families (use Geist + Telugu fonts)
- ❌ New animation systems (use existing fade-in, slide-up)
- ❌ New shadow variants (use --shadow-sm/md/lg)

---

## PHASE 5: IMPLEMENTATION PLAN

### Files to Modify

#### 1. Header Enhancement
```
components/Header.tsx
- Add CategoryNavBar below main header
- Add "More" dropdown for overflow categories
- Keep existing mobile menu logic
```

#### 2. New Components to Create
```
components/navigation/
  CategoryNavBar.tsx      # Horizontal category strip
  MegaMenu.tsx            # Extended dropdown

components/sections/
  SectionHeader.tsx       # Title + View All pattern
  HeadlineStrip.tsx       # Dense headline list
  PhotoGalleryStrip.tsx   # Horizontal image scroll
  OpinionCard.tsx         # Editorial card
  VideoCard.tsx           # Video thumbnail

components/cards/
  CompactNewsCard.tsx     # Dense news item
```

#### 3. Homepage Restructure
```
app/page.tsx
- Reorder sections for Sakshi-style flow
- Add new section components
- Keep existing data fetching logic
```

#### 4. Configuration Files
```
lib/config/
  navigation.ts           # Menu structure
  categories.ts           # Category definitions
  sections.ts             # Homepage section order
```

### Responsive Behavior Notes

| Breakpoint | Behavior |
|------------|----------|
| Mobile (<768px) | Single column, hamburger menu, horizontal scroll for pills |
| Tablet (768-1024px) | 2-column grid, condensed nav bar |
| Desktop (>1024px) | 3-column layout, full nav bar, sidebar visible |

### Rollout Plan

1. **Phase A: Navigation** (Behind feature flag)
   - Create CategoryNavBar component
   - Integrate below Header
   - Test mobile responsiveness

2. **Phase B: Section Components**
   - Create SectionHeader, HeadlineStrip, PhotoGalleryStrip
   - Test in isolation

3. **Phase C: Homepage Restructure**
   - Recompose homepage with new sections
   - A/B test with existing layout

4. **Phase D: Category Extensions**
   - Add new categories to schema
   - Update navigation config
   - Create new category pages

---

## Things Explicitly NOT to Build

| Item | Reason |
|------|--------|
| New design system | Existing tokens are comprehensive |
| Custom icon library | Lucide icons are sufficient |
| New color palette | Existing category colors work |
| Complex animation library | CSS animations are adequate |
| Server-side theme detection | Client-side works fine |
| Infinite scroll | Pagination button is simpler |
| Real-time updates | ISR (60s revalidation) is sufficient |
| User accounts | Out of scope for layout restructure |
| Comments system | Separate feature |
| Search functionality | Separate feature |

---

## Quality Checklist

- [ ] High content density achieved
- [ ] Fast scanability (clear hierarchy)
- [ ] Telugu-first reading ergonomics maintained
- [ ] Zero duplication of existing components
- [ ] Maintainable and scalable architecture
- [ ] Mobile-first responsive design
- [ ] No visual regression on existing pages
- [ ] All existing tokens reused






