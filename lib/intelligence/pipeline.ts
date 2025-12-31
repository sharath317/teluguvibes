/**
 * SMART CONTENT & IMAGE INTELLIGENCE PIPELINE
 *
 * Main orchestrator that:
 * 1. Ingests from multiple sources
 * 2. Synthesizes Telugu content
 * 3. Selects best images
 * 4. Validates and assigns status
 * 5. Generates variants if needed
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  IngestConfig,
  NormalizedEntity,
  ValidationResult,
  PipelineStats,
  ContentVariant,
  ImageCandidate,
  ContentStatus,
  SynthesisContext,
} from './types';
import { synthesizeContent, generateVariants, fetchFollowUpContext } from './synthesis-engine';
import { selectBestImage, getImageOptions } from './image-intelligence';
import { validateEntity } from './validator';

// ============================================================
// PIPELINE CLASS
// ============================================================

export class ContentPipeline {
  private supabase: SupabaseClient;
  private config: IngestConfig;
  private stats: PipelineStats;

  constructor(config: IngestConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.stats = this.initStats();
  }

  private initStats(): PipelineStats {
    return {
      totalFetched: 0,
      normalized: 0,
      synthesized: 0,
      imagesProcessed: 0,
      validated: 0,
      byStatus: { READY: 0, NEEDS_REVIEW: 0, NEEDS_REWORK: 0, DRAFT: 0 },
      bySource: {},
      errors: [],
      duration: 0,
    };
  }

  // ============================================================
  // MAIN PIPELINE
  // ============================================================

  async run(): Promise<PipelineStats> {
    const startTime = Date.now();
    console.log('\n🚀 Starting Content Intelligence Pipeline...\n');
    console.log(`Mode: ${this.config.mode}`);
    console.log(`Sources: ${this.config.sources.join(', ')}`);
    console.log(`Targets: ${this.config.targets.join(', ')}`);
    console.log(`Limit: ${this.config.limit}\n`);

    try {
      // Step 1: Fetch and normalize data
      const entities = await this.fetchAndNormalize();
      this.stats.totalFetched = entities.length;
      this.stats.normalized = entities.length;

      if (this.config.mode === 'dry') {
        console.log('\n📊 DRY RUN - No changes made');
        this.printStats();
        return this.stats;
      }

      // Step 2: Process each entity
      for (const entity of entities) {
        await this.processEntity(entity);
      }

      // Step 3: Handle reset mode
      if (this.config.mode === 'reset') {
        await this.handleResetMode();
      }

      this.stats.duration = Date.now() - startTime;
      this.printStats();
      return this.stats;

    } catch (error) {
      console.error('Pipeline failed:', error);
      this.stats.errors.push({ entity: 'pipeline', error: String(error) });
      throw error;
    }
  }

  // ============================================================
  // FETCH & NORMALIZE
  // ============================================================

  private async fetchAndNormalize(): Promise<NormalizedEntity[]> {
    const entities: NormalizedEntity[] = [];

    // Fetch from internal database first (for nostalgia priority)
    if (this.config.sources.includes('internal')) {
      console.log('📦 Fetching from internal database...');
      const internalEntities = await this.fetchFromInternal();
      entities.push(...internalEntities);
      this.stats.bySource['internal'] = internalEntities.length;
    }

    // Fetch from TMDB
    if (this.config.sources.includes('tmdb')) {
      console.log('🎬 Fetching from TMDB...');
      // Integration with existing TMDB fetcher
      // const tmdbEntities = await fetchFromTMDB(this.config.limit, this.config.targets);
      // entities.push(...this.normalizeEntities(tmdbEntities, 'tmdb'));
    }

    // Fetch from Wikidata
    if (this.config.sources.includes('wikidata')) {
      console.log('📚 Fetching from Wikidata...');
      // Integration with existing Wikidata fetcher
    }

    // Fetch from News RSS
    if (this.config.sources.includes('news')) {
      console.log('📰 Fetching from News...');
      // Integration with existing news fetcher
    }

    // Fetch from YouTube
    if (this.config.sources.includes('youtube')) {
      console.log('▶️ Fetching from YouTube...');
      // Integration with existing YouTube fetcher
    }

    return entities.slice(0, this.config.limit);
  }

  private async fetchFromInternal(): Promise<NormalizedEntity[]> {
    const entities: NormalizedEntity[] = [];

    // Fetch drafts that need processing
    if (this.config.targets.includes('posts')) {
      const { data: posts } = await this.supabase
        .from('posts')
        .select('*')
        .in('status', ['draft', 'NEEDS_REVIEW', 'NEEDS_REWORK'])
        .limit(this.config.limit);

      for (const post of posts || []) {
        entities.push(this.normalizePost(post));
      }
    }

    // Fetch celebrities needing enrichment
    if (this.config.targets.includes('celebrities')) {
      const { data: celebs } = await this.supabase
        .from('celebrities')
        .select('*')
        .or('short_bio.is.null,profile_image.is.null')
        .limit(this.config.limit);

      for (const celeb of celebs || []) {
        entities.push(this.normalizeCelebrity(celeb));
      }
    }

    return entities;
  }

  private normalizePost(post: Record<string, unknown>): NormalizedEntity {
    return {
      id: post.id as string,
      slug: post.slug as string,
      entityType: 'post',
      title_en: post.title as string,
      title_te: post.title_te as string,
      excerpt: post.excerpt as string,
      body_te: post.telugu_body as string || post.body_te as string,
      imageUrl: post.image_url as string,
      category: post.category as string,
      status: (post.status as ContentStatus) || 'DRAFT',
      sources: [{
        source: 'internal',
        sourceId: post.id as string,
        confidence: 1,
        fetchedAt: new Date().toISOString(),
      }],
      rawData: post,
    };
  }

  private normalizeCelebrity(celeb: Record<string, unknown>): NormalizedEntity {
    return {
      id: celeb.id as string,
      slug: celeb.slug as string,
      entityType: 'celebrity',
      title_en: celeb.name_en as string,
      title_te: celeb.name_te as string,
      body_te: celeb.short_bio_te as string,
      imageUrl: celeb.profile_image as string,
      status: 'DRAFT',
      sources: [{
        source: 'internal',
        sourceId: celeb.id as string,
        confidence: 1,
        fetchedAt: new Date().toISOString(),
      }],
      rawData: celeb,
    };
  }

  // ============================================================
  // ENTITY PROCESSING
  // ============================================================

  private async processEntity(entity: NormalizedEntity): Promise<void> {
    console.log(`\n📝 Processing: ${entity.title_en || entity.slug}`);

    try {
      // Step 1: Fetch follow-up context
      const additionalContext = await fetchFollowUpContext(
        entity.title_en,
        entity.category
      );

      // Step 2: Synthesize content (if needed)
      if (!entity.body_te || entity.body_te.length < 100 || this.config.forceAI) {
        console.log('  🤖 Synthesizing content...');
        const synthesisContext: SynthesisContext = {
          topic: entity.title_en,
          entityType: entity.entityType,
          category: entity.category,
          ...additionalContext,
        };

        const synthesized = await synthesizeContent(synthesisContext);
        if (synthesized) {
          entity.title_te = synthesized.title_te || entity.title_te;
          entity.excerpt = synthesized.excerpt || entity.excerpt;
          entity.body_te = synthesized.body_te || entity.body_te;
          this.stats.synthesized++;
        }
      }

      // Step 3: Select best image
      console.log('  🖼️ Selecting image...');
      const imageResult = await selectBestImage({
        topic: entity.title_en,
        entityType: entity.entityType,
        category: entity.category,
        celebrityName: entity.entityType === 'celebrity' ? entity.title_en : undefined,
        movieTitle: entity.entityType === 'movie' ? entity.title_en : undefined,
      });

      if (imageResult.selectedImage) {
        entity.imageUrl = imageResult.selectedImage.url;
        entity.imageSource = imageResult.selectedImage.source;
        entity.imageLicense = imageResult.selectedImage.metadata.license;
        entity.imageCandidates = imageResult.candidates;
        this.stats.imagesProcessed++;
      }

      // Step 4: Validate
      console.log('  ✅ Validating...');
      const validation = validateEntity(entity);
      entity.validationResult = validation;
      entity.status = validation.status;
      this.stats.validated++;
      this.stats.byStatus[validation.status]++;

      // Step 5: Generate variants if not READY
      if (validation.status !== 'READY') {
        console.log(`  🔄 Status: ${validation.status} - Generating variants...`);
        entity.variants = await this.generateVariantsForEntity(entity);
        entity.imageCandidates = await getImageOptions({
          topic: entity.title_en,
          entityType: entity.entityType,
          category: entity.category,
        }, 3);
      }

      // Step 6: Save to database (if not dry run)
      if (this.config.mode !== 'dry') {
        await this.saveEntity(entity);
      }

      console.log(`  ✓ Completed (Status: ${entity.status}, Score: ${validation.score})`);

    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
      this.stats.errors.push({ entity: entity.slug, error: String(error) });
    }
  }

  private async generateVariantsForEntity(entity: NormalizedEntity): Promise<ContentVariant[]> {
    const variants = await generateVariants({
      topic: entity.title_en,
      entityType: entity.entityType,
      category: entity.category,
    }, 3);

    return variants;
  }

  // ============================================================
  // DATABASE OPERATIONS
  // ============================================================

  private async saveEntity(entity: NormalizedEntity): Promise<void> {
    const table = this.getTableForEntity(entity);

    if (this.config.mode === 'smart') {
      // Only update weak/missing fields
      await this.smartUpdate(entity, table);
    } else {
      // Full update
      await this.fullUpdate(entity, table);
    }
  }

  private getTableForEntity(entity: NormalizedEntity): string {
    switch (entity.entityType) {
      case 'post':
      case 'review':
        return 'posts';
      case 'celebrity':
        return 'celebrities';
      case 'movie':
        return 'movies';
      default:
        return 'posts';
    }
  }

  private async smartUpdate(entity: NormalizedEntity, table: string): Promise<void> {
    // Build update object with only non-null fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // For posts
    if (table === 'posts') {
      if (entity.title_te && !entity.rawData?.title_te) updates.title_te = entity.title_te;
      if (entity.body_te && !entity.rawData?.body_te) updates.body_te = entity.body_te;
      if (entity.excerpt && !entity.rawData?.excerpt) updates.excerpt = entity.excerpt;
      if (entity.imageUrl && !entity.rawData?.image_url) updates.image_url = entity.imageUrl;
      updates.status = entity.status.toLowerCase();
    }

    // For celebrities
    if (table === 'celebrities') {
      if (entity.title_te && !entity.rawData?.name_te) updates.name_te = entity.title_te;
      if (entity.body_te && !entity.rawData?.short_bio_te) updates.short_bio_te = entity.body_te;
      if (entity.imageUrl && !entity.rawData?.profile_image) updates.profile_image = entity.imageUrl;
    }

    if (Object.keys(updates).length > 1) {
      await this.supabase
        .from(table)
        .update(updates)
        .eq('id', entity.id);
    }
  }

  private async fullUpdate(entity: NormalizedEntity, table: string): Promise<void> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (table === 'posts') {
      updates.title_te = entity.title_te;
      updates.body_te = entity.body_te;
      updates.excerpt = entity.excerpt;
      updates.image_url = entity.imageUrl;
      updates.status = entity.status.toLowerCase();
    }

    if (table === 'celebrities') {
      updates.name_te = entity.title_te;
      updates.short_bio_te = entity.body_te;
      updates.profile_image = entity.imageUrl;
    }

    await this.supabase
      .from(table)
      .update(updates)
      .eq('id', entity.id);
  }

  private async handleResetMode(): Promise<void> {
    console.log('\n🔄 Reset Mode: Archiving old content...');

    // Archive NEEDS_REWORK items
    const { data: toArchive } = await this.supabase
      .from('posts')
      .select('id')
      .eq('status', 'NEEDS_REWORK');

    if (toArchive && toArchive.length > 0) {
      // Move to archive table or mark as archived
      await this.supabase
        .from('posts')
        .update({ status: 'archived' })
        .in('id', toArchive.map(p => p.id));

      console.log(`  Archived ${toArchive.length} items`);
    }
  }

  // ============================================================
  // STATS & REPORTING
  // ============================================================

  private printStats(): void {
    console.log('\n═══════════════════════════════════════');
    console.log('         PIPELINE COMPLETE');
    console.log('═══════════════════════════════════════\n');

    console.log(`📊 Summary:`);
    console.log(`  Total Fetched:    ${this.stats.totalFetched}`);
    console.log(`  Normalized:       ${this.stats.normalized}`);
    console.log(`  Synthesized:      ${this.stats.synthesized}`);
    console.log(`  Images Processed: ${this.stats.imagesProcessed}`);
    console.log(`  Validated:        ${this.stats.validated}`);

    console.log(`\n📈 By Status:`);
    console.log(`  ✅ READY:         ${this.stats.byStatus.READY}`);
    console.log(`  🔍 NEEDS_REVIEW:  ${this.stats.byStatus.NEEDS_REVIEW}`);
    console.log(`  🔄 NEEDS_REWORK:  ${this.stats.byStatus.NEEDS_REWORK}`);
    console.log(`  📝 DRAFT:         ${this.stats.byStatus.DRAFT}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors: ${this.stats.errors.length}`);
      for (const err of this.stats.errors.slice(0, 5)) {
        console.log(`  - ${err.entity}: ${err.error}`);
      }
    }

    console.log(`\n⏱️ Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);
    console.log();
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

export async function runPipeline(config: Partial<IngestConfig> = {}): Promise<PipelineStats> {
  const fullConfig: IngestConfig = {
    mode: config.mode || 'smart',
    sources: config.sources || ['internal', 'tmdb', 'wikidata'],
    targets: config.targets || ['posts', 'celebrities', 'movies'],
    limit: config.limit || 50,
    forceAI: config.forceAI || false,
    verbose: config.verbose || false,
  };

  const pipeline = new ContentPipeline(fullConfig);
  return pipeline.run();
}

export async function processAndValidate(postId: string): Promise<NormalizedEntity | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return null;

  const entity: NormalizedEntity = {
    id: post.id,
    slug: post.slug,
    entityType: 'post',
    title_en: post.title,
    title_te: post.title_te,
    excerpt: post.excerpt,
    body_te: post.telugu_body || post.body_te,
    imageUrl: post.image_url,
    category: post.category,
    status: 'DRAFT',
    sources: [{ source: 'internal', sourceId: post.id, confidence: 1, fetchedAt: new Date().toISOString() }],
  };

  // Process through pipeline steps
  const imageResult = await selectBestImage({
    topic: entity.title_en,
    entityType: 'post',
    category: entity.category,
  });

  if (imageResult.selectedImage) {
    entity.imageUrl = imageResult.selectedImage.url;
    entity.imageSource = imageResult.selectedImage.source;
    entity.imageCandidates = imageResult.candidates;
  }

  const validation = validateEntity(entity);
  entity.validationResult = validation;
  entity.status = validation.status;

  return entity;
}
