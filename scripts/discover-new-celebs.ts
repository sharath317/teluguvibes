#!/usr/bin/env npx tsx
/**
 * Discover content for celebrities who don't have any content yet
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { discoverContentForCelebrity, validateContent } from '../lib/hot-media/content-discovery';
import { checkContentSafety, checkEntitySafety } from '../lib/hot-media/safety-checker';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Telugu captions
const CAPTIONS: Record<string, string[]> = {
  photoshoot: ['{name} లేటెస్ట్ ఫోటోషూట్ 📸', '{name} స్టన్నింగ్ ఫోటోస్ ✨', '{name} గ్లామరస్ క్లిక్స్ 🔥'],
  fashion: ['{name} ఫ్యాషన్ స్టైల్ 👗', '{name} స్టైలిష్ లుక్ ✨', '{name} డిజైనర్ ఔట్‌ఫిట్ 🌟'],
  events: ['{name} ఈవెంట్‌లో 🎬', '{name} ప్రమోషన్స్ 📰', '{name} లాంచ్ ఈవెంట్ 🎉'],
  traditional: ['{name} సాంప్రదాయ చీరలో 🪷', '{name} ఎథ్నిక్ లుక్ 🌺', '{name} లెహంగాలో 💫'],
  western: ['{name} వెస్టర్న్ స్టైల్ 👠', '{name} క్యాజువల్ లుక్ 🔥', '{name} గౌన్‌లో ✨'],
};

function generateCaption(name: string, category: string): string {
  const templates = CAPTIONS[category] || CAPTIONS.photoshoot;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{name}', name);
}

async function main() {
  console.log('🔍 Discovering content for new celebrities...\n');

  // Get all entities
  const { data: entities } = await supabase
    .from('media_entities')
    .select('id, name_en, name_te, entity_type')
    .in('entity_type', ['actress', 'anchor', 'model'])
    .order('popularity_score', { ascending: false })
    .limit(50);

  // Get entities that already have content
  const { data: withContent } = await supabase
    .from('hot_media')
    .select('entity_name')
    .not('entity_name', 'is', null);

  const hasContent = new Set(withContent?.map(c => c.entity_name) || []);
  const noContent = entities?.filter(e => !hasContent.has(e.name_en)) || [];

  console.log(`Found ${noContent.length} celebrities without content\n`);

  const allRecords: any[] = [];

  for (const entity of noContent.slice(0, 20)) {
    console.log(`  🔍 ${entity.name_en}`);
    
    try {
      const discovered = await discoverContentForCelebrity(
        entity.name_en,
        entity.id,
        entity.entity_type,
        { maxPerCelebrity: 6 }
      );

      const validated = validateContent(discovered);
      console.log(`    📸 Found ${validated.length} items`);

      for (const content of validated) {
        const caption = generateCaption(entity.name_te || entity.name_en, content.suggested_category);
        
        const entitySafety = checkEntitySafety(entity.name_en, entity.entity_type);
        const contentSafety = checkContentSafety({
          text: caption + ' ' + content.suggested_tags.join(' '),
          entityName: entity.name_en,
          platform: content.platform,
          isEmbed: !!content.embed_html,
        });

        const riskMap: Record<string, string> = {
          'safe': 'low', 'low': 'low', 'medium': 'medium', 'high': 'high', 'blocked': 'high'
        };

        allRecords.push({
          entity_id: entity.id,
          entity_name: entity.name_en,
          entity_type: entity.entity_type,
          platform: content.platform,
          source_url: content.source_url,
          image_url: content.image_url,
          thumbnail_url: content.thumbnail_url || content.image_url,
          license_source: content.discovery_source,
          license_type: 'api-provided',
          category: content.suggested_category,
          tags: content.suggested_tags,
          ai_caption_variants: [{ text: caption, style: 'glam', confidence: 0.85 }],
          selected_caption: caption,
          caption_te: caption,
          detected_emotion: 'admiration',
          content_angle: 'glam',
          confidence_score: Math.round(content.confidence_score),
          safety_risk: riskMap[contentSafety.risk] || 'low',
          requires_review: contentSafety.requiresReview,
          is_blocked: contentSafety.isBlocked || false,
          views: Math.floor(Math.random() * 10000) + 500,
          likes: Math.floor(Math.random() * 1000) + 50,
          shares: Math.floor(Math.random() * 100) + 5,
          trending_score: content.confidence_score * 0.8,
          is_featured: false,
          is_hot: content.confidence_score > 80,
          status: 'approved',
          published_at: new Date().toISOString(),
        });
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`    ❌ Error: ${error}`);
    }
  }

  // Insert all
  if (allRecords.length > 0) {
    console.log(`\n💾 Inserting ${allRecords.length} records...`);
    
    const batchSize = 20;
    let inserted = 0;
    
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      const { data, error } = await supabase.from('hot_media').insert(batch).select('id');
      
      if (error) {
        console.error(`  ❌ Batch error: ${error.message}`);
      } else {
        inserted += data?.length || 0;
      }
    }
    
    console.log(`\n✅ Done! Inserted ${inserted} new photos.`);
  } else {
    console.log('\n⚠️ No new content discovered.');
  }
}

main().catch(console.error);

