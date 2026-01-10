# Telugu Movie Database Audit Process

## Overview

This document describes the comprehensive data quality audit system for the Telugu movie database. The audit system identifies and fixes incorrect data through cross-verification with known facts (actor birth years, death years, career timelines).

## Audit Session: January 9, 2026

### Issues Found & Fixed

| Movie | Issue | Fix Applied |
|-------|-------|-------------|
| **Sati Tulasi** | Wrong year (1959→1936), wrong cast (NTR→Vemuri Gaggaiah) | Fixed all fields |
| **Dammu (2012)** | Hero was "N.T. Rama Rao" (Sr.) | Changed to "N.T. Rama Rao Jr." |
| **Nandeeswarudu (2012)** | Hero was "N.T. Rama Rao" (Sr.) | Changed to "N.T. Rama Rao Jr." |
| **C.I.D. (1965)** | Year was 1990, unpublished, wrong poster | Fixed year, published, cleared poster |
| **Number One** | slug=1994, db_year=1973 | Fixed year to 1994 |
| **Prema Sagaram** | slug=2011, db_year=1983 | Fixed slug to 1983 |
| **Premalo Pavani Kalyan** | slug=2002, db_year=2003 | Fixed year to 2002 |
| **Simhada Mari Sainya** | slug=1982, db_year=1981 | Fixed slug to 1981 |

### Validated (No Fix Needed)

| Movie | Flag Reason | Validation |
|-------|-------------|------------|
| **Palnati Yuddham (1947)** | NTR before 1949 | Valid - early career (age 24) |
| **Ramayanam (1996)** | Jr NTR before 2001 | Valid - child role (age 13) |
| **Murali Krishna (1964)** | Krishna before 1965 | Valid - debut year (age 21) |

---

## Cross-Verification Audit Script

### Location
```
scripts/cross-verify-audit.ts
```

### Features

1. **Comprehensive Actor Database** (200+ actors with birth years)
   - Legendary actors (NTR, ANR, S.V. Ranga Rao)
   - Star heroes (Krishna, Chiranjeevi, Balakrishna)
   - New generation (Mahesh Babu, Jr. NTR, Prabhas, Allu Arjun)
   - Heroines, character actors, directors

2. **Validation Checks**
   - Actor age validation (can't act before birth)
   - Year/slug mismatch detection
   - Duplicate title+year detection
   - Suspicious data patterns
   - Synopsis data conflict detection (Hollywood synopsis on Telugu movies)

3. **Auto-Fix Capabilities**
   - Year/slug synchronization
   - Data conflict resolution

### Usage

```bash
# Full audit
npx tsx scripts/cross-verify-audit.ts

# Audit specific actor
npx tsx scripts/cross-verify-audit.ts --actor="Krishna"

# Auto-fix obvious issues
npx tsx scripts/cross-verify-audit.ts --fix

# Export issues to JSON
npx tsx scripts/cross-verify-audit.ts --export

# Filter by severity
npx tsx scripts/cross-verify-audit.ts --severity=HIGH

# Filter by decade
npx tsx scripts/cross-verify-audit.ts --decade=1990
```

### Severity Levels

| Severity | Description | Auto-Fixable |
|----------|-------------|--------------|
| 🔴 CRITICAL | Impossible data (actor before birth) | No |
| 🟠 HIGH | Suspicious data (actor too young) | No |
| 🟡 MEDIUM | Year/slug mismatch, duplicates | Yes |
| 🟢 LOW | Minor issues (future dates) | Yes |

---

## Validation Logic

### Actor Age Validation

```typescript
const MIN_LEAD_AGE = 15;      // Minimum age for lead roles
const MIN_CHILD_ROLE_AGE = 5; // Minimum age for child roles

// Check: actorAge = movieYear - birthYear
if (actorAge < 0) → CRITICAL: Impossible
if (actorAge < 5) → CRITICAL: Too young even for child role
if (actorAge < 15) → HIGH: Verify if child role
```

### Year/Slug Validation

```typescript
// Extract year from slug (e.g., "movie-name-2012" → 2012)
const slugYear = slug.match(/-(\d{4})$/)?.[1];

// Compare with database year
if (slugYear !== dbYear) → MEDIUM: Mismatch
```

### Synopsis Validation

```typescript
// Detect Hollywood movie synopses mixed with Telugu movies
const patterns = [
  /American (crime |action )?film/i,
  /Hollywood/i,
  /Los Angeles|New York/i,
  /Warner Bros|Universal/i
];
```

---

## Integration with Pipeline

### Enrichment Order (enrich-master.ts)

1. **Images** - Poster/backdrop enrichment
2. **Cast/Crew** - Hero, heroine, director
3. **Editorial Scores** - Rating derivation
4. **Validation** - Cross-verify audit ← **NEW**
5. **Synopsis** - Plot enrichment
6. **Smart Reviews** - Review derivation

### Running Full Pipeline

```bash
# Full enrichment + validation
npx tsx scripts/enrich-master.ts --full --execute

# Validation only
npx tsx scripts/cross-verify-audit.ts --export

# Fix issues
npx tsx scripts/cross-verify-audit.ts --fix
```

---

## Actor Registry

The script maintains a comprehensive database of 200+ actors with:

- **Birth Year**: For age validation
- **Aliases**: Alternative name spellings (Jr. NTR, N.T. Rama Rao Jr., NTR Jr.)
- **Coverage**: Heroes, heroines, character actors, directors

### Example Entries

```typescript
{
  'N.T. Rama Rao': 1923,           // Senior NTR
  'N.T. Rama Rao Jr.': 1983,       // Jr. NTR
  'Jr. NTR': 1983,                 // Alias
  'Chiranjeevi': 1955,
  'Megastar Chiranjeevi': 1955,    // Alias with title
  'Samantha': 1987,
  'Samantha Ruth Prabhu': 1987,    // Full name
}
```

---

## Reports

Reports are saved to `docs/` directory:

```
docs/audit-report-2026-01-09.json
```

### Report Structure

```json
{
  "generatedAt": "2026-01-09T...",
  "stats": {
    "totalMovies": 1000,
    "totalIssues": 7,
    "bySeverity": { "HIGH": 3, "MEDIUM": 4 },
    "byType": { "ACTOR_TOO_YOUNG": 2, "YEAR_SLUG_MISMATCH": 4 },
    "byDecade": { "1970": 2, "1980": 1 }
  },
  "issues": [...]
}
```

---

## Best Practices

1. **Run audit before major releases** - Catch data issues early
2. **Review CRITICAL issues manually** - Don't auto-fix impossible data
3. **Export reports for tracking** - Keep history of fixes
4. **Filter by decade for focused audits** - `--decade=1960` for classics
5. **Use actor filter for filmography audits** - `--actor="Krishna"`

---

## Related Scripts

| Script | Purpose |
|--------|---------|
| `cross-verify-audit.ts` | Main audit & validation |
| `audit-krishna-filmography.ts` | Krishna-specific audit |
| `cast-validator.ts` | TMDB/Wikipedia cross-reference |
| `enrich-master.ts` | Master enrichment orchestrator |
| `enrich-from-wikipedia.ts` | Wikipedia data enrichment |

---

## Enrichment Commands

### Quick Enrichment

```bash
# Wikipedia enrichment (works standalone)
npx tsx scripts/enrich-from-wikipedia.ts --limit=100

# Dry run first
npx tsx scripts/enrich-from-wikipedia.ts --limit=50 --dry-run

# Filter by actor
npx tsx scripts/enrich-from-wikipedia.ts --actor=Krishna --limit=100
```

### Full Pipeline Status

```bash
# Check current enrichment status
npx tsx scripts/enrich-master.ts --status
```

### Current Coverage (as of 2026-01-09)

| Field | Coverage |
|-------|----------|
| Poster image | 86% (4282/4971) |
| Hero | 100% (4963/4971) |
| Heroine | 99% (4927/4971) |
| Director | 100% (4971/4971) |
| Music director | 50% (2490/4971) |
| Producer | 41% (2026/4971) |
| Supporting cast | 40% (1998/4971) |
| TMDB ID | 57% (2820/4971) |
| Editorial score | 25% (1219/4971) |

---

## Changelog

### v2.0 (2026-01-09)
- Added 200+ actors to registry
- Added synopsis conflict detection
- Added decade filtering
- Added JSON export
- Improved auto-fix capabilities

### v1.0 (Initial)
- Basic actor age validation
- Year/slug mismatch detection
- Duplicate detection

