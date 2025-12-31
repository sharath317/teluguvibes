/**
 * EDITORIAL INTELLIGENCE ANALYZER (PHASE 2A)
 *
 * Pre-generation editorial planning layer.
 * Analyzes topics BEFORE content generation.
 * Behaves like a senior Telugu media editor, NOT a writer.
 *
 * Pipeline Position:
 *   Trend/Topic → Editorial Analyzer → Content Generator → Human POV → Publish
 *
 * CRITICAL: No content should be generated without this analyzer.
 */

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type AudienceEmotion =
  | 'nostalgia'
  | 'excitement'
  | 'pride'
  | 'curiosity'
  | 'controversy'
  | 'sadness'
  | 'celebration';

export type EditorialAngle =
  | 'gossip'
  | 'nostalgia'
  | 'info'
  | 'tribute'
  | 'analysis'
  | 'viral';

export type SafetyRisk = 'low' | 'medium' | 'high';

export type EntityType = 'actor' | 'actress' | 'movie' | 'director' | 'ipl' | 'sports' | 'event' | 'other';

export interface NarrativePlan {
  hook: string[];              // 2-3 short emotional Telugu lines
  context: string;             // Why this matters now (Telugu audience context)
  main_story: string;          // Key facts only (no speculation)
  fan_reactions: string;       // Social buzz / fan sentiment summary
  past_relevance: string;      // Old movies, past IPL seasons, historic moments
  closing_note: string;        // Emotionally resonant Telugu closing line
}

export interface EditorialPlan {
  main_entity: string;
  entity_type: EntityType;
  audience_emotion: AudienceEmotion;
  best_angle: EditorialAngle;
  fallback_angles: EditorialAngle[];
  safety_risk: SafetyRisk;
  narrative_plan: NarrativePlan;
  confidence: number;          // 0-1
  reasoning: string;           // Why this plan was chosen
  needs_human_review: boolean;
  entity_metadata?: {
    is_senior: boolean;
    is_legend: boolean;
    era: string;
    event_age_days?: number;
  };
}

export interface AnalyzerInput {
  rawContent?: string;
  topic: string;
  source?: string;
  language?: 'te' | 'en';
}

// ============================================================
// TELUGU CINEMA EMOTION → ANGLE MAPPING (FINE-TUNED)
// ============================================================

/**
 * Core emotion to angle mapping.
 * Calibrated for Telugu cinema & sports audiences.
 * Reflects Tollywood culture, fan psychology, and consumption patterns.
 */
const EMOTION_ANGLE_MAP: Record<AudienceEmotion, EditorialAngle[]> = {
  // Telugu audiences deeply respect legacy, senior actors, old movies, golden eras
  nostalgia: ['nostalgia', 'tribute', 'analysis'],

  // State, language, and industry pride is very strong
  pride: ['tribute', 'analysis', 'info'],

  // Trailers, first looks, IPL moments, mass hype
  excitement: ['viral', 'gossip', 'info'],

  // Casting news, OTT releases, behind-the-scenes
  curiosity: ['info', 'analysis'],

  // Birthdays, success meets, records, blockbusters
  celebration: ['tribute', 'viral'],

  // Death anniversaries, failures, missed chances
  sadness: ['tribute', 'info'],

  // Gossip hurts trust if not handled carefully
  controversy: ['info'],
};

/**
 * Safety override matrix.
 * If safety_risk !== "low", force these constraints.
 */
const SAFETY_OVERRIDE: Record<AudienceEmotion, { allowed: EditorialAngle[]; disallowed: EditorialAngle[] }> = {
  controversy: { allowed: ['info'], disallowed: ['gossip', 'viral'] },
  sadness: { allowed: ['tribute', 'info'], disallowed: ['viral', 'gossip'] },
  pride: { allowed: ['tribute', 'analysis', 'info'], disallowed: ['gossip'] },
  nostalgia: { allowed: ['nostalgia', 'tribute', 'analysis'], disallowed: ['viral'] },
  excitement: { allowed: ['viral', 'info'], disallowed: [] },
  curiosity: { allowed: ['info', 'analysis'], disallowed: ['gossip'] },
  celebration: { allowed: ['tribute', 'viral', 'info'], disallowed: [] },
};

/**
 * Senior/Legend actors who deserve special treatment.
 * These names trigger nostalgia/tribute angles automatically.
 */
const LEGEND_ACTORS = new Set([
  'ntr', 'anr', 'ntr sr', 'nageswara rao', 'akkineni', 'sv ranga rao',
  'savitri', 'bhanumathi', 'krishna', 'sobhan babu', 'krishnam raju',
  'chiranjeevi', 'balakrishna', 'nagarjuna', 'venkatesh', 'mohan babu',
]);

const SENIOR_ACTORS = new Set([
  ...LEGEND_ACTORS,
  'pawan kalyan', 'mahesh babu', 'prabhas', 'ram charan', 'jr ntr', 'allu arjun',
]);

// ============================================================
// MAIN ANALYZER CLASS
// ============================================================

export class EditorialAnalyzer {
  private groq: Groq;
  private supabase;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main analysis function.
   * MANDATORY before any content generation.
   */
  async analyzeEditorialIntent(input: AnalyzerInput): Promise<EditorialPlan> {
    console.log(`📝 Editorial Analysis: "${input.topic.slice(0, 50)}..."`);

    // Step 1: Initial AI analysis
    const aiAnalysis = await this.performAIAnalysis(input);

    // Step 2: Apply Telugu-specific overrides
    const refinedPlan = this.applyTeluguOverrides(aiAnalysis, input);

    // Step 3: Calculate confidence
    const confidence = this.calculateConfidence(refinedPlan, input);
    refinedPlan.confidence = confidence;
    refinedPlan.needs_human_review = confidence < 0.7;

    // Step 4: Store for learning
    await this.storeEditorialContext(refinedPlan, input);

    console.log(`   Emotion: ${refinedPlan.audience_emotion}, Angle: ${refinedPlan.best_angle}, Risk: ${refinedPlan.safety_risk}`);

    return refinedPlan;
  }

  /**
   * Perform initial AI analysis
   */
  private async performAIAnalysis(input: AnalyzerInput): Promise<EditorialPlan> {
    const prompt = this.buildAnalysisPrompt(input);

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getDefaultPlan(input.topic);
    }
  }

  /**
   * Build the AI analysis prompt
   */
  private buildAnalysisPrompt(input: AnalyzerInput): string {
    return `You are a SENIOR TELUGU MEDIA EDITOR analyzing a topic BEFORE content generation.
You must think like a Tollywood insider who understands Telugu audience psychology.

TOPIC: ${input.topic}
${input.rawContent ? `CONTEXT: ${input.rawContent.slice(0, 1500)}` : ''}
SOURCE: ${input.source || 'unknown'}
LANGUAGE: ${input.language || 'te'}

YOUR TASK:
Analyze this topic and return a strict JSON editorial plan.
DO NOT write content. Only plan the narrative.

ALLOWED VALUES:

audience_emotion (pick ONE):
- nostalgia: Old memories, classic references
- excitement: Hype, trailers, announcements
- pride: State/language/industry pride
- curiosity: Behind-the-scenes, casting news
- celebration: Birthdays, records, milestones
- sadness: Deaths, failures, disappointments
- controversy: Disputes, allegations (handle carefully)

best_angle (pick ONE):
- gossip: Entertainment rumors (use sparingly)
- nostalgia: Classic references, golden era
- info: Factual, neutral reporting
- tribute: Honoring achievements
- analysis: Deep dive, comparisons
- viral: Shareable, mass appeal

safety_risk:
- low: Safe to publish
- medium: Needs careful wording
- high: Requires admin review

TELUGU AUDIENCE RULES:
1. Prefer nostalgia + pride over pure gossip when possible
2. Reference old movies, career milestones, IPL history
3. Avoid sensationalism unless explicitly trending
4. Be conservative on political or personal topics
5. Senior actors (NTR, ANR, Krishna, Chiranjeevi era) deserve tribute/nostalgia angles

RETURN ONLY THIS JSON (no markdown, no explanation):

{
  "main_entity": "Primary person/movie/event name",
  "entity_type": "actor|actress|movie|director|ipl|sports|event|other",
  "audience_emotion": "nostalgia|excitement|pride|curiosity|controversy|sadness|celebration",
  "best_angle": "gossip|nostalgia|info|tribute|analysis|viral",
  "safety_risk": "low|medium|high",
  "narrative_plan": {
    "hook": ["2-3 short emotional Telugu lines for opening"],
    "context": "Why this matters now to Telugu audiences",
    "main_story": "Key facts only, no speculation",
    "fan_reactions": "Social buzz / fan sentiment summary",
    "past_relevance": "Old movies, past performances, historic moments",
    "closing_note": "One emotionally resonant Telugu closing line"
  },
  "reasoning": "Brief explanation of why you chose this emotion and angle"
}`;
  }

  /**
   * Parse AI response with fallback
   */
  private parseAIResponse(response: string): EditorialPlan {
    try {
      let clean = response.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }

      const parsed = JSON.parse(clean);

      return {
        main_entity: parsed.main_entity || 'Unknown',
        entity_type: parsed.entity_type || 'other',
        audience_emotion: this.validateEmotion(parsed.audience_emotion),
        best_angle: this.validateAngle(parsed.best_angle),
        fallback_angles: [],
        safety_risk: this.validateSafetyRisk(parsed.safety_risk),
        narrative_plan: {
          hook: parsed.narrative_plan?.hook || ['ఈ వార్త మీ కోసం...'],
          context: parsed.narrative_plan?.context || '',
          main_story: parsed.narrative_plan?.main_story || '',
          fan_reactions: parsed.narrative_plan?.fan_reactions || '',
          past_relevance: parsed.narrative_plan?.past_relevance || '',
          closing_note: parsed.narrative_plan?.closing_note || '',
        },
        confidence: 0.8,
        reasoning: parsed.reasoning || '',
        needs_human_review: false,
      };
    } catch {
      return this.getDefaultPlan('Unknown topic');
    }
  }

  /**
   * Apply Telugu-specific overrides to the AI plan
   */
  private applyTeluguOverrides(plan: EditorialPlan, input: AnalyzerInput): EditorialPlan {
    const refined = { ...plan };

    // Extract entity info
    const entityLower = plan.main_entity.toLowerCase();
    const topicLower = input.topic.toLowerCase();

    // 1. Check if entity is a legend/senior actor
    const isLegend = this.isLegendActor(entityLower, topicLower);
    const isSenior = this.isSeniorActor(entityLower, topicLower);

    refined.entity_metadata = {
      is_senior: isSenior,
      is_legend: isLegend,
      era: this.determineEra(entityLower, topicLower),
      event_age_days: this.estimateEventAge(input),
    };

    // 2. Entity-aware angle overrides
    if (isLegend || isSenior) {
      // Senior actors deserve tribute/nostalgia
      if (plan.audience_emotion !== 'controversy') {
        refined.best_angle = this.determineBestAngleForSenior(plan.audience_emotion);
        refined.reasoning += ' [Override: Senior actor context]';
      }
    }

    // 3. Apply emotion→angle mapping
    refined.fallback_angles = EMOTION_ANGLE_MAP[refined.audience_emotion].slice(1);

    // 4. Safety overrides
    if (refined.safety_risk !== 'low') {
      refined.best_angle = 'info'; // Force neutral
      refined.fallback_angles = ['analysis'];
      refined.reasoning += ' [Override: Safety constraint]';
    }

    // 5. Apply safety override matrix
    const safetyRules = SAFETY_OVERRIDE[refined.audience_emotion];
    if (safetyRules.disallowed.includes(refined.best_angle)) {
      refined.best_angle = safetyRules.allowed[0];
      refined.reasoning += ` [Override: ${refined.audience_emotion} emotion safety]`;
    }

    // 6. Time-aware modulation
    if (refined.entity_metadata.event_age_days !== undefined) {
      refined.best_angle = this.applyTimeModulation(
        refined.best_angle,
        refined.entity_metadata.event_age_days,
        isLegend
      );
    }

    // 7. Context-specific overrides
    refined.best_angle = this.applyContextOverrides(refined, input);

    return refined;
  }

  /**
   * Determine best angle for senior actors
   */
  private determineBestAngleForSenior(emotion: AudienceEmotion): EditorialAngle {
    const seniorAngles: Record<AudienceEmotion, EditorialAngle> = {
      nostalgia: 'nostalgia',
      pride: 'tribute',
      excitement: 'tribute',
      curiosity: 'analysis',
      celebration: 'tribute',
      sadness: 'tribute',
      controversy: 'info',
    };
    return seniorAngles[emotion];
  }

  /**
   * Apply time-based modulation
   */
  private applyTimeModulation(
    currentAngle: EditorialAngle,
    eventAgeDays: number,
    isLegend: boolean
  ): EditorialAngle {
    // Old events (10+ years) for legends → boost nostalgia
    if (eventAgeDays > 3650 && isLegend) {
      return 'nostalgia';
    }

    // Fresh events (< 48 hours) → boost excitement/viral
    if (eventAgeDays < 2) {
      if (currentAngle === 'analysis') return 'viral';
      if (currentAngle === 'nostalgia') return 'celebration';
    }

    return currentAngle;
  }

  /**
   * Apply context-specific overrides based on topic patterns
   */
  private applyContextOverrides(plan: EditorialPlan, input: AnalyzerInput): EditorialAngle {
    const topic = input.topic.toLowerCase();

    // Movie contexts
    if (topic.includes('re-release') || topic.includes('రీ-రిలీజ్')) {
      return 'nostalgia';
    }
    if (topic.includes('box office') || topic.includes('బాక్స్ ఆఫీస్')) {
      return plan.audience_emotion === 'celebration' ? 'viral' : 'analysis';
    }
    if (topic.includes('flop') || topic.includes('ఫ్లాప్')) {
      return 'analysis';
    }
    if (topic.includes('ott') || topic.includes('ఓటీటీ')) {
      return 'info';
    }

    // Actor contexts
    if (topic.includes('birthday') || topic.includes('పుట్టినరోజు')) {
      return 'tribute';
    }
    if (topic.includes('anniversary') || topic.includes('వర్ధంతి')) {
      return 'tribute';
    }
    if (topic.includes('comeback') || topic.includes('కంబ్యాక్')) {
      return plan.entity_metadata?.is_senior ? 'nostalgia' : 'excitement';
    }

    // IPL/Sports contexts
    if (topic.includes('ipl') || topic.includes('ఐపీఎల్')) {
      if (topic.includes('win') || topic.includes('గెలుపు')) return 'celebration';
      if (topic.includes('loss') || topic.includes('ఓటమి')) return 'analysis';
      return 'viral';
    }

    return plan.best_angle;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(plan: EditorialPlan, input: AnalyzerInput): number {
    let score = 0.7; // Base confidence

    // Entity clarity
    if (plan.main_entity && plan.main_entity !== 'Unknown') score += 0.1;

    // Narrative completeness
    const narrativeFields = Object.values(plan.narrative_plan);
    const filledFields = narrativeFields.filter(v =>
      (typeof v === 'string' && v.length > 10) ||
      (Array.isArray(v) && v.length > 0)
    ).length;
    score += (filledFields / narrativeFields.length) * 0.15;

    // Source reliability
    if (input.source === 'tmdb' || input.source === 'wikidata') score += 0.05;

    // Safety penalty
    if (plan.safety_risk === 'medium') score -= 0.1;
    if (plan.safety_risk === 'high') score -= 0.2;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Store editorial context for learning
   */
  private async storeEditorialContext(plan: EditorialPlan, input: AnalyzerInput): Promise<void> {
    try {
      await this.supabase.from('generation_contexts').insert({
        topic: input.topic,
        source: input.source,
        main_entity: plan.main_entity,
        entity_type: plan.entity_type,
        audience_emotion: plan.audience_emotion,
        best_angle: plan.best_angle,
        safety_risk: plan.safety_risk,
        narrative_plan: plan.narrative_plan,
        confidence: plan.confidence,
        reasoning: plan.reasoning,
        needs_human_review: plan.needs_human_review,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Table might not have new columns yet, continue silently
      console.warn('Failed to store editorial context:', error);
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private isLegendActor(entity: string, topic: string): boolean {
    const combined = `${entity} ${topic}`.toLowerCase();
    return Array.from(LEGEND_ACTORS).some(name => combined.includes(name));
  }

  private isSeniorActor(entity: string, topic: string): boolean {
    const combined = `${entity} ${topic}`.toLowerCase();
    return Array.from(SENIOR_ACTORS).some(name => combined.includes(name));
  }

  private determineEra(entity: string, topic: string): string {
    const combined = `${entity} ${topic}`.toLowerCase();
    if (combined.match(/1950|1960|1970|classic|క్లాసిక్/)) return 'classic';
    if (combined.match(/1980|golden|గోల్డెన్/)) return 'golden';
    if (combined.match(/1990|90s|silver/)) return 'silver';
    if (combined.match(/2000|2005|2010/)) return 'modern';
    return 'current';
  }

  private estimateEventAge(input: AnalyzerInput): number | undefined {
    const topic = input.topic.toLowerCase();

    // Look for year mentions
    const yearMatch = topic.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      return (currentYear - year) * 365;
    }

    // Keywords suggesting recency
    if (topic.match(/today|నేడు|just|తాజా/i)) return 0;
    if (topic.match(/yesterday|నిన్న/i)) return 1;
    if (topic.match(/this week|ఈ వారం/i)) return 3;

    return undefined;
  }

  private validateEmotion(emotion: string): AudienceEmotion {
    const valid: AudienceEmotion[] = ['nostalgia', 'excitement', 'pride', 'curiosity', 'controversy', 'sadness', 'celebration'];
    return valid.includes(emotion as AudienceEmotion) ? emotion as AudienceEmotion : 'curiosity';
  }

  private validateAngle(angle: string): EditorialAngle {
    const valid: EditorialAngle[] = ['gossip', 'nostalgia', 'info', 'tribute', 'analysis', 'viral'];
    return valid.includes(angle as EditorialAngle) ? angle as EditorialAngle : 'info';
  }

  private validateSafetyRisk(risk: string): SafetyRisk {
    const valid: SafetyRisk[] = ['low', 'medium', 'high'];
    return valid.includes(risk as SafetyRisk) ? risk as SafetyRisk : 'medium';
  }

  private getDefaultPlan(topic: string): EditorialPlan {
    return {
      main_entity: 'Unknown',
      entity_type: 'other',
      audience_emotion: 'curiosity',
      best_angle: 'info',
      fallback_angles: ['analysis'],
      safety_risk: 'medium',
      narrative_plan: {
        hook: ['ఈ వార్త మీ కోసం...'],
        context: '',
        main_story: topic,
        fan_reactions: '',
        past_relevance: '',
        closing_note: '',
      },
      confidence: 0.5,
      reasoning: 'Default plan due to analysis failure',
      needs_human_review: true,
    };
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let analyzerInstance: EditorialAnalyzer | null = null;

export function getEditorialAnalyzer(): EditorialAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new EditorialAnalyzer();
  }
  return analyzerInstance;
}

/**
 * Main export function.
 * Use this in the generation pipeline.
 */
export async function analyzeEditorialIntent(input: AnalyzerInput): Promise<EditorialPlan> {
  const analyzer = getEditorialAnalyzer();
  return analyzer.analyzeEditorialIntent(input);
}
