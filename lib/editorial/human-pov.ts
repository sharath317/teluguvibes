/**
 * TeluguVibes Human POV Layer
 * Anti-AI Fatigue System
 *
 * RULE: No content publishes without human perspective
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface HumanPOV {
  id?: string;
  post_id: string;
  pov_text: string;
  pov_type: POVType;
  editor_id: string;
  editor_name?: string;
}

export type POVType =
  | 'insider_trivia'
  | 'cultural_context'
  | 'opinionated_framing'
  | 'industry_relevance'
  | 'personal_anecdote'
  | 'prediction'
  | 'comparison';

export interface POVSuggestion {
  suggested_type: POVType;
  suggested_text: string;
  reasoning: string;
}

// ===== POV MANAGEMENT =====

/**
 * Add human POV to a post
 */
export async function addHumanPOV(pov: HumanPOV): Promise<{ success: boolean; error?: string }> {
  // Validate minimum length (2-4 sentences ~ 40-100 words)
  const wordCount = pov.pov_text.split(/\s+/).length;
  if (wordCount < 20) {
    return { success: false, error: 'POV must be at least 2-4 sentences (20+ words)' };
  }

  // Analyze what AI might have missed
  const gapAnalysis = await analyzeAIGap(pov.post_id, pov.pov_text);

  const { error } = await supabase
    .from('human_pov')
    .upsert({
      post_id: pov.post_id,
      pov_text: pov.pov_text,
      pov_type: pov.pov_type,
      editor_id: pov.editor_id,
      editor_name: pov.editor_name,
      ai_gap_analysis: gapAnalysis.gap,
      originality_score: gapAnalysis.originalityScore,
      is_approved: true, // Auto-approve if editor adds
      approved_at: new Date().toISOString(),
    }, {
      onConflict: 'post_id'
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update publishing gates
  await supabase.rpc('check_publishing_gates', { p_post_id: pov.post_id });

  // Learn from this POV
  await learnFromPOV(pov);

  return { success: true };
}

/**
 * Get POV for a post
 */
export async function getPOV(postId: string): Promise<HumanPOV | null> {
  const { data } = await supabase
    .from('human_pov')
    .select('*')
    .eq('post_id', postId)
    .single();

  return data;
}

/**
 * Check if post has approved POV
 */
export async function hasPOV(postId: string): Promise<boolean> {
  const { data } = await supabase
    .from('human_pov')
    .select('id')
    .eq('post_id', postId)
    .eq('is_approved', true)
    .single();

  return !!data;
}

// ===== AI GAP ANALYSIS =====

/**
 * Analyze what the human added that AI missed
 */
async function analyzeAIGap(postId: string, povText: string): Promise<{
  gap: string;
  originalityScore: number;
}> {
  // Get the original AI-generated content
  const { data: post } = await supabase
    .from('posts')
    .select('body, title')
    .eq('id', postId)
    .single();

  if (!post) {
    return { gap: 'Original post not found', originalityScore: 1.0 };
  }

  // Analyze the gap using AI
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return { gap: 'Unable to analyze - API key missing', originalityScore: 0.7 };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You analyze what human editors add that AI content generation misses.
Compare the AI-generated content with the human POV addition.
Identify: insider knowledge, cultural context, personal opinion, industry insight.
Output JSON: { "gap": "description of what human added", "originalityScore": 0.0-1.0 }`
          },
          {
            role: 'user',
            content: `AI Content (excerpt): "${post.body?.slice(0, 500)}..."

Human POV Addition: "${povText}"

What unique value did the human add?`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return {
        gap: parsed.gap || 'Unique human perspective',
        originalityScore: Math.min(1, Math.max(0, parsed.originalityScore || 0.7)),
      };
    } catch {
      return { gap: content.slice(0, 200), originalityScore: 0.7 };
    }
  } catch (error) {
    return { gap: 'Analysis failed', originalityScore: 0.7 };
  }
}

// ===== POV SUGGESTIONS =====

/**
 * Generate POV suggestions for editors
 */
export async function generatePOVSuggestions(postId: string): Promise<POVSuggestion[]> {
  const { data: post } = await supabase
    .from('posts')
    .select('title, body, category')
    .eq('id', postId)
    .single();

  if (!post) return [];

  // Get learned patterns for this category
  const { data: learnings } = await supabase
    .from('pov_learnings')
    .select('*')
    .eq('category', post.category)
    .order('avg_impact_score', { ascending: false })
    .limit(3);

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return getDefaultSuggestions(post);

  try {
    const learningContext = learnings?.map(l =>
      `Type: ${l.pov_type}, Impact: ${l.avg_impact_score}%, Good additions: ${l.successful_additions?.join(', ')}`
    ).join('\n') || 'No learned patterns yet';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You suggest Human POV additions for Telugu entertainment articles.
POV types: insider_trivia, cultural_context, opinionated_framing, industry_relevance, personal_anecdote, prediction, comparison

Based on learned patterns:
${learningContext}

Generate 3 suggestions. Each must:
- Be 2-4 sentences in Telugu (English names OK)
- Add genuine insight AI cannot provide
- Match the article's topic

Output JSON array: [{ "suggested_type": "...", "suggested_text": "...", "reasoning": "..." }]`
          },
          {
            role: 'user',
            content: `Article: ${post.title}
Category: ${post.category}
Content preview: ${post.body?.slice(0, 300)}...

Generate 3 POV suggestions:`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);

        // Store suggestions
        for (const s of suggestions) {
          await supabase.from('pov_suggestions').insert({
            post_id: postId,
            suggested_type: s.suggested_type,
            suggested_text: s.suggested_text,
            reasoning: s.reasoning,
          });
        }

        return suggestions;
      }
    } catch {
      console.error('Failed to parse POV suggestions');
    }
  } catch (error) {
    console.error('POV suggestion generation failed:', error);
  }

  return getDefaultSuggestions(post);
}

function getDefaultSuggestions(post: any): POVSuggestion[] {
  return [
    {
      suggested_type: 'cultural_context',
      suggested_text: 'ఈ విషయానికి తెలుగు సినిమా పరిశ్రమలో ప్రత్యేక ప్రాముఖ్యత ఉంది...',
      reasoning: 'Add Telugu cinema cultural context',
    },
    {
      suggested_type: 'insider_trivia',
      suggested_text: 'పరిశ్రమ వర్గాల ప్రకారం...',
      reasoning: 'Add industry insider perspective',
    },
    {
      suggested_type: 'opinionated_framing',
      suggested_text: 'నా అభిప్రాయంలో, ఈ పరిణామం...',
      reasoning: 'Add editorial opinion',
    },
  ];
}

// ===== LEARNING SYSTEM =====

/**
 * Learn from successful POV additions
 */
async function learnFromPOV(pov: HumanPOV): Promise<void> {
  // Get post category
  const { data: post } = await supabase
    .from('posts')
    .select('category')
    .eq('id', pov.post_id)
    .single();

  if (!post) return;

  // Extract learning patterns
  const patterns = extractPOVPatterns(pov.pov_text);

  // Update or create learning record
  const { data: existing } = await supabase
    .from('pov_learnings')
    .select('*')
    .eq('pov_type', pov.pov_type)
    .eq('category', post.category)
    .single();

  if (existing) {
    await supabase
      .from('pov_learnings')
      .update({
        successful_additions: [...new Set([...(existing.successful_additions || []), ...patterns])].slice(0, 10),
        sample_size: existing.sample_size + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('pov_learnings')
      .insert({
        pov_type: pov.pov_type,
        category: post.category,
        successful_additions: patterns,
        sample_size: 1,
      });
  }
}

function extractPOVPatterns(text: string): string[] {
  const patterns: string[] = [];

  // Detect common patterns
  if (text.includes('పరిశ్రమ') || text.includes('industry')) patterns.push('industry_reference');
  if (text.includes('నా అభిప్రాయం') || text.includes('my opinion')) patterns.push('personal_opinion');
  if (text.includes('చరిత్ర') || text.includes('history')) patterns.push('historical_context');
  if (text.includes('భవిష్యత్') || text.includes('future')) patterns.push('prediction');
  if (text.includes('అభిమానులు') || text.includes('fans')) patterns.push('fan_perspective');

  return patterns;
}

// ===== IMPACT MEASUREMENT =====

/**
 * Calculate POV impact on content performance
 */
export async function measurePOVImpact(postId: string): Promise<{
  hasImpact: boolean;
  bounceImprovement: number;
  dwellImprovement: number;
  recommendation: string;
}> {
  const { data: pov } = await supabase
    .from('human_pov')
    .select('*')
    .eq('post_id', postId)
    .single();

  if (!pov) {
    return {
      hasImpact: false,
      bounceImprovement: 0,
      dwellImprovement: 0,
      recommendation: 'Add human POV to improve engagement',
    };
  }

  // Calculate impact
  await supabase.rpc('calculate_pov_impact', { p_post_id: postId });

  // Get updated metrics
  const { data: updatedPov } = await supabase
    .from('human_pov')
    .select('pov_impact_score, with_pov_bounce_rate, without_pov_bounce_rate')
    .eq('post_id', postId)
    .single();

  const bounceImprovement = updatedPov?.pov_impact_score || 0;

  return {
    hasImpact: bounceImprovement > 0,
    bounceImprovement,
    dwellImprovement: 0, // Would need additional tracking
    recommendation: bounceImprovement > 10
      ? 'POV significantly improving engagement!'
      : bounceImprovement > 0
        ? 'POV helping slightly, consider more insider info'
        : 'Consider a different POV type for better impact',
  };
}

// ===== AI PROMPT IMPROVEMENTS =====

/**
 * Get AI prompt improvements based on POV learnings
 */
export async function getPromptImprovements(category: string): Promise<string> {
  const { data: learnings } = await supabase
    .from('pov_learnings')
    .select('*')
    .eq('category', category)
    .gte('avg_impact_score', 5) // Only high-impact learnings
    .order('avg_impact_score', { ascending: false })
    .limit(5);

  if (!learnings || learnings.length === 0) {
    return '';
  }

  // Build prompt additions based on what humans consistently add
  const additions = learnings.flatMap(l => l.successful_additions || []);
  const uniqueAdditions = [...new Set(additions)];

  const promptAdditions = uniqueAdditions.map(a => {
    switch (a) {
      case 'industry_reference':
        return 'Include industry context and behind-the-scenes perspective';
      case 'personal_opinion':
        return 'Add a nuanced editorial opinion where appropriate';
      case 'historical_context':
        return 'Reference relevant Telugu cinema history';
      case 'prediction':
        return 'Include future implications or predictions';
      case 'fan_perspective':
        return 'Consider the fan perspective and emotional connection';
      default:
        return '';
    }
  }).filter(Boolean);

  return promptAdditions.length > 0
    ? `\n\nBased on editorial patterns, also include:\n${promptAdditions.map(a => `- ${a}`).join('\n')}`
    : '';
}
