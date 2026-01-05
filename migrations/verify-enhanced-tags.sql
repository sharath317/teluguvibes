
-- Quick verification query - run this after migrations
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'movies' 
  AND column_name IN ('box_office_category', 'awards', 'content_flags', 'mood_tags', 'age_rating', 'trigger_warnings', 'quality_tags')
ORDER BY column_name;

