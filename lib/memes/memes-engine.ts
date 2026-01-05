/**
 * MEMES & CARTOONS ENGINE
 *
 * Creates and manages Telugu memes using ONLY legal sources.
 *
 * LEGAL RULES (CRITICAL):
 * - Only use CC-licensed or public domain images
 * - Original AI-generated cartoons allowed
 * - Parody captions are transformative (fair use)
 * - NO Google Image scraping
 * - Store license info for all images
 */

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import type {
  TeluguMeme,
  TeluguCartoon,
  MemeTemplate,
  MemeCategory,
  MemeFormat,
  ContentLicense,
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// LEGAL IMAGE FETCHER
// ============================================================

export class LegalImageFetcher {
  /**
   * Search Wikimedia Commons for images
   */
  async searchWikimediaCommons(query: string, limit: number = 5): Promise<{
    url: string;
    license: ContentLicense;
    attribution: string;
    source_url: string;
  }[]> {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=${limit}&format=json&origin=*`;

      const response = await fetch(searchUrl);
      const data = await response.json();

      const results = [];

      for (const item of data.query?.search || []) {
        const title = item.title;

        // Get image info
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
        const infoResponse = await fetch(infoUrl);
        const infoData = await infoResponse.json();

        const pages = infoData.query?.pages || {};
        const page = Object.values(pages)[0] as any;
        const imageInfo = page?.imageinfo?.[0];

        if (imageInfo?.url) {
          const metadata = imageInfo.extmetadata || {};
          const license = this.parseLicense(metadata.License?.value || '');

          results.push({
            url: imageInfo.url,
            license,
            attribution: metadata.Artist?.value || 'Wikimedia Commons',
            source_url: `https://commons.wikimedia.org/wiki/${title}`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Wikimedia search error:', error);
      return [];
    }
  }

  /**
   * Search Unsplash for images
   */
  async searchUnsplash(query: string, limit: number = 5): Promise<{
    url: string;
    license: ContentLicense;
    attribution: string;
    source_url: string;
  }[]> {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) return [];

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}`,
        {
          headers: { Authorization: `Client-ID ${apiKey}` },
        }
      );

      const data = await response.json();

      return (data.results || []).map((photo: any) => ({
        url: photo.urls.regular,
        license: 'cc0' as ContentLicense,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
        source_url: photo.links.html,
      }));
    } catch (error) {
      console.error('Unsplash search error:', error);
      return [];
    }
  }

  /**
   * Search Pexels for images
   */
  async searchPexels(query: string, limit: number = 5): Promise<{
    url: string;
    license: ContentLicense;
    attribution: string;
    source_url: string;
  }[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`,
        {
          headers: { Authorization: apiKey },
        }
      );

      const data = await response.json();

      return (data.photos || []).map((photo: any) => ({
        url: photo.src.large,
        license: 'cc0' as ContentLicense,
        attribution: `Photo by ${photo.photographer} on Pexels`,
        source_url: photo.url,
      }));
    } catch (error) {
      console.error('Pexels search error:', error);
      return [];
    }
  }

  private parseLicense(licenseText: string): ContentLicense {
    const text = licenseText.toLowerCase();
    if (text.includes('cc0') || text.includes('public domain')) return 'cc0';
    if (text.includes('cc-by-sa') || text.includes('cc by-sa')) return 'cc_by_sa';
    if (text.includes('cc-by') || text.includes('cc by')) return 'cc_by';
    return 'cc_by_sa'; // Default for Wikimedia
  }
}

// ============================================================
// MEME GENERATOR
// ============================================================

export class MemeGenerator {
  private groq: Groq;
  private imageFetcher: LegalImageFetcher;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.imageFetcher = new LegalImageFetcher();
  }

  /**
   * Generate a Telugu meme with legal image
   */
  async generateMeme(
    topic: string,
    category: MemeCategory,
    format: MemeFormat = 'image_text'
  ): Promise<TeluguMeme | null> {
    // Generate caption
    const caption = await this.generateCaption(topic, category);
    if (!caption) return null;

    // Find legal image
    const images = await this.imageFetcher.searchWikimediaCommons(topic, 3);
    if (images.length === 0) {
      // Fallback to Unsplash
      const unsplashImages = await this.imageFetcher.searchUnsplash(topic, 3);
      images.push(...unsplashImages);
    }

    if (images.length === 0) {
      console.warn('No legal images found for topic:', topic);
      return null;
    }

    const selectedImage = images[0];

    return {
      id: this.generateId(),
      title_te: caption.title_te,
      caption_te: caption.caption_te,
      caption_en: caption.caption_en,
      image_url: selectedImage.url,
      format,
      image_source: 'wikimedia_commons',
      image_license: selectedImage.license,
      attribution: selectedImage.attribution,
      source_url: selectedImage.source_url,
      is_original: false,
      category,
      tags: [category, topic.toLowerCase()],
      is_family_safe: caption.is_family_safe,
      contains_political: category === 'political_satire',
      view_count: 0,
      share_count: 0,
      likes: 0,
      status: category === 'political_satire' || category === 'celebrity' ? 'review' : 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate meme caption using AI
   */
  private async generateCaption(topic: string, category: MemeCategory): Promise<{
    title_te: string;
    caption_te: string;
    caption_en: string;
    is_family_safe: boolean;
  } | null> {
    const prompt = `Generate a FUNNY Telugu meme caption about: "${topic}"
Category: ${category}

Rules:
- Write in Telugu script
- Must be humorous but NOT offensive
- Family-safe content only
- Relatable to Telugu audience
- Short and punchy (max 2-3 lines)

Return JSON:
{
  "title_te": "Short title in Telugu",
  "caption_te": "Meme caption in Telugu",
  "caption_en": "English translation",
  "is_family_safe": true
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return this.parseJSON(response);
    } catch (error) {
      console.error('Caption generation error:', error);
      return null;
    }
  }

  /**
   * Generate AI cartoon
   */
  async generateCartoonIdea(topic: string): Promise<TeluguCartoon | null> {
    const prompt = `Create a simple cartoon concept about: "${topic}"
This will be used to generate an AI cartoon for Telugu audience.

Provide:
- Title in Telugu
- Description of the scene
- Character descriptions
- Visual style suggestion

Return JSON:
{
  "title_te": "Telugu title",
  "title_en": "English title",
  "scene_description": "What the cartoon shows",
  "characters": ["char1", "char2"],
  "style": "simple",
  "ai_prompt": "Prompt to generate this as an image"
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 400,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const data = this.parseJSON(response);

      return {
        id: this.generateId(),
        title_te: data.title_te || topic,
        title_en: data.title_en || topic,
        image_url: '', // To be filled by AI image generation
        style: data.style || 'simple',
        panels: 1,
        ai_generated: true,
        generation_prompt: data.ai_prompt,
        topic,
        category: 'relatable' as MemeCategory,
        characters: data.characters || [],
        license: 'ai_generated',
        status: 'draft',
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Cartoon idea generation error:', error);
      return null;
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
    return `meme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================
// MEMES ENGINE (MAIN)
// ============================================================

export class MemesEngine {
  private generator: MemeGenerator;

  constructor() {
    this.generator = new MemeGenerator();
  }

  /**
   * Generate memes for a category
   */
  async generateMemes(
    topics: string[],
    category: MemeCategory,
    count: number = 5
  ): Promise<TeluguMeme[]> {
    console.log(`🎭 Generating memes for category: ${category}`);

    const memes: TeluguMeme[] = [];

    for (let i = 0; i < Math.min(count, topics.length); i++) {
      const meme = await this.generator.generateMeme(topics[i], category);
      if (meme) {
        memes.push(meme);
        console.log(`   ✓ Generated: ${meme.title_te}`);
      }
    }

    // Save to database
    if (memes.length > 0) {
      await this.saveMemes(memes);
    }

    return memes;
  }

  /**
   * Get trending memes
   */
  async getTrendingMemes(limit: number = 20): Promise<TeluguMeme[]> {
    const { data } = await supabase
      .from('memes')
      .select('*')
      .eq('status', 'published')
      .eq('is_family_safe', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get memes by category
   */
  async getMemesByCategory(
    category: MemeCategory,
    limit: number = 20
  ): Promise<TeluguMeme[]> {
    const { data } = await supabase
      .from('memes')
      .select('*')
      .eq('category', category)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Verify meme license
   */
  async verifyLicense(memeId: string): Promise<boolean> {
    const { data } = await supabase
      .from('memes')
      .select('image_license, source_url')
      .eq('id', memeId)
      .single();

    if (!data) return false;

    // Legal licenses
    const legalLicenses: ContentLicense[] = ['cc0', 'cc_by', 'cc_by_sa', 'original', 'ai_generated', 'fair_use'];
    return legalLicenses.includes(data.image_license);
  }

  private async saveMemes(memes: TeluguMeme[]): Promise<void> {
    try {
      await supabase.from('memes').insert(memes);
      console.log(`   💾 Saved ${memes.length} memes to database`);
    } catch (error) {
      console.error('Failed to save memes:', error);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

let engineInstance: MemesEngine | null = null;

export function getMemesEngine(): MemesEngine {
  if (!engineInstance) {
    engineInstance = new MemesEngine();
  }
  return engineInstance;
}

export async function generateMemes(
  topics: string[],
  category: MemeCategory,
  count: number = 5
): Promise<TeluguMeme[]> {
  return getMemesEngine().generateMemes(topics, category, count);
}








