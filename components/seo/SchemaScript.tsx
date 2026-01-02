/**
 * Schema.org Structured Data Components
 * 
 * Provides JSON-LD structured data for:
 * - Movie schema
 * - Review schema
 * - Actor/Person schema
 * - Collection schema
 * - Article schema
 * 
 * Enhances SEO and rich snippets in search results.
 */

import Script from 'next/script';

// ============================================================
// TYPES
// ============================================================

interface MovieSchemaProps {
  name: string;
  nameTeluguName?: string;
  description?: string;
  datePublished?: string;
  director?: string;
  actors?: string[];
  genre?: string[];
  duration?: string; // ISO 8601 format (e.g., "PT2H30M")
  image?: string;
  aggregateRating?: {
    ratingValue: number;
    ratingCount?: number;
    bestRating?: number;
    worstRating?: number;
  };
  contentRating?: string;
  inLanguage?: string;
  url?: string;
}

interface ReviewSchemaProps {
  movieName: string;
  reviewBody: string;
  author?: string;
  datePublished?: string;
  rating?: {
    ratingValue: number;
    bestRating?: number;
    worstRating?: number;
  };
  url?: string;
}

interface PersonSchemaProps {
  name: string;
  description?: string;
  image?: string;
  jobTitle?: string;
  birthDate?: string;
  nationality?: string;
  url?: string;
  sameAs?: string[];
}

interface CollectionSchemaProps {
  name: string;
  description?: string;
  itemCount?: number;
  url?: string;
  image?: string;
}

interface ArticleSchemaProps {
  headline: string;
  description?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  url?: string;
}

// ============================================================
// HELPER
// ============================================================

function SchemaScriptComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <Script
      id={`schema-${data['@type']}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

// ============================================================
// MOVIE SCHEMA
// ============================================================

export function MovieSchema({
  name,
  nameTeluguName,
  description,
  datePublished,
  director,
  actors,
  genre,
  duration,
  image,
  aggregateRating,
  contentRating,
  inLanguage = 'te',
  url,
}: MovieSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name,
    ...(nameTeluguName && { alternateName: nameTeluguName }),
    ...(description && { description }),
    ...(datePublished && { datePublished }),
    ...(director && {
      director: {
        '@type': 'Person',
        name: director,
      },
    }),
    ...(actors &&
      actors.length > 0 && {
        actor: actors.map((actor) => ({
          '@type': 'Person',
          name: actor,
        })),
      }),
    ...(genre && { genre }),
    ...(duration && { duration }),
    ...(image && { image }),
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue,
        bestRating: aggregateRating.bestRating || 10,
        worstRating: aggregateRating.worstRating || 1,
        ...(aggregateRating.ratingCount && { ratingCount: aggregateRating.ratingCount }),
      },
    }),
    ...(contentRating && { contentRating }),
    inLanguage,
    ...(url && { url: url.startsWith('http') ? url : `${baseUrl}${url}` }),
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// REVIEW SCHEMA
// ============================================================

export function ReviewSchema({
  movieName,
  reviewBody,
  author = 'TeluguVibes',
  datePublished,
  rating,
  url,
}: ReviewSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Movie',
      name: movieName,
    },
    reviewBody,
    author: {
      '@type': 'Organization',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TeluguVibes',
      url: baseUrl,
    },
    ...(datePublished && { datePublished }),
    ...(rating && {
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rating.ratingValue,
        bestRating: rating.bestRating || 10,
        worstRating: rating.worstRating || 1,
      },
    }),
    ...(url && { url: url.startsWith('http') ? url : `${baseUrl}${url}` }),
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// PERSON SCHEMA (Actor/Director)
// ============================================================

export function PersonSchema({
  name,
  description,
  image,
  jobTitle,
  birthDate,
  nationality,
  url,
  sameAs,
}: PersonSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    ...(description && { description }),
    ...(image && { image }),
    ...(jobTitle && { jobTitle }),
    ...(birthDate && { birthDate }),
    ...(nationality && { nationality }),
    ...(url && { url: url.startsWith('http') ? url : `${baseUrl}${url}` }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// COLLECTION SCHEMA
// ============================================================

export function CollectionSchema({
  name,
  description,
  itemCount,
  url,
  image,
}: CollectionSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    ...(description && { description }),
    ...(itemCount && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: itemCount,
      },
    }),
    ...(url && { url: url.startsWith('http') ? url : `${baseUrl}${url}` }),
    ...(image && { image }),
    isPartOf: {
      '@type': 'WebSite',
      name: 'TeluguVibes',
      url: baseUrl,
    },
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// ARTICLE SCHEMA
// ============================================================

export function ArticleSchema({
  headline,
  description,
  author = 'TeluguVibes',
  datePublished,
  dateModified,
  image,
  url,
}: ArticleSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    ...(description && { description }),
    author: {
      '@type': 'Organization',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TeluguVibes',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(image && { image }),
    ...(url && { mainEntityOfPage: url.startsWith('http') ? url : `${baseUrl}${url}` }),
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// WEBSITE SCHEMA (for homepage)
// ============================================================

export function WebsiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TeluguVibes',
    alternateName: 'తెలుగు వైబ్స్',
    description: 'Premium Telugu entertainment portal with movie reviews, celebrity news, and more',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: ['te', 'en'],
    publisher: {
      '@type': 'Organization',
      name: 'TeluguVibes',
      url: baseUrl,
    },
  };

  return <SchemaScriptComponent data={schema} />;
}

// ============================================================
// BREADCRUMB SCHEMA
// ============================================================

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teluguvibes.com';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };

  return <SchemaScriptComponent data={schema} />;
}

export default {
  MovieSchema,
  ReviewSchema,
  PersonSchema,
  CollectionSchema,
  ArticleSchema,
  WebsiteSchema,
  BreadcrumbSchema,
};
