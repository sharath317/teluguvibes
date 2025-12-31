/**
 * ON THIS DAY IN TELUGU CINEMA
 *
 * Evergreen content generation - runs once per day, caches forever.
 * Low-maintenance: Only generates if cache is missing for that day.
 *
 * WHY THIS APPROACH:
 * - One daily cron job (5 AM)
 * - Results cached permanently in DB
 * - Same content reused every year with "Updated for YYYY" badge
 * - No repeated API calls or AI generations
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OnThisDayEvent {
  type: 'birthday' | 'death_anniversary' | 'movie_release' | 'award';
  title_te: string;
  summary_te: string;
  entity_id?: string;
  entity_name: string;
  year: number;
  nostalgia_hook: string;
  image_url?: string;
}

interface CachedDay {
  day_key: string;
  year_generated: number;
  events: OnThisDayEvent[];
  event_count: number;
}

/**
 * Get cached "On This Day" data for a specific date
 * Returns null if not cached (triggers generation)
 */
export async function getCachedOnThisDay(date: Date = new Date()): Promise<CachedDay | null> {
  const dayKey = formatDayKey(date);
  const currentYear = date.getFullYear();

  const { data, error } = await supabase
    .from('on_this_day_cache')
    .select('*')
    .eq('day_key', dayKey)
    .eq('is_published', true)
    .order('year_generated', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    day_key: data.day_key,
    year_generated: data.year_generated,
    events: data.events as OnThisDayEvent[],
    event_count: data.event_count,
  };
}

/**
 * Generate "On This Day" content for a specific date
 * This is called ONLY if cache is missing
 */
export async function generateOnThisDay(date: Date = new Date()): Promise<CachedDay> {
  const dayKey = formatDayKey(date);
  const currentYear = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  console.log(`🎬 Generating "On This Day" for ${dayKey}...`);

  const events: OnThisDayEvent[] = [];

  // 1. Celebrity Birthdays
  const birthdays = await fetchCelebrityBirthdays(month, day);
  for (const celeb of birthdays) {
    const age = currentYear - celeb.birth_year;
    events.push({
      type: 'birthday',
      title_te: `🎂 ${celeb.name_te || celeb.name_en} పుట్టినరోజు`,
      summary_te: generateBirthdaySummary(celeb, age),
      entity_id: celeb.id,
      entity_name: celeb.name_en,
      year: celeb.birth_year,
      nostalgia_hook: `${age} ఏళ్ల క్రితం ఈ రోజు తెలుగు సినిమా ఒక అద్భుతాన్ని పొందింది!`,
      image_url: celeb.image_url,
    });
  }

  // 2. Death Anniversaries
  const deathAnniversaries = await fetchDeathAnniversaries(month, day);
  for (const celeb of deathAnniversaries) {
    const yearsAgo = currentYear - celeb.death_year;
    events.push({
      type: 'death_anniversary',
      title_te: `🙏 ${celeb.name_te || celeb.name_en} వర్ధంతి`,
      summary_te: generateDeathAnniversarySummary(celeb, yearsAgo),
      entity_id: celeb.id,
      entity_name: celeb.name_en,
      year: celeb.death_year,
      nostalgia_hook: `${yearsAgo} సంవత్సరాల క్రితం మనల్ని వీడిపోయినా, వారి సినిమాలు ఇప్పటికీ మన హృదయాల్లో సజీవంగా ఉన్నాయి.`,
      image_url: celeb.image_url,
    });
  }

  // 3. Movie Release Anniversaries (significant years: 10, 25, 50)
  const movieAnniversaries = await fetchMovieAnniversaries(month, day, currentYear);
  for (const movie of movieAnniversaries) {
    const yearsAgo = currentYear - movie.release_year;
    events.push({
      type: 'movie_release',
      title_te: `🎬 "${movie.title_te || movie.title_en}" విడుదలై ${yearsAgo} సంవత్సరాలు`,
      summary_te: generateMovieAnniversarySummary(movie, yearsAgo),
      entity_id: movie.id,
      entity_name: movie.title_en,
      year: movie.release_year,
      nostalgia_hook: `ఈ క్లాసిక్ సినిమా విడుదలై ${yearsAgo} సంవత్సరాలు పూర్తయ్యాయి!`,
      image_url: movie.poster_url,
    });
  }

  // Sort by importance (deaths first, then birthdays, then movies)
  events.sort((a, b) => {
    const typeOrder = { death_anniversary: 0, birthday: 1, award: 2, movie_release: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Cache the result
  const { error } = await supabase
    .from('on_this_day_cache')
    .upsert({
      day_key: dayKey,
      year_generated: currentYear,
      events,
      event_count: events.length,
      celebrities_count: events.filter(e => e.type === 'birthday' || e.type === 'death_anniversary').length,
      movies_count: events.filter(e => e.type === 'movie_release').length,
      generated_at: new Date().toISOString(),
      is_published: true,
    }, {
      onConflict: 'day_key,year_generated',
    });

  if (error) {
    console.error('Failed to cache On This Day:', error);
  }

  console.log(`✅ Generated ${events.length} events for ${dayKey}`);

  return {
    day_key: dayKey,
    year_generated: currentYear,
    events,
    event_count: events.length,
  };
}

/**
 * Get or generate "On This Day" (with caching)
 * This is the main entry point - checks cache first
 */
export async function getOnThisDay(date: Date = new Date()): Promise<CachedDay> {
  // Check cache first
  const cached = await getCachedOnThisDay(date);
  if (cached && cached.event_count > 0) {
    return cached;
  }

  // Generate if not cached
  return generateOnThisDay(date);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

async function fetchCelebrityBirthdays(month: number, day: number) {
  const { data } = await supabase
    .from('celebrities')
    .select('id, name_en, name_te, birth_date, image_url, occupation')
    .not('birth_date', 'is', null);

  if (!data) return [];

  return data
    .filter(c => {
      if (!c.birth_date) return false;
      const d = new Date(c.birth_date);
      return d.getMonth() + 1 === month && d.getDate() === day;
    })
    .map(c => ({
      ...c,
      birth_year: new Date(c.birth_date).getFullYear(),
    }));
}

async function fetchDeathAnniversaries(month: number, day: number) {
  const { data } = await supabase
    .from('celebrities')
    .select('id, name_en, name_te, death_date, image_url, occupation')
    .not('death_date', 'is', null);

  if (!data) return [];

  return data
    .filter(c => {
      if (!c.death_date) return false;
      const d = new Date(c.death_date);
      return d.getMonth() + 1 === month && d.getDate() === day;
    })
    .map(c => ({
      ...c,
      death_year: new Date(c.death_date).getFullYear(),
    }));
}

async function fetchMovieAnniversaries(month: number, day: number, currentYear: number) {
  const { data } = await supabase
    .from('movies')
    .select('id, title_en, title_te, release_date, poster_url')
    .not('release_date', 'is', null);

  if (!data) return [];

  // Only significant anniversaries: 10, 25, 50, 75 years
  const significantYears = [10, 25, 50, 75, 100];

  return data
    .filter(m => {
      if (!m.release_date) return false;
      const d = new Date(m.release_date);
      if (d.getMonth() + 1 !== month || d.getDate() !== day) return false;
      const yearsAgo = currentYear - d.getFullYear();
      return significantYears.includes(yearsAgo);
    })
    .map(m => ({
      ...m,
      release_year: new Date(m.release_date).getFullYear(),
    }));
}

function generateBirthdaySummary(celeb: any, age: number): string {
  const occupation = celeb.occupation || 'నటుడు';
  return `ప్రముఖ తెలుగు ${occupation} ${celeb.name_te || celeb.name_en} నేడు ${age} వ పుట్టినరోజు జరుపుకుంటున్నారు. తెలుగు సినీ పరిశ్రమకు వారు అందించిన సేవలు అనన్యం.`;
}

function generateDeathAnniversarySummary(celeb: any, yearsAgo: number): string {
  return `మహానటుడు ${celeb.name_te || celeb.name_en} గారు మనల్ని వీడి ${yearsAgo} సంవత్సరాలు అయింది. వారి అద్భుత నటన, అమర గీతాలు నేటికీ తెలుగు ప్రేక్షకుల హృదయాల్లో నిలిచి ఉన్నాయి.`;
}

function generateMovieAnniversarySummary(movie: any, yearsAgo: number): string {
  return `క్లాసిక్ చిత్రం "${movie.title_te || movie.title_en}" విడుదలై ${yearsAgo} సంవత్సరాలు పూర్తయ్యాయి. ఈ సినిమా తెలుగు సినీ చరిత్రలో ఒక మైలురాయిగా నిలిచింది.`;
}
