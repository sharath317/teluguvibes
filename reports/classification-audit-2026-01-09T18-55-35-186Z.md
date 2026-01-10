# Classification Enrichment Report

**Generated:** 1/10/2026, 12:25:35 AM

**Mode:** DRY RUN

## Summary

| Metric | Value |
|--------|-------|
| Total Processed | 50 |
| Primary Genre (high conf) | 3 |
| Primary Genre (low conf - skipped) | 43 |
| Primary Genre (ambiguous) | 4 |
| Age Rating (high conf) | 0 |
| Age Rating (medium conf) | 40 |
| Age Rating (skipped) | 0 |
| **Needs Manual Review** | **47** |

## Confidence Thresholds

- Primary Genre: Requires 2+ independent signals with total weight >= 0.65
- Age Rating: Requires 2+ signal sources; medium confidence acceptable
- Never downgrades existing ratings
- Never overwrites existing high-confidence data with low-confidence

## Cases Needing Manual Review (47)

### Primary Genre Issues

| Movie | Year | Reason | Signals |
|-------|------|--------|--------|
| As Time Echoes | - | Only 1 signal(s) for Drama, need 2+ | Drama (genres_array_primary: 0.35), Art (genres_array_secondary: 0.17) |
| Band Melam | - | Confidence 0.40 below threshold 0.65 | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Paramanandham Shishyulu | - | Confidence 0.60 below threshold 0.65 | Comedy (genres_array_primary: 0.35), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (synopsis_keywords: 0.05) |
| Kirathaka | - | Confidence 0.42 below threshold 0.65 | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Thriller (synopsis_keywords: 0.05) |
| Arrtham | - | Confidence 0.55 below threshold 0.65 | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (synopsis_keywords: 0.05) |
| Euphoria | - | Only 1 signal(s) for Drama, need 2+ | Drama (genres_array_primary: 0.35), Social (genres_array_secondary: 0.17) |
| Illicit Relationship | - | Only 1 signal(s) for Drama, need 2+ | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Aakasmikam | - | Confidence 0.60 below threshold 0.65 | Thriller (genres_array_primary: 0.35), Mystery (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Thriller (synopsis_keywords: 0.05) |
| Amaran in the City: Chapter 1 | - | Confidence 0.22 below threshold 0.65 | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Romance (synopsis_keywords: 0.05) |
| Haindava | - | Confidence 0.60 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Takshakudu | - | Confidence 0.60 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Natudu | - | Tie between Romance and Thriller (both ~0.40) | Romance (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Romance (synopsis_keywords: 0.05) |
| Biker | - | Confidence 0.47 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Sambarala Yetti Gattu | - | Confidence 0.55 below threshold 0.65 | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Horror (synopsis_keywords: 0.05) |
| Abhiram | - | Confidence 0.38 below threshold 0.65 | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Eight | - | Confidence 0.38 below threshold 0.65 | Thriller (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Maa Inti Bangaram | - | Confidence 0.42 below threshold 0.65 | Action (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (synopsis_keywords: 0.05) |
| What The Fish | - | Only 1 signal(s) for Comedy, need 2+ | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17) |
| Lenin | - | Confidence 0.55 below threshold 0.65 | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| They Call Him OG 2 | - | Confidence 0.55 below threshold 0.65 | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| HaiLesso | - | Confidence 0.60 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Garividi Lakshmi | - | Confidence 0.50 below threshold 0.65 | Family (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Anumana Pakshi | - | Confidence 0.60 below threshold 0.65 | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (synopsis_keywords: 0.05) |
| Maate Mantramu | - | Confidence 0.38 below threshold 0.65 | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), War (synopsis_keywords: 0.05) |
| Asuragana Rudra | - | Tie between Crime and Thriller (both ~0.40) | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Crime (synopsis_keywords: 0.05) |
| ViSa | - | Confidence 0.20 below threshold 0.65 | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Family (synopsis_keywords: 0.05) |
| Nagabandham | - | Confidence 0.55 below threshold 0.65 | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Romance (synopsis_keywords: 0.05) |
| Patta Pagalu | - | Confidence 0.55 below threshold 0.65 | Horror (genres_array_primary: 0.35), Thriller (mood_tags: 0.20), Horror (director_pattern: 0.15), Horror (synopsis_keywords: 0.05) |
| ENE Repeat | - | Confidence 0.60 below threshold 0.65 | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (synopsis_keywords: 0.05) |
| Umapathi | - | Confidence 0.38 below threshold 0.65 | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), War (synopsis_keywords: 0.05) |
| VD14 | - | Tie between Action and Thriller (both ~0.40) | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Bad Boy Karthik | - | Confidence 0.55 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (synopsis_keywords: 0.05) |
| Naa Katha | - | Only 1 signal(s) for Drama, need 2+ | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Biography (synopsis_keywords: 0.05) |
| Pre-production | - | Confidence 0.55 below threshold 0.65 | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Comrade Kalyan | - | Tie between Romance and Action (both ~0.40) | Romance (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| SANCTITY | - | Confidence 0.55 below threshold 0.65 | Thriller (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Oh..! Sukumari | - | Confidence 0.55 below threshold 0.65 | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Legacy | - | Only 1 signal(s) for Action, need 2+ | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| DQ 41 | - | Confidence 0.60 below threshold 0.65 | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Romance (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Hey Bhagawan! | - | Confidence 0.55 below threshold 0.65 | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (synopsis_keywords: 0.05) |
| Vrushakarma | - | Confidence 0.38 below threshold 0.65 | Fantasy (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Romance (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| Montage Song | - | Only 1 signal(s) for Drama, need 2+ | Drama (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17) |
| Nakshatra Poratam | - | Confidence 0.55 below threshold 0.65 | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| The Conversation | - | Only 1 signal(s) for Horror, need 2+ | Horror (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| NTR Neel | - | Confidence 0.40 below threshold 0.65 | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Kalki 2898-AD: Part 2 | - | Confidence 0.55 below threshold 0.65 | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Drama (director_pattern: 0.15) |
| Mirai Jaithraya | - | Only 1 signal(s) for Action, need 2+ | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17) |

## Sample Successful Classifications

| Movie | Year | Primary Genre | Sources | Age Rating | Reasons |
|-------|------|---------------|---------|------------|--------|
| As Time Echoes | - | - | genres_array_primary | U/A | Default safe middle ground → U/A |
| Band Melam | - | - | genres_array_primary, synopsis_keywords | U | Family watch with no restrictions → U |
| Paramanandham Shishyulu | - | - | genres_array_primary, mood_tags, synopsis_keywords | U | Family watch with no restrictions → U |
| Kirathaka | - | - | genres_array_secondary, mood_tags, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Arrtham | - | - | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| Euphoria | - | - | genres_array_primary | U/A | Default safe middle ground → U/A |
| Illicit Relationship | - | - | genres_array_primary | U | Family watch with no restrictions → U |
| Aakasmikam | - | - | genres_array_primary, mood_tags, synopsis_keywords | U/A | Intense mood → U/A |
| Amaran in the City: Chapter 1 | - | - | genres_array_secondary, synopsis_keywords | U/A | Default safe middle ground → U/A |
| Haindava | - | - | genres_array_primary, mood_tags, synopsis_keywords | U | Family watch with no restrictions → U |
| Takshakudu | - | - | genres_array_primary, mood_tags, synopsis_keywords | U | Family watch with no restrictions → U |
| Natudu | - | - | genres_array_primary, synopsis_keywords | U/A | Intense mood → U/A |
| Biker | - | - | genres_array_secondary, mood_tags, hero_pattern | U | Family watch with no restrictions → U |
| Sambarala Yetti Gattu | - | - | genres_array_primary, mood_tags | U/A | Default safe middle ground → U/A |
| Abhiram | - | - | genres_array_secondary, mood_tags | U | Family watch with no restrictions → U |
| Eight | - | - | genres_array_secondary, mood_tags | U/A | Intense mood → U/A |
| Maa Inti Bangaram | - | - | genres_array_secondary, mood_tags, synopsis_keywords | U/A | Intense mood → U/A |
| What The Fish | - | - | genres_array_primary | U/A | Default safe middle ground → U/A |
| Lenin | - | - | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| They Call Him OG 2 | - | - | genres_array_primary, mood_tags | U/A | Intense mood → U/A |

## Known Limitations

1. Movies without genres[] array have fewer signals for primary_genre derivation
2. Pre-1950 movies default to 'U' rating due to limited content flagging
3. Director/Hero patterns only cover major Telugu cinema personalities
4. Synopsis keyword extraction is basic; does not use NLP
5. Ambiguous cases (Action vs Drama) are common for masala films
