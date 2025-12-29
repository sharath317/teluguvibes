# 🎬 TeluguVibes

> **Premium Telugu Entertainment & Culture Portal**

TeluguVibes is a premium Telugu entertainment and culture portal built with Next.js 15, designed to serve the 80+ million Telugu-speaking audience worldwide. It combines AI-assisted editorial workflows, licensed media, and historic cultural intelligence to deliver viral, evergreen, and community-driven content at scale—legally, efficiently, and sustainably.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-blue?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Private-red)

---

## ✨ Features

### 📰 Viral News Engine
- Auto-imports trending topics from NewsData.io & GNews
- AI rewrites content into original Telugu articles (300-500 words)
- Smart image pipeline (TMDB, Unsplash, Pexels, Wikimedia)
- One-click publish from admin drafts

### 🔥 Hot Media Section
- Trending actress/anchor photos & videos
- Legal social embeds (Instagram, YouTube, Twitter, Facebook)
- Masonry grid with lightbox viewer
- Celebrity tagging & categorization

### 🎂 Historic Celebrity Intelligence
- Auto-generates "On This Day" birthday/anniversary posts
- Wikidata + TMDB integration for Telugu celebrities
- AI-written tribute articles in Telugu
- Evergreen content recycling for SEO

### 💬 Community Features
- Real-time comments (Supabase Realtime)
- Profanity filtering & moderation
- Rate limiting & spam protection
- Positive comment highlighting

### 🛡️ Legal & AdSense Safe
- No illegal scraping - uses official APIs only
- Social embeds via oEmbed (platform-approved)
- Licensed images from Wikimedia/Unsplash/Pexels/TMDB
- Admin moderation required for all content

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- API keys (see Environment Variables)

### Installation

```bash
# Clone the repository
git clone https://github.com/sharath317/teluguvibes.git
cd teluguvibes

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations
# Copy SQL files to Supabase SQL Editor:
# - supabase-schema.sql (core tables)
# - supabase-celebrity-schema.sql (celebrity system)
# - supabase-media-schema.sql (hot media system)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication (Google OAuth)
AUTH_SECRET=your_nextauth_secret
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret

# AI Content Generation
GROQ_API_KEY=your_groq_api_key

# News APIs
NEWSDATA_API_KEY=your_newsdata_key
GNEWS_API_KEY=your_gnews_key

# Image APIs
UNSPLASH_ACCESS_KEY=your_unsplash_key
PEXELS_API_KEY=your_pexels_key
TMDB_API_KEY=your_tmdb_key

# Optional
GOLD_API_KEY=your_goldapi_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
```

---

## 📁 Project Structure

```
telugu-portal/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard
│   │   ├── celebrities/    # Celebrity management
│   │   ├── drafts/         # AI-generated drafts
│   │   ├── media/          # Hot media manager
│   │   └── posts/          # Content management
│   ├── category/[cat]/     # Category pages
│   ├── hot/                # Hot media section
│   ├── post/[slug]/        # Article pages
│   └── page.tsx            # Homepage
├── components/             # React components
│   ├── media/              # Embed renderers, cards
│   └── ...                 # UI components
├── lib/                    # Business logic
│   ├── celebrity/          # Celebrity data pipeline
│   ├── media/              # Embed & image fetchers
│   └── ...                 # AI, news, validation
├── types/                  # TypeScript definitions
└── public/                 # Static assets
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `posts` | News articles & content |
| `comments` | User comments |
| `categories` | Content categories |
| `celebrities` | Telugu celebrity profiles |
| `celebrity_events` | Birthdays, anniversaries |
| `celebrity_works` | Filmography |
| `historic_posts` | Auto-generated tribute posts |
| `media_entities` | Actresses, anchors, influencers |
| `media_posts` | Photos, videos, social embeds |
| `media_collections` | Curated galleries |

---

## 🌐 Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with trending feed |
| `/hot` | Hot photos & videos |
| `/category/[cat]` | Category filtered content |
| `/post/[slug]` | Article detail page |
| `/about` | About TeluguVibes |
| `/contact` | Contact form |
| `/privacy` | Privacy policy |
| `/admin` | Admin dashboard (protected) |
| `/admin/media` | Hot media manager |
| `/admin/celebrities` | Celebrity manager |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js v5 (Google OAuth)
- **AI**: Groq (Llama), Google Gemini
- **APIs**: NewsData.io, GNews, TMDB, Unsplash, Pexels
- **Deployment**: Vercel

---

## 📈 Monetization

- **AdSense slots**: Header, sidebar, mid-article, mobile sticky
- **Sponsored content**: Movie promotions
- **Affiliate marketing**: Movie tickets, merchandise
- **Future**: Premium membership

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Manual

```bash
npm run build
npm start
```

---

## 📄 License

Private repository. All rights reserved.

---

## 👨‍💻 Author

Built with ❤️ for the Telugu community.

---

## 🙏 Acknowledgments

- Telugu film industry for endless entertainment
- Open source community for amazing tools
- AI providers for content generation capabilities
