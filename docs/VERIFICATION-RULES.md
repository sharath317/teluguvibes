# Verification Rules

> **Document Version:** 1.0
> **Last Updated:** January 8, 2026
> **Purpose:** Define how facts are verified and approved in the Movie Intelligence Platform

---

## Overview

This document outlines the verification rules for the Telugu Portal Movie Intelligence Platform. All data displayed to users must pass through a verification process to ensure accuracy and reliability.

---

## 1. Claim Classification

All data fields are classified into three categories:

### 1.1 Facts (Verifiable)
Fields that can be verified from external authoritative sources:

| Field | Description | Verification Sources |
|-------|-------------|---------------------|
| `title` | Movie title | TMDB, IMDB, Wikipedia |
| `release_date` | Release date | TMDB, IMDB, Official |
| `director` | Director name | TMDB, IMDB, Wikipedia |
| `cast` | Actor names | TMDB, IMDB |
| `runtime` | Duration in minutes | TMDB, IMDB |
| `genres` | Genre categories | TMDB, IMDB |
| `certification` | Age rating (U/A/A) | CBFC, TMDB |
| `imdb_rating` | IMDB user rating | IMDB |
| `budget` | Production budget | TMDB, News |
| `box_office` | Box office collection | News, Official |

### 1.2 Opinions (Subjective)
Fields representing subjective assessments:

| Field | Description | Source |
|-------|-------------|--------|
| `avg_rating` | Editorial rating | Internal |
| `verdict` | Review verdict | Internal |
| `recommendation` | Watch status | Internal |
| `cultural_significance` | Cultural impact | Internal |
| `mood_tags` | Mood descriptors | Internal |

### 1.3 Derived (Calculated)
Fields calculated from other data:

| Field | Derived From |
|-------|--------------|
| `weighted_rating` | avg_rating + imdb_rating |
| `success_rate` | hits / total movies |
| `is_classic` | age + rating + cultural significance |
| `decade` | release_year |

---

## 2. Source Trust Levels

Each data source has an assigned trust level:

| Source | Trust Level | Description |
|--------|-------------|-------------|
| Official (Studio) | 0.98 | Official studio announcements |
| Admin Verified | 0.95 | Manually verified by admin |
| TMDB | 0.95 | The Movie Database API |
| IMDB | 0.94 | Internet Movie Database |
| Wikidata | 0.90 | Structured Wikipedia data |
| Wikipedia | 0.85 | Wikipedia articles |
| Google KG | 0.85 | Google Knowledge Graph |
| Internet Archive | 0.80 | Historical records |
| Internal | 0.70 | User-submitted data |
| News Sources | 0.60 | News articles |
| Social Media | 0.40 | Twitter, YouTube, etc. |

---

## 3. Consensus Requirements

### 3.1 Auto-Approval Rules

A fact is automatically approved when ALL of the following conditions are met:

1. **Minimum Sources:** At least 3 independent sources provide the same value
2. **Consensus Score:** ≥ 75% of sources agree on the value
3. **No Critical Conflicts:** No conflicting values from high-trust sources (≥0.9)
4. **Field Type:** The field is classified as a "fact" (not opinion or derived)

### 3.2 Manual Review Required

A fact requires manual review when:

1. **Source Conflict:** Two or more sources with trust ≥0.8 disagree
2. **Critical Field:** The field is `director`, `hero`, or `release_date`
3. **Low Consensus:** Consensus score < 75%
4. **Single Source:** Only one source available for verification

### 3.3 Conflict Severity Levels

| Severity | Criteria | Action |
|----------|----------|--------|
| **Minor** | Gap > 0.4 between dominant and second value | Auto-resolve using dominant |
| **Major** | Gap 0.2-0.4 between values | Admin verification recommended |
| **Critical** | Gap < 0.2 between values | Manual review required |

---

## 4. Field-Specific Rules

### 4.1 Release Date
- Primary source: TMDB
- Tolerance: ±7 days allowed between sources
- Year-only matching accepted for older films (pre-1990)

### 4.2 Director
- Primary source: TMDB
- Exact name match required (case-insensitive)
- Multi-director films: All must be listed

### 4.3 Cast
- Primary source: TMDB credits
- Lead actors (hero/heroine): Must match across sources
- Supporting cast: 2+ source agreement

### 4.4 Runtime
- Primary source: TMDB
- Tolerance: ±5 minutes

### 4.5 Genres
- Union of genres from all sources accepted
- Minimum 2 sources required for each genre

---

## 5. Verification Workflow

```
Source Data → Classify Claims → Calculate Consensus
                                      ↓
                          ┌───────────┴───────────┐
                          │                       │
                    Auto-Approve          Queue for Review
                    (3+ sources,          (conflicts,
                     ≥75% consensus)       low confidence)
                          │                       │
                          ↓                       ↓
                    Store & Index          Admin Dashboard
                                                  │
                                          ┌───────┴───────┐
                                          │               │
                                       Approve         Reject
                                          │               │
                                    Store & Index    Keep Original
```

---

## 6. Data Immutability

### 6.1 Verified Facts
- Once verified, facts are locked by default
- Only admins can unlock verified facts
- Changes to locked facts require justification
- All changes are logged in the audit trail

### 6.2 Lock Levels

| Level | Description | Unlock By |
|-------|-------------|-----------|
| Auto-Verified | System-approved consensus | Any admin |
| Admin-Verified | Manually verified by admin | Same admin or super-admin |
| Locked | Explicitly locked | Super-admin only |

---

## 7. Verification Metrics

### 7.1 System KPIs

| Metric | Target | Description |
|--------|--------|-------------|
| Auto-approval rate | > 80% | Facts auto-approved without review |
| Verification queue size | < 100 | Items pending review |
| Average resolution time | < 24h | Time to resolve conflicts |
| False approval rate | < 1% | Incorrect auto-approvals |

### 7.2 Coverage Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| 3-source coverage | > 70% | Facts with 3+ source verification |
| Critical field coverage | 100% | Director, cast, release verified |
| Consensus score average | > 0.85 | Average confidence across facts |

---

## 8. Exception Handling

### 8.1 No External Source Available
When no external source exists:
1. Mark data as "internal only"
2. Set confidence to 0.5
3. Display "Unverified" indicator
4. Queue for manual verification

### 8.2 Conflicting Official Sources
When official sources conflict:
1. Flag as "critical conflict"
2. Preserve all source values
3. Require super-admin resolution
4. Document resolution reasoning

### 8.3 Retroactive Corrections
When a verified fact is later found incorrect:
1. Log the correction request
2. Compare with original sources
3. Admin reviews and approves/rejects
4. If approved, update fact and unlock temporarily
5. Re-verify from updated sources
6. Re-lock with new verification

---

## 9. Audit Requirements

All verification actions must be logged:

```json
{
  "action": "verify",
  "entity_type": "movie",
  "entity_id": "uuid",
  "field": "director",
  "before_value": null,
  "after_value": "S.S. Rajamouli",
  "sources": ["tmdb", "imdb", "wikipedia"],
  "consensus_score": 0.95,
  "verified_by": "auto",
  "timestamp": "2026-01-08T10:30:00Z"
}
```

---

## 10. Compliance

This verification system ensures:

1. **Zero Hallucination:** All displayed facts trace to verified sources
2. **Auditability:** Complete log of all changes and verifications
3. **Transparency:** Source attribution visible to admins
4. **Correctability:** Errors can be identified and fixed
5. **Accountability:** All actions traceable to users

---

*Document maintained by the Telugu Portal Engineering Team*


