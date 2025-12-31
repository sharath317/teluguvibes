// AI Caption Generator for Hot Media
// Generates glamour-focused captions with safety rules

import type { CaptionVariant, GlamCategory, AudienceEmotion, GlamAngle, AIGlamAnalysis } from '@/types/media';
import { checkContentSafety, checkEntitySafety } from './safety-checker';

// Caption style templates by category
const CAPTION_TEMPLATES: Record<GlamCategory, string[]> = {
  beach_bikini: [
    '{name} స్టన్నింగ్ బీచ్ లుక్‌లో 🏖️ #BeachVibes #GlamourQueen',
    '{name} సన్‌కిస్డ్ గ్లో తో అద్భుతంగా కనిపిస్తున్నారు ☀️ #VacationMode',
    '{name} బీచ్ ఫ్యాషన్‌లో కిల్లింగ్ ఇట్ 🌊 #BeachBabe #SummerVibes',
  ],
  photoshoot_glam: [
    '{name} లేటెస్ట్ ఫోటోషూట్ నుండి స్టన్నింగ్ క్లిక్స్ 📸 #Photoshoot #GlamourAlert',
    '{name} క్యామెరా ముందు మ్యాజిక్ చేశారు ✨ #BTS #PhotoshootDiaries',
    '{name} ఈ ఫోటోషూట్‌లో అద్భుతంగా కనిపిస్తున్నారు 💫 #GlamourGoals',
  ],
  fashion_event: [
    '{name} ఫ్యాషన్ ఈవెంట్‌లో స్టైలిష్‌గా 👗 #FashionIcon #EventDiaries',
    '{name} ఈ ఈవెంట్‌లో టర్నింగ్ హెడ్స్ 🔥 #RedCarpet #FashionGoals',
    '{name} స్టైల్ స్టేట్‌మెంట్ మేకింగ్ 💃 #FashionWeek #Glamour',
  ],
  magazine_cover: [
    '{name} మ్యాగజైన్ కవర్‌పై స్టన్నింగ్‌గా 📰 #CoverGirl #MagazineShoot',
    '{name} ఈ ఎడిటోరియల్ షూట్‌లో అద్భుతం ✨ #Editorial #GlamourIcon',
    '{name} మ్యాగజైన్ కవర్ షూట్ వైరల్ 🔥 #MagazineCover #IconicShoot',
  ],
  viral_reel: [
    '{name} వైరల్ రీల్ ఇంటర్నెట్ దద్దరిల్లిస్తోంది 🎬 #ViralReel #Trending',
    '{name} ఈ రీల్ మిస్ అవ్వకండి! 📱 #ReelsFire #ViralContent',
    '{name} సోషల్ మీడియాలో ట్రెండింగ్ 🌟 #Viral #MustWatch',
  ],
  red_carpet: [
    '{name} రెడ్ కార్పెట్ మీద స్టన్నింగ్ ఎంట్రీ 👗✨ #RedCarpet #Glamour',
    '{name} ఈ ఈవెంట్‌లో షోస్టాపర్ 🌟 #Premiere #CelebrityStyle',
    '{name} రెడ్ కార్పెట్ లుక్ అద్భుతం 💫 #AwardShow #FashionIcon',
  ],
  gym_fitness: [
    '{name} ఫిట్‌నెస్ గోల్స్ సెట్ చేస్తున్నారు 💪 #FitnessMotivation #GymLife',
    '{name} వర్కౌట్ మోడ్‌లో 🔥 #FitFam #HealthyLifestyle',
    '{name} ఫిట్‌నెస్ జర్నీ ఇన్స్పైరింగ్ 🏋️ #GymGoals #FitAndFab',
  ],
  traditional_glam: [
    '{name} సాంప్రదాయ చీరలో అందంగా 🪷 #SareeGoals #TraditionalBeauty',
    '{name} ఎథ్నిక్ లుక్‌లో స్టన్నింగ్ 🌺 #IndianWear #ElegantLook',
    '{name} ట్రెడిషనల్ ఔట్‌ఫిట్‌లో గ్రేస్‌ఫుల్ 💫 #DesiGlam #ClassicBeauty',
  ],
  western_glam: [
    '{name} వెస్టర్న్ లుక్‌లో స్లేయింగ్ 👠 #WesternStyle #FashionForward',
    '{name} స్టైలిష్ వెస్టర్న్ ఔట్‌ఫిట్‌లో 🔥 #OOTD #StyleIcon',
    '{name} వెస్టర్న్ గ్లామ్ అవతార్‌లో 💃 #ChicStyle #FashionGoals',
  ],
  influencer: [
    '{name} ఇన్‌ఫ్లుయెన్సర్ గేమ్ స్ట్రాంగ్ 🌟 #Influencer #ContentCreator',
    '{name} సోషల్ మీడియా సెన్సేషన్ 📱 #Trending #ViralStar',
    '{name} ఇన్‌ఫ్లుయెన్సర్ లైఫ్ 💫 #DigitalStar #SocialMedia',
  ],
};

// Glam adjectives for AI variation
const GLAM_ADJECTIVES = [
  'stunning', 'gorgeous', 'elegant', 'beautiful', 'glamorous',
  'radiant', 'dazzling', 'breathtaking', 'captivating', 'mesmerizing',
];

// Emoji sets by mood
const MOOD_EMOJIS: Record<AudienceEmotion, string[]> = {
  excitement: ['🔥', '⚡', '💥', '🎉', '✨'],
  admiration: ['😍', '💕', '🌟', '💫', '👏'],
  nostalgia: ['💭', '🕰️', '📸', '🎬', '💝'],
  curiosity: ['👀', '🤔', '✨', '🔍', '💡'],
  bold: ['💪', '🔥', '👊', '💣', '⚡'],
};

/**
 * Detect audience emotion from content context
 */
function detectAudienceEmotion(text: string, category: GlamCategory): AudienceEmotion {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('throwback') || lowerText.includes('old') || lowerText.includes('memory')) {
    return 'nostalgia';
  }
  if (lowerText.includes('viral') || lowerText.includes('trending') || lowerText.includes('new')) {
    return 'excitement';
  }
  if (lowerText.includes('bold') || lowerText.includes('hot') || lowerText.includes('fire')) {
    return 'bold';
  }
  if (lowerText.includes('beautiful') || lowerText.includes('gorgeous') || lowerText.includes('stunning')) {
    return 'admiration';
  }
  
  // Default by category
  const categoryEmotions: Record<GlamCategory, AudienceEmotion> = {
    beach_bikini: 'excitement',
    photoshoot_glam: 'admiration',
    fashion_event: 'admiration',
    magazine_cover: 'admiration',
    viral_reel: 'excitement',
    red_carpet: 'admiration',
    gym_fitness: 'bold',
    traditional_glam: 'admiration',
    western_glam: 'excitement',
    influencer: 'curiosity',
  };
  
  return categoryEmotions[category] || 'admiration';
}

/**
 * Detect glam angle from content
 */
function detectGlamAngle(text: string, category: GlamCategory): GlamAngle {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('fashion') || lowerText.includes('style') || lowerText.includes('outfit')) {
    return 'fashion';
  }
  if (lowerText.includes('viral') || lowerText.includes('trending')) {
    return 'viral';
  }
  if (lowerText.includes('bold') || lowerText.includes('hot') || lowerText.includes('fire')) {
    return 'bold';
  }
  if (lowerText.includes('elegant') || lowerText.includes('grace') || lowerText.includes('classic')) {
    return 'elegant';
  }
  if (lowerText.includes('throwback') || lowerText.includes('classic') || lowerText.includes('old')) {
    return 'classic';
  }
  
  return 'glam';
}

/**
 * Suggest category from content/title
 */
export function suggestCategory(text: string): GlamCategory {
  const lowerText = text.toLowerCase();
  
  const categoryKeywords: Record<GlamCategory, string[]> = {
    beach_bikini: ['beach', 'bikini', 'swimwear', 'pool', 'vacation', 'maldives', 'goa'],
    photoshoot_glam: ['photoshoot', 'shoot', 'bts', 'behind the scenes', 'camera'],
    fashion_event: ['fashion', 'event', 'launch', 'opening', 'inauguration'],
    magazine_cover: ['magazine', 'cover', 'editorial', 'vogue', 'elle', 'cosmopolitan'],
    viral_reel: ['reel', 'viral', 'shorts', 'tiktok', 'trending video'],
    red_carpet: ['red carpet', 'premiere', 'award', 'gala', 'ceremony'],
    gym_fitness: ['gym', 'fitness', 'workout', 'exercise', 'yoga', 'pilates'],
    traditional_glam: ['saree', 'traditional', 'ethnic', 'lehenga', 'festival', 'wedding'],
    western_glam: ['western', 'dress', 'gown', 'casual', 'street style'],
    influencer: ['influencer', 'content', 'social media', 'instagram'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category as GlamCategory;
    }
  }
  
  return 'photoshoot_glam'; // Default
}

/**
 * Suggest tags from content
 */
export function suggestTags(text: string, category: GlamCategory, entityName?: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Entity tag
  if (entityName) {
    tags.push(entityName.replace(/\s+/g, ''));
  }
  
  // Category tag
  tags.push(category.replace('_', ''));
  
  // Common glam tags
  if (lowerText.includes('photo')) tags.push('Photoshoot');
  if (lowerText.includes('video') || lowerText.includes('reel')) tags.push('Video');
  if (lowerText.includes('new') || lowerText.includes('latest')) tags.push('Latest');
  if (lowerText.includes('hot') || lowerText.includes('fire')) tags.push('Hot');
  if (lowerText.includes('trendin')) tags.push('Trending');
  
  // Telugu specific
  tags.push('Telugu');
  tags.push('Tollywood');
  
  return [...new Set(tags)].slice(0, 8);
}

/**
 * Generate caption variants using templates
 */
export function generateCaptionVariants(
  entityName: string,
  category: GlamCategory,
  originalText?: string
): CaptionVariant[] {
  const templates = CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.photoshoot_glam;
  const emotion = detectAudienceEmotion(originalText || '', category);
  const emojis = MOOD_EMOJIS[emotion];
  
  // Generate 3 variants with different styles
  const styles: Array<'glam' | 'fashion' | 'viral' | 'bold' | 'elegant'> = ['glam', 'fashion', 'bold'];
  
  return templates.slice(0, 3).map((template, index) => {
    const text = template.replace('{name}', entityName);
    const style = styles[index] || 'glam';
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return {
      text,
      style,
      emoji,
      confidence: 0.7 + Math.random() * 0.25, // 70-95% confidence
    };
  });
}

/**
 * Full AI analysis for glam content
 */
export async function analyzeGlamContent(input: {
  url?: string;
  text?: string;
  entityName?: string;
  entityType?: string;
  platform?: string;
}): Promise<AIGlamAnalysis> {
  const { text = '', entityName = 'Celebrity', entityType, platform } = input;
  
  // Check entity safety first
  if (entityName) {
    const entityCheck = checkEntitySafety(entityName, entityType);
    if (entityCheck.isBlocked) {
      return {
        captions: [],
        suggestedCategory: 'photoshoot_glam',
        suggestedTags: [],
        audienceEmotion: 'admiration',
        glamAngle: 'glam',
        safety: {
          risk: 'blocked',
          flags: ['entity_blocked'],
          blockedReason: entityCheck.reason,
          requiresReview: false,
          autoApproveEligible: false,
        },
        confidence: 0,
      };
    }
  }
  
  // Detect category
  const suggestedCategory = suggestCategory(text);
  
  // Generate captions
  const captions = generateCaptionVariants(entityName, suggestedCategory, text);
  
  // Suggest tags
  const suggestedTags = suggestTags(text, suggestedCategory, entityName);
  
  // Detect emotion and angle
  const audienceEmotion = detectAudienceEmotion(text, suggestedCategory);
  const glamAngle = detectGlamAngle(text, suggestedCategory);
  
  // Run safety check on generated captions
  const bestCaption = captions[0]?.text || text;
  const safety = checkContentSafety({
    text: bestCaption,
    entityName,
    platform,
    isEmbed: platform === 'instagram' || platform === 'youtube' || platform === 'twitter',
  });
  
  // Calculate overall confidence
  const avgConfidence = captions.reduce((sum, c) => sum + c.confidence, 0) / (captions.length || 1);
  
  return {
    captions,
    suggestedCategory,
    suggestedTags,
    audienceEmotion,
    glamAngle,
    safety,
    confidence: avgConfidence,
  };
}

/**
 * Quick caption generation without full analysis
 */
export function quickGenerateCaption(
  entityName: string,
  category: GlamCategory
): string {
  const templates = CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.photoshoot_glam;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{name}', entityName);
}

