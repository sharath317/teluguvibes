import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('🔧 Running editorial review columns migration...\n');

  const queries = [
    `ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS structured_review_v2 JSONB`,
    `ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS review_quality_score REAL DEFAULT 0.0`,
    `ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS editorial_rewrite_at TIMESTAMP WITH TIME ZONE`,
  ];

  for (const sql of queries) {
    console.log(`Executing: ${sql.substring(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try direct query via REST API workaround - columns may already exist
      console.log(`   Note: ${error.message}`);
    } else {
      console.log(`   ✅ Done`);
    }
  }

  // Verify columns exist by querying them
  console.log('\n📊 Verifying columns...');
  const { data, error } = await supabase
    .from('movie_reviews')
    .select('id, structured_review_v2, review_quality_score, editorial_rewrite_at')
    .limit(1);

  if (error) {
    console.log(`❌ Columns not found: ${error.message}`);
    console.log('\n💡 Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log(`
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS structured_review_v2 JSONB;
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS review_quality_score REAL DEFAULT 0.0;
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS editorial_rewrite_at TIMESTAMP WITH TIME ZONE;
    `);
  } else {
    console.log('✅ All columns exist!');
    console.log(`   Sample row: ${JSON.stringify(data?.[0] || {})}`);
  }
}

runMigration().catch(console.error);
