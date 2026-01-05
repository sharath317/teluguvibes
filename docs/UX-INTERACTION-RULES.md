# UX Interaction Rules - Formal Specification

## Version: 1.0 (Hardened)
## Last Updated: January 2026

---

## 1. Scroll Preservation System

### 1.1 Core Principle

**User scroll position is sacred.** The system must preserve scroll state across:
- Tab switches
- Filter changes
- Modal open/close
- Back/forward navigation
- Detail page returns

### 1.2 Implementation Components

| Component                    | File                                |
|------------------------------|-------------------------------------|
| useScrollRestoration         | `hooks/useScrollRestoration.ts`     |
| useTabScrollMemory           | `hooks/useScrollRestoration.ts`     |
| useFilterScrollMemory        | `hooks/useScrollRestoration.ts`     |
| useScrollPreservation        | `lib/utils/scroll-preservation.ts`  |
| useScrollLock                | `lib/utils/scroll-preservation.ts`  |

### 1.3 Storage Strategy

```
┌─────────────────────────────────────────┐
│           sessionStorage                │
├─────────────────────────────────────────┤
│ Key: telugu_scroll_{prefix}_{path}      │
│ Value: { x, y, timestamp }              │
│ Max Age: 30 minutes                     │
└─────────────────────────────────────────┘
```

### 1.4 Scroll Events

| Event              | Action                            |
|--------------------|-----------------------------------|
| Scroll             | Debounced save (100ms)            |
| Tab switch         | Save → Restore                    |
| Filter change      | Save → Restore                    |
| Modal open         | Lock background scroll            |
| Modal close        | Restore position                  |
| Route change       | Conditional restore               |
| Back navigation    | Restore from history              |

---

## 2. Navigation Patterns

### 2.1 Route Types

| Route Type        | Scroll Behavior                    |
|-------------------|-----------------------------------|
| New page          | Scroll to top                     |
| Tab change        | Preserve position                 |
| Filter apply      | Preserve position                 |
| Modal open        | Lock + preserve                   |
| Back navigation   | Restore previous                  |
| Refresh           | Preserve if same content          |

### 2.2 Modal vs Route Decisions

```
If (content is overlay) → Use Modal
  - Quick previews
  - Confirmations
  - Filters panel
  - Share dialogs

If (content is primary) → Use Route
  - Movie detail pages
  - Full reviews
  - Search results
  - Collections
```

### 2.3 Shallow Routing

For state changes that don't require full navigation:
- Filters
- Sorting
- Pagination
- Tab selection

```typescript
// Prefer shallow routing for filters
router.push(url, { shallow: true });
```

---

## 3. Focus Management

### 3.1 Focus Trap Rules

| Context           | Focus Behavior                     |
|-------------------|-----------------------------------|
| Modal open        | Trap focus inside modal           |
| Modal close       | Return focus to trigger           |
| Tab switch        | Focus first interactive element   |
| Error state       | Focus error message               |

### 3.2 Keyboard Navigation

| Key              | Action                             |
|------------------|-----------------------------------|
| Escape           | Close modal / clear selection     |
| Tab              | Next focusable element            |
| Shift+Tab        | Previous focusable element        |
| Enter            | Activate button / link            |
| Arrow keys       | Navigate within components        |

---

## 4. Loading States

### 4.1 Skeleton Loading

Every section must have a skeleton loader:
- Movie grids → Card skeletons
- Review content → Text skeletons
- Carousels → Slide skeletons

### 4.2 Loading Thresholds

| Duration         | Behavior                           |
|------------------|-----------------------------------|
| < 100ms          | No indicator                      |
| 100-300ms        | Skeleton                          |
| 300-1000ms       | Skeleton + subtle pulse           |
| > 1000ms         | Skeleton + progress indicator     |

### 4.3 Empty States

Every list must have a meaningful empty state:
- Message explaining why empty
- Suggested action (if applicable)
- No broken layouts

---

## 5. Touch Targets

### 5.1 Minimum Sizes

| Element Type     | Minimum Size                       |
|------------------|-----------------------------------|
| Buttons          | 44px × 44px                       |
| Links            | 44px touch target                 |
| Icons            | 44px × 44px touch area            |
| Cards            | Full area clickable               |

### 5.2 Spacing

| Context          | Minimum Spacing                    |
|------------------|-----------------------------------|
| Touch targets    | 8px between                       |
| List items       | 12px vertical padding             |
| Button groups    | 12px gap                          |

---

## 6. Similar Movies Carousel

### 6.1 Interaction Rules

| Interaction      | Behavior                           |
|------------------|-----------------------------------|
| Swipe            | Scroll 60% viewport width         |
| Arrow click      | Scroll 70% viewport width         |
| Card hover       | Scale 1.05, show overlay          |
| Card click       | Navigate to review page           |

### 6.2 Scroll Behavior

```css
scroll-snap-type: x mandatory;
scroll-behavior: smooth;
-webkit-overflow-scrolling: touch;
```

### 6.3 Visibility Indicators

- Left gradient fade when scrollable left
- Right gradient fade when scrollable right
- Disable arrow buttons at boundaries

---

## 7. Review Page Layout

### 7.1 Information Hierarchy

```
┌─────────────────────────────────────────┐
│  Movie Header (poster, title, badges)   │
├─────────────────────────────────────────┤
│  Quick Verdict Card (summary, ratings)  │
├─────────────────────────────────────────┤
│  Synopsis + Rating Breakdown            │
├─────────────────────────────────────────┤
│  Cast Carousel                          │
├─────────────────────────────────────────┤
│  Deep Dive Accordion                    │
│  ├── Performances                       │
│  ├── Story & Screenplay                 │
│  └── Direction & Craft                  │
├─────────────────────────────────────────┤
│  Similar Movies (6-8 sections)          │
└─────────────────────────────────────────┘
```

### 7.2 Responsive Breakpoints

| Breakpoint       | Layout                             |
|------------------|-----------------------------------|
| Mobile (<640px)  | Single column                     |
| Tablet (640-1024)| Adaptive                          |
| Desktop (>1024)  | Two columns where applicable      |

---

## 8. Performance Rules

### 8.1 Lazy Loading

| Content Type     | Strategy                           |
|------------------|-----------------------------------|
| Images           | Native lazy loading               |
| Below-fold       | Intersection Observer             |
| Carousels        | Load visible + 2 adjacent         |

### 8.2 Prefetching

| Interaction      | Prefetch                           |
|------------------|-----------------------------------|
| Card hover       | Prefetch review page              |
| Visible link     | Low-priority prefetch             |

---

## 9. Animation Guidelines

### 9.1 Duration Standards

| Animation Type   | Duration                           |
|------------------|-----------------------------------|
| Hover effects    | 150-200ms                         |
| State changes    | 200-300ms                         |
| Page transitions | 300-400ms                         |
| Complex reveals  | 400-600ms                         |

### 9.2 Easing Functions

| Use Case         | Easing                             |
|------------------|-----------------------------------|
| Enter            | ease-out                          |
| Exit             | ease-in                           |
| Continuous       | ease-in-out                       |
| Interactive      | ease-out                          |

### 9.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Error Handling

### 10.1 Error States

| Error Type       | User Message                       |
|------------------|-----------------------------------|
| Network error    | "Connection issue. Retry?"        |
| Not found        | "Content not available"           |
| Server error     | "Something went wrong"            |
| Timeout          | "Taking too long. Retry?"         |

### 10.2 Recovery Actions

- Always provide retry option
- Preserve user input on errors
- Fall back to cached content when possible

---

## 11. Accessibility Checklist

### 11.1 Required

- [ ] All images have alt text
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Keyboard navigable
- [ ] Screen reader compatible
- [ ] Semantic HTML structure

### 11.2 Recommended

- [ ] Skip links available
- [ ] Landmarks defined
- [ ] ARIA labels where needed
- [ ] Error messages announced

---

## 12. Code Locations

| Component                | Path                               |
|--------------------------|-----------------------------------|
| Scroll hooks             | `hooks/useScrollRestoration.ts`   |
| Scroll utilities         | `lib/utils/scroll-preservation.ts`|
| Accessibility utils      | `lib/utils/accessibility.ts`      |
| Similar carousel         | `components/reviews/SimilarMoviesCarousel.tsx` |

---

*This specification defines user experience contracts. All UI changes must comply.*


