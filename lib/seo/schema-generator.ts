/**
 * Schema.org Generator for Zero-Click SEO
 *
 * Generates structured data for:
 * - Article (news, gossip)
 * - Movie
 * - Person (celebrity)
 * - Event (birthdays, anniversaries)
 * - Q&A blocks (answer-first summaries)
 */

// ============================================================
// TYPES
// ============================================================

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'NewsArticle' | 'Article';
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  author: PersonSchema | OrganizationSchema;
  publisher: OrganizationSchema;
  mainEntityOfPage: string;
  articleSection?: string;
  keywords?: string[];
  inLanguage: string;
}

export interface MovieSchema {
  '@context': 'https://schema.org';
  '@type': 'Movie';
  name: string;
  alternateName?: string;
  description: string;
  image: string;
  datePublished?: string;
  director?: PersonSchema[];
  actor?: PersonSchema[];
  genre?: string[];
  duration?: string;
  aggregateRating?: AggregateRatingSchema;
  review?: ReviewSchema;
}

export interface PersonSchema {
  '@context'?: 'https://schema.org';
  '@type': 'Person';
  name: string;
  alternateName?: string;
  image?: string;
  birthDate?: string;
  deathDate?: string;
  nationality?: string;
  jobTitle?: string;
  description?: string;
  sameAs?: string[];
  url?: string;
}

export interface OrganizationSchema {
  '@type': 'Organization';
  name: string;
  logo?: {
    '@type': 'ImageObject';
    url: string;
  };
  url?: string;
}

export interface EventSchema {
  '@context': 'https://schema.org';
  '@type': 'Event';
  name: string;
  description: string;
  startDate: string;
  eventAttendanceMode: string;
  eventStatus: string;
  image?: string;
  performer?: PersonSchema[];
  about?: PersonSchema | MovieSchema;
}

export interface QASchema {
  '@context': 'https://schema.org';
  '@type': 'QAPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  };
}

export interface AggregateRatingSchema {
  '@type': 'AggregateRating';
  ratingValue: number;
  bestRating: number;
  worstRating: number;
  ratingCount: number;
}

export interface ReviewSchema {
  '@type': 'Review';
  reviewRating: {
    '@type': 'Rating';
    ratingValue: number;
    bestRating: number;
    worstRating: number;
  };
  author: PersonSchema;
  reviewBody: string;
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }[];
}

// ============================================================
// PUBLISHER SCHEMA (Reusable)
// ============================================================

const PUBLISHER: OrganizationSchema = {
  '@type': 'Organization',
  name: 'TeluguVibes',
  logo: {
    '@type': 'ImageObject',
    url: 'https://teluguvibes.com/logo.png',
  },
  url: 'https://teluguvibes.com',
};

const AUTHOR: PersonSchema = {
  '@type': 'Person',
  name: 'TeluguVibes Editorial Team',
  url: 'https://teluguvibes.com/about',
};

// ============================================================
// GENERATORS
// ============================================================

/**
 * Generate Article Schema for news/gossip posts
 */
export function generateArticleSchema(params: {
  title: string;
  description: string;
  image: string | string[];
  url: string;
  publishedAt: string;
  updatedAt?: string;
  category?: string;
  keywords?: string[];
  authorName?: string;
}): ArticleSchema {
  const images = Array.isArray(params.image) ? params.image : [params.image];

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: params.title,
    description: params.description,
    image: images,
    datePublished: params.publishedAt,
    dateModified: params.updatedAt || params.publishedAt,
    author: params.authorName
      ? { '@type': 'Person', name: params.authorName }
      : AUTHOR,
    publisher: PUBLISHER,
    mainEntityOfPage: params.url,
    articleSection: params.category,
    keywords: params.keywords,
    inLanguage: 'te-IN',
  };
}

/**
 * Generate Movie Schema
 */
export function generateMovieSchema(params: {
  title: string;
  titleTelugu?: string;
  description: string;
  image: string;
  releaseDate?: string;
  directors?: { name: string; image?: string }[];
  actors?: { name: string; image?: string }[];
  genres?: string[];
  duration?: number; // in minutes
  rating?: number;
  ratingCount?: number;
  review?: {
    body: string;
    rating: number;
    authorName?: string;
  };
}): MovieSchema {
  const schema: MovieSchema = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: params.title,
    alternateName: params.titleTelugu,
    description: params.description,
    image: params.image,
    datePublished: params.releaseDate,
    genre: params.genres,
  };

  if (params.directors?.length) {
    schema.director = params.directors.map((d) => ({
      '@type': 'Person',
      name: d.name,
      image: d.image,
    }));
  }

  if (params.actors?.length) {
    schema.actor = params.actors.map((a) => ({
      '@type': 'Person',
      name: a.name,
      image: a.image,
    }));
  }

  if (params.duration) {
    const hours = Math.floor(params.duration / 60);
    const minutes = params.duration % 60;
    schema.duration = `PT${hours}H${minutes}M`;
  }

  if (params.rating && params.ratingCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: params.rating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: params.ratingCount,
    };
  }

  if (params.review) {
    schema.review = {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: params.review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: params.review.authorName || 'TeluguVibes Editorial',
      },
      reviewBody: params.review.body,
    };
  }

  return schema;
}

/**
 * Generate Person Schema for celebrities
 */
export function generatePersonSchema(params: {
  name: string;
  nameTelugu?: string;
  description: string;
  image?: string;
  birthDate?: string;
  deathDate?: string;
  occupation?: string;
  url: string;
  socialLinks?: string[];
}): PersonSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: params.name,
    alternateName: params.nameTelugu,
    description: params.description,
    image: params.image,
    birthDate: params.birthDate,
    deathDate: params.deathDate,
    jobTitle: params.occupation,
    nationality: 'Indian',
    url: params.url,
    sameAs: params.socialLinks,
  };
}

/**
 * Generate Event Schema for birthdays, anniversaries
 */
export function generateEventSchema(params: {
  name: string;
  description: string;
  date: string;
  image?: string;
  about?: {
    type: 'person' | 'movie';
    name: string;
  };
}): EventSchema {
  const schema: EventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: params.name,
    description: params.description,
    startDate: params.date,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    image: params.image,
  };

  if (params.about) {
    if (params.about.type === 'person') {
      schema.about = {
        '@type': 'Person',
        name: params.about.name,
      };
    } else {
      schema.about = {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: params.about.name,
        description: '',
        image: '',
      };
    }
  }

  return schema;
}

/**
 * Generate Q&A Schema for answer-first summaries
 * Critical for Zero-Click SEO
 */
export function generateQASchema(params: {
  question: string;
  answer: string;
}): QASchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: params.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: params.answer,
      },
    },
  };
}

/**
 * Generate Breadcrumb Schema
 */
export function generateBreadcrumbSchema(
  items: { name: string; url?: string }[]
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate answer-first summary for Zero-Click SEO
 * 40-60 words, citation-friendly
 */
export function generateAnswerFirstSummary(
  content: string,
  title: string
): string {
  // Extract first meaningful paragraph
  const paragraphs = content
    .split('\n')
    .filter((p) => p.trim().length > 50)
    .slice(0, 2);

  if (!paragraphs.length) {
    return title;
  }

  // Combine and trim to ~50 words
  let summary = paragraphs.join(' ');
  const words = summary.split(/\s+/);

  if (words.length > 60) {
    summary = words.slice(0, 55).join(' ') + '...';
  }

  return summary;
}

// ============================================================
// RENDER HELPER
// ============================================================

/**
 * Render schema as JSON-LD script tag content
 */
export function renderSchemaScript(
  schema: ArticleSchema | MovieSchema | PersonSchema | EventSchema | QASchema | BreadcrumbSchema | (ArticleSchema | MovieSchema | PersonSchema | EventSchema | QASchema | BreadcrumbSchema)[]
): string {
  const data = Array.isArray(schema) ? schema : [schema];
  return JSON.stringify(data.length === 1 ? data[0] : data);
}








