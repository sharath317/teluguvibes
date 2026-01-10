# Krishna Filmography Enrichment - POC Documentation

**Date:** January 9, 2026  
**Status:** Phase 1 Complete  
**Actor:** Superstar Krishna (Ghattamaneni Siva Rama Krishna)

---

## Executive Summary

This document outlines the systematic approach taken to audit, validate, and enrich actor Krishna's filmography in the Telugu Portal database. This serves as a **Proof of Concept (POC)** for a scalable enrichment pipeline that can be applied to other actors.

---

## Phase 1: Audit & Duplicate Resolution ✅

### Initial State
| Metric | Count |
|--------|-------|
| Total Movies | 387 |
| Duplicates Detected | 3 pairs |
| Missing Posters | 103 |
| With TMDB ID | 83 |

### Duplicate Issues Identified & Resolved

| Duplicate Pair | Root Cause | Resolution |
|----------------|------------|------------|
| Nagastram (1990) ↔ Nagastharam (1991) | Spelling variant | Deleted Nagastharam (1991) |
| Raktha Tarpanam (1992) ↔ Raktha Tharpanam (1992) | Spelling variant | Deleted Raktha Tharpanam (1992) |
| Samsaram (1975) ↔ Pandati Samsaram (1975) | Incorrect title | Renamed to "Pandanti Samsaram", deleted duplicate |

### Data Correction Applied
- **Samsaram (1975)** was incorrectly titled - the correct name is **Pandanti Samsaram** per [Wikipedia](https://en.wikipedia.org/wiki/Pandanti_Samsaram)
- **Samsaram (1950)** is a completely different movie (NTR/ANR, Dir: L.V. Prasad) - correctly kept separate per [Wikipedia](https://en.wikipedia.org/wiki/Samsaram_(1950_film))

### Final State After Phase 1
| Metric | Count | Change |
|--------|-------|--------|
| Total Movies | 380 | -7 |
| Duplicates | 0 | ✅ Resolved |
| Missing Posters | 100 | -3 |
| With TMDB ID | 83 | - |
| Poster Coverage | 73.7% | +0.3% |

---

## Phase 2: Cross-Verification (Partial) ⏳

### Scripts Enhanced for Actor-Specific Filtering

| Script | Enhancement | Status |
|--------|-------------|--------|
| `validate-all.ts` | Added `--actor=NAME` filter | ✅ Enhanced (missing dependency) |
| `enrich-from-wikipedia.ts` | Added Telugu Wikipedia as PRIMARY source | ✅ Enhanced |
| `enrich-from-wikipedia.ts` | Added `--actor=NAME` filter | ✅ Enhanced |
| `enrich-waterfall.ts` | Added `--actor=NAME` filter | ✅ Enhanced |
| `cast-validator.ts` | Already supports `--actor` | ✅ Working |

### Cast Validation Results
```
Total movies validated: 50
Valid: 45 (90%)
Invalid: 5 (with suggestions)
```

Suggestions identified:
- `Goodachari 116 (1966)`: heroine "Savitri" → should be "Radha Kumari"
- `Iddaru Monagallu (1967)`: heroine/director corrections suggested
- `Amayakudu (1968)`: hero field has multiple names, needs cleanup

---

## Data Sources Available (15 Total)

### Wikipedia Ecosystem (PRIMARY)
| Source | Priority | Notes |
|--------|----------|-------|
| te.wikipedia.org | 1st | Telugu Wikipedia - best for Telugu films |
| en.wikipedia.org | 2nd | English Wikipedia - broader coverage |
| commons.wikimedia.org | 3rd | Wikimedia Commons - images |
| Wikidata SPARQL | 4th | Structured data |

### Movie Databases
| Source | Coverage | Notes |
|--------|----------|-------|
| TMDB | 83 movies (21.8%) | Good for 1990s+ films |
| OMDB | Requires IMDB ID | Limited direct search |
| IMDB | Via IDs only | Reference source |

### Indian Film Sources
| Source | Use Case |
|--------|----------|
| MovieBuff | Modern films |
| Cinemaazi | Classic Telugu cinema |
| JioSaavn | Music/soundtrack data |

### Other Sources
| Source | Use Case |
|--------|----------|
| Letterboxd | Community posters |
| Google Knowledge Graph | Metadata verification |
| Internet Archive | Vintage posters |
| Groq AI | Synopsis generation (last resort) |

---

## Missing Posters Analysis

### By Decade
| Decade | Missing | % of Decade | Notes |
|--------|---------|-------------|-------|
| 1960s | 6 | ~15% | Very limited Wikipedia coverage |
| 1970s | 40 | ~26% | **Highest gap** - vintage era |
| 1980s | 34 | ~28% | Mass film era |
| 1990s | 14 | ~32% | Better coverage available |
| 2000s+ | 6 | ~30% | Should be findable |

### Key Insight
The **1970s** has the highest number of missing posters (40 movies). This era predates digital archiving, and many films lack Wikipedia articles. Manual sourcing from:
- Vintage stores (vintagestore.in)
- Telugu film archives
- Film magazines (Vijayachitra, etc.)
- Personal collections

---

## Scripts Reference

### Working Scripts
```bash
# Full audit with reports
npx tsx scripts/audit-krishna-filmography.ts

# Cast validation against TMDB/Wikipedia/Wikidata
npx tsx scripts/cast-validator.ts --actor="Krishna" --validate-filmography

# Wikidata enrichment
npx tsx scripts/enrich-from-wikidata.ts --limit=500

# Wikipedia enrichment (Telugu → English fallback)
npx tsx scripts/enrich-from-wikipedia.ts --actor=Krishna --limit=100
```

### Scripts Needing Dependency Fixes
```bash
# Missing: lib/validation/multi-source-validator
npx tsx scripts/validate-all.ts --actor=Krishna --auto-fix

# Missing: lib/pipeline/execution-controller
npx tsx scripts/enrich-images-fast.ts --actor=Krishna
npx tsx scripts/enrich-cast-crew.ts --actor=Krishna
```

---

## Next Steps (Proposed)

### Immediate (Phase 3)

#### 3.1 Fix Missing Module Dependencies
```
lib/validation/multi-source-validator.ts  → Create or locate
lib/pipeline/execution-controller.ts      → Create or locate
```

#### 3.2 Manual Image Sourcing for High-Priority Films
Focus on iconic Krishna films missing posters:
- Gudachari 003 (1971) - Spy film series
- Captain Krishna (1979) - Action classic
- Nagastram (1990) - Later era

#### 3.3 Wikipedia Article Creation
For films with no Wikipedia coverage, consider creating stub articles on te.wikipedia.org to improve discoverability.

### Medium Term (Phase 4)

#### 4.1 Expand to Other Actors
Apply the same pipeline to:
- NTR Sr. filmography
- ANR filmography
- Chiranjeevi filmography

#### 4.2 Automate Duplicate Detection
Enhance `audit-krishna-filmography.ts` to:
- Use fuzzy matching with Levenshtein distance
- Cross-reference TMDB IDs automatically
- Flag potential duplicates for review

#### 4.3 Image Validation Pipeline
- Verify image URLs are still accessible
- Check image dimensions meet quality standards
- Detect placeholder images

### Long Term (Phase 5)

#### 5.1 Community Contribution Portal
Allow users to:
- Submit missing posters
- Suggest corrections
- Verify data accuracy

#### 5.2 Archival Partnerships
Partner with:
- Telugu Film Development Corporation
- Film Heritage Foundation
- University archives

---

## Files Generated

| File | Description |
|------|-------------|
| `docs/KRISHNA_AUDIT_REPORT.json` | Full JSON audit data |
| `docs/KRISHNA_AUDIT_REPORT.csv` | CSV for spreadsheet analysis |
| `docs/KRISHNA_CROSS_VERIFICATION_REPORT.md` | Cross-verification summary |
| `docs/KRISHNA_FILMOGRAPHY_ENRICHMENT.md` | This document |

---

## Commands Quick Reference

```bash
# Run full audit
npx tsx scripts/audit-krishna-filmography.ts

# Validate cast data
npx tsx scripts/cast-validator.ts --actor="Krishna" --validate-filmography

# Enrich from Wikipedia (Telugu first)
npx tsx scripts/enrich-from-wikipedia.ts --actor=Krishna --limit=100

# Data quality check
npx tsx scripts/validate-and-fix-data.ts

# Wikidata enrichment
npx tsx scripts/enrich-from-wikidata.ts --limit=500
```

---

## Appendix: 100 Movies Missing Posters

<details>
<summary>Click to expand full list</summary>

### 1960s (6)
1. Hantakulostunnaru Jagratha (1966)
2. Attagaru Kotha Kodalu (1968)
3. Muhrutha Balam (1969)
4. Bhale Abbailu (1969)
5. Annadammulu (1969)
6. Karpoora Harathi (1969)

### 1970s (40)
7. Andarki Monagadu (1970)
8. Paga Sadista (1970)
9. Gudachari 003 (1971)
10. Monagadostunnadu Jagartta (1972)
11. Abbaigaru Ammaigaru (1972)
12. Bale Mosagadu (1972)
13. Nijam Nirupista (1972)
14. Menakodalu (1972)
15. Maa Oori Monagallu (1972)
16. Guduputani (1972)
17. Antha Mana Manichike (1972)
18. Kattula Rattayya (1972)
19. Hantakulu Devantakulu (1972)
20. Kodalupilla (1972)
21. Visali (1973)
22. Sthri Chandra Kala (1973)
23. Sneha Bandham (1973)
24. Intiniti Katha (1974)
25. Uthama Illalu (1974)
26. Manshulu Mati Bommalu (1974)
27. Gali Patalu (1974)
28. Amma Manasu (1974)
29. Peddalu Marali (1974)
30. Ramayya Thandri (1975)
31. Santanam Soubhagyam (1975)
32. Kothakapuram (1975)
33. Abhimanavathi (1975)
34. Cheekati Velugulu (1975)
35. Rakthasambandhalu (1975)
36. Manavoori Katha (1976)
37. Ramarajyamlo Rakthapasam (1976)
38. Eenatibandham ye Natido (1977)
39. Janmajanmala Bandham (1977)
40. Indradhanasu (1978)
41. Muthaiduva (1979)
42. Sanku Teertham (1979)
43. Yevadabbasommu (1979)
44. Dongalaku Savaal (1979)
45. Samajaniki Savaal (1979)
46. Captain Krishna (1979)

### 1980s (34)
47. Kiladi Krishnudu (1980)
48. Adhrustavanthudu (1980)
49. Ramudu Parasuramudu (1980)
50. Ragile Hrudayalu (1980)
51. Ammayi Mogudu Mamaku Yamudu (1980)
52. Hare Krishna Hallo Radha (1980)
53. Bhogimanthulu (1981)
54. Antham Kaadidi Aarambham (1981)
55. Jagamondi (1981)
56. Bhoga Bagyalu (1981)
57. Mayadari Alludu (1981)
58. Jathagadu (1981)
59. Shamshare Shankar (1982)
60. Garuda Rekhe (1982)
61. Prema Nakshathram (1982)
62. Jagannatha Radhachakralu (1982)
63. Krishnaarjunulu (1982)
64. Ekalavya (1982)
65. Monagadu Vastunnadu Jagratha (1983)
66. Kanne Donga (1983)
67. Kala Yamudu (1983)
68. Lankebindelu (1983)
69. Pralaya Gharjana (1983)
70. Bangaru Kapuram (1984)
71. Pulijoodam (1984)
72. Uddhandudu (1984)
73. Kirai Alludu (1984)
74. Maha Sangramam (1985)
75. Andharikante Monagadu (1985)
76. Palnati Simham (1985)
77. Naa Pilupe Prabahanajam (1986)
78. Brahma Nayudu (1987)
79. Dorakani Donga (1988)
80. Parthudu (1989)

### 1990s (14)
81. Prajala Manishi (1990)
82. Nagastram (1990)
83. Yes Nenante Nene (1994)
84. Raitu Bharatam (1994)
85. Gharana Alludu (1994)
86. Super Mogudu (1995)
87. Puttinti Gowravam (1996)
88. Akkum Bakkum (1996)
89. Sampradayam (1996)
90. Adhirindhi Guru (1997)
91. Bobbili Dora (1997)
92. Sambhavam (1998)
93. Vareva Moguda (1998)
94. Maanavudu Daanavudu (1999)

### 2000s+ (6)
95. Yee Taram Nehru (2000)
96. CBI Officer (2004)
97. 24 Gantalu (2004)
98. Evaru Nenu (2005)
99. Amma Nanna Lekunte (2007)
100. Sevakudu (2013)

</details>

---

**Last Updated:** January 9, 2026  
**Maintained By:** Telugu Portal Team

