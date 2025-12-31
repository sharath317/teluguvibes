/**
 * Hot Media Auto-Injection Pipeline
 * 
 * Automated workflow:
 * 1. Get recommendations from learning service
 * 2. Discover new content for priority celebrities
 * 3. Generate AI captions
 * 4. Apply safety checks
 * 5. Queue for review or auto-publish
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  discoverContentForCelebrity,
  validateContent,
  detectCategory,
  type DiscoveredContent,
  type DiscoveryOptions,
} from './content-discovery';
import { getDiscoveryRecommendations, updateTrendingScores } from './learning-service';
import { generateCaptions } from './ai-caption-generator';
import { checkContentSafety, checkEntitySafety } from './safety-checker';

// Pipeline configuration
export interface PipelineConfig {
  maxNewItems: number;
  autoPublishThreshold: number; // Confidence score above which to auto-publish
  requireReview: boolean;
  categories: string[];
  supabaseUrl: string;
  supabaseKey: string;
}

export interface PipelineResult {
  discovered: number;
  validated: number;
  captioned: number;
  autoPublished: number;
  queuedForReview: number;
  blocked: number;
  errors: string[];
}

// Telugu caption templates
const TELUGU_CAPTIONS: Record<string, string[]> = {
  photoshoot: [
    '{name} లేటెస్ట్ ఫోటోషూట్ 📸 స్టన్నింగ్!',
    '{name} మ్యాగజైన్ ఫోటోషూట్ 🔥 అద్భుతం!',
    '{name} ఫోటోషూట్ క్లిక్స్ ✨ గార్జియస్!',
  ],
  fashion: [
    '{name} ఫ్యాషన్ ఈవెంట్‌లో స్టైలిష్‌గా 👗',
    '{name} ఫ్యాషన్ వీక్‌లో అద్భుతంగా ✨',
    '{name} డిజైనర్ డ్రెస్‌లో స్టన్నింగ్ 🌟',
  ],
  traditional: [
    '{name} సాంప్రదాయ చీరలో అందంగా 🪷',
    '{name} ఎథ్నిక్ లుక్‌లో స్టన్నింగ్ 🌺',
    '{name} లెహంగాలో అద్భుతంగా 💫',
  ],
  western: [
    '{name} వెస్టర్న్ ఔట్‌ఫిట్‌లో స్లేయింగ్ 👠',
    '{name} క్యాజువల్ లుక్‌లో స్టైలిష్ 🔥',
    '{name} ఈవెనింగ్ గౌన్‌లో గార్జియస్ ✨',
  ],
  fitness: [
    '{name} జిమ్ వర్కౌట్ 💪 ఫిట్‌నెస్ గోల్స్!',
    '{name} ఫిట్‌నెస్ రొటీన్ 🔥 ఇన్‌స్పిరేషన్!',
    '{name} యోగా సెషన్ 🧘 వెల్‌నెస్!',
  ],
  reels: [
    '{name} వైరల్ రీల్ 🎬 ట్రెండింగ్!',
    '{name} డ్యాన్స్ రీల్ వైరల్ 💃 అమేజింగ్!',
    '{name} ఫన్ రీల్ 🤩 ఎంటర్‌టైన్‌మెంట్!',
  ],
  events: [
    '{name} మూవీ లాంచ్ ఈవెంట్‌లో 🎬',
    '{name} అవార్డ్ ఫంక్షన్‌లో 🏆 గ్లామరస్!',
    '{name} ప్రెస్ మీట్‌లో 📰 స్టన్నింగ్!',
  ],
  beach: [
    '{name} వెకేషన్ వైబ్స్ 🏖️ బీచ్ లుక్!',
    '{name} బీచ్ ఫోటో షూట్ ☀️ హాట్!',
    '{name} ట్రావెల్ డైరీస్ ✈️ వాండర్‌లస్ట్!',
  ],
};

/**
 * Generate a Telugu caption for content
 */
function generateTeluguCaption(entityName: string, category: string): string {
  const templates = TELUGU_CAPTIONS[category] || TELUGU_CAPTIONS.photoshoot;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Get Telugu name if available, otherwise use English
  return template.replace('{name}', entityName);
}

/**
 * Convert discovered content to hot_media format
 */
function toHotMediaRecord(
  content: DiscoveredContent,
  teluguName: string,
  caption: string,
  safetyResult: { risk: string; requires_review: boolean; is_blocked: boolean; reason?: string }
) {
  return {
    entity_id: content.entity_id,
    entity_name: content.entity_name,
    entity_type: content.entity_type,
    platform: content.platform,
    source_url: content.source_url,
    embed_url: content.embed_url || null,
    embed_html: content.embed_html || null,
    image_url: content.image_url || null,
    thumbnail_url: content.thumbnail_url || content.image_url || null,
    license_source: content.discovery_source,
    license_type: 'api-provided',
    category: content.suggested_category,
    tags: content.suggested_tags,
    ai_caption_variants: [
      { text: caption, style: 'glam', emoji: '✨', confidence: 0.85 },
    ],
    selected_caption: caption,
    caption_te: caption,
    detected_emotion: 'admiration',
    content_angle: 'glam',
    confidence_score: Math.round(content.confidence_score),
    safety_risk: safetyResult.risk,
    requires_review: safetyResult.requires_review,
    is_blocked: safetyResult.is_blocked,
    block_reason: safetyResult.reason || null,
    views: 0,
    likes: 0,
    shares: 0,
    trending_score: content.confidence_score * 0.5,
    is_featured: false,
    is_hot: content.confidence_score > 80,
    status: safetyResult.is_blocked 
      ? 'blocked' 
      : safetyResult.requires_review 
        ? 'pending' 
        : 'approved',
    published_at: safetyResult.is_blocked || safetyResult.requires_review
      ? null
      : new Date().toISOString(),
  };
}

/**
 * Run the auto-injection pipeline
 */
export async function runAutoPipeline(config: PipelineConfig): Promise<PipelineResult> {
  const result: PipelineResult = {
    discovered: 0,
    validated: 0,
    captioned: 0,
    autoPublished: 0,
    queuedForReview: 0,
    blocked: 0,
    errors: [],
  };

  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

  console.log('\n🚀 Starting Hot Media Auto-Pipeline\n');

  try {
    // Step 1: Get recommendations from learning service
    console.log('📊 Step 1: Getting recommendations from learning service...');
    const recommendations = await getDiscoveryRecommendations(supabase);
    console.log(`   Found ${recommendations.priorityCelebrities.length} priority celebrities`);
    console.log(`   Recommended categories: ${recommendations.recommendedCategories.join(', ')}`);

    // Step 2: Discover content for priority celebrities
    console.log('\n🔍 Step 2: Discovering new content...');
    const allDiscovered: DiscoveredContent[] = [];
    
    // Get existing source URLs to avoid duplicates
    const { data: existingUrls } = await supabase
      .from('hot_media')
      .select('source_url')
      .not('source_url', 'is', null);
    const existingUrlSet = new Set(existingUrls?.map(e => e.source_url) || []);

    // Get Telugu names for entities
    const { data: entityData } = await supabase
      .from('media_entities')
      .select('id, name_en, name_te, entity_type, popularity_score')
      .in('entity_type', ['actress', 'anchor', 'model', 'influencer'])
      .order('popularity_score', { ascending: false })
      .limit(20);
    const teluguNameMap = new Map(
      entityData?.map(e => [e.name_en, e.name_te || e.name_en]) || []
    );

    // If no priority celebrities from learning service, use all entities
    let celebsToProcess = recommendations.priorityCelebrities.slice(0, 10);
    if (celebsToProcess.length === 0 && entityData && entityData.length > 0) {
      console.log('   ℹ️ No learning data - using all entities');
      celebsToProcess = entityData.map(e => ({
        entity_id: e.id,
        entity_name: e.name_en,
        priority_score: e.popularity_score || 50,
        suggested_categories: ['photoshoot', 'fashion', 'events'],
        last_content_at: null,
        content_gap_days: 999,
      }));
    }

    for (const celeb of celebsToProcess) {
      try {
        const content = await discoverContentForCelebrity(
          celeb.entity_name,
          celeb.entity_id,
          'actress',
          {
            maxPerCelebrity: 5,
            categories: config.categories,
          }
        );
        
        // Filter out duplicates
        const newContent = content.filter(c => !existingUrlSet.has(c.source_url));
        allDiscovered.push(...newContent);
        
        if (allDiscovered.length >= config.maxNewItems) break;
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        result.errors.push(`Discovery error for ${celeb.entity_name}: ${error}`);
      }
    }
    
    result.discovered = allDiscovered.length;
    console.log(`   Discovered ${result.discovered} new content items`);

    // Step 3: Validate content
    console.log('\n✅ Step 3: Validating content...');
    const validatedContent = validateContent(allDiscovered).slice(0, config.maxNewItems);
    result.validated = validatedContent.length;
    console.log(`   Validated ${result.validated} items`);

    // Step 4: Generate captions and check safety
    console.log('\n📝 Step 4: Generating captions and safety checks...');
    const mediaRecords: any[] = [];

    for (const content of validatedContent) {
      try {
        // Get Telugu name
        const teluguName = teluguNameMap.get(content.entity_name) || content.entity_name;
        
        // Generate caption
        const caption = generateTeluguCaption(teluguName, content.suggested_category);
        
        // Safety check
        const entitySafety = checkEntitySafety(content.entity_name, content.entity_type);
        const contentSafety = checkContentSafety({
          text: caption + ' ' + content.suggested_tags.join(' '),
          entityName: content.entity_name,
          platform: content.platform,
          isEmbed: !!content.embed_html,
        });
        
        // Map safety risk to database values: 'low', 'medium', 'high'
        const riskMap: Record<string, string> = {
          'safe': 'low',
          'low': 'low',
          'medium': 'medium',
          'high': 'high',
          'blocked': 'high',
        };
        
        const safetyResult = {
          risk: riskMap[contentSafety.risk] || 'low',
          requires_review: contentSafety.requiresReview || !entitySafety.isApproved,
          is_blocked: contentSafety.isBlocked || entitySafety.isBlocked,
          reason: contentSafety.blockReason || entitySafety.reason,
        };
        
        // Create record
        const record = toHotMediaRecord(content, teluguName, caption, safetyResult);
        mediaRecords.push(record);
        
        result.captioned++;
        
        if (safetyResult.is_blocked) {
          result.blocked++;
        } else if (safetyResult.requires_review || config.requireReview) {
          result.queuedForReview++;
        } else if (content.confidence_score >= config.autoPublishThreshold) {
          result.autoPublished++;
        } else {
          result.queuedForReview++;
        }
      } catch (error) {
        result.errors.push(`Caption/safety error: ${error}`);
      }
    }

    console.log(`   Captioned ${result.captioned} items`);
    console.log(`   Auto-published: ${result.autoPublished}`);
    console.log(`   Queued for review: ${result.queuedForReview}`);
    console.log(`   Blocked: ${result.blocked}`);

    // Step 5: Insert into database
    if (mediaRecords.length > 0) {
      console.log('\n💾 Step 5: Saving to database...');
      
      const { data, error } = await supabase
        .from('hot_media')
        .insert(mediaRecords)
        .select('id');

      if (error) {
        result.errors.push(`Database insert error: ${error.message}`);
        console.error('   ❌ Database error:', error.message);
      } else {
        console.log(`   ✅ Saved ${data?.length || 0} records`);
      }
    }

    // Step 6: Update trending scores
    console.log('\n📈 Step 6: Updating trending scores...');
    const updatedScores = await updateTrendingScores(supabase);
    console.log(`   Updated ${updatedScores} trending scores`);

  } catch (error) {
    result.errors.push(`Pipeline error: ${error}`);
    console.error('❌ Pipeline error:', error);
  }

  console.log('\n✨ Pipeline complete!\n');
  console.log('📊 Summary:');
  console.log(`   Discovered: ${result.discovered}`);
  console.log(`   Validated: ${result.validated}`);
  console.log(`   Captioned: ${result.captioned}`);
  console.log(`   Auto-published: ${result.autoPublished}`);
  console.log(`   Queued: ${result.queuedForReview}`);
  console.log(`   Blocked: ${result.blocked}`);
  console.log(`   Errors: ${result.errors.length}`);

  return result;
}

/**
 * Quick pipeline run with defaults
 */
export async function quickPipelineRun(
  supabaseUrl: string,
  supabaseKey: string,
  maxItems = 20
): Promise<PipelineResult> {
  return runAutoPipeline({
    maxNewItems: maxItems,
    autoPublishThreshold: 75,
    requireReview: false,
    categories: ['photoshoot', 'fashion', 'traditional', 'western', 'events', 'fitness', 'beach', 'reels'],
    supabaseUrl,
    supabaseKey,
  });
}

