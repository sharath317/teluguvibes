/**
 * Instagram OAuth Callback Handler
 * 
 * Flow:
 * 1. User visits /api/auth/instagram (GET without code) → Redirects to Instagram
 * 2. Instagram redirects back with code → Exchange for token
 * 3. Token is returned/stored
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInstagramAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  isInstagramConfigured,
} from '@/lib/social/instagram-auth';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram`
  : 'http://localhost:3000/api/auth/instagram';

export async function GET(request: NextRequest) {
  // Check if Instagram is configured
  if (!isInstagramConfigured()) {
    return NextResponse.json(
      { 
        error: 'Instagram not configured',
        setup: {
          step1: 'Go to https://developers.facebook.com/',
          step2: 'Create a new app (Consumer type)',
          step3: 'Add Instagram Basic Display product',
          step4: 'Configure OAuth redirect URIs',
          step5: 'Add env vars: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET',
        }
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');

  // Handle OAuth errors
  if (error) {
    return NextResponse.json(
      { error, reason: errorReason },
      { status: 400 }
    );
  }

  // No code = initiate OAuth flow
  if (!code) {
    const authUrl = getInstagramAuthUrl(REDIRECT_URI);
    return NextResponse.redirect(authUrl);
  }

  // Exchange code for token
  try {
    console.log('Exchanging Instagram auth code for token...');
    
    // Step 1: Get short-lived token
    const { access_token: shortLivedToken, user_id } = await exchangeCodeForToken(
      code,
      REDIRECT_URI
    );
    
    console.log('Got short-lived token, exchanging for long-lived...');
    
    // Step 2: Exchange for long-lived token (60 days)
    const { access_token: longLivedToken, expires_in } = await getLongLivedToken(
      shortLivedToken
    );

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Return token info (in production, store this securely)
    return NextResponse.json({
      success: true,
      message: 'Instagram authenticated successfully!',
      user_id,
      access_token: longLivedToken,
      expires_at: expiresAt.toISOString(),
      expires_in_days: Math.round(expires_in / 86400),
      next_steps: [
        'Add INSTAGRAM_ACCESS_TOKEN to your .env.local file',
        'Set up a cron job to refresh token before expiry (every 50 days)',
        'Instagram embeds will now include thumbnails!',
      ],
    });
  } catch (err) {
    console.error('Instagram OAuth error:', err);
    return NextResponse.json(
      { error: 'Token exchange failed', details: String(err) },
      { status: 500 }
    );
  }
}






