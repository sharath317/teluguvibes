# Migration & Enrichment Guide

This guide walks you through applying the system refinement changes to your production database.

---

## 📋 Prerequisites

Ensure you have:
- ✅ Supabase credentials in `.env.local`
- ✅ Node.js and pnpm installed
- ✅ Backup of your database (optional but recommended)

---

## 🚀 Step-by-Step Guide

### **Step 1: Verify Migration Status**

First, check if the database migration is needed:

```bash
pnpm migrate:check
```

**Expected Output:**
- ✅ If columns exist: "Migration already applied!"
- ❌ If columns missing: "Migration NOT applied yet"

---

### **Step 2: Apply Database Migration**

#### Option A: Via Supabase Dashboard (Recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **SQL Editor** → **New Query**
3. Copy the entire content of `migrations/add_review_dimensions.sql`
4. Paste into the SQL Editor
5. Click **Run** or press `Ctrl+Enter`
6. Verify success: You should see "Success. No rows returned"

#### Option B: Via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

#### Option C: Verify After Manual Apply

After applying via dashboard, verify:

```bash
pnpm migrate:check
```

---

### **Step 3: Enrich Existing Reviews**

Apply structured dimensions to all 7,559 reviews.

#### Dry Run First (Recommended)

See what will be processed without making changes:

```bash
pnpm enrich:reviews:dry
```

**Expected Output:**
```
📈 Found 7663 movies to process
   Batch size: 10
   Estimated time: 255 minutes

🔍 Sample movies to be enriched:
   - Movie Title 1 (Telugu) [ID: xxx]
   - Movie Title 2 (Telugu) [ID: xxx]
   ... and 7658 more
```

#### Test on a Small Batch

Process just 100 movies first to verify:

```bash
pnpm enrich:reviews:limit
```

**This will process 100 movies and show you the results.**

#### Full Enrichment (Production Run)

Once you're confident, process all movies:

```bash
pnpm enrich:reviews
```

**⏱️ Estimated Time:** ~4 hours for 7,663 movies (at 10 movies/batch)

**Progress Tracking:**
- You'll see real-time progress by language
- Each batch completes in ~12 seconds
- Script is safe to interrupt (Ctrl+C) and resume

**Expected Output:**
```
🔄 Processing Telugu movies (5862)...
   Enriched 10/5862...
   Enriched 20/5862...
   ...

✅ Telugu complete: 5850 success, 12 failed

🎉 ENRICHMENT COMPLETE!
📊 FINAL SUMMARY:
   Total processed: 7663
   ✅ Successful: 7620
   ❌ Failed: 43
   ⏱️  Duration: 15300s (255.0 minutes)
```

---

### **Step 4: Auto-Tag Movies**

Generate canonical tags from review intelligence.

#### Dry Run First

```bash
pnpm tag:movies:dry
```

**Expected Output:**
```
📈 Found 7663 total movies
   7620 have enriched reviews
   43 need enrichment first

🔍 Sample movies to be tagged:
   - Movie Title 1 (Telugu) [Current tags: 0]
   - Movie Title 2 (Tamil) [Current tags: 2]
```

#### Test on a Small Batch

```bash
pnpm tag:movies:limit
```

#### Full Tagging (Production Run)

```bash
pnpm tag:movies
```

**⏱️ Estimated Time:** ~3 hours for 7,620 movies

**Expected Output:**
```
🔄 Processing Telugu movies (5850)...
   Auto-tagged 10/5850...
   Auto-tagged 20/5850...
   ...

✅ Telugu complete: 5845 success, 5 failed

🎉 TAGGING COMPLETE!
📊 FINAL SUMMARY:
   Total processed: 7620
   ✅ Successful: 7600
   ❌ Failed: 20
   ⏱️  Duration: 11440s (190.7 minutes)
```

---

### **Step 5: Run Data Validation**

Check data quality and identify issues.

#### Dry Run (No Changes)

```bash
pnpm validate:data:dry
```

**Expected Output:**
```
🔍 Checking for orphan reviews...
   Found 0 orphan reviews

🔍 Checking for orphan celebrities...
   Found 5 orphan celebrities

🔍 Checking for duplicate movies...
   Found 0 potential duplicates

🔍 Checking for incomplete movies...
   Found 127 incomplete movies

📊 VALIDATION SUMMARY
Total issues found: 132
  Critical: 0
  High: 15 (broken posters)
  Medium: 50 (missing directors)
  Low: 67 (missing celebrity images)

Fixable issues: 82
```

#### Preview Fixes

See what would be fixed:

```bash
pnpm validate:data:fix
```

#### Apply Fixes (Production)

```bash
pnpm validate:data:apply
```

**This will:**
- Delete orphan reviews (if any)
- Delete orphan celebrities (if any)
- Unpublish incomplete movies (marks `is_published = false`)

#### With Image Validation (Slower)

To also check for broken image URLs:

```bash
pnpm validate:data:images --fix
```

**⚠️ Warning:** This checks 7,663+ image URLs and can take 30-60 minutes.

---

## 📊 Verification Checklist

After completing all steps, verify:

### 1. Database Columns
```bash
pnpm migrate:check
```
✅ Should show: "Migration already applied!"

### 2. Review Enrichment
Check Supabase Dashboard:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(dimensions_json) as enriched,
  ROUND(COUNT(dimensions_json)::numeric / COUNT(*) * 100, 2) as percentage
FROM movie_reviews;
```
✅ Target: ~99% enriched

### 3. Movie Tags
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE tags IS NOT NULL AND array_length(tags, 1) > 0) as tagged,
  ROUND(COUNT(*) FILTER (WHERE tags IS NOT NULL)::numeric / COUNT(*) * 100, 2) as percentage
FROM movies
WHERE is_published = true;
```
✅ Target: ~99% tagged

### 4. Frontend Verification

Visit: `http://localhost:3000/reviews`

Check:
- ✅ All sections show movies (Blockbusters, Hidden Gems, etc.)
- ✅ Section counts are higher (18-24 movies per section)
- ✅ No broken posters or cards

### 5. Admin Dashboard

Visit: `http://localhost:3000/admin/observatory`

Check:
- ✅ Coverage metrics updated
- ✅ Quality metrics healthy
- ✅ No critical issues

---

## 🔧 Troubleshooting

### Issue: "Missing Supabase credentials"
**Solution:** Ensure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Issue: "Column does not exist"
**Solution:** The migration wasn't applied. Run via Supabase Dashboard SQL Editor.

### Issue: "No movies ready for tagging"
**Solution:** Run `pnpm enrich:reviews` first. Tagging requires enriched reviews.

### Issue: Enrichment is slow
**Normal:** Processing 7,663 movies takes 3-4 hours. You can:
- Run in batches: `pnpm enrich:reviews:limit` (100 movies)
- Increase batch size in the script (edit `--batch=10` to `--batch=20`)
- Run overnight

### Issue: Some enrichments failed
**Normal:** A few movies may fail due to:
- Missing review data
- Invalid data structure
- API timeouts

**Solution:** Check logs for specific errors. Usually 95%+ success rate is good.

### Issue: Tags not showing on UI
**Cause:** Frontend might be cached.
**Solution:** 
1. Clear browser cache
2. Restart Next.js dev server: `pnpm dev`
3. Check if tags exist in database

---

## 📈 Performance Tips

### Speed Up Enrichment

1. **Increase Batch Size:**
```bash
# Edit scripts/enrich-all-reviews.ts
# Change: batchSize = 10
# To: batchSize = 20
```

2. **Process by Language:**
```typescript
// Only process Telugu first
const movies = await supabase
  .from('movies')
  .select('id')
  .eq('language', 'Telugu')
  .eq('is_published', true);
```

3. **Run in Background:**
```bash
nohup pnpm enrich:reviews > enrichment.log 2>&1 &
```

### Monitor Progress

```bash
# Watch the log file in real-time
tail -f enrichment.log
```

---

## 🎯 Summary of Commands

| Step | Command | Time | Purpose |
|------|---------|------|---------|
| 1 | `pnpm migrate:check` | 5s | Verify migration status |
| 2 | Manual SQL in Dashboard | 10s | Apply schema changes |
| 3 | `pnpm enrich:reviews` | ~4h | Add structured dimensions |
| 4 | `pnpm tag:movies` | ~3h | Generate canonical tags |
| 5 | `pnpm validate:data:fix` | ~5min | Check and fix data quality |

**Total Time:** ~7-8 hours (mostly automated, can run overnight)

---

## 🚨 Rollback Plan

If something goes wrong:

### 1. Code Rollback
```bash
git revert HEAD
pnpm dev
```

### 2. Database Rollback
The new columns are nullable and don't break existing queries. You can:
- Leave them (they don't affect anything)
- Or drop them manually:
```sql
ALTER TABLE movie_reviews DROP COLUMN IF EXISTS dimensions_json;
ALTER TABLE movie_reviews DROP COLUMN IF EXISTS performance_scores;
-- etc.
```

### 3. Clear Enriched Data
```sql
UPDATE movie_reviews SET
  dimensions_json = NULL,
  performance_scores = NULL,
  technical_scores = NULL,
  audience_signals = NULL,
  confidence_score = NULL,
  composite_score = NULL;
```

---

## ✅ Success Indicators

You'll know it's working when:

1. **Admin Observatory** shows:
   - ✅ Review Coverage: 99%
   - ✅ Avg Review Confidence: >70%
   - ✅ Data Quality: All green

2. **Reviews Page** displays:
   - ✅ 10 section types with movies
   - ✅ Blockbusters: 50+ movies
   - ✅ Hidden Gems: 30+ movies
   - ✅ All sections populated

3. **Movie Detail Pages** show:
   - ✅ Tags displayed
   - ✅ Rich review dimensions
   - ✅ Confidence scores

---

## 📞 Need Help?

- Check logs for specific errors
- Verify database credentials
- Ensure all dependencies are installed: `pnpm install`
- Review the error messages - they're descriptive

---

**Good luck with your migration! 🚀**

