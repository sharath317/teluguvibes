/**
 * SOURCE FETCHERS INDEX
 *
 * Re-exports all source fetchers for clean imports.
 */

export { fetchFromTMDB } from './tmdb';
export { fetchFromWikidata } from './wikidata';
export { fetchFromYouTube } from './youtube';
export { fetchFromNews } from './news';
export { fetchExistingRecords, calculateCompleteness } from './internal';
