/**
 * AI Glam Caption & Analysis Engine
 * 
 * Generates glamour-style captions and analyzes content for the Hot section.
 * CRITICAL: Never generates explicit content - focuses on style, confidence, elegance.
 */

import Groq from 'groq-sdk';
import type {
  CaptionVariant,
  GlamCategory,
  AudienceEmotion,
  GlamAngle,
  AIGlamAnalysis,
  SafetyValidation,
  GLAM_CATEGORIES,
} from '@/types/media';
import { checkContentSafety, type SafetyCheckInput } from './safety-checker';

// Create a wrapper for consistency with the old API
function validateSafety(
  title: string,
  caption?: string,
  authorName?: string,
  tags?: string[]
): ReturnType<typeof checkContentSafety> {
  const input: SafetyCheckInput = {
    text: `${title} ${caption || ''} ${(tags || []).join(' ')}`,
    entityName: authorName,
    isEmbed: false,
  };
  const result = checkContentSafety(input);
  
  // Map the result to include isBlocked and blockReason for compatibility
  return {
    ...result,
    isBlocked: result.risk === 'blocked',
    blockReason: result.blockedReason,
    isApproved: result.autoApproveEligible,
  };
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Caption style templates
const CAPTION_STYLES = {
  glam: {
    prefixes: ['Stunning', 'Gorgeous', 'Radiant', 'Dazzling', 'Glamorous'],
    emojis: ['✨', '💫', '🌟', '💎', '👑'],
  },
  fashion: {
    prefixes: ['Chic', 'Stylish', 'Trendy', 'Fashion-forward', 'Iconic'],
    emojis: ['👗', '👠', '💅', '🎀', '✨'],
  },
  viral: {
    prefixes: ['Trending', 'Viral', 'Breaking the internet', 'Everyone talking about', 'Must-see'],
    emojis: ['🔥', '💥', '📈', '⚡', '🚀'],
  },
  bold: {
    prefixes: ['Bold', 'Fierce', 'Confident', 'Powerful', 'Unstoppable'],
    emojis: ['🔥', '💪', '⚡', '🖤', '💋'],
  },
  elegant: {
    prefixes: ['Elegant', 'Graceful', 'Timeless', 'Sophisticated', 'Classic'],
    emojis: ['🌹', '🦋', '🌸', '💐', '🕊️'],
  },
};

// Category detection keywords
const CATEGORY_KEYWORDS: Record<GlamCategory, string[]> = {
  beach_bikini: ['beach', 'bikini', 'swimwear', 'pool', 'vacation', 'maldives', 'water', 'sun'],
  photoshoot_glam: ['photoshoot', 'studio', 'shoot', 'pose', 'camera', 'lens', 'clicks'],
  fashion_event: ['fashion', 'show', 'ramp', 'walk', 'designer', 'launch', 'collection'],
  magazine_cover: ['magazine', 'cover', 'editorial', 'vogue', 'elle', 'femina', 'grazia'],
  viral_reel: ['reel', 'viral', 'trending', 'dance', 'challenge', 'short', 'tiktok'],
  red_carpet: ['red carpet', 'premiere', 'award', 'ceremony', 'gala', 'event'],
  gym_fitness: ['gym', 'fitness', 'workout', 'training', 'yoga', 'pilates', 'exercise'],
  traditional_glam: ['saree', 'traditional', 'ethnic', 'indian', 'lehenga', 'anarkali', 'festive'],
  western_glam: ['western', 'gown', 'dress', 'outfit', 'style', 'look', 'ootd'],
  influencer: ['influencer', 'lifestyle', 'daily', 'routine', 'vlog', 'haul'],
};

// Emotion detection keywords
const EMOTION_KEYWORDS: Record<AudienceEmotion, string[]> = {
  excitement: ['new', 'latest', 'upcoming', 'reveal', 'exclusive', 'first look'],
  admiration: ['beautiful', 'gorgeous', 'stunning', 'amazing', 'incredible'],
  nostalgia: ['throwback', 'memories', 'classic', 'remember', 'iconic', 'golden'],
  curiosity: ['secret', 'unknown', 'mystery', 'behind', 'story', 'truth'],
  bold: ['bold', 'daring', 'fierce', 'brave', 'confident', 'powerful'],
};

/**
 * Generate AI-powered glam captions
 */
export async function generateGlamCaptions(
  title: string,
  authorName: string,
  platform: string,
  existingCaption?: string
): Promise<CaptionVariant[]> {
  const prompt = `You are a fashion/glamour caption writer for a Telugu entertainment portal.
Generate exactly 3 SHORT captions (max 80 characters each) for this content.

STRICT RULES:
- Focus on style, confidence, elegance, boldness
- NO sexual descriptions or innuendo
- NO body part mentions
- Use Telugu-English mix where natural
- Each caption MUST include 1-2 relevant emojis
- Keep it classy and admiring

Content: "${title}" by ${authorName} on ${platform}
${existingCaption ? `Original caption hint: ${existingCaption.slice(0, 100)}` : ''}

Respond in this exact JSON format:
{
  "captions": [
    {"text": "caption1", "style": "glam", "emoji": "✨"},
    {"text": "caption2", "style": "fashion", "emoji": "👗"},
    {"text": "caption3", "style": "bold", "emoji": "🔥"}
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No AI response');

    const parsed = JSON.parse(response);
    
    return parsed.captions.map((cap: any, index: number) => ({
      text: cap.text.slice(0, 100), // Enforce max length
      style: cap.style || ['glam', 'fashion', 'bold'][index],
      emoji: cap.emoji || '✨',
      confidence: 0.85 - (index * 0.1), // First caption highest confidence
    }));
  } catch (error) {
    console.error('AI caption generation failed:', error);
    // Fallback to template-based captions
    return generateFallbackCaptions(title, authorName);
  }
}

/**
 * Fallback caption generation (no AI)
 */
function generateFallbackCaptions(title: string, authorName: string): CaptionVariant[] {
  const styles: Array<keyof typeof CAPTION_STYLES> = ['glam', 'fashion', 'bold'];
  
  return styles.map((style, index) => {
    const styleData = CAPTION_STYLES[style];
    const prefix = styleData.prefixes[Math.floor(Math.random() * styleData.prefixes.length)];
    const emoji = styleData.emojis[Math.floor(Math.random() * styleData.emojis.length)];
    
    return {
      text: `${emoji} ${prefix}! ${authorName}'s latest look is absolutely stunning ${emoji}`,
      style,
      emoji,
      confidence: 0.6 - (index * 0.1),
    };
  });
}

/**
 * Detect glam category from content
 */
export function detectGlamCategory(
  title: string,
  caption?: string,
  tags?: string[]
): GlamCategory {
  const text = `${title} ${caption || ''} ${(tags || []).join(' ')}`.toLowerCase();
  
  let bestMatch: GlamCategory = 'photoshoot_glam';
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category as GlamCategory;
    }
  }
  
  return bestMatch;
}

/**
 * Detect audience emotion
 */
export function detectAudienceEmotion(
  title: string,
  caption?: string
): AudienceEmotion {
  const text = `${title} ${caption || ''}`.toLowerCase();
  
  let bestMatch: AudienceEmotion = 'admiration';
  let bestScore = 0;
  
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = emotion as AudienceEmotion;
    }
  }
  
  return bestMatch;
}

/**
 * Determine glam angle
 */
export function determineGlamAngle(
  category: GlamCategory,
  emotion: AudienceEmotion
): GlamAngle {
  // Map category + emotion to angle
  if (category === 'viral_reel') return 'viral';
  if (category === 'fashion_event' || category === 'magazine_cover') return 'fashion';
  if (category === 'traditional_glam') return 'elegant';
  if (emotion === 'bold') return 'bold';
  if (emotion === 'nostalgia') return 'classic';
  return 'glam';
}

/**
 * Generate suggested tags
 */
export function generateSuggestedTags(
  title: string,
  authorName: string,
  category: GlamCategory
): string[] {
  const baseTags = ['hot', 'glamour', 'telugu'];
  
  // Add author as tag
  if (authorName) {
    baseTags.push(authorName.toLowerCase().replace(/\s+/g, ''));
  }
  
  // Add category-specific tags
  const categoryTags: Record<GlamCategory, string[]> = {
    beach_bikini: ['beach', 'bikini', 'vacation', 'summer'],
    photoshoot_glam: ['photoshoot', 'studio', 'fashion'],
    fashion_event: ['fashion', 'event', 'style'],
    magazine_cover: ['magazine', 'cover', 'editorial'],
    viral_reel: ['viral', 'trending', 'reel'],
    red_carpet: ['redcarpet', 'premiere', 'award'],
    gym_fitness: ['fitness', 'gym', 'workout'],
    traditional_glam: ['saree', 'traditional', 'indian'],
    western_glam: ['western', 'fashion', 'style'],
    influencer: ['influencer', 'lifestyle', 'trending'],
  };
  
  return [...baseTags, ...(categoryTags[category] || [])].slice(0, 8);
}

/**
 * Main analysis function - combines all AI features
 */
export async function analyzeGlamContent(
  title: string,
  authorName: string,
  platform: string,
  existingCaption?: string,
  tags?: string[]
): Promise<AIGlamAnalysis> {
  // Generate captions (async)
  const captions = await generateGlamCaptions(title, authorName, platform, existingCaption);
  
  // Detect category
  const suggestedCategory = detectGlamCategory(title, existingCaption, tags);
  
  // Detect emotion
  const audienceEmotion = detectAudienceEmotion(title, existingCaption);
  
  // Determine angle
  const glamAngle = determineGlamAngle(suggestedCategory, audienceEmotion);
  
  // Generate tags
  const suggestedTags = generateSuggestedTags(title, authorName, suggestedCategory);
  
  // Safety validation
  const safety = validateSafety(title, existingCaption, authorName, tags);
  
  // Calculate overall confidence
  const confidence = captions.length > 0
    ? (captions[0].confidence + (safety.autoApproveEligible ? 0.2 : 0)) * 100
    : 50;
  
  return {
    captions,
    suggestedCategory,
    suggestedTags,
    audienceEmotion,
    glamAngle,
    safety,
    confidence: Math.min(100, Math.round(confidence)),
  };
}

/**
 * Quick analysis without AI (for preview)
 */
export function quickAnalyze(
  title: string,
  authorName: string,
  existingCaption?: string,
  tags?: string[]
): Omit<AIGlamAnalysis, 'captions'> & { captions: null } {
  const suggestedCategory = detectGlamCategory(title, existingCaption, tags);
  const audienceEmotion = detectAudienceEmotion(title, existingCaption);
  const glamAngle = determineGlamAngle(suggestedCategory, audienceEmotion);
  const suggestedTags = generateSuggestedTags(title, authorName, suggestedCategory);
  const safety = validateSafety(title, existingCaption, authorName, tags);
  
  return {
    captions: null,
    suggestedCategory,
    suggestedTags,
    audienceEmotion,
    glamAngle,
    safety,
    confidence: safety.autoApproveEligible ? 75 : 50,
  };
}

