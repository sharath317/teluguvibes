/**
 * CONTENT GENERATION PIPELINE
 *
 * Orchestrates the full content generation flow:
 *
 * 1. Editorial Intelligence Analyzer (MANDATORY)
 * 2. Adaptive Content Generator (existing)
 * 3. Human POV Injection (existing)
 * 4. Admin Review → Publish
 *
 * CRITICAL: No content should be generated without editorial analysis.
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeEditorialIntent, type EditorialPlan, type AnalyzerInput } from './editorial-analyzer';
import { generateArticleContent } from '@/lib/ai-content-generator';
import { fetchRelevantImage } from '@/lib/image-fetcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface GenerationInput {
  topic: string;
  rawContent?: string;
  source?: string;
  category?: string;
  language?: 'te' | 'en';
  skipEditorialAnalysis?: boolean; // DANGER: Only for testing
}

export interface GeneratedContent {
  title: string;
  body_te: string;
  body_en?: string;
  image_url?: string;
  image_source?: string;
  editorial_plan: EditorialPlan;
  metadata: {
    word_count: number;
    generated_at: string;
    confidence: number;
    needs_human_pov: boolean;
  };
}

export interface PipelineResult {
  success: boolean;
  content?: GeneratedContent;
  error?: string;
  editorial_plan?: EditorialPlan;
  blocked?: boolean;
  block_reason?: string;
}

// ============================================================
// MAIN PIPELINE
// ============================================================

/**
 * Full content generation pipeline.
 * Enforces editorial analysis before any content generation.
 */
export async function generateContentWithEditorialPlan(
  input: GenerationInput
): Promise<PipelineResult> {
  console.log(`\n🚀 Generation Pipeline: "${input.topic.slice(0, 50)}..."`);

  // ============================================================
  // STEP 1: EDITORIAL ANALYSIS (MANDATORY)
  // ============================================================

  let editorialPlan: EditorialPlan;

  if (input.skipEditorialAnalysis) {
    console.warn('⚠️ Editorial analysis skipped - NOT RECOMMENDED');
    editorialPlan = getMinimalEditorialPlan(input.topic);
  } else {
    try {
      editorialPlan = await analyzeEditorialIntent({
        topic: input.topic,
        rawContent: input.rawContent,
        source: input.source,
        language: input.language,
      });
    } catch (error) {
      console.error('Editorial analysis failed:', error);
      return {
        success: false,
        error: 'Editorial analysis failed',
        blocked: true,
        block_reason: 'Could not analyze editorial intent',
      };
    }
  }

  // ============================================================
  // STEP 1.5: CHECK CONFIDENCE THRESHOLD
  // ============================================================

  if (editorialPlan.confidence < 0.7) {
    console.log(`⏸ Low confidence (${editorialPlan.confidence.toFixed(2)}), blocking generation`);
    return {
      success: false,
      editorial_plan: editorialPlan,
      blocked: true,
      block_reason: `Confidence too low (${Math.round(editorialPlan.confidence * 100)}%). Needs human review.`,
    };
  }

  // ============================================================
  // STEP 1.6: CHECK SAFETY RISK
  // ============================================================

  if (editorialPlan.safety_risk === 'high') {
    console.log('🚨 High safety risk detected, blocking generation');
    return {
      success: false,
      editorial_plan: editorialPlan,
      blocked: true,
      block_reason: 'High safety risk. Requires manual admin review.',
    };
  }

  // ============================================================
  // STEP 2: ADAPTIVE CONTENT GENERATION
  // ============================================================

  console.log(`📝 Generating content with angle: ${editorialPlan.best_angle}`);

  try {
    // Build enhanced prompt using editorial plan
    const enhancedPrompt = buildEnhancedPrompt(input, editorialPlan);

    // Generate content
    const generated = await generateArticleContent(
      input.topic,
      input.rawContent || input.topic,
      input.category || 'entertainment'
    );

    if (!generated) {
      return {
        success: false,
        editorial_plan: editorialPlan,
        error: 'Content generation returned empty',
      };
    }

    // ============================================================
    // STEP 3: IMAGE FETCHING
    // ============================================================

    console.log('🖼️ Fetching relevant image...');

    const imageResult = await fetchRelevantImage(
      editorialPlan.main_entity,
      generated.telugu_body,
      input.category || 'entertainment'
    );

    // ============================================================
    // STEP 4: ASSEMBLE FINAL CONTENT
    // ============================================================

    const content: GeneratedContent = {
      title: input.topic, // Can be refined later
      body_te: applyEditorialOverlay(generated.telugu_body, editorialPlan),
      image_url: imageResult?.url,
      image_source: imageResult?.source,
      editorial_plan: editorialPlan,
      metadata: {
        word_count: countWords(generated.telugu_body),
        generated_at: new Date().toISOString(),
        confidence: editorialPlan.confidence,
        needs_human_pov: true, // Always needs human touch
      },
    };

    console.log('✅ Content generated successfully');

    return {
      success: true,
      content,
      editorial_plan: editorialPlan,
    };
  } catch (error) {
    console.error('Content generation failed:', error);
    return {
      success: false,
      editorial_plan: editorialPlan,
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build enhanced prompt incorporating editorial plan
 */
function buildEnhancedPrompt(
  input: GenerationInput,
  plan: EditorialPlan
): string {
  const angleInstructions: Record<string, string> = {
    nostalgia: 'Focus on memories, classic references, golden era connections. Use warm, respectful tone.',
    tribute: 'Honor the subject with respect. Highlight achievements and legacy. Use dignified language.',
    analysis: 'Provide balanced, factual analysis. Include data points. Avoid speculation.',
    info: 'Present facts neutrally. No opinions. Cite sources where possible.',
    viral: 'Make it shareable. Use engaging hooks. Include fan reactions.',
    gossip: 'Light, entertaining tone. But stay factual. No unverified claims.',
  };

  const emotionInstructions: Record<string, string> = {
    nostalgia: 'Evoke memories of the past. Reference old movies, classic songs.',
    excitement: 'Build anticipation. Use dynamic language.',
    pride: 'Celebrate achievements. Highlight Telugu/Indian success.',
    curiosity: 'Tease information. Create intrigue.',
    celebration: 'Joyful tone. Congratulatory language.',
    sadness: 'Respectful, somber tone. Focus on legacy.',
    controversy: 'Neutral, factual. Present multiple perspectives.',
  };

  return `
EDITORIAL PLAN:
- Entity: ${plan.main_entity}
- Emotion: ${plan.audience_emotion} - ${emotionInstructions[plan.audience_emotion]}
- Angle: ${plan.best_angle} - ${angleInstructions[plan.best_angle]}
- Safety: ${plan.safety_risk}

NARRATIVE BLUEPRINT:
- Hook: ${plan.narrative_plan.hook.join(' ')}
- Context: ${plan.narrative_plan.context}
- Past Relevance: ${plan.narrative_plan.past_relevance}

TOPIC: ${input.topic}
${input.rawContent ? `\nCONTENT: ${input.rawContent}` : ''}

Generate content following this editorial plan.
`.trim();
}

/**
 * Apply editorial overlay to generated content
 * Ensures the content follows the editorial plan
 */
function applyEditorialOverlay(
  content: string,
  plan: EditorialPlan
): string {
  // If hooks are provided, prepend them
  if (plan.narrative_plan.hook.length > 0 && !content.includes(plan.narrative_plan.hook[0])) {
    const hookSection = plan.narrative_plan.hook.join('\n\n');
    content = `${hookSection}\n\n${content}`;
  }

  // If closing note is provided, append it
  if (plan.narrative_plan.closing_note && !content.includes(plan.narrative_plan.closing_note)) {
    content = `${content}\n\n${plan.narrative_plan.closing_note}`;
  }

  return content;
}

/**
 * Count words in Telugu text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Minimal editorial plan for testing (NOT RECOMMENDED)
 */
function getMinimalEditorialPlan(topic: string): EditorialPlan {
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
    reasoning: 'Minimal plan - editorial analysis skipped',
    needs_human_review: true,
  };
}

// ============================================================
// BATCH PROCESSING
// ============================================================

/**
 * Process multiple topics in batch
 * Useful for trend imports
 */
export async function batchGenerateWithEditorial(
  topics: GenerationInput[]
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const topic of topics) {
    const result = await generateContentWithEditorialPlan(topic);
    results.push(result);

    // Delay between generations to respect rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}

// ============================================================
// STORAGE HELPERS
// ============================================================

/**
 * Save generated content as draft
 */
export async function saveDraftWithEditorialPlan(
  content: GeneratedContent,
  category: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: content.title,
        telugu_body: content.body_te,
        image_url: content.image_url,
        image_source: content.image_source,
        category,
        status: 'draft',
        is_ai_generated: true,
        editorial_plan: content.editorial_plan,
        audience_emotion: content.editorial_plan.audience_emotion,
        editorial_angle: content.editorial_plan.best_angle,
        safety_risk: content.editorial_plan.safety_risk,
        ai_confidence: content.editorial_plan.confidence,
        needs_human_pov: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save draft',
    };
  }
}



