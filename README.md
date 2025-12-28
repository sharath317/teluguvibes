# తెలుగు వార్తలు - Telugu Entertainment Portal

A premium Telugu Entertainment Portal built with Next.js 15, Tailwind CSS, and Supabase.

## Features

- 🎬 **Cinematic Dark Theme** - #0a0a0a background with #eab308 gold accents
- 📰 **Viral News Layout** - Sticky trending ticker + card-based feed
- 💬 **Real-time Comments** - Supabase real-time with profanity filter
- 🥇 **Gold Prices Sidebar** - Live Hyderabad gold/silver prices
- 🔐 **Admin Dashboard** - Protected with NextAuth.js (Google/GitHub OAuth)
- 📈 **Google Trends Integration** - Import trending topics as drafts
- 🔍 **SEO Optimized** - Dynamic OpenGraph tags for every post
- 💰 **AdSense Ready** - Reserved ad slots (728x90, 300x600, 300x250)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth.js v5 (Google/GitHub OAuth)
- **Icons**: Lucide React
- **Profanity Filter**: bad-words
- **RSS Parsing**: rss-parser

## Getting Started

### 1. Clone and Install

```bash
cd ~/Projects/telugu-portal
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in the SQL Editor
3. Enable Realtime for the `comments` table

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Configure Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
AUTH_SECRET=same_as_nextauth_secret

# Google OAuth
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret

# Optional: GitHub OAuth
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Gold API (https://www.goldapi.io/)
GOLD_API_KEY=your_gold_api_key

# Admin Access (comma-separated emails)
ADMIN_EMAILS=admin@example.com
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
telugu-portal/
├── app/
│   ├── layout.tsx              # Root layout with header/footer
│   ├── page.tsx                # Home - viral news feed
│   ├── post/[slug]/page.tsx    # Post detail with SEO
│   ├── category/[cat]/page.tsx # Category pages
│   ├── admin/                  # Protected admin area
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard
│   │   ├── posts/              # Post management
│   │   └── drafts/             # Trend drafts
│   ├── auth/                   # Auth pages
│   └── api/                    # API routes
├── components/
│   ├── TrendingTicker.tsx      # Sticky news ticker
│   ├── NewsCard.tsx            # News card component
│   ├── CommentSection.tsx      # Real-time comments
│   ├── DailyInfoSidebar.tsx    # Gold/Weather widgets
│   └── AdSlot.tsx              # AdSense placeholders
├── lib/
│   ├── supabase.ts             # Supabase clients
│   ├── auth.ts                 # NextAuth config
│   ├── profanity-filter.ts     # Comment filter
│   └── trends.ts               # Google Trends parser
└── types/
    └── database.ts             # TypeScript types
```

## Categories

- **గాసిప్** (Gossip) - Celebrity news
- **స్పోర్ట్స్** (Sports) - Cricket, Football, Kabaddi
- **రాజకీయాలు** (Politics) - Telangana/AP politics
- **వినోదం** (Entertainment) - Movies, TV, Music
- **ట్రెండింగ్** (Trending) - Viral topics

## Admin Features

1. **Dashboard** - View stats (posts, views, comments)
2. **Posts** - Create, edit, delete posts
3. **Drafts** - Import Google Trends and approve with one click

## AdSense Integration

Replace the placeholder AdSlot components with actual AdSense code:

```tsx
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="XXXXXXXXXX"
     data-ad-format="auto"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

## License

MIT
