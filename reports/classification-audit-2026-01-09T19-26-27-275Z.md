# Classification Enrichment Report

**Generated:** 1/10/2026, 12:56:27 AM

**Mode:** EXECUTE

## Summary

| Metric | Value |
|--------|-------|
| Total Processed | 500 |
| Primary Genre (high conf) | 113 |
| Primary Genre (low conf - skipped) | 317 |
| Primary Genre (ambiguous) | 70 |
| Age Rating (high conf) | 125 |
| Age Rating (medium conf) | 275 |
| Age Rating (skipped) | 0 |
| **Needs Manual Review** | **387** |

## Confidence Thresholds

- Primary Genre: Requires 2+ independent signals with total weight >= 0.65
- Age Rating: Requires 2+ signal sources; medium confidence acceptable
- Never downgrades existing ratings
- Never overwrites existing high-confidence data with low-confidence

## Cases Needing Manual Review (387)

### Primary Genre Issues

| Movie | Year | Reason | Signals |
|-------|------|--------|--------|
| What The Fish | - | Confidence 0.35 below threshold 0.45 - needs review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17) |
| Kirathaka | - | Confidence 0.42 below threshold 0.45 - needs review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Thriller (synopsis_keywords: 0.05) |
| Comrade Kalyan | - | Tie between Romance and Action (both ~0.40) - needs review | Romance (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Arrtham | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (synopsis_keywords: 0.05) |
| Band Melam | - | Confidence 0.40 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Moribund | - | Confidence 0.42 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Thriller (synopsis_keywords: 0.05) |
| Oh..! Sukumari | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| SANCTITY | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Hey Bhagawan! | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (synopsis_keywords: 0.05) |
| Illicit Relationship | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Naa Katha | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), Biography (synopsis_keywords: 0.05) |
| Garividi Lakshmi | - | Confidence 0.50 - consider review | Family (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Eight | - | Confidence 0.47 - consider review | Thriller (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (hero_pattern: 0.10) |
| They Call Him OG 2 | - | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| NTR Neel | - | Confidence 0.40 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Vrushakarma | - | Tie between Thriller and Fantasy (both ~0.38) - needs review | Fantasy (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Romance (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| ViSa | - | Confidence 0.35 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Family (audience_fit_family_watch: 0.15), Family (synopsis_keywords: 0.05) |
| Legacy | - | Confidence 0.35 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10) |
| Umapathi | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), War (synopsis_keywords: 0.05) |
| Montage Song | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17) |
| Mirai Jaithraya | - | Confidence 0.35 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Fantasy (hero_pattern: 0.10) |
| Sambarala Yetti Gattu | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Horror (synopsis_keywords: 0.05) |
| Lenin | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (hero_pattern: 0.10) |
| Abhiram | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Historical (director_pattern: 0.15) |
| As Time Echoes | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Art (genres_array_secondary: 0.17) |
| Peddarikam | - | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Kalki 2898-AD: Part 2 | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Fantasy (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Drama (director_pattern: 0.15) |
| Asuragana Rudra | - | Tie between Crime and Thriller (both ~0.40) - needs review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Crime (synopsis_keywords: 0.05) |
| Maa Inti Bangaram | - | Confidence 0.42 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (director_pattern: 0.15), Comedy (synopsis_keywords: 0.05) |
| Biker | - | Confidence 0.47 - consider review | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| VD14 | - | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (director_pattern: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Amaran in the City: Chapter 1 | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Romance (synopsis_keywords: 0.05) |
| Nagabandham | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Romance (synopsis_keywords: 0.05) |
| Pre-production | - | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Euphoria | - | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Social (genres_array_secondary: 0.17), Historical (director_pattern: 0.15) |
| Natudu | - | Tie between Romance and Thriller (both ~0.40) - needs review | Romance (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Drama (director_pattern: 0.15), Romance (synopsis_keywords: 0.05) |
| Patta Pagalu | - | Confidence 0.55 - consider review | Horror (genres_array_primary: 0.35), Thriller (mood_tags: 0.20), Horror (director_pattern: 0.15), Drama (hero_pattern: 0.10), Horror (synopsis_keywords: 0.05) |
| Maate Mantramu | - | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), War (synopsis_keywords: 0.05) |
| The Conversation | - | Confidence 0.45 below threshold 0.45 - needs review | Horror (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (hero_pattern: 0.10) |
| Baahubali: the Eternal War - Part 1 | 2027 | Confidence 0.47 - consider review | Animation (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), Crime (synopsis_keywords: 0.05) |
| Peddi | 2026 | Confidence 0.50 - consider review | Action (genres_array_primary: 0.35), Drama (director_pattern: 0.15), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Dacoit | 2026 | Confidence 0.40 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Madham | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Historical (director_pattern: 0.15) |
| Honey | 2026 | Tie between Horror and Thriller (both ~0.40) - needs review | Horror (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Horror (synopsis_keywords: 0.05) |
| Mana Shankara Vara Prasad Garu | 2026 | Confidence 0.58 - consider review | Drama (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Comedy (director_pattern: 0.15), Action (hero_pattern: 0.10), Comedy (synopsis_keywords: 0.05) |
| Swayambhu | 2026 | Confidence 0.55 - consider review | Historical (genres_array_primary: 0.35), Mythological (genres_array_secondary: 0.17), Historical (director_pattern: 0.15), Horror (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| Fauji | 2026 | Confidence 0.45 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Romance (director_pattern: 0.15), Action (hero_pattern: 0.10), War (synopsis_keywords: 0.05) |
| Vanaveera | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Action (synopsis_keywords: 0.05) |
| Alcohol | 2026 | Tie between Thriller and Drama (both ~0.38) - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Sahakutumbaanaam | 2026 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17) |

*... and 337 more*

## Sample Successful Classifications

| Movie | Year | Primary Genre | Sources | Age Rating | Reasons |
|-------|------|---------------|---------|------------|--------|
| What The Fish | - | Comedy | genres_array_primary | U/A | Default safe middle ground → U/A |
| Kirathaka | - | Thriller | genres_array_secondary, mood_tags, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Comrade Kalyan | - | Romance | genres_array_primary, synopsis_keywords | U | Family watch with no restrictions → U |
| Arrtham | - | Thriller | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| Band Melam | - | Romance | genres_array_primary, synopsis_keywords | U | Family watch with no restrictions → U |
| Moribund | - | Thriller | genres_array_secondary, mood_tags, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Oh..! Sukumari | - | Comedy | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| SANCTITY | - | Thriller | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| Hey Bhagawan! | - | Comedy | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Paramanandham Shishyulu | - | Comedy | genres_array_primary, mood_tags, synopsis_keywords | U | Family watch with no restrictions → U |
| Illicit Relationship | - | Drama | genres_array_primary | U | Family watch with no restrictions → U |
| Naa Katha | - | Drama | genres_array_primary | U | Family watch with no restrictions → U |
| Garividi Lakshmi | - | Family | genres_array_primary, audience_fit_family_watch | U | Kids friendly with no restrictions → U |
| Eight | - | Comedy | genres_array_secondary, mood_tags, hero_pattern | U/A | Intense mood → U/A |
| They Call Him OG 2 | - | Thriller | genres_array_primary, mood_tags | U/A | Intense mood → U/A |
| ENE Repeat | - | Comedy | genres_array_primary, mood_tags, director_pattern, synopsis_keywords | U | Family watch with no restrictions → U |
| NTR Neel | - | Action | genres_array_primary, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Vrushakarma | - | Thriller | genres_array_secondary, mood_tags | U/A | Intense mood → U/A |
| ViSa | - | Romance | genres_array_primary | U | Family watch with no restrictions → U |
| Legacy | - | Action | genres_array_primary | U/A | War/Crime genre → U/A; Intense mood → U/A |

## Known Limitations

1. Movies without genres[] array have fewer signals for primary_genre derivation
2. Pre-1950 movies default to 'U' rating due to limited content flagging
3. Director/Hero patterns only cover major Telugu cinema personalities
4. Synopsis keyword extraction is basic; does not use NLP
5. Ambiguous cases (Action vs Drama) are common for masala films
