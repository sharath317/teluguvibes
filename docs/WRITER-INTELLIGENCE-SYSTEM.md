# Writer-Style Intelligence System

## Overview

A comprehensive Telugu content generation system that produces **writer-grade content without AI text generation**. Templates learn from professional Telugu writer patterns and evolve based on engagement metrics.

## Core Principle

> **Templates are the primary writing system. AI can only analyze, compare, and suggest - never generate published text.**

---

## 1️⃣ Writer Style Signal Extractor

**File:** `lib/writer-intelligence/signal-extractor.ts`

### Legal Inputs Only

| ✅ ALLOWED | ❌ FORBIDDEN |
|-----------|-------------|
| RSS feeds | Reading article body text |
| Sitemap XML | Tokenizing words/sentences |
| HTML tag structure (no innerText) | Storing phrases or headlines |
| Page metadata | Scraping protected pages |
| URL patterns | |

### Signal Derivation Methods

```typescript
writer_style_signals {
  siteId                    // Domain name converted to ID
  siteDomain                // Original domain
  sectionType               // From URL path segments
  
  // Derived from DOM structure
  avgArticleLengthRange     // [min, max] <p> tag count range
  paragraphCountAvg         // Average <p> tags per article
  punctuationDensityEstimate // Ratio of . , ! ? in meta tags
  headlineWordCountRange    // From URL slug word counts
  introBlockSizeRatio       // First <p> position / total span
  midSectionDensity         // <p> spacing in middle 60%
  closingBlockPattern       // CTA detection in last 5000 chars
  
  // Language patterns
  englishMixRatioEstimate   // English words in meta/URL vs Telugu chars
  
  // Layout patterns  
  glamourBlockPosition      // 'top' | 'middle' | 'bottom' | 'none'
  imageToTextRatio          // <img> count / <p> count
  
  // Timing
  publishTimePattern {
    peakHours               // From RSS pubDate analysis
    peakDays                // Day-of-week distribution
    avgUpdatesPerDay        // Frequency calculation
  }
}
```

### How Each Signal is Derived

| Signal | Derivation Method |
|--------|-------------------|
| `paragraphCountAvg` | Count `<p>` tags via regex: `html.match(/<p[\s>]/gi).length` |
| `punctuationDensity` | Count `. , ! ? ; :` in meta description / total chars |
| `headlineWordCountRange` | Split URL slugs by `-_`, count segments, get 10th/90th percentile |
| `introBlockRatio` | `(firstPClose - firstPIndex) / (lastPClose - firstPIndex)` |
| `englishMixRatio` | `englishWords.length / (englishWords.length + teluguChars.length)` |
| `glamourBlockPosition` | Search for `.hero`, `.featured`, `<figure>` class patterns in HTML |
| `closingBlockPattern` | Detect `.subscribe`, `.newsletter`, `<button>` in last 5000 chars |
| `publishTimePattern` | Parse RSS `<pubDate>` or sitemap `<lastmod>`, aggregate by hour/day |

---

## 2️⃣ Telugu Editorial Style Profiles

**File:** `lib/writer-intelligence/style-profiles.ts`

### 8 Style Profiles

| Profile ID | Telugu Name | Rhythm | Emotion | English Mix |
|------------|-------------|--------|---------|-------------|
| `mass_commercial` | మాస్ కమర్షియల్ | fast_punchy | very_high | high |
| `soft_emotional` | సాఫ్ట్ ఎమోషనల్ | balanced | high | minimal |
| `neutral_newsroom` | న్యూట్రల్ న్యూస్‌రూమ్ | balanced | low | moderate |
| `glamour_sensual` | గ్లామర్ సెన్షువల్ | poetic | high | high |
| `political_narrative` | పొలిటికల్ నేరేటివ్ | slow_deliberate | medium | moderate |
| `devotional_cultural` | భక్తి/సాంస్కృతిక | slow_deliberate | high | minimal |
| `nostalgic_retro` | నాస్టాల్జిక్ రెట్రో | poetic | very_high | minimal |
| `viral_trending` | వైరల్ ట్రెండింగ్ | fast_punchy | high | high |

### Profile Structure

```typescript
interface StyleProfile {
  id: string;
  name: string;           // Telugu
  nameEn: string;         // English
  
  // Rhythm & Flow
  rhythm: 'fast_punchy' | 'balanced' | 'slow_deliberate' | 'poetic';
  emotionalIntensity: 'low' | 'medium' | 'high' | 'very_high';
  sentenceVariance: 'uniform' | 'moderate' | 'high';
  
  // Language
  slangUsageLevel: 0 | 1 | 2 | 3;
  englishWordTolerance: 'minimal' | 'moderate' | 'high';
  glamourTolerance: 'none' | 'subtle' | 'moderate' | 'explicit';
  
  // Structure
  introPattern: 'hook_first' | 'context_first' | 'question_first' | 'emotional_first';
  paragraphFlow: 'short_staccato' | 'medium_balanced' | 'long_flowing' | 'mixed';
  closingPattern: 'summary' | 'call_to_action' | 'emotional_peak' | 'open_ended';
  
  // Targets
  targetWordCount: { min: number; max: number };
  targetParagraphCount: { min: number; max: number };
  
  // Mappings
  contentTypes: string[];
  audienceSegments: string[];
  platformSections: string[];
}
```

### Content Type → Profile Mapping

| Content Type | Primary Profile | Fallback |
|--------------|-----------------|----------|
| `movie_update` | mass_commercial | neutral_newsroom |
| `photoshoot` | glamour_sensual | soft_emotional |
| `box_office` | mass_commercial | neutral_newsroom |
| `politics` | political_narrative | neutral_newsroom |
| `festival` | devotional_cultural | soft_emotional |
| `throwback` | nostalgic_retro | soft_emotional |
| `viral_video` | viral_trending | mass_commercial |

### Audience → Profile Mapping

| Audience | Preferred Profiles | Peak Hours |
|----------|-------------------|------------|
| `mass_audience` | mass_commercial, viral_trending | 9, 12, 18, 21 |
| `family` | soft_emotional, devotional_cultural | 7, 19, 21 |
| `youth` | viral_trending, glamour_sensual | 10, 14, 22, 23 |
| `seniors` | neutral_newsroom, nostalgic_retro | 6, 9, 18 |
| `cinephiles` | nostalgic_retro, mass_commercial | 11, 20, 22 |

---

## 3️⃣ No-AI Publishing Enforcement

**File:** `lib/writer-intelligence/no-ai-enforcement.ts`

### Config Flag

```bash
# Environment variable (default: true)
NO_AI_PUBLISH=true

# Enforcement modes
AI_ENFORCEMENT_MODE=strict   # Block all AI content
AI_ENFORCEMENT_MODE=audit    # Allow with logging (migration)
AI_ENFORCEMENT_MODE=disabled # Testing only
```

### CLI Enforcement

```bash
pnpm templates:publish --no-ai
```

### Publishing Gate

```typescript
function checkPublishingGate(content) {
  if (content.source === 'ai_generated') {
    logViolation({
      contentId: content.id,
      reason: 'AI-generated content cannot be published directly',
      enforcementMode: ENFORCEMENT_MODE,
    });
    return { allowed: false, requiresHumanReview: true };
  }
  
  // Allowed sources
  if (['template', 'template_evolved', 'human_written', 'ai_assisted'].includes(content.source)) {
    return { allowed: true };
  }
}
```

### AI Assist Logging

```typescript
interface AIAssistLog {
  contentId: string;
  purpose: 'structure_analysis' | 'pattern_comparison' | 'delta_suggestion' | 'quality_check';
  confidenceScore: number;
  timestamp: Date;
  wasUsed: boolean;
  humanOverride: boolean;
}
```

### Allowed vs Forbidden AI Operations

| ✅ ALLOWED | ❌ FORBIDDEN |
|-----------|-------------|
| Structure analysis | Text generation |
| Pattern comparison | Headline generation |
| Delta suggestions | Content rewriting |
| Quality checks | Direct publishing |
| Entity extraction | |
| Categorization | |

---

## 4️⃣ Observation Site Matrix

**File:** `lib/writer-intelligence/signal-extractor.ts`

### 🟢 PRIMARY SITES (High-quality, writer-driven)

| Domain | Category | Signals to Observe |
|--------|----------|-------------------|
| sakshi.com | news | paragraph_rhythm, headline_structure, timing_patterns |
| eenadu.net | news | long_form_structure, traditional_telugu, editorial_flow |
| andhrajyothy.com | news | opinion_structure, editorial_tone, paragraph_flow |
| greatandhra.com | entertainment | emotional_intro, cinema_structure, opinion_mix |

### 🟡 SECONDARY SITES (Entertainment/Cinema)

| Domain | Category | Key Signals |
|--------|----------|-------------|
| 123telugu.com | entertainment | glamour_placement, review_structure |
| gulte.com | entertainment | breaking_pattern, quick_update_style |
| idlebrain.com | entertainment | review_depth, nostalgia_patterns |
| cinejosh.com | entertainment | gossip_style, headline_aggression |
| tupaki.com | entertainment | viral_structure, click_patterns |
| mirchi9.com | entertainment | rating_patterns, section_layout |
| filmibeat.com/telugu | glamour | glamour_tolerance, image_first |
| pinkvilla.com/telugu | glamour | lifestyle_mix, gallery_structure |

### 🔵 TERTIARY SITES (Digital-first/Specialized)

| Domain | Category | Key Signals |
|--------|----------|-------------|
| telugusamacharam.com | news | short_paragraph, emotional_hooks |
| telugubulletin.com | news | breaking_speed, mobile_layout |
| bhaktipustakalu.com | devotional | soft_emotional, closing_wisdom |

### Legal Observation Methods

```
⚠️ Only observe:
  ✅ RSS feeds
  ✅ Sitemap XML  
  ✅ HTML tag structure
  ✅ URL patterns
  ❌ Never read article content
```

---

## 5️⃣ Template Evolution Strategy

**File:** `lib/templates/template-evolution.ts` (existing, extended)

### Template Confidence Score

```typescript
interface TemplateConfidence {
  rhythmMatch: number;      // 0-1: How well rhythm matches profile
  emotionMatch: number;     // 0-1: Telugu emotion score
  audienceFit: number;      // 0-1: Engagement with target audience
  publishSuccessRate: number; // 0-1: Historical success rate
}

// Overall confidence
confidence = rhythmMatch * 0.25 + emotionMatch * 0.25 + 
             audienceFit * 0.25 + publishSuccessRate * 0.25;
```

### Self-Promotion Rules

Templates self-promote when:
1. `successRate > 0.7` (70%+ success)
2. `templateConfidence > aiConfidence`
3. `usageCount >= 10` (sufficient data)

### Evolution Cycle

```typescript
function runEvolutionCycle(): EvolutionResult {
  // 1. Templates with usageCount >= 10 are evaluated
  // 2. Low performers (successRate < 0.4) get adjusted
  // 3. High performers (successRate > 0.7) get confidence boost
  // 4. Blocks are promoted/retired based on performance
  
  return {
    templatesEvolved: number,
    blocksPromoted: number,
    blocksRetired: number,
    newBlocksCreated: number,
    overallConfidenceChange: number,
  };
}
```

### Evolution Without AI

| Stage | Action | AI Involvement |
|-------|--------|----------------|
| Generation | Use templates | ❌ None |
| Publishing | Check confidence gate | ❌ None |
| Tracking | Log engagement metrics | ❌ None |
| Learning | Update block scores | ❌ None |
| Evolution | Promote/retire blocks | ❌ None |

---

## 6️⃣ Pure Template Generators

**File:** `lib/writer-intelligence/template-generators.ts`

### Template Library (78 Templates)

| Type | Count | Profiles Covered |
|------|-------|-----------------|
| Hook | 40 | All 8 profiles |
| Context | 13 | movie, celebrity, event, achievement |
| Emotion | 13 | excitement, pride, nostalgia, admiration |
| Fan Connect | 5 | Universal |
| Closing | 12 | summary, cta, emotional, open_ended |

### Example Templates

**Mass Commercial Hook:**
```telugu
మెగా న్యూస్! {celebrity_name_te} మరోసారి సంచలనం సృష్టించబోతున్నారు. 
{movie_name_te} అప్‌డేట్ చదవండి!
```

**Nostalgic Hook:**
```telugu
గుర్తున్నాయా ఆ రోజులు? {celebrity_name_te} {movie_name_te} గురించి 
మధుర జ్ఞాపకాలు.
```

**Glamour Hook:**
```telugu
వావ్! {celebrity_name_te} గ్లామరస్ ఫోటోస్ చూశారా?
```

### Generation Flow

```
1. Select Profile → Based on contentType/audience
2. Generate Hook → From profile-specific templates
3. Generate Context → 1-2 paragraphs based on word count target
4. Generate Emotion → Based on profile.emotionalIntensity
5. Generate Fan Connect → If entertainment/glamour section
6. Generate Closing → Based on profile.closingPattern
7. Calculate Confidence → Check emotion score + template quality
8. Pass Publishing Gate → If confidence >= threshold
```

---

## 7️⃣ CLI Commands

### Template Publishing

```bash
# Generate and publish with templates
pnpm templates:publish --content-type movie_update -c "Allu Arjun" --movie "Pushpa 2"

# Dry run (don't save)
pnpm templates:publish --dry-run

# Check system status
pnpm templates:status

# List all profiles
pnpm templates:profiles

# Show observation sites
pnpm templates:sites
```

### Content Comparison (Testing)

```bash
# Compare template vs AI (testing only)
pnpm compare:content --celebrity "Samantha" --content-type photoshoot

# Run multiple comparisons
pnpm compare:all --limit 5
```

---

## 8️⃣ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WRITER INTELLIGENCE SYSTEM                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Signal Extractor│    │ Style Profiles  │                │
│  │ (Legal Only)    │───▶│ (8 Profiles)    │                │
│  └─────────────────┘    └────────┬────────┘                │
│          │                       │                          │
│          ▼                       ▼                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Site Matrix     │    │ Content Mapping │                │
│  │ (15 Sites)      │    │ (Type→Profile)  │                │
│  └─────────────────┘    └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│  ┌─────────────────────────────────────────────┐           │
│  │           TEMPLATE GENERATORS               │           │
│  │  ┌─────┐ ┌────────┐ ┌────────┐ ┌────────┐  │           │
│  │  │Hook │ │Context │ │Emotion │ │Closing │  │           │
│  │  │(40) │ │ (13)   │ │ (13)   │ │ (12)   │  │           │
│  │  └─────┘ └────────┘ └────────┘ └────────┘  │           │
│  └─────────────────────┬───────────────────────┘           │
│                        │                                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │           NO-AI ENFORCEMENT                  │           │
│  │  ┌─────────────┐  ┌──────────────────────┐  │           │
│  │  │ Config Flag │  │ Publishing Gate      │  │           │
│  │  │ NO_AI=true  │  │ if(ai) → REJECT     │  │           │
│  │  └─────────────┘  └──────────────────────┘  │           │
│  └─────────────────────┬───────────────────────┘           │
│                        │                                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │           EVOLUTION ENGINE                   │           │
│  │  Track → Learn → Evolve (No AI)             │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9️⃣ Files Created

| File | Purpose |
|------|---------|
| `lib/writer-intelligence/signal-extractor.ts` | Legal metadata extraction |
| `lib/writer-intelligence/style-profiles.ts` | 8 Telugu style profiles |
| `lib/writer-intelligence/no-ai-enforcement.ts` | Publishing gate + audit logs |
| `lib/writer-intelligence/template-generators.ts` | 78 pure Telugu templates |
| `lib/writer-intelligence/seed-data.ts` | Celebrity/movie data |
| `lib/writer-intelligence/index.ts` | Unified exports |
| `scripts/templates-publish.ts` | CLI for publishing |
| `scripts/template-vs-ai-compare.ts` | Testing comparison |

---

## 🔟 Next Steps (Roadmap)

### Phase 1: Observation (Week 1-2)
- [ ] Implement RSS fetcher for primary sites
- [ ] Parse sitemap XML for URL patterns
- [ ] Extract timing patterns from pubDates
- [ ] Calculate headline word count distributions

### Phase 2: Learning (Week 2-3)
- [ ] Analyze paragraph density patterns
- [ ] Map glamour block positions per site
- [ ] Build intro/closing pattern database
- [ ] Calculate English mix ratios

### Phase 3: Template Expansion (Week 3-4)
- [ ] Add 50+ hook templates per profile
- [ ] Create section-specific context blocks
- [ ] Build nostalgia trigger library
- [ ] Add regional slang templates

### Phase 4: Evolution (Ongoing)
- [ ] Track template engagement metrics
- [ ] Auto-promote high performers
- [ ] Retire low-confidence blocks
- [ ] Generate new combinations

---

## ⚠️ Important Rules

1. **NEVER read article body text** - Only structure
2. **NEVER store headlines/phrases** - Only patterns
3. **NEVER publish AI-generated text** - Only templates
4. **ALWAYS log AI assistance** - For audit
5. **ALWAYS check publishing gate** - Before save

---

*Last Updated: January 2026*
*System Version: 1.0*






