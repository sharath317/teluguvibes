/**
 * IMAGE INTELLIGENCE SYSTEM
 *
 * Fetches, scores, and selects the best image for content.
 * Priority: TMDB → Wikimedia → Wikipedia → Unsplash → AI
 */

import type { ImageCandidate, ImageSource, ImageSelectionResult } from './types';

// ============================================================
// IMAGE FETCHERS
// ============================================================

interface ImageFetchContext {
  topic: string;
  entityType: 'post' | 'celebrity' | 'movie' | 'review';
  category?: string;
  emotion?: string;
  tmdbId?: number;
  wikidataId?: string;
  celebrityName?: string;
  movieTitle?: string;
}

/**
 * Fetch images from TMDB (movies & celebrities)
 */
async function fetchFromTMDB(context: ImageFetchContext): Promise<ImageCandidate[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const candidates: ImageCandidate[] = [];

  try {
    if (context.tmdbId && context.entityType === 'movie') {
      // Fetch movie images
      const url = `https://api.themoviedb.org/3/movie/${context.tmdbId}/images?api_key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        // Add posters
        for (const poster of (data.posters || []).slice(0, 3)) {
          candidates.push({
            url: `https://image.tmdb.org/t/p/w500${poster.file_path}`,
            source: 'tmdb',
            score: 85 + (poster.vote_average || 0) * 1.5,
            metadata: {
              width: poster.width,
              height: poster.height,
              aspectRatio: poster.aspect_ratio,
              license: 'TMDB Terms of Use',
              sourceUrl: `https://www.themoviedb.org/movie/${context.tmdbId}`,
            },
            validationStatus: 'valid',
          });
        }

        // Add backdrops
        for (const backdrop of (data.backdrops || []).slice(0, 2)) {
          candidates.push({
            url: `https://image.tmdb.org/t/p/w1280${backdrop.file_path}`,
            source: 'tmdb',
            score: 80 + (backdrop.vote_average || 0) * 1.5,
            metadata: {
              width: backdrop.width,
              height: backdrop.height,
              aspectRatio: backdrop.aspect_ratio,
              license: 'TMDB Terms of Use',
              sourceUrl: `https://www.themoviedb.org/movie/${context.tmdbId}`,
            },
            validationStatus: 'valid',
          });
        }
      }
    }

    if (context.tmdbId && context.entityType === 'celebrity') {
      // Fetch person images
      const url = `https://api.themoviedb.org/3/person/${context.tmdbId}/images?api_key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        for (const profile of (data.profiles || []).slice(0, 3)) {
          candidates.push({
            url: `https://image.tmdb.org/t/p/w500${profile.file_path}`,
            source: 'tmdb',
            score: 90 + (profile.vote_average || 0),
            metadata: {
              width: profile.width,
              height: profile.height,
              aspectRatio: profile.aspect_ratio,
              hasFace: true,
              license: 'TMDB Terms of Use',
              sourceUrl: `https://www.themoviedb.org/person/${context.tmdbId}`,
            },
            validationStatus: 'valid',
          });
        }
      }
    }

    // Search by name if no ID
    if (!context.tmdbId && (context.celebrityName || context.movieTitle)) {
      const query = context.celebrityName || context.movieTitle;
      const type = context.celebrityName ? 'person' : 'movie';
      const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query!)}`;

      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();
        const result = data.results?.[0];

        if (result) {
          const imagePath = result.profile_path || result.poster_path;
          if (imagePath) {
            candidates.push({
              url: `https://image.tmdb.org/t/p/w500${imagePath}`,
              source: 'tmdb',
              score: 85,
              metadata: {
                hasFace: !!result.profile_path,
                license: 'TMDB Terms of Use',
              },
              validationStatus: 'valid',
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('TMDB image fetch failed:', error);
  }

  return candidates;
}

/**
 * Fetch images from Wikimedia Commons
 */
async function fetchFromWikimedia(context: ImageFetchContext): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = [];

  try {
    const searchTerm = context.celebrityName || context.movieTitle || context.topic;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&format=json&origin=*`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();

      for (const result of (data.query?.search || []).slice(0, 3)) {
        // Get image info
        const title = result.title;
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

        const infoResponse = await fetch(infoUrl);
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          const pages = infoData.query?.pages || {};
          const page = Object.values(pages)[0] as Record<string, unknown>;
          const imageInfo = (page?.imageinfo as Record<string, unknown>[])?.[0];

          if (imageInfo?.url) {
            const extMeta = imageInfo.extmetadata as Record<string, { value?: string }> | undefined;
            candidates.push({
              url: imageInfo.url as string,
              source: 'wikimedia',
              score: 75,
              metadata: {
                width: imageInfo.width as number,
                height: imageInfo.height as number,
                license: extMeta?.LicenseShortName?.value || 'Wikimedia Commons',
                author: extMeta?.Artist?.value?.replace(/<[^>]*>/g, '') || 'Unknown',
                sourceUrl: `https://commons.wikimedia.org/wiki/${title}`,
              },
              validationStatus: 'valid',
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('Wikimedia image fetch failed:', error);
  }

  return candidates;
}

/**
 * Fetch images from Wikipedia
 */
async function fetchFromWikipedia(context: ImageFetchContext): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = [];

  try {
    const searchTerm = context.celebrityName || context.movieTitle || context.topic;
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm.replace(/ /g, '_'))}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();

      if (data.originalimage?.source) {
        candidates.push({
          url: data.originalimage.source,
          source: 'wikipedia',
          score: 70,
          metadata: {
            width: data.originalimage.width,
            height: data.originalimage.height,
            license: 'Wikipedia (check individual license)',
            sourceUrl: data.content_urls?.desktop?.page,
          },
          validationStatus: 'needs_review', // Wikipedia images need license check
        });
      }

      if (data.thumbnail?.source) {
        candidates.push({
          url: data.thumbnail.source,
          source: 'wikipedia',
          score: 65,
          metadata: {
            width: data.thumbnail.width,
            height: data.thumbnail.height,
            license: 'Wikipedia (check individual license)',
            sourceUrl: data.content_urls?.desktop?.page,
          },
          validationStatus: 'needs_review',
        });
      }
    }
  } catch (error) {
    console.warn('Wikipedia image fetch failed:', error);
  }

  return candidates;
}

/**
 * Fetch images from Unsplash
 */
async function fetchFromUnsplash(context: ImageFetchContext): Promise<ImageCandidate[]> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return [];

  const candidates: ImageCandidate[] = [];

  try {
    // Build search query based on context
    let query = context.topic;
    if (context.category === 'sports') query = 'cricket stadium india';
    if (context.category === 'politics') query = 'indian government parliament';
    if (context.entityType === 'movie') query = 'cinema movie theater';

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&client_id=${apiKey}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();

      for (const photo of data.results || []) {
        candidates.push({
          url: photo.urls.regular,
          source: 'unsplash',
          score: 60, // Lower priority for generic images
          metadata: {
            width: photo.width,
            height: photo.height,
            aspectRatio: photo.width / photo.height,
            license: 'Unsplash License',
            author: photo.user.name,
            sourceUrl: photo.links.html,
          },
          validationStatus: 'valid',
        });
      }
    }
  } catch (error) {
    console.warn('Unsplash image fetch failed:', error);
  }

  return candidates;
}

// ============================================================
// IMAGE SCORING
// ============================================================

interface ScoringContext {
  emotion?: string;
  entityType: string;
  category?: string;
  preferFaces?: boolean;
}

function scoreImage(candidate: ImageCandidate, context: ScoringContext): number {
  let score = candidate.score;

  // Bonus for face presence (especially for celebrities)
  if (context.preferFaces && candidate.metadata.hasFace) {
    score += 10;
  }

  // Bonus for good aspect ratio (16:9 or 4:3 preferred for posts)
  if (candidate.metadata.aspectRatio) {
    if (candidate.metadata.aspectRatio >= 1.3 && candidate.metadata.aspectRatio <= 1.8) {
      score += 5;
    }
  }

  // Bonus for high resolution
  if (candidate.metadata.width && candidate.metadata.width >= 1200) {
    score += 5;
  }

  // Penalty for very small images
  if (candidate.metadata.width && candidate.metadata.width < 500) {
    score -= 20;
  }

  // Source priority bonus
  const sourcePriority: Record<ImageSource, number> = {
    tmdb: 15,
    wikimedia: 10,
    wikipedia: 5,
    unsplash: 0,
    pexels: 0,
    ai_generated: -5,
  };
  score += sourcePriority[candidate.source] || 0;

  // Emotion match bonus
  if (candidate.metadata.emotionMatch) {
    score += candidate.metadata.emotionMatch * 0.1;
  }

  return Math.min(100, Math.max(0, score));
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function selectBestImage(context: ImageFetchContext): Promise<ImageSelectionResult> {
  const allCandidates: ImageCandidate[] = [];

  // Fetch from all sources in priority order
  const [tmdbImages, wikimediaImages, wikipediaImages, unsplashImages] = await Promise.all([
    fetchFromTMDB(context),
    fetchFromWikimedia(context),
    fetchFromWikipedia(context),
    fetchFromUnsplash(context),
  ]);

  allCandidates.push(...tmdbImages, ...wikimediaImages, ...wikipediaImages, ...unsplashImages);

  // Score all candidates
  const scoringContext: ScoringContext = {
    emotion: context.emotion,
    entityType: context.entityType,
    category: context.category,
    preferFaces: context.entityType === 'celebrity' || context.entityType === 'post',
  };

  for (const candidate of allCandidates) {
    candidate.score = scoreImage(candidate, scoringContext);
  }

  // Sort by score
  allCandidates.sort((a, b) => b.score - a.score);

  // Select best valid image
  const validCandidates = allCandidates.filter(c => c.validationStatus !== 'rejected');
  const selectedImage = validCandidates[0] || null;

  return {
    selectedImage,
    candidates: allCandidates,
    selectionReason: selectedImage
      ? `Selected ${selectedImage.source} image with score ${selectedImage.score.toFixed(1)}`
      : 'No suitable image found',
  };
}

/**
 * Validate image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get image candidates for variant selection
 */
export async function getImageOptions(context: ImageFetchContext, count: number = 3): Promise<ImageCandidate[]> {
  const result = await selectBestImage(context);
  return result.candidates.slice(0, count);
}
