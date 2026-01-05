# Admin Panel Architecture Map

## Version: 1.0
## Last Updated: January 2026

---

## 1. Overview

The TeluguVibes Admin Panel provides management interfaces for:
- Content management (posts, reviews, movies)
- Data intelligence (trends, knowledge graph)
- System monitoring (coverage, health)
- Media management (images, videos)

---

## 2. Admin Routes Map

### 2.1 Primary Dashboard

| Route           | Panel Name     | Status  | Purpose                           |
|-----------------|----------------|---------|-----------------------------------|
| `/admin`        | Dashboard      | Active  | System health + quick actions     |

### 2.2 Content Management

| Route                    | Panel Name        | Status  | Purpose                           |
|--------------------------|-------------------|---------|-----------------------------------|
| `/admin/posts`           | Posts Manager     | Active  | Blog/article management           |
| `/admin/posts/new`       | New Post          | Active  | Create new post                   |
| `/admin/posts/[id]/edit` | Edit Post         | Active  | Edit existing post                |
| `/admin/drafts`          | Drafts            | Active  | Unpublished content               |
| `/admin/editorial`       | Editorial Queue   | Active  | Review editorial content          |
| `/admin/editorial/post/[id]` | Edit Editorial | Active | Edit editorial post               |

### 2.3 Movie Management

| Route                       | Panel Name           | Status  | Purpose                          |
|-----------------------------|----------------------|---------|----------------------------------|
| `/admin/movie-catalogue`    | Movie Catalogue      | Active  | Movie database management        |
| `/admin/reviews`            | Reviews Manager      | Active  | Movie review management          |
| `/admin/reviews-coverage`   | Reviews Coverage     | Active  | Review gap analysis              |

### 2.4 Celebrity Management

| Route                        | Panel Name           | Status  | Purpose                          |
|------------------------------|----------------------|---------|----------------------------------|
| `/admin/celebrities`         | Celebrities List     | Active  | Celebrity database               |
| `/admin/celebrities/new`     | Add Celebrity        | Active  | Create new celebrity             |
| `/admin/celebrities/[id]`    | Celebrity Detail     | Active  | View celebrity                   |
| `/admin/celebrities/[id]/edit` | Edit Celebrity     | Active | Edit celebrity                   |
| `/admin/celebrities/calendar` | Celebrity Calendar  | Active  | Birthdays & events               |
| `/admin/dedications`         | Dedications          | Active  | Tribute content                  |

### 2.5 Intelligence & Analytics

| Route                      | Panel Name           | Status  | Purpose                          |
|----------------------------|----------------------|---------|----------------------------------|
| `/admin/intelligence`      | Intelligence Hub     | Active  | AI insights dashboard            |
| `/admin/trend-fusion`      | Trend Fusion         | Active  | Trending content analysis        |
| `/admin/knowledge-graph`   | Knowledge Graph      | Active  | Entity relationships             |
| `/admin/historic-intelligence` | Historic Analysis | Active | Historical data insights         |
| `/admin/historic-drafts`   | Historic Drafts      | Active  | Archive content management       |

### 2.6 Media Management

| Route                   | Panel Name           | Status  | Purpose                          |
|-------------------------|----------------------|---------|----------------------------------|
| `/admin/media`          | Media Library        | Active  | Image/video management           |
| `/admin/media/[id]`     | Media Detail         | Active  | Single media item                |
| `/admin/media/entities` | Media Entities       | Active  | Entity-linked media              |
| `/admin/hot-media`      | Hot Media            | Active  | Trending media content           |
| `/admin/image-intelligence` | Image Intelligence | Active | AI image analysis               |

### 2.7 Content Tools

| Route                   | Panel Name           | Status  | Purpose                          |
|-------------------------|----------------------|---------|----------------------------------|
| `/admin/games`          | Games Manager        | Active  | Interactive content              |
| `/admin/content-manager` | Content Manager     | Active  | Bulk content operations          |
| `/admin/coverage`       | Coverage Dashboard   | Active  | Content coverage analysis        |
| `/admin/observatory`    | Observatory          | Active  | Content monitoring               |

---

## 3. Panel Responsibilities

### 3.1 Dashboard (`/admin`)

**Purpose**: Central command center for content operations

**Features**:
- System health metrics
- Content statistics
- Quick action links
- Recent activity feed

**Metrics Displayed**:
- Review Coverage %
- Orphan Entities count
- Duplicate Movies count
- Pending Validation count
- Total Posts, Views, Comments, Drafts

---

### 3.2 Movie Catalogue (`/admin/movie-catalogue`)

**Purpose**: Complete movie database management

**Features**:
- Movie statistics by decade/era
- Top movies by rating/gross/popularity
- Duplicate detection
- Data ingestion tools
- Merge duplicates

**Tabs**:
1. Overview - Stats and distribution
2. Top Movies - Ranked listings
3. Duplicates - Merge candidates
4. Ingest - Data import tools

**Actions**:
- Ingest from Wikipedia
- Ingest from TMDB
- Detect duplicates
- Merge movies

---

### 3.3 Reviews Coverage (`/admin/reviews-coverage`)

**Purpose**: Ensure review completeness across catalogue

**Features**:
- Coverage percentage by language
- Movies without reviews
- Review quality metrics
- Batch review generation

**Metrics**:
- Total movies vs reviewed
- Review confidence scores
- Missing review list
- Generation queue

---

### 3.4 Knowledge Graph (`/admin/knowledge-graph`)

**Purpose**: Entity relationship management

**Features**:
- Actor → Movie connections
- Director filmographies
- Production house networks
- Franchise relationships

**Operations**:
- Orphan detection
- Relationship validation
- Entity merging
- Graph visualization

---

### 3.5 Trend Fusion (`/admin/trend-fusion`)

**Purpose**: Aggregate and analyze trending content

**Features**:
- Real-time trend detection
- Source aggregation (Twitter, Google, YouTube)
- Trend scoring
- Auto-draft generation

**Sources**:
- Social media trends
- Search trends
- YouTube analytics
- News aggregation

---

### 3.6 Intelligence Hub (`/admin/intelligence`)

**Purpose**: AI-powered insights and recommendations

**Features**:
- Content performance analysis
- Audience insights
- Recommendation tuning
- A/B test results

---

## 4. Route → Feature Matrix

| Feature                | Primary Route           | Secondary Routes        |
|------------------------|------------------------|-------------------------|
| Movie CRUD             | movie-catalogue        | reviews                 |
| Review Management      | reviews, reviews-coverage | editorial             |
| Celebrity Management   | celebrities            | dedications             |
| Content Creation       | posts, editorial       | drafts                  |
| Trend Analysis         | trend-fusion           | intelligence            |
| Data Quality           | knowledge-graph        | movie-catalogue         |
| Media Assets           | media, hot-media       | image-intelligence      |
| System Monitoring      | dashboard              | coverage, observatory   |

---

## 5. API Endpoints

### 5.1 Movie Catalogue APIs

| Endpoint                              | Method | Purpose                  |
|---------------------------------------|--------|--------------------------|
| `/api/admin/movie-catalogue?action=stats` | GET | Catalogue statistics     |
| `/api/admin/movie-catalogue?action=top` | GET   | Top movies listing       |
| `/api/admin/movie-catalogue?action=ingest` | POST | Trigger ingestion      |
| `/api/admin/movie-catalogue?action=duplicates` | GET | Get duplicates      |
| `/api/admin/movie-catalogue?action=merge` | POST | Merge duplicates       |

### 5.2 Reviews APIs

| Endpoint                              | Method | Purpose                  |
|---------------------------------------|--------|--------------------------|
| `/api/admin/reviews/coverage`         | GET    | Coverage statistics      |
| `/api/admin/reviews/generate`         | POST   | Generate reviews         |
| `/api/admin/reviews/batch`            | POST   | Batch operations         |

### 5.3 Intelligence APIs

| Endpoint                              | Method | Purpose                  |
|---------------------------------------|--------|--------------------------|
| `/api/cron/intelligence`              | POST   | Cron-triggered AI tasks  |
| `/api/admin/trends`                   | GET    | Trend data               |
| `/api/admin/knowledge-graph`          | GET    | Entity graph data        |

---

## 6. Access Control

### 6.1 Current State

- All admin routes require authentication
- No granular permission system
- Admin access is binary (admin or not)

### 6.2 Recommended (Future)

| Role         | Access                                    |
|--------------|-------------------------------------------|
| Super Admin  | All panels                                |
| Editor       | Posts, Editorial, Reviews                 |
| Analyst      | Intelligence, Trends, Coverage            |
| Moderator    | Media, Content Manager                    |

---

## 7. Panel Naming Conventions

### 7.1 Current Names (Routes Unchanged)

| Route                | Display Name              |
|----------------------|---------------------------|
| movie-catalogue      | Movie Catalogue           |
| reviews-coverage     | Reviews Coverage          |
| knowledge-graph      | Knowledge Graph           |
| trend-fusion         | Trend Fusion              |
| historic-intelligence| Historic Intelligence     |
| image-intelligence   | Image Intelligence        |

### 7.2 Sidebar Navigation

```
Dashboard
├── Content
│   ├── Posts
│   ├── Drafts
│   └── Editorial
├── Movies
│   ├── Catalogue
│   ├── Reviews
│   └── Coverage
├── Celebrities
│   ├── Directory
│   ├── Calendar
│   └── Dedications
├── Intelligence
│   ├── Trends
│   ├── Knowledge Graph
│   └── Observatory
├── Media
│   ├── Library
│   ├── Hot Media
│   └── Image AI
└── Tools
    ├── Content Manager
    └── Games
```

---

## 8. Health Indicators

### 8.1 Dashboard Health Cards

| Metric              | Green           | Yellow          | Red             |
|---------------------|-----------------|-----------------|-----------------|
| Review Coverage     | > 90%           | 70-90%          | < 70%           |
| Orphan Entities     | 0               | 1-10            | > 10            |
| Duplicate Movies    | 0               | 1-5             | > 5             |
| Pending Validation  | 0               | 1-20            | > 20            |

---

## 9. Active vs Inactive Routes

### 9.1 Active Routes (In Use)
- All routes listed in Section 2

### 9.2 Dead Routes (None Detected)
- All admin routes are functional

### 9.3 Stub Routes (Minimal Implementation)
- `/admin/games` - Basic shell
- `/admin/observatory` - Limited features

---

## 10. Code Locations

| Component         | Path                                   |
|-------------------|----------------------------------------|
| Admin Layout      | `app/admin/layout.tsx`                 |
| Dashboard         | `app/admin/page.tsx`                   |
| Movie Catalogue   | `app/admin/movie-catalogue/page.tsx`   |
| Reviews Coverage  | `app/admin/reviews-coverage/page.tsx`  |
| Knowledge Graph   | `app/admin/knowledge-graph/page.tsx`   |
| Trend Fusion      | `app/admin/trend-fusion/page.tsx`      |

---

*This document maps the admin interface architecture. Routes are stable; only display names may be updated.*


