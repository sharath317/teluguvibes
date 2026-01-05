/**
 * TEMPLATE-BASED MOVIE REVIEW GENERATOR
 * 
 * Generates fallback reviews using templates when AI reviews are unavailable.
 * NO AI TEXT GENERATION - pure template composition.
 * 
 * Priority order:
 * 1. Has TMDB + IMDb ratings → Calculate weighted dimension scores
 * 2. Has only TMDB rating → Estimate with genre baselines
 * 3. Has cast/crew data → Infer from comparable movies
 * 4. Minimal data → Generate minimal template review
 */

import { createClient } from '@supabase/supabase-js';
import { Movie, DIMENSION_DEFINITIONS } from './coverage-engine';

// ============================================================
// TYPES
// ============================================================

export interface TemplateDimension {
  name: string;
  name_te: string;
  score: number;
  analysis_te: string;
  confidence: number;
}

export interface TemplateReview {
  movie_id: string;
  movie_title: string;
  movie_title_te?: string;
  dimensions: Record<string, TemplateDimension>;
  overall_score: number;
  verdict: string;
  verdict_te: string;
  one_liner_te: string;
  one_liner_en: string;
  strengths: string[];
  weaknesses: string[];
  source: 'template_fallback';
  confidence: number;
  data_quality: 'high' | 'medium' | 'low' | 'minimal';
  generated_at: string;
  
  // Phase 5.1: Structured sections for enhanced reviews
  best_scenes?: string[];
  performance_highlights?: PerformanceHighlight[];
  watch_recommendation?: WatchRecommendation;
  
  // Entity links for knowledge graph
  linked_celebrities?: LinkedCelebrity[];
  linked_movies?: LinkedMovie[];  // Similar movies with confidence
  
  // v2.0: Why Watch / Why Skip sections
  why_watch?: string[];    // 3-5 bullet points
  why_skip?: string[];     // 2-3 honest negatives
  critic_audience_gap?: {
    critic_lean: 'positive' | 'negative' | 'neutral';
    audience_lean: 'positive' | 'negative' | 'neutral';
    divergence_note?: string;
  };
  cultural_context?: string;  // For classics
  production_notes?: {
    budget_tier: 'low' | 'medium' | 'high' | 'mega';
    shooting_locations?: string[];
    production_duration?: string;
  };
}

// Phase 5.1: Performance highlight for individual actors
export interface PerformanceHighlight {
  actor: string;
  role: string;
  note_te: string;
  note_en: string;
}

// Phase 5.1: Watch recommendation with context
export interface WatchRecommendation {
  recommended: boolean;
  audience: 'family' | 'youth' | 'mass' | 'class' | 'all';
  best_for: string;
  skip_if: string | null;
}

// Phase 5.1: Linked celebrity reference
export interface LinkedCelebrity {
  name: string;
  role_in_movie: 'hero' | 'heroine' | 'villain' | 'director' | 'music' | 'support';
  tmdb_person_id?: number;
}

// Phase 5.1: Similar movie link with confidence
export interface LinkedMovie {
  movie_id: string;
  title: string;
  similarity_score: number;
  reason: string;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

// ============================================================
// TELUGU VERDICT TEMPLATES
// ============================================================

const VERDICT_TEMPLATES = {
  masterpiece: {
    verdict: 'masterpiece',
    verdict_te: 'అద్భుతం',
    one_liner_te: '{title_te} తెలుగు సినిమా చరిత్రలో ఒక మైలురాయి!',
    one_liner_en: '{title_en} is a landmark in Telugu cinema history!',
  },
  excellent: {
    verdict: 'excellent',
    verdict_te: 'అత్యుత్తమం',
    one_liner_te: '{title_te} ఖచ్చితంగా చూడాల్సిన సినిమా!',
    one_liner_en: '{title_en} is a must-watch!',
  },
  good: {
    verdict: 'good',
    verdict_te: 'బాగుంది',
    one_liner_te: '{title_te} వన్ టైమ్ వాచ్‌గా బాగుంది!',
    one_liner_en: '{title_en} is a good one-time watch!',
  },
  average: {
    verdict: 'average',
    verdict_te: 'సగటు',
    one_liner_te: '{title_te} సగటు సినిమా, ఎక్స్‌పెక్టేషన్స్ పెట్టుకోకుండా చూడండి.',
    one_liner_en: '{title_en} is an average film, watch without high expectations.',
  },
  below_average: {
    verdict: 'below_average',
    verdict_te: 'సగటు కంటే తక్కువ',
    one_liner_te: '{title_te} నిరాశ పరిచింది, మెరుగైన స్క్రిప్ట్ అవసరం.',
    one_liner_en: '{title_en} disappoints and needed a better script.',
  },
  poor: {
    verdict: 'poor',
    verdict_te: 'బలహీనం',
    one_liner_te: '{title_te} అభిమానులను నిరాశపరిచింది.',
    one_liner_en: '{title_en} fails to meet expectations.',
  },
};

// ============================================================
// GENRE-SPECIFIC TEMPLATES
// ============================================================

const GENRE_ANALYSIS_TEMPLATES: Record<string, Record<string, string[]>> = {
  Action: {
    story_screenplay: [
      'యాక్షన్ సీక్వెన్సులు బాగున్నాయి, కానీ కథలో కొత్తదనం లేదు.',
      'హై-ఆక్టేన్ యాక్షన్ తో పాటు ఆసక్తికరమైన స్క్రీన్‌ప్లే.',
      'యాక్షన్ బ్లాక్స్ హైలైట్, కథ సాధారణం.',
    ],
    direction: [
      'యాక్షన్ సీన్లలో దర్శకుడి పనితనం కనిపిస్తుంది.',
      'స్టైలిష్ మేకింగ్, విజువల్ ట్రీట్.',
      'పేసింగ్ బాగుంది, మసాలా ఎలిమెంట్స్ బాలెన్స్.',
    ],
    dialogues_punchlines: [
      'మాస్ డైలాగులు ఎలివేషన్ ఇచ్చాయి, ఫ్యాన్స్ థియేటర్లో ఆనందించారు.',
      'పంచ్ డైలాగులు ఓకే, కొన్ని హిట్ అయ్యాయి.',
      'డైలాగులు సగటం, పంచ్‌లు వర్క్ అవ్వలేదు.',
    ],
    music_bgm: [
      'BGM మాస్ మూమెంట్స్‌ను ఎలివేట్ చేసింది.',
      'బ్యాక్‌గ్రౌండ్ స్కోర్ థ్రిల్లింగ్‌గా ఉంది.',
      'పాటలు సగటు, BGM హైలైట్.',
    ],
    action_choreography: [
      'ఫైట్ సీక్వెన్సులు హాలీవుడ్ స్టాండర్డ్‌లో ఉన్నాయి, స్టంట్ వర్క్ అద్భుతం.',
      'యాక్షన్ బ్లాక్స్ మాస్ ఆడియెన్స్‌ను థ్రిల్ చేస్తాయి.',
      'స్టంట్స్ సేఫ్‌గా కానీ ఇంప్రెసివ్‌గా ఉన్నాయి.',
    ],
    vfx_special_effects: [
      'VFX వర్క్ వరల్డ్ క్లాస్, విజువల్ ఎక్స్‌పీరియన్స్ అద్భుతం.',
      'స్పెషల్ ఎఫెక్ట్స్ సినిమాను ఎలివేట్ చేశాయి.',
      'VFX సీన్లు అప్పుడప్పుడు కృత్రిమంగా కనిపిస్తాయి.',
    ],
    production_design: [
      'సెట్స్ మరియు కాస్ట్యూమ్స్ గ్రాండ్‌గా ఉన్నాయి.',
      'ప్రొడక్షన్ వాల్యూస్ మంచిగా ఉన్నాయి.',
      'బడ్జెట్ కన్‌స్ట్రెయింట్స్ కనిపిస్తున్నాయి.',
    ],
    comedy_timing: [
      'యాక్షన్ మధ్యలో కామెడీ రిలీఫ్ బాగా వర్క్ అయ్యింది.',
      'కామెడీ ట్రాక్ ఓకే, కొన్ని సీన్లు నవ్వించాయి.',
      'కామెడీ ఫోర్స్‌డ్‌గా అనిపించింది.',
    ],
  },
  Romance: {
    story_screenplay: [
      'ప్రేమ కథ హృద్యంగా ఉంది, ఎమోషనల్ మూమెంట్స్ బాగున్నాయి.',
      'సింపుల్ లవ్ స్టోరీ, ఫీల్ గుడ్ వైబ్స్.',
      'ప్రేమికులకు నచ్చే కథ, కొత్తదనం లేదు.',
    ],
    direction: [
      'రొమాంటిక్ సీన్లు అందంగా తీశారు.',
      'ఎమోషన్స్ బాగా క్యాప్చర్ చేశారు.',
      'లొకేషన్స్ అందంగా ఉన్నాయి.',
    ],
    dialogues_punchlines: [
      'రొమాంటిక్ డైలాగులు హృదయాన్ని తాకుతాయి, కోటబుల్ లైన్స్ ఉన్నాయి.',
      'ప్రేమ సంభాషణలు బాగున్నాయి.',
      'డైలాగులు సగటం, డెప్త్ తక్కువ.',
    ],
    music_bgm: [
      'మెలోడియస్ సాంగ్స్ హైలైట్.',
      'పాటలు హిట్ అయ్యే ఛాన్స్ ఉంది.',
      'రొమాంటిక్ BGM బాగుంది.',
    ],
    production_design: [
      'లొకేషన్స్ మరియు కాస్ట్యూమ్స్ రొమాంటిక్ వైబ్ క్రియేట్ చేశాయి.',
      'సెట్స్ అందంగా ఉన్నాయి.',
      'ప్రొడక్షన్ సగటం.',
    ],
    comedy_timing: [
      'లైట్ కామెడీ మూమెంట్స్ రిఫ్రెషింగ్‌గా ఉన్నాయి.',
      'కామెడీ ట్రాక్ ఓకే.',
      'కామెడీ అవసరం లేకుండా ఉండేది.',
    ],
  },
  Drama: {
    story_screenplay: [
      'కథ గట్టిగా ఉంది, క్యారెక్టర్ డెవలప్‌మెంట్ బాగుంది.',
      'ఎమోషనల్ డ్రామా బాగా వర్క్ అయ్యింది.',
      'ఫ్యామిలీ సెంటిమెంట్స్ టచ్ చేస్తాయి.',
    ],
    direction: [
      'దర్శకుడు ఎమోషన్స్ బాగా హ్యాండిల్ చేశారు.',
      'నేరేటివ్ పద్ధతి ఆసక్తికరంగా ఉంది.',
      'స్లో బర్న్ డ్రామా, పేషెన్స్ అవసరం.',
    ],
    dialogues_punchlines: [
      'ఎమోషనల్ డైలాగులు హృదయాన్ని కదిలిస్తాయి, మెమొరబుల్ లైన్స్ ఉన్నాయి.',
      'డైలాగులు సిచ్యుయేషన్‌కు తగ్గట్టుగా ఉన్నాయి.',
      'కొన్ని డైలాగులు ఓవర్‌గా అనిపించాయి.',
    ],
    music_bgm: [
      'బ్యాక్‌గ్రౌండ్ స్కోర్ ఎమోషన్స్‌ను సపోర్ట్ చేసింది.',
      'పాటలు సందర్భోచితంగా ఉన్నాయి.',
      'సంగీతం సినిమాకు తగ్గట్టుగా ఉంది.',
    ],
    production_design: [
      'పీరియడ్ సెట్టింగ్ ఆథెంటిక్‌గా ఉంది.',
      'కాస్ట్యూమ్స్ మరియు సెట్స్ కథకు తగ్గట్టుగా ఉన్నాయి.',
      'ప్రొడక్షన్ సగటం.',
    ],
  },
  Comedy: {
    story_screenplay: [
      'కామెడీ పంచ్‌లు బాగా వర్క్ అయ్యాయి.',
      'ఎంటర్‌టైనర్‌గా బాగా పాస్ అయ్యింది.',
      'కామెడీ టైమింగ్ హైలైట్.',
    ],
    direction: [
      'కామెడీ సీన్లలో దర్శకుడి టైమింగ్ సెన్స్ బాగుంది.',
      'లైట్-హార్టెడ్ ట్రీట్‌మెంట్.',
      'ఎంటర్‌టైన్‌మెంట్ క్వోషియంట్ హై.',
    ],
    dialogues_punchlines: [
      'పంచ్ డైలాగులు థియేటర్‌లో నవ్వుల వర్షం కురిపించాయి.',
      'కామెడీ పంచ్‌లు బాగా వర్క్ అయ్యాయి.',
      'కొన్ని పంచ్‌లు మిస్ అయ్యాయి.',
    ],
    music_bgm: [
      'ఫన్ పాటలు బాగున్నాయి.',
      'BGM కామెడీ సీన్లకు తగ్గట్టుగా ఉంది.',
      'క్యాచీ సాంగ్స్.',
    ],
    comedy_timing: [
      'కామెడీ టైమింగ్ పర్ఫెక్ట్, నవ్వులు గ్యారంటీ.',
      'పంచ్‌లు బాగా వర్క్ అయ్యాయి.',
      'కామెడీ సీన్లు మిస్ అయ్యాయి.',
    ],
  },
  Thriller: {
    story_screenplay: [
      'థ్రిల్లర్ ఎలిమెంట్స్ బాగా వర్క్ అయ్యాయి, ట్విస్ట్స్ షాక్ చేస్తాయి.',
      'సస్పెన్స్ బాగా మెయింటెయిన్ అయ్యింది.',
      'క్లైమాక్స్ ఊహించగలిగాం, సర్‌ప్రైజ్ లేదు.',
    ],
    direction: [
      'దర్శకుడు టెన్షన్ బాగా బిల్ట్ చేశారు.',
      'పేసింగ్ క్రిస్ప్‌గా ఉంది.',
      'సస్పెన్స్ కొన్ని చోట్ల లీక్ అయ్యింది.',
    ],
    dialogues_punchlines: [
      'ఇంటెన్స్ డైలాగులు థ్రిల్ క్రియేట్ చేశాయి.',
      'డైలాగులు సిచ్యుయేషన్‌కు తగ్గట్టుగా ఉన్నాయి.',
      'డైలాగులు సగటం.',
    ],
    editing_pacing: [
      'ఎడిటింగ్ షార్ప్‌గా ఉంది, పేసింగ్ థ్రిల్లింగ్.',
      'ఎడిటింగ్ బాగుంది, కొన్ని స్లో మూమెంట్స్ ఉన్నాయి.',
      'ఎడిటింగ్ మెరుగుపడాలి.',
    ],
    vfx_special_effects: [
      'థ్రిల్ సీన్లలో VFX బాగా వర్క్ అయ్యింది.',
      'VFX ఓకే.',
      'VFX అవసరం లేదు.',
    ],
  },
  Horror: {
    story_screenplay: [
      'హారర్ ఎలిమెంట్స్ భయపెట్టాయి, కథ ఆసక్తికరంగా ఉంది.',
      'జంప్ స్కేర్స్ వర్క్ అయ్యాయి.',
      'హారర్ క్లిషేలు ఎక్కువ.',
    ],
    direction: [
      'అట్మాస్ఫియర్ బిల్డింగ్ బాగుంది.',
      'హారర్ సీన్లు ఎఫెక్టివ్‌గా ఉన్నాయి.',
      'హారర్ ఫీల్ తక్కువగా ఉంది.',
    ],
    vfx_special_effects: [
      'VFX హారర్ ఎలిమెంట్స్‌ను రియలిస్టిక్‌గా చూపించింది.',
      'స్పెషల్ ఎఫెక్ట్స్ ఓకే.',
      'VFX చీప్‌గా కనిపించింది.',
    ],
    production_design: [
      'సెట్స్ క్రీపీ అట్మాస్ఫియర్ క్రియేట్ చేశాయి.',
      'ప్రొడక్షన్ హారర్ మూడ్‌కు తగ్గట్టుగా ఉంది.',
      'సెట్స్ కన్‌వెన్షనల్‌గా ఉన్నాయి.',
    ],
  },
  Fantasy: {
    story_screenplay: [
      'ఫాంటసీ వరల్డ్ బిల్డింగ్ అద్భుతం.',
      'ఇమాజినేటివ్ స్టోరీ లైన్.',
      'ఫాంటసీ ఎలిమెంట్స్ కన్ఫ్యూజింగ్.',
    ],
    vfx_special_effects: [
      'VFX వరల్డ్ క్లాస్, ఫాంటసీ వరల్డ్ లైఫ్‌లా కనిపించింది.',
      'VFX బాగుంది, కొన్ని షాట్స్ అద్భుతం.',
      'VFX క్వాలిటీ మిక్స్‌డ్.',
    ],
    production_design: [
      'ప్రొడక్షన్ డిజైన్ గ్రాండియోస్, వరల్డ్ బిల్డింగ్ అద్భుతం.',
      'సెట్స్ మరియు కాస్ట్యూమ్స్ ఇంప్రెసివ్.',
      'ప్రొడక్షన్ సగటం.',
    ],
    action_choreography: [
      'ఫాంటసీ యాక్షన్ సీన్లు స్పెక్టాక్యులర్.',
      'యాక్షన్ బ్లాక్స్ ఓకే.',
      'యాక్షన్ కొరియోగ్రఫీ మెరుగుపడాలి.',
    ],
  },
  Period: {
    story_screenplay: [
      'చారిత్రక కథ ఆథెంటిక్‌గా చెప్పారు.',
      'పీరియడ్ సెట్టింగ్ బాగుంది.',
      'హిస్టారికల్ యాక్యురసీ తక్కువ.',
    ],
    production_design: [
      'పీరియడ్ సెట్స్ మరియు కాస్ట్యూమ్స్ అద్భుతం, డీటెయిల్ వర్క్ ప్రశంసనీయం.',
      'ప్రొడక్షన్ వాల్యూస్ హై.',
      'పీరియడ్ ఫీల్ కన్సిస్టెంట్‌గా లేదు.',
    ],
    cinematography: [
      'గ్రాండ్ విజువల్స్, ఎపిక్ స్కేల్.',
      'కెమెరా వర్క్ ఇంప్రెసివ్.',
      'విజువల్స్ ఓకే.',
    ],
    action_choreography: [
      'పీరియడ్ వార్ సీక్వెన్సులు స్పెక్టాక్యులర్.',
      'యాక్షన్ బాగుంది.',
      'యాక్షన్ కొరియోగ్రఫీ మెరుగుపడాలి.',
    ],
    dialogues_punchlines: [
      'చారిత్రక డైలాగులు పవర్‌ఫుల్, కోటబుల్ లైన్స్ ఉన్నాయి.',
      'డైలాగులు పీరియడ్‌కు తగ్గట్టుగా ఉన్నాయి.',
      'డైలాగులు మోడర్న్‌గా అనిపించాయి.',
    ],
  },
};

// Default templates for any genre (15-dimension model v2.0)
const DEFAULT_ANALYSIS_TEMPLATES: Record<string, string[]> = {
  story_screenplay: [
    'కథ ఆసక్తికరంగా ఉంది.',
    'స్క్రీన్‌ప్లే సాధారణం.',
    'కథలో కొన్ని హైలైట్ మూమెంట్స్ ఉన్నాయి.',
  ],
  direction: [
    'దర్శకుడి ప్రయత్నం కనిపిస్తుంది.',
    'సినిమాటిక్ మేకింగ్ బాగుంది.',
    'కొన్ని సీన్లలో మెరుగుపడాల్సిన అవసరం ఉంది.',
  ],
  dialogues_punchlines: [
    'డైలాగులు పవర్‌ఫుల్, కోటబుల్ లైన్స్ ఉన్నాయి.',
    'డైలాగులు సిచ్యుయేషన్‌కు తగ్గట్టుగా ఉన్నాయి.',
    'డైలాగులు సగటం, ఇంపాక్ట్ తక్కువ.',
  ],
  acting_lead: [
    'హీరో/హీరోయిన్ నటన బాగుంది.',
    'లీడ్ యాక్టర్ పెర్ఫార్మెన్స్ హైలైట్.',
    'ప్రధాన పాత్రధారి తన వంతు కృషి చేశారు.',
  ],
  acting_supporting: [
    'సహాయ నటీనటులు మంచి సపోర్ట్ ఇచ్చారు.',
    'కమేడియన్ పంచ్‌లు బాగున్నాయి.',
    'సపోర్టింగ్ క్యాస్ట్ సగటం.',
  ],
  music_bgm: [
    'సంగీతం సినిమాకు తగ్గట్టుగా ఉంది.',
    'పాటలు ఓకే, BGM బాగుంది.',
    'మ్యూజిక్ డైరెక్టర్ మంచి పని చేశారు.',
  ],
  cinematography: [
    'విజువల్స్ అందంగా ఉన్నాయి.',
    'కెమెరా వర్క్ బాగుంది.',
    'లొకేషన్స్, లైటింగ్ హైలైట్.',
  ],
  action_choreography: [
    'యాక్షన్ సీన్లు ఇంప్రెసివ్‌గా ఉన్నాయి.',
    'ఫైట్ సీక్వెన్సులు ఓకే.',
    'యాక్షన్ కొరియోగ్రఫీ సగటం.',
  ],
  vfx_special_effects: [
    'VFX వర్క్ బాగుంది.',
    'స్పెషల్ ఎఫెక్ట్స్ ఓకే.',
    'VFX సగటం, మెరుగుపడాలి.',
  ],
  editing_pacing: [
    'ఎడిటింగ్ క్రిస్ప్‌గా ఉంది.',
    'పేసింగ్ కొన్ని చోట్ల స్లో అవుతుంది.',
    'రన్‌టైమ్ తగ్గించి ఉంటే బాగుండేది.',
  ],
  production_design: [
    'ప్రొడక్షన్ వాల్యూస్ హై, అట్టెన్షన్ టు డీటెయిల్ బాగుంది.',
    'సెట్స్ మరియు కాస్ట్యూమ్స్ ఓకే.',
    'ప్రొడక్షన్ సగటం.',
  ],
  emotional_impact: [
    'ఎమోషనల్ సీన్లు టచ్ చేస్తాయి.',
    'కొన్ని మూమెంట్స్ హృదయాన్ని కదిలిస్తాయి.',
    'ఎమోషన్ కనెక్ట్ సగటం.',
  ],
  comedy_timing: [
    'కామెడీ బాగా వర్క్ అయ్యింది, నవ్వులు గ్యారంటీ.',
    'కామెడీ ట్రాక్ ఓకే.',
    'కామెడీ ఫోర్స్‌డ్‌గా అనిపించింది.',
  ],
  rewatch_value: [
    'ఒకసారి చూడొచ్చు.',
    'ఫ్యామిలీతో కలిసి చూడొచ్చు.',
    'మళ్ళీ చూడాలనిపించదు.',
  ],
  mass_vs_class: [
    'మాస్ ఆడియెన్స్‌కు నచ్చుతుంది.',
    'క్లాస్ ఆడియెన్స్ ఎంజాయ్ చేస్తారు.',
    'ఆల్ క్లాస్ ఆడియెన్స్‌కు తగ్గట్టుగా ఉంది.',
  ],
};

// ============================================================
// SCORE CALCULATION
// ============================================================

/**
 * Calculate dimension scores from available ratings (15-dimension model v2.0)
 */
function calculateDimensionScores(movie: Movie): Record<string, number> {
  // Start with base rating
  const baseRating = movie.tmdb_rating || movie.imdb_rating || movie.our_rating || 6.0;
  
  // Normalize to 0-10 scale
  const normalizedBase = Math.min(10, Math.max(0, baseRating));
  
  // Apply variance based on genre and available data
  const scores: Record<string, number> = {};
  const variance = 0.8; // ±0.8 variance
  const genres = movie.genres || [];
  
  for (const key of Object.keys(DIMENSION_DEFINITIONS)) {
    // Base score with small variance
    let score = normalizedBase + (Math.random() * variance * 2 - variance);
    
    // Apply genre-specific adjustments for original dimensions
    if (genres.includes('Action') && key === 'cinematography') {
      score += 0.5;
    }
    if (genres.includes('Romance') && key === 'emotional_impact') {
      score += 0.5;
    }
    if (genres.includes('Comedy') && key === 'acting_supporting') {
      score += 0.3;
    }
    
    // NEW: Genre-specific adjustments for new dimensions
    // Action Choreography
    if (key === 'action_choreography') {
      if (genres.includes('Action') || genres.includes('Thriller')) {
        score += 0.5; // Boost for action films
      } else if (!genres.includes('Fantasy') && !genres.includes('Period')) {
        score = 5; // N/A for non-action films
      }
    }
    
    // VFX & Special Effects
    if (key === 'vfx_special_effects') {
      if (genres.includes('Fantasy') || genres.includes('Sci-Fi') || genres.includes('Horror')) {
        score += 0.5;
      } else if (genres.includes('Drama') || genres.includes('Romance')) {
        score = 5; // N/A for non-VFX heavy films
      }
    }
    
    // Dialogues & Punchlines
    if (key === 'dialogues_punchlines') {
      if (genres.includes('Action') || genres.includes('Comedy')) {
        score += 0.3; // Mass dialogues are important
      }
      if (genres.includes('Drama')) {
        score += 0.2; // Emotional dialogues
      }
    }
    
    // Comedy Timing
    if (key === 'comedy_timing') {
      if (genres.includes('Comedy')) {
        score += 0.5; // Primary focus
      } else if (genres.includes('Drama') || genres.includes('Thriller') || genres.includes('Horror')) {
        score = 5; // N/A for serious genres
      }
    }
    
    // Production Design
    if (key === 'production_design') {
      if (genres.includes('Period') || genres.includes('Fantasy')) {
        score += 0.5; // Critical for period/fantasy films
      }
    }
    
    // Clamp to valid range
    scores[key] = Math.min(10, Math.max(1, Math.round(score * 10) / 10));
  }
  
  return scores;
}

/**
 * Calculate overall score from dimension scores
 */
function calculateOverallScore(dimensionScores: Record<string, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
    const score = dimensionScores[key] || 5;
    weightedSum += score * def.weight;
    totalWeight += def.weight;
  }
  
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/**
 * Determine verdict from overall score
 */
function determineVerdict(score: number): keyof typeof VERDICT_TEMPLATES {
  if (score >= 9) return 'masterpiece';
  if (score >= 7.5) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 5) return 'average';
  if (score >= 3.5) return 'below_average';
  return 'poor';
}

/**
 * Determine data quality level
 */
function determineDataQuality(movie: Movie): 'high' | 'medium' | 'low' | 'minimal' {
  let score = 0;
  
  if (movie.tmdb_rating) score += 2;
  if (movie.imdb_rating) score += 2;
  if (movie.our_rating) score += 1;
  if (movie.director) score += 1;
  if (movie.hero) score += 1;
  if (movie.genres && movie.genres.length > 0) score += 1;
  if (movie.release_year) score += 1;
  
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'low';
  return 'minimal';
}

/**
 * Get analysis template for a dimension
 */
function getAnalysisTemplate(
  dimension: string,
  score: number,
  genres: string[]
): string {
  // Find genre-specific template if available
  for (const genre of genres) {
    const genreTemplates = GENRE_ANALYSIS_TEMPLATES[genre];
    if (genreTemplates && genreTemplates[dimension]) {
      const templates = genreTemplates[dimension];
      // Select based on score level
      const index = score >= 7 ? 0 : score >= 5 ? 1 : 2;
      return templates[Math.min(index, templates.length - 1)];
    }
  }
  
  // Fall back to default templates
  const templates = DEFAULT_ANALYSIS_TEMPLATES[dimension] || [];
  const index = score >= 7 ? 0 : score >= 5 ? 1 : 2;
  return templates[Math.min(index, templates.length - 1)] || 'సమాచారం అందుబాటులో లేదు.';
}

// ============================================================
// WHY WATCH / WHY SKIP GENERATION
// ============================================================

/**
 * Generate "Why Watch" reasons based on movie data and dimension scores
 */
function generateWhyWatch(
  movie: Movie, 
  dimensionScores: Record<string, number>
): string[] {
  const reasons: string[] = [];
  const genres = movie.genres || [];
  
  // Lead actor performance
  if (dimensionScores.acting_lead >= 8 && movie.hero) {
    reasons.push(`${movie.hero}'s powerful performance`);
  }
  
  // Music
  if (dimensionScores.music_bgm >= 8) {
    reasons.push('Outstanding music and BGM that stays with you');
  }
  
  // Action sequences
  if (dimensionScores.action_choreography >= 8 && genres.includes('Action')) {
    reasons.push('Spectacular action sequences');
  }
  
  // Dialogues (for mass films)
  if (dimensionScores.dialogues_punchlines >= 8) {
    reasons.push('Mass dialogues that will be repeated by fans');
  }
  
  // Emotional impact
  if (dimensionScores.emotional_impact >= 8) {
    reasons.push('Emotionally moving moments that touch the heart');
  }
  
  // Comedy
  if (dimensionScores.comedy_timing >= 8 && genres.includes('Comedy')) {
    reasons.push('Genuine laughs and well-timed comedy');
  }
  
  // VFX for visual films
  if (dimensionScores.vfx_special_effects >= 8 && (genres.includes('Fantasy') || genres.includes('Action'))) {
    reasons.push('World-class VFX and visual spectacle');
  }
  
  // Production design for period films
  if (dimensionScores.production_design >= 8 && genres.includes('Period')) {
    reasons.push('Stunning period sets and costumes');
  }
  
  // Cinematography
  if (dimensionScores.cinematography >= 8) {
    reasons.push('Beautiful visuals and cinematography');
  }
  
  // Story
  if (dimensionScores.story_screenplay >= 8) {
    reasons.push('Engaging story with good twists');
  }
  
  // Direction
  if (dimensionScores.direction >= 8 && movie.director) {
    reasons.push(`${movie.director}'s masterful direction`);
  }
  
  // If we have few reasons, add generic ones based on overall score
  const overallScore = Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length;
  
  if (reasons.length < 2 && overallScore >= 6.5) {
    reasons.push('Solid entertainment value');
  }
  
  if (reasons.length < 2 && genres.includes('Family')) {
    reasons.push('Family-friendly content');
  }
  
  return reasons.slice(0, 5);
}

/**
 * Generate "Why Skip" reasons based on movie data and dimension scores
 */
function generateWhySkip(
  movie: Movie,
  dimensionScores: Record<string, number>
): string[] {
  const reasons: string[] = [];
  const genres = movie.genres || [];
  
  // Weak story
  if (dimensionScores.story_screenplay <= 4) {
    reasons.push('Predictable story with weak screenplay');
  }
  
  // Pacing issues
  if (dimensionScores.editing_pacing <= 4) {
    reasons.push('Pacing issues and unnecessary length');
  }
  
  // Poor performances
  if (dimensionScores.acting_lead <= 4) {
    reasons.push('Unconvincing lead performances');
  }
  
  // Weak direction
  if (dimensionScores.direction <= 4) {
    reasons.push('Lackluster direction');
  }
  
  // Poor music
  if (dimensionScores.music_bgm <= 4) {
    reasons.push('Forgettable music');
  }
  
  // Bad VFX in VFX-heavy films
  if (dimensionScores.vfx_special_effects <= 4 && (genres.includes('Fantasy') || genres.includes('Action'))) {
    reasons.push('Subpar VFX that distracts');
  }
  
  // Forced comedy
  if (dimensionScores.comedy_timing <= 4 && genres.includes('Comedy')) {
    reasons.push('Forced comedy that falls flat');
  }
  
  // Genre-specific skip reasons
  if (genres.includes('Horror') && dimensionScores.emotional_impact <= 5) {
    reasons.push('Not scary enough for horror fans');
  }
  
  if (genres.includes('Thriller') && dimensionScores.editing_pacing <= 5) {
    reasons.push('Thriller loses momentum');
  }
  
  // Content warnings
  if (genres.includes('Horror')) {
    reasons.push('Not for those sensitive to horror elements');
  }
  
  // Runtime warning for long films
  // Note: We don't have runtime in the current Movie interface, but could add
  
  return reasons.slice(0, 3);
}

/**
 * Generate critic vs audience perspective
 */
function generateCriticAudienceGap(
  movie: Movie,
  dimensionScores: Record<string, number>,
  overallScore: number
): { 
  critic_lean: 'positive' | 'negative' | 'neutral';
  audience_lean: 'positive' | 'negative' | 'neutral';
  divergence_note?: string;
} {
  const genres = movie.genres || [];
  
  // Default to neutral
  let critic_lean: 'positive' | 'negative' | 'neutral' = 'neutral';
  let audience_lean: 'positive' | 'negative' | 'neutral' = 'neutral';
  let divergence_note: string | undefined;
  
  // Mass entertainers: audience loves, critics mixed
  if (genres.includes('Action') && dimensionScores.mass_vs_class >= 7) {
    audience_lean = 'positive';
    critic_lean = overallScore >= 7 ? 'positive' : 'neutral';
    if (audience_lean !== critic_lean) {
      divergence_note = 'Mass audience will enjoy more than critics appreciate';
    }
  }
  
  // Art films: critics appreciate, audience mixed
  if (genres.includes('Drama') && dimensionScores.mass_vs_class <= 4) {
    critic_lean = overallScore >= 7 ? 'positive' : 'neutral';
    audience_lean = 'neutral';
    if (overallScore >= 7) {
      divergence_note = 'Critics will appreciate the craft; not for mainstream audience';
    }
  }
  
  // Commercial success indicator
  if (overallScore >= 7.5) {
    audience_lean = 'positive';
    critic_lean = 'positive';
  } else if (overallScore < 5) {
    audience_lean = 'negative';
    critic_lean = 'negative';
  }
  
  return { critic_lean, audience_lean, divergence_note };
}

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Generate a template-based review for a movie
 */
export function generateTemplateReview(movie: Movie): TemplateReview {
  const dataQuality = determineDataQuality(movie);
  const dimensionScores = calculateDimensionScores(movie);
  const overallScore = calculateOverallScore(dimensionScores);
  const verdictKey = determineVerdict(overallScore);
  const verdictTemplate = VERDICT_TEMPLATES[verdictKey];
  
  // Build dimensions with analysis
  const dimensions: Record<string, TemplateDimension> = {};
  const genres = movie.genres || ['Drama'];
  
  for (const [key, def] of Object.entries(DIMENSION_DEFINITIONS)) {
    const score = dimensionScores[key];
    dimensions[key] = {
      name: def.name,
      name_te: def.name_te,
      score,
      analysis_te: getAnalysisTemplate(key, score, genres),
      confidence: dataQuality === 'high' ? 0.8 : dataQuality === 'medium' ? 0.6 : 0.4,
    };
  }
  
  // Identify strengths and weaknesses
  const sortedDimensions = Object.entries(dimensionScores)
    .sort(([, a], [, b]) => b - a);
  
  const strengths = sortedDimensions
    .slice(0, 3)
    .filter(([, score]) => score >= 6)
    .map(([key]) => DIMENSION_DEFINITIONS[key as keyof typeof DIMENSION_DEFINITIONS]?.name_te || key);
  
  const weaknesses = sortedDimensions
    .slice(-3)
    .filter(([, score]) => score < 5)
    .map(([key]) => DIMENSION_DEFINITIONS[key as keyof typeof DIMENSION_DEFINITIONS]?.name_te || key);
  
  // Generate one-liners with movie name
  const titleTe = movie.title_te || movie.title_en;
  const oneLinerTe = verdictTemplate.one_liner_te
    .replace('{title_te}', titleTe)
    .replace('{title_en}', movie.title_en);
  const oneLinerEn = verdictTemplate.one_liner_en
    .replace('{title_te}', titleTe)
    .replace('{title_en}', movie.title_en);
  
  // Calculate overall confidence
  const confidence = 
    dataQuality === 'high' ? 0.75 :
    dataQuality === 'medium' ? 0.55 :
    dataQuality === 'low' ? 0.35 :
    0.2;
  
  // v2.0: Generate Why Watch / Why Skip
  const whyWatch = generateWhyWatch(movie, dimensionScores);
  const whySkip = generateWhySkip(movie, dimensionScores);
  const criticAudienceGap = generateCriticAudienceGap(movie, dimensionScores, overallScore);
  
  // Cultural context for classics
  let culturalContext: string | undefined;
  if (movie.release_year && movie.release_year <= 2000 && overallScore >= 7) {
    culturalContext = `A classic from ${movie.release_year} that set benchmarks for Telugu cinema of its era.`;
  }
  
  return {
    movie_id: movie.id,
    movie_title: movie.title_en,
    movie_title_te: movie.title_te,
    dimensions,
    overall_score: overallScore,
    verdict: verdictTemplate.verdict,
    verdict_te: verdictTemplate.verdict_te,
    one_liner_te: oneLinerTe,
    one_liner_en: oneLinerEn,
    strengths,
    weaknesses,
    source: 'template_fallback',
    confidence,
    data_quality: dataQuality,
    generated_at: new Date().toISOString(),
    // v2.0 sections
    why_watch: whyWatch.length > 0 ? whyWatch : undefined,
    why_skip: whySkip.length > 0 ? whySkip : undefined,
    critic_audience_gap: criticAudienceGap,
    cultural_context: culturalContext,
  };
}

/**
 * Save a template review to the database
 */
export async function saveTemplateReview(review: TemplateReview): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    // First try with all columns including source
    const fullInsertData = {
      movie_id: review.movie_id,
      reviewer_name: 'TeluguVibes Templates',
      overall_rating: review.overall_score,
      summary: review.one_liner_te,
      verdict: review.verdict_te,
      status: 'published',
      source: 'template_fallback',
      confidence: review.confidence,
      dimensions: review.dimensions,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      data_quality: review.data_quality,
    };
    
    const { error } = await supabase
      .from('movie_reviews')
      .insert(fullInsertData);
    
    if (error) {
      // If error mentions missing column, try minimal insert
      if (error.message.includes('does not exist')) {
        // Try with just the essential columns that are likely to exist
        const minimalInsertData = {
          movie_id: review.movie_id,
          reviewer_name: 'TeluguVibes Templates',
          overall_rating: review.overall_score,
          summary: review.one_liner_te,
          verdict: review.verdict_te,
          status: 'published',
        };
        
        const { error: retryError } = await supabase
          .from('movie_reviews')
          .insert(minimalInsertData);
        
        if (retryError) {
          console.error(`Failed to save review for ${review.movie_title}:`, retryError.message);
          return false;
        }
        
        return true;
      }
      
      console.error(`Failed to save review for ${review.movie_title}:`, error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving review for ${review.movie_title}:`, error);
    return false;
  }
}

/**
 * Generate and save fallback reviews for all movies without reviews
 */
export async function generateFallbackReviews(
  movies: Movie[],
  options: { dryRun?: boolean; onProgress?: (current: number, total: number, movie: string) => void } = {}
): Promise<{
  generated: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    generated: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };
  
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    
    if (options.onProgress) {
      options.onProgress(i + 1, movies.length, movie.title_en);
    }
    
    try {
      const review = generateTemplateReview(movie);
      
      if (options.dryRun) {
        result.generated++;
        continue;
      }
      
      const saved = await saveTemplateReview(review);
      if (saved) {
        result.generated++;
      } else {
        result.failed++;
        result.errors.push(`Failed to save: ${movie.title_en}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error processing ${movie.title_en}: ${error}`);
    }
  }
  
  return result;
}

// ============================================================
// PHASE 5.1: STRUCTURED REVIEW GENERATION
// ============================================================

/**
 * Generate best scenes based on movie dimensions and genre
 */
export function generateBestScenes(
  movie: Movie,
  dimensions: Record<string, TemplateDimension>
): string[] {
  const scenes: string[] = [];
  const genres = movie.genres || [];
  
  // High-scoring dimensions suggest memorable scenes
  const sortedDims = Object.entries(dimensions)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3);
  
  for (const [dimName, dim] of sortedDims) {
    if (dim.score >= 7) {
      switch (dimName) {
        case 'action':
          if (genres.includes('Action')) {
            scenes.push('Mass interval fight sequence');
            scenes.push('Climax confrontation scene');
          }
          break;
        case 'emotion':
          scenes.push('Heart-touching emotional climax');
          if (genres.includes('Family')) {
            scenes.push('Family reunion moment');
          }
          break;
        case 'romance':
          scenes.push('Hero-heroine introduction scene');
          scenes.push('Romantic song sequence');
          break;
        case 'comedy':
          scenes.push('Comedy track highlight');
          break;
        case 'music':
          scenes.push('Chartbuster song picturization');
          break;
      }
    }
  }
  
  // Genre-specific default scenes
  if (scenes.length === 0) {
    if (genres.includes('Drama')) {
      scenes.push('Pivotal dramatic confrontation');
    }
    if (genres.includes('Thriller')) {
      scenes.push('Twist reveal moment');
    }
  }
  
  return [...new Set(scenes)].slice(0, 5);
}

/**
 * Generate performance highlights for cast members
 */
export function generatePerformanceHighlights(movie: Movie): PerformanceHighlight[] {
  const highlights: PerformanceHighlight[] = [];
  
  // Hero performance
  if (movie.hero) {
    highlights.push({
      actor: movie.hero,
      role: 'Hero',
      note_te: `${movie.hero} తన నటనతో ప్రేక్షకులను ఆకట్టుకున్నారు`,
      note_en: `${movie.hero} captivates the audience with their performance`
    });
  }
  
  // Heroine performance
  if (movie.heroine) {
    highlights.push({
      actor: movie.heroine,
      role: 'Heroine',
      note_te: `${movie.heroine} పాత్రలో ఒదిగిపోయారు`,
      note_en: `${movie.heroine} fits perfectly into the role`
    });
  }
  
  // Director mention
  if (movie.director) {
    highlights.push({
      actor: movie.director,
      role: 'Director',
      note_te: `దర్శకుడు ${movie.director} కథను చక్కగా నడిపించారు`,
      note_en: `Director ${movie.director} handles the narrative well`
    });
  }
  
  return highlights;
}

/**
 * Generate watch recommendation based on movie data
 */
export function generateWatchRecommendation(
  movie: Movie,
  overallScore: number
): WatchRecommendation {
  const genres = movie.genres || [];
  
  // Determine audience
  let audience: WatchRecommendation['audience'] = 'all';
  if (genres.includes('Family') || genres.includes('Drama')) {
    audience = 'family';
  } else if (genres.includes('Action') && !genres.includes('Romance')) {
    audience = 'mass';
  } else if (genres.includes('Thriller') || genres.includes('Crime')) {
    audience = 'class';
  } else if (genres.includes('Romance') || genres.includes('Comedy')) {
    audience = 'youth';
  }
  
  // Generate best_for text
  let bestFor = 'General audience';
  if (audience === 'family') {
    bestFor = 'Family weekend watch';
  } else if (audience === 'mass') {
    bestFor = 'Single-screen action lovers';
  } else if (audience === 'class') {
    bestFor = 'Content-oriented viewers';
  } else if (audience === 'youth') {
    bestFor = 'Young audience looking for entertainment';
  }
  
  // Generate skip_if text for lower scores
  let skipIf: string | null = null;
  if (overallScore < 5) {
    skipIf = 'You prefer tight screenplays';
  } else if (overallScore < 6 && genres.includes('Action')) {
    skipIf = 'You dislike formulaic mass films';
  }
  
  return {
    recommended: overallScore >= 6,
    audience,
    best_for: bestFor,
    skip_if: skipIf
  };
}

/**
 * Find similar movies based on genre, director, and cast
 */
export async function findSimilarMovies(movie: Movie): Promise<LinkedMovie[]> {
  const supabase = getSupabaseClient();
  const similar: LinkedMovie[] = [];
  
  // Find movies by same director
  if (movie.director) {
    const { data: directorMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('director', movie.director)
      .neq('id', movie.id)
      .limit(3);
    
    if (directorMovies) {
      for (const m of directorMovies) {
        similar.push({
          movie_id: m.id,
          title: m.title_en,
          similarity_score: 0.85,
          reason: `Same director: ${movie.director}`
        });
      }
    }
  }
  
  // Find movies with same hero
  if (movie.hero) {
    const { data: heroMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('hero', movie.hero)
      .neq('id', movie.id)
      .limit(3);
    
    if (heroMovies) {
      for (const m of heroMovies) {
        if (!similar.find(s => s.movie_id === m.id)) {
          similar.push({
            movie_id: m.id,
            title: m.title_en,
            similarity_score: 0.75,
            reason: `Same lead actor: ${movie.hero}`
          });
        }
      }
    }
  }
  
  // Find movies with similar genres (same primary genre + year range)
  const primaryGenre = movie.genres?.[0];
  if (primaryGenre && movie.release_year) {
    const { data: genreMovies } = await supabase
      .from('movies')
      .select('id, title_en')
      .contains('genres', [primaryGenre])
      .gte('release_year', movie.release_year - 3)
      .lte('release_year', movie.release_year + 3)
      .neq('id', movie.id)
      .limit(3);
    
    if (genreMovies) {
      for (const m of genreMovies) {
        if (!similar.find(s => s.movie_id === m.id)) {
          similar.push({
            movie_id: m.id,
            title: m.title_en,
            similarity_score: 0.65,
            reason: `Similar genre: ${primaryGenre}`
          });
        }
      }
    }
  }
  
  // Sort by similarity score and limit
  return similar
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);
}

/**
 * Generate linked celebrities from movie data
 */
export function generateLinkedCelebrities(movie: Movie): LinkedCelebrity[] {
  const celebrities: LinkedCelebrity[] = [];
  
  if (movie.hero) {
    celebrities.push({
      name: movie.hero,
      role_in_movie: 'hero'
    });
  }
  
  if (movie.heroine) {
    celebrities.push({
      name: movie.heroine,
      role_in_movie: 'heroine'
    });
  }
  
  if (movie.director) {
    celebrities.push({
      name: movie.director,
      role_in_movie: 'director'
    });
  }
  
  return celebrities;
}

/**
 * Generate enhanced template review with all structured sections
 */
export async function generateEnhancedTemplateReview(movie: Movie): Promise<TemplateReview> {
  // Generate base template review
  const baseReview = generateTemplateReview(movie);
  
  // Add structured sections
  const bestScenes = generateBestScenes(movie, baseReview.dimensions);
  const performanceHighlights = generatePerformanceHighlights(movie);
  const watchRecommendation = generateWatchRecommendation(movie, baseReview.overall_score);
  const linkedCelebrities = generateLinkedCelebrities(movie);
  const linkedMovies = await findSimilarMovies(movie);
  
  return {
    ...baseReview,
    best_scenes: bestScenes,
    performance_highlights: performanceHighlights,
    watch_recommendation: watchRecommendation,
    linked_celebrities: linkedCelebrities,
    linked_movies: linkedMovies
  };
}

