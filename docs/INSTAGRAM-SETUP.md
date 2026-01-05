# Instagram API Setup Guide

## Why You Need This

Since October 2020, Instagram requires authentication for oEmbed API. Without it:
- ❌ No thumbnails in embeds
- ❌ Embeds may not load
- ❌ Rate limiting issues

With authentication:
- ✅ Full embed with thumbnail
- ✅ Author name and profile
- ✅ Reliable loading
- ✅ Higher rate limits

---

## Step-by-Step Setup

### Step 1: Create Meta Developer Account

1. Go to **https://developers.facebook.com/**
2. Log in with your Facebook account
3. Accept Developer Terms if prompted

### Step 2: Create a New App

1. Click **"My Apps"** → **"Create App"**
2. Select **"Consumer"** as app type
3. Enter app name: `TeluguVibes Instagram`
4. Click **Create App**

### Step 3: Add Instagram Basic Display

1. In your app dashboard, click **"Add Product"** (left sidebar)
2. Find **"Instagram Basic Display"**
3. Click **"Set Up"**
4. Click **"Create New App"** if prompted

### Step 4: Configure OAuth Settings

Go to **Instagram Basic Display** → **Basic Display** in sidebar:

1. **Valid OAuth Redirect URIs** - Add:
   ```
   http://localhost:3000/api/auth/instagram
   https://your-production-domain.com/api/auth/instagram
   ```

2. **Deauthorize Callback URL**:
   ```
   http://localhost:3000/api/auth/instagram/deauthorize
   ```

3. **Data Deletion Request URL**:
   ```
   http://localhost:3000/api/auth/instagram/delete
   ```

4. Click **Save Changes**

### Step 5: Get Your Credentials

Still in **Basic Display** settings, scroll down to see:

| Field | Description |
|-------|-------------|
| **Instagram App ID** | A numeric ID |
| **Instagram App Secret** | Click "Show" to reveal |

Copy both values.

### Step 6: Add Instagram Tester

1. Go to **Roles** → **Roles** (left sidebar)
2. Scroll to **Instagram Testers**
3. Click **Add Instagram Testers**
4. Enter your Instagram username
5. Click **Submit**

**Accept the invitation:**
1. Log into Instagram (web or app)
2. Go to **Settings** → **Apps and Websites** → **Tester Invites**
3. Accept the invitation from your app

### Step 7: Add Environment Variables

Add to your `.env.local`:

```bash
# Instagram API
INSTAGRAM_APP_ID=123456789012345
INSTAGRAM_APP_SECRET=abcdef1234567890abcdef1234567890
```

### Step 8: Get Access Token

1. Start your dev server: `pnpm dev`
2. Visit: **http://localhost:3000/api/auth/instagram**
3. You'll be redirected to Instagram
4. Click **Authorize**
5. You'll see a JSON response with your token:

```json
{
  "success": true,
  "access_token": "IGQVJYeGJh...",
  "expires_at": "2024-03-15T10:30:00Z",
  "expires_in_days": 60
}
```

6. Copy the `access_token` and add to `.env.local`:

```bash
INSTAGRAM_ACCESS_TOKEN=IGQVJYeGJh...
```

### Step 9: Token Refresh (Important!)

The access token expires in **60 days**. Set up a reminder or cron job to refresh it:

```bash
# Run before token expires (every 50 days)
pnpm run instagram:refresh
```

Or manually visit `/api/auth/instagram/refresh` to get a new token.

---

## Environment Variables Summary

```bash
# Required for Instagram embeds
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token

# Optional
INSTAGRAM_USER_ID=your_instagram_user_id
```

---

## How It Works

With authentication, the Instagram oEmbed API returns:

```json
{
  "version": "1.0",
  "author_name": "rashmika_mandanna",
  "provider_name": "Instagram",
  "thumbnail_url": "https://scontent.cdninstagram.com/...",
  "thumbnail_width": 640,
  "thumbnail_height": 640,
  "html": "<blockquote class=\"instagram-media\">...</blockquote>",
  "width": 540
}
```

The `thumbnail_url` is what displays in your gallery cards!

---

## Troubleshooting

### "Instagram not configured" error
- Ensure all three env vars are set
- Restart dev server after adding env vars

### "Invalid access token" error
- Token may have expired (60 days limit)
- Re-authenticate by visiting `/api/auth/instagram`

### "User not authorized" error  
- Make sure you accepted the tester invitation
- Check that your Instagram account is public

### Embeds show "View on Instagram" only
- This happens for private accounts
- Only public posts can be embedded

---

## Security Notes

1. **Never commit tokens to git** - Use `.env.local` only
2. **Refresh tokens regularly** - Before 60-day expiry
3. **Use HTTPS in production** - Required by Instagram
4. **Don't share App Secret** - Keep it private

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/auth/instagram` | Start OAuth flow |
| `GET /api/auth/instagram?code=xxx` | OAuth callback |
| `GET /api/auth/instagram/refresh` | Refresh token |
| `POST /api/hot-media/instagram` | Add Instagram post |

---

## Cost

**Free!** Instagram Basic Display API is free for:
- Personal projects
- Up to 200 API calls per user per hour
- Unlimited embeds once you have the token






