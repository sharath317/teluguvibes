/**
 * Historic Intelligence System
 * Evergreen Content Engine for Telugu Cinema
 *
 * Auto-generates:
 * - Actor/actress birthdays
 * - Death anniversaries
 * - Debut anniversaries
 * - Movie release anniversaries
 * - "On This Day in Telugu Cinema" posts
 *
 * Features:
 * - Performance-aware recycling
 * - Anti-repetition fatigue
 * - AI-generated Telugu content
 * - Smart priority ranking
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface HistoricEvent {
  event_id: string;
  event_type: string;
  entity_type: string;
  person_id: string | null;
  movie_id: string | null;
  title_en: string;
  title_te: string | null;
  event_year: number;
  years_ago: number;
  priority_score: number;
  fatigue_score: number;
  is_milestone_year: boolean;
  times_published: number;
  last_performance: number;
}

export interface MovieAnniversary {
  anniversary_id: string;
  movie_id: string;
  movie_title_en: string;
  movie_title_te: string | null;
  release_year: number;
  years_ago: number;
  is_milestone: boolean;
  director_name: string | null;
  hero_name: string | null;
  poster_url: string | null;
  significance_score: number;
}

export interface GeneratedDraft {
  id: string;
  title: string;
  body: string;
  event_id: string;
  event_type: string;
  image_url: string | null;
}

export interface DailyJobResult {
  date: string;
  events_found: number;
  drafts_generated: number;
  drafts_updated: number;
  drafts_skipped: number;
  errors: string[];
  generated_posts: GeneratedDraft[];
}

// ============================================================
// DATE UTILITIES
// ============================================================

function getTodayComponents(): { month: number; day: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    day: now.getDate(),
    year: now.getFullYear(),
  };
}

function formatDateForDisplay(month: number, day: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[month - 1]} ${day}`;
}

function isMilestoneYear(yearsAgo: number): boolean {
  return [1, 5, 10, 25, 50, 75, 100].includes(yearsAgo) || yearsAgo % 25 === 0;
}

// ============================================================
// EVENT FETCHING
// ============================================================

/**
 * Fetch today's historic events with smart filtering
 */
export async function fetchTodaysHistoricEvents(
  maxResults: number = 15
): Promise<HistoricEvent[]> {
  const { month, day, year } = getTodayComponents();

  console.log(`📅 Fetching historic events for ${formatDateForDisplay(month, day)}...`);

  const { data, error } = await supabase.rpc('get_todays_historic_events', {
    p_month: month,
    p_day: day,
    p_current_year: year,
    p_max_results: maxResults,
  });

  if (error) {
    console.error('Error fetching historic events:', error);

    // Fallback to direct query
    return await fetchHistoricEventsFallback(month, day, year, maxResults);
  }

  console.log(`✅ Found ${data?.length || 0} historic events`);
  return data || [];
}

/**
 * Fallback query if RPC not available
 */
async function fetchHistoricEventsFallback(
  month: number,
  day: number,
  year: number,
  maxResults: number
): Promise<HistoricEvent[]> {
  const { data, error } = await supabase
    .from('historic_events')
    .select('*')
    .eq('event_month', month)
    .eq('event_day', day)
    .eq('is_active', true)
    .lt('fatigue_score', 80)
    .order('priority_score', { ascending: false })
    .limit(maxResults);

  if (error) {
    console.error('Fallback query failed:', error);
    return [];
  }

  return (data || []).map(e => ({
    event_id: e.id,
    event_type: e.event_type,
    entity_type: e.entity_type,
    person_id: e.person_id,
    movie_id: e.movie_id,
    title_en: e.title_en,
    title_te: e.title_te,
    event_year: e.event_year,
    years_ago: year - e.event_year,
    priority_score: e.priority_score,
    fatigue_score: e.fatigue_score,
    is_milestone_year: isMilestoneYear(year - e.event_year),
    times_published: e.times_published,
    last_performance: 0,
  }));
}

/**
 * Fetch today's movie anniversaries
 */
export async function fetchTodaysMovieAnniversaries(): Promise<MovieAnniversary[]> {
  const { month, day, year } = getTodayComponents();

  console.log(`🎬 Fetching movie anniversaries for ${formatDateForDisplay(month, day)}...`);

  const { data, error } = await supabase.rpc('get_todays_movie_anniversaries', {
    p_month: month,
    p_day: day,
    p_current_year: year,
  });

  if (error) {
    console.error('Error fetching movie anniversaries:', error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} movie anniversaries`);
  return data || [];
}

/**
 * Fetch upcoming events for the next N days
 */
export async function fetchUpcomingEvents(days: number = 7): Promise<{
  date: string;
  events: HistoricEvent[];
}[]> {
  const today = new Date();
  const year = today.getFullYear();
  const results: { date: string; events: HistoricEvent[] }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const { data } = await supabase
      .from('historic_events')
      .select('*')
      .eq('event_month', month)
      .eq('event_day', day)
      .eq('is_active', true)
      .order('priority_score', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      results.push({
        date: `${month}/${day}`,
        events: data.map(e => ({
          event_id: e.id,
          event_type: e.event_type,
          entity_type: e.entity_type,
          person_id: e.person_id,
          movie_id: e.movie_id,
          title_en: e.title_en,
          title_te: e.title_te,
          event_year: e.event_year,
          years_ago: year - e.event_year,
          priority_score: e.priority_score,
          fatigue_score: e.fatigue_score,
          is_milestone_year: isMilestoneYear(year - e.event_year),
          times_published: e.times_published,
          last_performance: 0,
        })),
      });
    }
  }

  return results;
}

// ============================================================
// FATIGUE CHECKING
// ============================================================

/**
 * Check if content about an entity is fatigued
 */
export async function checkEntityFatigue(
  entityId: string,
  entityType: string
): Promise<{
  isFatigued: boolean;
  score: number;
  reason: string | null;
  cooldownDays: number;
}> {
  const { data } = await supabase
    .from('content_fatigue_tracker')
    .select('*')
    .eq('entity_id', entityId)
    .single();

  if (!data) {
    return { isFatigued: false, score: 0, reason: null, cooldownDays: 0 };
  }

  const isFatigued = data.fatigue_score >= 70;

  return {
    isFatigued,
    score: data.fatigue_score,
    reason: data.fatigue_reason,
    cooldownDays: data.cooldown_days || 0,
  };
}

/**
 * Filter events by fatigue
 */
export async function filterByFatigue(
  events: HistoricEvent[]
): Promise<HistoricEvent[]> {
  const filtered: HistoricEvent[] = [];

  for (const event of events) {
    // Check event-level fatigue
    if (event.fatigue_score >= 80) {
      console.log(`  ⏭️ Skipping ${event.title_en} - event fatigued (${event.fatigue_score})`);
      continue;
    }

    // Check entity-level fatigue
    const entityId = event.person_id || event.movie_id;
    if (entityId) {
      const fatigue = await checkEntityFatigue(entityId, event.entity_type);
      if (fatigue.isFatigued) {
        console.log(`  ⏭️ Skipping ${event.title_en} - entity fatigued (${fatigue.score})`);
        continue;
      }
    }

    filtered.push(event);
  }

  return filtered;
}

// ============================================================
// PERFORMANCE-AWARE RECYCLING
// ============================================================

/**
 * Get high-performing content eligible for recycling
 */
export async function getRecyclableContent(
  limit: number = 10
): Promise<{
  event_id: string;
  post_id: string;
  title: string;
  event_type: string;
  performance_score: number;
  recycle_strategy: string;
  last_published: string;
}[]> {
  const { data, error } = await supabase
    .from('historic_post_tracking')
    .select(`
      id,
      event_id,
      post_id,
      title_used,
      performance_score,
      published_year,
      historic_events (
        event_type,
        title_en
      ),
      evergreen_intelligence (
        recycle_strategy
      )
    `)
    .eq('eligible_for_recycle', true)
    .gte('performance_score', 70)
    .order('recycle_priority', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recyclable content:', error);
    return [];
  }

  return (data || []).map(d => ({
    event_id: d.event_id,
    post_id: d.post_id || '',
    title: d.title_used || (d.historic_events as any)?.title_en || '',
    event_type: (d.historic_events as any)?.event_type || '',
    performance_score: d.performance_score,
    recycle_strategy: (d.evergreen_intelligence as any)?.[0]?.recycle_strategy || 'refresh',
    last_published: d.published_year?.toString() || '',
  }));
}

/**
 * Determine recycle strategy based on performance
 */
export function determineRecycleStrategy(
  performance: number,
  timesPublished: number,
  engagementTrend: 'rising' | 'stable' | 'declining'
): 'refresh' | 'repost' | 'enhance' | 'skip' {
  // High performance + rising trend = can repost with minor refresh
  if (performance >= 85 && engagementTrend === 'rising') {
    return 'repost';
  }

  // High performance + stable = refresh with new year context
  if (performance >= 70 && engagementTrend === 'stable') {
    return 'refresh';
  }

  // Medium performance or declining = enhance with new content
  if (performance >= 50 || engagementTrend === 'declining') {
    return 'enhance';
  }

  // Low performance + many publications = skip
  if (performance < 50 && timesPublished >= 3) {
    return 'skip';
  }

  return 'refresh';
}

// ============================================================
// CONTENT GENERATION
// ============================================================

/**
 * Fetch entity details for content generation
 */
async function fetchEntityDetails(event: HistoricEvent): Promise<{
  name_en: string;
  name_te: string | null;
  bio: string | null;
  occupation: string[];
  image_url: string | null;
  notable_works: string[];
}> {
  if (event.person_id) {
    const { data } = await supabase
      .from('kg_persons')
      .select('name_en, name_te, occupation, image_url')
      .eq('id', event.person_id)
      .single();

    if (data) {
      // Get notable works
      const { data: works } = await supabase
        .from('kg_filmography')
        .select('movie_title_en')
        .eq('person_id', event.person_id)
        .order('release_year', { ascending: false })
        .limit(5);

      return {
        name_en: data.name_en,
        name_te: data.name_te,
        bio: null,
        occupation: data.occupation || [],
        image_url: data.image_url,
        notable_works: works?.map(w => w.movie_title_en) || [],
      };
    }
  }

  if (event.movie_id) {
    const { data } = await supabase
      .from('catalogue_movies')
      .select('title_en, title_te, synopsis, poster_url, director_names, hero_names')
      .eq('id', event.movie_id)
      .single();

    if (data) {
      return {
        name_en: data.title_en,
        name_te: data.title_te,
        bio: data.synopsis,
        occupation: [],
        image_url: data.poster_url,
        notable_works: [
          ...(data.director_names || []).map((d: string) => `Dir: ${d}`),
          ...(data.hero_names || []).map((h: string) => `Cast: ${h}`),
        ],
      };
    }
  }

  return {
    name_en: event.title_en,
    name_te: event.title_te,
    bio: null,
    occupation: [],
    image_url: null,
    notable_works: [],
  };
}

/**
 * Generate AI content for historic event
 */
async function generateAIContent(
  event: HistoricEvent,
  entityDetails: {
    name_en: string;
    name_te: string | null;
    bio: string | null;
    occupation: string[];
    image_url: string | null;
    notable_works: string[];
  }
): Promise<{ title: string; body: string } | null> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.log('  ⚠️ GROQ_API_KEY not configured');
    return null;
  }

  const name = entityDetails.name_te || entityDetails.name_en;
  const { year } = getTodayComponents();

  // Build prompt based on event type
  const eventTypePrompts: Record<string, string> = {
    birthday: `
      Write a warm birthday tribute article for ${name} who is turning ${event.years_ago} years old.
      Include: emotional opening, career highlights, why audiences love them, birthday wishes.
      Tone: celebratory, warm, respectful.
    `,
    death_anniversary: `
      Write a respectful tribute for ${name} on their ${event.years_ago}th death anniversary.
      Include: emotional opening about their legacy, iconic contributions, memories they left behind.
      Tone: respectful, nostalgic, honoring their memory.
    `,
    debut_anniversary: `
      Write about ${name}'s ${event.years_ago}th anniversary in Telugu cinema.
      Include: how they started, evolution of their career, major milestones.
      Tone: celebratory, reflective on their journey.
    `,
    movie_release: `
      Write about this movie completing ${event.years_ago} years.
      Include: impact when released, memorable moments, why it's still remembered.
      Tone: nostalgic, celebrating the film's legacy.
    `,
  };

  const prompt = `
You are a Telugu entertainment journalist for TeluguVibes.

Write a Telugu article for: ${event.event_type.replace('_', ' ')}

${eventTypePrompts[event.event_type] || 'Write an engaging tribute article.'}

**ENTITY INFO:**
- Name: ${entityDetails.name_en} (${entityDetails.name_te || 'N/A'})
- Occupation: ${entityDetails.occupation.join(', ') || 'Telugu Cinema'}
- Notable Works: ${entityDetails.notable_works.slice(0, 5).join(', ') || 'N/A'}

**REQUIREMENTS:**
1. Language: Pure Telugu (English names OK)
2. Length: 250-400 words
3. Tone: ${event.event_type === 'death_anniversary' ? 'Respectful and nostalgic' : 'Celebratory and warm'}
4. Structure with clear sections
5. NO speculation or false claims
6. End with a heartfelt note

**OUTPUT:** Return JSON only:
{
  "title": "Telugu title",
  "body": "Full article with ** section headings"
}
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a Telugu journalist. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const parsed = JSON.parse(content);
      return { title: parsed.title, body: parsed.body };
    }
  } catch (error) {
    console.error('AI generation error:', error);
  }

  return null;
}

/**
 * Generate fallback content without AI
 */
function generateFallbackContent(
  event: HistoricEvent,
  entityDetails: {
    name_en: string;
    name_te: string | null;
    notable_works: string[];
  }
): { title: string; body: string } {
  const name = entityDetails.name_te || entityDetails.name_en;
  const { year } = getTodayComponents();

  const templates: Record<string, { title: string; body: string }> = {
    birthday: {
      title: `${name} ${event.years_ago}వ పుట్టినరోజు శుభాకాంక్షలు`,
      body: `**🎂 పుట్టినరోజు శుభాకాంక్షలు!**

నేడు మన ప్రియమైన తార ${name} పుట్టినరోజు సందర్భంగా అభిమానులందరికీ TeluguVibes హార్దిక శుభాకాంక్షలు అందిస్తోంది.

**కెరీర్ విశేషాలు**

${name} తెలుగు సినీ పరిశ్రమలో ఎన్నో అద్భుతమైన సినిమాలు చేశారు.${entityDetails.notable_works.length > 0 ? ` వారి ప్రముఖ చిత్రాలు: ${entityDetails.notable_works.slice(0, 3).join(', ')}.` : ''}

**అభిమానుల ప్రేమ**

తెలుగు ప్రేక్షకుల హృదయాలలో ${name} ఎప్పటికీ ప్రత్యేక స్థానం కలిగి ఉంటారు.

**శుభాకాంక్షలు**

${name} గారికి ఆరోగ్యం, సంతోషం, మరిన్ని విజయాలు కలగాలని TeluguVibes కోరుకుంటోంది! 🎉`
    },
    death_anniversary: {
      title: `${name} ${event.years_ago}వ వర్ధంతి: మరువలేని తార`,
      body: `**🙏 స్మృత్యంజలి**

నేడు ${name} గారి ${event.years_ago}వ వర్ధంతి. ${event.event_year}లో వారు మనల్ని విడిచి వెళ్లిపోయినా, వారి జ్ఞాపకాలు ఇప్పటికీ సజీవంగా ఉన్నాయి.

**అజరామరమైన వారసత్వం**

${name} తెలుగు సినీ పరిశ్రమకు చేసిన సేవలు చిరస్మరణీయం.${entityDetails.notable_works.length > 0 ? ` వారి అద్భుత చిత్రాలు: ${entityDetails.notable_works.slice(0, 3).join(', ')}.` : ''}

**నివాళి**

వారు వెళ్ళిపోయినా, వారి కళ, వారి నటన తరతరాలకు స్ఫూర్తిగా నిలుస్తాయి.

TeluguVibes తరపున భావపూర్వక నివాళులు. 🕯️`
    },
    movie_release: {
      title: `${name}: ${event.years_ago} ఏళ్ల ప్రత్యేక సందర్భం`,
      body: `**🎬 సినీ మైలురాయి**

నేడు "${name}" సినిమా ${event.years_ago} ఏళ్లు పూర్తి చేసుకుంది.

**ప్రభావం**

ఈ సినిమా తెలుగు సినీ చరిత్రలో ప్రత్యేక స్థానం సంపాదించుకుంది.

**నేటికీ గుర్తుండే**

సంవత్సరాలు గడిచినా, ఈ చిత్రం ప్రేక్షకుల హృదయాలలో చిరస్థాయిగా నిలిచి ఉంది.

TeluguVibes ఈ ప్రత్యేక సందర్భాన్ని గుర్తు చేసుకుంటోంది! 🌟`
    },
  };

  return templates[event.event_type] || {
    title: `${name}: నేటి ప్రత్యేక సందర్భం`,
    body: `**⭐ ప్రత్యేక రోజు**

నేడు ${name}కు సంబంధించిన ప్రత్యేక సందర్భం. తెలుగు సినీ చరిత్రలో ఈ రోజు ముఖ్యమైనది.

TeluguVibes ఈ సందర్భాన్ని అభిమానులతో కలిసి జరుపుకుంటోంది! 🎊`
  };
}

// ============================================================
// DRAFT CREATION
// ============================================================

/**
 * Create draft post from historic event
 */
async function createDraftFromEvent(
  event: HistoricEvent
): Promise<GeneratedDraft | null> {
  const { year } = getTodayComponents();

  console.log(`\n🎬 Processing: ${event.title_en}`);

  // Check for existing draft this year
  const { data: existingTracking } = await supabase
    .from('historic_post_tracking')
    .select('id, post_id')
    .eq('event_id', event.event_id)
    .eq('published_year', year)
    .single();

  if (existingTracking?.post_id) {
    console.log('  ⏭️ Draft already exists for this year');
    return null;
  }

  // Fetch entity details
  const entityDetails = await fetchEntityDetails(event);

  // Generate content
  let content = await generateAIContent(event, entityDetails);

  if (!content || content.body.length < 100) {
    console.log('  ⚠️ Using fallback template');
    content = generateFallbackContent(event, entityDetails);
  }

  // Generate slug
  const slugBase = event.title_en
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const slug = `${slugBase}-${year}`;

  // Create post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      title: content.title,
      slug,
      telugu_body: content.body,
      category: 'entertainment',
      status: 'draft',
      image_urls: entityDetails.image_url ? [entityDetails.image_url] : [],
    })
    .select('id')
    .single();

  if (postError) {
    console.error('  ❌ Failed to create post:', postError);
    return null;
  }

  // Create tracking record
  await supabase.from('historic_post_tracking').insert({
    event_id: event.event_id,
    post_id: post.id,
    published_year: year,
    title_used: content.title,
    was_ai_generated: true,
  });

  // Update event fatigue
  await supabase.rpc('update_event_fatigue', { p_event_id: event.event_id }).catch(() => {
    // Fallback update if RPC doesn't exist
    supabase
      .from('historic_events')
      .update({
        times_published: event.times_published + 1,
        last_published_at: new Date().toISOString(),
      })
      .eq('id', event.event_id);
  });

  console.log('  ✅ Draft created successfully');

  return {
    id: post.id,
    title: content.title,
    body: content.body,
    event_id: event.event_id,
    event_type: event.event_type,
    image_url: entityDetails.image_url,
  };
}

// ============================================================
// MAIN CRON JOB
// ============================================================

/**
 * Run the daily Historic Intelligence job
 * This should be called by a cron job at 5 AM IST
 */
export async function runDailyHistoricJob(): Promise<DailyJobResult> {
  const startTime = Date.now();
  const { month, day, year } = getTodayComponents();

  console.log('\n🌅 ============================================');
  console.log('   HISTORIC INTELLIGENCE - DAILY JOB');
  console.log(`   Date: ${formatDateForDisplay(month, day)}, ${year}`);
  console.log('============================================\n');

  const result: DailyJobResult = {
    date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    events_found: 0,
    drafts_generated: 0,
    drafts_updated: 0,
    drafts_skipped: 0,
    errors: [],
    generated_posts: [],
  };

  try {
    // Step 1: Fetch today's historic events
    console.log('📋 Step 1: Fetching historic events...');
    const historicEvents = await fetchTodaysHistoricEvents(20);
    result.events_found += historicEvents.length;

    // Step 2: Fetch movie anniversaries
    console.log('\n📋 Step 2: Fetching movie anniversaries...');
    const movieAnniversaries = await fetchTodaysMovieAnniversaries();

    // Convert movie anniversaries to historic events format
    const movieEvents: HistoricEvent[] = movieAnniversaries.map(ma => ({
      event_id: ma.anniversary_id,
      event_type: 'movie_release',
      entity_type: 'movie',
      person_id: null,
      movie_id: ma.movie_id,
      title_en: ma.movie_title_en,
      title_te: ma.movie_title_te,
      event_year: ma.release_year,
      years_ago: ma.years_ago,
      priority_score: ma.significance_score,
      fatigue_score: 0,
      is_milestone_year: ma.is_milestone,
      times_published: 0,
      last_performance: 0,
    }));

    result.events_found += movieEvents.length;

    // Combine all events
    const allEvents = [...historicEvents, ...movieEvents];

    // Step 3: Filter by fatigue
    console.log('\n📋 Step 3: Filtering by fatigue...');
    const filteredEvents = await filterByFatigue(allEvents);
    console.log(`  ${allEvents.length} → ${filteredEvents.length} after fatigue filter`);

    // Step 4: Sort by priority (milestone years get boost)
    const sortedEvents = filteredEvents.sort((a, b) => {
      const aScore = a.priority_score + (a.is_milestone_year ? 30 : 0) - (a.fatigue_score * 0.5);
      const bScore = b.priority_score + (b.is_milestone_year ? 30 : 0) - (b.fatigue_score * 0.5);
      return bScore - aScore;
    });

    // Step 5: Generate drafts (limit to top 10)
    console.log('\n📋 Step 4: Generating drafts...');
    const eventsToProcess = sortedEvents.slice(0, 10);

    for (const event of eventsToProcess) {
      try {
        const draft = await createDraftFromEvent(event);

        if (draft) {
          result.drafts_generated++;
          result.generated_posts.push(draft);
        } else {
          result.drafts_skipped++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        result.errors.push(`${event.title_en}: ${error}`);
      }
    }

    // Step 6: Log results
    const executionTime = Date.now() - startTime;

    await supabase.from('historic_generation_log').insert({
      run_date: result.date,
      total_events_found: result.events_found,
      birthdays_found: allEvents.filter(e => e.event_type === 'birthday').length,
      death_anniversaries_found: allEvents.filter(e => e.event_type === 'death_anniversary').length,
      movie_anniversaries_found: movieEvents.length,
      events_after_fatigue_filter: filteredEvents.length,
      drafts_generated: result.drafts_generated,
      drafts_skipped: result.drafts_skipped,
      generation_errors: result.errors.length,
      execution_time_ms: executionTime,
      events_processed: eventsToProcess.map(e => ({ id: e.event_id, type: e.event_type, title: e.title_en })),
      errors: result.errors,
      status: 'completed',
    });

    console.log('\n📊 ============================================');
    console.log('   JOB SUMMARY');
    console.log('============================================');
    console.log(`  Events Found: ${result.events_found}`);
    console.log(`  Drafts Generated: ${result.drafts_generated}`);
    console.log(`  Drafts Skipped: ${result.drafts_skipped}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Execution Time: ${executionTime}ms`);
    console.log('============================================\n');

  } catch (error) {
    result.errors.push(`Fatal error: ${error}`);
    console.error('Job failed:', error);
  }

  return result;
}

/**
 * Get job stats for admin dashboard
 */
export async function getJobStats(): Promise<{
  last_run: string | null;
  total_events_today: number;
  upcoming_events_7d: number;
  recyclable_content: number;
  avg_performance: number;
}> {
  // Get last run
  const { data: lastLog } = await supabase
    .from('historic_generation_log')
    .select('run_date, total_events_found')
    .order('run_date', { ascending: false })
    .limit(1)
    .single();

  // Get today's events count
  const { month, day, year } = getTodayComponents();
  const { count: todayCount } = await supabase
    .from('historic_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_month', month)
    .eq('event_day', day)
    .eq('is_active', true);

  // Get upcoming events (next 7 days)
  const upcoming = await fetchUpcomingEvents(7);
  const upcomingCount = upcoming.reduce((acc, d) => acc + d.events.length, 0);

  // Get recyclable content count
  const { count: recyclableCount } = await supabase
    .from('historic_post_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('eligible_for_recycle', true)
    .gte('performance_score', 70);

  // Get average performance
  const { data: avgData } = await supabase
    .from('historic_post_tracking')
    .select('performance_score')
    .not('performance_score', 'is', null);

  const avgPerformance = avgData && avgData.length > 0
    ? avgData.reduce((acc, d) => acc + d.performance_score, 0) / avgData.length
    : 0;

  return {
    last_run: lastLog?.run_date || null,
    total_events_today: todayCount || 0,
    upcoming_events_7d: upcomingCount,
    recyclable_content: recyclableCount || 0,
    avg_performance: Math.round(avgPerformance * 10) / 10,
  };
}
