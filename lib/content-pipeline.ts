/**
 * Unified Content Pipeline
 * Combines all 3 stages:
 * 1. Content Intelligence (Pre-Analysis)
 * 2. Structured Content Generation
 * 3. Post-Generation Validation
 *
 * Plus: Smart Image + Category Rules
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeContent, analyzeContentWithAI } from './content-intelligence';
import { generateStructuredArticle, structuredToBody } from './structured-content-generator';
import { validateContent, addDisclaimer, quickValidate } from './content-validation';
import { getSmartImage, getCelebrityImage, getMovieImage } from './smart-image-pipeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PipelineInput {
  title: string;
  content: string;
  category: string;
  sourceUrl?: string;
  sourceImage?: string;
}

interface PipelineOutput {
  success: boolean;
  postId?: string;
  status: 'published' | 'draft' | 'rejected';
  title: string;
  body: string;
  imageUrl: string;
  score: number;
  analysis: any;
  validation: any;
  errors: string[];
}

interface CategoryRules {
  sections: string[];
  word_count: number;
  tone: string;
  require_disclaimer?: boolean;
  image_style: string;
}

/**
 * Get category-specific AI rules from database
 */
async function getCategoryRules(categorySlug: string): Promise<CategoryRules | null> {
  const { data } = await supabase
    .from('categories')
    .select('ai_rules, image_style')
    .eq('slug', categorySlug)
    .single();

  if (data) {
    return {
      ...data.ai_rules,
      image_style: data.image_style,
    };
  }

  // Default rules
  return {
    sections: ['hook', 'context', 'main_story', 'closing'],
    word_count: 300,
    tone: 'informative',
    image_style: 'stock',
  };
}

/**
 * Save analysis to database
 */
async function saveAnalysis(postId: string, analysis: any): Promise<void> {
  await supabase.from('post_analysis').upsert({
    post_id: postId,
    primary_entity: analysis.primaryEntity,
    sentiment: analysis.sentiment,
    content_risk: analysis.contentRisk,
    risk_reasons: analysis.riskReasons,
    writing_angle: analysis.writingAngle,
    audience_intent: analysis.audienceIntent,
    recommended_word_count: analysis.recommendedWordCount,
    keywords: analysis.keywords,
    related_topics: analysis.relatedTopics,
    analyzed_at: new Date().toISOString(),
  });
}

/**
 * Save validation to database
 */
async function saveValidation(postId: string, validation: any): Promise<void> {
  await supabase.from('content_validation').upsert({
    post_id: postId,
    validation_score: validation.score,
    telugu_percentage: validation.checks.teluguQuality.percentage,
    word_count: validation.checks.wordCount.count,
    toxicity_passed: validation.checks.toxicity.passed,
    flagged_terms: validation.checks.toxicity.flaggedTerms,
    sensitive_flags: validation.checks.sensitiveContent.flags,
    clickbait_score: validation.checks.clickbait.score,
    is_duplicate: !validation.checks.duplicateCheck.passed,
    recommendation: validation.recommendation,
    reasons: validation.reasons,
    validated_at: new Date().toISOString(),
  });
}

/**
 * Main Pipeline: Process content through all stages
 */
export async function processContent(input: PipelineInput): Promise<PipelineOutput> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🚀 [Pipeline] Processing: "${input.title.substring(0, 50)}..."`);
  console.log('═══════════════════════════════════════════════════════════');

  const errors: string[] = [];

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: Content Intelligence (Pre-Analysis)
  // ─────────────────────────────────────────────────────────────
  console.log('\n📊 STAGE 1: Content Intelligence');
  console.log('─────────────────────────────────');

  let analysis = await analyzeContentWithAI(input.title, input.content, input.category);
  if (!analysis) {
    console.log('   ⚠️ AI analysis failed, using rule-based');
    analysis = await analyzeContent(input.title, input.content, input.category);
  }

  console.log(`   🎯 Entity: ${analysis.primaryEntity.name} (${analysis.primaryEntity.type})`);
  console.log(`   📈 Sentiment: ${analysis.sentiment}`);
  console.log(`   ⚠️ Risk: ${analysis.contentRisk}`);
  console.log(`   ✍️ Angle: ${analysis.writingAngle}`);

  // Get category-specific rules
  const categoryRules = await getCategoryRules(input.category);

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: Structured Content Generation
  // ─────────────────────────────────────────────────────────────
  console.log('\n✍️ STAGE 2: Structured Content Generation');
  console.log('─────────────────────────────────────────────');

  const structured = await generateStructuredArticle(
    input.title,
    input.content,
    input.category
  );

  if (!structured) {
    errors.push('Failed to generate structured content');
    console.log('   ❌ Generation failed');

    return {
      success: false,
      status: 'rejected',
      title: input.title,
      body: input.content,
      imageUrl: '',
      score: 0,
      analysis,
      validation: null,
      errors,
    };
  }

  let body = structuredToBody(structured);
  const title = structured.title;

  console.log(`   📝 Title: ${title.substring(0, 50)}...`);
  console.log(`   📊 Words: ${structured.totalWordCount}`);
  console.log(`   📋 Sections: ${structured.sections.length}`);

  // Add disclaimer if needed
  if (categoryRules?.require_disclaimer || analysis.riskReasons.length > 0) {
    body = addDisclaimer(body, input.category, analysis.riskReasons);
    console.log('   ⚠️ Disclaimer added');
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: Post-Generation Validation
  // ─────────────────────────────────────────────────────────────
  console.log('\n🔍 STAGE 3: Post-Generation Validation');
  console.log('─────────────────────────────────────────');

  const validation = await validateContent(
    title,
    body,
    input.category,
    undefined,
    categoryRules?.word_count || 200
  );

  console.log(`   📊 Score: ${validation.score}/100`);
  console.log(`   📋 Recommendation: ${validation.recommendation}`);

  // ─────────────────────────────────────────────────────────────
  // IMAGE: Smart Image Pipeline
  // ─────────────────────────────────────────────────────────────
  console.log('\n🖼️ IMAGE: Smart Image Pipeline');
  console.log('─────────────────────────────────');

  let imageResult;

  if (analysis.primaryEntity.type === 'celebrity') {
    imageResult = await getCelebrityImage(analysis.primaryEntity.name);
  } else if (analysis.primaryEntity.type === 'movie') {
    imageResult = await getMovieImage(analysis.primaryEntity.name);
  } else {
    imageResult = await getSmartImage(input.title, input.category);
  }

  // Use source image if provided and no better alternative found
  const imageUrl = input.sourceImage && imageResult.source === 'fallback'
    ? input.sourceImage
    : imageResult.url;

  console.log(`   🖼️ Image: ${imageResult.source}`);

  // ─────────────────────────────────────────────────────────────
  // SAVE: Create post in database
  // ─────────────────────────────────────────────────────────────
  console.log('\n💾 SAVE: Creating post');
  console.log('─────────────────────────────────');

  const status = validation.recommendation === 'publish' && analysis.contentRisk !== 'high'
    ? 'published'
    : 'draft';

  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F]+/g, '-').substring(0, 50)}-${Date.now().toString(36)}`,
      telugu_body: body,
      category: input.category,
      status: validation.recommendation === 'reject' ? 'draft' : status,
      image_urls: [imageUrl],
    })
    .select()
    .single();

  if (insertError) {
    errors.push(`Database error: ${insertError.message}`);
    console.log(`   ❌ Insert failed: ${insertError.message}`);

    return {
      success: false,
      status: 'rejected',
      title,
      body,
      imageUrl,
      score: validation.score,
      analysis,
      validation,
      errors,
    };
  }

  console.log(`   ✅ Post created: ${post.id}`);
  console.log(`   📋 Status: ${status}`);

  // Save analysis and validation
  await saveAnalysis(post.id, analysis);
  await saveValidation(post.id, validation);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Pipeline Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');

  return {
    success: true,
    postId: post.id,
    status: status as 'published' | 'draft',
    title,
    body,
    imageUrl,
    score: validation.score,
    analysis,
    validation,
    errors,
  };
}

/**
 * Quick pipeline for bulk imports (less validation)
 */
export async function quickProcessContent(input: PipelineInput): Promise<PipelineOutput> {
  console.log(`\n⚡ [QuickPipeline] Processing: "${input.title.substring(0, 40)}..."`);

  const errors: string[] = [];

  // Quick analysis (rule-based only)
  const analysis = await analyzeContent(input.title, input.content, input.category);

  // Quick generation
  const structured = await generateStructuredArticle(
    input.title,
    input.content,
    input.category
  );

  if (!structured) {
    return {
      success: false,
      status: 'rejected',
      title: input.title,
      body: input.content,
      imageUrl: '',
      score: 0,
      analysis,
      validation: null,
      errors: ['Generation failed'],
    };
  }

  const body = structuredToBody(structured);
  const title = structured.title;

  // Quick validation
  const isValid = quickValidate(title, body);

  // Get image
  const imageResult = await getSmartImage(input.title, input.category);
  const imageUrl = input.sourceImage || imageResult.url;

  // Save as draft
  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F]+/g, '-').substring(0, 50)}-${Date.now().toString(36)}`,
      telugu_body: body,
      category: input.category,
      status: 'draft',
      image_urls: [imageUrl],
    })
    .select()
    .single();

  if (insertError) {
    return {
      success: false,
      status: 'rejected',
      title,
      body,
      imageUrl,
      score: 0,
      analysis,
      validation: null,
      errors: [insertError.message],
    };
  }

  console.log(`   ✅ Saved as draft: ${post.id}`);

  return {
    success: true,
    postId: post.id,
    status: 'draft',
    title,
    body,
    imageUrl,
    score: isValid ? 70 : 40,
    analysis,
    validation: null,
    errors,
  };
}

/**
 * Batch process multiple articles
 */
export async function batchProcessContent(
  inputs: PipelineInput[],
  useQuickMode: boolean = true
): Promise<{ success: number; failed: number; results: PipelineOutput[] }> {
  console.log(`\n📦 [BatchPipeline] Processing ${inputs.length} articles...`);

  const results: PipelineOutput[] = [];
  let success = 0;
  let failed = 0;

  for (const input of inputs) {
    try {
      const result = useQuickMode
        ? await quickProcessContent(input)
        : await processContent(input);

      results.push(result);

      if (result.success) {
        success++;
      } else {
        failed++;
      }

      // Delay between articles to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      results.push({
        success: false,
        status: 'rejected',
        title: input.title,
        body: '',
        imageUrl: '',
        score: 0,
        analysis: null,
        validation: null,
        errors: [(error as Error).message],
      });
    }
  }

  console.log(`\n📊 Batch complete: ${success} success, ${failed} failed`);

  return { success, failed, results };
}



