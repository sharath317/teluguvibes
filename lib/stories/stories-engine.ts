/**
 * TELUGU LIFE STORIES ENGINE
 *
 * Creates original Telugu narratives inspired by Reddit posts.
 *
 * LEGAL RULES (CRITICAL):
 * - Reddit used ONLY as thematic inspiration
 * - AI must rewrite into COMPLETELY ORIGINAL Telugu narrative
 * - No usernames, no verbatim content
 * - Attribution: "Inspired by an anonymous story"
 */

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import type {
  TeluguStory,
  StoryCategory,
  StoryTone,
  StoryGenerationConfig,
  RedditInspirationPost,
  STORY_CATEGORY_CONFIG,
} from './types';
import { STORY_CATEGORY_CONFIG as CategoryConfig } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// REDDIT INSPIRATION FETCHER
// ============================================================

const REDDIT_API_BASE = 'https://www.reddit.com';

export class RedditInspirationFetcher {
  private rateLimitDelay = 2000; // 2 seconds between requests
  private lastRequestTime = 0;

  /**
   * Fetch trending posts from allowed subreddits
   */
  async fetchInspiration(
    subreddit: string,
    limit: number = 10
  ): Promise<RedditInspirationPost[]> {
    await this.respectRateLimit();

    try {
      const url = `${REDDIT_API_BASE}/r/${subreddit}/hot.json?limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TeluguVibes/1.0 (Educational content inspiration)',
        },
      });

      if (!response.ok) {
        console.warn(`Reddit fetch failed for r/${subreddit}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const posts = data?.data?.children || [];

      return posts
        .map((post: any) => this.transformPost(post.data, subreddit))
        .filter((p: RedditInspirationPost | null) => p !== null && p.is_suitable);
    } catch (error) {
      console.error(`Reddit fetch error for r/${subreddit}:`, error);
      return [];
    }
  }

  private transformPost(post: any, subreddit: string): RedditInspirationPost | null {
    // Skip if no text content
    if (!post.selftext || post.selftext.length < 200) return null;
    if (post.over_18) return null; // Skip NSFW

    // Extract theme WITHOUT copying content
    const theme = this.extractTheme(post.title, post.selftext);
    const emotionalCore = this.extractEmotionalCore(post.selftext);
    const category = this.detectCategory(post.title, post.selftext, subreddit);

    // Calculate Telugu relevance
    const relevance = this.calculateTeluguRelevance(post.title, post.selftext, subreddit);

    return {
      subreddit,
      title: post.title,
      selftext: post.selftext,
      score: post.score,
      num_comments: post.num_comments,
      created_utc: post.created_utc,
      permalink: post.permalink,
      theme,
      emotional_core: emotionalCore,
      target_category: category,
      telugu_relevance_score: relevance,
      is_suitable: relevance > 0.5 && this.isFamilySafe(post.selftext),
    };
  }

  private extractTheme(title: string, text: string): string {
    // Extract high-level theme only, NOT content
    const themes = [];

    if (/love|relationship|partner|marriage/i.test(text)) themes.push('relationship');
    if (/parent|mother|father|family/i.test(text)) themes.push('family');
    if (/job|career|work|boss/i.test(text)) themes.push('career');
    if (/friend|friendship/i.test(text)) themes.push('friendship');
    if (/college|school|exam|student/i.test(text)) themes.push('education');
    if (/struggle|overcome|success/i.test(text)) themes.push('growth');

    return themes.join(', ') || 'life experience';
  }

  private extractEmotionalCore(text: string): string {
    // Detect primary emotion WITHOUT copying content
    if (/happy|joy|grateful|blessed/i.test(text)) return 'gratitude';
    if (/sad|lost|miss|grief/i.test(text)) return 'longing';
    if (/angry|frustrated|unfair/i.test(text)) return 'frustration';
    if (/hope|dream|believe/i.test(text)) return 'hope';
    if (/love|heart|care/i.test(text)) return 'love';
    if (/proud|achieve|success/i.test(text)) return 'pride';
    return 'reflection';
  }

  private detectCategory(title: string, text: string, subreddit: string): StoryCategory {
    const combined = `${title} ${text}`.toLowerCase();

    if (subreddit.includes('relationship') || /love|partner|dating/i.test(combined)) {
      return 'love';
    }
    if (/parent|mother|father|family|sibling/i.test(combined)) {
      return 'family';
    }
    if (/college|school|exam|study|student/i.test(combined)) {
      return 'student';
    }
    if (/job|career|work|salary|office/i.test(combined)) {
      return 'career';
    }
    if (/friend|friendship/i.test(combined)) {
      return 'friendship';
    }
    if (/inspir|motivat|overcome|success|achieve/i.test(combined)) {
      return 'inspiration';
    }
    if (/middle.?class|budget|save|expense/i.test(combined)) {
      return 'middle_class';
    }

    return 'life_lessons';
  }

  private calculateTeluguRelevance(title: string, text: string, subreddit: string): number {
    let score = 0.5; // Base score

    // Boost for India-related subreddits
    if (['india', 'IndianRelationships'].includes(subreddit)) {
      score += 0.3;
    }

    // Check for universal themes
    const combined = `${title} ${text}`.toLowerCase();
    const universalThemes = [
      'family', 'parent', 'marriage', 'love', 'friend',
      'job', 'career', 'school', 'college', 'neighbor',
    ];

    for (const theme of universalThemes) {
      if (combined.includes(theme)) score += 0.05;
    }

    // Penalty for very Western-specific topics
    const westernTopics = ['thanksgiving', 'christmas', 'prom', 'sorority', 'fraternity'];
    for (const topic of westernTopics) {
      if (combined.includes(topic)) score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private isFamilySafe(text: string): boolean {
    const unsafePatterns = [
      /\bsex\b/i, /\bdrug/i, /\bviolence\b/i, /\babuse\b/i,
      /\bsuicid/i, /\bself.?harm/i, /\brape\b/i,
    ];

    return !unsafePatterns.some(p => p.test(text));
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;

    if (timeSinceLast < this.rateLimitDelay) {
      await new Promise(r => setTimeout(r, this.rateLimitDelay - timeSinceLast));
    }

    this.lastRequestTime = Date.now();
  }
}

// ============================================================
// STORY GENERATOR
// ============================================================

export class TeluguStoryGenerator {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Generate an original Telugu story from inspiration
   */
  async generateStory(config: StoryGenerationConfig): Promise<TeluguStory> {
    const categoryInfo = CategoryConfig[config.category];

    const prompt = `You are a Telugu storyteller creating ORIGINAL narratives.
You are given a THEME and EMOTIONAL CORE - NOT actual content to copy.

THEME: ${config.theme}
EMOTIONAL CORE: ${config.emotional_core}
CATEGORY: ${categoryInfo.name_en} (${categoryInfo.name_te})
TONE: ${config.tone}
SETTING: ${config.setting || 'Telugu household'}

Write a COMPLETELY ORIGINAL Telugu story (in Telugu script) that:
1. Is set in Telugu culture (Andhra/Telangana context)
2. Uses natural Telugu conversational style
3. Has relatable Telugu characters with typical names
4. References familiar Telugu cultural elements
5. Is heartwarming and family-safe

STRUCTURE:
1. కథ పేరు (Catchy Telugu title)
2. హృదయాన్ని తాకే ప్రారంభం (Emotional opening - 3 lines)
3. పాత్రల పరిచయం (Character introduction)
4. కథ (Main story - ${config.target_length === 'short' ? '300' : config.target_length === 'medium' ? '500' : '800'} words)
5. సందేశం (Life lesson or takeaway)

CRITICAL RULES:
- Write ONLY in Telugu script
- Create NEW characters, NEW story, NEW dialogue
- This must be TRANSFORMATIVE - not a translation
- Include Telugu cultural nuances (festival, food, family dynamics)
- Keep it positive and uplifting

Return JSON:
{
  "title_te": "తెలుగు శీర్షిక",
  "title_en": "English Title",
  "body_te": "Full story in Telugu...",
  "summary_te": "2-3 line summary",
  "reading_time_minutes": 3,
  "word_count": 400
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = this.parseJSON(response);

      return {
        id: this.generateId(),
        title_te: parsed.title_te || 'కథ',
        title_en: parsed.title_en || 'Story',
        body_te: parsed.body_te || '',
        summary_te: parsed.summary_te || '',
        category: config.category,
        tone: config.tone,
        tags: this.generateTags(config),
        reading_time_minutes: parsed.reading_time_minutes || 3,
        word_count: parsed.word_count || 0,
        inspiration_source: 'reddit',
        source_subreddit: undefined, // Never store actual source
        original_theme: config.theme,
        is_original_narrative: true,
        attribution_text: 'ఒక అనామక కథ ద్వారా ప్రేరణ పొందింది (Inspired by an anonymous story)',
        status: 'draft',
        view_count: 0,
        read_completion_rate: 0,
        likes: 0,
        ai_generated: true,
        generation_confidence: 0.85,
        is_evergreen: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Story generation failed:', error);
      throw error;
    }
  }

  private parseJSON(response: string): any {
    try {
      let clean = response.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      return JSON.parse(clean);
    } catch {
      return {};
    }
  }

  private generateId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateTags(config: StoryGenerationConfig): string[] {
    const tags = [config.category, config.tone];
    if (config.setting) tags.push(config.setting);
    if (config.cultural_elements) tags.push(...config.cultural_elements);
    return tags;
  }
}

// ============================================================
// STORIES ENGINE (MAIN ORCHESTRATOR)
// ============================================================

export class StoriesEngine {
  private fetcher: RedditInspirationFetcher;
  private generator: TeluguStoryGenerator;

  constructor() {
    this.fetcher = new RedditInspirationFetcher();
    this.generator = new TeluguStoryGenerator();
  }

  /**
   * Generate stories for a category
   */
  async generateStoriesForCategory(
    category: StoryCategory,
    count: number = 3
  ): Promise<TeluguStory[]> {
    console.log(`📖 Generating ${count} stories for category: ${category}`);

    const stories: TeluguStory[] = [];

    // Get inspiration from relevant subreddits
    const subreddits = this.getRelevantSubreddits(category);
    const inspirations: RedditInspirationPost[] = [];

    for (const sub of subreddits) {
      const posts = await this.fetcher.fetchInspiration(sub, 5);
      inspirations.push(...posts.filter(p => p.target_category === category));
    }

    // Generate stories from inspirations
    for (let i = 0; i < Math.min(count, inspirations.length); i++) {
      const inspiration = inspirations[i];

      try {
        const story = await this.generator.generateStory({
          category,
          tone: this.inferTone(inspiration.emotional_core),
          target_length: 'medium',
          theme: inspiration.theme,
          emotional_core: inspiration.emotional_core,
          setting: 'city',
          cultural_elements: ['Telugu family', 'Telugu festival'],
        });

        stories.push(story);
        console.log(`   ✓ Generated: ${story.title_en}`);
      } catch (error) {
        console.warn(`   ✗ Failed to generate story:`, error);
      }
    }

    // Save to database
    if (stories.length > 0) {
      await this.saveStories(stories);
    }

    return stories;
  }

  /**
   * Get evergreen stories for recycling
   */
  async getEvergreenStories(limit: number = 10): Promise<TeluguStory[]> {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('is_evergreen', true)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Recycle a story with fresh intro
   */
  async recycleStory(storyId: string): Promise<TeluguStory | null> {
    const { data: story } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (!story) return null;

    // Generate fresh intro
    const freshIntro = await this.generateFreshIntro(story);

    // Update story
    const { data: updated } = await supabase
      .from('stories')
      .update({
        body_te: freshIntro + story.body_te.substring(story.body_te.indexOf('\n\n')),
        last_recycled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .select()
      .single();

    return updated;
  }

  private getRelevantSubreddits(category: StoryCategory): string[] {
    const mapping: Record<StoryCategory, string[]> = {
      love: ['relationships', 'relationship_advice', 'IndianRelationships'],
      family: ['india', 'offmychest', 'trueoffmychest'],
      inspiration: ['india', 'trueoffmychest'],
      middle_class: ['india', 'offmychest'],
      student: ['india', 'offmychest'],
      career: ['india', 'offmychest'],
      friendship: ['trueoffmychest', 'offmychest'],
      life_lessons: ['india', 'trueoffmychest', 'AmItheAsshole'],
    };

    return mapping[category] || ['india'];
  }

  private inferTone(emotionalCore: string): StoryTone {
    const mapping: Record<string, StoryTone> = {
      gratitude: 'heartwarming',
      longing: 'emotional',
      frustration: 'dramatic',
      hope: 'inspirational',
      love: 'heartwarming',
      pride: 'inspirational',
      reflection: 'reflective',
    };

    return mapping[emotionalCore] || 'reflective';
  }

  private async generateFreshIntro(story: TeluguStory): Promise<string> {
    const prompt = `Write a fresh, engaging 2-3 line Telugu intro for this story theme:
Theme: ${story.original_theme}
Category: ${story.category}

Return ONLY the Telugu text, nothing else.`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || '';
  }

  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  private async saveStories(stories: TeluguStory[]): Promise<void> {
    try {
      await supabase.from('stories').insert(stories);
      console.log(`   💾 Saved ${stories.length} stories to database`);
    } catch (error) {
      console.error('Failed to save stories:', error);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

let engineInstance: StoriesEngine | null = null;

export function getStoriesEngine(): StoriesEngine {
  if (!engineInstance) {
    engineInstance = new StoriesEngine();
  }
  return engineInstance;
}

export async function generateStories(
  category: StoryCategory,
  count: number = 3
): Promise<TeluguStory[]> {
  return getStoriesEngine().generateStoriesForCategory(category, count);
}
