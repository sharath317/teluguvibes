/**
 * TeluguVibes AI Reasoning Layer
 * Pre-generation analysis and content planning
 * 
 * NO content is generated without this analysis
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface ContentPlan {
  // Recommendation
  should_proceed: boolean;
  rejection_reason?: string;
  
  // Topic analysis
  topic: string;
  detected_intent: 'gossip' | 'nostalgia' | 'info' | 'emotion' | 'breaking' | 'entertainment';
  audience_mood: 'excited' | 'curious' | 'nostalgic' | 'angry' | 'happy' | 'neutral';
  
  // Saturation check
  topic_saturation: number; // 0-1
  is_oversaturated: boolean;
  
  // Recommendations
  recommended_angle: string;
  recommended_tone: 'formal' | 'casual' | 'emotional' | 'analytical' | 'humorous';
  recommended_length: 'short' | 'medium' | 'long'; // 300, 500, 800+ words
  recommended_format: 'news' | 'review' | 'listicle' | 'biography' | 'interview' | 'analysis';
  recommended_sections: string[];
  
  // Images
  image_strategy: 'poster' | 'photo' | 'event' | 'generic' | 'ai_generate';
  image_keywords: string[];
  
  // Timing
  optimal_publish_time: Date;
  urgency: 'immediate' | 'today' | 'this_week' | 'evergreen';
  
  // Historical context
  similar_posts: Array<{
    id: string;
    title: string;
    performance: number;
    learnings: string;
  }>;
  avg_similar_performance: number;
  
  // SEO
  seo_keywords: string[];
  title_suggestions: string[];
  
  // Confidence
  confidence_score: number;
  reasoning: string;
}

export interface ReasoningContext {
  topic: string;
  source: 'trending' | 'scheduled' | 'evergreen' | 'breaking' | 'manual';
  category?: string;
  entity_type?: string;
  entity_id?: string;
  raw_signals?: any[];
}

// ===== MAIN REASONING FUNCTION =====

export async function analyzeBeforeGeneration(context: ReasoningContext): Promise<ContentPlan> {
  console.log(`[AI Reasoning] Analyzing: ${context.topic}`);
  
  // Step 1: Gather intelligence
  const [
    trendData,
    saturationData,
    historicalData,
    audienceData,
    learnings
  ] = await Promise.all([
    getTrendIntelligence(context.topic),
    checkTopicSaturation(context.topic),
    getHistoricalPerformance(context.topic, context.category),
    getAudiencePreferences(context.category),
    getRelevantLearnings(context.category, context.entity_type)
  ]);

  // Step 2: Detect intent and mood
  const intent = detectIntent(context, trendData);
  const mood = detectAudienceMood(trendData, historicalData);

  // Step 3: Check if we should proceed
  const saturationCheck = evaluateSaturation(saturationData, trendData);
  
  if (saturationCheck.is_oversaturated && context.source !== 'breaking') {
    return {
      should_proceed: false,
      rejection_reason: `Topic "${context.topic}" is oversaturated (${(saturationCheck.score * 100).toFixed(0)}%). Wait ${saturationCheck.cooldown_hours}h or find a unique angle.`,
      topic: context.topic,
      detected_intent: intent,
      audience_mood: mood,
      topic_saturation: saturationCheck.score,
      is_oversaturated: true,
      recommended_angle: '',
      recommended_tone: 'casual',
      recommended_length: 'medium',
      recommended_format: 'news',
      recommended_sections: [],
      image_strategy: 'generic',
      image_keywords: [],
      optimal_publish_time: new Date(),
      urgency: 'this_week',
      similar_posts: [],
      avg_similar_performance: 0,
      seo_keywords: [],
      title_suggestions: [],
      confidence_score: 0.9,
      reasoning: saturationCheck.reason,
    };
  }

  // Step 4: Determine recommendations
  const recommendations = generateRecommendations(
    context, intent, mood, historicalData, audienceData, learnings
  );

  // Step 5: Generate title suggestions
  const titleSuggestions = await generateTitleSuggestions(
    context.topic, intent, recommendations.angle, learnings
  );

  // Step 6: Build the content plan
  const plan: ContentPlan = {
    should_proceed: true,
    topic: context.topic,
    detected_intent: intent,
    audience_mood: mood,
    topic_saturation: saturationCheck.score,
    is_oversaturated: false,
    recommended_angle: recommendations.angle,
    recommended_tone: recommendations.tone,
    recommended_length: recommendations.length,
    recommended_format: recommendations.format,
    recommended_sections: recommendations.sections,
    image_strategy: recommendations.imageStrategy,
    image_keywords: recommendations.imageKeywords,
    optimal_publish_time: calculateOptimalTime(audienceData, context.source),
    urgency: determineUrgency(context.source, trendData),
    similar_posts: historicalData.posts.slice(0, 3),
    avg_similar_performance: historicalData.avgPerformance,
    seo_keywords: extractSEOKeywords(context.topic, trendData),
    title_suggestions: titleSuggestions,
    confidence_score: calculateConfidence(trendData, historicalData, learnings),
    reasoning: buildReasoningExplanation(context, recommendations, historicalData),
  };

  // Step 7: Store this context for future learning
  await storeGenerationContext(plan, context);

  console.log(`[AI Reasoning] Plan ready for: ${context.topic} (confidence: ${plan.confidence_score})`);
  return plan;
}

// ===== INTELLIGENCE GATHERING =====

async function getTrendIntelligence(topic: string) {
  const { data } = await supabase
    .from('topic_clusters')
    .select('*')
    .ilike('primary_keyword', `%${topic}%`)
    .order('avg_score', { ascending: false })
    .limit(5);

  const { data: signals } = await supabase
    .from('trend_signals')
    .select('*')
    .ilike('keyword', `%${topic}%`)
    .gte('signal_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('normalized_score', { ascending: false })
    .limit(20);

  return {
    clusters: data || [],
    signals: signals || [],
    trendScore: signals?.reduce((sum, s) => sum + s.normalized_score, 0) / (signals?.length || 1) || 0,
    velocity: signals?.reduce((sum, s) => sum + (s.velocity || 1), 0) / (signals?.length || 1) || 1,
    sources: [...new Set(signals?.map(s => s.source) || [])],
  };
}

async function checkTopicSaturation(topic: string) {
  // Count recent posts with this topic
  const { count: recentCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .ilike('title', `%${topic}%`)
    .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

  // Get performance of recent posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .ilike('title', `%${topic}%`)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  let avgPerformance = 50;
  if (recentPosts && recentPosts.length > 0) {
    const { data: perfData } = await supabase
      .from('content_performance')
      .select('overall_performance')
      .in('post_id', recentPosts.map(p => p.id));
    
    if (perfData && perfData.length > 0) {
      avgPerformance = perfData.reduce((sum, p) => sum + (p.overall_performance || 0), 0) / perfData.length;
    }
  }

  const count = recentCount || 0;
  const saturationScore = Math.min(1, (count * 0.15) + (avgPerformance < 40 ? 0.3 : 0));

  return {
    recentPosts: count,
    avgPerformance,
    score: saturationScore,
  };
}

async function getHistoricalPerformance(topic: string, category?: string) {
  // Find similar past posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, category, created_at,
      content_performance(overall_performance, views, engagement_score)
    `)
    .or(`title.ilike.%${topic}%,category.eq.${category}`)
    .order('created_at', { ascending: false })
    .limit(10);

  const analyzedPosts = (posts || []).map(p => ({
    id: p.id,
    title: p.title,
    performance: (p as any).content_performance?.[0]?.overall_performance || 0,
    learnings: extractLearnings(p, (p as any).content_performance?.[0]),
  }));

  const avgPerformance = analyzedPosts.length > 0
    ? analyzedPosts.reduce((sum, p) => sum + p.performance, 0) / analyzedPosts.length
    : 50;

  return {
    posts: analyzedPosts,
    avgPerformance,
    bestPerformer: analyzedPosts[0],
  };
}

async function getAudiencePreferences(category?: string) {
  const { data } = await supabase
    .from('audience_preferences')
    .select('*')
    .or(`dimension_value.eq.${category},dimension_type.eq.time_of_day`)
    .order('preference_score', { ascending: false });

  const preferences = data || [];
  
  // Find peak hours
  const timePrefs = preferences.filter(p => p.dimension_type === 'time_of_day');
  const peakHours = timePrefs.slice(0, 3).map(p => parseInt(p.dimension_value));

  return {
    preferences,
    peakHours: peakHours.length > 0 ? peakHours : [9, 12, 18], // Default peak hours
    categoryEngagement: preferences.find(p => p.dimension_value === category)?.avg_engagement || 50,
  };
}

async function getRelevantLearnings(category?: string, entityType?: string) {
  const { data } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('is_active', true)
    .or(`category.eq.${category},entity_type.eq.${entityType},category.is.null`)
    .order('confidence_score', { ascending: false })
    .limit(10);

  return data || [];
}

// ===== ANALYSIS FUNCTIONS =====

function detectIntent(
  context: ReasoningContext, 
  trendData: any
): ContentPlan['detected_intent'] {
  const topic = context.topic.toLowerCase();
  
  if (context.source === 'breaking') return 'breaking';
  if (topic.includes('birthday') || topic.includes('anniversary')) return 'nostalgia';
  if (topic.includes('rumor') || topic.includes('gossip') || topic.includes('affair')) return 'gossip';
  if (topic.includes('review') || topic.includes('analysis')) return 'info';
  if (topic.includes('emotional') || topic.includes('sad') || topic.includes('tribute')) return 'emotion';
  if (trendData.velocity > 2) return 'breaking';
  
  return 'entertainment';
}

function detectAudienceMood(trendData: any, historicalData: any): ContentPlan['audience_mood'] {
  const avgSentiment = trendData.signals.reduce((sum: number, s: any) => sum + (s.sentiment || 0), 0) 
    / (trendData.signals.length || 1);
  
  if (avgSentiment > 0.5) return 'excited';
  if (avgSentiment > 0.2) return 'happy';
  if (avgSentiment < -0.3) return 'angry';
  if (trendData.clusters.some((c: any) => c.trend_direction === 'spiking')) return 'curious';
  
  return 'neutral';
}

function evaluateSaturation(saturationData: any, trendData: any) {
  const score = saturationData.score;
  const isOverSaturated = score > 0.7 && trendData.velocity < 1.5;
  
  return {
    score,
    is_oversaturated: isOverSaturated,
    cooldown_hours: Math.ceil(score * 48),
    reason: isOverSaturated 
      ? `${saturationData.recentPosts} similar posts in last 3 days with declining engagement (${saturationData.avgPerformance.toFixed(0)}% avg)`
      : 'Topic has room for fresh content',
  };
}

function generateRecommendations(
  context: ReasoningContext,
  intent: ContentPlan['detected_intent'],
  mood: ContentPlan['audience_mood'],
  historicalData: any,
  audienceData: any,
  learnings: any[]
) {
  // Base recommendations by intent
  const intentDefaults: Record<string, any> = {
    gossip: { tone: 'casual', length: 'short', format: 'news' },
    nostalgia: { tone: 'emotional', length: 'long', format: 'biography' },
    info: { tone: 'analytical', length: 'medium', format: 'analysis' },
    emotion: { tone: 'emotional', length: 'medium', format: 'news' },
    breaking: { tone: 'formal', length: 'short', format: 'news' },
    entertainment: { tone: 'casual', length: 'medium', format: 'news' },
  };

  const base = intentDefaults[intent] || intentDefaults.entertainment;

  // Apply learnings
  const lengthLearning = learnings.find(l => l.learning_type === 'length_optimal');
  if (lengthLearning && lengthLearning.confidence_score > 0.7) {
    base.length = lengthLearning.pattern_description.includes('long') ? 'long' : 
                  lengthLearning.pattern_description.includes('short') ? 'short' : 'medium';
  }

  // Determine sections based on format
  const sectionsByFormat: Record<string, string[]> = {
    news: ['hook', 'main_story', 'context', 'quotes', 'conclusion'],
    review: ['verdict', 'story_analysis', 'performances', 'technical', 'final_rating'],
    biography: ['intro', 'early_life', 'career', 'achievements', 'legacy'],
    listicle: ['intro', 'item_1', 'item_2', 'item_3', 'conclusion'],
    analysis: ['thesis', 'evidence', 'counter_points', 'conclusion'],
  };

  // Determine angle based on historical success
  let angle = 'standard coverage';
  if (historicalData.bestPerformer && historicalData.bestPerformer.performance > 70) {
    angle = `similar to successful: "${historicalData.bestPerformer.title}"`;
  } else if (intent === 'nostalgia') {
    angle = 'emotional tribute with career highlights';
  } else if (mood === 'excited') {
    angle = 'celebratory, fan-focused';
  }

  // Image strategy
  let imageStrategy: ContentPlan['image_strategy'] = 'generic';
  if (context.entity_type === 'movie') imageStrategy = 'poster';
  if (context.entity_type === 'actor' || context.entity_type === 'celebrity') imageStrategy = 'photo';
  if (intent === 'breaking') imageStrategy = 'event';

  return {
    tone: base.tone,
    length: base.length,
    format: base.format,
    sections: sectionsByFormat[base.format] || sectionsByFormat.news,
    angle,
    imageStrategy,
    imageKeywords: [context.topic, context.entity_type || '', context.category || ''].filter(Boolean),
  };
}

async function generateTitleSuggestions(
  topic: string, 
  intent: string, 
  angle: string,
  learnings: any[]
): Promise<string[]> {
  // Pattern-based title generation
  const patterns: Record<string, string[]> = {
    gossip: [
      `${topic}: షాకింగ్ నిజం బయటకు వచ్చింది!`,
      `${topic} గురించి అందరూ మాట్లాడుకుంటున్నారు`,
      `${topic}: వైరల్ అవుతున్న వార్త`,
    ],
    nostalgia: [
      `${topic}: ఒక అద్భుత ప్రయాణం`,
      `${topic} గురించి మీకు తెలియని విషయాలు`,
      `${topic}: హృదయాలను గెలుచుకున్న కథ`,
    ],
    breaking: [
      `BREAKING: ${topic}`,
      `తాజా వార్త: ${topic}`,
      `ఇప్పుడే వచ్చిన వార్త: ${topic}`,
    ],
    entertainment: [
      `${topic}: పూర్తి వివరాలు`,
      `${topic} గురించి తెలుసుకోండి`,
      `${topic}: ఏమి జరిగింది?`,
    ],
  };

  const suggestions = patterns[intent] || patterns.entertainment;

  // Apply title learnings if available
  const titleLearning = learnings.find(l => l.learning_type === 'title_pattern');
  if (titleLearning) {
    suggestions.push(`[AI] ${titleLearning.pattern_description}`);
  }

  return suggestions;
}

function calculateOptimalTime(audienceData: any, source: string): Date {
  if (source === 'breaking') return new Date(); // Publish immediately
  
  const now = new Date();
  const peakHour = audienceData.peakHours[0] || 9;
  
  // If current time is past peak, schedule for next day
  if (now.getHours() > peakHour) {
    now.setDate(now.getDate() + 1);
  }
  now.setHours(peakHour, 0, 0, 0);
  
  return now;
}

function determineUrgency(source: string, trendData: any): ContentPlan['urgency'] {
  if (source === 'breaking') return 'immediate';
  if (trendData.velocity > 2) return 'today';
  if (trendData.trendScore > 70) return 'today';
  if (source === 'evergreen') return 'evergreen';
  return 'this_week';
}

function extractSEOKeywords(topic: string, trendData: any): string[] {
  const keywords = new Set<string>();
  keywords.add(topic);
  keywords.add(`${topic} news`);
  keywords.add(`${topic} telugu`);
  
  // Add related keywords from signals
  for (const signal of trendData.signals.slice(0, 5)) {
    if (signal.related_keywords) {
      signal.related_keywords.forEach((k: string) => keywords.add(k));
    }
  }
  
  return Array.from(keywords).slice(0, 10);
}

function calculateConfidence(trendData: any, historicalData: any, learnings: any[]): number {
  let confidence = 0.5;
  
  // More signals = more confidence
  if (trendData.signals.length > 5) confidence += 0.1;
  if (trendData.signals.length > 10) confidence += 0.1;
  
  // Historical data improves confidence
  if (historicalData.posts.length > 3) confidence += 0.1;
  if (historicalData.avgPerformance > 60) confidence += 0.1;
  
  // Learnings add confidence
  if (learnings.length > 0) confidence += 0.05 * Math.min(learnings.length, 3);
  
  return Math.min(0.95, confidence);
}

function buildReasoningExplanation(
  context: ReasoningContext, 
  recommendations: any, 
  historicalData: any
): string {
  const parts = [
    `Topic: ${context.topic}`,
    `Recommended format: ${recommendations.format}`,
    `Tone: ${recommendations.tone}`,
    `Length: ${recommendations.length}`,
  ];
  
  if (historicalData.posts.length > 0) {
    parts.push(`Based on ${historicalData.posts.length} similar posts (avg perf: ${historicalData.avgPerformance.toFixed(0)}%)`);
  }
  
  parts.push(`Angle: ${recommendations.angle}`);
  
  return parts.join(' | ');
}

function extractLearnings(post: any, performance: any): string {
  if (!performance) return 'No performance data';
  
  if (performance.overall_performance > 80) {
    return 'High performer - replicate structure';
  } else if (performance.overall_performance < 30) {
    return 'Low performer - avoid similar approach';
  }
  return 'Average performer';
}

// ===== STORAGE =====

async function storeGenerationContext(plan: ContentPlan, context: ReasoningContext): Promise<void> {
  await supabase
    .from('generation_contexts')
    .insert({
      trigger_type: context.source,
      detected_intent: plan.detected_intent,
      audience_mood: plan.audience_mood,
      topic_saturation: plan.topic_saturation,
      seasonal_relevance: 0, // TODO: Calculate
      recommended_angle: plan.recommended_angle,
      recommended_tone: plan.recommended_tone,
      recommended_length: plan.recommended_length === 'short' ? 300 : plan.recommended_length === 'long' ? 800 : 500,
      recommended_format: plan.recommended_format,
      recommended_images: plan.image_keywords,
      optimal_publish_time: plan.optimal_publish_time,
      similar_past_posts: plan.similar_posts.map(p => p.id),
      avg_similar_performance: plan.avg_similar_performance,
      reasoning_json: {
        plan,
        context,
        timestamp: new Date().toISOString(),
      },
    });
}

