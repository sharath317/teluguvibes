# TeluguVibes Content Generation Flow

> Detailed documentation of the automated content pipeline

---

## Overview

The content generation pipeline follows a **validation-first** approach:
- All content is generated and validated **BEFORE** saving to database
- Only validated drafts are saved
- No "Enrich later" needed - drafts are ready on import

---

## Pipeline Entry Points

### 1. Admin Dashboard Import

```
Browser → POST /api/trends?limit=20 → Unified Pipeline → Supabase
```

**How to use:**
1. Go to `http://localhost:3000/admin/drafts`
2. Click "Import Trends as Drafts"
3. Wait for pipeline completion
4. Review and publish validated drafts

### 2. CLI Command

```bash
pnpm free:run --mode=smart --limit=10
```

**Flags:**
- `--mode=smart` - Actually write to database (default is dry-run)
- `--limit=N` - Limit number of posts to generate
- `--verbose` - Show detailed logs
- `--source=trends` - Use Google Trends as source

### 3. API Direct Call

```bash
curl -X POST "http://localhost:3000/api/trends?limit=20"
```

**Response:**
```json
{
  "message": "Imported 18 validated drafts (2 failed validation)",
  "count": 18,
  "failed": 2,
  "avgConfidence": "75%"
}
```

---

## Pipeline Stages

### Stage 1: Topic Ingestion

**Sources:**
| Source | Priority | Description |
|--------|----------|-------------|
| Google Trends | Primary | Telugu trending topics via RSS |
| NewsData API | Secondary | Telugu news headlines |
| TMDB | Tertiary | Upcoming Telugu movies |
| Default Topics | Fallback | Pre-defined popular topics |

**Code:** `lib/trends.ts` → `fetchGoogleTrends()`

---

### Stage 2: Entity Detection

The system detects known entities from the topic text:

```typescript
// Input: "Prabhas Raja Saab movie release date confirmed"

findEntity("Prabhas")  → { name: "Prabhas", alias: "Rebel Star", wikiTitle: "Prabhas" }
findMovie("Raja Saab") → { name: "Raja Saab", nameTe: "రాజా సాబ్", hero: "Prabhas" }
extractTags(topic)     → ["Prabhas", "Rebel Star", "Raja Saab"]
```

**Code:** `lib/content/telugu-templates.ts`

---

### Stage 3: Content Generation

**Priority Order:**

1. **Ollama AI (Local)** - If running on `localhost:11434`
   - Model: `llama3:8b` or `mistral:7b`
   - Validates Telugu output quality

2. **Template Fallback** - If AI unavailable or fails validation
   - Uses actual movie names from database
   - Rich Telugu content with director/heroine info
   - Never uses placeholder like "కొత్త సినిమా"

**Movie Content Example:**
```
తెలుగు సినీ ప్రేక్షకులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్న క్షణం వచ్చేసింది!
Rebel Star ప్రభాస్ 'రాజా సాబ్' సినిమాతో మరోసారి తన అభిమానులను థ్రిల్ చేయడానికి
సిద్ధమవుతున్నారు...

మారుతీ దర్శకత్వంలో వస్తున్న 'రాజా సాబ్' భారీ స్కేల్‌లో తయారవుతోంది.
నిధి అగర్వాల్ హీరోయిన్‌గా నటిస్తున్నారు...
```

**Code:** `lib/pipeline/content-generator.ts`

---

### Stage 4: Image Intelligence

**Priority Order:**

| Priority | Source | When Used |
|----------|--------|-----------|
| 1 | Entity Database | Known actors/actresses (verified Wikipedia title) |
| 2 | Wikipedia Search | English capitalized names (strict validation) |
| 3 | TMDB | Movie topics (movie posters) - fallback |
| 4 | Category Fallback | Based on topic category |

**Image Validation:**
- Rejects generic Wikipedia images (flags, logos, artwork)
- Must have valid `pageid` (real Wikipedia page)
- Filters out production company logos, TV channel logos

**Example Image Sources:**
```
Prabhas → Prabhas_by_Gage_Skidmore.jpg (Wikipedia)
Raja Saab movie → TMDB poster
Tirumala → Tirumala_Temple.jpg (Wikipedia)
Unknown topic → Charminar.jpg (category fallback)
```

**Code:** `lib/content/telugu-templates.ts` → `getEnhancedImage()`

---

### Stage 5: Validation

All content must pass these checks:

| Check | Requirement | Action if Failed |
|-------|-------------|------------------|
| Content Length | ≥ 300 characters | ❌ Skip draft |
| Telugu Percentage | ≥ 20% Telugu chars | ❌ Skip draft |
| Garbled Text | No mojibake | ❌ Skip draft |
| Valid Image | Has image URL | ⚠️ Warning only |
| Confidence | ≥ 50% | ⚠️ Warning only |

**Code:** `lib/pipeline/unified-content-pipeline.ts`

---

### Stage 6: Database Write

Only validated drafts are saved:

```typescript
// Draft structure
{
  title: "ప్రభాస్ 'రాజా సాబ్' - అభిమానులకు థ్రిల్లింగ్ అప్డేట్!",
  title_te: "ప్రభాస్ 'రాజా సాబ్' - అభిమానులకు థ్రిల్లింగ్ అప్డేట్!",
  slug: "prabhas-raja-saab-mjta1gp9-iwod",
  telugu_body: "తెలుగు సినీ ప్రేక్షకులు...",
  body_te: "తెలుగు సినీ ప్రేక్షకులు...",
  excerpt: "Rebel Star ప్రభాస్ 'రాజా సాబ్' సినిమా గురించి...",
  category: "trending",
  status: "draft",
  image_url: "https://image.tmdb.org/t/p/w500/...",
  image_source: "TMDB",
  image_license: "TMDB",
  tags: ["Prabhas", "Rebel Star", "Raja Saab"]
}
```

---

## Confidence Scoring

| Factor | Points |
|--------|--------|
| Content ≥ 800 chars | +30 |
| Content ≥ 500 chars | +20 |
| Content ≥ 300 chars | +10 |
| Telugu ≥ 50% | +25 |
| Telugu ≥ 30% | +15 |
| Telugu ≥ 20% | +10 |
| Wikipedia Image | +20 |
| Entity Detected | +15 |
| Ollama AI Source | +10 |
| Template Source | +7 |
| **Max Score** | **100** |

---

## Troubleshooting

### Problem: Generic/Wrong Images

**Symptoms:** Posts showing Greek symposium scene, flags, logos

**Solution:** The `isGenericWikipediaImage()` filter blocks these. If you see them:
1. The filter might need updating - add the pattern to the blocklist
2. Restart the dev server to apply changes
3. Re-import trends

### Problem: "కొత్త సినిమా" Placeholder

**Symptoms:** Movie posts showing "కొత్త సినిమా" instead of actual movie name

**Solution:** Add the movie to `TELUGU_ENTITIES.movies` in `lib/content/telugu-templates.ts`:

```typescript
{ name: 'New Movie', nameTe: 'న్యూ మూవీ', aliases: ['NM'], year: 2025, hero: 'Actor Name' }
```

### Problem: Low Telugu Percentage

**Symptoms:** Posts failing validation with "Telugu percentage too low"

**Solution:**
1. Check if Ollama is running: `curl http://localhost:11434/api/tags`
2. If not, start it: `ollama serve`
3. Or let it fall back to templates (which have high Telugu %)

### Problem: Content Too Short

**Symptoms:** Posts failing validation with "Content too short"

**Solution:** The template fallback generates 900+ chars. If short content:
1. Check if it's hitting template fallback
2. Look for entity detection issues
3. Check logs for specific topic

---

## Adding New Entities

### Add New Actor

```typescript
// In lib/content/telugu-templates.ts → TELUGU_ENTITIES.actors
{ name: 'New Actor', nameTe: 'న్యూ యాక్టర్', alias: 'Star Name', wikiTitle: 'New_Actor' }
```

### Add New Movie

```typescript
// In lib/content/telugu-templates.ts → TELUGU_ENTITIES.movies
{ name: 'New Movie', nameTe: 'న్యూ మూవీ', aliases: ['NM'], year: 2025, hero: 'Actor Name' }

// Also add extended info:
// In movieExtendedInfo:
'New Movie': { director: 'దర్శకుడు', heroine: 'హీరోయిన్' }
```

---

## File References

| File | Purpose |
|------|---------|
| `lib/pipeline/unified-content-pipeline.ts` | Main pipeline orchestration |
| `lib/pipeline/content-generator.ts` | AI/Template content generation |
| `lib/content/telugu-templates.ts` | Entity database + Image intelligence |
| `lib/trends.ts` | Google Trends fetcher |
| `app/api/trends/route.ts` | Trends import API |
| `scripts/free-first/cli.ts` | CLI commands |

---

*Last updated: January 2025*
