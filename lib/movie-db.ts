/**
 * Movie Database Integration - TMDB API
 * Free tier: 1000 requests/day
 * Sign up: https://www.themoviedb.org/signup
 */

interface MovieResult {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string;
  rating: number;
  popularity: number;
}

interface MovieDetails extends MovieResult {
  runtime: number;
  genres: string[];
  cast: Array<{ name: string; character: string; profileUrl: string | null }>;
  director: string | null;
  budget: number;
  revenue: number;
  tagline: string;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Search for movies by name
 */
export async function searchMovies(query: string, language = 'te'): Promise<MovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.warn('TMDB_API_KEY not configured');
    return [];
  }

  try {
    // Search in Telugu first, then English for better results
    const languages = [language, 'en'];
    const allResults: MovieResult[] = [];

    for (const lang of languages) {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=${lang}-IN&region=IN`,
        { cache: 'no-store' }
      );

      if (!response.ok) continue;

      const data = await response.json();

      for (const movie of data.results || []) {
        // Avoid duplicates
        if (!allResults.some(r => r.id === movie.id)) {
          allResults.push({
            id: movie.id,
            title: movie.title,
            originalTitle: movie.original_title,
            overview: movie.overview,
            posterUrl: movie.poster_path
              ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}`
              : null,
            backdropUrl: movie.backdrop_path
              ? `${TMDB_IMAGE_BASE}/w1280${movie.backdrop_path}`
              : null,
            releaseDate: movie.release_date,
            rating: movie.vote_average,
            popularity: movie.popularity,
          });
        }
      }

      // If we found results in Telugu, no need to search English
      if (allResults.length >= 5) break;
    }

    // Sort by popularity and relevance
    return allResults.sort((a, b) => b.popularity - a.popularity).slice(0, 10);
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

/**
 * Get detailed movie information including cast
 */
export async function getMovieDetails(movieId: number): Promise<MovieDetails | null> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return null;

  try {
    // Fetch movie details and credits in parallel
    const [detailsRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=te-IN`),
      fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${apiKey}`),
    ]);

    if (!detailsRes.ok) return null;

    const details = await detailsRes.json();
    const credits = creditsRes.ok ? await creditsRes.json() : { cast: [], crew: [] };

    // Find director
    const director = credits.crew?.find((c: any) => c.job === 'Director');

    // Get top cast
    const cast = (credits.cast || []).slice(0, 10).map((c: any) => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null,
    }));

    return {
      id: details.id,
      title: details.title,
      originalTitle: details.original_title,
      overview: details.overview,
      posterUrl: details.poster_path
        ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}`
        : null,
      backdropUrl: details.backdrop_path
        ? `${TMDB_IMAGE_BASE}/w1280${details.backdrop_path}`
        : null,
      releaseDate: details.release_date,
      rating: details.vote_average,
      popularity: details.popularity,
      runtime: details.runtime,
      genres: (details.genres || []).map((g: any) => g.name),
      cast,
      director: director?.name || null,
      budget: details.budget,
      revenue: details.revenue,
      tagline: details.tagline,
    };
  } catch (error) {
    console.error('TMDB details error:', error);
    return null;
  }
}

/**
 * Get movie poster URL for a movie name
 * Returns the best match poster or null
 */
export async function getMoviePoster(movieName: string): Promise<string | null> {
  const results = await searchMovies(movieName);

  if (results.length === 0) return null;

  // Return the most popular match's poster
  return results[0].posterUrl;
}

/**
 * Get movie backdrop (wider image) for a movie name
 */
export async function getMovieBackdrop(movieName: string): Promise<string | null> {
  const results = await searchMovies(movieName);

  if (results.length === 0) return null;

  return results[0].backdropUrl;
}

/**
 * Generate Telugu article content from movie details
 */
export async function generateMovieArticle(movieName: string): Promise<{
  title: string;
  content: string;
  imageUrl: string | null;
  category: 'entertainment';
} | null> {
  const results = await searchMovies(movieName);

  if (results.length === 0) return null;

  const movie = results[0];
  const details = await getMovieDetails(movie.id);

  if (!details) {
    // Basic article without details
    return {
      title: `${movie.title} మూవీ అప్‌డేట్`,
      content: `${movie.title} సినిమా గురించి తాజా సమాచారం.

${movie.overview || 'మరిన్ని వివరాలు త్వరలో అందుబాటులోకి రానున్నాయి.'}

రేటింగ్: ${movie.rating}/10
విడుదల: ${movie.releaseDate || 'TBA'}`,
      imageUrl: movie.posterUrl || movie.backdropUrl,
      category: 'entertainment',
    };
  }

  // Rich article with details
  const castList = details.cast.slice(0, 5).map(c => c.name).join(', ');
  const genreList = details.genres.join(', ');

  return {
    title: `${details.title}: ${details.tagline || 'తాజా అప్‌డేట్'}`,
    content: `${details.title} (${details.originalTitle}) సినిమా గురించి పూర్తి వివరాలు ఇక్కడ చూడండి.

${details.overview}

🎬 **సినిమా వివరాలు:**
• విడుదల తేదీ: ${details.releaseDate || 'త్వరలో'}
• రేటింగ్: ${details.rating}/10
• నిడివి: ${details.runtime} నిమిషాలు
• కేటగిరీ: ${genreList}

🎭 **తారాగణం:**
${castList}

🎥 **దర్శకుడు:** ${details.director || 'వివరాలు అందుబాటులో లేవు'}

ఈ సినిమా అభిమానులకు మరింత ఆసక్తికరంగా ఉంటుందని భావిస్తున్నారు.`,
    imageUrl: details.posterUrl || details.backdropUrl,
    category: 'entertainment',
  };
}

/**
 * Telugu Movie Database - Popular recent movies for reference
 */
export const POPULAR_TELUGU_MOVIES = [
  { name: 'Pushpa 2', aliases: ['పుష్ప 2', 'pushpa the rule'] },
  { name: 'Salaar', aliases: ['సలార్'] },
  { name: 'Devara', aliases: ['దేవర', 'devara part 1'] },
  { name: 'Kalki 2898 AD', aliases: ['కల్కి', 'kalki'] },
  { name: 'HanuMan', aliases: ['హనుమాన్'] },
  { name: 'Guntur Kaaram', aliases: ['గుంటూరు కారం'] },
  { name: 'Family Star', aliases: ['ఫ్యామిలీ స్టార్'] },
  { name: 'Tillu Square', aliases: ['టిల్లు స్క్వేర్'] },
  { name: 'Saindhav', aliases: ['సైంధవ్'] },
  { name: 'Eagle', aliases: ['ఈగల్'] },
];

/**
 * Match movie name from text (handles aliases)
 */
export function detectMovieInText(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const movie of POPULAR_TELUGU_MOVIES) {
    if (lowerText.includes(movie.name.toLowerCase())) {
      return movie.name;
    }
    for (const alias of movie.aliases) {
      if (text.includes(alias) || lowerText.includes(alias.toLowerCase())) {
        return movie.name;
      }
    }
  }

  // Check for generic movie patterns
  const moviePatterns = [
    /['"]([^'"]+)['"]\s*(movie|film|సినిమా|మూవీ)/i,
    /(movie|film|సినిమా|మూవీ)\s*['"]([^'"]+)['"]/i,
  ];

  for (const pattern of moviePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[2];
    }
  }

  return null;
}



