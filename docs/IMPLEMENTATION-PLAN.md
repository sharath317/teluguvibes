# TeluguVibes Implementation Plan
## Upgrading Existing Systems (No Duplication)

Based on the System Audit, this document outlines the targeted extensions needed.

---

## PHASE 1: Quality Gates (HIGH PRIORITY)

### 1.1 Mandatory Human POV Gate

**Location:** Extend `lib/editorial/human-pov.ts`

**Current State:** Human POV exists but is optional.

**Change Required:**
```typescript
// Add to lib/intelligence/validator.ts
export function checkPublishingGates(entity: NormalizedEntity): {
  canPublish: boolean;
  failedGates: string[];
  gateResults: GateResult[];
}
```

**Files to Modify:**
- `lib/intelligence/validator.ts` - Add publishing gates check
- `app/api/admin/posts/[id]/publish/route.ts` - Enforce gates before publish

---

### 1.2 Fact Cross-Validation

**Location:** Extend `lib/intelligence/pipeline.ts`

**Current State:** Fetches from multiple sources but doesn't compare.

**Change Required:**
```typescript
// Add to lib/intelligence/synthesis-engine.ts
export async function crossValidateFacts(
  sources: SourceData[]
): Promise<{
  factsMatch: boolean;
  discrepancies: Discrepancy[];
  confidence: number;
}>
```

**Fields to Cross-Validate:**
- Release dates (TMDB vs Wikidata)
- Cast lists (compare top 5)
- Genre classifications
- Box office numbers (if available)

---

### 1.3 Content Length Enforcement

**Location:** Extend `lib/pipeline/unified-content-pipeline.ts`

**Current State:** Validates minimum length but no max or auto-expansion.

**Change Required:**
```typescript
// Add to VALIDATION_RULES
const VALIDATION_RULES = {
  minContentLength: 300,        // Already exists
  maxContentLength: 1500,       // NEW
  minTeluguPercentage: 20,      // Already exists
  optimalLength: 500,           // NEW - from learning engine
};

// Add auto-expansion for thin content
async function expandThinContent(body: string, topic: string): Promise<string>

// Add auto-condensing for bloated content  
async function condenseContent(body: string, maxLength: number): Promise<string>
```

---

## PHASE 2: Admin UI Enhancements (MEDIUM PRIORITY)

### 2.1 Variant Picker UI

**Location:** `app/admin/drafts/page.tsx`

**Current State:** Variants are generated but not shown.

**Change Required:**
Add a modal/component to display variants and allow selection:

```tsx
// components/admin/VariantPicker.tsx
interface VariantPickerProps {
  variants: ContentVariant[];
  imageCandidates: ImageCandidate[];
  onSelect: (variant: ContentVariant, image: ImageCandidate) => void;
}
```

---

### 2.2 "Why Failed" Explanation

**Location:** `app/admin/drafts/page.tsx`

**Current State:** Shows status but not failure reasons.

**Change Required:**
Display validation results in expandable panel:

```tsx
// In draft card/row
{draft.validationResult && draft.status !== 'READY' && (
  <ValidationExplanation result={draft.validationResult} />
)}
```

**Validation Explanation Shows:**
- Failed checks with reasons
- Suggested fixes
- One-click fix buttons (where auto-fixable)

---

### 2.3 Confidence Indicators

**Location:** `app/admin/drafts/page.tsx`, `app/admin/posts/page.tsx`

**Change Required:**
Add visual indicators:

```tsx
// components/admin/ConfidenceIndicator.tsx
<ConfidenceIndicator 
  content={draft.confidence}
  image={draft.imageValidationScore}
  overall={draft.overallConfidence}
/>

// Visual: Progress bars with color coding
// 0-50: Red, 50-75: Yellow, 75-100: Green
```

---

### 2.4 One-Click Regenerate

**Location:** Admin post/draft detail pages

**Change Required:**
Add regeneration buttons:

```tsx
// Regenerate options
<RegenerateButton 
  type="content" | "image" | "both"
  entityId={post.id}
  onComplete={refetch}
/>
```

**API Endpoint:**
```typescript
// app/api/admin/posts/[id]/regenerate/route.ts
POST /api/admin/posts/{id}/regenerate
Body: { type: 'content' | 'image' | 'both' }
```

---

## PHASE 3: Safe Reset Mode (HIGH PRIORITY)

### 3.1 Analytics-Preserving Delete

**Location:** `lib/intelligence/pipeline.ts`

**Current State:** Reset mode archives but may lose analytics.

**Change Required:**
```typescript
// lib/admin/safe-delete.ts
export async function safeDeletePosts(options: {
  olderThan?: Date;
  status?: ContentStatus;
  preserveAnalytics: boolean;
  preserveLearnings: boolean;
}): Promise<{
  deletedCount: number;
  archivedCount: number;
  analyticsPreserved: number;
}>
```

**Approach:**
1. Move content to `archived_posts` table
2. Keep references in analytics tables
3. Clear from main `posts` table
4. Log deletion metadata

---

### 3.2 Rebuild with Intelligence

**Location:** Extend `pnpm ingest:reset`

**Change Required:**
```bash
# New command
pnpm ingest:safe-reset

# Options
--preserve-analytics    # Keep performance data
--preserve-learnings    # Keep AI learnings
--use-learnings         # Apply learnings to new content
--dry-run               # Preview what would happen
```

---

## PHASE 4: Telugu Emotion Validation (MEDIUM PRIORITY)

### 4.1 Telugu Emotion Score

**Location:** Extend `lib/pipeline/unified-content-pipeline.ts`

**Change Required:**
```typescript
// lib/validation/telugu-emotion.ts
export function calculateTeluguEmotionScore(text: string): {
  score: number;  // 0-100
  emotions: {
    nostalgia: number;
    pride: number;
    excitement: number;
    cultural_connection: number;
  };
  hasRegionalFlavor: boolean;
}
```

**Detection Patterns:**
- Telugu cultural keywords
- Nostalgia markers (decade references, classic movie references)
- Regional phrases
- Fan sentiment language

---

## PHASE 5: Follow-Up Content Engine (LOW PRIORITY)

### 5.1 Sequel/Franchise Tracking

**Location:** `lib/intelligence/learning-engine.ts`

**Change Required:**
```typescript
// lib/intelligence/follow-up-engine.ts
export interface FollowUpTrigger {
  type: 'sequel' | 'anniversary' | 'sports_event' | 'awards';
  entity: string;
  triggerDate: Date;
  relevantContext: string[];
}

export async function getActiveFollowUpTriggers(): Promise<FollowUpTrigger[]>
```

**Triggers:**
- Movie sequels (from TMDB collections)
- Anniversary dates (from historic intelligence)
- Sports events (IPL, World Cup)
- Awards (Filmfare, National Awards)

---

## CLI ADDITIONS

### New Commands

```bash
# Safe reset with analytics preservation
pnpm ingest:safe-reset --preserve-analytics --preserve-learnings

# Quality gates check
pnpm intel:gates
pnpm intel:gates --fix

# Variant generation for stuck items
pnpm intel:variants --status=NEEDS_REWORK --limit=20

# Human POV management
pnpm intel:pov:pending
pnpm intel:pov:suggest --post-id=xxx

# Telugu emotion analysis
pnpm intel:emotion --analyze --limit=50
```

---

## API ENDPOINTS TO ADD

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/posts/[id]/regenerate` | POST | Regenerate content/image |
| `/api/admin/posts/[id]/gates` | GET | Check publishing gates |
| `/api/admin/posts/[id]/variants` | GET | Get variants |
| `/api/admin/posts/[id]/variants` | POST | Select variant |
| `/api/admin/posts/[id]/explain` | GET | Get failure explanation |
| `/api/admin/bulk/safe-delete` | POST | Safe delete with preservation |

---

## IMPLEMENTATION ORDER

### Week 1: Critical Gates
1. ✅ Mandatory Human POV gate
2. ✅ Publishing gates API
3. ✅ Content length enforcement

### Week 2: Admin UX
1. ✅ Variant picker UI
2. ✅ "Why failed" explanation
3. ✅ Confidence indicators

### Week 3: Safe Operations
1. ✅ Safe delete implementation
2. ✅ Regenerate API + UI
3. ✅ CLI updates

### Week 4: Intelligence
1. ✅ Telugu emotion score
2. ✅ Fact cross-validation
3. ✅ Follow-up engine (basic)

---

## FILES TO CREATE

```
lib/intelligence/
├── quality-gates.ts         # NEW: Publishing gates
├── fact-validator.ts        # NEW: Cross-validation
└── follow-up-engine.ts      # NEW: Sequel/event tracking

lib/validation/
└── telugu-emotion.ts        # NEW: Emotion scoring

lib/admin/
└── safe-delete.ts           # NEW: Analytics-preserving delete

components/admin/
├── VariantPicker.tsx        # NEW: Variant selection UI
├── ValidationExplanation.tsx # NEW: Failure explanation
├── ConfidenceIndicator.tsx  # NEW: Visual confidence
└── RegenerateButton.tsx     # NEW: One-click regenerate

app/api/admin/posts/[id]/
├── regenerate/route.ts      # NEW
├── gates/route.ts           # NEW
├── variants/route.ts        # NEW
└── explain/route.ts         # NEW

scripts/
└── safe-reset.ts            # NEW: Safe reset CLI
```

---

## SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| No content publishes without human POV | 100% |
| Validation explanations visible | All NEEDS_REWORK items |
| Regenerate success rate | >80% |
| Safe delete preserves analytics | 100% |
| Telugu emotion score calculated | All new content |

---

*Implementation plan ready. All changes EXTEND existing systems.*






