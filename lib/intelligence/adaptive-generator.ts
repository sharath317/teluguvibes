/**
 * TeluguVibes Adaptive Content Generator
 * Generates content based on AI reasoning and learned patterns
 */

import { createClient } from '@supabase/supabase-js';
import { ContentPlan, analyzeBeforeGeneration, ReasoningContext } from './ai-reasoning';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface GeneratedContent {
  title: string;
  title_te: string;
  body: string;
  body_te?: string;
  excerpt: string;
  sections: ContentSection[];
  seo: {
    meta_title: string;
    meta_description: string;
    keywords: string[];
    schema_type: string;
  };
  images: {
    primary: string;
    keywords: string[];
    alt_text: string;
  };
  metadata: {
    word_count: number;
    reading_time: number;
    tone: string;
    format: string;
    generated_at: Date;
    plan_id?: string;
  };
}

export interface ContentSection {
  id: string;
  title: string;
  title_te?: string;
  content: string;
  content_te?: string;
  type: 'intro' | 'body' | 'quote' | 'list' | 'conclusion';
}

// ===== CONTENT TEMPLATES =====

const CONTENT_TEMPLATES = {
  news: {
    sections: ['hook', 'main_story', 'context', 'reactions', 'conclusion'],
    prompts: {
      hook: 'వార్త సారాంశం ఒక వాక్యంలో - పాఠకులను ఆకర్షించేలా',
      main_story: 'ప్రధాన వార్త వివరాలు - ఏమి జరిగింది, ఎవరు పాల్గొన్నారు',
      context: 'నేపథ్య సమాచారం - ఈ వార్త ఎందుకు ముఖ్యం',
      reactions: 'ప్రజల స్పందనలు, సోషల్ మీడియా వ్యాఖ్యలు',
      conclusion: 'ముగింపు వాక్యం - తదుపరి అంచనాలు',
    },
  },
  review: {
    sections: ['verdict', 'story', 'performances', 'technical', 'final_rating'],
    prompts: {
      verdict: 'సినిమా ఒక వాక్యంలో - చూడాలా వద్దా?',
      story: 'కథ విశ్లేషణ - స్క్రీన్‌ప్లే, డైరెక్షన్',
      performances: 'నటీనటుల పనితీరు - ప్రతి ముఖ్య పాత్ర గురించి',
      technical: 'సాంకేతిక అంశాలు - సంగీతం, ఛాయాగ్రహణం, ఎడిటింగ్',
      final_rating: 'తుది రేటింగ్ - 10కి ఎంత?',
    },
  },
  biography: {
    sections: ['intro', 'early_life', 'career_start', 'achievements', 'legacy'],
    prompts: {
      intro: 'వ్యక్తి పరిచయం - ఎవరు, ఏ రంగంలో ప్రసిద్ధి',
      early_life: 'బాల్యం, కుటుంబం, చదువు',
      career_start: 'వృత్తి ప్రారంభం - మొదటి అవకాశాలు',
      achievements: 'ప్రధాన విజయాలు, అవార్డులు',
      legacy: 'వారసత్వం - ఎందుకు గుర్తుంచుకోవాలి',
    },
  },
  gossip: {
    sections: ['hook', 'rumor', 'sources', 'reactions', 'disclaimer'],
    prompts: {
      hook: 'షాకింగ్ వార్త - ఒక వాక్యంలో',
      rumor: 'వార్త వివరాలు - ఏమి చెప్పబడుతోంది',
      sources: 'సమాచార వనరులు - ఎవరు చెప్పారు',
      reactions: 'అభిమానుల స్పందనలు',
      disclaimer: 'గమనిక - ఇది ధృవీకరించబడలేదు',
    },
  },
  breaking: {
    sections: ['headline', 'details', 'developing'],
    prompts: {
      headline: 'బ్రేకింగ్ న్యూస్ హెడ్‌లైన్',
      details: 'అందుబాటులో ఉన్న వివరాలు',
      developing: 'మరిన్ని వివరాలు కోసం వేచి చూడండి',
    },
  },
};

// ===== MAIN GENERATION FUNCTION =====

export async function generateAdaptiveContent(
  context: ReasoningContext
): Promise<{ plan: ContentPlan; content: GeneratedContent | null }> {
  // Step 1: Get AI reasoning
  const plan = await analyzeBeforeGeneration(context);

  if (!plan.should_proceed) {
    console.log(`[Generator] Skipping: ${plan.rejection_reason}`);
    return { plan, content: null };
  }

  // Step 2: Get template
  const template = CONTENT_TEMPLATES[plan.recommended_format as keyof typeof CONTENT_TEMPLATES] 
    || CONTENT_TEMPLATES.news;

  // Step 3: Get relevant learnings for this type
  const learnings = await getLearningsForGeneration(plan);

  // Step 4: Generate each section
  const sections = await generateSections(context.topic, template, plan, learnings);

  // Step 5: Generate title
  const title = await generateTitle(context.topic, plan, learnings);

  // Step 6: Compile final content
  const content = compileContent(title, sections, plan);

  // Step 7: Store generation record for learning
  await recordGeneration(context, plan, content);

  return { plan, content };
}

// ===== SECTION GENERATION =====

async function generateSections(
  topic: string,
  template: typeof CONTENT_TEMPLATES.news,
  plan: ContentPlan,
  learnings: any[]
): Promise<ContentSection[]> {
  const sections: ContentSection[] = [];
  const groqKey = process.env.GROQ_API_KEY;

  for (const sectionId of template.sections) {
    const prompt = template.prompts[sectionId as keyof typeof template.prompts];
    
    // Build context-aware prompt
    const fullPrompt = buildSectionPrompt(topic, sectionId, prompt, plan, learnings);

    try {
      const content = await generateWithAI(fullPrompt, groqKey);
      
      sections.push({
        id: sectionId,
        title: getSectionTitle(sectionId),
        title_te: getSectionTitleTe(sectionId),
        content: content,
        content_te: content, // Already in Telugu
        type: getSectionType(sectionId),
      });
    } catch (error) {
      console.error(`[Generator] Error generating section ${sectionId}:`, error);
      sections.push({
        id: sectionId,
        title: getSectionTitle(sectionId),
        content: `[${topic} గురించి మరిన్ని వివరాలు త్వరలో...]`,
        type: getSectionType(sectionId),
      });
    }
  }

  return sections;
}

function buildSectionPrompt(
  topic: string,
  sectionId: string,
  basePrompt: string,
  plan: ContentPlan,
  learnings: any[]
): string {
  // Get word count target
  const wordCounts = { short: 50, medium: 100, long: 150 };
  const targetWords = wordCounts[plan.recommended_length] || 100;

  // Find relevant learning
  const sectionLearning = learnings.find(l => 
    l.pattern_description?.includes(sectionId)
  );

  let prompt = `
మీరు TeluguVibes కోసం తెలుగు కంటెంట్ రాయాలి.

టాపిక్: ${topic}
సెక్షన్: ${sectionId}
టోన్: ${plan.recommended_tone}
టార్గెట్ పదాలు: ~${targetWords}

ఆదేశాలు:
${basePrompt}

నియమాలు:
- పూర్తిగా తెలుగులో రాయండి (పేర్లు ఇంగ్లీష్‌లో ఉండవచ్చు)
- సహజంగా, వ్యావహారిక భాషలో
- అభిమానులకు ఆసక్తికరంగా
- ఊహాగానాలు చేయవద్దు
- కచ్చితమైన సమాచారం మాత్రమే
`;

  // Add learning if available
  if (sectionLearning) {
    prompt += `\n\nనేర్చుకున్న విషయం: ${sectionLearning.pattern_description}`;
  }

  // Add tone guidance
  const toneGuides: Record<string, string> = {
    casual: 'స్నేహపూర్వకంగా, సాధారణ సంభాషణ శైలిలో',
    formal: 'వార్తా శైలిలో, వృత్తిపరంగా',
    emotional: 'హృదయస్పర్శిగా, అనుభూతులతో',
    analytical: 'విశ్లేషణాత్మకంగా, వివరంగా',
    humorous: 'హాస్యంగా, తేలికగా',
  };
  prompt += `\n\nటోన్: ${toneGuides[plan.recommended_tone] || toneGuides.casual}`;

  return prompt;
}

async function generateWithAI(prompt: string, apiKey?: string): Promise<string> {
  if (!apiKey) {
    return 'API కీ కాన్ఫిగర్ చేయబడలేదు. దయచేసి మాన్యువల్‌గా కంటెంట్ జోడించండి.';
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'మీరు TeluguVibes కోసం తెలుగు కంటెంట్ రాసే AI రచయిత. పూర్తిగా తెలుగులో, సహజంగా, ఆసక్తికరంగా రాయండి.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'కంటెంట్ జనరేట్ చేయడంలో విఫలం.';
  } catch (error) {
    console.error('[AI] Generation error:', error);
    throw error;
  }
}

// ===== TITLE GENERATION =====

async function generateTitle(
  topic: string,
  plan: ContentPlan,
  learnings: any[]
): Promise<{ en: string; te: string }> {
  // Check if we have high-performing title patterns
  const titleLearning = learnings.find(l => l.learning_type === 'title_pattern');
  
  if (plan.title_suggestions.length > 0) {
    // Use the first AI-generated suggestion
    const teTitle = plan.title_suggestions[0];
    return {
      en: transliterateToEnglish(topic),
      te: teTitle,
    };
  }

  // Generate based on intent
  const titlePatterns: Record<string, (t: string) => string> = {
    gossip: (t) => `${t}: షాకింగ్ వార్త వైరల్!`,
    nostalgia: (t) => `${t}: హృదయాలను గెలుచుకున్న ప్రయాణం`,
    breaking: (t) => `BREAKING: ${t}`,
    info: (t) => `${t}: పూర్తి వివరాలు`,
    entertainment: (t) => `${t}: తాజా అప్‌డేట్`,
    emotion: (t) => `${t}: అభిమానుల కంట తడి`,
  };

  const pattern = titlePatterns[plan.detected_intent] || titlePatterns.entertainment;

  return {
    en: topic,
    te: pattern(topic),
  };
}

// ===== CONTENT COMPILATION =====

function compileContent(
  title: { en: string; te: string },
  sections: ContentSection[],
  plan: ContentPlan
): GeneratedContent {
  // Combine sections into body
  const bodyParts = sections.map(s => {
    if (s.title_te) {
      return `## ${s.title_te}\n\n${s.content}`;
    }
    return s.content;
  });

  const body = bodyParts.join('\n\n');
  const wordCount = body.split(/\s+/).length;

  // Generate excerpt
  const excerpt = sections[0]?.content.slice(0, 200) + '...' || '';

  return {
    title: title.en,
    title_te: title.te,
    body: body,
    body_te: body,
    excerpt: excerpt,
    sections: sections,
    seo: {
      meta_title: `${title.te} | TeluguVibes`,
      meta_description: excerpt.slice(0, 160),
      keywords: plan.seo_keywords,
      schema_type: plan.recommended_format === 'review' ? 'Review' : 'NewsArticle',
    },
    images: {
      primary: '',
      keywords: plan.image_keywords,
      alt_text: title.te,
    },
    metadata: {
      word_count: wordCount,
      reading_time: Math.ceil(wordCount / 200),
      tone: plan.recommended_tone,
      format: plan.recommended_format,
      generated_at: new Date(),
    },
  };
}

// ===== LEARNING INTEGRATION =====

async function getLearningsForGeneration(plan: ContentPlan) {
  const { data } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('is_active', true)
    .or(`learning_type.eq.content_structure,learning_type.eq.title_pattern,learning_type.eq.hook_style`)
    .gte('confidence_score', 0.6)
    .order('confidence_score', { ascending: false })
    .limit(5);

  return data || [];
}

async function recordGeneration(
  context: ReasoningContext,
  plan: ContentPlan,
  content: GeneratedContent
) {
  // Update generation context with outcome
  await supabase
    .from('generation_contexts')
    .update({
      reasoning_json: {
        ...plan,
        generation_completed: true,
        word_count: content.metadata.word_count,
        sections_generated: content.sections.length,
      },
    })
    .eq('recommended_angle', plan.recommended_angle)
    .order('created_at', { ascending: false })
    .limit(1);
}

// ===== HELPER FUNCTIONS =====

function getSectionTitle(id: string): string {
  const titles: Record<string, string> = {
    hook: 'Introduction',
    main_story: 'The Story',
    context: 'Background',
    reactions: 'Reactions',
    conclusion: 'Conclusion',
    verdict: 'Verdict',
    story: 'Story Analysis',
    performances: 'Performances',
    technical: 'Technical Aspects',
    final_rating: 'Final Rating',
    intro: 'Introduction',
    early_life: 'Early Life',
    career_start: 'Career Start',
    achievements: 'Achievements',
    legacy: 'Legacy',
    rumor: 'The Rumor',
    sources: 'Sources',
    disclaimer: 'Disclaimer',
    headline: 'Breaking',
    details: 'Details',
    developing: 'Developing',
  };
  return titles[id] || id;
}

function getSectionTitleTe(id: string): string {
  const titles: Record<string, string> = {
    hook: 'ముఖ్యాంశం',
    main_story: 'ప్రధాన వార్త',
    context: 'నేపథ్యం',
    reactions: 'స్పందనలు',
    conclusion: 'ముగింపు',
    verdict: 'తీర్పు',
    story: 'కథ విశ్లేషణ',
    performances: 'నటన',
    technical: 'సాంకేతికం',
    final_rating: 'తుది రేటింగ్',
    intro: 'పరిచయం',
    early_life: 'బాల్యం',
    career_start: 'వృత్తి ప్రారంభం',
    achievements: 'విజయాలు',
    legacy: 'వారసత్వం',
    rumor: 'వార్త',
    sources: 'వనరులు',
    disclaimer: 'గమనిక',
    headline: 'బ్రేకింగ్',
    details: 'వివరాలు',
    developing: 'అభివృద్ధి చెందుతోంది',
  };
  return titles[id] || id;
}

function getSectionType(id: string): ContentSection['type'] {
  const types: Record<string, ContentSection['type']> = {
    hook: 'intro',
    intro: 'intro',
    headline: 'intro',
    conclusion: 'conclusion',
    final_rating: 'conclusion',
    legacy: 'conclusion',
    disclaimer: 'conclusion',
    reactions: 'quote',
    sources: 'quote',
  };
  return types[id] || 'body';
}

function transliterateToEnglish(teluguText: string): string {
  // Simple transliteration - in production, use a proper library
  return teluguText.replace(/[^\x00-\x7F]/g, '').trim() || teluguText;
}

// ===== AUTO-LEARNING FEEDBACK =====

export async function recordContentPerformance(
  postId: string,
  metrics: {
    views: number;
    engagement: number;
    timeOnPage: number;
    scrollDepth: number;
    shares: number;
  }
): Promise<void> {
  // Calculate overall performance
  const performance = 
    (Math.min(metrics.views, 10000) / 100) * 0.25 +
    metrics.engagement * 0.25 +
    (metrics.timeOnPage / 300) * 0.2 +
    metrics.scrollDepth * 0.2 +
    (metrics.shares * 10) * 0.1;

  // Update performance record
  await supabase
    .from('content_performance')
    .upsert({
      post_id: postId,
      views: metrics.views,
      engagement_score: metrics.engagement,
      avg_time_on_page: metrics.timeOnPage,
      scroll_depth_avg: metrics.scrollDepth,
      shares: metrics.shares,
      overall_performance: Math.min(100, performance),
      updated_at: new Date().toISOString(),
    });

  // If high performance, extract learnings
  if (performance > 70) {
    await extractLearningsFromSuccess(postId, metrics);
  }

  // If low performance, record what to avoid
  if (performance < 30) {
    await extractLearningsFromFailure(postId, metrics);
  }
}

async function extractLearningsFromSuccess(postId: string, metrics: any) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return;

  // Record successful patterns
  await supabase.from('ai_learnings').insert({
    learning_type: 'content_structure',
    category: post.category,
    pattern_description: `High-performing ${post.category} content: ${post.title.slice(0, 50)}`,
    success_indicators: {
      views: metrics.views,
      engagement: metrics.engagement,
      time_on_page: metrics.timeOnPage,
    },
    positive_examples: [postId],
    confidence_score: 0.6,
    sample_size: 1,
    is_active: true,
  });
}

async function extractLearningsFromFailure(postId: string, metrics: any) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return;

  // Record patterns to avoid
  await supabase.from('ai_learnings').insert({
    learning_type: 'content_structure',
    category: post.category,
    pattern_description: `Avoid: ${post.category} content like: ${post.title.slice(0, 50)}`,
    failure_indicators: {
      views: metrics.views,
      engagement: metrics.engagement,
      time_on_page: metrics.timeOnPage,
    },
    negative_examples: [postId],
    confidence_score: 0.5,
    sample_size: 1,
    is_active: true,
  });
}

