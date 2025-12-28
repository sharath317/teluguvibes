/**
 * AI Content Generator - Generates high-quality Telugu articles
 * Uses Gemini (free) or Groq (free) for content generation
 * References similar posts for consistent style
 */

import { createClient } from '@supabase/supabase-js';

interface GeneratedContent {
  title: string;
  body: string;
  summary: string;
  tags: string[];
}

interface ArticleContext {
  originalTitle: string;
  originalContent: string;
  category: string;
  similarPosts: Array<{ title: string; body: string }>;
}

// Initialize Supabase for fetching similar posts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Find similar published posts for style reference
 */
async function findSimilarPosts(category: string, keywords: string[]): Promise<Array<{ title: string; body: string }>> {
  try {
    // Get recent published posts in the same category
    const { data: posts } = await supabase
      .from('posts')
      .select('title, telugu_body')
      .eq('status', 'published')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(3);

    if (posts && posts.length > 0) {
      return posts.map(p => ({ title: p.title, body: p.telugu_body.substring(0, 500) }));
    }

    // Fallback: get any recent published posts
    const { data: anyPosts } = await supabase
      .from('posts')
      .select('title, telugu_body')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(3);

    return (anyPosts || []).map(p => ({ title: p.title, body: p.telugu_body.substring(0, 500) }));
  } catch (error) {
    console.error('Error fetching similar posts:', error);
    return [];
  }
}

/**
 * Extract keywords from text for similarity matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for'];
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10);
}

/**
 * Generate content using Google Gemini API (FREE: 60 req/min)
 */
async function generateWithGemini(context: ArticleContext): Promise<GeneratedContent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const similarPostsContext = context.similarPosts.length > 0
    ? `\n\nReference these similar articles for style:\n${context.similarPosts.map((p, i) =>
        `Example ${i + 1}:\nTitle: ${p.title}\nContent: ${p.body}...`
      ).join('\n\n')}`
    : '';

  const prompt = `You are a senior Telugu entertainment journalist writing for a popular portal with millions of readers.
Your task is to create a comprehensive, engaging Telugu article from the following news.

ORIGINAL NEWS:
Title: ${context.originalTitle}
Content: ${context.originalContent}
Category: ${context.category}
${similarPostsContext}

STRICT REQUIREMENTS:

1. **LENGTH: MINIMUM 350-500 words** - This is critical. Short articles will be rejected.

2. **LANGUAGE**: Write entirely in Telugu (తెలుగు) using conversational, engaging style.

3. **STRUCTURE** (follow this exactly):
   - **Opening Hook** (2-3 sentences): Start with an attention-grabbing statement
   - **Main News** (1 paragraph): Cover the core news/update
   - **Background Context** (1-2 paragraphs): Add relevant history/context
   - **Celebrity/Movie Details** (1-2 paragraphs): Include biographical info, filmography, recent works
   - **Social Media Buzz** (1 paragraph): Mention fan reactions, trending hashtags, viral moments
   - **Industry Impact** (1 paragraph): How this affects the industry/fans
   - **Closing** (2-3 sentences): Future outlook or call to action

4. **ENRICH WITH DETAILS**:
   - If about an ACTOR/ACTRESS: Include their recent hits, upcoming projects, awards, fan following
   - If about a MOVIE: Include director, producer, cast, music director, box office expectations
   - If about CRICKET: Include player stats, recent performance, team dynamics
   - If about POLITICS: Include party position, constituency, recent statements
   - Add relevant numbers, dates, names to make it informative

5. **SOCIAL MEDIA CONTEXT**:
   - Mention how fans are reacting
   - Reference viral moments or trending topics
   - Include fan theories or expectations
   - Mention celebrity social media activity if relevant

6. **TONE**: Enthusiastic but professional. Make readers feel excited about the news.

7. **DO NOT**:
   - Copy the original text
   - Write less than 350 words
   - Use formal/literary Telugu
   - Leave any section vague or generic

OUTPUT FORMAT (JSON only, no other text):
{
  "title": "Catchy, SEO-friendly Telugu title (include main keywords)",
  "body": "Full 350-500 word article in Telugu. Use \\n\\n between paragraphs. Be detailed and informative.",
  "summary": "2-3 line compelling summary in Telugu for social sharing",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Generate a detailed, comprehensive Telugu article now:`;

  try {
    // Try gemini-1.5-flash first, fallback to gemini-pro
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
    let response: Response | null = null;

    for (const model of models) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (response.ok) {
        console.log(`   Using Gemini model: ${model}`);
        break;
      }
    }

    if (!response) {
      console.error('No Gemini model available');
      return null;
    }

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    // Clean and parse JSON
    let jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonStr) return null;

    // Fix common JSON issues
    jsonStr = jsonStr
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ');

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to extract fields manually
      const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
      const bodyMatch = jsonStr.match(/"body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"summary|"\s*,\s*"tags|"\s*\})/);

      if (titleMatch && bodyMatch) {
        return {
          title: titleMatch[1],
          body: bodyMatch[1].replace(/\\n/g, '\n'),
          summary: '',
          tags: [],
        };
      }
      return null;
    }
  } catch (error) {
    console.error('Gemini generation error:', error);
    return null;
  }
}

/**
 * Generate content using Groq API (FREE tier available)
 */
async function generateWithGroq(context: ArticleContext): Promise<GeneratedContent | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const similarPostsContext = context.similarPosts.length > 0
    ? `\n\nReference style from these articles:\n${context.similarPosts.map((p, i) =>
        `${i + 1}. ${p.title}: ${p.body.substring(0, 200)}...`
      ).join('\n')}`
    : '';

  const prompt = `You are a Telugu entertainment journalist. Write a COMPREHENSIVE article in Telugu.

NEWS:
"${context.originalTitle}"
${context.originalContent.substring(0, 800)}

STRICT REQUIREMENTS:
1. Write MINIMUM 400 Telugu words (mandatory!)
2. Use conversational Telugu (తెలుగు)

ARTICLE STRUCTURE:
- OPENING HOOK (2-3 exciting sentences)
- MAIN NEWS (1 paragraph with details)
- BACKGROUND (1-2 paragraphs - history, context)
- CELEBRITY INFO (1-2 paragraphs - filmography, recent hits, achievements)
- SOCIAL MEDIA BUZZ (1 paragraph - fan reactions, trending hashtags)
- INDUSTRY IMPACT (1 paragraph - expectations, reactions)
- CLOSING (2-3 sentences - future outlook)

ENRICHMENTS:
- ACTOR: Recent 3-4 hit movies, awards, fan following
- MOVIE: Director, cast, music director, budget
- CRICKET: Player stats, records, recent scores
- Add specific numbers, dates, names

Return ONLY valid JSON:
{"title":"Telugu title","body":"Full 400+ word Telugu article","tags":["tag1","tag2","tag3"]}`;

  try {
    // Try different models - some may not be available
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    let response: Response | null = null;

    for (const model of models) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 4096, // Increased for longer articles
        }),
      });

      if (response.ok) {
        console.log(`   Using Groq model: ${model}`);
        break;
      }
    }

    if (!response) {
      console.error('No Groq model available');
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error('   Groq returned empty response');
      return null;
    }

    console.log(`   Groq response length: ${text.length} chars`);

    // Try direct JSON parse first (LLM usually returns valid JSON)
    try {
      // Remove any markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanText);
      console.log(`   ✅ JSON parsed successfully - title: ${parsed.title?.substring(0, 30)}...`);
      return parsed;
    } catch (e1) {
      console.log(`   Direct parse failed, trying regex extraction...`);

      // Try to extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ Regex extraction worked - title: ${parsed.title?.substring(0, 30)}...`);
          return parsed;
        } catch (e2) {
          console.log(`   Regex parse also failed: ${e2}`);
        }
      }

      // Manual extraction as last resort
      const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);

      if (titleMatch) {
        let bodyContent = '';

        // Find body content - look for "body":" and extract until ","tags" or end
        const bodyStartIdx = text.indexOf('"body"');
        if (bodyStartIdx > -1) {
          // Find the opening quote after "body":
          const colonIdx = text.indexOf(':', bodyStartIdx);
          if (colonIdx > -1) {
            const openQuoteIdx = text.indexOf('"', colonIdx);
            if (openQuoteIdx > -1) {
              // Find the closing pattern - either ","tags" or "}
              let endIdx = text.indexOf('","tags"', openQuoteIdx + 1);
              if (endIdx === -1) {
                endIdx = text.lastIndexOf('"}');
              }
              if (endIdx === -1) {
                endIdx = text.lastIndexOf('"');
              }

              if (endIdx > openQuoteIdx) {
                bodyContent = text.substring(openQuoteIdx + 1, endIdx);
                // Unescape
                bodyContent = bodyContent
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
              }
            }
          }
        }

        console.log(`   ✅ Manual extraction - title: ${titleMatch[1].substring(0, 30)}...`);
        console.log(`   Body extracted: ${bodyContent.length} chars`);

        // If body extraction failed, use fallback
        if (!bodyContent || bodyContent.length < 50) {
          console.log(`   Using fallback body extraction...`);
          // Remove JSON wrapper and use the whole text
          bodyContent = text
            .replace(/^\s*\{/, '')
            .replace(/\}\s*$/, '')
            .replace(/"title"\s*:\s*"[^"]+"\s*,?\s*/, '')
            .replace(/"body"\s*:\s*"/, '')
            .replace(/"\s*,?\s*"tags"\s*:\s*\[[^\]]*\]/, '')
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .trim();
        }

        return {
          title: titleMatch[1],
          body: bodyContent,
          summary: '',
          tags: [],
        };
      }

      console.log(`   ❌ All extraction methods failed`);
      return null;
    }
  } catch (error) {
    console.error('Groq generation error:', error);
    return null;
  }
}

/**
 * Fallback: Template-based content generation (no API needed)
 * Creates detailed articles with proper structure
 */
function generateWithTemplate(context: ArticleContext): GeneratedContent {
  const { originalTitle, originalContent, category } = context;

  // Clean content
  const cleanContent = originalContent
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Category-specific templates with detailed structure
  const templates: Record<string, {
    opener: string;
    context: string;
    social: string;
    impact: string;
    closer: string
  }> = {
    entertainment: {
      opener: '🎬 సినీ అభిమానులకు సంచలన వార్త వచ్చింది! టాలీవుడ్ మరియు బాలీవుడ్ ప్రేక్షకులు ఈ న్యూస్ కోసం ఎంతో ఆసక్తిగా ఎదురుచూస్తున్నారు.',
      context: 'ఈ పరిణామం సినీ పరిశ్రమలో పెద్ద చర్చకు దారితీసింది. గత కొన్ని నెలలుగా ఈ విషయంపై అనేక ఊహాగానాలు వినిపిస్తున్నాయి. ఇప్పుడు అధికారిక సమాచారం బయటకు రావడంతో అభిమానుల ఆనందానికి అవధులు లేవు.',
      social: '🔥 సోషల్ మీడియాలో ఈ వార్త వైరల్ అవుతోంది. ట్విట్టర్ మరియు ఇన్‌స్టాగ్రామ్‌లో అభిమానులు తమ సంతోషాన్ని పంచుకుంటున్నారు. హ్యాష్‌ట్యాగ్‌లు ట్రెండింగ్‌లో టాప్‌లో ఉన్నాయి.',
      impact: 'ఈ న్యూస్ బాక్స్ ఆఫీస్ కలెక్షన్లపై పెద్ద ప్రభావం చూపనుంది. ట్రేడ్ అనలిస్టులు ఈ పరిణామాన్ని పాజిటివ్‌గా చూస్తున్నారు.',
      closer: '\n\n📣 ఈ వార్తపై మీ అభిప్రాయం ఏమిటి? కామెంట్స్‌లో మీ థాట్స్ షేర్ చేయండి! మరిన్ని ఎక్స్‌క్లూజివ్ అప్‌డేట్స్ కోసం మా పేజీని ఫాలో అవ్వండి. 🎬',
    },
    sports: {
      opener: '🏏 క్రీడా ప్రపంచంలో సంచలన వార్త! భారత క్రికెట్ అభిమానులకు ఈ న్యూస్ చాలా ముఖ్యమైనది.',
      context: 'ఈ పరిణామం భారత క్రికెట్ చరిత్రలో ముఖ్యమైన మలుపుగా నిలుస్తుంది. BCCI ఈ విషయంపై తీవ్రంగా కృషి చేస్తోంది. గత కొన్ని మ్యాచ్‌లలో జట్టు ప్రదర్శన ఈ నిర్ణయానికి కారణమైంది.',
      social: '📱 సోషల్ మీడియాలో అభిమానులు తీవ్రంగా స్పందిస్తున్నారు. కొందరు ఈ నిర్ణయాన్ని స్వాగతిస్తుండగా, మరికొందరు విమర్శిస్తున్నారు. ట్విట్టర్‌లో #TeamIndia ట్రెండ్ అవుతోంది.',
      impact: 'ఈ నిర్ణయం రాబోయే వరల్డ్ కప్ మరియు ఇతర టోర్నమెంట్లపై ప్రభావం చూపనుంది. జట్టు సెలెక్షన్‌లో మార్పులు రావచ్చని నిపుణులు అంచనా వేస్తున్నారు.',
      closer: '\n\n🏆 ఈ విషయంపై మీ అభిప్రాయం ఏమిటి? మీ ఫేవరెట్ ప్లేయర్ ఎవరు? కామెంట్స్‌లో చెప్పండి! 🇮🇳',
    },
    politics: {
      opener: '🔴 రాజకీయ వర్గాల్లో కలకలం రేపుతున్న సంచలన వార్త! ఈ పరిణామం రాష్ట్ర రాజకీయాలను మార్చేసే అవకాశం ఉంది.',
      context: 'ఈ విషయం గత కొన్ని రోజులుగా చర్చనీయాంశంగా మారింది. వివిధ రాజకీయ పార్టీలు తమ వైఖరిని స్పష్టం చేస్తున్నాయి. ప్రజలు ఈ పరిణామాలను ఆసక్తిగా గమనిస్తున్నారు.',
      social: '📱 సోషల్ మీడియాలో నేతలు మరియు కార్యకర్తలు తీవ్రంగా స్పందిస్తున్నారు. వివిధ హ్యాష్‌ట్యాగ్‌లు ట్రెండ్ అవుతున్నాయి. మీడియాలో కూడా ఈ అంశంపై విస్తృత చర్చ జరుగుతోంది.',
      impact: 'ఈ నిర్ణయం రాబోయే ఎన్నికలపై ప్రభావం చూపే అవకాశం ఉంది. రాజకీయ విశ్లేషకులు ఈ పరిణామాన్ని క్లోజ్‌గా గమనిస్తున్నారు.',
      closer: '\n\n🗳️ ఈ రాజకీయ పరిణామంపై మీ అభిప్రాయం ఏమిటి? కామెంట్స్‌లో తెలియజేయండి!',
    },
    gossip: {
      opener: '🔥 సోషల్ మీడియాలో వైరల్ అవుతున్న హాట్ న్యూస్! సెలబ్రిటీ ప్రపంచంలో ఈ వార్త పెద్ద సంచలనం సృష్టిస్తోంది.',
      context: 'ఈ విషయం గత కొన్ని గంటల్లో ఇంటర్నెట్‌ను షేక్ చేస్తోంది. అభిమానులు మరియు మీడియా ఈ న్యూస్‌పై తీవ్రంగా స్పందిస్తున్నారు. సెలబ్రిటీల పర్సనల్ లైఫ్ గురించి ఎప్పుడూ ఆసక్తి ఉంటుంది.',
      social: '💥 ఇన్‌స్టాగ్రామ్, ట్విట్టర్‌లో ఈ వార్త టాప్ ట్రెండ్‌గా ఉంది. లక్షలాది మంది ఈ పోస్ట్‌లను లైక్, షేర్ చేస్తున్నారు. ఫ్యాన్ పేజీలు నిమిషానికో అప్‌డేట్ ఇస్తున్నాయి.',
      impact: 'ఈ వార్త సెలబ్రిటీ ఇమేజ్‌పై ఎలాంటి ప్రభావం చూపుతుందో చూడాలి. పబ్లిక్ రిలేషన్స్ టీమ్ ఈ విషయంపై పని చేస్తోందని తెలుస్తోంది.',
      closer: '\n\n💫 ఈ గాసిప్ మీకు ఆసక్తికరంగా ఉందా? మీ ఫ్రెండ్స్‌తో షేర్ చేయండి! మరిన్ని హాట్ అప్‌డేట్స్ కోసం ఫాలో అవ్వండి! 🌟',
    },
    trending: {
      opener: '📢 ఇప్పుడు ట్రెండింగ్‌లో ఉన్న హాట్ టాపిక్! ఈ వార్త సోషల్ మీడియాలో వేగంగా వ్యాప్తి చెందుతోంది.',
      context: 'ఈ విషయం ఇటీవల కాలంలో చాలా మంది దృష్టిని ఆకర్షిస్తోంది. వివిధ వర్గాల ప్రజలు ఈ అంశంపై తమ అభిప్రాయాలను పంచుకుంటున్నారు. మీడియా కూడా ఈ విషయానికి ప్రాధాన్యత ఇస్తోంది.',
      social: '🚀 ట్విట్టర్, ఫేస్‌బుక్, ఇన్‌స్టాగ్రామ్‌లో ఈ టాపిక్ ట్రెండ్ అవుతోంది. లక్షలాది మంది యూజర్లు ఈ విషయంపై చర్చిస్తున్నారు. వైరల్ మీమ్స్ కూడా సర్క్యులేట్ అవుతున్నాయి.',
      impact: 'ఈ ట్రెండ్ సమాజంపై ఎలాంటి ప్రభావం చూపుతుందో చూడటం ఆసక్తికరంగా ఉంటుంది. నిపుణులు వివిధ కోణాల నుండి ఈ అంశాన్ని విశ్లేషిస్తున్నారు.',
      closer: '\n\n🔔 ఈ ట్రెండింగ్ టాపిక్‌పై మీ థాట్స్ ఏమిటి? కామెంట్స్‌లో షేర్ చేయండి! మరిన్ని వైరల్ న్యూస్ కోసం మాతో ఉండండి! 📱',
    },
  };

  const template = templates[category] || templates.trending;

  // Build comprehensive article (350+ words)
  const body = `${template.opener}

**${originalTitle}**

${cleanContent}

**నేపథ్యం మరియు వివరాలు:**

${template.context}

**సోషల్ మీడియా రియాక్షన్స్:**

${template.social}

**ప్రభావం మరియు ముందుకు:**

${template.impact}

ఈ విషయంలో మరిన్ని అప్‌డేట్లు వచ్చినప్పుడు మేము మీకు తెలియజేస్తాము. ఈ పరిణామాలను ఫాలో అవ్వడానికి మా నోటిఫికేషన్లను ఆన్ చేయండి.${template.closer}`;

  return {
    title: originalTitle,
    body,
    summary: `${originalTitle} - తాజా సమాచారం మరియు సోషల్ మీడియా రియాక్షన్లు.`,
    tags: [category, 'trending', 'viral', 'latest'],
  };
}

/**
 * Main function: Generate high-quality article content
 */
export async function generateArticleContent(
  originalTitle: string,
  originalContent: string,
  category: string
): Promise<GeneratedContent> {
  console.log(`\n✍️ [ContentGen] Generating for: "${originalTitle.substring(0, 50)}..."`);

  // Find similar posts for style reference
  const keywords = extractKeywords(`${originalTitle} ${originalContent}`);
  const similarPosts = await findSimilarPosts(category, keywords);

  console.log(`   📚 Found ${similarPosts.length} similar posts for reference`);

  const context: ArticleContext = {
    originalTitle,
    originalContent,
    category,
    similarPosts,
  };

  // Try AI generation (Gemini first, then Groq)
  let generated = await generateWithGemini(context);

  if (generated) {
    console.log(`   ✅ Generated with Gemini AI`);
    return generated;
  }

  generated = await generateWithGroq(context);

  if (generated) {
    console.log(`   ✅ Generated with Groq AI`);
    return generated;
  }

  // Fallback to template-based generation
  console.log(`   ⚠️ Using template-based generation (no AI API configured)`);
  return generateWithTemplate(context);
}

/**
 * Check which AI services are available
 */
export function getAvailableAIServices(): string[] {
  const services: string[] = [];
  if (process.env.GEMINI_API_KEY) services.push('Gemini');
  if (process.env.GROQ_API_KEY) services.push('Groq');
  if (services.length === 0) services.push('Template (fallback)');
  return services;
}
