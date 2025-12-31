/**
 * Stage 1: Content Intelligence - Pre-Generation Analysis
 * Analyzes content before AI generation to determine:
 * - Primary entity (celebrity, movie, topic)
 * - Sentiment (positive, neutral, sensitive)
 * - Content risk (low, medium, high)
 * - Writing angle (news, gossip, emotional, nostalgic)
 * - Recommended word count
 */

interface ContentAnalysis {
  primaryEntity: {
    name: string;
    type: 'celebrity' | 'movie' | 'politician' | 'sports_person' | 'brand' | 'event' | 'topic';
    confidence: number;
  };
  sentiment: 'positive' | 'neutral' | 'negative' | 'sensitive';
  contentRisk: 'low' | 'medium' | 'high';
  riskReasons: string[];
  writingAngle: 'news' | 'gossip' | 'emotional' | 'nostalgic' | 'informative' | 'inspirational';
  audienceIntent: 'entertainment' | 'information' | 'emotion' | 'inspiration';
  recommendedWordCount: number;
  recommendedSections: string[];
  keywords: string[];
  relatedTopics: string[];
}

// Risk keywords for content flagging
const RISK_PATTERNS = {
  political: [
    /election/i, /vote/i, /party/i, /minister/i, /government/i,
    /ఎన్నికలు/, /పార్టీ/, /మంత్రి/, /ప్రభుత్వం/,
    /bjp/i, /congress/i, /tdp/i, /ysrcp/i, /brs/i, /trs/i
  ],
  health: [
    /cancer/i, /disease/i, /treatment/i, /cure/i, /medicine/i,
    /క్యాన్సర్/, /వ్యాధి/, /చికిత్స/, /మందు/,
    /doctor/i, /hospital/i, /surgery/i, /covid/i
  ],
  sensitive: [
    /death/i, /suicide/i, /accident/i, /murder/i, /rape/i,
    /మరణం/, /ఆత్మహత్య/, /ప్రమాదం/, /హత్య/,
    /divorce/i, /affair/i, /scandal/i, /arrest/i
  ],
  rumor: [
    /rumor/i, /allegedly/i, /sources say/i, /unconfirmed/i,
    /పుకార్లు/, /వార్తల ప్రకారం/
  ]
};

// Entity detection patterns
const ENTITY_PATTERNS = {
  celebrities: {
    tollywood: ['prabhas', 'ప్రభాస్', 'mahesh babu', 'మహేష్', 'ntr', 'ఎన్టీఆర్', 'allu arjun', 'బన్నీ', 'ram charan', 'రామ్ చరణ్', 'chiranjeevi', 'చిరంజీవి', 'vijay', 'విజయ్', 'samantha', 'సమంత', 'rashmika', 'రష్మిక'],
    bollywood: ['shah rukh', 'షారుఖ్', 'salman', 'సల్మాన్', 'aamir', 'ఆమీర్', 'deepika', 'దీపికా', 'alia', 'ఆలియా', 'ranveer', 'రణ్‌వీర్'],
    cricket: ['kohli', 'కోహ్లీ', 'dhoni', 'ధోని', 'rohit', 'రోహిత్', 'bumrah', 'బుమ్రా']
  },
  politicians: ['modi', 'మోదీ', 'jagan', 'జగన్', 'chandrababu', 'చంద్రబాబు', 'kcr', 'కేసీఆర్', 'revanth', 'రేవంత్'],
  movies: ['pushpa', 'పుష్ప', 'kalki', 'కల్కి', 'salaar', 'సలార్', 'devara', 'దేవర', 'rrr', 'bahubali', 'బాహుబలి']
};

/**
 * Analyze content using AI
 */
export async function analyzeContent(
  title: string,
  content: string,
  category: string
): Promise<ContentAnalysis> {
  const fullText = `${title} ${content}`.toLowerCase();

  // 1. Detect primary entity
  const primaryEntity = detectPrimaryEntity(fullText);

  // 2. Assess content risk
  const { risk, reasons } = assessContentRisk(fullText);

  // 3. Determine sentiment
  const sentiment = detectSentiment(fullText);

  // 4. Determine writing angle
  const writingAngle = determineWritingAngle(category, sentiment, risk);

  // 5. Determine audience intent
  const audienceIntent = determineAudienceIntent(category, writingAngle);

  // 6. Calculate recommended word count
  const recommendedWordCount = calculateWordCount(writingAngle, risk, category);

  // 7. Determine recommended sections
  const recommendedSections = getRecommendedSections(category, writingAngle);

  // 8. Extract keywords
  const keywords = extractKeywords(fullText);

  // 9. Get related topics
  const relatedTopics = getRelatedTopics(primaryEntity, category);

  return {
    primaryEntity,
    sentiment,
    contentRisk: risk,
    riskReasons: reasons,
    writingAngle,
    audienceIntent,
    recommendedWordCount,
    recommendedSections,
    keywords,
    relatedTopics
  };
}

/**
 * Detect primary entity in content
 */
function detectPrimaryEntity(text: string): ContentAnalysis['primaryEntity'] {
  // Check celebrities
  for (const [industry, names] of Object.entries(ENTITY_PATTERNS.celebrities)) {
    for (const name of names) {
      if (text.includes(name.toLowerCase())) {
        return {
          name: name,
          type: 'celebrity',
          confidence: 0.9
        };
      }
    }
  }

  // Check politicians
  for (const name of ENTITY_PATTERNS.politicians) {
    if (text.includes(name.toLowerCase())) {
      return {
        name: name,
        type: 'politician',
        confidence: 0.85
      };
    }
  }

  // Check movies
  for (const name of ENTITY_PATTERNS.movies) {
    if (text.includes(name.toLowerCase())) {
      return {
        name: name,
        type: 'movie',
        confidence: 0.9
      };
    }
  }

  // Default to topic
  return {
    name: 'general',
    type: 'topic',
    confidence: 0.5
  };
}

/**
 * Assess content risk level
 */
function assessContentRisk(text: string): { risk: ContentAnalysis['contentRisk']; reasons: string[] } {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check political content
  if (RISK_PATTERNS.political.some(p => p.test(text))) {
    reasons.push('political_content');
    riskScore += 2;
  }

  // Check health claims
  if (RISK_PATTERNS.health.some(p => p.test(text))) {
    reasons.push('health_claims');
    riskScore += 2;
  }

  // Check sensitive content
  if (RISK_PATTERNS.sensitive.some(p => p.test(text))) {
    reasons.push('sensitive_topic');
    riskScore += 3;
  }

  // Check rumors
  if (RISK_PATTERNS.rumor.some(p => p.test(text))) {
    reasons.push('unverified_claims');
    riskScore += 1;
  }

  if (riskScore >= 4) return { risk: 'high', reasons };
  if (riskScore >= 2) return { risk: 'medium', reasons };
  return { risk: 'low', reasons };
}

/**
 * Detect sentiment of content
 */
function detectSentiment(text: string): ContentAnalysis['sentiment'] {
  const positiveWords = /success|win|happy|celebrate|love|great|amazing|విజయం|ఆనందం|ప్రేమ/i;
  const negativeWords = /fail|loss|sad|angry|hate|terrible|విఫలం|దుఃఖం/i;
  const sensitiveWords = /death|accident|scandal|controversy|మరణం|వివాదం/i;

  if (sensitiveWords.test(text)) return 'sensitive';
  if (negativeWords.test(text)) return 'negative';
  if (positiveWords.test(text)) return 'positive';
  return 'neutral';
}

/**
 * Determine best writing angle
 */
function determineWritingAngle(
  category: string,
  sentiment: string,
  risk: string
): ContentAnalysis['writingAngle'] {
  if (risk === 'high') return 'news'; // Stick to facts for risky content

  switch (category) {
    case 'gossip':
      return sentiment === 'positive' ? 'gossip' : 'news';
    case 'entertainment':
      return sentiment === 'positive' ? 'emotional' : 'informative';
    case 'sports':
      return 'news';
    case 'politics':
      return 'informative';
    case 'trending':
      return 'gossip';
    default:
      return 'informative';
  }
}

/**
 * Determine audience intent
 */
function determineAudienceIntent(
  category: string,
  angle: string
): ContentAnalysis['audienceIntent'] {
  if (angle === 'emotional' || angle === 'nostalgic') return 'emotion';
  if (angle === 'gossip') return 'entertainment';
  if (angle === 'inspirational') return 'inspiration';
  return 'information';
}

/**
 * Calculate recommended word count
 */
function calculateWordCount(angle: string, risk: string, category: string): number {
  // Short viral content
  if (angle === 'gossip' && risk === 'low') return 200;

  // Long evergreen content
  if (category === 'health' || category === 'food') return 500;

  // Standard news
  if (angle === 'news') return 300;

  // Emotional/nostalgic - medium length
  return 350;
}

/**
 * Get recommended article sections based on category and angle
 */
function getRecommendedSections(category: string, angle: string): string[] {
  const baseSections = ['hook', 'context', 'main_story', 'closing'];

  switch (category) {
    case 'entertainment':
    case 'gossip':
      return ['hook', 'context', 'main_story', 'social_buzz', 'filmography', 'closing'];
    case 'sports':
      return ['hook', 'context', 'main_story', 'stats', 'fan_reactions', 'closing'];
    case 'politics':
      return ['hook', 'context', 'main_story', 'background', 'closing'];
    case 'health':
      return ['hook', 'context', 'main_info', 'disclaimer', 'closing'];
    case 'food':
      return ['intro', 'ingredients', 'steps', 'tips', 'closing'];
    default:
      return baseSections;
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const words = text.split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but']);

  return words
    .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .slice(0, 10);
}

/**
 * Get related topics for internal linking
 */
function getRelatedTopics(entity: ContentAnalysis['primaryEntity'], category: string): string[] {
  const related: string[] = [];

  if (entity.type === 'celebrity') {
    related.push(`${entity.name} movies`, `${entity.name} news`, `${entity.name} family`);
  } else if (entity.type === 'movie') {
    related.push(`${entity.name} review`, `${entity.name} box office`, `${entity.name} cast`);
  }

  // Category-based suggestions
  if (category === 'sports') {
    related.push('IPL 2025', 'cricket news', 'match highlights');
  }

  return related.slice(0, 5);
}

/**
 * AI-powered deep analysis using Groq
 */
export async function analyzeContentWithAI(
  title: string,
  content: string,
  category: string
): Promise<ContentAnalysis | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `Analyze this content for Telugu entertainment audiences.

Title: "${title}"
Content: "${content.substring(0, 500)}"
Category: ${category}

Identify and return JSON only:
{
  "primaryEntity": {"name": "entity name", "type": "celebrity|movie|politician|sports_person|topic", "confidence": 0.9},
  "sentiment": "positive|neutral|negative|sensitive",
  "contentRisk": "low|medium|high",
  "riskReasons": ["reason1", "reason2"],
  "writingAngle": "news|gossip|emotional|nostalgic|informative",
  "audienceIntent": "entertainment|information|emotion|inspiration",
  "recommendedWordCount": 350,
  "keywords": ["keyword1", "keyword2"]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Merge with rule-based analysis for completeness
    const ruleBasedAnalysis = await analyzeContent(title, content, category);

    return {
      ...ruleBasedAnalysis,
      ...parsed,
      recommendedSections: ruleBasedAnalysis.recommendedSections,
      relatedTopics: ruleBasedAnalysis.relatedTopics,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}



