# Classification Enrichment Report

**Generated:** 1/10/2026, 2:35:20 AM

**Mode:** EXECUTE

## Summary

| Metric | Value |
|--------|-------|
| Total Processed | 100 |
| Primary Genre (high conf) | 6 |
| Primary Genre (low conf - skipped) | 76 |
| Primary Genre (ambiguous) | 18 |
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
| Suryapet Junction | 2025 | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), War (synopsis_keywords: 0.05) |
| Brahma Anandam | 2025 | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Anaganaga | 2025 | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), War (synopsis_keywords: 0.05) |
| Mass Jathara | 2025 | Confidence 0.50 - consider review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Kingdom | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Documentary (genres_array_primary: 0.35), Social (genres_array_secondary: 0.17), Drama (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| Raju Weds Rambai | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Anaganaga Australia Lo | 2025 | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20) |
| Solo Boy | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10), Horror (synopsis_keywords: 0.05) |
| Junior | 2025 | Tie between Family and Drama (both ~0.37) - needs review | Drama (genres_array_primary: 0.35), Family (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Historical (director_pattern: 0.15), Family (synopsis_keywords: 0.05) |
| Hitman’s Holiday | 2025 | Confidence 0.42 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (synopsis_keywords: 0.05) |
| Ari: My Name is Nobody | 2025 | Tie between Thriller and Drama (both ~0.38) - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Action (hero_pattern: 0.10) |
| Dhanraj | 2025 | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Drama (mood_tags: 0.20) |
| Dilruba | 2025 | Tie between Romance and Action (both ~0.40) - needs review | Romance (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Action (mood_tags: 0.20), Romance (synopsis_keywords: 0.05) |
| (MAD)² | 2025 | Tie between Drama and Romance (both ~0.35) - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Romance (audience_fit_date_movie: 0.15) |
| Arjun Chakravarthy | 2025 | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Drama (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Sports (synopsis_keywords: 0.05) |
| HIT: The Third Case | 2025 | Confidence 0.53 - consider review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Thriller (director_pattern: 0.15), Drama (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Arjun Son of Vyjayanthi | 2025 | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Uppu Kappurambu | 2025 | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Romance (audience_fit_date_movie: 0.15) |
| Odela 2 | 2025 | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Drama (director_pattern: 0.15), Family (synopsis_keywords: 0.05) |
| Oka Brundavanam | 2025 | Confidence 0.50 - consider review | Family (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Thriller (synopsis_keywords: 0.05) |
| Neeli Megha Shyama | 2025 | Tie between Comedy and Romance (both ~0.38) - needs review | Romance (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15) |
| Paanch Minar | 2025 | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Romance (audience_fit_date_movie: 0.15), Romance (hero_pattern: 0.10) |
| Jack | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Crime (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Comedy (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Kannappa | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Fantasy (genres_array_primary: 0.35), Historical (genres_array_secondary: 0.17) |
| Bhairavam | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20) |
| Bhavani Ward 1997 | 2025 | Confidence 0.40 below threshold 0.45 - needs review | Horror (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Horror (synopsis_keywords: 0.05) |
| Janata Bar | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Social (genres_array_secondary: 0.17) |
| Ponton's Heart | 2025 | Tie between Romance and Drama (both ~0.37) - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Romance (audience_fit_date_movie: 0.15), Romance (synopsis_keywords: 0.05) |
| LYF - Love Your Father | 2025 | Confidence 0.40 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Action (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Dreamcatcher | 2025 | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), War (synopsis_keywords: 0.05) |
| 11:11 | 2025 | Confidence 0.40 below threshold 0.45 - needs review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Vishwambhara | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Fantasy (genres_array_primary: 0.35), Comedy (mood_tags: 0.20), Action (hero_pattern: 0.10), Historical (synopsis_keywords: 0.05) |
| Ghaati | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Historical (director_pattern: 0.15) |
| They Call Him OG | 2025 | Confidence 0.50 - consider review | Action (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Thala | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Mystery (genres_array_primary: 0.35), Action (synopsis_keywords: 0.05) |
| Laila | 2025 | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Drama (hero_pattern: 0.10), Romance (synopsis_keywords: 0.05) |
| Premistunnaa | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Romance (synopsis_keywords: 0.05) |
| Jatadhara | 2025 | Confidence 0.50 - consider review | Action (genres_array_primary: 0.35), Horror (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (hero_pattern: 0.10), Action (synopsis_keywords: 0.05) |
| Shashtipoorti | 2025 | Confidence 0.55 - consider review | Family (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Comedy (hero_pattern: 0.10), Family (synopsis_keywords: 0.05) |
| EGO | 2025 | Confidence 0.55 - consider review | Comedy (genres_array_primary: 0.35), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Guard: Revenge for Love | 2025 | Confidence 0.55 - consider review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Drama (mood_tags: 0.20), Romance (audience_fit_date_movie: 0.15), Horror (synopsis_keywords: 0.05) |
| Chiranjeeva | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Drama (genres_array_primary: 0.35), Romance (genres_array_secondary: 0.17), Historical (director_pattern: 0.15), Romance (hero_pattern: 0.10) |
| 28 Degree Celsius | 2025 | Confidence 0.55 - consider review | Thriller (genres_array_primary: 0.35), Mystery (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Romance (synopsis_keywords: 0.05) |
| Arjun S/o Vyjayanthi | 2025 | Confidence 0.55 - consider review | Action (genres_array_primary: 0.35), Crime (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Action (audience_fit_group_watch: 0.15), Action (synopsis_keywords: 0.05) |
| Shivangi | 2025 | Tie between Thriller and Drama (both ~0.38) - needs review | Drama (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Crime (synopsis_keywords: 0.05) |
| Tuk Tuk | 2025 | Tie between Comedy and Drama (both ~0.38) - needs review | Drama (genres_array_primary: 0.35), Comedy (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Historical (director_pattern: 0.15) |
| Gandhi Tatha Chettu | 2025 | Tie between Family and Drama (both ~0.37) - needs review | Drama (genres_array_primary: 0.35), Family (genres_array_secondary: 0.17), Comedy (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Family (synopsis_keywords: 0.05) |
| Daksha: The Deadly Conspiracy | 2025 | Tie between Thriller and Crime (both ~0.38) - needs review | Crime (genres_array_primary: 0.35), Thriller (genres_array_secondary: 0.17), Thriller (mood_tags: 0.20), Family (audience_fit_family_watch: 0.15), Historical (director_pattern: 0.15), Action (hero_pattern: 0.10) |
| Shashtipoorthi | 2025 | Confidence 0.35 below threshold 0.45 - needs review | Family (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Romance (audience_fit_date_movie: 0.15), Comedy (hero_pattern: 0.10) |
| Telusu Kada | 2025 | Confidence 0.55 - consider review | Romance (genres_array_primary: 0.35), Drama (genres_array_secondary: 0.17), Romance (audience_fit_date_movie: 0.15), Comedy (hero_pattern: 0.10), Romance (synopsis_keywords: 0.05) |

*... and 44 more*

## Sample Successful Classifications

| Movie | Year | Primary Genre | Sources | Age Rating | Reasons |
|-------|------|---------------|---------|------------|--------|
| Suryapet Junction | 2025 | Action | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Brahma Anandam | 2025 | Comedy | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Anaganaga | 2025 | Thriller | genres_array_primary, mood_tags | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Mass Jathara | 2025 | Action | genres_array_primary, hero_pattern, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Kingdom | 2025 | Documentary | genres_array_primary | U/A | Default safe middle ground → U/A |
| Raju Weds Rambai | 2025 | Drama | genres_array_primary | U | Family watch with no restrictions → U |
| Anaganaga Australia Lo | 2025 | Thriller | genres_array_primary, mood_tags | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Solo Boy | 2025 | Drama | genres_array_primary | U | Kids friendly with no restrictions → U |
| Junior | 2025 | Family | genres_array_secondary, audience_fit_family_watch, synopsis_keywords | U | Kids friendly with no restrictions → U |
| Hitman’s Holiday | 2025 | Comedy | genres_array_secondary, mood_tags, synopsis_keywords | U | Family watch with no restrictions → U |
| Ari: My Name is Nobody | 2025 | Thriller | genres_array_secondary, mood_tags | U/A | Intense mood → U/A |
| Dhanraj | 2025 | Drama | genres_array_primary, mood_tags | U/A | Default safe middle ground → U/A |
| Dilruba | 2025 | Romance | genres_array_primary, synopsis_keywords | U/A | Default safe middle ground → U/A |
| (MAD)² | 2025 | Drama | genres_array_primary | U | Family watch with no restrictions → U |
| Arjun Chakravarthy | 2025 | Drama | genres_array_primary, mood_tags | U | Kids friendly with no restrictions → U |
| HIT: The Third Case | 2025 | Thriller | genres_array_secondary, mood_tags, director_pattern | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Arjun Son of Vyjayanthi | 2025 | Action | genres_array_primary, audience_fit_group_watch, synopsis_keywords | U/A | War/Crime genre → U/A; Intense mood → U/A |
| Uppu Kappurambu | 2025 | Comedy | genres_array_primary, mood_tags | U | Family watch with no restrictions → U |
| Odela 2 | 2025 | Thriller | genres_array_primary, mood_tags | U/A | Trigger warning: violence → U/A; War/Crime genre → U/A |
| Sankranthiki Vasthunam | 2025 | Comedy | genres_array_primary, mood_tags, director_pattern, synopsis_keywords | U | Family watch with no restrictions → U |

## Known Limitations

1. Movies without genres[] array have fewer signals for primary_genre derivation
2. Pre-1950 movies default to 'U' rating due to limited content flagging
3. Director/Hero patterns only cover major Telugu cinema personalities
4. Synopsis keyword extraction is basic; does not use NLP
5. Ambiguous cases (Action vs Drama) are common for masala films
