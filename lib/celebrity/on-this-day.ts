/**
 * "On This Day" Automation Engine
 * Generates draft posts for celebrity events
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Celebrity,
  CelebrityEvent,
  CelebrityWork,
  TodaysEvent,
  HistoricPost,
  PostGenerationContext
} from '@/types/celebrity';
import { generateHistoricPostContent } from './content-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get today's date components
 */
function getTodayComponents(): { month: number; day: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    day: now.getDate(),
    year: now.getFullYear(),
  };
}

/**
 * Fetch today's celebrity events from database
 */
export async function fetchTodaysEvents(): Promise<TodaysEvent[]> {
  const { month, day } = getTodayComponents();

  console.log(`📅 Fetching events for ${month}/${day}...`);

  // Use the database function
  const { data, error } = await supabase
    .rpc('get_todays_events', { p_month: month, p_day: day });

  if (error) {
    console.error('Error fetching today\'s events:', error);

    // Fallback to direct query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('celebrity_events')
      .select(`
        id,
        event_type,
        event_year,
        priority_score,
        celebrity:celebrities (
          id,
          name_en,
          name_te,
          popularity_score,
          profile_image
        )
      `)
      .eq('event_month', month)
      .eq('event_day', day)
      .eq('is_active', true)
      .order('priority_score', { ascending: false });

    if (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }

    const { year } = getTodayComponents();
    return (fallbackData || []).map((e: any) => ({
      event_id: e.id,
      celebrity_id: e.celebrity.id,
      celebrity_name: e.celebrity.name_en,
      celebrity_name_te: e.celebrity.name_te,
      event_type: e.event_type,
      event_year: e.event_year,
      years_ago: year - e.event_year,
      priority_score: e.priority_score,
      popularity_score: e.celebrity.popularity_score,
      profile_image: e.celebrity.profile_image,
    }));
  }

  console.log(`✅ Found ${data?.length || 0} events for today`);
  return data || [];
}

/**
 * Fetch celebrity details for content generation
 */
async function fetchCelebrityDetails(celebrityId: string): Promise<Celebrity | null> {
  const { data, error } = await supabase
    .from('celebrities')
    .select('*')
    .eq('id', celebrityId)
    .single();

  if (error) {
    console.error('Error fetching celebrity:', error);
    return null;
  }

  return data;
}

/**
 * Fetch celebrity's notable works
 */
async function fetchCelebrityWorks(celebrityId: string): Promise<CelebrityWork[]> {
  const { data, error } = await supabase
    .from('celebrity_works')
    .select('*')
    .eq('celebrity_id', celebrityId)
    .order('release_date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching works:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a historic post already exists for this year
 */
async function checkExistingPost(
  celebrityId: string,
  eventType: string,
  year: number
): Promise<HistoricPost | null> {
  const { data, error } = await supabase
    .from('historic_posts')
    .select('*')
    .eq('celebrity_id', celebrityId)
    .eq('event_type', eventType)
    .eq('event_year', year)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Error checking existing post:', error);
  }

  return data;
}

/**
 * Generate slug for historic post
 */
function generateSlugPattern(name: string, eventType: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  const eventSlug = eventType.replace('_', '-');

  return `${cleanName}-${eventSlug}`;
}

/**
 * Create draft post in database
 */
async function createDraftPost(
  context: PostGenerationContext,
  content: { title: string; body: string; seo_title?: string; seo_description?: string }
): Promise<string | null> {
  const { year } = getTodayComponents();
  const slugPattern = generateSlugPattern(context.celebrity.name_en, context.event.event_type);
  const fullSlug = `${slugPattern}-${year}`;

  // Create the main post (without seo fields as they don't exist in posts table)
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      title: content.title,
      slug: fullSlug,
      telugu_body: content.body,
      category: 'entertainment',
      status: 'draft',
      image_urls: context.celebrity.profile_image ? [context.celebrity.profile_image] : [],
    })
    .select('id')
    .single();

  if (postError) {
    console.error('Error creating post:', postError);
    return null;
  }

  // Create historic post record
  const { error: historicError } = await supabase
    .from('historic_posts')
    .insert({
      celebrity_id: context.celebrity.id,
      event_id: context.event.id,
      post_id: post.id,
      event_type: context.event.event_type,
      event_year: year,
      slug_pattern: slugPattern,
      status: 'draft',
    });

  if (historicError) {
    console.error('Error creating historic post record:', historicError);
  }

  return post.id;
}

/**
 * Update existing post for new year
 */
async function updateExistingPost(
  existingPost: HistoricPost,
  context: PostGenerationContext,
  content: { title: string; body: string }
): Promise<boolean> {
  const { year } = getTodayComponents();

  // Update the main post
  const { error: postError } = await supabase
    .from('posts')
    .update({
      title: content.title,
      telugu_body: content.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingPost.post_id);

  if (postError) {
    console.error('Error updating post:', postError);
    return false;
  }

  // Update historic post record
  const { error: historicError } = await supabase
    .from('historic_posts')
    .update({
      event_year: year,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingPost.id);

  if (historicError) {
    console.error('Error updating historic post record:', historicError);
  }

  return true;
}

/**
 * Process a single event and generate draft
 */
async function processEvent(event: TodaysEvent): Promise<{ success: boolean; postId?: string; action: string }> {
  const { year } = getTodayComponents();

  console.log(`\n🎬 Processing: ${event.celebrity_name} - ${event.event_type}`);

  // Check for existing post
  const existingPost = await checkExistingPost(event.celebrity_id, event.event_type, year);

  if (existingPost && existingPost.status === 'published') {
    console.log('  ⏭️ Already published this year, skipping');
    return { success: true, action: 'skipped' };
  }

  // Fetch full celebrity data
  const celebrity = await fetchCelebrityDetails(event.celebrity_id);
  if (!celebrity) {
    console.log('  ❌ Celebrity not found');
    return { success: false, action: 'celebrity_not_found' };
  }

  // Fetch works
  const works = await fetchCelebrityWorks(event.celebrity_id);

  // Build context
  const context: PostGenerationContext = {
    celebrity,
    event: {
      id: event.event_id,
      celebrity_id: event.celebrity_id,
      event_type: event.event_type,
      event_month: getTodayComponents().month,
      event_day: getTodayComponents().day,
      event_year: event.event_year,
      priority_score: event.priority_score,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    works,
    yearsAgo: event.years_ago,
    currentYear: year,
  };

  // Generate content
  const content = await generateHistoricPostContent(context);

  if (existingPost) {
    // Update existing
    const success = await updateExistingPost(existingPost, context, content);
    console.log(success ? '  ✅ Updated existing draft' : '  ❌ Update failed');
    return { success, postId: existingPost.post_id || undefined, action: 'updated' };
  } else {
    // Create new
    const postId = await createDraftPost(context, content);
    console.log(postId ? '  ✅ Created new draft' : '  ❌ Creation failed');
    return { success: !!postId, postId: postId || undefined, action: 'created' };
  }
}

/**
 * Main function: Run daily "On This Day" job
 */
export async function runOnThisDayJob(): Promise<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}> {
  console.log('\n🌅 Starting On This Day Job...');
  console.log(`📅 Date: ${new Date().toLocaleDateString('en-IN')}\n`);

  const stats = { processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

  // Fetch today's events
  const events = await fetchTodaysEvents();

  if (events.length === 0) {
    console.log('📭 No events for today');
    return stats;
  }

  console.log(`📋 Found ${events.length} events to process\n`);

  // Sort by priority and popularity
  const sortedEvents = events.sort((a, b) => {
    const scoreA = a.priority_score * 0.6 + a.popularity_score * 0.4;
    const scoreB = b.priority_score * 0.6 + b.popularity_score * 0.4;
    return scoreB - scoreA;
  });

  // Process top events (limit to avoid overwhelming)
  const eventsToProcess = sortedEvents.slice(0, 10);

  for (const event of eventsToProcess) {
    const result = await processEvent(event);
    stats.processed++;

    switch (result.action) {
      case 'created':
        stats.created++;
        break;
      case 'updated':
        stats.updated++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      default:
        stats.failed++;
    }

    // Small delay to be nice to APIs
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Job Summary:');
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Created: ${stats.created}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);

  return stats;
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(days: number = 7): Promise<TodaysEvent[]> {
  const events: TodaysEvent[] = [];
  const today = new Date();
  const { year } = getTodayComponents();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const { data, error } = await supabase
      .from('celebrity_events')
      .select(`
        id,
        event_type,
        event_year,
        priority_score,
        celebrity:celebrities (
          id,
          name_en,
          name_te,
          popularity_score,
          profile_image
        )
      `)
      .eq('event_month', month)
      .eq('event_day', day)
      .eq('is_active', true)
      .order('priority_score', { ascending: false })
      .limit(5);

    if (!error && data) {
      events.push(...data.map((e: any) => ({
        event_id: e.id,
        celebrity_id: e.celebrity.id,
        celebrity_name: e.celebrity.name_en,
        celebrity_name_te: e.celebrity.name_te,
        event_type: e.event_type,
        event_year: e.event_year,
        years_ago: year - e.event_year,
        priority_score: e.priority_score,
        popularity_score: e.celebrity.popularity_score,
        profile_image: e.celebrity.profile_image,
        _date: `${month}/${day}`,
      })));
    }
  }

  return events;
}
