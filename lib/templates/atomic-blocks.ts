/**
 * Atomic Content Blocks
 * 
 * The smallest reusable units of Telugu content.
 * Each block:
 * - Has a specific purpose (hook, context, emotion, etc.)
 * - Contains template with placeholders
 * - Belongs to a style cluster
 * - Tracks performance (success/failure)
 * - Can be combined into full templates
 * 
 * ⚠️ NO copyrighted text. All blocks are original Telugu templates.
 */

import { StyleCluster, getClusterById, extractTemplateParams } from '../style/style-clusters';

// ============================================================
// TYPES
// ============================================================

export type BlockType = 
  | 'hook'           // Opening grabber
  | 'context'        // Background/setting
  | 'trend'          // Trending/viral angle
  | 'emotion'        // Emotional connection
  | 'nostalgia'      // Throwback/memory
  | 'fan_connect'    // Fan appreciation
  | 'glamour'        // Beauty/fashion description
  | 'achievement'    // Success/milestone
  | 'cta'            // Call to action
  | 'prediction'     // Future speculation
  | 'transition'     // Paragraph connector
  | 'closing';       // Final statement

export interface AtomicBlock {
  id: string;
  type: BlockType;
  template: string;                    // Telugu template with {placeholders}
  variables: string[];                 // List of placeholder names
  styleClusterId: string;              // Which style this belongs to
  emotionType?: 'nostalgia' | 'pride' | 'excitement' | 'cultural' | 'neutral';
  
  // Performance tracking
  confidenceScore: number;             // 0-1, how reliable this block is
  successCount: number;
  failureCount: number;
  lastUsedAt: Date | null;
  
  // Metadata
  minLength: number;                   // Minimum chars after filling
  maxLength: number;
  isActive: boolean;
  createdAt: Date;
}

export interface BlockFillResult {
  block: AtomicBlock;
  filledText: string;
  charCount: number;
  emotionDetected: string | null;
}

// ============================================================
// ATOMIC BLOCK LIBRARY
// ============================================================

export const ATOMIC_BLOCKS: AtomicBlock[] = [
  // ========== HOOK BLOCKS ==========
  {
    id: 'hook_excitement_1',
    type: 'hook',
    template: 'తెలుగు ప్రేక్షకులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్న క్షణం వచ్చేసింది!',
    variables: [],
    styleClusterId: 'emotional_soft',
    emotionType: 'excitement',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 80,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'hook_celebrity_1',
    type: 'hook',
    template: '{celebrity_name} మరోసారి తన అభిమానులను థ్రిల్ చేయడానికి సిద్ధమవుతున్నారు!',
    variables: ['celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 100,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'hook_viral_1',
    type: 'hook',
    template: 'సోషల్ మీడియాలో వైరల్ అవుతోంది!',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 30,
    maxLength: 50,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'hook_breaking_1',
    type: 'hook',
    template: 'బ్రేకింగ్: {topic} గురించి తాజా అప్డేట్!',
    variables: ['topic'],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 40,
    maxLength: 70,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'hook_glamour_1',
    type: 'hook',
    template: '{celebrity_name} తాజా ఫోటోషూట్‌లో అందాల విందు!',
    variables: ['celebrity_name'],
    styleClusterId: 'glamour_poetic',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 80,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== CONTEXT BLOCKS ==========
  {
    id: 'context_movie_1',
    type: 'context',
    template: '{director_name} దర్శకత్వంలో వస్తున్న ఈ సినిమా భారీ బడ్జెట్‌తో నిర్మాణమవుతోంది.',
    variables: ['director_name'],
    styleClusterId: 'news_neutral',
    emotionType: 'neutral',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 70,
    maxLength: 120,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'context_career_1',
    type: 'context',
    template: '{celebrity_name} గత కొన్ని సంవత్సరాలుగా విజయవంతమైన ప్రయాణం సాగిస్తున్నారు.',
    variables: ['celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 70,
    maxLength: 110,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'context_event_1',
    type: 'context',
    template: 'ఈ రోజు {location}లో జరిగిన కార్యక్రమంలో {celebrity_name} పాల్గొన్నారు.',
    variables: ['location', 'celebrity_name'],
    styleClusterId: 'news_neutral',
    emotionType: 'neutral',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 100,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== EMOTION BLOCKS ==========
  {
    id: 'emotion_pride_1',
    type: 'emotion',
    template: 'తెలుగు సినీ ఇండస్ట్రీకి గర్వకారణమైన ఈ క్షణం అభిమానులందరినీ ఆనందపరుస్తోంది.',
    variables: [],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 80,
    maxLength: 120,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'emotion_fan_1',
    type: 'emotion',
    template: 'అభిమానుల హృదయాలలో చెరగని ముద్ర వేసిన {celebrity_name} ఇప్పటికీ అదే మేజిక్ చూపిస్తున్నారు.',
    variables: ['celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'nostalgia',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 90,
    maxLength: 140,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'emotion_excitement_1',
    type: 'emotion',
    template: 'ఈ అప్డేట్ విన్న అభిమానులు ఆనందంతో ఉప్పొంగిపోతున్నారు!',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 80,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== NOSTALGIA BLOCKS ==========
  {
    id: 'nostalgia_classic_1',
    type: 'nostalgia',
    template: 'గుర్తున్నాయా ఆ రోజులు... {decade} దశకంలో తెలుగు సినీ ప్రపంచం ఎంత అద్భుతంగా ఉండేదో!',
    variables: ['decade'],
    styleClusterId: 'nostalgia_heavy',
    emotionType: 'nostalgia',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 80,
    maxLength: 130,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'nostalgia_memory_1',
    type: 'nostalgia',
    template: 'ఆ మధుర జ్ఞాపకాలు ఇప్పటికీ అభిమానుల మనసులో తాజాగా ఉన్నాయి.',
    variables: [],
    styleClusterId: 'nostalgia_heavy',
    emotionType: 'nostalgia',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'nostalgia_throwback_1',
    type: 'nostalgia',
    template: 'థ్రోబ్యాక్ టైమ్! {celebrity_name} ఆ రోజుల్లో ఎంత అందంగా కనిపించారో చూడండి.',
    variables: ['celebrity_name'],
    styleClusterId: 'nostalgia_heavy',
    emotionType: 'nostalgia',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 70,
    maxLength: 110,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== FAN CONNECT BLOCKS ==========
  {
    id: 'fan_appreciation_1',
    type: 'fan_connect',
    template: 'అభిమానుల అంతులేని ప్రేమ, ఆదరణ {celebrity_name}కి ఎప్పుడూ ప్రత్యేకమే.',
    variables: ['celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 70,
    maxLength: 100,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'fan_celebration_1',
    type: 'fan_connect',
    template: 'ఫ్యాన్స్ ఇప్పటికే సోషల్ మీడియాలో సెలబ్రేషన్స్ మొదలుపెట్టారు!',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 80,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== GLAMOUR BLOCKS ==========
  {
    id: 'glamour_beauty_1',
    type: 'glamour',
    template: '{celebrity_name} అందం, ఆకర్షణ ఎప్పటిలాగే అభిమానులను మంత్రముగ్ధులను చేస్తోంది.',
    variables: ['celebrity_name'],
    styleClusterId: 'glamour_poetic',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 80,
    maxLength: 120,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'glamour_fashion_1',
    type: 'glamour',
    template: 'ఈ స్టైలిష్ లుక్‌లో {celebrity_name} అందరినీ ఆకట్టుకుంటున్నారు.',
    variables: ['celebrity_name'],
    styleClusterId: 'glamour_poetic',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'glamour_photoshoot_1',
    type: 'glamour',
    template: 'లేటెస్ట్ ఫోటోషూట్‌లో {celebrity_name} అద్భుతంగా మెరిసిపోతున్నారు.',
    variables: ['celebrity_name'],
    styleClusterId: 'glamour_poetic',
    emotionType: 'excitement',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== ACHIEVEMENT BLOCKS ==========
  {
    id: 'achievement_success_1',
    type: 'achievement',
    template: '{achievement} సాధించిన {celebrity_name}కి అభినందనలు!',
    variables: ['achievement', 'celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'achievement_record_1',
    type: 'achievement',
    template: 'ఈ రికార్డు తెలుగు సినీ చరిత్రలో కొత్త మైల్‌స్టోన్ అయింది.',
    variables: [],
    styleClusterId: 'news_neutral',
    emotionType: 'pride',
    confidenceScore: 0.85,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== CLOSING BLOCKS ==========
  {
    id: 'closing_fan_1',
    type: 'closing',
    template: 'అభిమానుల ప్రేమ ఎప్పటికీ తరగని నిధి!',
    variables: [],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 35,
    maxLength: 50,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'closing_cta_1',
    type: 'closing',
    template: 'మీ అభిప్రాయాలు కామెంట్స్‌లో షేర్ చేయండి!',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'neutral',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 35,
    maxLength: 50,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'closing_anticipation_1',
    type: 'closing',
    template: 'మరిన్ని అప్డేట్స్ కోసం ఎదురుచూడండి!',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 30,
    maxLength: 45,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'closing_emotional_1',
    type: 'closing',
    template: '{celebrity_name} ప్రయాణం ఇలాగే కొనసాగాలని కోరుకుందాం.',
    variables: ['celebrity_name'],
    styleClusterId: 'emotional_soft',
    emotionType: 'pride',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 75,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== TREND BLOCKS ==========
  {
    id: 'trend_viral_1',
    type: 'trend',
    template: 'ట్విట్టర్, ఇన్‌స్టాగ్రామ్‌లో ఈ టాపిక్ ట్రెండ్ అవుతోంది.',
    variables: [],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 50,
    maxLength: 75,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'trend_hashtag_1',
    type: 'trend',
    template: '#{hashtag} హ్యాష్‌ట్యాగ్ సోషల్ మీడియాలో టాప్ ట్రెండ్‌గా మారింది.',
    variables: ['hashtag'],
    styleClusterId: 'mass_punchy',
    emotionType: 'excitement',
    confidenceScore: 0.75,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 60,
    maxLength: 90,
    isActive: true,
    createdAt: new Date(),
  },
  
  // ========== TRANSITION BLOCKS ==========
  {
    id: 'transition_moreover_1',
    type: 'transition',
    template: 'అంతే కాకుండా, మరో విశేషం ఏమిటంటే...',
    variables: [],
    styleClusterId: 'emotional_soft',
    emotionType: 'neutral',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 30,
    maxLength: 45,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'transition_meanwhile_1',
    type: 'transition',
    template: 'ఈ లోపు, మరో ఆసక్తికరమైన విషయం...',
    variables: [],
    styleClusterId: 'news_neutral',
    emotionType: 'neutral',
    confidenceScore: 0.8,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: null,
    minLength: 30,
    maxLength: 45,
    isActive: true,
    createdAt: new Date(),
  },
];

// ============================================================
// BLOCK FUNCTIONS
// ============================================================

/**
 * Get blocks by type
 */
export function getBlocksByType(type: BlockType): AtomicBlock[] {
  return ATOMIC_BLOCKS.filter(b => b.type === type && b.isActive);
}

/**
 * Get blocks by style cluster
 */
export function getBlocksByCluster(clusterId: string): AtomicBlock[] {
  return ATOMIC_BLOCKS.filter(b => b.styleClusterId === clusterId && b.isActive);
}

/**
 * Get blocks by emotion type
 */
export function getBlocksByEmotion(emotion: AtomicBlock['emotionType']): AtomicBlock[] {
  return ATOMIC_BLOCKS.filter(b => b.emotionType === emotion && b.isActive);
}

/**
 * Get best block for a type and cluster
 */
export function getBestBlock(
  type: BlockType,
  clusterId: string,
  options?: {
    preferEmotion?: AtomicBlock['emotionType'];
    requiredVariables?: string[];
  }
): AtomicBlock | null {
  let candidates = ATOMIC_BLOCKS.filter(b => 
    b.type === type && 
    b.isActive
  );
  
  // Prefer matching cluster
  const clusterMatch = candidates.filter(b => b.styleClusterId === clusterId);
  if (clusterMatch.length > 0) {
    candidates = clusterMatch;
  }
  
  // Filter by emotion if specified
  if (options?.preferEmotion) {
    const emotionMatch = candidates.filter(b => b.emotionType === options.preferEmotion);
    if (emotionMatch.length > 0) {
      candidates = emotionMatch;
    }
  }
  
  // Filter by required variables
  if (options?.requiredVariables) {
    const varMatch = candidates.filter(b =>
      options.requiredVariables!.every(v => b.variables.includes(v))
    );
    if (varMatch.length > 0) {
      candidates = varMatch;
    }
  }
  
  if (candidates.length === 0) return null;
  
  // Sort by confidence score and select best
  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  return candidates[0];
}

/**
 * Fill a block template with values
 */
export function fillBlock(
  block: AtomicBlock,
  values: Record<string, string>
): BlockFillResult {
  let filled = block.template;
  
  for (const variable of block.variables) {
    const value = values[variable] || `{${variable}}`;
    filled = filled.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
  }
  
  return {
    block,
    filledText: filled,
    charCount: filled.length,
    emotionDetected: block.emotionType || null,
  };
}

/**
 * Update block performance
 */
export function updateBlockPerformance(
  blockId: string,
  success: boolean
): void {
  const block = ATOMIC_BLOCKS.find(b => b.id === blockId);
  if (!block) return;
  
  if (success) {
    block.successCount++;
  } else {
    block.failureCount++;
  }
  
  // Recalculate confidence
  const total = block.successCount + block.failureCount;
  if (total > 0) {
    // Wilson score interval for confidence
    const z = 1.96; // 95% confidence
    const phat = block.successCount / total;
    const n = total;
    block.confidenceScore = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);
  }
  
  block.lastUsedAt = new Date();
}

/**
 * Get block statistics
 */
export function getBlockStats(): {
  totalBlocks: number;
  activeBlocks: number;
  byType: Record<BlockType, number>;
  byCluster: Record<string, number>;
  avgConfidence: number;
} {
  const active = ATOMIC_BLOCKS.filter(b => b.isActive);
  
  const byType = {} as Record<BlockType, number>;
  const byCluster = {} as Record<string, number>;
  
  for (const block of active) {
    byType[block.type] = (byType[block.type] || 0) + 1;
    byCluster[block.styleClusterId] = (byCluster[block.styleClusterId] || 0) + 1;
  }
  
  const avgConfidence = active.length > 0
    ? active.reduce((sum, b) => sum + b.confidenceScore, 0) / active.length
    : 0;
  
  return {
    totalBlocks: ATOMIC_BLOCKS.length,
    activeBlocks: active.length,
    byType,
    byCluster,
    avgConfidence,
  };
}

export default {
  ATOMIC_BLOCKS,
  getBlocksByType,
  getBlocksByCluster,
  getBlocksByEmotion,
  getBestBlock,
  fillBlock,
  updateBlockPerformance,
  getBlockStats,
};






