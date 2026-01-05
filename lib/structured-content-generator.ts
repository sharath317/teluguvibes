/**
 * Stage 2: Structured Content Generation
 * Generates articles in sections rather than free text
 * Each section is generated independently for better quality
 */

import { analyzeContent, analyzeContentWithAI } from './content-intelligence';

interface ArticleSection {
  type: string;
  content: string;
  wordCount: number;
}

interface StructuredArticle {
  title: string;
  sections: ArticleSection[];
  totalWordCount: number;
  metadata: {
    category: string;
    writingAngle: string;
    primaryEntity: string;
    contentRisk: string;
    keywords: string[];
  };
}

// Section templates by type
const SECTION_PROMPTS: Record<string, string> = {
  hook: `Write 2-3 emotional, attention-grabbing Telugu sentences to open this article.
- Make it exciting and engaging
- Use emojis sparingly (1-2 max)
- Create curiosity
- 30-50 words`,

  context: `Write a Telugu paragraph explaining the context and why this news matters.
- What happened?
- Why should readers care?
- 50-80 words`,

  main_story: `Write the main news story in Telugu with all important details.
- Include key facts
- Quote sources if available
- Be accurate and informative
- 80-120 words`,

  social_buzz: `Write about social media reactions in Telugu.
- Mention fan reactions
- Reference trending hashtags
- Include viral moments
- 50-80 words`,

  filmography: `Write about the celebrity's recent work in Telugu.
- List 3-4 recent movies/projects
- Mention achievements/awards
- Include upcoming projects
- 60-100 words`,

  stats: `Write relevant statistics in Telugu.
- Include numbers and records
- Recent performance data
- Comparisons if relevant
- 40-60 words`,

  fan_reactions: `Write about fan reactions in Telugu.
- Social media responses
- Fan club activities
- Public sentiment
- 50-70 words`,

  background: `Write historical/background context in Telugu.
- Past events related to this news
- How things got here
- Relevant history
- 60-100 words`,

  disclaimer: `Write a health/safety disclaimer in Telugu.
- Consult professionals
- Not medical advice
- Verify with authorities
- 20-30 words`,

  closing: `Write a compelling closing in Telugu.
- Future outlook
- Call to action (comment, share)
- Emotional note
- 30-50 words`,

  ingredients: `List ingredients in Telugu format.
- Bullet points
- Quantities included
- 30-50 words`,

  steps: `Write cooking steps in Telugu.
- Numbered steps
- Clear instructions
- 80-120 words`,

  tips: `Write helpful tips in Telugu.
- 2-3 tips
- Practical advice
- 30-50 words`,

  intro: `Write an introduction paragraph in Telugu.
- Brief overview
- What reader will learn
- 40-60 words`,

  main_info: `Write the main information in Telugu.
- Key facts
- Important details
- Accurate information
- 80-120 words`,
};

/**
 * Generate a single section using AI
 */
async function generateSection(
  sectionType: string,
  context: {
    title: string;
    originalContent: string;
    category: string;
    entity: string;
  }
): Promise<ArticleSection | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const sectionPrompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS.main_story;

  const prompt = `You are writing the "${sectionType}" section of a Telugu article.

Article Title: "${context.title}"
Category: ${context.category}
Main Entity: ${context.entity}
Original Content: "${context.originalContent.substring(0, 400)}"

Section Requirements:
${sectionPrompt}

RULES:
- Write ONLY in Telugu (తెలుగు)
- Keep English names as-is (Prabhas, Vijay, etc.)
- Be conversational, not formal
- Stay within word limit
- No rumors unless marked as speculation

Return ONLY the Telugu content for this section (no JSON, no labels):`;

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
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) return null;

    return {
      type: sectionType,
      content: content,
      wordCount: content.split(/\s+/).length,
    };
  } catch (error) {
    console.error(`Error generating ${sectionType} section:`, error);
    return null;
  }
}

/**
 * Generate structured article with all sections
 */
export async function generateStructuredArticle(
  originalTitle: string,
  originalContent: string,
  category: string
): Promise<StructuredArticle | null> {
  console.log(`\n📝 [StructuredGen] Generating structured article...`);

  // Step 1: Analyze content
  let analysis = await analyzeContentWithAI(originalTitle, originalContent, category);
  if (!analysis) {
    analysis = await analyzeContent(originalTitle, originalContent, category);
  }

  console.log(`   📊 Analysis: ${analysis.writingAngle} angle, ${analysis.contentRisk} risk`);
  console.log(`   📋 Sections: ${analysis.recommendedSections.join(', ')}`);

  // Step 2: Generate title
  const title = await generateTeluguTitle(originalTitle, category, analysis.primaryEntity.name);

  // Step 3: Generate each section
  const sections: ArticleSection[] = [];
  const context = {
    title: originalTitle,
    originalContent,
    category,
    entity: analysis.primaryEntity.name,
  };

  for (const sectionType of analysis.recommendedSections) {
    console.log(`   ✍️ Generating ${sectionType}...`);
    const section = await generateSection(sectionType, context);

    if (section) {
      sections.push(section);
      console.log(`   ✅ ${sectionType}: ${section.wordCount} words`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (sections.length === 0) {
    console.log(`   ❌ Failed to generate any sections`);
    return null;
  }

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  console.log(`   📊 Total: ${totalWordCount} words across ${sections.length} sections`);

  return {
    title: title || originalTitle,
    sections,
    totalWordCount,
    metadata: {
      category,
      writingAngle: analysis.writingAngle,
      primaryEntity: analysis.primaryEntity.name,
      contentRisk: analysis.contentRisk,
      keywords: analysis.keywords,
    },
  };
}

/**
 * Generate Telugu title
 */
async function generateTeluguTitle(
  originalTitle: string,
  category: string,
  entity: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `Create a catchy Telugu headline for this news:
"${originalTitle}"
Category: ${category}
Main Entity: ${entity}

Requirements:
- Write in Telugu
- Keep English names as-is
- Make it SEO-friendly
- Create curiosity
- Max 15 words

Return ONLY the Telugu headline (no quotes, no JSON):`;

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
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert structured article to flat body text
 */
export function structuredToBody(article: StructuredArticle): string {
  const sectionLabels: Record<string, string> = {
    hook: '',
    context: '\n\n',
    main_story: '\n\n',
    social_buzz: '\n\n**సోషల్ మీడియా బజ్:**\n\n',
    filmography: '\n\n**ఫిల్మోగ్రఫీ:**\n\n',
    stats: '\n\n**గణాంకాలు:**\n\n',
    fan_reactions: '\n\n**ఫ్యాన్ రియాక్షన్స్:**\n\n',
    background: '\n\n**నేపథ్యం:**\n\n',
    disclaimer: '\n\n⚠️ ',
    closing: '\n\n',
    ingredients: '\n\n**పదార్థాలు:**\n\n',
    steps: '\n\n**తయారీ విధానం:**\n\n',
    tips: '\n\n**చిట్కాలు:**\n\n',
    intro: '',
    main_info: '\n\n',
  };

  let body = '';
  for (const section of article.sections) {
    const label = sectionLabels[section.type] ?? '\n\n';
    body += label + section.content;
  }

  return body.trim();
}

/**
 * Generate article with structured approach, falling back to simple if needed
 */
export async function generateArticleWithStructure(
  originalTitle: string,
  originalContent: string,
  category: string
): Promise<{ title: string; body: string; wordCount: number } | null> {
  const structured = await generateStructuredArticle(originalTitle, originalContent, category);

  if (!structured) return null;

  return {
    title: structured.title,
    body: structuredToBody(structured),
    wordCount: structured.totalWordCount,
  };
}








