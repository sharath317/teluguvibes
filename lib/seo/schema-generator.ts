/**
 * SEO Schema Generator
 * Generates structured data schemas for SEO (JSON-LD)
 */

export interface MovieSchemaData {
  title: string;
  titleTe?: string;
  description?: string;
  director?: string;
  hero?: string;
  releaseYear?: number;
  genres?: string[];
  rating?: number;
  posterUrl?: string;
  slug: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate Movie Schema (JSON-LD)
 */
export function generateMovieSchema(movie: MovieSchemaData): object {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    alternateName: movie.titleTe,
    description: movie.description,
    director: movie.director ? {
      "@type": "Person",
      name: movie.director,
    } : undefined,
    actor: movie.hero ? {
      "@type": "Person",
      name: movie.hero,
    } : undefined,
    datePublished: movie.releaseYear?.toString(),
    genre: movie.genres,
    aggregateRating: movie.rating ? {
      "@type": "AggregateRating",
      ratingValue: movie.rating,
      bestRating: 10,
      worstRating: 1,
    } : undefined,
    image: movie.posterUrl,
    url: `https://teluguportal.com/reviews/${movie.slug}`,
  };
}

/**
 * Generate Breadcrumb Schema (JSON-LD)
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Article Schema (JSON-LD)
 */
export function generateArticleSchema(article: {
  title: string;
  description?: string;
  authorName?: string;
  publishedAt?: string;
  imageUrl?: string;
  url: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: article.authorName ? {
      "@type": "Person",
      name: article.authorName,
    } : undefined,
    datePublished: article.publishedAt,
    image: article.imageUrl,
    url: article.url,
  };
}

/**
 * Generate WebPage Schema (JSON-LD)
 */
export function generateWebPageSchema(page: {
  title: string;
  description?: string;
  url: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: page.url,
  };
}

