/**
 * Telugu Emotion Validation Module
 * 
 * Analyzes Telugu content for emotional resonance with audiences:
 * - Nostalgia (classic movie references, decade mentions)
 * - Pride (achievements, regional pride)
 * - Excitement (upcoming releases, trends)
 * - Cultural Connection (festivals, traditions)
 */

// Types
export interface TeluguEmotionScore {
  score: number; // 0-100 overall score
  emotions: {
    nostalgia: number;      // 0-100
    pride: number;          // 0-100
    excitement: number;     // 0-100
    cultural_connection: number; // 0-100
  };
  hasRegionalFlavor: boolean;
  detectedPatterns: EmotionPattern[];
  suggestions: string[];
}

export interface EmotionPattern {
  type: 'nostalgia' | 'pride' | 'excitement' | 'cultural' | 'fan_sentiment';
  keyword: string;
  confidence: number;
  context?: string;
}

// Telugu Emotion Keywords
const EMOTION_KEYWORDS = {
  nostalgia: {
    keywords: [
      // Decade references
      '80s', '90s', '2000s', 'క్లాసిక్', 'గోల్డెన్', 'నాటి', 'పాత',
      // Classic movie references
      'మయూరి', 'శివ', 'ఘటోత్కచ', 'జగదేక వీరుడు', 'బొబ్బిలి రాజా',
      // Nostalgia words
      'గుర్తున్నాయా', 'ఆ రోజులు', 'మరిచిపోలేం', 'ఎవర్‌గ్రీన్', 'థ్రోబ్యాక్',
      'memorabilia', 'throwback', 'vintage', 'classic', 'retro',
    ],
    weight: 25,
  },
  pride: {
    keywords: [
      // Achievement words
      'గర్వంగా', 'అవార్డ్', 'విజయం', 'రికార్డ్', 'చరిత్ర', 'మైల్‌స్టోన్',
      // Regional pride
      'తెలుగు గర్వం', 'టాలీవుడ్ ప్రైడ్', 'మన హీరోయిన్', 'తెలుగు బిడ్డ',
      // Pan-India
      'పాన్ ఇండియా', 'నేషనల్', 'ఇంటర్నేషనల్', 'హాలీవుడ్',
      'award', 'record', 'milestone', 'achievement', 'proud',
    ],
    weight: 25,
  },
  excitement: {
    keywords: [
      // Upcoming/New
      'కొత్త', 'లేటెస్ట్', 'అప్‌కమింగ్', 'ఫస్ట్ లుక్', 'టీజర్', 'ట్రైలర్',
      // Trending
      'ట్రెండింగ్', 'వైరల్', 'బ్రేకింగ్', 'ఎక్స్‌క్లూసివ్', 'హాట్',
      // Excitement words
      'సంచలనం', 'భారీ', 'మెగా', 'బిగ్', 'షాకింగ్', 'సర్‌ప్రైజ్',
      'trending', 'viral', 'breaking', 'exclusive', 'hot', 'new',
    ],
    weight: 30,
  },
  cultural: {
    keywords: [
      // Festivals
      'దసరా', 'దీపావళి', 'సంక్రాంతి', 'ఉగాది', 'బతుకమ్మ', 'బొనాలు',
      // Traditional
      'సాంప్రదాయ', 'పట్టు', 'చీర', 'లెహంగా', 'ఎథ్నిక్', 'దేశీ',
      // Wedding/Celebrations
      'పెళ్ళి', 'వేడుక', 'సంబరాలు', 'పండుగ', 'ఉత్సవం',
      // Cultural terms
      'నాట్యం', 'కూచిపూడి', 'భరతనాట్యం', 'శాస్త్రీయం',
      'festival', 'traditional', 'wedding', 'celebration',
    ],
    weight: 20,
  },
};

// Fan sentiment patterns
const FAN_SENTIMENT_PATTERNS = [
  // Fan addresses
  /అభిమానులు|ఫ్యాన్స్|అభిమానం|ఫ్యాన్ ఫాలోయింగ్/,
  // Expressions
  /హ్యాట్స్ ఆఫ్|క్వీన్|దివా|స్టార్|ఐకాన్|లెజెండ్/,
  // Fan clubs
  /అర్మీ|ఫ్యాన్ క్లబ్|ఫాలోవర్స్/,
];

// Regional flavor indicators
const REGIONAL_INDICATORS = [
  // Telugu script presence
  /[\u0C00-\u0C7F]{3,}/,
  // Telugu movie references
  /తొలి|మొదటి|లేటెస్ట్|కొత్త సినిమా/,
  // Telugu phrases
  /మన అందాల|తెలుగింట|తెలుగు తల్లి|తెలుగు వారి/,
  // Slang/Colloquial
  /బాగా|చాలా|మస్త్|సూపర్బ్|అదిరింది|దుమ్ము/,
];

/**
 * Calculate individual emotion score
 */
function calculateEmotionScore(
  text: string,
  keywords: string[],
  weight: number
): { score: number; patterns: EmotionPattern[]; type: string } {
  const lowerText = text.toLowerCase();
  const patterns: EmotionPattern[] = [];
  let matchCount = 0;
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      matchCount++;
      patterns.push({
        type: 'cultural',
        keyword,
        confidence: 80 + Math.random() * 20,
      });
    }
  }
  
  // Score based on matches (max 5 matches for full score)
  const rawScore = Math.min(5, matchCount) / 5;
  const weightedScore = rawScore * weight;
  
  return {
    score: Math.round(weightedScore * 4), // Scale to 0-100
    patterns,
    type: 'emotion',
  };
}

/**
 * Check for fan sentiment patterns
 */
function checkFanSentiment(text: string): EmotionPattern[] {
  const patterns: EmotionPattern[] = [];
  
  for (const pattern of FAN_SENTIMENT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        patterns.push({
          type: 'fan_sentiment',
          keyword: match,
          confidence: 85,
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Check for regional flavor
 */
function hasRegionalFlavor(text: string): boolean {
  for (const pattern of REGIONAL_INDICATORS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Main function: Calculate Telugu emotion score
 */
export function calculateTeluguEmotionScore(text: string): TeluguEmotionScore {
  const allPatterns: EmotionPattern[] = [];
  
  // Calculate individual emotion scores
  const nostalgiaResult = calculateEmotionScore(
    text,
    EMOTION_KEYWORDS.nostalgia.keywords,
    EMOTION_KEYWORDS.nostalgia.weight
  );
  
  const prideResult = calculateEmotionScore(
    text,
    EMOTION_KEYWORDS.pride.keywords,
    EMOTION_KEYWORDS.pride.weight
  );
  
  const excitementResult = calculateEmotionScore(
    text,
    EMOTION_KEYWORDS.excitement.keywords,
    EMOTION_KEYWORDS.excitement.weight
  );
  
  const culturalResult = calculateEmotionScore(
    text,
    EMOTION_KEYWORDS.cultural.keywords,
    EMOTION_KEYWORDS.cultural.weight
  );
  
  // Add patterns
  allPatterns.push(
    ...nostalgiaResult.patterns.map(p => ({ ...p, type: 'nostalgia' as const })),
    ...prideResult.patterns.map(p => ({ ...p, type: 'pride' as const })),
    ...excitementResult.patterns.map(p => ({ ...p, type: 'excitement' as const })),
    ...culturalResult.patterns.map(p => ({ ...p, type: 'cultural' as const }))
  );
  
  // Check fan sentiment
  const fanPatterns = checkFanSentiment(text);
  allPatterns.push(...fanPatterns);
  
  // Check regional flavor
  const regionalFlavor = hasRegionalFlavor(text);
  
  // Calculate overall score
  const emotions = {
    nostalgia: nostalgiaResult.score,
    pride: prideResult.score,
    excitement: excitementResult.score,
    cultural_connection: culturalResult.score,
  };
  
  // Overall score is weighted average
  let overallScore = (
    emotions.nostalgia * 0.2 +
    emotions.pride * 0.2 +
    emotions.excitement * 0.35 +
    emotions.cultural_connection * 0.25
  );
  
  // Bonus for regional flavor
  if (regionalFlavor) {
    overallScore = Math.min(100, overallScore + 10);
  }
  
  // Bonus for fan sentiment
  if (fanPatterns.length > 0) {
    overallScore = Math.min(100, overallScore + 5 * fanPatterns.length);
  }
  
  // Generate suggestions
  const suggestions: string[] = [];
  
  if (emotions.nostalgia < 20) {
    suggestions.push('Add nostalgic references (classic movies, throwback moments)');
  }
  
  if (emotions.pride < 20) {
    suggestions.push('Include achievement mentions or regional pride elements');
  }
  
  if (emotions.excitement < 30) {
    suggestions.push('Add trending or exclusive angle to increase excitement');
  }
  
  if (emotions.cultural_connection < 20) {
    suggestions.push('Consider adding cultural or traditional elements');
  }
  
  if (!regionalFlavor) {
    suggestions.push('Add Telugu phrases or regional expressions for authenticity');
  }
  
  return {
    score: Math.round(overallScore),
    emotions,
    hasRegionalFlavor: regionalFlavor,
    detectedPatterns: allPatterns,
    suggestions,
  };
}

/**
 * Quick emotion check (for batch processing)
 */
export function quickEmotionCheck(text: string): {
  score: number;
  hasEmotion: boolean;
  dominantEmotion: string;
} {
  const result = calculateTeluguEmotionScore(text);
  
  // Find dominant emotion
  const emotions = Object.entries(result.emotions);
  emotions.sort((a, b) => b[1] - a[1]);
  
  return {
    score: result.score,
    hasEmotion: result.score >= 30,
    dominantEmotion: emotions[0][0],
  };
}

/**
 * Enhance content with emotion triggers
 */
export function suggestEmotionEnhancements(
  content: string,
  targetEmotion?: 'nostalgia' | 'pride' | 'excitement' | 'cultural'
): string[] {
  const enhancements: string[] = [];
  const target = targetEmotion || 'excitement';
  
  const emotionPhrases = {
    nostalgia: [
      'గుర్తున్నాయా ఆ రోజులు... 🌟',
      'క్లాసిక్ బ్యూటీ ✨',
      'ఎవర్‌గ్రీన్ అందం 💫',
    ],
    pride: [
      'తెలుగు గర్వం! 🏆',
      'మన స్టార్ - ప్రపంచ వేదికపై! 🌍',
      'టాలీవుడ్ ప్రైడ్ ✨',
    ],
    excitement: [
      'ట్రెండింగ్ ఇప్పుడే! 🔥',
      'వైరల్ అవుతోంది! 💥',
      'మిస్ కావద్దు! ⚡',
    ],
    cultural: [
      'సాంప్రదాయ అందం 🪷',
      'ఎథ్నిక్ క్వీన్ 👑',
      'దేశీ వైబ్స్ 🌺',
    ],
  };
  
  const phrases = emotionPhrases[target];
  enhancements.push(...phrases);
  
  return enhancements;
}

// Export emotion keywords for other modules
export { EMOTION_KEYWORDS, FAN_SENTIMENT_PATTERNS, REGIONAL_INDICATORS };






