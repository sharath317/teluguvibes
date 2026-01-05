/**
 * Instagram Authentication & oEmbed with Access Token
 * 
 * Setup Required:
 * 1. Create Meta Developer App at https://developers.facebook.com/
 * 2. Add Instagram Basic Display product
 * 3. Add environment variables:
 *    - INSTAGRAM_APP_ID
 *    - INSTAGRAM_APP_SECRET  
 *    - INSTAGRAM_ACCESS_TOKEN (long-lived token)
 */

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

interface InstagramOEmbedResponse {
  version: string;
  author_name: string;
  provider_name: string;
  provider_url: string;
  type: string;
  width: number;
  html: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  username: string;
}

/**
 * Check if Instagram is properly configured
 */
export function isInstagramConfigured(): boolean {
  return !!(INSTAGRAM_APP_ID && INSTAGRAM_APP_SECRET && INSTAGRAM_ACCESS_TOKEN);
}

/**
 * Get OAuth URL for user authorization
 */
export function getInstagramAuthUrl(redirectUri: string): string {
  if (!INSTAGRAM_APP_ID) {
    throw new Error('INSTAGRAM_APP_ID not configured');
  }
  
  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    redirect_uri: redirectUri,
    scope: 'user_profile,user_media',
    response_type: 'code',
  });
  
  return `https://api.instagram.com/oauth/authorize?${params}`;
}

/**
 * Exchange auth code for short-lived access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; user_id: string }> {
  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
    throw new Error('Instagram app credentials not configured');
  }

  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  if (!INSTAGRAM_APP_SECRET) {
    throw new Error('INSTAGRAM_APP_SECRET not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: INSTAGRAM_APP_SECRET,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params}`
  );

  if (!response.ok) {
    throw new Error(`Long-lived token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh long-lived token (before it expires)
 */
export async function refreshLongLivedToken(
  token: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: token,
  });

  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params}`
  );

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch oEmbed data with authentication (includes thumbnail!)
 */
export async function fetchAuthenticatedOEmbed(
  postUrl: string
): Promise<InstagramOEmbedResponse | null> {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    console.warn('INSTAGRAM_ACCESS_TOKEN not configured, oEmbed will be limited');
    return null;
  }

  try {
    const params = new URLSearchParams({
      url: postUrl,
      access_token: INSTAGRAM_ACCESS_TOKEN,
      maxwidth: '540',
    });

    const response = await fetch(
      `https://graph.facebook.com/v18.0/instagram_oembed?${params}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram oEmbed error:', error);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Instagram oEmbed fetch failed:', error);
    return null;
  }
}

/**
 * Fetch user's own media (requires user token)
 */
export async function fetchUserMedia(
  userId: string,
  accessToken: string,
  limit = 10
): Promise<InstagramMedia[]> {
  try {
    const params = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username',
      access_token: accessToken,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://graph.instagram.com/${userId}/media?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch user media:', error);
    return [];
  }
}

/**
 * Search for public posts by hashtag (Business/Creator accounts only)
 * Note: This requires Instagram Graph API with business verification
 */
export async function searchHashtag(
  hashtag: string,
  accessToken: string,
  igUserId: string
): Promise<{ id: string; permalink: string }[]> {
  try {
    // First, get hashtag ID
    const hashtagResponse = await fetch(
      `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${igUserId}&q=${hashtag}&access_token=${accessToken}`
    );
    
    if (!hashtagResponse.ok) {
      throw new Error('Hashtag search failed');
    }
    
    const hashtagData = await hashtagResponse.json();
    const hashtagId = hashtagData.data?.[0]?.id;
    
    if (!hashtagId) {
      return [];
    }
    
    // Then, get recent media for hashtag
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?user_id=${igUserId}&fields=id,permalink&access_token=${accessToken}`
    );
    
    if (!mediaResponse.ok) {
      throw new Error('Hashtag media fetch failed');
    }
    
    const mediaData = await mediaResponse.json();
    return mediaData.data || [];
  } catch (error) {
    console.error('Hashtag search failed:', error);
    return [];
  }
}






