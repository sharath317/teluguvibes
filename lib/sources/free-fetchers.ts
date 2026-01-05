/**
 * FREE Data Fetchers for TeluguVibes
 * No API keys required - fully open data sources
 */

// ═══════════════════════════════════════════════════════════════
// OPEN-METEO - FREE Weather API (No API key needed!)
// ═══════════════════════════════════════════════════════════════

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  conditionTe: string;
  icon: string;
  feelsLike: number;
  windSpeed: number;
}

const WEATHER_CONDITIONS: Record<number, { en: string; te: string; icon: string }> = {
  0: { en: 'Clear sky', te: 'స్వచ్ఛమైన ఆకాశం', icon: '☀️' },
  1: { en: 'Mainly clear', te: 'ప్రధానంగా స్పష్టమైన', icon: '🌤️' },
  2: { en: 'Partly cloudy', te: 'పాక్షిక మేఘావృతం', icon: '⛅' },
  3: { en: 'Overcast', te: 'మేఘావృతం', icon: '☁️' },
  45: { en: 'Fog', te: 'పొగమంచు', icon: '🌫️' },
  48: { en: 'Depositing rime fog', te: 'మంచు పొగ', icon: '🌫️' },
  51: { en: 'Light drizzle', te: 'తేలికపాటి జల్లు', icon: '🌧️' },
  53: { en: 'Moderate drizzle', te: 'మధ్యస్థ జల్లు', icon: '🌧️' },
  55: { en: 'Dense drizzle', te: 'భారీ జల్లు', icon: '🌧️' },
  61: { en: 'Slight rain', te: 'తేలికపాటి వర్షం', icon: '🌧️' },
  63: { en: 'Moderate rain', te: 'మధ్యస్థ వర్షం', icon: '🌧️' },
  65: { en: 'Heavy rain', te: 'భారీ వర్షం', icon: '🌧️' },
  80: { en: 'Slight showers', te: 'తేలికపాటి జల్లులు', icon: '🌦️' },
  81: { en: 'Moderate showers', te: 'మధ్యస్థ జల్లులు', icon: '🌦️' },
  82: { en: 'Violent showers', te: 'తీవ్రమైన జల్లులు', icon: '⛈️' },
  95: { en: 'Thunderstorm', te: 'ఉరుములతో కూడిన వర్షం', icon: '⛈️' },
};

export async function fetchWeather(city: string = 'Hyderabad'): Promise<WeatherData | null> {
  // City coordinates
  const cities: Record<string, { lat: number; lon: number }> = {
    'Hyderabad': { lat: 17.385, lon: 78.4867 },
    'Vijayawada': { lat: 16.5062, lon: 80.6480 },
    'Visakhapatnam': { lat: 17.6868, lon: 83.2185 },
    'Tirupati': { lat: 13.6288, lon: 79.4192 },
    'Warangal': { lat: 17.9784, lon: 79.5941 },
  };

  const coords = cities[city] || cities['Hyderabad'];

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia/Kolkata`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current;
    const weatherCode = current.weather_code;
    const condition = WEATHER_CONDITIONS[weatherCode] || WEATHER_CONDITIONS[0];

    return {
      location: city,
      temperature: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      condition: condition.en,
      conditionTe: condition.te,
      icon: condition.icon,
      feelsLike: Math.round(current.apparent_temperature),
      windSpeed: Math.round(current.wind_speed_10m),
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE TRENDS RSS - FREE Trending Topics
// ═══════════════════════════════════════════════════════════════

export interface TrendingTopic {
  title: string;
  traffic: string;
  link: string;
  pubDate: string;
  relatedQueries: string[];
}

export async function fetchGoogleTrends(geo: string = 'IN'): Promise<TrendingTopic[]> {
  try {
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const xml = await response.text();

    // Parse RSS XML
    const items: TrendingTopic[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const traffic = itemXml.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || '';
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      if (title) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          traffic,
          link,
          pubDate,
          relatedQueries: [],
        });
      }
    }

    return items;
  } catch (error) {
    console.error('Google Trends fetch failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// WIKIDATA - FREE Knowledge Graph
// ═══════════════════════════════════════════════════════════════

export interface WikidataEntity {
  id: string;
  name: string;
  nameTe?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  occupation?: string[];
  image?: string;
}

export async function fetchTeluguCelebritiesFromWikidata(limit: number = 50): Promise<WikidataEntity[]> {
  const query = `
    SELECT DISTINCT ?person ?personLabel ?personLabelTe ?description ?birthDate ?deathDate ?image WHERE {
      ?person wdt:P106 wd:Q33999 . # actor
      ?person wdt:P27 wd:Q668 . # Indian citizen
      {?person wdt:P1412 wd:Q8097} UNION {?person wdt:P19/wdt:P131* wd:Q1159} . # Telugu speaker or born in Andhra/Telangana

      OPTIONAL { ?person rdfs:label ?personLabelTe . FILTER(LANG(?personLabelTe) = "te") }
      OPTIONAL { ?person schema:description ?description . FILTER(LANG(?description) = "en") }
      OPTIONAL { ?person wdt:P569 ?birthDate }
      OPTIONAL { ?person wdt:P570 ?deathDate }
      OPTIONAL { ?person wdt:P18 ?image }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT ${limit}
  `;

  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.results.bindings.map((b: Record<string, { value: string }>) => ({
      id: b.person?.value?.split('/').pop() || '',
      name: b.personLabel?.value || '',
      nameTe: b.personLabelTe?.value,
      description: b.description?.value,
      birthDate: b.birthDate?.value?.split('T')[0],
      deathDate: b.deathDate?.value?.split('T')[0],
      image: b.image?.value,
    }));
  } catch (error) {
    console.error('Wikidata fetch failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// TMDB - FREE Movie Database (requires API key but free tier)
// ═══════════════════════════════════════════════════════════════

export interface TMDBMovie {
  id: number;
  title: string;
  titleOriginal: string;
  overview: string;
  releaseDate: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  genres: number[];
}

export async function fetchTeluguMoviesFromTMDB(page: number = 1): Promise<TMDBMovie[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('TMDB_API_KEY not set');
    return [];
  }

  try {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_original_language=te&sort_by=popularity.desc&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();

    return data.results.map((m: Record<string, unknown>) => ({
      id: m.id as number,
      title: m.title as string,
      titleOriginal: m.original_title as string,
      overview: m.overview as string,
      releaseDate: m.release_date as string,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      rating: m.vote_average as number,
      voteCount: m.vote_count as number,
      genres: m.genre_ids as number[],
    }));
  } catch (error) {
    console.error('TMDB fetch failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// CRICAPI - FREE Cricket Data (limited free tier)
// ═══════════════════════════════════════════════════════════════

export interface CricketMatch {
  id: string;
  name: string;
  status: string;
  venue: string;
  date: string;
  teams: string[];
  score?: string;
}

export async function fetchCricketMatches(): Promise<CricketMatch[]> {
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey) {
    console.warn('CRICKET_API_KEY not set');
    return [];
  }

  try {
    const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();

    if (data.status !== 'success') return [];

    return data.data?.map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string,
      status: m.status as string,
      venue: m.venue as string,
      date: m.date as string,
      teams: (m.teams as string[]) || [],
      score: m.score as string,
    })) || [];
  } catch (error) {
    console.error('Cricket API fetch failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// WIKIPEDIA PAGE IMAGES - FREE Image Source
// ═══════════════════════════════════════════════════════════════

export async function fetchWikipediaImage(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const pages = Object.values(data.query?.pages || {}) as Array<{ thumbnail?: { source: string } }>;

    return pages[0]?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL FETCHERS
// ═══════════════════════════════════════════════════════════════

export const FreeFetchers = {
  weather: fetchWeather,
  trends: fetchGoogleTrends,
  celebrities: fetchTeluguCelebritiesFromWikidata,
  movies: fetchTeluguMoviesFromTMDB,
  cricket: fetchCricketMatches,
  image: fetchWikipediaImage,
};








