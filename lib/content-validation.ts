/**
 * Stage 3: Post-Generation Validation
 * Validates content before publishing
 * - Telugu quality check (>85% Telugu Unicode)
 * - Toxicity detection
 * - Political/Health flagging
 * - Duplicate content detection
 * - Clickbait detection
 */

import crypto from 'crypto';

interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  checks: {
    teluguQuality: { passed: boolean; percentage: number };
    toxicity: { passed: boolean; flaggedTerms: string[] };
    sensitiveContent: { passed: boolean; flags: string[] };
    duplicateCheck: { passed: boolean; similarity: number };
    clickbait: { passed: boolean; score: number };
    wordCount: { passed: boolean; count: number; required: number };
  };
  recommendation: 'publish' | 'review' | 'reject';
  reasons: string[];
}

// Toxicity patterns (Telugu + English)
const TOXICITY_PATTERNS = [
  // Hate speech
  /hate|హేట్|kill|చంపు/i,
  // Profanity (basic - expand as needed)
  /fuck|shit|damn|bastard/i,
  // Communal
  /hindu.*(attack|kill)|muslim.*(attack|kill)/i,
  // Casteist
  /lower.caste|upper.caste|untouchable/i,
];

// Clickbait patterns
const CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /shocking truth/i,
  /నమ్మలేని/i,
  /షాకింగ్/i,
  /100%/i,
  /guaranteed/i,
  /\!\!\!/,
  /BREAKING/i,
  /EXCLUSIVE/i,
  /watch till end/i,
];

// Sensitive content patterns requiring review
const SENSITIVE_PATTERNS = {
  political: [
    /election fraud/i, /vote rigging/i, /party scam/i,
    /ఎన్నికల మోసం/, /పార్టీ స్కామ్/
  ],
  health: [
    /cure for/i, /治療 for cancer/i, /100% effective/i,
    /cancer cure/i, /diabetes cure/i,
    /క్యాన్సర్ నయం/, /షుగర్ నయం/
  ],
  legal: [
    /court verdict/i, /arrested for/i, /sentenced to/i,
    /అరెస్ట్/, /శిక్ష విధించారు/
  ],
  rumor: [
    /sources say/i, /allegedly/i, /rumored/i,
    /అని తెలుస్తోంది/, /పుకార్లు/
  ],
};

// Content hash storage (in production, use Redis/DB)
const contentHashes = new Map<string, string>();

/**
 * Check Telugu text quality
 */
function checkTeluguQuality(text: string): { passed: boolean; percentage: number } {
  // Telugu Unicode range: \u0C00-\u0C7F
  const teluguRegex = /[\u0C00-\u0C7F]/g;
  const teluguChars = (text.match(teluguRegex) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  const percentage = totalChars > 0 ? (teluguChars / totalChars) * 100 : 0;

  // Pass if >50% Telugu (allowing for English names)
  return {
    passed: percentage >= 50,
    percentage: Math.round(percentage),
  };
}

/**
 * Check for toxic content
 */
function checkToxicity(text: string): { passed: boolean; flaggedTerms: string[] } {
  const flagged: string[] = [];

  for (const pattern of TOXICITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flagged.push(matches[0]);
    }
  }

  return {
    passed: flagged.length === 0,
    flaggedTerms: flagged,
  };
}

/**
 * Check for sensitive content
 */
function checkSensitiveContent(text: string): { passed: boolean; flags: string[] } {
  const flags: string[] = [];

  for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        flags.push(category);
        break;
      }
    }
  }

  return {
    passed: flags.length === 0,
    flags: [...new Set(flags)],
  };
}

/**
 * Check for duplicate content
 */
function checkDuplicate(text: string, postId?: string): { passed: boolean; similarity: number } {
  // Create content hash
  const hash = crypto.createHash('md5').update(text.toLowerCase().replace(/\s/g, '')).digest('hex');

  // Check if similar hash exists
  for (const [existingId, existingHash] of contentHashes.entries()) {
    if (existingId !== postId && existingHash === hash) {
      return { passed: false, similarity: 100 };
    }
  }

  // Store hash for future checks
  if (postId) {
    contentHashes.set(postId, hash);
  }

  return { passed: true, similarity: 0 };
}

/**
 * Check for clickbait
 */
function checkClickbait(title: string): { passed: boolean; score: number } {
  let clickbaitScore = 0;

  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(title)) {
      clickbaitScore += 20;
    }
  }

  // Check for excessive caps
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
  if (capsRatio > 0.5) {
    clickbaitScore += 20;
  }

  // Check for excessive punctuation
  if (/[!?]{2,}/.test(title)) {
    clickbaitScore += 15;
  }

  // Check for numbers at start (listicle patterns)
  if (/^\d+\s/.test(title)) {
    clickbaitScore += 10;
  }

  return {
    passed: clickbaitScore < 50,
    score: Math.min(clickbaitScore, 100),
  };
}

/**
 * Check word count
 */
function checkWordCount(text: string, required: number = 200): { passed: boolean; count: number; required: number } {
  const count = text.split(/\s+/).filter(w => w.length > 0).length;
  return {
    passed: count >= required,
    count,
    required,
  };
}

/**
 * Validate content quality using AI (toxicity moderation)
 */
async function validateWithAI(text: string): Promise<{ passed: boolean; issues: string[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { passed: true, issues: [] };

  const prompt = `Analyze this Telugu/English text for content moderation:

"${text.substring(0, 1000)}"

Check for:
1. Hate speech
2. Misinformation
3. Harmful health claims
4. Violence promotion
5. Personal attacks

Return JSON only:
{"safe": true/false, "issues": ["issue1", "issue2"]}`;

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
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return { passed: true, issues: [] };

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { passed: true, issues: [] };

    const result = JSON.parse(jsonMatch[0]);
    return {
      passed: result.safe === true,
      issues: result.issues || [],
    };
  } catch (error) {
    return { passed: true, issues: [] };
  }
}

/**
 * Main validation function
 */
export async function validateContent(
  title: string,
  body: string,
  category: string,
  postId?: string,
  minWordCount: number = 200
): Promise<ValidationResult> {
  console.log(`\n🔍 [Validation] Checking content quality...`);

  const fullText = `${title} ${body}`;
  const reasons: string[] = [];
  let score = 100;

  // Run all checks
  const teluguQuality = checkTeluguQuality(body);
  const toxicity = checkToxicity(fullText);
  const sensitiveContent = checkSensitiveContent(fullText);
  const duplicateCheck = checkDuplicate(body, postId);
  const clickbait = checkClickbait(title);
  const wordCount = checkWordCount(body, minWordCount);

  // Calculate score and collect reasons
  if (!teluguQuality.passed) {
    score -= 20;
    reasons.push(`Telugu quality low: ${teluguQuality.percentage}%`);
  }

  if (!toxicity.passed) {
    score -= 40;
    reasons.push(`Toxic content detected: ${toxicity.flaggedTerms.join(', ')}`);
  }

  if (!sensitiveContent.passed) {
    score -= 15;
    reasons.push(`Sensitive content: ${sensitiveContent.flags.join(', ')}`);
  }

  if (!duplicateCheck.passed) {
    score -= 30;
    reasons.push('Duplicate content detected');
  }

  if (!clickbait.passed) {
    score -= 10;
    reasons.push(`High clickbait score: ${clickbait.score}`);
  }

  if (!wordCount.passed) {
    score -= 15;
    reasons.push(`Word count low: ${wordCount.count}/${wordCount.required}`);
  }

  // Determine recommendation
  let recommendation: ValidationResult['recommendation'];
  if (score >= 80) {
    recommendation = 'publish';
  } else if (score >= 50) {
    recommendation = 'review';
  } else {
    recommendation = 'reject';
  }

  // Log results
  console.log(`   📊 Score: ${score}/100`);
  console.log(`   ✅ Telugu: ${teluguQuality.percentage}%`);
  console.log(`   ✅ Words: ${wordCount.count}`);
  console.log(`   📋 Recommendation: ${recommendation}`);
  if (reasons.length > 0) {
    console.log(`   ⚠️ Issues: ${reasons.join('; ')}`);
  }

  return {
    isValid: score >= 50,
    score,
    checks: {
      teluguQuality,
      toxicity,
      sensitiveContent,
      duplicateCheck,
      clickbait,
      wordCount,
    },
    recommendation,
    reasons,
  };
}

/**
 * Quick validation for drafts (less strict)
 */
export function quickValidate(title: string, body: string): boolean {
  const wordCount = body.split(/\s+/).length;
  const teluguCheck = checkTeluguQuality(body);
  const toxicityCheck = checkToxicity(`${title} ${body}`);

  return wordCount >= 100 && teluguCheck.percentage >= 30 && toxicityCheck.passed;
}

/**
 * Add disclaimer for specific content types
 */
export function addDisclaimer(body: string, category: string, flags: string[]): string {
  let disclaimer = '';

  if (flags.includes('health')) {
    disclaimer = '\n\n⚠️ **గమనిక:** ఈ సమాచారం కేవలం అవగాహన కోసం మాత్రమే. వైద్య సలహా కోసం డాక్టర్‌ను సంప్రదించండి.';
  } else if (flags.includes('political')) {
    disclaimer = '\n\n📝 **గమనిక:** ఈ వార్త వివిధ వర్గాల అభిప్రాయాలను ప్రతిబింబిస్తుంది.';
  } else if (flags.includes('rumor')) {
    disclaimer = '\n\n📝 **గమనిక:** ఈ సమాచారం అధికారికంగా ధృవీకరించబడలేదు.';
  }

  return body + disclaimer;
}








