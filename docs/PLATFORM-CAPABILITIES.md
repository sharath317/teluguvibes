# Social Platform Capabilities

This document outlines the embedding support, legal constraints, and glamour suitability for each social media platform supported by TeluguVibes.

## Platform Support Matrix

| Platform | Embed Support | Embed Level | Glam Score | Priority | Wikidata Prop |
|----------|---------------|-------------|------------|----------|---------------|
| Instagram | ✅ Yes | Full | 1.0 | 1.0 | P2003 |
| YouTube | ✅ Yes | Full | 0.8 | 0.95 | P2397 |
| TikTok | ⚠️ Partial | Partial | 0.9 | 0.9 | P7085 |
| Twitter/X | ✅ Yes | Full | 0.6 | 0.85 | P2002 |
| Facebook | ⚠️ Partial | Partial | 0.5 | 0.7 | P2013 |
| Snapchat | ❌ No | None | 0.7 | 0.5 | P11012 |
| IMDB | ❌ No | None | 0.2 | 0.3 | P345 |

## Platform Details

### Instagram 📸
- **Embed Support**: Full
- **oEmbed Endpoint**: `https://graph.facebook.com/v18.0/instagram_oembed`
- **Best For**: Glamour photos, photoshoots, fashion content
- **Legal Notes**: 
  - oEmbed requires Facebook Graph API token for some features
  - Profile embedding requires app review
  - Post embeds work without authentication for public accounts
- **Priority for Hot Content**: #1 (Highest)

### YouTube ▶️
- **Embed Support**: Full
- **oEmbed Endpoint**: `https://www.youtube.com/oembed`
- **Best For**: Video content, interviews, behind-the-scenes
- **Legal Notes**: 
  - Full oEmbed support
  - Respect YouTube Terms of Service
  - Embeds may show ads
- **Priority for Hot Content**: #3

### TikTok 🎵
- **Embed Support**: Partial
- **oEmbed Endpoint**: `https://www.tiktok.com/oembed`
- **Best For**: Viral clips, trending dances, short glamour videos
- **Legal Notes**: 
  - oEmbed for videos only (individual posts)
  - Profile pages CANNOT be embedded
  - Embeds require JavaScript to render
  - May not work consistently on all browsers
  - Web-only rendering
- **Why Partial**: 
  - No profile embeds
  - JavaScript dependency
  - Mobile compatibility issues
- **Priority for Hot Content**: #2

### Twitter/X 🐦
- **Embed Support**: Full
- **oEmbed Endpoint**: `https://publish.twitter.com/oembed`
- **Best For**: News, announcements, fan interactions
- **Legal Notes**: 
  - Full oEmbed support via publish.twitter.com
  - Profile embeds NOT supported (tweet embeds only)
  - Rate limits apply
- **Priority for Hot Content**: #4

### Facebook 📘
- **Embed Support**: Partial
- **oEmbed Endpoint**: `https://graph.facebook.com/v18.0/oembed_page`
- **Best For**: Official pages, event announcements
- **Legal Notes**: 
  - Limited oEmbed support
  - Page embeds require app review
  - Post embeds work with public posts only
  - Video embeds have restrictions
- **Why Partial**: 
  - App review required for page embeds
  - Public posts only
- **Priority for Hot Content**: #5

### Snapchat 👻
- **Embed Support**: ❌ NONE
- **oEmbed Endpoint**: N/A
- **Best For**: Metadata storage only, reference links
- **Legal Notes**: 
  - **NO PUBLIC EMBEDDING API**
  - Stories are ephemeral and cannot be embedded
  - We store the handle for reference only
  - Cannot display any Snapchat content
- **Why No Embed**: 
  - Snapchat does not provide any public API for embedding
  - Content is designed to be temporary
  - Platform architecture doesn't support external embedding
- **Usage**: 
  - Store as metadata only
  - Link to profile for users to visit
  - Do NOT attempt to embed or display content
- **Priority for Hot Content**: Excluded (metadata only)

### IMDB 🎬
- **Embed Support**: ❌ None
- **Best For**: Filmography reference, career information
- **Legal Notes**: 
  - Reference link only
  - No embedding support
  - High reliability for actor verification
- **Priority for Hot Content**: Excluded (reference only)

## Hot Content Integration

When generating Hot & Glamour content, the system uses this priority order:

1. **Instagram** - Best for glamour content, highest engagement
2. **TikTok** - Great for viral/trending content (video embeds only)
3. **YouTube** - Good for longer form content
4. **Twitter/X** - Good for news and buzz
5. **Facebook** - Lower priority, limited embedding

**Never embed from:**
- Snapchat (no API)
- IMDB (reference only)
- Wikipedia (reference only)

## Confidence Scoring by Platform

When validating social handles:

| Source + Platform | Base Score | Adjustments |
|-------------------|------------|-------------|
| Wikidata + Instagram | 0.8 | +0.1 (reliable source) |
| Wikidata + TikTok | 0.8 | +0.05 (glam bonus) |
| Wikidata + Snapchat | 0.8 | -0.1 (no embed penalty) |
| Wikipedia + Snapchat | 0.6 | -0.3 (REJECTED without Wikidata) |
| TMDB + any | 0.7 | +0.2 if cross-verified |

**Important**: Snapchat handles without Wikidata verification are automatically REJECTED due to high false positive risk.

## CLI Usage

```bash
# Ingest all platforms
pnpm ingest:social

# Instagram and TikTok only
pnpm ingest:social --platform=instagram,tiktok

# Exclude Snapchat (already low priority)
pnpm ingest:social --platform=instagram,youtube,twitter,tiktok,facebook

# High confidence, embeddable platforms only
pnpm ingest:social --platform=instagram,youtube,twitter --confidence=0.8
```

## Admin UI

The Admin UI shows:
- **Green badge**: Full Embed - Platform fully supports embedding
- **Yellow badge**: Partial Embed - Some content can be embedded
- **Red badge**: No Embed - Metadata only, cannot display content

For Snapchat profiles, the embed preview button is disabled.

## Database Schema

The `celebrity_social_profiles` table includes:
- `embed_supported` (boolean) - Auto-set based on platform
- `platform_priority` (decimal) - For sorting in Hot content
- `glam_suitability` (decimal) - For glamour content scoring

## Future Considerations

1. **Threads** (Meta) - May add once API stabilizes
2. **Pinterest** - Potential for fashion/glamour content
3. **LinkedIn** - Professional context only

## Legal Compliance

All platform integrations:
- ✅ Use official oEmbed APIs only
- ✅ NO scraping of any platform
- ✅ NO downloading of media content
- ✅ Store metadata (handles, URLs) only
- ✅ Respect platform Terms of Service
- ✅ AdSense-safe content only






