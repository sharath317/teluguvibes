# Classification Enrichment Report

**Generated:** 1/10/2026, 1:40:11 AM

**Mode:** EXECUTE

## Summary

| Metric | Value |
|--------|-------|
| Total Processed | 100 |
| Primary Genre (high conf) | 6 |
| Primary Genre (low conf - skipped) | 80 |
| Primary Genre (ambiguous) | 14 |
| Age Rating (high conf) | 0 |
| Age Rating (medium conf) | 0 |
| Age Rating (skipped) | 0 |
| **Needs Manual Review** | **94** |

## Confidence Thresholds

- Primary Genre: Requires 2+ independent signals with total weight >= 0.65
- Age Rating: Requires 2+ signal sources; medium confidence acceptable
- Never downgrades existing ratings
- Never overwrites existing high-confidence data with low-confidence

## Cases Needing Manual Review (94)

### Primary Genre Issues

| Movie | Year | Reason | Signals |
|-------|------|--------|--------|
| As Time Echoes | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Art (genres_array_secondary: 0.17) |
| ViSa | - | Confidence 0.35 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Family (synopsis_keywords: 0.05) |
| Umapathi | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), War (synopsis_keywords: 0.05) |
| Vrushakarma | - | Tie between Thriller and Fantasy (both ~0.38) - needs review | Fantasy (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Romance (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| NTR Neel | - | Confidence 0.40 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Maate Mantramu | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), War (synopsis_keywords: 0.05) |
| Moribund | - | Confidence 0.42 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Thriller (synopsis_keywords: 0.05) |
| Sambarala Yetti Gattu | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Horror (synopsis_keywords: 0.05) |
| VD14 | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (director_pattern: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Maa Inti Bangaram | - | Confidence 0.42 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (director_pattern: 0.15), Comedy (synopsis_keywords: 0.05) |
| Naa Katha | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), Biography (synopsis_keywords: 0.05) |
| SANCTITY | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Kalki 2898-AD: Part 2 | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Drama (director_pattern: 0.15) |
| Legacy | - | Confidence 0.35 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10) |
| Lenin | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (hero_pattern: 0.10) |
| Hey Bhagawan! | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (synopsis_keywords: 0.05) |
| Montage Song | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17) |
| Garividi Lakshmi | - | Confidence 0.50 - consider review | Family (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Arrtham | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (synopsis_keywords: 0.05) |
| Amaran in the City: Chapter 1 | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Romance (synopsis_keywords: 0.05) |
| They Call Him OG 2 | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Abhiram | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Historical (director_pattern: 0.15) |
| Asuragana Rudra | - | Tie between Crime and Thriller (both ~0.40) - needs review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Crime (synopsis_keywords: 0.05) |
| Oh..! Sukumari | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| What The Fish | - | Confidence 0.35 below threshold 0.45 - needs review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17) |
| Band Melam | - | Confidence 0.40 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Natudu | - | Tie between Romance and Thriller (both ~0.40) - needs review | Romance (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Drama (director_pattern: 0.15), Romance (synopsis_keywords: 0.05) |
| Mirai Jaithraya | - | Confidence 0.35 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Fantasy (hero_pattern: 0.10) |
| Euphoria | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Social (genres_array_secondary: 0.17), Historical (director_pattern: 0.15) |
| Patta Pagalu | - | Confidence 0.55 - consider review | Horror (genres_array_primary: 0.35), Thriller (mood_tags: 0.20), Horror (director_pattern: 0.15), Drama (hero_pattern: 0.10), Horror (synopsis_keywords: 0.05) |
| Eight | - | Confidence 0.47 - consider review | Thriller (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (hero_pattern: 0.10) |
| Kirathaka | - | Confidence 0.42 below threshold 0.45 - needs review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Thriller (synopsis_keywords: 0.05) |
| The Conversation | - | Confidence 0.45 below threshold 0.45 - needs review | Horror (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (hero_pattern: 0.10) |
| Pre-production | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Illicit Relationship | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Nagabandham | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Romance (synopsis_keywords: 0.05) |
| Peddarikam | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Biker | - | Confidence 0.47 - consider review | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Comrade Kalyan | - | Tie between Romance and Action (both ~0.40) - needs review | Romance (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Baahubali: the Eternal War - Part 1 | 2027 | Confidence 0.47 - consider review | Animation (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), Crime (synopsis_keywords: 0.05) |
| Bhartha Mahasayulaku Wignyapthi | 2026 | Confidence 0.50 - consider review | Action (genres_array_primary: 0.35), Family (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (director_pattern: 0.15), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| The Paradise | 2026 | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Psych Siddhartha | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Thriller (synopsis_keywords: 0.05) |
| Sahakutumbaanaam | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17) |
| Anaganaga Oka Raju | 2026 | Confidence 0.47 - consider review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (hero_pattern: 0.10), Romance (synopsis_keywords: 0.05) |
| Dragon | 2026 | Confidence 0.40 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Alcohol | 2026 | Tie between Thriller and Drama (both ~0.38) - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Aakasam Lo Oka Tara | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15) |
| Rowdy Janardhana | 2026 | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Man Of The Match | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17) |

*... and 44 more*

## Sample Successful Classifications

| Movie | Year | Primary Genre | Sources | Age Rating | Reasons |
|-------|------|---------------|---------|------------|--------|
| As Time Echoes | - | Drama | genres_array_primary | U/A | Default safe middle ground → U/A |
| ViSa | - | Romance | genres_array_primary | U | Family watch with no restrictions → U |
| Umapathi | - | Comedy | genres_array_secondary, mood_tags | U | Family watch with no restrictions → U |
| Vrushakarma | - | Thriller | genres_array_secondary, mood_tags | U/A | Intense mood → U/A |
| NTR Neel | - | Action | genres_array_primary, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Maate Mantramu | - | Comedy | genres_array_secondary, mood_tags | U | Family watch with no restrictions → U |
| Moribund | - | Thriller | genres_array_secondary, mood_tags, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Sambarala Yetti Gattu | - | Action | genres_array_primary, mood_tags | U/A | Default safe middle ground → U/A |
| VD14 | - | Action | genres_array_primary, director_pattern, synopsis_keywords | U/A | Intense mood → U/A |
| Maa Inti Bangaram | - | Comedy | genres_array_secondary, mood_tags, synopsis_keywords | U/A | Intense mood → U/A |
| Naa Katha | - | Drama | genres_array_primary | U | Family watch with no restrictions → U |
| SANCTITY | - | Thriller | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| Kalki 2898-AD: Part 2 | - | Action | genres_array_primary, mood_tags | U/A | Default safe middle ground → U/A |
| Legacy | - | Action | genres_array_primary | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Lenin | - | Drama | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Hey Bhagawan! | - | Comedy | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Montage Song | - | Drama | genres_array_primary | U/A | Default safe middle ground → U/A |
| Garividi Lakshmi | - | Family | genres_array_primary, audience_fit_family_watch | U | Kids friendly with no restrictions → U |
| Arrtham | - | Thriller | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| Amaran in the City: Chapter 1 | - | Drama | genres_array_primary | U/A | Default safe middle ground → U/A |

## Known Limitations

1. Movies without genres[] array have fewer signals for primary_genre derivation
2. Pre-1950 movies default to 'U' rating due to limited content flagging
3. Director/Hero patterns only cover major Telugu cinema personalities
4. Synopsis keyword extraction is basic; does not use NLP
5. Ambiguous cases (Action vs Drama) are common for masala films
