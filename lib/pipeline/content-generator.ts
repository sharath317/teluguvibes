/**
 * Content Generator for TeluguVibes
 *
 * Generates high-quality Telugu content using:
 * 1. Ollama (local AI) for content generation
 * 2. Telugu templates for structure
 * 3. Entity database for tags
 * 4. Wikipedia for images
 */

import { TELUGU_ENTITIES, findEntity, findMovie, extractMovieName, extractTags, getEntityImage, getEnhancedImage, PARAGRAPH_TEMPLATES } from '../content/telugu-templates';

export interface GeneratedContent {
  slug: string;
  title: string;
  titleTe: string;
  excerpt: string;
  bodyTe: string;
  tags: string[];
  imageUrl: string | null;
  imageAlt: string;
  wikiTitle: string;
  entityType: 'actor' | 'actress' | 'director' | 'movie' | 'event';
  confidence: number;
  source: 'ollama-ai' | 'template-fallback';  // Track content source
}

/**
 * Generate content using Ollama
 */
async function generateWithOllama(prompt: string): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:8b',
        prompt,
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 1000,
        },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.response || null;
  } catch {
    return null;
  }
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate Telugu content for a topic
 */
export async function generateTeluguContent(topic: string): Promise<GeneratedContent | null> {
  console.log(`\n📝 Generating content for: ${topic}`);

  // Step 1: Find main entity
  const entityMatch = findEntity(topic);
  const entity = entityMatch?.entity;
  const entityType = entityMatch?.type || 'event';

  console.log(`   🎭 Entity: ${entity?.name || 'Generic'} (${entityType})`);

  // Step 2: Extract tags
  const tags = extractTags(topic);
  console.log(`   🏷️ Tags: ${tags.slice(0, 3).join(', ')}...`);

  // Step 3: Get image from multiple sources
  let imageUrl: string | null = null;
  let imageSource = 'Unknown';

  // First try entity-specific image
  if (entity?.wikiTitle) {
    imageUrl = await getEntityImage(entity.wikiTitle);
    if (imageUrl) imageSource = 'Wikipedia';
  }

  // If no image, try enhanced search
  if (!imageUrl) {
    const enhanced = await getEnhancedImage(topic);
    if (enhanced) {
      imageUrl = enhanced.url;
      imageSource = enhanced.source;
    }
  }

  console.log(`   🖼️ Image: ${imageUrl ? `✅ (${imageSource})` : '❌'}`);

  // Step 4: Generate content with Ollama or use template
  let content: { title_te: string; excerpt: string; body_te: string } | null = null;
  let contentSource: 'ollama-ai' | 'template-fallback' = 'template-fallback';

  const ollamaAvailable = await isOllamaAvailable();

  if (ollamaAvailable) {
    console.log(`   🤖 Attempting Ollama AI generation...`);
    content = await generateContentWithAI(topic, entity, entityType);
    if (content) {
      contentSource = 'ollama-ai';
      console.log(`   ✅ SOURCE: Ollama AI (local LLM)`);
    }
  }

  // Fallback to template if AI fails
  if (!content) {
    console.log(`   📄 SOURCE: Template Fallback (predefined)`);
    content = generateFromTemplate(topic, entity, entityType);
    contentSource = 'template-fallback';
  }

  if (!content) {
    console.log(`   ❌ Content generation failed`);
    return null;
  }

  // Step 5: Create slug
  const slug = createSlug(content.title_te || topic);

  // Step 6: Calculate confidence
  const confidence = calculateConfidence(content, imageUrl, tags);
  console.log(`   📊 Confidence: ${(confidence * 100).toFixed(0)}%`);

  return {
    slug,
    title: content.title_te,
    titleTe: content.title_te,
    excerpt: content.excerpt,
    bodyTe: content.body_te,
    tags,
    imageUrl,
    imageAlt: entity?.name || topic.split(' ')[0],
    wikiTitle: entity?.wikiTitle || topic.split(' ')[0],
    entityType: entityType as GeneratedContent['entityType'],
    confidence,
    source: contentSource,
  };
}

/**
 * Validate Telugu text quality
 */
function isValidTeluguText(text: string): boolean {
  if (!text || text.length < 50) return false;

  // Check for HTML entities (garbled)
  if (text.includes('&#') || text.includes('&amp;')) return false;

  // Check for Mojibake patterns (Ã characters)
  if (/Ã[±°]/g.test(text)) return false;

  // Check for valid Telugu Unicode characters (U+0C00 to U+0C7F)
  const teluguChars = text.match(/[\u0C00-\u0C7F]/g);
  const teluguRatio = teluguChars ? teluguChars.length / text.length : 0;

  // Should have at least 20% Telugu characters for a Telugu article
  return teluguRatio > 0.2;
}

/**
 * Generate content using AI (Ollama)
 */
async function generateContentWithAI(
  topic: string,
  entity: typeof TELUGU_ENTITIES.actors[0] | null,
  entityType: string
): Promise<{ title_te: string; excerpt: string; body_te: string } | null> {
  const actorName = entity?.name || topic.split(' ')[0];
  const actorNameTe = entity?.nameTe || actorName;
  const alias = (entity as { alias?: string })?.alias || '';

  const prompt = `You are a Telugu entertainment journalist writing about: ${topic}

Write a Telugu article about ${actorNameTe} (${actorName}, ${alias}).

Return ONLY valid JSON (no markdown, no explanation):
{"title_te":"Telugu title using ${actorNameTe}","excerpt":"2 line Telugu summary","body_te":"4 paragraph Telugu article about ${topic}. Use Telugu script. Keep ${actorName} in English."}`;

  const response = await generateWithOllama(prompt);
  if (!response) return null;

  try {
    // Try to find JSON in response
    const jsonMatch = response.match(/\{[^{}]*"title_te"[^{}]*"excerpt"[^{}]*"body_te"[^{}]*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title_te && parsed.body_te) {
        // Validate Telugu text quality
        if (!isValidTeluguText(parsed.title_te) || !isValidTeluguText(parsed.body_te)) {
          console.log(`   ⚠️ AI output failed Telugu validation, falling back...`);
          return null;
        }
        return parsed;
      }
    }

    // Try parsing entire response
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.title_te && parsed.body_te) {
      // Validate Telugu text quality
      if (!isValidTeluguText(parsed.title_te) || !isValidTeluguText(parsed.body_te)) {
        console.log(`   ⚠️ AI output failed Telugu validation, falling back...`);
        return null;
      }
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate content from template (fallback)
 *
 * IMPORTANT: Uses actual movie names from our database or extracted from topic.
 * Never uses placeholder like "కొత్త సినిమా" (new movie).
 */
function generateFromTemplate(
  topic: string,
  entity: typeof TELUGU_ENTITIES.actors[0] | null,
  entityType: string
): { title_te: string; excerpt: string; body_te: string } | null {
  const actorName = entity?.name || topic.split(' ')[0];
  const actorNameTe = entity?.nameTe || actorName;
  const alias = (entity as { alias?: string })?.alias || '';

  // Extended movie database with directors and heroines
  const movieExtendedInfo: Record<string, { director: string; heroine?: string }> = {
    'Pushpa 2': { director: 'సుకుమార్', heroine: 'రష్మిక మందన్న' },
    'Salaar': { director: 'ప్రశాంత్ నీల్', heroine: 'శ్రుతి హాసన్' },
    'Raja Saab': { director: 'మారుతీ', heroine: 'నిధి అగర్వాల్' },
    'Spirit': { director: 'సందీప్ రెడ్డి వాంగ', heroine: '' },
    'Devara': { director: 'కొరటాల శివ', heroine: 'జాన్వీ కపూర్' },
    'Game Changer': { director: 'శంకర్', heroine: 'కియారా అద్వానీ' },
    'RRR': { director: 'ఎస్.ఎస్. రాజమౌళి', heroine: 'ఆలియా భట్' },
    'Baahubali': { director: 'ఎస్.ఎస్. రాజమౌళి', heroine: 'అనుష్క శెట్టి' },
    'SSMB29': { director: 'ఎస్.ఎస్. రాజమౌళి', heroine: '' },
    'Vishwambhara': { director: 'వశిష్ట', heroine: 'త్రిష' },
    'Akhanda 2': { director: 'బోయపాటి శ్రీను', heroine: 'ప్రగ్యా జైస్వాల్' },
    'OG': { director: 'సుజీత్', heroine: 'ప్రియాంక మోహన్' },
    'Hari Hara Veera Mallu': { director: 'క్రిష్ జాగర్లమూడి', heroine: 'నిధి అగర్వాల్' },
    'Thandel': { director: 'చందూ మొండేటి', heroine: 'సాయి పల్లవి' },
    'Lucky Baskhar': { director: 'వెంకీ అట్లూరి', heroine: 'మీనా' },
  };

  // Try to find movie from our database first
  const movieFromDB = findMovie(topic);
  // Then try to extract from topic text
  const extractedMovie = extractMovieName(topic);

  // Determine movie info (priority: DB > extracted > topic-based)
  let movieName = topic.split(' ')[0]; // Default: first word of topic
  let movieNameTe = movieName;
  let movieHero = actorName;
  let director = 'ప్రముఖ దర్శకుడు';
  let heroine = '';

  if (movieFromDB) {
    movieName = movieFromDB.name;
    movieNameTe = movieFromDB.nameTe;
    if (movieFromDB.hero) movieHero = movieFromDB.hero;
    const extInfo = movieExtendedInfo[movieFromDB.name];
    if (extInfo) {
      director = extInfo.director;
      heroine = extInfo.heroine || '';
    }
    console.log(`   🎬 Movie found in DB: ${movieName} (${movieNameTe})`);
  } else if (extractedMovie) {
    movieName = extractedMovie.name;
    movieNameTe = extractedMovie.nameTe;
    if (extractedMovie.hero) movieHero = extractedMovie.hero;
    const extInfo = movieExtendedInfo[movieName];
    if (extInfo) {
      director = extInfo.director;
      heroine = extInfo.heroine || '';
    }
    console.log(`   🎬 Movie extracted: ${movieName} (${movieNameTe})`);
  } else {
    // Check if topic itself looks like a movie title (has words in it)
    // Use first meaningful phrase from topic as movie name if it's movie-related
    if (topic.toLowerCase().includes('movie') || topic.toLowerCase().includes('film') ||
        topic.includes('సినిమా') || topic.includes('చిత్రం')) {
      // Extract potential movie name
      const words = topic.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0 && words[0] !== 'new' && words[0] !== 'New') {
        movieName = words.slice(0, 2).join(' ');
        movieNameTe = movieName;
      }
    }
    console.log(`   🎬 Using topic-based movie name: ${movieName}`);
  }

  // Check if this is a movie-related topic or general news
  const isMovieTopic = movieFromDB !== null ||
                       extractedMovie !== null ||
                       topic.toLowerCase().includes('movie') ||
                       topic.toLowerCase().includes('film') ||
                       topic.includes('సినిమా') ||
                       topic.includes('చిత్రం');

  // Generate different content based on topic type
  if (isMovieTopic) {
    return generateMovieContent(topic, actorNameTe, alias, movieNameTe, director, heroine);
  } else {
    return generateGeneralNewsContent(topic, actorNameTe, alias);
  }
}

/**
 * Generate movie-specific content
 */
function generateMovieContent(
  topic: string,
  actorNameTe: string,
  alias: string,
  movieNameTe: string,
  director: string,
  heroine: string
): { title_te: string; excerpt: string; body_te: string } {
  const aliasStr = alias ? `${alias} ` : '';

  // Generate title with actual movie name
  const title_te = `${actorNameTe} '${movieNameTe}' - అభిమానులకు థ్రిల్లింగ్ అప్డేట్!`;

  // Generate excerpt
  const excerpt = `${aliasStr}${actorNameTe} '${movieNameTe}' సినిమా గురించి లేటెస్ట్ అప్డేట్. అభిమానులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్నారు.`;

  // Generate richer body content with actual movie name
  const para1 = `తెలుగు సినీ ప్రేక్షకులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్న క్షణం వచ్చేసింది! ${aliasStr}${actorNameTe} '${movieNameTe}' సినిమాతో మరోసారి తన అభిమానులను థ్రిల్ చేయడానికి సిద్ధమవుతున్నారు. భారతీయ సినిమా చరిత్రలో ఈ సినిమా కొత్త రికార్డులు నెలకొల్పబోతోంది.`;

  const para2 = `${director} దర్శకత్వంలో వస్తున్న '${movieNameTe}' భారీ స్కేల్‌లో తయారవుతోంది.${heroine ? ` ${heroine} హీరోయిన్‌గా నటిస్తున్నారు.` : ''} వరల్డ్-క్లాస్ టెక్నికల్ టీమ్‌తో, భారీ బడ్జెట్‌తో ఈ సినిమా తయారవుతోంది. విజువల్ ఎఫెక్ట్స్, యాక్షన్ సీన్స్ అన్నీ అద్భుతంగా ఉంటాయని టాక్.`;

  const para3 = `${actorNameTe} ఇటీవల వరుస హిట్లు అందించారు. ఆయన స్టార్ పవర్ ఇప్పటికీ ఎంత బలంగా ఉందో నిరూపిస్తున్నారు. డాన్స్, యాక్టింగ్, స్టైల్ అన్నింటిలోనూ ఆయన అసమానం. '${movieNameTe}' సినిమా కోసం అభిమానులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్నారు.`;

  const para4 = `'${movieNameTe}' బాక్సాఫీస్ వద్ద భారీ వసూళ్లు రాబడుతుందని అంచనా. అభిమానులు ఇప్పటి నుండే థియేటర్లలో సెలబ్రేషన్స్ కోసం ప్లాన్ చేస్తున్నారు. ఫస్ట్ డే ఫస్ట్ షో టిక్కెట్ల కోసం పోటీ ఉంటుందని ఖాయం. ఈ సినిమా తెలుగు సినిమా చరిత్రలో కొత్త అధ్యాయం రాయబోతోంది.`;

  const body_te = `${para1}\n\n${para2}\n\n${para3}\n\n${para4}`;

  return { title_te, excerpt, body_te };
}

/**
 * Generate general news content (non-movie topics)
 */
function generateGeneralNewsContent(
  topic: string,
  actorNameTe: string,
  alias: string
): { title_te: string; excerpt: string; body_te: string } {
  const aliasStr = alias ? `${alias} ` : '';

  // Clean up topic for title - use as is if it's in Telugu
  const hasTelugu = /[\u0C00-\u0C7F]/.test(topic);
  const cleanTopic = topic.replace(/['"]/g, '').trim();

  // Generate title
  const title_te = hasTelugu
    ? cleanTopic
    : `${aliasStr}${actorNameTe} - ${cleanTopic}`;

  // Generate excerpt
  const excerpt = hasTelugu
    ? `${cleanTopic}. మరిన్ని వివరాలు తెలుసుకోండి.`
    : `${aliasStr}${actorNameTe} గురించి లేటెస్ట్ అప్డేట్. మరిన్ని వివరాలు తెలుసుకోండి.`;

  // Generate body
  const para1 = hasTelugu
    ? `${cleanTopic}. ఈ వార్త తెలుగు ప్రేక్షకులలో చర్చకు కారణమైంది.`
    : `${aliasStr}${actorNameTe} గురించి ఇటీవల వచ్చిన వార్తలు అభిమానులను ఆకర్షిస్తున్నాయి. ఈ వార్త సోషల్ మీడియాలో ట్రెండ్ అవుతోంది.`;

  const para2 = `ఈ అంశం గురించి మరిన్ని వివరాలు త్వరలో వెల్లడవుతాయని భావిస్తున్నారు. అభిమానులు ఈ వార్త గురించి తమ అభిప్రాయాలు పంచుకుంటున్నారు.`;

  const para3 = `సోషల్ మీడియాలో ఈ టాపిక్ ట్రెండింగ్‌లో ఉంది. నెటిజన్లు వివిధ రకాల రియాక్షన్లు ఇస్తున్నారు. కొందరు సపోర్ట్ చేస్తుండగా, మరికొందరు విమర్శిస్తున్నారు.`;

  const para4 = `మరిన్ని అప్డేట్స్ కోసం మా వెబ్‌సైట్‌ను ఫాలో అవ్వండి. మీ అభిప్రాయాలు కామెంట్స్‌లో తెలియజేయండి.`;

  const body_te = `${para1}\n\n${para2}\n\n${para3}\n\n${para4}`;

  return { title_te, excerpt, body_te };
}

/**
 * Create URL-friendly slug
 */
function createSlug(title: string): string {
  // Transliterate common Telugu words to English
  const translitMap: Record<string, string> = {
    'అల్లు అర్జున్': 'allu-arjun',
    'ప్రభాస్': 'prabhas',
    'రామ్ చరణ్': 'ram-charan',
    'మహేష్ బాబు': 'mahesh-babu',
    'జూనియర్ ఎన్టీఆర్': 'jr-ntr',
    'సమంత': 'samantha',
    'పుష్ప': 'pushpa',
    'సలార్': 'salaar',
    'దేవర': 'devara',
  };

  let slug = title.toLowerCase();

  // Replace Telugu words with English
  for (const [te, en] of Object.entries(translitMap)) {
    slug = slug.replace(te, en);
  }

  // Remove remaining non-ASCII and create slug
  slug = slug
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .slice(0, 50);

  return `${slug}-${Date.now()}`;
}

/**
 * Calculate content confidence score
 */
function calculateConfidence(
  content: { title_te: string; excerpt: string; body_te: string },
  imageUrl: string | null,
  tags: string[]
): number {
  let score = 0.5;

  // Title quality
  if (content.title_te && content.title_te.length > 20) score += 0.1;

  // Excerpt quality
  if (content.excerpt && content.excerpt.length > 50) score += 0.1;

  // Body quality
  const bodyLength = content.body_te?.length || 0;
  if (bodyLength > 500) score += 0.15;
  else if (bodyLength > 300) score += 0.1;

  // Has image
  if (imageUrl) score += 0.1;

  // Has tags
  if (tags.length > 2) score += 0.05;

  return Math.min(1, score);
}

/**
 * Batch generate content for multiple topics
 */
export async function generateBatchContent(topics: string[]): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];

  for (const topic of topics) {
    const content = await generateTeluguContent(topic);
    if (content) {
      results.push(content);
    }
  }

  return results;
}
