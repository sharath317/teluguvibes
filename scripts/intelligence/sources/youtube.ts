/**
 * YOUTUBE SOURCE FETCHER
 *
 * Fetches Telugu interview metadata and captions.
 * NO video processing - text only.
 *
 * Data extracted:
 * - Interview title
 * - Interviewee name (from title parsing)
 * - Auto-generated captions (if available)
 * - View count, publish date
 */

import type { RawEntity, RawInterviewData } from '../types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Search queries for Telugu interviews
const SEARCH_QUERIES = [
  'Telugu actor interview',
  'Tollywood interview',
  'Telugu movie interview',
  'Telugu celebrity interview',
];

interface VideoResult {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

/**
 * Main entry point
 */
export async function fetchFromYouTube(limit: number): Promise<RawEntity[]> {
  // Read API key at runtime
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠ YOUTUBE_API_KEY not set, skipping YouTube source');
    return [];
  }

  const entities: RawEntity[] = [];

  try {
    // Search for Telugu interviews
    for (const query of SEARCH_QUERIES) {
      if (entities.length >= limit) break;

      const videos = await searchVideos(apiKey, query, Math.min(10, limit - entities.length));

      for (const video of videos) {
        if (entities.length >= limit) break;

        // Parse celebrity name from title
        const celebrityName = extractCelebrityName(video.title);
        if (!celebrityName) continue;

        // Fetch captions if available
        const captions = await fetchCaptions(apiKey, video.id);

        const rawData: RawInterviewData = {
          type: 'interview',
          celebrity_name: celebrityName,
          source_url: `https://www.youtube.com/watch?v=${video.id}`,
          source_type: 'youtube',
          title: video.title,
          transcript: captions || undefined,
          published_at: video.publishedAt,
        };

        entities.push({
          entity_type: 'interview',
          source: 'youtube',
          source_id: `youtube_${video.id}`,
          name_en: celebrityName,
          data: rawData,
          fetched_at: new Date().toISOString(),
        });
      }

      // Rate limit
      await delay(500);
    }
  } catch (error) {
    console.warn('  ⚠ YouTube fetch failed:', error);
  }

  return entities;
}

/**
 * Search for videos matching query
 */
async function searchVideos(apiKey: string, query: string, maxResults: number): Promise<VideoResult[]> {
  const url = `${YOUTUBE_API_BASE}/search?` +
    `part=snippet` +
    `&q=${encodeURIComponent(query)}` +
    `&type=video` +
    `&relevanceLanguage=te` +
    `&maxResults=${maxResults}` +
    `&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();

  return (data.items || []).map((item: { id: { videoId: string }; snippet: { title: string; description: string; channelTitle: string; publishedAt: string } }) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  }));
}

/**
 * Fetch auto-generated captions for a video
 * Uses YouTube's caption track API
 */
async function fetchCaptions(apiKey: string, videoId: string): Promise<string | null> {
  try {
    // First, list available caption tracks
    const tracksUrl = `${YOUTUBE_API_BASE}/captions?` +
      `part=snippet` +
      `&videoId=${videoId}` +
      `&key=${apiKey}`;

    const tracksResponse = await fetch(tracksUrl);
    if (!tracksResponse.ok) return null;

    const tracksData = await tracksResponse.json();
    const tracks = tracksData.items || [];

    // Look for Telugu or English captions
    const teluguTrack = tracks.find((t: { snippet: { language: string } }) =>
      t.snippet.language === 'te' || t.snippet.language === 'en'
    );

    if (!teluguTrack) return null;

    // Note: Actually downloading captions requires OAuth
    // For now, return null and rely on AI to process available metadata
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract celebrity name from interview title
 * Uses common Telugu interview title patterns
 */
function extractCelebrityName(title: string): string | null {
  // Common patterns:
  // "Actor Name Interview"
  // "Name Exclusive Interview"
  // "Name గారితో ప్రత్యేక ఇంటర్వ్యూ"

  const patterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+(?:Interview|Exclusive|Special))/i,
    /([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+(?:Interview|గారితో|తో))/i,
    /(?:Interview|ఇంటర్వ్యూ)(?:\s+with\s+|\s+)([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      // Validate it looks like a name (not a movie title)
      const name = match[1].trim();
      if (name.split(' ').length >= 2 && !name.includes('Movie')) {
        return name;
      }
    }
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
