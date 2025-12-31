/**
 * AI SYNTHESIS ENGINE
 *
 * Generates human-grade Telugu content with:
 * - Human POV layer
 * - Telugu cultural emotion
 * - Context + relevance
 * - Optimal content length
 */

import Groq from 'groq-sdk';
import type { SynthesisContext, SynthesisResult, ContentVariant } from './types';

// ============================================================
// AI CLIENT
// ============================================================

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

// ============================================================
// CONTENT LENGTH CALCULATOR
// ============================================================

function calculateOptimalLength(context: SynthesisContext): { min: number; max: number; target: number } {
  // Base lengths by entity type
  const baseLengths: Record<string, { min: number; max: number }> = {
    post: { min: 200, max: 400 },
    celebrity: { min: 300, max: 500 },
    movie: { min: 400, max: 600 },
    review: { min: 500, max: 800 },
  };

  const base = baseLengths[context.entityType] || { min: 200, max: 400 };

  // Adjust for trending content
  if (context.trendingScore && context.trendingScore > 80) {
    base.max += 100; // More content for trending topics
  }

  // Adjust for historic/nostalgia content
  if (context.audienceEmotion === 'nostalgia') {
    base.min += 100;
    base.max += 150;
  }

  return {
    min: base.min,
    max: base.max,
    target: Math.floor((base.min + base.max) / 2),
  };
}

// ============================================================
// PROMPT TEMPLATES
// ============================================================

function buildSynthesisPrompt(context: SynthesisContext, lengthGuide: { min: number; max: number; target: number }): string {
  const emotionGuide = getEmotionGuide(context.audienceEmotion);
  const contextSection = buildContextSection(context);

  return `You are a senior Telugu entertainment journalist writing for TeluguVibes, a premium Telugu entertainment portal.

TOPIC: ${context.topic}
TYPE: ${context.entityType}
${context.category ? `CATEGORY: ${context.category}` : ''}

${contextSection}

AUDIENCE EMOTION: ${context.audienceEmotion || 'curiosity'}
${emotionGuide}

WRITING RULES (MANDATORY):
1. Write in TELUGU ONLY (English names are allowed)
2. Start with an EMOTIONAL HOOK that captures attention in first 2 lines
3. Include a HUMAN POV section - a personal observation, insider trivia, or cultural insight
4. Reference past achievements, legacy, or historic context where relevant
5. Be respectful and avoid speculation or controversial opinions
6. Use SEO-friendly headings in Telugu
7. Word count: ${lengthGuide.min}-${lengthGuide.max} words (target: ${lengthGuide.target})

CONTENT STRUCTURE:
1. 🎬 భావోద్వేగ హుక్ (Emotional Hook) - 2-3 powerful lines
2. 📖 నేపథ్యం (Context) - What's happening and why it matters
3. ⭐ ముఖ్య విషయాలు (Key Points) - Main story elements
4. 💭 మన అభిప్రాయం (Human POV) - Personal insight or cultural observation
5. 🔮 ముగింపు (Closing) - Emotional or thought-provoking ending

OUTPUT FORMAT (JSON):
{
  "title_en": "English title for SEO",
  "title_te": "తెలుగు శీర్షిక",
  "excerpt": "తెలుగులో 1-2 వాక్యాల సారాంశం",
  "body_te": "పూర్తి తెలుగు వ్యాసం with proper structure and headings",
  "hook": "The emotional hook in Telugu",
  "humanPov": "The human POV section text",
  "confidenceScore": 0-100,
  "needsHumanReview": true/false,
  "reviewReasons": ["reason1", "reason2"] // if needsHumanReview is true
}

Generate compelling, human-quality Telugu content now:`;
}

function getEmotionGuide(emotion?: string): string {
  const guides: Record<string, string> = {
    nostalgia: `NOSTALGIA TONE:
- Reference golden era of Telugu cinema
- Connect to audience memories
- Use phrases like "ఆ రోజుల్లో...", "మన తరం గుర్తుంచుకునే..."
- Evoke warm, sentimental feelings`,

    excitement: `EXCITEMENT TONE:
- Build anticipation and hype
- Use energetic language
- Reference box office potential, star power
- Create FOMO (Fear of Missing Out)`,

    pride: `PRIDE TONE:
- Celebrate Telugu achievements
- Reference national/international recognition
- Use phrases like "తెలుగు వారికి గర్వకారణం..."
- Connect to cultural identity`,

    curiosity: `CURIOSITY TONE:
- Pose intriguing questions
- Reveal interesting facts gradually
- Use "తెలుసా?", "ఆశ్చర్యం కలిగించే విషయం..."
- Keep readers wanting more`,

    celebration: `CELEBRATION TONE:
- Mark special occasions warmly
- Express joy and good wishes
- Use festive language
- Connect personal milestones to audience`,
  };

  return guides[emotion || 'curiosity'] || guides.curiosity;
}

function buildContextSection(context: SynthesisContext): string {
  const sections: string[] = [];

  if (context.relatedMovies?.length) {
    const movies = context.relatedMovies.slice(0, 5).map(m =>
      `${m.title} (${m.year})${m.verdict ? ` - ${m.verdict}` : ''}`
    ).join(', ');
    sections.push(`RELATED MOVIES: ${movies}`);
  }

  if (context.relatedCelebrities?.length) {
    const celebs = context.relatedCelebrities.slice(0, 5).map(c =>
      `${c.name} (${c.relation})`
    ).join(', ');
    sections.push(`RELATED CELEBRITIES: ${celebs}`);
  }

  if (context.historicContext?.length) {
    const history = context.historicContext.slice(0, 3).map(h =>
      `${h.event} on ${h.date}`
    ).join('; ');
    sections.push(`HISTORIC CONTEXT: ${history}`);
  }

  if (context.sportsContext) {
    const sports = context.sportsContext;
    if (sports.team) sections.push(`TEAM: ${sports.team}`);
    if (sports.recentPerformance) sections.push(`RECENT: ${sports.recentPerformance}`);
    if (sports.stats) {
      const stats = Object.entries(sports.stats).map(([k, v]) => `${k}: ${v}`).join(', ');
      sections.push(`STATS: ${stats}`);
    }
  }

  return sections.length > 0
    ? `CONTEXT:\n${sections.join('\n')}`
    : '';
}

// ============================================================
// MAIN SYNTHESIS FUNCTION
// ============================================================

export async function synthesizeContent(context: SynthesisContext): Promise<SynthesisResult | null> {
  const groq = getGroqClient();
  if (!groq) {
    console.warn('Groq API key not configured');
    return null;
  }

  const lengthGuide = calculateOptimalLength(context);
  const prompt = buildSynthesisPrompt(context, lengthGuide);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Telugu content writer. Always respond with valid JSON only, no markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Could not parse AI response as JSON');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Count Telugu words
    const wordCount = (parsed.body_te || '').split(/\s+/).filter((w: string) => w.length > 0).length;

    return {
      title_en: parsed.title_en || context.topic,
      title_te: parsed.title_te || '',
      excerpt: parsed.excerpt || '',
      body_te: parsed.body_te || '',
      humanPovIncluded: !!parsed.humanPov,
      culturalContextIncluded: (parsed.body_te || '').includes('తెలుగు') ||
                                (parsed.body_te || '').includes('సినిమా') ||
                                (parsed.body_te || '').includes('టాలీవుడ్'),
      wordCount,
      confidenceScore: parsed.confidenceScore || 70,
      needsHumanReview: parsed.needsHumanReview ?? (wordCount < lengthGuide.min),
      reviewReasons: parsed.reviewReasons || [],
    };
  } catch (error) {
    console.error('Synthesis failed:', error);
    return null;
  }
}

// ============================================================
// VARIANT GENERATION
// ============================================================

export async function generateVariants(context: SynthesisContext, count: number = 3): Promise<ContentVariant[]> {
  const groq = getGroqClient();
  if (!groq) return [];

  const angles: Array<'nostalgia' | 'excitement' | 'info' | 'viral' | 'tribute' | 'analysis'> =
    ['nostalgia', 'excitement', 'info', 'viral', 'tribute', 'analysis'];

  const prompt = `Generate ${count} different content variants for this topic.
Each variant should have a DIFFERENT ANGLE.

TOPIC: ${context.topic}
TYPE: ${context.entityType}
CATEGORY: ${context.category || 'entertainment'}

ANGLES TO CHOOSE FROM: ${angles.join(', ')}

For each variant, provide:
- A unique angle
- Telugu title
- English title
- Short excerpt in Telugu
- Full body in Telugu (200-400 words)
- An emotional hook
- Your reasoning for this angle

OUTPUT FORMAT (JSON array):
[
  {
    "id": "variant_1",
    "angle": "nostalgia",
    "title": "English Title",
    "title_te": "తెలుగు శీర్షిక",
    "excerpt": "తెలుగు సారాంశం",
    "body_te": "పూర్తి వ్యాసం...",
    "hook": "Emotional hook in Telugu",
    "score": 85,
    "reasoning": "Why this angle works"
  },
  ...
]

Generate ${count} unique variants now:`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Telugu content strategist. Return valid JSON array only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) return [];

    const variants = JSON.parse(jsonMatch[0]) as ContentVariant[];
    return variants.slice(0, count);
  } catch (error) {
    console.error('Variant generation failed:', error);
    return [];
  }
}

// ============================================================
// FOLLOW-UP CONTEXT FETCHER
// ============================================================

export async function fetchFollowUpContext(topic: string, category?: string): Promise<Partial<SynthesisContext>> {
  const context: Partial<SynthesisContext> = {};

  // IPL / Cricket context
  if (category === 'sports' || topic.toLowerCase().includes('ipl') || topic.toLowerCase().includes('cricket')) {
    // This would integrate with cricket API
    context.sportsContext = {
      team: extractTeamFromTopic(topic),
      recentPerformance: 'Recent match data would be fetched here',
    };
  }

  // Movie context - fetch similar movies
  if (category === 'entertainment' || topic.toLowerCase().includes('movie') || topic.toLowerCase().includes('సినిమా')) {
    // This would integrate with TMDB
    context.relatedMovies = [
      { title: 'Related Movie 1', year: 2024 },
      { title: 'Related Movie 2', year: 2023 },
    ];
  }

  return context;
}

function extractTeamFromTopic(topic: string): string | undefined {
  const teams = ['CSK', 'RCB', 'MI', 'SRH', 'DC', 'KKR', 'PBKS', 'RR', 'GT', 'LSG'];
  const topicUpper = topic.toUpperCase();

  for (const team of teams) {
    if (topicUpper.includes(team)) return team;
  }

  // Full names
  if (topicUpper.includes('CHENNAI')) return 'CSK';
  if (topicUpper.includes('HYDERABAD') || topicUpper.includes('SUNRISERS')) return 'SRH';
  if (topicUpper.includes('MUMBAI')) return 'MI';
  if (topicUpper.includes('BANGALORE') || topicUpper.includes('CHALLENGERS')) return 'RCB';

  return undefined;
}
