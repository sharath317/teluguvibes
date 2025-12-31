/**
 * Hot Media Content Discovery Service
 * 
 * Discovers glamour content from multiple sources:
 * - Instagram posts/reels (via oEmbed)
 * - YouTube shorts/videos
 * - TMDB celebrity images (multiple per person)
 * - Trending hashtags and topics
 */

import { createClient } from '@supabase/supabase-js';

// Types
export interface DiscoveredContent {
  entity_id: string | null;
  entity_name: string;
  entity_type: 'actress' | 'anchor' | 'model' | 'influencer';
  platform: 'instagram' | 'youtube' | 'tmdb' | 'twitter';
  source_url: string;
  embed_url?: string;
  embed_html?: string;
  image_url?: string;
  thumbnail_url?: string;
  content_type: 'image' | 'video' | 'reel' | 'post';
  suggested_category: string;
  suggested_tags: string[];
  confidence_score: number;
  discovery_source: string;
  raw_data?: Record<string, unknown>;
}

export interface DiscoveryOptions {
  maxPerCelebrity?: number;
  categories?: string[];
  includeReels?: boolean;
  includePhotoshoots?: boolean;
  includeTrending?: boolean;
  minConfidence?: number;
}

// Celebrity Instagram handles (verified public accounts)
const CELEBRITY_SOCIAL: Record<string, { instagram?: string; youtube?: string }> = {
  'Samantha Ruth Prabhu': { instagram: 'samantharuthprabhuoffl' },
  'Rashmika Mandanna': { instagram: 'rashmika_mandanna' },
  'Pooja Hegde': { instagram: 'poaborojahegde' },
  'Kajal Aggarwal': { instagram: 'kaaborajalagarwalofficial' },
  'Tamannaah Bhatia': { instagram: 'taaboramannaboraahspeaks' },
  'Anupama Parameswaran': { instagram: 'anupamaparameswaran96' },
  'Keerthy Suresh': { instagram: 'keaborerthysureshofficial' },
  'Shruti Haasan': { instagram: 'shrutzhaasan' },
  'Nayanthara': { instagram: 'nayaboranthara' },
  'Sai Pallavi': { instagram: 'sai_pallavi.senthaaboramarai' },
  'Nabha Natesh': { instagram: 'nabhanatesh' },
  'Krithi Shetty': { instagram: 'krithi.shetty' },
  'Sreeleela': { instagram: 'sreeleela14' },
  'Rakul Preet Singh': { instagram: 'raaborakulpreet' },
  'Sreemukhi': { instagram: 'sreemukhi' },
  'Anasuya Bharadwaj': { instagram: 'anaborasuyakabbaboraradorai' },
  'Rashmi Gautam': { instagram: 'rasaborahmigautam' },
  'Divi Vadthya': { instagram: 'dikiabora_vadthya' },
  'Kavya Thapar': { instagram: 'kavaborayathapar' },
  'Vedhika': { instagram: 'vedhaboraika4u' },
};

// Known Instagram post URLs for photoshoots (curated collection)
// These are public posts that can be legally embedded via oEmbed
const KNOWN_INSTAGRAM_POSTS: Record<string, string[]> = {
  // Add known public photoshoot post URLs here
  // Format: 'Celebrity Name': ['https://instagram.com/p/POST_ID', ...]
};

// Known YouTube shorts for reels/videos
const KNOWN_YOUTUBE_SHORTS: Record<string, string[]> = {
  // Format: 'Celebrity Name': ['https://youtube.com/shorts/VIDEO_ID', ...]
};

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  photoshoot: ['photoshoot', 'shoot', 'magazine', 'editorial', 'cover', 'photography', 'clicks'],
  fashion: ['fashion', 'style', 'outfit', 'designer', 'couture', 'collection', 'runway'],
  traditional: ['saree', 'lehenga', 'ethnic', 'traditional', 'desi', 'indian', 'pattu'],
  western: ['western', 'gown', 'dress', 'casual', 'party', 'cocktail'],
  fitness: ['gym', 'workout', 'fitness', 'yoga', 'exercise', 'training', 'health'],
  reels: ['reel', 'dance', 'trending', 'viral', 'challenge', 'fun'],
  events: ['event', 'launch', 'premiere', 'award', 'ceremony', 'press', 'promotion'],
  beach: ['beach', 'vacation', 'travel', 'holiday', 'pool', 'summer', 'maldives', 'goa'],
};

/**
 * Fetch Instagram oEmbed data
 */
async function fetchInstagramEmbed(postUrl: string): Promise<DiscoveredContent | null> {
  try {
    const oEmbedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(postUrl)}&omitscript=true`;
    const response = await fetch(oEmbedUrl);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      entity_id: null,
      entity_name: data.author_name || 'Unknown',
      entity_type: 'actress',
      platform: 'instagram',
      source_url: postUrl,
      embed_url: postUrl,
      embed_html: data.html,
      thumbnail_url: data.thumbnail_url,
      content_type: postUrl.includes('/reel/') ? 'reel' : 'post',
      suggested_category: 'photoshoot',
      suggested_tags: ['instagram', 'glamour'],
      confidence_score: 70,
      discovery_source: 'instagram_oembed',
      raw_data: data,
    };
  } catch (error) {
    console.error('Instagram oEmbed error:', error);
    return null;
  }
}

/**
 * Fetch YouTube oEmbed data
 */
async function fetchYouTubeEmbed(videoUrl: string): Promise<DiscoveredContent | null> {
  try {
    // Extract video ID
    const videoIdMatch = videoUrl.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) return null;
    
    const videoId = videoIdMatch[1];
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(oEmbedUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    const isShort = videoUrl.includes('/shorts/');
    
    return {
      entity_id: null,
      entity_name: data.author_name || 'Unknown',
      entity_type: 'actress',
      platform: 'youtube',
      source_url: videoUrl,
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      embed_html: data.html,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      content_type: isShort ? 'reel' : 'video',
      suggested_category: isShort ? 'reels' : 'events',
      suggested_tags: ['youtube', isShort ? 'shorts' : 'video'],
      confidence_score: 75,
      discovery_source: 'youtube_oembed',
      raw_data: data,
    };
  } catch (error) {
    console.error('YouTube oEmbed error:', error);
    return null;
  }
}

/**
 * Fetch multiple TMDB images for a celebrity - prioritizing full-body shots
 */
async function fetchTMDBImages(celebrityName: string, limit = 8): Promise<DiscoveredContent[]> {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return [];
  
  const results: DiscoveredContent[] = [];
  
  try {
    // Search for person
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${tmdbKey}&query=${encodeURIComponent(celebrityName)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.results || searchData.results.length === 0) return [];
    
    const person = searchData.results[0];
    const personId = person.id;
    
    // PRIORITY 1: Tagged images (movie stills, red carpet - full body shots!)
    const taggedUrl = `https://api.themoviedb.org/3/person/${personId}/tagged_images?api_key=${tmdbKey}&page=1`;
    const taggedRes = await fetch(taggedUrl);
    const taggedData = await taggedRes.json();
    
    if (taggedData.results && taggedData.results.length > 0) {
      // Filter for high-quality full-body images (prefer backdrops and posters)
      const taggedImages = taggedData.results
        .filter((img: any) => {
          // Prefer backdrops (landscape) and posters for full-body shots
          const isBackdrop = img.image_type === 'backdrop';
          const isPoster = img.image_type === 'poster';
          const hasGoodAspect = img.aspect_ratio && (img.aspect_ratio > 1.2 || img.aspect_ratio < 0.8);
          return img.file_path && (isBackdrop || isPoster || hasGoodAspect);
        })
        .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 5);
      
      const categories = ['photoshoot', 'events', 'fashion', 'western', 'traditional'];
      
      for (let i = 0; i < taggedImages.length; i++) {
        const img = taggedImages[i];
        // Use original size for better quality full-body shots
        const imageUrl = `https://image.tmdb.org/t/p/original${img.file_path}`;
        const thumbUrl = `https://image.tmdb.org/t/p/w780${img.file_path}`;
        const category = categories[i % categories.length];
        
        results.push({
          entity_id: null,
          entity_name: celebrityName,
          entity_type: 'actress',
          platform: 'tmdb',
          source_url: imageUrl,
          image_url: imageUrl,
          thumbnail_url: thumbUrl,
          content_type: 'image',
          suggested_category: category,
          suggested_tags: [celebrityName.split(' ')[0], 'movie', 'photoshoot', img.media?.title || '', category],
          confidence_score: 85 + Math.min(10, (img.vote_average || 0)),
          discovery_source: 'tmdb_tagged_fullbody',
          raw_data: img,
        });
      }
    }
    
    // PRIORITY 2: Movie credits to get poster/backdrop images
    const creditsUrl = `https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${tmdbKey}`;
    const creditsRes = await fetch(creditsUrl);
    const creditsData = await creditsRes.json();
    
    if (creditsData.cast && creditsData.cast.length > 0) {
      // Get images from their top movies
      const topMovies = creditsData.cast
        .filter((m: any) => m.poster_path || m.backdrop_path)
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 3);
      
      for (const movie of topMovies) {
        // Fetch movie images which often include cast photos
        const movieImagesUrl = `https://api.themoviedb.org/3/movie/${movie.id}/images?api_key=${tmdbKey}`;
        const movieImagesRes = await fetch(movieImagesUrl);
        const movieImagesData = await movieImagesRes.json();
        
        // Get backdrops (wide shots often featuring the celebrity)
        if (movieImagesData.backdrops && movieImagesData.backdrops.length > 0) {
          const backdrop = movieImagesData.backdrops[0];
          const imageUrl = `https://image.tmdb.org/t/p/original${backdrop.file_path}`;
          
          results.push({
            entity_id: null,
            entity_name: celebrityName,
            entity_type: 'actress',
            platform: 'tmdb',
            source_url: imageUrl,
            image_url: imageUrl,
            thumbnail_url: `https://image.tmdb.org/t/p/w780${backdrop.file_path}`,
            content_type: 'image',
            suggested_category: 'events',
            suggested_tags: [celebrityName.split(' ')[0], movie.title || '', 'movie', 'scene'],
            confidence_score: 80,
            discovery_source: 'tmdb_movie_backdrop',
            raw_data: backdrop,
          });
        }
      }
    }
    
    // PRIORITY 3: Profile images (headshots - only if we don't have enough)
    if (results.length < limit) {
      const imagesUrl = `https://api.themoviedb.org/3/person/${personId}/images?api_key=${tmdbKey}`;
      const imagesRes = await fetch(imagesUrl);
      const imagesData = await imagesRes.json();
      
      if (imagesData.profiles && imagesData.profiles.length > 0) {
        // Sort by vote_average and aspect ratio (taller = more full body)
        const sortedProfiles = imagesData.profiles
          .sort((a: any, b: any) => {
            // Prefer images with lower aspect ratio (taller/more full-body)
            const aScore = (b.vote_average || 0) - (a.aspect_ratio || 0.667) * 5;
            const bScore = (a.vote_average || 0) - (b.aspect_ratio || 0.667) * 5;
            return aScore - bScore;
          })
          .slice(0, limit - results.length);
        
        for (let i = 0; i < sortedProfiles.length; i++) {
          const profile = sortedProfiles[i];
          const imageUrl = `https://image.tmdb.org/t/p/original${profile.file_path}`;
          
          const categories = ['photoshoot', 'fashion', 'traditional', 'western'];
          const category = categories[i % categories.length];
          
          results.push({
            entity_id: null,
            entity_name: celebrityName,
            entity_type: 'actress',
            platform: 'tmdb',
            source_url: imageUrl,
            image_url: imageUrl,
            thumbnail_url: `https://image.tmdb.org/t/p/w500${profile.file_path}`,
            content_type: 'image',
            suggested_category: category,
            suggested_tags: [celebrityName.split(' ')[0], 'tmdb', 'celebrity', category],
            confidence_score: 75 + Math.min(10, (profile.vote_average || 0) * 2),
            discovery_source: 'tmdb_profile',
            raw_data: profile,
          });
        }
      }
    }
  } catch (error) {
    console.error(`TMDB fetch error for ${celebrityName}:`, error);
  }
  
  return results.slice(0, limit);
}

/**
 * Search Wikimedia Commons for high-quality event/red carpet photos
 */
async function searchWikimediaCommons(celebrityName: string, limit = 5): Promise<DiscoveredContent[]> {
  const results: DiscoveredContent[] = [];
  
  try {
    // Search Wikimedia Commons for images
    const searchQuery = `${celebrityName} actress`;
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*`;
    
    const response = await fetch(commonsUrl);
    if (!response.ok) return results;
    
    const data = await response.json();
    const pages = data.query?.pages || {};
    
    const categories = ['events', 'photoshoot', 'fashion', 'traditional', 'western'];
    let i = 0;
    
    for (const page of Object.values(pages) as any[]) {
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        
        // Only include actual images (not SVGs, icons, etc.)
        if (info.mime && info.mime.startsWith('image/') && 
            !info.mime.includes('svg') &&
            info.width > 400 && info.height > 400) {
          
          const category = categories[i % categories.length];
          
          results.push({
            entity_id: null,
            entity_name: celebrityName,
            entity_type: 'actress',
            platform: 'tmdb', // Using tmdb type for compatibility
            source_url: info.url,
            image_url: info.url,
            thumbnail_url: info.url.replace(/\/commons\//, '/commons/thumb/').replace(/(\.[^.]+)$/, '/500px$1'),
            content_type: 'image',
            suggested_category: category,
            suggested_tags: [celebrityName.split(' ')[0], 'wikimedia', 'event', category],
            confidence_score: 75,
            discovery_source: 'wikimedia_commons',
            raw_data: page,
          });
          
          i++;
        }
      }
    }
  } catch (error) {
    console.error(`Wikimedia Commons fetch error for ${celebrityName}:`, error);
  }
  
  return results;
}

/**
 * Search for trending content related to a celebrity
 */
async function searchTrendingContent(celebrityName: string): Promise<DiscoveredContent[]> {
  const results: DiscoveredContent[] = [];
  
  // Search Wikipedia for recent photos
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebrityName.replace(/ /g, '_'))}`;
    const wikiRes = await fetch(wikiUrl);
    
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      
      if (wikiData.originalimage?.source) {
        // Get full resolution image
        const fullImageUrl = wikiData.originalimage.source;
        
        results.push({
          entity_id: null,
          entity_name: celebrityName,
          entity_type: 'actress',
          platform: 'tmdb',
          source_url: fullImageUrl,
          image_url: fullImageUrl,
          thumbnail_url: wikiData.thumbnail?.source || fullImageUrl,
          content_type: 'image',
          suggested_category: 'events',
          suggested_tags: [celebrityName.split(' ')[0], 'wikipedia', 'celebrity'],
          confidence_score: 70,
          discovery_source: 'wikipedia',
          raw_data: wikiData,
        });
      }
    }
  } catch (error) {
    console.error(`Wikipedia fetch error for ${celebrityName}:`, error);
  }
  
  // Also search Wikimedia Commons for more event/red carpet photos
  const commonsResults = await searchWikimediaCommons(celebrityName, 3);
  results.push(...commonsResults);
  
  return results;
}

/**
 * Detect category from content metadata
 */
export function detectCategory(
  content: Partial<DiscoveredContent>,
  caption?: string
): string {
  const text = (caption || '').toLowerCase();
  const tags = (content.suggested_tags || []).map(t => t.toLowerCase());
  const allText = [text, ...tags].join(' ');
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        return category;
      }
    }
  }
  
  // Default based on content type
  if (content.content_type === 'reel' || content.content_type === 'video') {
    return 'reels';
  }
  
  return 'photoshoot';
}

/**
 * Main discovery function - discovers content for a celebrity
 */
export async function discoverContentForCelebrity(
  celebrityName: string,
  entityId: string | null,
  entityType: 'actress' | 'anchor' | 'model' | 'influencer' = 'actress',
  options: DiscoveryOptions = {}
): Promise<DiscoveredContent[]> {
  const {
    maxPerCelebrity = 8,
    includeReels = true,
    includePhotoshoots = true,
    includeTrending = true,
  } = options;
  
  const allContent: DiscoveredContent[] = [];
  
  console.log(`  🔍 Discovering content for: ${celebrityName}`);
  
  // 1. Fetch TMDB images (multiple per celebrity)
  if (includePhotoshoots) {
    const tmdbContent = await fetchTMDBImages(celebrityName, 5);
    for (const content of tmdbContent) {
      content.entity_id = entityId;
      content.entity_type = entityType;
    }
    allContent.push(...tmdbContent);
    console.log(`    📸 TMDB: ${tmdbContent.length} images`);
  }
  
  // 2. Search for trending/Wikipedia content
  if (includeTrending) {
    const trendingContent = await searchTrendingContent(celebrityName);
    for (const content of trendingContent) {
      content.entity_id = entityId;
      content.entity_type = entityType;
    }
    allContent.push(...trendingContent);
    console.log(`    🔥 Trending: ${trendingContent.length} items`);
  }
  
  // 3. Get social handles for this celebrity
  const socialInfo = CELEBRITY_SOCIAL[celebrityName];
  
  // Note: Instagram and YouTube require actual post URLs
  // In production, you would:
  // a) Store known post URLs in the database
  // b) Use official APIs with proper authentication
  // c) Or have admins manually add URLs
  
  // Limit to max per celebrity
  const limitedContent = allContent.slice(0, maxPerCelebrity);
  
  // Assign entity info to all
  for (const content of limitedContent) {
    content.entity_id = entityId;
    content.entity_name = celebrityName;
    content.entity_type = entityType;
  }
  
  return limitedContent;
}

/**
 * Discover content for all celebrities in the database
 */
export async function discoverAllContent(
  supabaseUrl: string,
  supabaseKey: string,
  options: DiscoveryOptions = {}
): Promise<DiscoveredContent[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch all entities
  const { data: entities, error } = await supabase
    .from('media_entities')
    .select('id, name_en, entity_type, popularity_score')
    .in('entity_type', ['actress', 'anchor', 'model', 'influencer'])
    .order('popularity_score', { ascending: false })
    .limit(20); // Top 20 celebrities
  
  if (error) {
    console.error('Error fetching entities:', error);
    return [];
  }
  
  const allContent: DiscoveredContent[] = [];
  
  for (const entity of entities || []) {
    const content = await discoverContentForCelebrity(
      entity.name_en,
      entity.id,
      entity.entity_type,
      options
    );
    allContent.push(...content);
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return allContent;
}

/**
 * Validate and filter discovered content
 */
export function validateContent(content: DiscoveredContent[]): DiscoveredContent[] {
  return content.filter(item => {
    // Must have image or embed
    if (!item.image_url && !item.embed_html) return false;
    
    // Must have entity name
    if (!item.entity_name) return false;
    
    // Minimum confidence
    if (item.confidence_score < 50) return false;
    
    return true;
  });
}

export { CELEBRITY_SOCIAL, CATEGORY_KEYWORDS };

