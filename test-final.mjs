import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ypbsyudvawxcmzkddyhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYnN5dWR2YXd4Y216a2RkeWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0Mzk0OCwiZXhwIjoyMDgyNTE5OTQ4fQ.UY_wHS0U-zYvs7fQUdXutzVrM8hViQojDaEMlT-QFLw'
);

await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
console.log('🗑️ Cleared\n🤖 Generating detailed articles...\n');

const res = await fetch('http://localhost:3000/api/import-news', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: 'gnews', useAI: true, limit: 2 })
});

const data = await res.json();
console.log(`\n✅ Imported: ${data.imported}\n`);

const { data: posts } = await supabase.from('posts').select('title, telugu_body').limit(1);

if (posts?.[0]) {
  const p = posts[0];
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`📌 ${p.title}\n`);
  console.log(`📊 Words: ~${p.telugu_body.split(/\s+/).length}`);
  console.log('──────────────────────────────────────────────────────────────────');
  console.log(p.telugu_body);
  console.log('══════════════════════════════════════════════════════════════════');
}
