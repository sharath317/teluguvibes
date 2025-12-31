/**
 * AI Content Generator for Historic Celebrity Posts
 * Uses Groq for Telugu content generation
 */

import type { PostGenerationContext, HistoricPostContent, EventType } from '@/types/celebrity';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Event type configurations
 */
const EVENT_CONFIG: Record<EventType, {
  emoji: string;
  titleTemplate: (name: string, yearsAgo: number) => string;
  tone: string;
}> = {
  birthday: {
    emoji: '🎂',
    titleTemplate: (name, yearsAgo) => `${name} ${yearsAgo}వ పుట్టినరోజు శుభాకాంక్షలు`,
    tone: 'celebratory and warm',
  },
  death_anniversary: {
    emoji: '🙏',
    titleTemplate: (name, yearsAgo) => `${name} వర్ధంతి: ${yearsAgo} ఏళ్ల తర్వాత కూడా గుర్తుండే తారా`,
    tone: 'respectful, nostalgic, and tribute-like',
  },
  debut_anniversary: {
    emoji: '🌟',
    titleTemplate: (name, yearsAgo) => `${name} కెరీర్ ప్రారంభం: ${yearsAgo} ఏళ్ల సినీ ప్రస్థానం`,
    tone: 'celebratory and reflective on career journey',
  },
  movie_anniversary: {
    emoji: '🎬',
    titleTemplate: (name, yearsAgo) => `${yearsAgo} ఏళ్ల క్రితం విడుదలైన ${name}`,
    tone: 'nostalgic and celebrating cinematic milestone',
  },
  award_anniversary: {
    emoji: '🏆',
    titleTemplate: (name, yearsAgo) => `${name}: అవార్డు గెలుచుకున్న ${yearsAgo} ఏళ్ల అద్భుత క్షణం`,
    tone: 'proud and celebratory',
  },
  career_milestone: {
    emoji: '⭐',
    titleTemplate: (name, yearsAgo) => `${name}: ${yearsAgo} ఏళ్ల మైలురాయి`,
    tone: 'reflective and appreciative',
  },
};

/**
 * Build the AI prompt for content generation
 */
function buildPrompt(context: PostGenerationContext): string {
  const { celebrity, event, works, yearsAgo, currentYear } = context;
  const config = EVENT_CONFIG[event.event_type];

  // Prepare works list
  const iconicWorks = works.filter(w => w.is_iconic || w.is_blockbuster).slice(0, 5);
  const worksText = iconicWorks.length > 0
    ? iconicWorks.map(w => `${w.title_en}${w.title_te ? ` (${w.title_te})` : ''} (${w.release_year || 'N/A'})`).join(', ')
    : 'సినిమాల సమాచారం అందుబాటులో లేదు';

  // Calculate age or death age
  const birthYear = celebrity.birth_date ? new Date(celebrity.birth_date).getFullYear() : null;
  const deathYear = celebrity.death_date ? new Date(celebrity.death_date).getFullYear() : null;
  const ageInfo = event.event_type === 'death_anniversary' && deathYear && birthYear
    ? `మరణ సమయంలో వయసు: ${deathYear - birthYear}`
    : birthYear
    ? `ప్రస్తుత వయసు: ${currentYear - birthYear}`
    : '';

  const basePrompt = `
You are a Telugu entertainment journalist writing for TeluguVibes, a popular Telugu celebrity news portal.

Write a detailed, emotional, and SEO-friendly Telugu article for the following ${event.event_type.replace('_', ' ')}:

**CELEBRITY INFO:**
- English Name: ${celebrity.name_en}
- Telugu Name: ${celebrity.name_te || celebrity.name_en}
- Occupation: ${celebrity.occupation.join(', ')}
- Birth Place: ${celebrity.birth_place || 'తెలియదు'}
- ${ageInfo}
- Bio: ${celebrity.short_bio || 'ప్రముఖ తెలుగు సినీ తార'}

**EVENT DETAILS:**
- Event Type: ${event.event_type.replace('_', ' ')}
- Years Ago: ${yearsAgo} years
- Current Year: ${currentYear}
- Original Year: ${event.event_year || 'N/A'}

**NOTABLE WORKS:**
${worksText}

**WRITING GUIDELINES:**
1. Tone: ${config.tone}
2. Language: Pure Telugu (English names are OK)
3. Length: 400-600 words
4. Structure the article with these sections:
   - **Emotional Opening Hook** (2-3 sentences that grab attention)
   - **Early Life & Beginning** (brief background)
   - **Career Highlights** (major achievements)
   - **Iconic Movies/Moments** (what they're known for)
   - **Why Telugu Audiences Love Them** (emotional connection)
   - **Closing Nostalgic Note** (warm ending)

**FORMAT:**
- Use ** for section headings
- Each paragraph should be 2-4 sentences
- Include relevant Telugu film industry references
- Make it personal and relatable to Telugu audience
- NO speculation or unverified claims
- NO controversial statements
- Keep it respectful and celebratory

**OUTPUT FORMAT:**
Return ONLY a JSON object with these fields:
{
  "title": "Telugu title for the article",
  "body": "Full article content with ** headings",
  "seo_title": "SEO optimized title (50-60 chars)",
  "seo_description": "Meta description (150-160 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}
`;

  return basePrompt;
}

/**
 * Generate content using Groq AI
 */
async function generateWithGroq(prompt: string): Promise<HistoricPostContent | null> {
  if (!GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not configured, using fallback');
    return null;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a Telugu entertainment journalist. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Parse JSON response
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || '',
      title_te: parsed.title || '',
      body: parsed.body || '',
      summary: parsed.seo_description || '',
      tags: parsed.tags || [],
      seo_title: parsed.seo_title || '',
      seo_description: parsed.seo_description || '',
    };
  } catch (error) {
    console.error('Groq generation error:', error);
    return null;
  }
}

/**
 * Generate fallback content without AI
 */
function generateFallbackContent(context: PostGenerationContext): HistoricPostContent {
  const { celebrity, event, works, yearsAgo, currentYear } = context;
  const config = EVENT_CONFIG[event.event_type];
  const name = celebrity.name_te || celebrity.name_en;

  // Build title
  const title = config.titleTemplate(name, yearsAgo);

  // Build works mention
  const iconicWorks = works.filter(w => w.is_iconic).slice(0, 3);
  const worksText = iconicWorks.length > 0
    ? iconicWorks.map(w => w.title_te || w.title_en).join(', ')
    : '';

  // Build body based on event type
  let body = '';

  switch (event.event_type) {
    case 'birthday':
      body = `**${config.emoji} పుట్టినరోజు శుభాకాంక్షలు!**

నేడు మన ప్రియమైన తార ${name} పుట్టినరోజు. వారు ${yearsAgo} ఏళ్ల వయసులోకి అడుగుపెడుతున్నారు. తెలుగు సినీ పరిశ్రమలో వారి సేవలు మరువలేనివి.

**కెరీర్ విజయాలు**

${celebrity.occupation.join(', ')} గా ${name} తెలుగు ప్రేక్షకుల హృదయాలలో చిరస్థాయిగా నిలిచిపోయారు.${worksText ? ` వారి ప్రముఖ చిత్రాలు: ${worksText}.` : ''}

**అభిమానుల ప్రేమ**

తెలుగు అభిమానులకు ${name} అంటే చాలా ప్రత్యేకమైన అనుబంధం ఉంది. వారి నటన, వినయం మరియు ప్రతిభ వల్ల వారు మిలియన్ల హృదయాలను గెలుచుకున్నారు.

**శుభాకాంక్షలు**

TeluguVibes తరపున ${name} గారికి పుట్టినరోజు శుభాకాంక్షలు. మీకు ఆరోగ్యం, సంతోషం, మరిన్ని విజయాలు కలగాలని కోరుకుంటున్నాము. 🎉`;
      break;

    case 'death_anniversary':
      body = `**${config.emoji} స్మృత్యంజలి**

నేడు మన గొప్ప కళాకారులు ${name} వర్ధంతి. ${yearsAgo} సంవత్సరాల క్రితం వారు మనల్ని విడిచి వెళ్లిపోయినా, వారి జ్ఞాపకాలు ఇప్పటికీ మన హృదయాలలో సజీవంగా ఉన్నాయి.

**అజరామరమైన స్మృతి**

${name} తెలుగు సినీ పరిశ్రమకు చేసిన సేవలు చిరస్మరణీయం.${worksText ? ` వారి అద్భుత చిత్రాలు: ${worksText} - ఇవి ప్రేక్షకుల మనసులో శాశ్వతంగా నిలిచిపోతాయి.` : ''}

**వారసత్వం**

వారు వెళ్ళిపోయినా, వారి కళ, వారి నటన, వారి సినిమాలు తరతరాలకు స్ఫూర్తిగా నిలుస్తాయి.

**నివాళి**

TeluguVibes తరపున ${name} గారికి భావపూర్వక నివాళులు. మీ ఆత్మకు శాంతి కలగాలని ప్రార్థిస్తున్నాము. 🙏`;
      break;

    default:
      body = `**${config.emoji} ప్రత్యేక రోజు**

నేడు ${name} కు సంబంధించిన ప్రత్యేక సందర్భం. ${yearsAgo} సంవత్సరాల క్రితం జరిగిన ఈ సంఘటన తెలుగు సినీ చరిత్రలో ముఖ్యమైన మైలురాయి.

**ప్రస్థానం**

${celebrity.occupation.join(', ')} గా ${name} తెలుగు సినీ పరిశ్రమలో ఎన్నో విజయాలు సాధించారు.${worksText ? ` వారి గుర్తుండిపోయే చిత్రాలు: ${worksText}.` : ''}

**అభిమానుల ప్రేమ**

TeluguVibes అభిమానులతో కలిసి ఈ ప్రత్యేక సందర్భాన్ని జరుపుకుంటోంది. 🌟`;
  }

  return {
    title,
    title_te: title,
    body,
    summary: `${name} - ${event.event_type.replace('_', ' ')} సందర్భంగా ప్రత్యేక వార్త`,
    tags: [celebrity.name_en, event.event_type, 'telugu', 'entertainment'],
    seo_title: `${name} ${event.event_type.replace('_', ' ')} ${currentYear}`,
    seo_description: `${name} గారి ${event.event_type.replace('_', ' ')} సందర్భంగా TeluguVibes ప్రత్యేక వార్త. ${yearsAgo} సంవత్సరాల ప్రత్యేక సంఘటన.`,
  };
}

/**
 * Main content generation function
 */
export async function generateHistoricPostContent(
  context: PostGenerationContext
): Promise<HistoricPostContent> {
  console.log(`📝 Generating content for ${context.celebrity.name_en} - ${context.event.event_type}`);

  // Try AI generation first
  const prompt = buildPrompt(context);
  const aiContent = await generateWithGroq(prompt);

  if (aiContent && aiContent.body.length > 100) {
    console.log('  ✅ AI content generated');
    return aiContent;
  }

  // Fallback to template
  console.log('  ⚠️ Using fallback template');
  return generateFallbackContent(context);
}

/**
 * Generate birthday-specific content
 */
export async function generateBirthdayPost(context: PostGenerationContext): Promise<HistoricPostContent> {
  context.event.event_type = 'birthday';
  return generateHistoricPostContent(context);
}

/**
 * Generate death anniversary content
 */
export async function generateDeathAnniversaryPost(context: PostGenerationContext): Promise<HistoricPostContent> {
  context.event.event_type = 'death_anniversary';
  return generateHistoricPostContent(context);
}

/**
 * Generate movie anniversary content
 */
export async function generateMovieAnniversaryPost(
  context: PostGenerationContext,
  movieTitle: string
): Promise<HistoricPostContent> {
  context.event.event_type = 'movie_anniversary';
  // Modify context for movie-specific content
  return generateHistoricPostContent(context);
}



