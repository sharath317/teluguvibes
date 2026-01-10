import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkActorNames() {
  // Check what names contain "N.T. Rama Rao"
  const { data, error } = await supabase
    .from('movies')
    .select('title_en, hero, release_year')
    .or('hero.ilike.%N.T. Rama Rao%,hero.ilike.%Rama Rao%')
    .order('release_year', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nMovies with hero names containing "Rama Rao":\n');
  const byHero: Record<string, string[]> = {};
  
  data?.forEach(m => {
    const hero = m.hero || 'Unknown';
    if (!byHero[hero]) byHero[hero] = [];
    byHero[hero].push(`${m.title_en} (${m.release_year})`);
  });

  Object.entries(byHero).forEach(([hero, movies]) => {
    console.log(`\n"${hero}" - ${movies.length} movies:`);
    movies.slice(0, 3).forEach(m => console.log(`  - ${m}`));
    if (movies.length > 3) console.log(`  ... and ${movies.length - 3} more`);
  });

  // Also show distinct hero names
  console.log('\n\nDistinct hero names found:');
  const uniqueHeroes = [...new Set(data?.map(m => m.hero).filter(Boolean))];
  uniqueHeroes.forEach(h => console.log(`  "${h}"`));
}

checkActorNames().catch(console.error);
