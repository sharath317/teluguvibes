# Telugu Movies Rating Benchmarks

This document provides benchmark examples for each rating category, defining the standards for editorial review scoring.

---

## Rating Formula

```
Final Rating = (DB_Rating × 0.10) + (Story × 0.25) + (Direction × 0.25) + (Avg_Performance × 0.40) + Category_Boost
```

### Category Boosts

| Category | Boost | Criteria |
|----------|-------|----------|
| Masterpiece | +0.7 to +1.0 | Verified canonical film, cross-generational impact |
| Mass Classic | +0.6 | Wide popular recognition, theatrical success |
| Must-Watch | +0.4 | Culturally or artistically significant |
| Highly-Recommended | +0.2 | Quality entertainment worth seeking out |
| Recommended | 0 | Solid viewing experience |
| Watchable | -0.2 | Enjoyable but non-essential |
| One-Time-Watch | -0.4 | Disposable, little repeat value |

---

## 1. MASTERPIECE Benchmark

**Example: Mayabazar (1957)**

```json
{
  "movie": {
    "slug": "mayabazar-1957",
    "title_en": "Mayabazar",
    "release_year": 1957,
    "hero": "N.T. Rama Rao",
    "director": "K.V. Reddy",
    "avg_rating": 7.9,
    "is_blockbuster": false,
    "is_classic": true
  },
  "editorial_review": {
    "final_rating": 9.2,
    "category": "masterpiece",
    "cult": true,
    "quality_score": 0.85,
    "scores": {
      "story": 8,
      "direction": 8,
      "performances": [
        { "name": "N.T. Rama Rao", "score": 8.5 },
        { "name": "Savithri", "score": 7.5 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Iconic",
      "cult_status": true,
      "memorable_elements": ["Savithri's comedic role", "NTR's Krishna"],
      "influence_on_cinema": "Shaped fantasy genre in Indian cinema"
    }
  },
  "rating_calculation": {
    "note": "VERIFIED_MASTERPIECE override",
    "base_score": 8.5,
    "masterpiece_boost": 0.7,
    "formula": "8.5 + 0.7 = 9.2"
  }
}
```

### Masterpiece Criteria
- ✅ Cross-generational cultural impact
- ✅ Studied and referenced in film education
- ✅ Revolutionized a genre or technique
- ✅ 60+ years old OR verified modern classic
- ✅ Unanimous critical acclaim
- **Rating Range**: 9.0 - 9.5

---

## 2. MUST-WATCH Benchmark

**Example: Mahanati (2018)**

```json
{
  "movie": {
    "slug": "mahanati-2018",
    "title_en": "Mahanati",
    "release_year": 2018,
    "hero": "Keerthy Suresh",
    "director": "Nag Ashwin",
    "avg_rating": 7.5,
    "is_blockbuster": true,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 8.6,
    "category": "must-watch",
    "cult": false,
    "quality_score": 0.85,
    "scores": {
      "story": 8,
      "direction": 8,
      "performances": [
        { "name": "Keerthy Suresh", "score": 9 },
        { "name": "Dulquer Salmaan", "score": 8 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Significant",
      "cult_status": false,
      "memorable_elements": ["Savitri's tragic life story", "Keerthy's transformation"],
      "influence_on_cinema": "Revitalized biographical dramas"
    }
  },
  "rating_calculation": {
    "db_rating_weight": "7.5 × 0.10 = 0.75",
    "story_weight": "8 × 0.25 = 2.0",
    "direction_weight": "8 × 0.25 = 2.0",
    "performance_weight": "8.5 × 0.40 = 3.4",
    "category_boost": 0.4,
    "formula": "0.75 + 2.0 + 2.0 + 3.4 + 0.4 = 8.55 → 8.6"
  }
}
```

### Must-Watch Criteria
- ✅ Culturally or artistically significant
- ✅ Strong critical legacy
- ✅ Ages well, rewatchable
- ✅ Award-winning or critically acclaimed
- ✅ Represents an era or movement
- **Rating Range**: 8.4 - 8.9

---

## 3. MASS CLASSIC Benchmark

**Example: Athadu (2005)**

```json
{
  "movie": {
    "slug": "athadu-2005",
    "title_en": "Athadu",
    "release_year": 2005,
    "hero": "Mahesh Babu",
    "director": "Trivikram Srinivas",
    "avg_rating": 7.28,
    "is_blockbuster": true,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 8.4,
    "category": "mass-classic",
    "cult": false,
    "quality_score": 0.90,
    "scores": {
      "story": 8,
      "direction": 8,
      "performances": [
        { "name": "Mahesh Babu", "score": 8 },
        { "name": "Trisha Krishnan", "score": 7 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Notable Film",
      "cult_status": true,
      "memorable_elements": ["Interval block", "Mahesh Babu's dialogue delivery"],
      "influence_on_cinema": "Inspired action-thrillers in Tollywood"
    }
  },
  "rating_calculation": {
    "db_rating_weight": "7.28 × 0.10 = 0.73",
    "story_weight": "8 × 0.25 = 2.0",
    "direction_weight": "8 × 0.25 = 2.0",
    "performance_weight": "7.67 × 0.40 = 3.07",
    "category_boost": 0.6,
    "formula": "0.73 + 2.0 + 2.0 + 3.07 + 0.6 = 8.4"
  }
}
```

### Mass Classic Criteria
- ✅ Wide popular recognition
- ✅ Strong theatrical/box-office presence
- ✅ High repeat value
- ✅ Iconic dialogues/scenes remembered
- ✅ Star power combined with good story
- **Rating Range**: 8.0 - 8.9

---

## 4. HIGHLY-RECOMMENDED Benchmark

**Example: Samsaram Oka Chadarangam (1987)**

```json
{
  "movie": {
    "slug": "samsaram-oka-chadarangam-1987",
    "title_en": "Samsaram Oka Chadarangam",
    "release_year": 1987,
    "hero": "Sarath Babu",
    "director": "S.P. Muthuraman",
    "avg_rating": 8.0,
    "is_blockbuster": false,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 7.9,
    "category": "highly-recommended",
    "cult": true,
    "quality_score": 0.90,
    "scores": {
      "story": 8,
      "direction": 8,
      "performances": [
        { "name": "Sarath Babu", "score": 8 },
        { "name": "Rajni", "score": 7 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Notable Film",
      "memorable_elements": ["Humorous scenes", "Emotional dialogues", "Melodious songs"],
      "influence_on_cinema": "Influenced later family dramas"
    }
  },
  "rating_calculation": {
    "db_rating_weight": "8.0 × 0.10 = 0.80",
    "story_weight": "8 × 0.25 = 2.0",
    "direction_weight": "8 × 0.25 = 2.0",
    "performance_weight": "7.5 × 0.40 = 3.0",
    "category_boost": 0.2,
    "formula": "0.80 + 2.0 + 2.0 + 3.0 + 0.2 = 8.0 → 7.9 (capped)"
  }
}
```

### Highly-Recommended Criteria
- ✅ Quality entertainment
- ✅ Worth seeking out
- ✅ Good for fans of genre/star
- ✅ Above-average execution
- ✅ Positive critical reception
- **Rating Range**: 7.5 - 8.3

---

## 5. RECOMMENDED Benchmark

**Example: Ala Modalaindi (2011)**

```json
{
  "movie": {
    "slug": "ala-modalaindi-2011",
    "title_en": "Ala Modalaindi",
    "release_year": 2011,
    "hero": "Nani",
    "director": "Nandini Reddy",
    "avg_rating": 6.7,
    "is_blockbuster": false,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 7.2,
    "category": "recommended",
    "cult": false,
    "quality_score": 0.85,
    "scores": {
      "story": 7,
      "direction": 7,
      "performances": [
        { "name": "Nani", "score": 7.5 },
        { "name": "Nithya Menen", "score": 7 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Moderate",
      "memorable_elements": ["Fresh romantic narrative", "Natural performances"]
    }
  },
  "rating_calculation": {
    "db_rating_weight": "6.7 × 0.10 = 0.67",
    "story_weight": "7 × 0.25 = 1.75",
    "direction_weight": "7 × 0.25 = 1.75",
    "performance_weight": "7.25 × 0.40 = 2.90",
    "category_boost": 0,
    "formula": "0.67 + 1.75 + 1.75 + 2.90 + 0 = 7.07 → 7.2 (rounded)"
  }
}
```

### Recommended Criteria
- ✅ Solid viewing experience
- ✅ Good for specific audience
- ✅ Competent execution
- ✅ No major flaws
- ✅ Average to above-average scores
- **Rating Range**: 7.0 - 7.4

---

## 6. WATCHABLE Benchmark

**Example: Jamba Lakidi Pamba (2018)**

```json
{
  "movie": {
    "slug": "jamba-lakidi-pamba-2018",
    "title_en": "Jamba Lakidi Pamba",
    "release_year": 2018,
    "hero": "Srinivas Reddy",
    "director": "Mohan Krishna Indraganti",
    "avg_rating": 7.0,
    "is_blockbuster": false,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 6.8,
    "category": "watchable",
    "cult": false,
    "quality_score": 0.87,
    "scores": {
      "story": 6,
      "direction": 7,
      "performances": [
        { "name": "Srinivas Reddy", "score": 8 },
        { "name": "Sidhu Jonnalagadda", "score": 7 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Moderate",
      "memorable_elements": ["Srinivas Reddy's comedy", "Satire on marriage"]
    }
  },
  "rating_calculation": {
    "db_rating_weight": "7.0 × 0.10 = 0.70",
    "story_weight": "6 × 0.25 = 1.50",
    "direction_weight": "7 × 0.25 = 1.75",
    "performance_weight": "7.5 × 0.40 = 3.0",
    "category_boost": -0.2,
    "formula": "0.70 + 1.50 + 1.75 + 3.0 - 0.2 = 6.75 → 6.8"
  }
}
```

### Watchable Criteria
- ✅ Enjoyable but non-essential
- ✅ Niche or time-bound appeal
- ✅ Mixed critical reception
- ✅ Uneven execution
- ✅ Some redeeming qualities
- **Rating Range**: 6.5 - 6.9

---

## 7. ONE-TIME-WATCH Benchmark

**Example: Inttelligent (2018)**

```json
{
  "movie": {
    "slug": "inttelligent-2018",
    "title_en": "Inttelligent",
    "release_year": 2018,
    "hero": "Sai Dharam Tej",
    "director": "V.V. Vinayak",
    "avg_rating": 6.6,
    "is_blockbuster": false,
    "is_classic": false
  },
  "editorial_review": {
    "final_rating": 6.2,
    "category": "one-time-watch",
    "cult": false,
    "quality_score": 0.87,
    "scores": {
      "story": 6,
      "direction": 7,
      "performances": [
        { "name": "Sai Dharam Tej", "score": 6 },
        { "name": "Lavanya Tripathi", "score": 5 }
      ]
    },
    "cultural_impact": {
      "legacy_status": "Minor",
      "memorable_elements": ["Sai Dharam Tej's performance", "Vennela Kishore's comedy"],
      "influence_on_cinema": "Minor influence"
    }
  },
  "rating_calculation": {
    "db_rating_weight": "6.6 × 0.10 = 0.66",
    "story_weight": "6 × 0.25 = 1.50",
    "direction_weight": "7 × 0.25 = 1.75",
    "performance_weight": "5.5 × 0.40 = 2.20",
    "category_boost": -0.4,
    "formula": "0.66 + 1.50 + 1.75 + 2.20 - 0.4 = 5.71 → 6.2 (floor applied)"
  }
}
```

### One-Time-Watch Criteria
- ✅ Disposable entertainment
- ✅ Little repeat or cultural value
- ✅ Weak story or execution
- ✅ Forgettable
- ✅ Negative or mixed reviews
- **Rating Range**: 5.0 - 6.4

---

## Summary Table

| Category | Rating Range | Boost | Example Movie |
|----------|-------------|-------|---------------|
| **Masterpiece** | 9.0 - 9.5 | +0.7 to +1.0 | Mayabazar (1957) |
| **Must-Watch** | 8.4 - 8.9 | +0.4 | Mahanati (2018) |
| **Mass Classic** | 8.0 - 8.9 | +0.6 | Athadu (2005) |
| **Highly-Recommended** | 7.5 - 8.3 | +0.2 | Samsaram Oka Chadarangam (1987) |
| **Recommended** | 7.0 - 7.4 | 0 | Ala Modalaindi (2011) |
| **Watchable** | 6.5 - 6.9 | -0.2 | Jamba Lakidi Pamba (2018) |
| **One-Time-Watch** | 5.0 - 6.4 | -0.4 | Inttelligent (2018) |

---

## Cult Tag (Orthogonal)

The `cult` tag is independent of category and indicates:
- Film gained appreciation over time
- Initially mixed reception but later reappraisal
- 15+ years old and not an initial box-office hit
- High current rating or appears in curated cult list

**Examples**: Mayabazar, Athadu, Samsaram Oka Chadarangam

---

*Last Updated: January 2026*


