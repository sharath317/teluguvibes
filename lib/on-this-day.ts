/**
 * Historical "On This Day" Content Engine
 * Generates nostalgic content from:
 * - Celebrity birthdays
 * - Movie release anniversaries
 * - Sports events
 * - Historical moments
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OnThisDayEvent {
  id: string;
  month: number;
  day: number;
  event_type: 'birthday' | 'movie_release' | 'sports' | 'historical' | 'death_anniversary';
  entity_name: string;
  entity_name_te?: string;
  year_occurred?: number;
  description?: string;
  description_te?: string;
  image_url?: string;
  metadata?: Record<string, any>;
}

interface GeneratedContent {
  title: string;
  body: string;
  category: string;
  imageQuery: string;
}

// Event type to category mapping
const EVENT_TYPE_CATEGORIES: Record<string, string> = {
  birthday: 'entertainment',
  movie_release: 'entertainment',
  sports: 'sports',
  historical: 'trending',
  death_anniversary: 'entertainment',
};

/**
 * Get "On This Day" events for a specific date
 */
export async function getOnThisDayEvents(
  month?: number,
  day?: number
): Promise<OnThisDayEvent[]> {
  const today = new Date();
  const targetMonth = month || today.getMonth() + 1;
  const targetDay = day || today.getDate();

  const { data, error } = await supabase
    .from('on_this_day_events')
    .select('*')
    .eq('month', targetMonth)
    .eq('day', targetDay)
    .eq('is_active', true)
    .order('year_occurred', { ascending: false });

  if (error) {
    console.error('Error fetching On This Day events:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate nostalgic content from an event
 */
export async function generateNostalgiaContent(
  event: OnThisDayEvent
): Promise<GeneratedContent | null> {
  const currentYear = new Date().getFullYear();
  const yearsAgo = event.year_occurred ? currentYear - event.year_occurred : null;

  switch (event.event_type) {
    case 'birthday':
      return generateBirthdayContent(event, yearsAgo);
    case 'movie_release':
      return generateMovieAnniversaryContent(event, yearsAgo);
    case 'sports':
      return generateSportsMemoryContent(event, yearsAgo);
    case 'death_anniversary':
      return generateTributeContent(event, yearsAgo);
    default:
      return generateGeneralHistoricalContent(event, yearsAgo);
  }
}

/**
 * Generate birthday content
 */
function generateBirthdayContent(
  event: OnThisDayEvent,
  yearsAgo: number | null
): GeneratedContent {
  const name = event.entity_name_te || event.entity_name;
  const age = yearsAgo;

  return {
    title: `🎂 ${name} పుట్టినరోజు: ${age ? `${age} ఏళ్ల` : ''} సెలబ్రేషన్!`,
    body: `[ఆటో-జెనరేట్ చేయబడుతుంది]

ఈ రోజు ${name} పుట్టినరోజు సందర్భంగా అభిమానులు సోషల్ మీడియాలో సెలబ్రేషన్స్ చేస్తున్నారు!

${event.description_te || event.description || ''}

**ఫిల్మోగ్రఫీ హైలైట్స్:**
[AI జెనరేట్ చేస్తుంది]

**ఫ్యాన్ విషెస్:**
[సోషల్ మీడియా ట్రెండ్స్ జోడించబడతాయి]

🎉 పుట్టినరోజు శుభాకాంక్షలు, ${name}!`,
    category: 'entertainment',
    imageQuery: `${event.entity_name} actor celebrity`,
  };
}

/**
 * Generate movie anniversary content
 */
function generateMovieAnniversaryContent(
  event: OnThisDayEvent,
  yearsAgo: number | null
): GeneratedContent {
  const name = event.entity_name_te || event.entity_name;

  return {
    title: `🎬 ${name}: ${yearsAgo ? `${yearsAgo} సంవత్సరాల` : ''} చరిత్ర!`,
    body: `[ఆటో-జెనరేట్ చేయబడుతుంది]

ఈ రోజు ${name} సినిమా విడుదలైన రోజు${yearsAgo ? ` - ${yearsAgo} సంవత్సరాల క్రితం` : ''}!

${event.description_te || event.description || ''}

**బాక్సాఫీస్ రికార్డ్స్:**
[AI జెనరేట్ చేస్తుంది]

**మెమొరబుల్ మూమెంట్స్:**
[AI జెనరేట్ చేస్తుంది]

**అభిమానుల జ్ఞాపకాలు:**
[సోషల్ మీడియా ట్రెండ్స్ జోడించబడతాయి]

🎥 ఈ ఐకానిక్ మూవీని మీరు ఎప్పుడు చూశారు? కామెంట్ చేయండి!`,
    category: 'entertainment',
    imageQuery: `${event.entity_name} movie poster`,
  };
}

/**
 * Generate sports memory content
 */
function generateSportsMemoryContent(
  event: OnThisDayEvent,
  yearsAgo: number | null
): GeneratedContent {
  const name = event.entity_name_te || event.entity_name;

  return {
    title: `🏏 ఆన్ దిస్ డే: ${name}${yearsAgo ? ` - ${yearsAgo} ఏళ్ల క్రితం` : ''}`,
    body: `[ఆటో-జెనరేట్ చేయబడుతుంది]

${event.description_te || event.description || name}

${yearsAgo ? `ఈ చారిత్రాత్మక క్షణానికి నేడు ${yearsAgo} సంవత్సరాలు!` : ''}

**మ్యాచ్ హైలైట్స్:**
[AI జెనరేట్ చేస్తుంది]

**క్రికెట్ ఫ్యాన్స్ రియాక్షన్స్:**
[సోషల్ మీడియా ట్రెండ్స్ జోడించబడతాయి]

🏆 ఈ మూమెంట్ మీ జ్ఞాపకం ఏమిటి? కామెంట్ చేయండి!`,
    category: 'sports',
    imageQuery: `${event.entity_name} cricket sports india`,
  };
}

/**
 * Generate tribute content
 */
function generateTributeContent(
  event: OnThisDayEvent,
  yearsAgo: number | null
): GeneratedContent {
  const name = event.entity_name_te || event.entity_name;

  return {
    title: `🙏 ${name}: స్మారక దినం${yearsAgo ? ` - ${yearsAgo} సంవత్సరాలు` : ''}`,
    body: `[ఆటో-జెనరేట్ చేయబడుతుంది]

ఈ రోజు ${name} స్మారక దినం.

${event.description_te || event.description || ''}

**లెగసీ:**
[AI జెనరేట్ చేస్తుంది]

**అభిమానుల నివాళులు:**
[సోషల్ మీడియా ట్రెండ్స్ జోడించబడతాయి]

🕯️ ${name} ని స్మరిస్తూ...`,
    category: 'entertainment',
    imageQuery: `${event.entity_name} tribute memory`,
  };
}

/**
 * Generate general historical content
 */
function generateGeneralHistoricalContent(
  event: OnThisDayEvent,
  yearsAgo: number | null
): GeneratedContent {
  const name = event.entity_name_te || event.entity_name;

  return {
    title: `📅 ఆన్ దిస్ డే: ${name}`,
    body: `[ఆటో-జెనరేట్ చేయబడుతుంది]

${event.description_te || event.description || name}

${yearsAgo ? `ఈ సంఘటనకు ${yearsAgo} సంవత్సరాలు అయ్యాయి!` : ''}

**చారిత్రక ప్రాముఖ్యత:**
[AI జెనరేట్ చేస్తుంది]`,
    category: 'trending',
    imageQuery: `${event.entity_name} historical`,
  };
}

/**
 * AI-enhanced content generation for On This Day
 */
export async function generateEnhancedNostalgiaContent(
  event: OnThisDayEvent
): Promise<GeneratedContent | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return generateNostalgiaContent(event);
  }

  const currentYear = new Date().getFullYear();
  const yearsAgo = event.year_occurred ? currentYear - event.year_occurred : null;

  const eventTypeLabels = {
    birthday: 'పుట్టినరోజు',
    movie_release: 'సినిమా విడుదల వార్షికోత్సవం',
    sports: 'క్రీడా సంఘటన',
    death_anniversary: 'స్మారక దినం',
    historical: 'చారిత్రక సంఘటన',
  };

  const prompt = `Generate a nostalgic Telugu article for this "On This Day" event:

Event Type: ${eventTypeLabels[event.event_type]}
Entity: ${event.entity_name} (Telugu: ${event.entity_name_te || 'N/A'})
Year: ${event.year_occurred || 'Unknown'} (${yearsAgo ? `${yearsAgo} years ago` : ''})
Description: ${event.description || 'N/A'}

Write in Telugu with:
1. Catchy title with emoji
2. Hook (2-3 emotional lines)
3. Main story (historical context, achievements)
4. Fan reactions / nostalgia
5. Closing with call-to-action

Return JSON:
{
  "title": "Telugu title with emoji",
  "body": "Full Telugu article (250-350 words)"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) return generateNostalgiaContent(event);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return generateNostalgiaContent(event);

    const result = JSON.parse(jsonMatch[0]);

    return {
      title: result.title,
      body: result.body,
      category: EVENT_TYPE_CATEGORIES[event.event_type] || 'trending',
      imageQuery: `${event.entity_name} ${event.event_type}`,
    };
  } catch (error) {
    console.error('Error generating enhanced nostalgia content:', error);
    return generateNostalgiaContent(event);
  }
}

/**
 * Auto-generate and save On This Day posts
 */
export async function generateTodaysNostalgiaPosts(): Promise<{ generated: number; events: string[] }> {
  console.log('\n📅 [OnThisDay] Generating nostalgic content...');

  const events = await getOnThisDayEvents();

  if (events.length === 0) {
    console.log('   No events found for today.');
    return { generated: 0, events: [] };
  }

  console.log(`   Found ${events.length} events for today.`);

  const generated: string[] = [];

  for (const event of events.slice(0, 5)) { // Limit to 5 per day
    console.log(`   📝 Generating: ${event.entity_name}`);

    const content = await generateEnhancedNostalgiaContent(event);
    if (!content) continue;

    // Save as draft
    const { error } = await supabase.from('posts').insert({
      title: content.title,
      slug: `on-this-day-${event.entity_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
      telugu_body: content.body,
      category: content.category,
      status: 'draft',
      image_urls: [],
    });

    if (!error) {
      generated.push(event.entity_name);
      console.log(`   ✅ Generated: ${event.entity_name}`);
    }

    // Update last_used_at
    await supabase
      .from('on_this_day_events')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', event.id);
  }

  return { generated: generated.length, events: generated };
}

/**
 * Get upcoming birthdays this week
 */
export async function getUpcomingBirthdays(days: number = 7): Promise<OnThisDayEvent[]> {
  const today = new Date();
  const events: OnThisDayEvent[] = [];

  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);

    const dayEvents = await getOnThisDayEvents(
      checkDate.getMonth() + 1,
      checkDate.getDate()
    );

    events.push(...dayEvents.filter(e => e.event_type === 'birthday'));
  }

  return events;
}

/**
 * Fetch and add celebrity birthdays from external sources
 */
export async function fetchCelebrityBirthdays(): Promise<void> {
  // This would integrate with Wikipedia or other APIs
  // For now, it's a placeholder for manual data entry
  console.log('Celebrity birthday sync: Use manual entry or Wikipedia API integration');
}



