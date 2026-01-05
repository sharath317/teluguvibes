# Database Migrations

## How to Run Migrations

Since we don't have direct database access via CLI, run these SQL files in **Supabase Dashboard → SQL Editor**.

### Migration Order

1. **`../supabase-enhanced-tags-schema.sql`** - Enhanced tagging system (movies + reviews)
2. **`../supabase-canonical-lists-schema.sql`** - Canonical "Best Of" lists

### Quick Copy Commands

```bash
# Copy migration 1 to clipboard
cat supabase-enhanced-tags-schema.sql | pbcopy

# Copy migration 2 to clipboard  
cat supabase-canonical-lists-schema.sql | pbcopy
```

### After Running Migrations

Verify with:
```sql
-- Check movies table columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'movies' 
  AND column_name IN ('box_office_category', 'mood_tags', 'age_rating');

-- Check canonical_lists table
SELECT COUNT(*) FROM canonical_lists;
```

Then populate data:
```bash
pnpm movies:auto-tag --limit=500
```

