/**
 * PURE TEMPLATE TELUGU PARAGRAPH GENERATORS
 * 
 * Generates Telugu content using ONLY templates and learned patterns.
 * NO AI text generation is used.
 * 
 * Templates are designed to:
 * - Match professional Telugu writer patterns
 * - Maintain Telugu nativity and rhythm
 * - Adapt based on performance data
 * - Produce content indistinguishable from human writing
 */

import { 
  StyleProfile, 
  getProfileById, 
  getProfileForContentType,
  recordProfileUsage,
} from './style-profiles';
import { calculateTeluguEmotionScore } from '../validation/telugu-emotion';

// ============================================================
// TYPES
// ============================================================

export interface TemplateValues {
  celebrity_name?: string;
  celebrity_name_te?: string;
  movie_name?: string;
  movie_name_te?: string;
  director_name?: string;
  director_name_te?: string;
  event?: string;
  event_te?: string;
  location?: string;
  location_te?: string;
  date?: string;
  number?: string;
  achievement?: string;
  reaction?: string;
  quote?: string;
  [key: string]: string | undefined;
}

export interface GeneratedParagraph {
  text: string;
  type: 'hook' | 'context' | 'emotion' | 'detail' | 'fan_connect' | 'closing';
  emotionScore: number;
  wordCount: number;
  confidence: number;
}

export interface GeneratedArticle {
  title: string;
  body: string;
  paragraphs: GeneratedParagraph[];
  totalWordCount: number;
  overallEmotionScore: number;
  profileId: string;
  templateConfidence: number;
  generatedAt: Date;
}

// ============================================================
// HOOK TEMPLATES (Opening paragraphs)
// ============================================================

const HOOK_TEMPLATES = {
  mass_commercial: [
    '{celebrity_name_te} అభిమానులకు గుడ్ న్యూస్! {event_te} గురించి మీరు ఎప్పుడూ వినని వార్త వచ్చింది.',
    'మెగా న్యూస్! {celebrity_name_te} మరోసారి సంచలనం సృష్టించబోతున్నారు. {movie_name_te} అప్‌డేట్ చదవండి!',
    '{celebrity_name_te} ఫ్యాన్స్ సిద్ధంగా ఉండండి! {event_te} వార్త మీకోసమే!',
    'ట్రెండింగ్ అలర్ట్! {celebrity_name_te} {event_te} - ఫుల్ డీటైల్స్ లోపల!',
    'బ్రేకింగ్: {celebrity_name_te} {movie_name_te} గురించి భారీ అప్‌డేట్!',
  ],
  
  soft_emotional: [
    '{celebrity_name_te} అభిమానుల హృదయాలను తాకే వార్త వచ్చింది.',
    'ఎంతో ఎదురుచూసిన క్షణం! {celebrity_name_te} {event_te} గురించి తెలుసుకోండి.',
    '{celebrity_name_te} యొక్క ఈ ప్రయాణం మీ హృదయాన్ని తాకుతుంది.',
    'మన {celebrity_name_te} గురించి ఓ అందమైన వార్త!',
    '{celebrity_name_te} - ఈ కథ మీ కళ్ళు చెమర్చేలా చేస్తుంది.',
  ],
  
  neutral_newsroom: [
    '{celebrity_name} {event} అని వార్తలు వెలువడుతున్నాయి.',
    '{location_te}లో {celebrity_name_te} {event_te} జరిగింది.',
    '{date} నాటి {event_te} గురించి మరిన్ని వివరాలు.',
    '{movie_name_te} చిత్రానికి సంబంధించిన తాజా సమాచారం.',
    '{celebrity_name_te} {event_te} - అధికారిక ప్రకటన.',
  ],
  
  glamour_sensual: [
    '{celebrity_name_te} లేటెస్ట్ ఫోటోషూట్ సోషల్ మీడియాలో వైరల్!',
    'అందాల {celebrity_name_te} మరోసారి ఫ్యాన్స్‌ను ఫిదా చేశారు!',
    '{celebrity_name_te} స్టైలిష్ లుక్ ఇంటర్నెట్‌ను షేక్ చేస్తోంది!',
    'వావ్! {celebrity_name_te} గ్లామరస్ ఫోటోస్ చూశారా?',
    '{celebrity_name_te} హాట్ ఫోటోలు - ఫ్యాన్స్ రియాక్షన్ ఏంటో చూడండి!',
  ],
  
  nostalgic_retro: [
    'గుర్తున్నాయా ఆ రోజులు? {celebrity_name_te} {movie_name_te} గురించి మధుర జ్ఞాపకాలు.',
    'క్లాసిక్ మూమెంట్: {celebrity_name_te} {event_te} - నాస్టాల్జియా!',
    'థ్రోబ్యాక్: {celebrity_name_te} ఈ క్షణం ఇప్పటికీ అభిమానుల గుండెల్లో!',
    '{number} సంవత్సరాల క్రితం... {celebrity_name_te} {event_te}.',
    'గోల్డెన్ ఎరా: {celebrity_name_te} {movie_name_te} - మర్చిపోలేని జ్ఞాపకాలు.',
  ],
  
  political_narrative: [
    '{location_te}లో {event_te} - రాజకీయ వర్గాలలో చర్చ.',
    '{celebrity_name} ప్రకటన {event_te} పై ప్రభావం చూపనుంది.',
    'రాజకీయ నేపథ్యంలో {event_te} - విశ్లేషణ.',
    '{event_te} - వివిధ వర్గాల స్పందనలు.',
    '{location_te} రాజకీయాల్లో {event_te} కీలక పరిణామం.',
  ],
  
  devotional_cultural: [
    'భక్తి భావనతో {celebrity_name_te} {event_te}.',
    '{event_te} సందర్భంగా {celebrity_name_te} ఆధ్యాత్మిక అనుభవం.',
    'సంప్రదాయ వైభవం: {event_te} వేడుకలు అద్భుతం!',
    '{celebrity_name_te} భక్తి పూర్వక ప్రార్థనలు - అభిమానులు ఆనందం.',
    'శుభ సందర్భం: {event_te} - సాంస్కృతిక వైభవం.',
  ],
  
  viral_trending: [
    '🔥 వైరల్! {celebrity_name_te} {event_te} - ట్రెండింగ్ టాపిక్!',
    'సోషల్ మీడియా షేకింగ్! {celebrity_name_te} పోస్ట్ వైరల్!',
    '😮 ఇది చూశారా? {celebrity_name_te} {event_te} వైరల్ అవుతోంది!',
    'ట్రెండింగ్ నౌ: {celebrity_name_te} - ఫుల్ స్టోరీ లోపల!',
    'వావ్ మోమెంట్! {celebrity_name_te} {event_te} ఇంటర్నెట్‌లో సంచలనం!',
  ],
};

// ============================================================
// CONTEXT TEMPLATES (Background/Details)
// ============================================================

const CONTEXT_TEMPLATES = {
  movie_update: [
    '{movie_name_te} చిత్రం {director_name_te} దర్శకత్వంలో రూపొందుతోంది. ప్రస్తుతం షూటింగ్ వేగంగా జరుగుతోంది.',
    '{celebrity_name_te} నటిస్తున్న {movie_name_te} సినిమా {date} విడుదల కానుంది.',
    'ఈ సినిమా {celebrity_name_te} కెరీర్‌లో మరో మైలురాయిగా నిలవనుంది.',
    '{movie_name_te} భారీ బడ్జెట్‌తో నిర్మించబడుతోంది. అన్ని డిపార్ట్‌మెంట్లలో టాప్ టెక్నీషియన్లు పని చేస్తున్నారు.',
  ],
  
  celebrity_news: [
    '{celebrity_name_te} తన కెరీర్‌లో ఎన్నో విజయాలు సాధించారు. ఆయన/ఆమె స్టార్ పవర్ ఇప్పటికీ అసమానం.',
    '{celebrity_name} ఇటీవల పలు సక్సెస్‌ఫుల్ ప్రాజెక్ట్స్ చేశారు. అభిమానులు ఆయన/ఆమె ప్రతి కదలికను ఆసక్తిగా ఫాలో అవుతున్నారు.',
    '{celebrity_name_te} సినిమా పరిశ్రమలో తనదైన స్థానాన్ని సంపాదించుకున్నారు.',
  ],
  
  event: [
    '{event_te} {location_te}లో అంగరంగ వైభవంగా జరిగింది. అనేకమంది అభిమానులు హాజరయ్యారు.',
    'ఈ కార్యక్రమంలో {celebrity_name_te} తో పాటు పలువురు ప్రముఖులు పాల్గొన్నారు.',
    '{event_te} సందర్భంగా {celebrity_name_te} అభిమానులతో సంతోషంగా గడిపారు.',
  ],
  
  achievement: [
    '{celebrity_name_te} {achievement} సాధించి అందరినీ ఆశ్చర్యపరిచారు. ఇది ఆయన/ఆమె కష్టానికి ఫలితం.',
    'ఈ {achievement} {celebrity_name_te} కెరీర్‌లో ఓ మైలురాయి. అభిమానులు గర్వపడుతున్నారు.',
    '{number} అవార్డులు, {number} హిట్స్ - {celebrity_name_te} సాధించిన విజయాలు అసాధారణం.',
  ],
};

// ============================================================
// EMOTION TEMPLATES (Emotional engagement)
// ============================================================

const EMOTION_TEMPLATES = {
  excitement: [
    'ఈ వార్త విన్న అభిమానులు ఆనందంతో ఉప్పొంగిపోతున్నారు!',
    'సోషల్ మీడియాలో ఫ్యాన్స్ సెలబ్రేషన్స్ మొదలయ్యాయి!',
    'ఈ అప్‌డేట్ కోసం ఎంతో మంది ఎదురుచూస్తున్నారు!',
    'థియేటర్లలో సెలబ్రేషన్స్ కోసం ఫ్యాన్స్ ఇప్పటి నుండే ప్లాన్ చేస్తున్నారు!',
  ],
  
  pride: [
    '{celebrity_name_te} తెలుగు సినిమాకు గర్వకారణం అని అభిమానులు చెబుతున్నారు.',
    'మన {celebrity_name_te} సాధించిన విజయం చూసి తెలుగు ప్రేక్షకులు గర్వపడుతున్నారు.',
    'ఈ అచీవ్‌మెంట్ తెలుగు సినిమా ఘనత చాటుతోంది!',
  ],
  
  nostalgia: [
    'ఆ రోజుల్లో {celebrity_name_te} {movie_name_te} చూసిన జ్ఞాపకాలు ఇప్పటికీ మన హృదయాల్లో!',
    'ఎన్నో సంవత్సరాలు గడిచినా ఈ క్షణాలు మర్చిపోలేము.',
    'మన చిన్నతనపు మధుర జ్ఞాపకాలు మళ్ళీ గుర్తొస్తున్నాయి!',
  ],
  
  admiration: [
    '{celebrity_name_te} అందం, టాలెంట్ అసమానం. అభిమానులు ఫిదా!',
    'ఎవరూ ఈ స్థాయిలో చేయలేరని ఫ్యాన్స్ కామెంట్ చేస్తున్నారు.',
    '{celebrity_name_te} ప్రతి ప్రాజెక్ట్‌లో తన బెస్ట్ ఇస్తారని నిరూపించారు.',
  ],
};

// ============================================================
// FAN CONNECT TEMPLATES
// ============================================================

const FAN_CONNECT_TEMPLATES = [
  '{celebrity_name_te} అభిమానులారా, మీ అభిప్రాయాలు కామెంట్స్‌లో షేర్ చేయండి!',
  'మీరు కూడా {celebrity_name_te} ఫ్యాన్స్ అయితే ఈ పోస్ట్ లైక్ చేయండి!',
  '{celebrity_name_te} గురించి మీకు ఏం అనిపిస్తుంది? కామెంట్ చేయండి!',
  'ట్రూ ఫ్యాన్స్ ఈ పోస్ట్ షేర్ చేస్తారు! మీరు ట్రూ ఫ్యాన్ అయితే షేర్ చేయండి!',
  '{celebrity_name_te} ఫ్యాన్స్‌కు స్పెషల్ - ఈ న్యూస్ అందరికీ షేర్ చేయండి!',
];

// ============================================================
// CLOSING TEMPLATES
// ============================================================

const CLOSING_TEMPLATES = {
  summary: [
    '{celebrity_name_te} {event_te} గురించి మరిన్ని అప్‌డేట్స్ కోసం మమ్మల్ని ఫాలో అవ్వండి.',
    'ఈ విషయంపై తాజా సమాచారం కోసం TeluguVibes చూస్తుండండి.',
    'మరిన్ని వివరాల కోసం మా వెబ్‌సైట్ రెగ్యులర్‌గా చెక్ చేయండి.',
  ],
  
  call_to_action: [
    '👍 లైక్ చేయండి | 💬 కామెంట్ చేయండి | 🔄 షేర్ చేయండి!',
    'ఈ న్యూస్ నచ్చితే మీ ఫ్రెండ్స్‌కు షేర్ చేయండి!',
    'మరిన్ని ఇంట్రెస్టింగ్ న్యూస్ కోసం ఫాలో చేయండి!',
  ],
  
  emotional_peak: [
    '{celebrity_name_te} ఎప్పటికీ మన హృదయాల్లో! ❤️',
    'ఇలాంటి మొమెంట్స్ కోసమే మనం వేచి చూస్తాం!',
    '{celebrity_name_te} - ఎవర్ గ్రీన్ స్టార్! 🌟',
  ],
  
  open_ended: [
    'ఈ విషయంపై మీ అభిప్రాయం ఏంటి?',
    'ఇంకా ఏం జరుగుతుందో చూడాలి...',
    'రాబోయే రోజుల్లో మరిన్ని ఆసక్తికర అప్‌డేట్స్ వచ్చే అవకాశం ఉంది.',
  ],
};

// ============================================================
// PARAGRAPH GENERATION
// ============================================================

/**
 * Fill template with values
 */
function fillTemplate(template: string, values: TemplateValues): string {
  let filled = template;
  
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }
  
  // Remove unfilled placeholders
  filled = filled.replace(/\{[^}]+\}/g, '');
  
  return filled.trim();
}

/**
 * Select random template from array
 */
function selectTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate hook paragraph
 */
export function generateHook(
  profileId: string,
  values: TemplateValues
): GeneratedParagraph {
  const profile = getProfileById(profileId);
  const templates = HOOK_TEMPLATES[profileId as keyof typeof HOOK_TEMPLATES] || HOOK_TEMPLATES.neutral_newsroom;
  
  const template = selectTemplate(templates);
  const text = fillTemplate(template, values);
  const emotionResult = calculateTeluguEmotionScore(text);
  
  return {
    text,
    type: 'hook',
    emotionScore: emotionResult.score,
    wordCount: text.split(/\s+/).length,
    confidence: 0.85,
  };
}

/**
 * Generate context paragraph
 */
export function generateContext(
  contentType: string,
  values: TemplateValues
): GeneratedParagraph {
  let templates: string[];
  
  if (contentType.includes('movie')) {
    templates = CONTEXT_TEMPLATES.movie_update;
  } else if (contentType.includes('achievement') || contentType.includes('award')) {
    templates = CONTEXT_TEMPLATES.achievement;
  } else if (contentType.includes('event') || contentType.includes('function')) {
    templates = CONTEXT_TEMPLATES.event;
  } else {
    templates = CONTEXT_TEMPLATES.celebrity_news;
  }
  
  const template = selectTemplate(templates);
  const text = fillTemplate(template, values);
  const emotionResult = calculateTeluguEmotionScore(text);
  
  return {
    text,
    type: 'context',
    emotionScore: emotionResult.score,
    wordCount: text.split(/\s+/).length,
    confidence: 0.8,
  };
}

/**
 * Generate emotion paragraph
 */
export function generateEmotion(
  emotionType: 'excitement' | 'pride' | 'nostalgia' | 'admiration',
  values: TemplateValues
): GeneratedParagraph {
  const templates = EMOTION_TEMPLATES[emotionType] || EMOTION_TEMPLATES.excitement;
  const template = selectTemplate(templates);
  const text = fillTemplate(template, values);
  const emotionResult = calculateTeluguEmotionScore(text);
  
  return {
    text,
    type: 'emotion',
    emotionScore: emotionResult.score,
    wordCount: text.split(/\s+/).length,
    confidence: 0.85,
  };
}

/**
 * Generate fan connect paragraph
 */
export function generateFanConnect(values: TemplateValues): GeneratedParagraph {
  const template = selectTemplate(FAN_CONNECT_TEMPLATES);
  const text = fillTemplate(template, values);
  const emotionResult = calculateTeluguEmotionScore(text);
  
  return {
    text,
    type: 'fan_connect',
    emotionScore: emotionResult.score,
    wordCount: text.split(/\s+/).length,
    confidence: 0.9,
  };
}

/**
 * Generate closing paragraph
 */
export function generateClosing(
  closingType: 'summary' | 'call_to_action' | 'emotional_peak' | 'open_ended',
  values: TemplateValues
): GeneratedParagraph {
  const templates = CLOSING_TEMPLATES[closingType] || CLOSING_TEMPLATES.summary;
  const template = selectTemplate(templates);
  const text = fillTemplate(template, values);
  const emotionResult = calculateTeluguEmotionScore(text);
  
  return {
    text,
    type: 'closing',
    emotionScore: emotionResult.score,
    wordCount: text.split(/\s+/).length,
    confidence: 0.9,
  };
}

// ============================================================
// FULL ARTICLE GENERATION
// ============================================================

/**
 * Generate complete article using templates only
 */
export function generateTemplateArticle(
  contentType: string,
  values: TemplateValues,
  options?: {
    profileId?: string;
    includeEmoji?: boolean;
    targetWordCount?: number;
  }
): GeneratedArticle {
  // Get appropriate profile
  const profile = options?.profileId 
    ? getProfileById(options.profileId) 
    : getProfileForContentType(contentType);
  
  if (!profile) {
    throw new Error(`No profile found for content type: ${contentType}`);
  }
  
  const paragraphs: GeneratedParagraph[] = [];
  
  // 1. Generate hook
  const hook = generateHook(profile.id, values);
  paragraphs.push(hook);
  
  // 2. Generate context (1-2 paragraphs based on profile)
  const context1 = generateContext(contentType, values);
  paragraphs.push(context1);
  
  if (profile.targetWordCount.max > 300) {
    const context2 = generateContext(contentType, values);
    paragraphs.push(context2);
  }
  
  // 3. Generate emotion
  let emotionType: 'excitement' | 'pride' | 'nostalgia' | 'admiration' = 'excitement';
  if (profile.id === 'nostalgic_retro') emotionType = 'nostalgia';
  else if (profile.emotionalIntensity === 'high') emotionType = 'pride';
  
  const emotion = generateEmotion(emotionType, values);
  paragraphs.push(emotion);
  
  // 4. Generate fan connect (if appropriate)
  if (profile.platformSections.includes('entertainment') || profile.platformSections.includes('hot')) {
    const fanConnect = generateFanConnect(values);
    paragraphs.push(fanConnect);
  }
  
  // 5. Generate closing
  const closing = generateClosing(profile.closingPattern as any, values);
  paragraphs.push(closing);
  
  // Combine paragraphs
  const body = paragraphs.map(p => p.text).join('\n\n');
  const totalWordCount = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
  const overallEmotionScore = paragraphs.reduce((sum, p) => sum + p.emotionScore, 0) / paragraphs.length;
  const templateConfidence = paragraphs.reduce((sum, p) => sum + p.confidence, 0) / paragraphs.length;
  
  // Generate title
  const titleTemplates = [
    `${values.celebrity_name_te || values.celebrity_name} - ${values.event_te || values.event}`,
    `${values.celebrity_name_te || values.celebrity_name} ${values.movie_name_te || values.movie_name || ''} అప్‌డేట్!`,
    `${values.event_te || values.event} - ${values.celebrity_name_te || values.celebrity_name}`,
  ].filter(t => t.trim().length > 5);
  
  const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)] || 
    `${values.celebrity_name_te || values.celebrity_name} తాజా వార్త`;
  
  // Record usage
  recordProfileUsage(profile.id, true, overallEmotionScore);
  
  return {
    title,
    body,
    paragraphs,
    totalWordCount,
    overallEmotionScore,
    profileId: profile.id,
    templateConfidence,
    generatedAt: new Date(),
  };
}

/**
 * Generate article with profile-specific structure
 */
export function generateArticleWithProfile(
  profile: StyleProfile,
  values: TemplateValues,
  contentType: string
): GeneratedArticle {
  return generateTemplateArticle(contentType, values, { profileId: profile.id });
}

// ============================================================
// TEMPLATE STATS
// ============================================================

export function getTemplateStats(): {
  totalHookTemplates: number;
  totalContextTemplates: number;
  totalEmotionTemplates: number;
  totalClosingTemplates: number;
  profileCoverage: string[];
} {
  return {
    totalHookTemplates: Object.values(HOOK_TEMPLATES).flat().length,
    totalContextTemplates: Object.values(CONTEXT_TEMPLATES).flat().length,
    totalEmotionTemplates: Object.values(EMOTION_TEMPLATES).flat().length,
    totalClosingTemplates: Object.values(CLOSING_TEMPLATES).flat().length,
    profileCoverage: Object.keys(HOOK_TEMPLATES),
  };
}

export default {
  generateHook,
  generateContext,
  generateEmotion,
  generateFanConnect,
  generateClosing,
  generateTemplateArticle,
  generateArticleWithProfile,
  getTemplateStats,
  HOOK_TEMPLATES,
  CONTEXT_TEMPLATES,
  EMOTION_TEMPLATES,
  CLOSING_TEMPLATES,
  FAN_CONNECT_TEMPLATES,
};






