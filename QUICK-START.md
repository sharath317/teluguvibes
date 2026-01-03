# 🚀 Quick Start - System Refinement

Follow these 4 simple steps to apply all refinements:

---

## Step 1: Check Migration Status ✅

```bash
pnpm migrate:check
```

**If migration NOT applied:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy content of `migrations/add_review_dimensions.sql`
3. Paste and run
4. Re-run: `pnpm migrate:check` to verify

---

## Step 2: Enrich Reviews (4 hours) 📊

**Test first (100 movies):**
```bash
pnpm enrich:reviews:limit
```

**Full run:**
```bash
pnpm enrich:reviews
```

*Can run overnight. Safe to interrupt and resume.*

---

## Step 3: Auto-Tag Movies (3 hours) 🏷️

**Test first (100 movies):**
```bash
pnpm tag:movies:limit
```

**Full run:**
```bash
pnpm tag:movies
```

---

## Step 4: Validate Data (5 minutes) ✓

**Preview issues:**
```bash
pnpm validate:data:fix
```

**Apply fixes:**
```bash
pnpm validate:data:apply
```

---

## Verification 🎯

After all steps, check:

### Frontend
Visit: http://localhost:3000/reviews
- ✅ All 10 sections populated
- ✅ Blockbusters: 50+ movies
- ✅ Hidden Gems: 30+ movies

### Admin Dashboard
Visit: http://localhost:3000/admin/observatory
- ✅ Review Coverage: 99%
- ✅ Quality metrics healthy

---

## Commands Reference

| Command | Purpose | Time |
|---------|---------|------|
| `pnpm migrate:check` | Verify DB schema | 5s |
| `pnpm enrich:reviews:dry` | Preview enrichment | 10s |
| `pnpm enrich:reviews:limit` | Test 100 movies | 3min |
| `pnpm enrich:reviews` | Full enrichment | 4h |
| `pnpm tag:movies:dry` | Preview tagging | 10s |
| `pnpm tag:movies:limit` | Test 100 movies | 2min |
| `pnpm tag:movies` | Full tagging | 3h |
| `pnpm validate:data:fix` | Preview fixes | 2min |
| `pnpm validate:data:apply` | Apply fixes | 3min |

---

## Troubleshooting

**"Missing credentials"** → Check `.env.local` for Supabase keys

**"Column does not exist"** → Run Step 1 (migration)

**"No movies ready for tagging"** → Run Step 2 (enrichment) first

**Slow processing** → Normal. Run overnight or increase batch size

---

**Full Guide:** See `docs/MIGRATION-GUIDE.md` for detailed instructions.

