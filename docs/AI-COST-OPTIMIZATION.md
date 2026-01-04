# AI Cost Optimization Guide

## Overview

This document outlines the cost optimization strategies implemented for AI API usage in TeluguVibes. These optimizations reduce costs by **60-80%** while maintaining output quality.

---

## Model Routing Strategy

### Tier System

We use a 3-tier model routing system based on task complexity:

| Tier | Model | Cost (per 1M tokens) | Use Cases |
|------|-------|---------------------|-----------|
| **Light** | `llama-3.1-8b-instant` | $0.05 in, $0.08 out | Extraction, classification, lists |
| **Standard** | `llama-3.3-70b-versatile` | $0.59 in, $0.79 out | Analysis, scoring |
| **Premium** | `llama-3.3-70b-versatile` | $0.59 in, $0.79 out | Creative generation |

### Task Classification

```typescript
// Light tier (use 8B model)
- why_watch, why_skip, awards
- perspectives, verdict
- extraction, classification, meme_caption

// Standard tier (use 70B model)
- story_analysis, performances
- direction_technicals, content_analysis

// Premium tier (use 70B model)
- synopsis, cultural_impact
- article_generation, translation
```

### Usage

```typescript
import { modelRouter } from '@/lib/ai/model-router';

// Get optimal configuration for a task
const route = modelRouter.route('synopsis');
console.log(route.model);      // 'llama-3.3-70b-versatile'
console.log(route.maxTokens);  // 800
console.log(route.temperature); // 0.7
```

---

## Token Limits

### Recommended max_tokens by Task

| Section | max_tokens | Reason |
|---------|-----------|--------|
| Synopsis | 400 | ~250 words needed |
| Story Analysis | 500 | ~150-200 words + JSON |
| Performances | 600 | Multiple actors |
| Direction/Tech | 400 | ~150 words + scores |
| Perspectives | 250 | 100-150 words |
| Why Watch | 200 | 3-5 bullet points |
| Why Skip | 150 | 2-3 bullet points |
| Cultural Impact | 300 | ~100 words + elements |
| Awards | 150 | List extraction |
| Verdict | 200 | 50-80 words x 2 languages |

### Temperature Guidelines

| Task Type | Temperature | Reason |
|-----------|-------------|--------|
| Extraction | 0.1-0.3 | Deterministic output |
| Classification | 0.2-0.4 | Consistent categories |
| Analysis | 0.4-0.6 | Balanced creativity |
| Generation | 0.6-0.8 | Creative variation |

---

## Response Caching

### Cache TTL Strategy

```typescript
const CACHE_TTL = {
  synopsis: 30 * 24 * 60 * 60,     // 30 days (static)
  awards: 365 * 24 * 60 * 60,      // 1 year (historical)
  cultural_impact: 30 * 24 * 60 * 60,
  story_analysis: 7 * 24 * 60 * 60, // 7 days
  trending: 1 * 60 * 60,            // 1 hour
};
```

### Cache Key Patterns

```
synopsis:{movieId}:{releaseYear}
analysis:{movieId}:v2
awards:{movieId}
```

### Usage

```typescript
import { aiCache } from '@/lib/ai/cache';

const result = await aiCache.getOrGenerate(
  `synopsis:${movieId}:${movie.release_year}`,
  async () => generateSynopsis(movie),
  { category: 'synopsis' }
);

if (result.cached) {
  console.log('Cache hit - saved API call!');
}
```

---

## Batching Strategy

### Editorial Review Batches

Instead of 11 sequential calls, we use 3 parallel batches:

```
Batch 1 (Premium): Synopsis + Cultural Impact
Batch 2 (Standard): Story + Performances + Direction
Batch 3 (Light): Perspectives + Watch/Skip + Awards + Verdict
```

This reduces:
- Total latency: ~60s → ~25s
- API calls perceived: 11 → 3 rounds

### Implementation

```typescript
// Parallel batch execution
const [synopsis, culturalImpact] = await Promise.all([
  this.generateSynopsis(sources),
  this.generateCulturalImpact(sources),
]);
```

---

## Prompt Optimization

### Before (Verbose - ~200 tokens)

```
You are a Telugu film critic. Write a 200-250 word spoiler-free synopsis.

MOVIE: Athadu
YEAR: 2005
GENRES: Action, Drama
DIRECTOR: Trivikram Srinivas
HERO: Mahesh Babu
HEROINE: Trisha

Rules:
- Focus on setup, not resolution
- Highlight unique premise
- Mention key characters by name
- Set the tone (action-packed, emotional, thriller, etc.)

Return ONLY valid JSON (no markdown):
{"en": "Your 200-250 word English synopsis here", "spoiler_free": true}
```

### After (Compact - ~50 tokens)

```
Athadu (2005) | Action | Dir: Trivikram | Stars: Mahesh Babu, Trisha
Synopsis (200-250w, spoiler-free)
JSON:{"en":"synopsis","spoiler_free":true}
```

### Savings: ~75% reduction in input tokens

---

## Cost Tracking

### Metrics Collection

```typescript
import { aiMetrics } from '@/lib/ai/metrics';

// Automatically tracked on each AI call:
// - inputTokens, outputTokens
// - costUsd
// - latencyMs
// - cached (boolean)
// - feature, section

// View session summary
aiMetrics.printSummary();
```

### Cost Estimation

```typescript
const cost = modelRouter.estimateCost('synopsis', 500, 400);
console.log(`Estimated cost: $${cost.toFixed(6)}`);
```

---

## DO's and DON'Ts

### DO ✅

1. **Use appropriate model tiers**
   - 8B for extraction/classification
   - 70B for analysis/generation

2. **Cache static content**
   - Synopses, awards, cultural impact
   - Anything that won't change

3. **Batch parallel calls**
   - Group independent sections
   - Reduce round-trip latency

4. **Set explicit token limits**
   - Match expected output length
   - Don't over-provision

5. **Track costs per feature**
   - Use aiMetrics
   - Identify expensive operations

### DON'T ❌

1. **Use 70B for simple lists**
   - Awards extraction → use 8B
   - Why Watch bullets → use 8B

2. **Regenerate without cache check**
   - Always check cache first
   - Set appropriate TTL

3. **Include verbose instructions**
   - Skip "You are an expert..."
   - Use imperative prompts

4. **Send chat history unnecessarily**
   - Single-turn for most tasks
   - No system message for simple extraction

5. **Use high temperature for JSON**
   - Keep temp ≤ 0.5 for structured output
   - Higher temp = more parsing failures

---

## Cost Impact Summary

| Optimization | Before | After | Savings |
|--------------|--------|-------|---------|
| Model right-sizing | $0.79/M | $0.08/M | 60% |
| Prompt compression | ~500 tokens | ~200 tokens | 60% |
| Response capping | ~6500 tokens | ~3100 tokens | 52% |
| Caching | 0% hits | ~40% hits | 40% |

**Estimated Total Savings: 60-80%**

---

## When to Use Large Models

Use `llama-3.3-70b-versatile` (or GPT-4o) only for:

1. **Synopsis generation** - Needs coherent narrative
2. **Cultural impact analysis** - Requires nuanced understanding
3. **Full article generation** - Long-form creative content
4. **Complex analysis** - Multi-factor scoring

For everything else, start with 8B and upgrade only if quality is insufficient.

---

## Migration Checklist

- [ ] Run cache table migration (see `lib/ai/cache.ts`)
- [ ] Run metrics table migration (see `lib/ai/metrics.ts`)
- [ ] Update existing AI calls to use `modelRouter`
- [ ] Add caching to high-frequency endpoints
- [ ] Enable metrics logging (`AI_METRICS_DEBUG=true`)
- [ ] Monitor cost dashboard after deployment

