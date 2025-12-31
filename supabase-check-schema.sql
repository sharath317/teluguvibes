-- Run this first to see what columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Also check posts table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;
