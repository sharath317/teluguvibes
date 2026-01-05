/**
 * TEMPLATE VS AI COMPARISON SCRIPT
 * 
 * For testing purposes ONLY - compares template-generated content
 * against AI-generated content to measure quality and identify improvements.
 * 
 * ⚠️ AI content is NEVER published - only used for comparison metrics.
 * 
 * Usage:
 *   pnpm compare:content --celebrity "Samantha" --content-type photoshoot
 *   pnpm compare:content --all --limit 5
 */

import {
  generatePublishableContent,
  TELUGU_STYLE_PROFILES,
  getProfileForContentType,
  type TemplateValues,
} from '../lib/writer-intelligence';
import { calculateTeluguEmotionScore } from '../lib/validation/telugu-emotion';
import { getEnhancedImage } from '../lib/content/telugu-templates';

// ============================================================
// SEED DATA - Real Telugu Entertainment Data
// ============================================================

interface CelebritySeed {
  name: string;
  nameTe: string;
  alias?: string;
  type: 'actor' | 'actress' | 'director';
  recentMovies: string[];
  upcomingMovies: string[];
  imageSearchTerms: string[];
}

interface MovieSeed {
  name: string;
  nameTe: string;
  hero: string;
  heroTe: string;
  director: string;
  directorTe: string;
  status: 'released' | 'upcoming' | 'shooting';
  year: number;
}

interface EventSeed {
  type: string;
  typeTe: string;
  templates: string[];
  templatesTe: string[];
}

// Real Telugu celebrity data for testing
const CELEBRITY_SEEDS: CelebritySeed[] = [
  {
    name: 'Allu Arjun',
    nameTe: 'అల్లు అర్జున్',
    alias: 'Stylish Star',
    type: 'actor',
    recentMovies: ['Pushpa', 'Ala Vaikunthapurramuloo'],
    upcomingMovies: ['Pushpa 2', 'Icon'],
    imageSearchTerms: ['Allu Arjun', 'Pushpa actor', 'Stylish Star Telugu'],
  },
  {
    name: 'Prabhas',
    nameTe: 'ప్రభాస్',
    alias: 'Rebel Star',
    type: 'actor',
    recentMovies: ['Salaar', 'Adipurush', 'Radhe Shyam'],
    upcomingMovies: ['Raja Saab', 'Spirit', 'Salaar 2'],
    imageSearchTerms: ['Prabhas', 'Baahubali actor', 'Rebel Star'],
  },
  {
    name: 'Ram Charan',
    nameTe: 'రామ్ చరణ్',
    alias: 'Mega Power Star',
    type: 'actor',
    recentMovies: ['RRR', 'Acharya'],
    upcomingMovies: ['Game Changer', 'RC16'],
    imageSearchTerms: ['Ram Charan', 'RRR actor', 'Mega Power Star'],
  },
  {
    name: 'Jr NTR',
    nameTe: 'జూనియర్ ఎన్టీఆర్',
    alias: 'Young Tiger',
    type: 'actor',
    recentMovies: ['RRR', 'Devara'],
    upcomingMovies: ['War 2', 'NTR31'],
    imageSearchTerms: ['Jr NTR', 'NTR actor', 'Young Tiger Telugu'],
  },
  {
    name: 'Mahesh Babu',
    nameTe: 'మహేష్ బాబు',
    alias: 'Super Star',
    type: 'actor',
    recentMovies: ['Guntur Kaaram', 'Sarkaru Vaari Paata'],
    upcomingMovies: ['SSMB29', 'SSMB30'],
    imageSearchTerms: ['Mahesh Babu', 'Super Star Telugu', 'Prince Mahesh'],
  },
  {
    name: 'Samantha',
    nameTe: 'సమంత',
    type: 'actress',
    recentMovies: ['Kushi', 'Shaakuntalam', 'Yashoda'],
    upcomingMovies: ['Citadel India'],
    imageSearchTerms: ['Samantha Ruth Prabhu', 'Samantha actress'],
  },
  {
    name: 'Rashmika Mandanna',
    nameTe: 'రష్మిక మందన్న',
    type: 'actress',
    recentMovies: ['Animal', 'Pushpa', 'Varisu'],
    upcomingMovies: ['Pushpa 2', 'The Girlfriend'],
    imageSearchTerms: ['Rashmika Mandanna', 'National Crush India'],
  },
  {
    name: 'Pooja Hegde',
    nameTe: 'పూజా హెగ్డే',
    type: 'actress',
    recentMovies: ['Kisi Ka Bhai Kisi Ki Jaan', 'Radhe Shyam'],
    upcomingMovies: ['Deva'],
    imageSearchTerms: ['Pooja Hegde', 'Pooja Hegde actress'],
  },
  {
    name: 'Sai Pallavi',
    nameTe: 'సాయి పల్లవి',
    type: 'actress',
    recentMovies: ['Virupaksha', 'Gargi'],
    upcomingMovies: ['Thandel'],
    imageSearchTerms: ['Sai Pallavi', 'Sai Pallavi actress'],
  },
  {
    name: 'SS Rajamouli',
    nameTe: 'ఎస్.ఎస్. రాజమౌళి',
    type: 'director',
    recentMovies: ['RRR', 'Baahubali 2'],
    upcomingMovies: ['SSMB29'],
    imageSearchTerms: ['SS Rajamouli', 'Rajamouli director'],
  },
  {
    name: 'Sukumar',
    nameTe: 'సుకుమార్',
    type: 'director',
    recentMovies: ['Pushpa'],
    upcomingMovies: ['Pushpa 2'],
    imageSearchTerms: ['Sukumar director', 'Pushpa director'],
  },
];

const MOVIE_SEEDS: MovieSeed[] = [
  {
    name: 'Pushpa 2: The Rule',
    nameTe: 'పుష్ప 2: ది రూల్',
    hero: 'Allu Arjun',
    heroTe: 'అల్లు అర్జున్',
    director: 'Sukumar',
    directorTe: 'సుకుమార్',
    status: 'upcoming',
    year: 2024,
  },
  {
    name: 'Game Changer',
    nameTe: 'గేమ్ చేంజర్',
    hero: 'Ram Charan',
    heroTe: 'రామ్ చరణ్',
    director: 'Shankar',
    directorTe: 'శంకర్',
    status: 'upcoming',
    year: 2025,
  },
  {
    name: 'Raja Saab',
    nameTe: 'రాజా సాబ్',
    hero: 'Prabhas',
    heroTe: 'ప్రభాస్',
    director: 'Maruthi',
    directorTe: 'మారుతి',
    status: 'shooting',
    year: 2025,
  },
  {
    name: 'Devara Part 1',
    nameTe: 'దేవర పార్ట్ 1',
    hero: 'Jr NTR',
    heroTe: 'జూనియర్ ఎన్టీఆర్',
    director: 'Koratala Siva',
    directorTe: 'కొరటాల శివ',
    status: 'released',
    year: 2024,
  },
  {
    name: 'SSMB29',
    nameTe: 'ఎస్ఎస్ఎంబి29',
    hero: 'Mahesh Babu',
    heroTe: 'మహేష్ బాబు',
    director: 'SS Rajamouli',
    directorTe: 'ఎస్.ఎస్. రాజమౌళి',
    status: 'shooting',
    year: 2026,
  },
];

const EVENT_SEEDS: EventSeed[] = [
  {
    type: 'photoshoot',
    typeTe: 'ఫోటోషూట్',
    templates: ['latest photoshoot viral', 'new look revealed', 'stunning photos released'],
    templatesTe: ['లేటెస్ట్ ఫోటోషూట్ వైరల్', 'కొత్త లుక్ వెల్లడి', 'అద్భుతమైన ఫోటోలు విడుదల'],
  },
  {
    type: 'movie_update',
    typeTe: 'మూవీ అప్‌డేట్',
    templates: ['shooting update', 'first look released', 'teaser announcement'],
    templatesTe: ['షూటింగ్ అప్‌డేట్', 'ఫస్ట్ లుక్ విడుదల', 'టీజర్ ప్రకటన'],
  },
  {
    type: 'box_office',
    typeTe: 'బాక్సాఫీస్',
    templates: ['breaks all records', 'crosses 500 crores', 'creates history'],
    templatesTe: ['అన్ని రికార్డులు బద్దలు', '500 కోట్లు దాటింది', 'చరిత్ర సృష్టించింది'],
  },
  {
    type: 'award',
    typeTe: 'అవార్డ్',
    templates: ['wins best actor', 'receives national award', 'honored at ceremony'],
    templatesTe: ['బెస్ట్ యాక్టర్ అవార్డ్ గెలుచుకున్నారు', 'జాతీయ అవార్డ్ అందుకున్నారు', 'సన్మానం'],
  },
  {
    type: 'personal',
    typeTe: 'వ్యక్తిగత',
    templates: ['celebrates birthday', 'wedding anniversary', 'family moments'],
    templatesTe: ['పుట్టినరోజు వేడుకలు', 'పెళ్లి రోజు', 'కుటుంబ క్షణాలు'],
  },
];

// ============================================================
// AI CONTENT GENERATOR (FOR COMPARISON ONLY)
// ============================================================

async function generateWithAI(
  values: TemplateValues,
  contentType: string
): Promise<{ title: string; body: string; source: 'ai' } | null> {
  const groqKey = process.env.GROQ_API_KEY;
  
  if (!groqKey) {
    console.log('   ⚠️ GROQ_API_KEY not set - skipping AI comparison');
    return null;
  }
  
  const profile = getProfileForContentType(contentType);
  
  const prompt = `You are a Telugu entertainment content writer. Generate a short article in Telugu.

TOPIC: ${values.celebrity_name_te || values.celebrity_name} - ${values.event_te || values.event}
MOVIE: ${values.movie_name_te || values.movie_name || 'N/A'}
STYLE: ${profile.nameEn} (${profile.rhythm} rhythm, ${profile.emotionalIntensity} emotion)
WORD COUNT: ${profile.targetWordCount.min}-${profile.targetWordCount.max} words

Generate JSON with:
{
  "title": "Telugu headline (catchy, emotional)",
  "body": "Telugu article body with 4-6 paragraphs"
}

Rules:
- Use pure Telugu with minimal English
- Match the ${profile.rhythm} rhythm style
- Emotional intensity: ${profile.emotionalIntensity}
- Include fan engagement phrases
- Make it feel authentic and professional`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || 'AI Generated Title',
      body: parsed.body || 'AI Generated Body',
      source: 'ai' as const,
    };
  } catch (error) {
    console.log('   ⚠️ AI generation failed:', error);
    return null;
  }
}

// ============================================================
// COMPARISON LOGIC
// ============================================================

interface ComparisonResult {
  celebrity: string;
  contentType: string;
  template: {
    title: string;
    body: string;
    wordCount: number;
    emotionScore: number;
    confidence: number;
    profile: string;
  };
  ai: {
    title: string;
    body: string;
    wordCount: number;
    emotionScore: number;
  } | null;
  image: {
    url: string;
    source: string;
  } | null;
  comparison: {
    templateBetter: boolean;
    reasons: string[];
    recommendation: string;
  };
}

async function compareContent(
  celebrity: CelebritySeed,
  contentType: string,
  event?: EventSeed
): Promise<ComparisonResult> {
  console.log(`\n🔄 Comparing: ${celebrity.name} - ${contentType}`);
  
  // Build template values
  const movie = celebrity.upcomingMovies[0] || celebrity.recentMovies[0];
  const movieData = MOVIE_SEEDS.find(m => 
    m.hero === celebrity.name || m.name.includes(movie)
  );
  
  const eventData = event || EVENT_SEEDS.find(e => e.type === contentType) || EVENT_SEEDS[0];
  
  const values: TemplateValues = {
    celebrity_name: celebrity.name,
    celebrity_name_te: celebrity.nameTe,
    movie_name: movieData?.name || movie,
    movie_name_te: movieData?.nameTe || movie,
    director_name: movieData?.director,
    director_name_te: movieData?.directorTe,
    event: eventData.templates[0],
    event_te: eventData.templatesTe[0],
  };
  
  // Generate with templates
  console.log('   📝 Generating with templates...');
  const templateResult = await generatePublishableContent(contentType, values);
  
  // Generate with AI (for comparison)
  console.log('   🤖 Generating with AI (comparison only)...');
  const aiResult = await generateWithAI(values, contentType);
  
  // Fetch relevant image
  console.log('   🖼️ Fetching image...');
  const imageResult = await getEnhancedImage(
    `${celebrity.name} ${movieData?.name || ''} ${contentType}`
  );
  
  // Calculate metrics
  const templateEmotionResult = calculateTeluguEmotionScore(templateResult.article.body);
  const aiEmotionResult = aiResult ? calculateTeluguEmotionScore(aiResult.body) : null;
  
  // Compare results
  const reasons: string[] = [];
  let templateBetter = true;
  
  // Comparison criteria
  if (templateResult.article.templateConfidence >= 0.8) {
    reasons.push('Template confidence high (≥80%)');
  }
  
  if (templateEmotionResult.score >= 50) {
    reasons.push(`Good Telugu emotion score: ${templateEmotionResult.score.toFixed(0)}`);
  } else {
    reasons.push(`Low emotion score: ${templateEmotionResult.score.toFixed(0)} - needs improvement`);
  }
  
  if (aiResult && aiEmotionResult) {
    if (templateEmotionResult.score >= aiEmotionResult.score) {
      reasons.push('Template has equal or better emotion than AI');
    } else {
      reasons.push(`AI has higher emotion score (${aiEmotionResult.score.toFixed(0)} vs ${templateEmotionResult.score.toFixed(0)})`);
      templateBetter = false;
    }
  }
  
  if (templateResult.publishingApproval.allowed) {
    reasons.push('Template passed publishing gate');
  }
  
  const recommendation = templateBetter
    ? 'Use template content - meets quality standards'
    : 'Template needs improvement - study AI patterns for learning';
  
  return {
    celebrity: celebrity.name,
    contentType,
    template: {
      title: templateResult.article.title,
      body: templateResult.article.body,
      wordCount: templateResult.article.totalWordCount,
      emotionScore: templateEmotionResult.score,
      confidence: templateResult.article.templateConfidence,
      profile: templateResult.profile.nameEn,
    },
    ai: aiResult ? {
      title: aiResult.title,
      body: aiResult.body,
      wordCount: aiResult.body.split(/\s+/).length,
      emotionScore: aiEmotionResult?.score || 0,
    } : null,
    image: imageResult,
    comparison: {
      templateBetter,
      reasons,
      recommendation,
    },
  };
}

// ============================================================
// DISPLAY FUNCTIONS
// ============================================================

function displayResult(result: ComparisonResult): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  ${result.celebrity.padEnd(30)} │ ${result.contentType.padEnd(20)} ║
╚══════════════════════════════════════════════════════════════════════════════╝

📝 TEMPLATE OUTPUT
${'─'.repeat(80)}
📰 Title: ${result.template.title}

${result.template.body}

   📊 Metrics:
      Word Count: ${result.template.wordCount}
      Emotion Score: ${result.template.emotionScore.toFixed(1)}/100
      Confidence: ${(result.template.confidence * 100).toFixed(1)}%
      Profile: ${result.template.profile}
`);

  if (result.ai) {
    console.log(`
🤖 AI OUTPUT (Comparison Only - NOT FOR PUBLISHING)
${'─'.repeat(80)}
📰 Title: ${result.ai.title}

${result.ai.body}

   📊 Metrics:
      Word Count: ${result.ai.wordCount}
      Emotion Score: ${result.ai.emotionScore.toFixed(1)}/100
`);
  }

  console.log(`
🖼️ IMAGE
${'─'.repeat(80)}
   URL: ${result.image?.url || 'Not found'}
   Source: ${result.image?.source || 'N/A'}

📈 COMPARISON SUMMARY
${'─'.repeat(80)}
   Winner: ${result.comparison.templateBetter ? '✅ TEMPLATE' : '⚠️ AI (for learning only)'}
   
   Reasons:
${result.comparison.reasons.map(r => `      • ${r}`).join('\n')}

   Recommendation: ${result.comparison.recommendation}
`);
}

function displaySummary(results: ComparisonResult[]): void {
  const templateWins = results.filter(r => r.comparison.templateBetter).length;
  const aiWins = results.filter(r => !r.comparison.templateBetter).length;
  
  const avgTemplateEmotion = results.reduce((s, r) => s + r.template.emotionScore, 0) / results.length;
  const avgTemplateConfidence = results.reduce((s, r) => s + r.template.confidence, 0) / results.length;
  
  const aiResults = results.filter(r => r.ai);
  const avgAIEmotion = aiResults.length > 0
    ? aiResults.reduce((s, r) => s + (r.ai?.emotionScore || 0), 0) / aiResults.length
    : 0;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         COMPARISON SUMMARY                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 RESULTS: ${results.length} comparisons

   ✅ Template Wins: ${templateWins} (${((templateWins / results.length) * 100).toFixed(0)}%)
   ⚠️ AI Better (for learning): ${aiWins} (${((aiWins / results.length) * 100).toFixed(0)}%)

📈 AVERAGE METRICS

   Template:
      • Avg Emotion Score: ${avgTemplateEmotion.toFixed(1)}/100
      • Avg Confidence: ${(avgTemplateConfidence * 100).toFixed(1)}%

   AI (comparison only):
      • Avg Emotion Score: ${avgAIEmotion.toFixed(1)}/100

🎯 RECOMMENDATIONS

${templateWins > aiWins 
  ? '   Templates are performing well! Continue using template-first approach.'
  : '   Some templates need improvement. Study AI patterns for:\n' +
    results.filter(r => !r.comparison.templateBetter)
      .map(r => `      • ${r.celebrity} - ${r.contentType}`)
      .join('\n')}

💡 NEXT STEPS
   1. Review low-scoring templates
   2. Add more variation to hook templates
   3. Improve emotion triggers for Telugu audiences
   4. Study successful AI patterns (structure only, not text)
`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  let celebrity: string | undefined;
  let contentType: string | undefined;
  let runAll = false;
  let limit = 5;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--celebrity':
      case '-c':
        celebrity = args[++i];
        break;
      case '--content-type':
      case '-t':
        contentType = args[++i];
        break;
      case '--all':
        runAll = true;
        break;
      case '--limit':
        limit = parseInt(args[++i]) || 5;
        break;
      case '--help':
      case '-h':
        console.log(`
Template vs AI Comparison Script

Usage:
  pnpm compare:content --celebrity "Samantha" --content-type photoshoot
  pnpm compare:content --all --limit 5

Options:
  --celebrity, -c <name>    Celebrity name to compare
  --content-type, -t <type> Content type (photoshoot, movie_update, etc.)
  --all                     Compare multiple celebrities
  --limit <n>               Limit number of comparisons (default: 5)
  --help, -h               Show help
`);
        return;
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║         TEMPLATE VS AI COMPARISON (Testing Only - No Publishing)              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const results: ComparisonResult[] = [];

  if (runAll || !celebrity) {
    // Run multiple comparisons
    const celebrities = CELEBRITY_SEEDS.slice(0, limit);
    const contentTypes = ['movie_update', 'photoshoot', 'award', 'box_office'];
    
    for (const celeb of celebrities) {
      const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const result = await compareContent(celeb, type);
      results.push(result);
      displayResult(result);
    }
  } else {
    // Single comparison
    const celeb = CELEBRITY_SEEDS.find(c => 
      c.name.toLowerCase().includes(celebrity.toLowerCase())
    );
    
    if (!celeb) {
      console.log(`❌ Celebrity "${celebrity}" not found in seed data.`);
      console.log('Available: ' + CELEBRITY_SEEDS.map(c => c.name).join(', '));
      return;
    }
    
    const type = contentType || 'movie_update';
    const result = await compareContent(celeb, type);
    results.push(result);
    displayResult(result);
  }

  // Show summary
  if (results.length > 1) {
    displaySummary(results);
  }

  console.log('\n✅ Comparison complete. Remember: AI content is for learning only, never for publishing.\n');
}

main().catch(console.error);






