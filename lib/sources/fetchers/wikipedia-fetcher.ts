/**
 * WIKIPEDIA FETCHER
 *
 * Fetches summaries and basic info via REST API.
 * NO HTML SCRAPING - only structured API responses.
 */

import { BaseFetcher } from '../base-fetcher';
import type { FetcherResult, FetcherConfig, PersonData, MovieData } from '../types';

const WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

type WikiEntity = PersonData | MovieData;

export class WikipediaFetcher extends BaseFetcher<WikiEntity> {
  constructor() {
    super('wikipedia');
    this.rateLimit = { requests: 100, windowMs: 60000 }; // 100 per minute
  }

  async fetch(config: FetcherConfig): Promise<FetcherResult<WikiEntity>[]> {
    const results: FetcherResult<WikiEntity>[] = [];
    const limit = config.limit || 20;

    // Fetch Telugu cinema related articles
    const searchTerms = [
      'Telugu cinema',
      'Tollywood actors',
      'Telugu film directors',
      'Telugu films',
    ];

    for (const term of searchTerms) {
      if (results.length >= limit) break;

      const searchResults = await this.searchArticles(term, Math.min(10, limit - results.length));

      for (const article of searchResults) {
        if (results.length >= limit) break;

        const summary = await this.fetchSummary(article.title);
        if (!summary) continue;

        const entity = this.transformToEntity(summary, article);
        if (!entity) continue;

        const confidence = this.calculateConfidence(entity, {
          hasDescription: summary.extract ? 1.05 : 0.9,
          hasImage: summary.thumbnail ? 1.02 : 0.95,
        });

        results.push(this.wrapResult(entity, confidence, true, {
          query_used: term,
        }));
      }
    }

    return results;
  }

  protected isTeluguRelated(data: WikiEntity): boolean {
    // Check if data mentions Telugu cinema
    const text = JSON.stringify(data).toLowerCase();
    return text.includes('telugu') ||
           text.includes('tollywood') ||
           text.includes('andhra') ||
           text.includes('telangana');
  }

  /**
   * Search for Wikipedia articles
   */
  private async searchArticles(query: string, limit: number): Promise<any[]> {
    const url = `${WIKI_API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
      `&srlimit=${limit}&format=json&origin=*`;

    const data = await this.fetchJSON<any>(url);
    return data?.query?.search || [];
  }

  /**
   * Fetch article summary via REST API
   */
  private async fetchSummary(title: string): Promise<any> {
    const url = `${WIKI_REST_BASE}/page/summary/${encodeURIComponent(title)}`;
    return this.fetchJSON(url);
  }

  /**
   * Transform Wikipedia summary to entity
   */
  private transformToEntity(summary: any, searchResult: any): WikiEntity | null {
    const extract = summary.extract || '';

    // Detect if it's a person or movie based on content
    const isPerson = this.isPerson(extract, summary.description);

    if (isPerson) {
      return this.transformToPerson(summary);
    } else if (this.isMovie(extract, summary.description)) {
      return this.transformToMovie(summary);
    }

    return null;
  }

  private isPerson(extract: string, description?: string): boolean {
    const personKeywords = ['actor', 'actress', 'director', 'singer', 'born', 'producer'];
    const text = `${extract} ${description || ''}`.toLowerCase();
    return personKeywords.some(kw => text.includes(kw));
  }

  private isMovie(extract: string, description?: string): boolean {
    const movieKeywords = ['film', 'movie', 'released', 'directed by', 'starring'];
    const text = `${extract} ${description || ''}`.toLowerCase();
    return movieKeywords.some(kw => text.includes(kw));
  }

  private transformToPerson(summary: any): PersonData {
    const extract = summary.extract || '';

    return {
      name_en: summary.title,
      biography_en: extract.slice(0, 500),
      image_url: summary.thumbnail?.source,
      roles: this.inferRolesFromText(extract),
      primary_role: this.inferPrimaryRoleFromText(extract),
      catalogue_status: 'partial',
      data_sources: ['wikipedia'],
    };
  }

  private transformToMovie(summary: any): MovieData {
    const extract = summary.extract || '';

    return {
      title_en: summary.title.replace(/\(film\)/i, '').trim(),
      overview_en: extract.slice(0, 500),
      poster_url: summary.thumbnail?.source,
      release_year: this.extractYear(extract),
      genres: [],
      catalogue_status: 'partial',
      data_sources: ['wikipedia'],
    };
  }

  private inferRolesFromText(text: string): PersonData['roles'] {
    const roles: PersonData['roles'] = [];
    const lower = text.toLowerCase();

    if (lower.includes('actor')) roles.push('actor');
    if (lower.includes('actress')) roles.push('actress');
    if (lower.includes('director')) roles.push('director');
    if (lower.includes('producer')) roles.push('producer');
    if (lower.includes('singer')) roles.push('singer');
    if (lower.includes('music director') || lower.includes('composer')) {
      roles.push('music_director');
    }

    return roles.length > 0 ? roles : ['actor'];
  }

  private inferPrimaryRoleFromText(text: string): PersonData['primary_role'] {
    const lower = text.toLowerCase();
    if (lower.indexOf('director') < lower.indexOf('actor') && lower.includes('director')) {
      return 'director';
    }
    if (lower.includes('actress')) return 'actress';
    return 'actor';
  }

  private extractYear(text: string): number | undefined {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : undefined;
  }
}



