/**
 * AI CONTENT ANALYSIS CONTRACT
 *
 * MANDATORY analysis before generating ANY content.
 * This contract ensures quality, safety, and Telugu relevance.
 *
 * Every piece of content MUST be analyzed using this schema
 * before generation.
 */

import Groq from 'groq-sdk';

// ============================================================
// TYPES - THE CONTRACT
// ============================================================

export type AudienceEmotion =
  | 'nostalgia'
  | 'excitement'
  | 'curiosity'
  | 'inspiration'
  | 'romance'
  | 'pride'
  | 'humor'
  | 'sadness';

export type ContentAngle =
  | 'gossip'
  | 'nostalgia'
  | 'info'
  | 'inspiration'
  | 'analysis'
  | 'tribute'
  | 'viral';

export type SafetyRisk = 'low' | 'medium' | 'high';

export type ImageStrategy = 'poster' | 'photos' | 'mixed' | 'ai_generated' | 'none';

export type PublishPriority = 'high' | 'medium' | 'low';

/**
 * THE MANDATORY CONTENT ANALYSIS CONTRACT
 *
 * Every AI-generated content MUST have this analysis
 * completed BEFORE generation begins.
 */
export interface ContentAnalysisContract {
  // Entity identification
  main_entity: string;
  main_entity_type: 'person' | 'movie' | 'event' | 'topic' | 'other';
  secondary_entities: string[];

  // Audience targeting
  audience_emotion: AudienceEmotion;
  target_audience: string;           // e.g., "Telugu movie fans 25-45"

  // Content strategy
  best_angle: ContentAngle;
  alternative_angles: ContentAngle[];
  recommended_length: string;        // e.g., "300-500 words"

  // Visual strategy
  image_strategy: ImageStrategy;
  suggested_images: string[];

  // Safety & compliance
  safety_risk: SafetyRisk;
  safety_notes?: string[];
  requires_human_review: boolean;

  // Publishing
  publish_priority: PublishPriority;
  best_publish_time?: string;        // e.g., "evening", "morning"
  evergreen_potential: boolean;

  // Telugu context
  telugu_relevance_score: number;    // 0-1
  cultural_elements: string[];
  regional_context?: 'andhra' | 'telangana' | 'both' | 'diaspora';

  // AI confidence
  analysis_confidence: number;       // 0-1
  reasoning: string;                 // Why these choices
}

// ============================================================
// STANDARD CONTENT STRUCTURE
// ============================================================

/**
 * All long-form Telugu content MUST follow this structure
 */
export interface TeluguContentStructure {
  // 1. Emotional Hook (2-3 Telugu lines)
  emotional_hook_te: string;

  // 2. Context (why this matters now)
  context_te: string;

  // 3. Main Story (facts)
  main_story_te: string;

  // 4. Fan Reactions / Social Buzz
  social_buzz_te?: string;

  // 5. Past Relevance (old films / history / records)
  past_relevance_te?: string;

  // 6. Emotional Closing Note
  closing_note_te: string;

  // Metadata
  word_count: number;
  reading_time_minutes: number;
}

// ============================================================
// ANALYZER
// ============================================================

let groqInstance: Groq | null = null;

function getGroq(): Groq {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqInstance;
}

/**
 * MANDATORY: Analyze content before generation
 *
 * This MUST be called before any content generation.
 */
export async function analyzeContentIntent(input: {
  topic: string;
  raw_content?: string;
  source?: string;
  category?: string;
}): Promise<ContentAnalysisContract> {
  const groq = getGroq();

  const prompt = `You are a Telugu entertainment content strategist.
Analyze this topic for a Telugu entertainment platform:

TOPIC: ${input.topic}
${input.raw_content ? `RAW CONTENT: ${input.raw_content.slice(0, 1000)}` : ''}
${input.source ? `SOURCE: ${input.source}` : ''}
${input.category ? `CATEGORY: ${input.category}` : ''}

Analyze and return a JSON object with:

{
  "main_entity": "Primary person/movie/topic",
  "main_entity_type": "person|movie|event|topic|other",
  "secondary_entities": ["entity1", "entity2"],

  "audience_emotion": "nostalgia|excitement|curiosity|inspiration|romance|pride|humor|sadness",
  "target_audience": "Description of target audience",

  "best_angle": "gossip|nostalgia|info|inspiration|analysis|tribute|viral",
  "alternative_angles": ["angle1", "angle2"],
  "recommended_length": "300-500 words",

  "image_strategy": "poster|photos|mixed|ai_generated|none",
  "suggested_images": ["image type 1", "image type 2"],

  "safety_risk": "low|medium|high",
  "safety_notes": ["note1", "note2"],
  "requires_human_review": false,

  "publish_priority": "high|medium|low",
  "best_publish_time": "morning|afternoon|evening|night",
  "evergreen_potential": true,

  "telugu_relevance_score": 0.9,
  "cultural_elements": ["element1", "element2"],
  "regional_context": "andhra|telangana|both|diaspora",

  "analysis_confidence": 0.85,
  "reasoning": "Brief explanation of analysis choices"
}

RULES:
- Telugu audience preferences matter most
- Nostalgia and pride work best for Telugu content
- Political content = medium/high risk
- Celebrity personal life = medium risk
- Movie news = low risk
- Sports (IPL, Cricket) = high engagement
- Be conservative on sensitive topics`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    let clean = response.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
    }

    const parsed = JSON.parse(clean);
    return validateContract(parsed);
  } catch (error) {
    console.error('Content analysis failed:', error);
    // Return safe defaults
    return getDefaultContract(input.topic);
  }
}

/**
 * Validate and fill missing fields
 */
function validateContract(data: Partial<ContentAnalysisContract>): ContentAnalysisContract {
  return {
    main_entity: data.main_entity || 'Unknown',
    main_entity_type: data.main_entity_type || 'topic',
    secondary_entities: data.secondary_entities || [],
    audience_emotion: data.audience_emotion || 'curiosity',
    target_audience: data.target_audience || 'Telugu entertainment fans',
    best_angle: data.best_angle || 'info',
    alternative_angles: data.alternative_angles || [],
    recommended_length: data.recommended_length || '300-500 words',
    image_strategy: data.image_strategy || 'mixed',
    suggested_images: data.suggested_images || [],
    safety_risk: data.safety_risk || 'low',
    safety_notes: data.safety_notes,
    requires_human_review: data.requires_human_review ?? false,
    publish_priority: data.publish_priority || 'medium',
    best_publish_time: data.best_publish_time,
    evergreen_potential: data.evergreen_potential ?? false,
    telugu_relevance_score: data.telugu_relevance_score ?? 0.7,
    cultural_elements: data.cultural_elements || [],
    regional_context: data.regional_context,
    analysis_confidence: data.analysis_confidence ?? 0.7,
    reasoning: data.reasoning || 'Default analysis',
  };
}

/**
 * Get default contract for fallback
 */
function getDefaultContract(topic: string): ContentAnalysisContract {
  return {
    main_entity: topic,
    main_entity_type: 'topic',
    secondary_entities: [],
    audience_emotion: 'curiosity',
    target_audience: 'Telugu entertainment fans',
    best_angle: 'info',
    alternative_angles: ['analysis'],
    recommended_length: '300-500 words',
    image_strategy: 'mixed',
    suggested_images: ['relevant photo', 'poster if movie'],
    safety_risk: 'low',
    requires_human_review: false,
    publish_priority: 'medium',
    evergreen_potential: false,
    telugu_relevance_score: 0.7,
    cultural_elements: [],
    analysis_confidence: 0.5,
    reasoning: 'Default analysis - manual review recommended',
  };
}

// ============================================================
// CONTENT GENERATOR WITH CONTRACT
// ============================================================

/**
 * Generate content ONLY after analysis
 */
export async function generateContentWithContract(
  topic: string,
  rawContent?: string
): Promise<{
  analysis: ContentAnalysisContract;
  content: TeluguContentStructure;
}> {
  // Step 1: MANDATORY analysis
  const analysis = await analyzeContentIntent({
    topic,
    raw_content: rawContent,
  });

  // Step 2: Check if we should proceed
  if (analysis.safety_risk === 'high' && analysis.analysis_confidence < 0.7) {
    throw new Error('Content flagged as high risk with low confidence. Requires human review.');
  }

  // Step 3: Generate content based on analysis
  const groq = getGroq();

  const contentPrompt = `Generate Telugu content following this analysis:

ANALYSIS:
- Topic: ${analysis.main_entity}
- Emotion: ${analysis.audience_emotion}
- Angle: ${analysis.best_angle}
- Length: ${analysis.recommended_length}
- Cultural elements: ${analysis.cultural_elements.join(', ')}

STRUCTURE (MANDATORY):
1. హృదయాన్ని తాకే హుక్ (Emotional Hook) - 2-3 Telugu lines
2. కాంటెక్స్ట్ (Context) - Why this matters now
3. మెయిన్ స్టోరీ (Main Story) - Facts and details
4. సోషల్ బజ్ (Social Buzz) - Fan reactions if applicable
5. గత సంబంధం (Past Relevance) - Historic connections
6. ముగింపు (Closing) - Emotional note

Write in NATURAL Telugu. NOT robotic AI Telugu.
Return JSON with these exact fields:
{
  "emotional_hook_te": "...",
  "context_te": "...",
  "main_story_te": "...",
  "social_buzz_te": "...",
  "past_relevance_te": "...",
  "closing_note_te": "...",
  "word_count": 400,
  "reading_time_minutes": 3
}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: contentPrompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  let clean = response.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
  }

  const content: TeluguContentStructure = JSON.parse(clean);

  return { analysis, content };
}

// ============================================================
// EXPORTS
// ============================================================

export type {
  ContentAnalysisContract as ContentContract,
  TeluguContentStructure,
};
