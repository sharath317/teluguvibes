/**
 * Telugu Content Templates
 *
 * Pre-defined high-quality Telugu content structures for different topics.
 * These templates ensure consistent, engaging Telugu content.
 */

export interface ContentTemplate {
  topic: string;
  entity: string;
  entityType: 'actor' | 'actress' | 'movie' | 'director' | 'event';
  tags: string[];
  generateTitle: (details?: Record<string, string>) => string;
  generateExcerpt: (details?: Record<string, string>) => string;
  generateBody: (details?: Record<string, string>) => string;
}

// Entity database for tag generation
export const TELUGU_ENTITIES = {
  actors: [
    { name: 'Allu Arjun', nameTe: 'అల్లు అర్జున్', alias: 'Stylish Star', wikiTitle: 'Allu_Arjun' },
    { name: 'Prabhas', nameTe: 'ప్రభాస్', alias: 'Rebel Star', wikiTitle: 'Prabhas' },
    { name: 'Ram Charan', nameTe: 'రామ్ చరణ్', alias: 'Mega Power Star', wikiTitle: 'Ram_Charan' },
    { name: 'Jr NTR', nameTe: 'జూనియర్ ఎన్టీఆర్', alias: 'Young Tiger', wikiTitle: 'N._T._Rama_Rao_Jr.' },
    { name: 'Mahesh Babu', nameTe: 'మహేష్ బాబు', alias: 'Super Star', wikiTitle: 'Mahesh_Babu' },
    { name: 'Chiranjeevi', nameTe: 'చిరంజీవి', alias: 'Megastar', wikiTitle: 'Chiranjeevi' },
    { name: 'Nagarjuna', nameTe: 'నాగార్జున', alias: 'King', wikiTitle: 'Nagarjuna_(actor)' },
    { name: 'Vijay Deverakonda', nameTe: 'విజయ్ దేవరకొండ', alias: 'Rowdy', wikiTitle: 'Vijay_Deverakonda' },
    { name: 'Nani', nameTe: 'నాని', alias: 'Natural Star', wikiTitle: 'Nani_(actor)' },
    { name: 'Ravi Teja', nameTe: 'రవి తేజ', alias: 'Mass Maharaja', wikiTitle: 'Ravi_Teja' },
  ],
  actresses: [
    { name: 'Samantha', nameTe: 'సమంత', wikiTitle: 'Samantha_Ruth_Prabhu' },
    { name: 'Rashmika Mandanna', nameTe: 'రష్మిక మందన్న', wikiTitle: 'Rashmika_Mandanna' },
    { name: 'Pooja Hegde', nameTe: 'పూజా హెగ్డే', wikiTitle: 'Pooja_Hegde' },
    { name: 'Keerthy Suresh', nameTe: 'కీర్తి సురేష్', wikiTitle: 'Keerthy_Suresh' },
    { name: 'Sai Pallavi', nameTe: 'సాయి పల్లవి', wikiTitle: 'Sai_Pallavi' },
  ],
  directors: [
    { name: 'SS Rajamouli', nameTe: 'ఎస్.ఎస్. రాజమౌళి', wikiTitle: 'S._S._Rajamouli' },
    { name: 'Sukumar', nameTe: 'సుకుమార్', wikiTitle: 'Sukumar_(director)' },
    { name: 'Trivikram', nameTe: 'త్రివిక్రమ్', wikiTitle: 'Trivikram_Srinivas' },
    { name: 'Koratala Siva', nameTe: 'కొరటాల శివ', wikiTitle: 'Koratala_Siva' },
    { name: 'Prashanth Neel', nameTe: 'ప్రశాంత్ నీల్', wikiTitle: 'Prashanth_Neel' },
    { name: 'Shankar', nameTe: 'శంకర్', wikiTitle: 'Shankar_(director)' },
  ],
  movies: [
    { name: 'Pushpa 2', nameTe: 'పుష్ప 2', aliases: ['Pushpa 2 The Rule', 'పుష్ప'], year: 2024, hero: 'Allu Arjun' },
    { name: 'Salaar', nameTe: 'సలార్', aliases: ['Salaar Part 2'], year: 2023, hero: 'Prabhas' },
    { name: 'Raja Saab', nameTe: 'రాజా సాబ్', aliases: ['The Raja Saab', 'రాజా'], year: 2025, hero: 'Prabhas' },
    { name: 'Spirit', nameTe: 'స్పిరిట్', aliases: [], year: 2025, hero: 'Prabhas' },
    { name: 'RRR', nameTe: 'ఆర్ఆర్ఆర్', aliases: [], year: 2022, hero: 'Jr NTR' },
    { name: 'Baahubali', nameTe: 'బాహుబలి', aliases: ['Bahubali'], year: 2015, hero: 'Prabhas' },
    { name: 'Game Changer', nameTe: 'గేమ్ చేంజర్', aliases: [], year: 2025, hero: 'Ram Charan' },
    { name: 'Devara', nameTe: 'దేవర', aliases: ['Devara Part 1'], year: 2024, hero: 'Jr NTR' },
    { name: 'SSMB29', nameTe: 'ఎస్ఎస్ఎంబి29', aliases: [], year: 2026, hero: 'Mahesh Babu' },
    { name: 'Vishwambhara', nameTe: 'విశ్వంభర', aliases: [], year: 2025, hero: 'Chiranjeevi' },
    { name: 'Akhanda 2', nameTe: 'అఖండ 2', aliases: [], year: 2025, hero: 'Nandamuri Balakrishna' },
    { name: 'OG', nameTe: 'ఓజీ', aliases: [], year: 2025, hero: 'Pawan Kalyan' },
    { name: 'Hari Hara Veera Mallu', nameTe: 'హరి హర వీర మల్లు', aliases: ['HHVM'], year: 2025, hero: 'Pawan Kalyan' },
    { name: 'Thandel', nameTe: 'తండేల్', aliases: [], year: 2025, hero: 'Naga Chaitanya' },
    { name: 'Lucky Baskhar', nameTe: 'లక్కీ భాస్కర్', aliases: [], year: 2024, hero: 'Dulquer Salmaan' },
  ],
};

/**
 * Find entity by name (case-insensitive, partial match)
 */
export function findEntity(query: string): {
  entity: typeof TELUGU_ENTITIES.actors[0] | typeof TELUGU_ENTITIES.actresses[0] | typeof TELUGU_ENTITIES.directors[0];
  type: 'actor' | 'actress' | 'director';
} | null {
  const q = query.toLowerCase();

  for (const actor of TELUGU_ENTITIES.actors) {
    if (q.includes(actor.name.toLowerCase()) || q.includes(actor.nameTe)) {
      return { entity: actor, type: 'actor' };
    }
  }

  for (const actress of TELUGU_ENTITIES.actresses) {
    if (q.includes(actress.name.toLowerCase()) || q.includes(actress.nameTe)) {
      return { entity: actress, type: 'actress' };
    }
  }

  for (const director of TELUGU_ENTITIES.directors) {
    if (q.includes(director.name.toLowerCase()) || q.includes(director.nameTe)) {
      return { entity: director, type: 'director' };
    }
  }

  return null;
}

/**
 * Find movie by name (case-insensitive, includes aliases)
 */
export function findMovie(query: string): typeof TELUGU_ENTITIES.movies[0] | null {
  const q = query.toLowerCase();

  for (const movie of TELUGU_ENTITIES.movies) {
    // Check main name
    if (q.includes(movie.name.toLowerCase()) || q.includes(movie.nameTe)) {
      return movie;
    }
    // Check aliases
    if (movie.aliases && movie.aliases.some(alias => q.includes(alias.toLowerCase()))) {
      return movie;
    }
  }

  return null;
}

/**
 * Extract movie name from topic text
 * Tries to find known movies first, then extracts quoted text
 */
export function extractMovieName(topic: string): { name: string; nameTe: string; hero?: string } | null {
  // First try known movies
  const movie = findMovie(topic);
  if (movie) {
    return { name: movie.name, nameTe: movie.nameTe, hero: movie.hero };
  }

  // Try to extract from quotes (English)
  const quotedMatch = topic.match(/['"]([^'"]+)['"]/);
  if (quotedMatch) {
    return { name: quotedMatch[1], nameTe: quotedMatch[1] };
  }

  // Try to extract from Telugu quotes
  const teluguQuoteMatch = topic.match(/['"']([^'"']+)['"']/);
  if (teluguQuoteMatch) {
    return { name: teluguQuoteMatch[1], nameTe: teluguQuoteMatch[1] };
  }

  // Look for common patterns like "Movie Name movie", "Movie Name film"
  const moviePatterns = [
    /(\w+(?:\s+\w+)?)\s+(?:movie|film|cinema|చిత్రం|సినిమా)/i,
    /(?:movie|film|cinema|చిత్రం|సినిమా)\s+(\w+(?:\s+\w+)?)/i,
  ];

  for (const pattern of moviePatterns) {
    const match = topic.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      return { name: match[1], nameTe: match[1] };
    }
  }

  return null;
}

/**
 * Extract tags from topic
 */
export function extractTags(topic: string): string[] {
  const tags: string[] = [];
  const topicLower = topic.toLowerCase();

  // Check actors
  for (const actor of TELUGU_ENTITIES.actors) {
    if (topicLower.includes(actor.name.toLowerCase())) {
      tags.push(actor.name);
      if (actor.alias) tags.push(actor.alias);
    }
  }

  // Check actresses
  for (const actress of TELUGU_ENTITIES.actresses) {
    if (topicLower.includes(actress.name.toLowerCase())) {
      tags.push(actress.name);
    }
  }

  // Check directors
  for (const director of TELUGU_ENTITIES.directors) {
    if (topicLower.includes(director.name.toLowerCase())) {
      tags.push(director.name);
    }
  }

  // Check movies
  for (const movie of TELUGU_ENTITIES.movies) {
    if (topicLower.includes(movie.name.toLowerCase())) {
      tags.push(movie.name);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Get Wikipedia image URL for entity
 */
export async function getEntityImage(entity: string): Promise<string | null> {
  // Find the entity in our database
  const found = findEntity(entity);
  const wikiTitle = found?.entity?.wikiTitle || entity.replace(/\s+/g, '_');

  // Try Wikipedia first
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as Array<{ thumbnail?: { source: string } }>;
    const wikiImage = pages[0]?.thumbnail?.source;
    if (wikiImage) return wikiImage;
  } catch {
    // Continue to fallback
  }

  // Try TMDB for movies
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    try {
      // Search for movie
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(entity)}&language=te-IN`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.results && searchData.results.length > 0) {
        const posterPath = searchData.results[0].poster_path || searchData.results[0].backdrop_path;
        if (posterPath) {
          return `https://image.tmdb.org/t/p/w500${posterPath}`;
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  return null;
}

/**
 * Smart image search with entity detection
 * Priority: Entity DB → Wikipedia (ALL: movies, actors, companies, etc.) → TMDB (fallback) → Unsplash → Default
 */
export async function getEnhancedImage(topic: string): Promise<{ url: string; source: string } | null> {
  console.log(`   🔍 Image search for: "${topic.slice(0, 40)}..."`);

  // Extract potential names from the topic
  const searchTerms = extractSearchTerms(topic);
  console.log(`      🔎 Search terms: ${searchTerms.slice(0, 3).join(', ')}`);

  // Detect if this is movie-related topic
  const isMovieTopic = topic.toLowerCase().includes('movie') ||
                       topic.toLowerCase().includes('film') ||
                       topic.includes('సినిమా') ||
                       topic.includes('చిత్రం') ||
                       topic.includes('రిలీజ్') ||
                       findMovie(topic) !== null;

  const tmdbKey = process.env.TMDB_API_KEY;

  // 1. PRIORITY 1: Try entity database (known actors, actresses, directors)
  // These have verified Wikipedia titles
  for (const term of searchTerms) {
    const found = findEntity(term);
    if (found?.entity?.wikiTitle) {
      console.log(`      👤 Found entity: ${found.entity.name} (${found.type})`);
      const wikiImage = await getEntityImage(found.entity.wikiTitle);
      if (wikiImage && !isGenericWikipediaImage(wikiImage)) {
        console.log(`      ✅ Wikipedia (entity): ${found.entity.name}`);
        return { url: wikiImage, source: 'Wikipedia' };
      }
    }
  }

  // 2. PRIORITY 2: For movie topics, try TMDB FIRST (better posters)
  if (isMovieTopic && tmdbKey) {
    // Try to find the movie from our database
    const movie = findMovie(topic);
    if (movie) {
      console.log(`      🎬 Found movie in DB: ${movie.name}`);
      // Search TMDB for this specific movie
      try {
        const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(movie.name)}&language=te-IN`;
        const movieRes = await fetch(movieUrl);
        const movieData = await movieRes.json();

        if (movieData.results && movieData.results.length > 0) {
          const posterPath = movieData.results[0].poster_path || movieData.results[0].backdrop_path;
          if (posterPath) {
            console.log(`      ✅ TMDB (movie): ${movieData.results[0].title}`);
            return {
              url: `https://image.tmdb.org/t/p/w500${posterPath}`,
              source: 'TMDB'
            };
          }
        }
      } catch {
        // Continue to next strategy
      }
    }

    // Search TMDB with search terms
    for (const searchTerm of searchTerms) {
      if (!searchTerm || searchTerm.length < 3) continue;
      try {
        const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
        const movieRes = await fetch(movieUrl);
        const movieData = await movieRes.json();

        if (movieData.results && movieData.results.length > 0) {
          const posterPath = movieData.results[0].poster_path || movieData.results[0].backdrop_path;
          if (posterPath) {
            console.log(`      ✅ TMDB (movie search): ${movieData.results[0].title}`);
            return {
              url: `https://image.tmdb.org/t/p/w500${posterPath}`,
              source: 'TMDB'
            };
          }
        }
      } catch {
        // Continue
      }
    }
  }

  // 3. PRIORITY 3: TMDB for person (actor/actress) if not a movie topic
  if (tmdbKey && !isMovieTopic) {
    for (const searchTerm of searchTerms) {
      if (!searchTerm || searchTerm.length < 3) continue;
      try {
        const personUrl = `https://api.themoviedb.org/3/search/person?api_key=${tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
        const personRes = await fetch(personUrl);
        const personData = await personRes.json();

        if (personData.results && personData.results.length > 0) {
          const profilePath = personData.results[0].profile_path;
          if (profilePath) {
            console.log(`      ✅ TMDB (person): ${personData.results[0].name}`);
            return {
              url: `https://image.tmdb.org/t/p/w500${profilePath}`,
              source: 'TMDB'
            };
          }
        }
      } catch {
        // Continue
      }
    }
  }

  // 4. PRIORITY 4: Wikipedia search (with strict validation)
  for (const term of searchTerms) {
    // Only search Wikipedia for English terms that look like names
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(term)) {
      const wikiImage = await searchWikipediaForAnyEntity(term);
      if (wikiImage) {
        console.log(`      ✅ Wikipedia: ${wikiImage.title}`);
        return { url: wikiImage.url, source: 'Wikipedia' };
      }
    }
  }

  // 4. PRIORITY 4: Try Wikipedia category-based images
  const { category, wikiTerms } = detectCategoryWithWikiTerm(topic);
  console.log(`      📂 Category: ${category}`);

  for (const wikiTerm of wikiTerms) {
    const categoryImage = await searchWikipediaForAnyEntity(wikiTerm);
    if (categoryImage) {
      console.log(`      ✅ Wikipedia (category): ${categoryImage.title}`);
      return { url: categoryImage.url, source: 'Wikipedia' };
    }
  }

  // 5. FALLBACK: Unsplash (only if Wikipedia category search also failed)
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const searchQueries: Record<string, string> = {
        'cricket': 'cricket stadium india',
        'sports': 'sports stadium india',
        'movie': 'cinema bollywood',
        'politics': 'india parliament',
        'entertainment': 'indian cinema',
        'business': 'stock market trading',
        'technology': 'technology innovation',
        'health': 'healthcare medical',
        'education': 'education classroom',
        'agriculture': 'farming india',
        'wedding': 'indian wedding',
        'food': 'indian food cuisine',
        'travel': 'india tourism',
        'religion': 'indian temple',
        'crime': 'law justice',
        'weather': 'monsoon rain',
        'ecommerce': 'delivery logistics',
        'fashion': 'indian fashion',
        'music': 'indian music',
        'realestate': 'construction building',
        'default': 'india news'
      };
      const searchTerm = searchQueries[category] || searchQueries['default'];

      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=1&client_id=${unsplashKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        console.log(`      📷 Unsplash fallback: ${searchTerm}`);
        return {
          url: data.results[0].urls.regular,
          source: 'Unsplash'
        };
      }
    } catch {
      // Continue
    }
  }

  // 6. LAST RESORT: Use category-appropriate default images
  console.log(`      📷 Using default fallback image`);

  // Determine category from topic
  const topicLower = topic.toLowerCase();
  let fallbackUrl = '';

  if (topicLower.includes('cinema') || topicLower.includes('movie') || topicLower.includes('film') ||
      topic.includes('సినిమా') || topic.includes('చిత్రం')) {
    // Telugu cinema related
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Ramanaidu_Studios_Hyderabad.jpg/1200px-Ramanaidu_Studios_Hyderabad.jpg';
  } else if (topicLower.includes('temple') || topicLower.includes('tirumala') || topicLower.includes('vaikunt') ||
             topic.includes('తిరుమల') || topic.includes('వైకుంఠ')) {
    // Temple/religious
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Tirumala_temple_050308.jpg/1200px-Tirumala_temple_050308.jpg';
  } else if (topicLower.includes('hyderabad') || topic.includes('హైదరాబాద్')) {
    // Hyderabad
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Charminar_Hyderabad_1.jpg/1200px-Charminar_Hyderabad_1.jpg';
  } else if (topicLower.includes('cricket') || topicLower.includes('ipl') || topicLower.includes('sports')) {
    // Sports
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Rajiv_Gandhi_International_Cricket_Stadium%2C_Hyderabad.jpg/1200px-Rajiv_Gandhi_International_Cricket_Stadium%2C_Hyderabad.jpg';
  } else if (topicLower.includes('politi') || topicLower.includes('election') || topic.includes('ఎన్నికలు')) {
    // Politics
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/AP_Legislative_Assembly_Building%2C_Hyderabad.jpg/1200px-AP_Legislative_Assembly_Building%2C_Hyderabad.jpg';
  } else {
    // Default: Telugu culture/news
    fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Charminar_Hyderabad_1.jpg/1200px-Charminar_Hyderabad_1.jpg';
  }

  return { url: fallbackUrl, source: 'Wikipedia' };
}

/**
 * Check if a Wikipedia image URL is a generic icon or irrelevant image
 * These should be skipped in favor of better images
 */
function isGenericWikipediaImage(url: string): boolean {
  const genericPatterns = [
    // Flags and emblems
    'Flag_of_',
    'Emblem_of_',
    'Coat_of_arms',
    'Seal_of_',
    'Logo_of_',

    // Icons and symbols
    'Icon_',
    'Symbol_',
    'Unicode_',
    'Question_mark',
    'No_image',
    'Placeholder',
    'Default_',

    // Generic artwork/paintings
    'Symposium_scene',
    'Nicias_Painter',
    'Jackee',
    'Ancient_',
    'Roman_',
    'Greek_',

    // SVG icons (usually not photos)
    '.svg',

    // Wiki media logos
    'Crystal_',
    'Nuvola_',
    'Gnome-',
    'Edit-',
    'Commons-logo',
    'Wikibooks-logo',
    'Wikinews-logo',
    'Wikiquote-logo',
    'Wikisource-logo',
    'Wiktionary-logo',
    'Wikidata-logo',
    'Wikiversity-logo',
    'Wikivoyage-logo',
    'Wikipedia-logo',

    // Other generic patterns
    'Ambox_',
    'Template_',
    'Red_pog',
    'Blue_pog',
    'Green_pog',

    // Production company logos (not relevant to content)
    'Ags_entertainment',
    'Sun_Pictures',
    'Geetha_Arts',
    'Mythri_Movie',
    'Hombale_Films',
    'production_company',
    'studio_logo',
    'JYP_Entertainment',
    'SM_Entertainment',
    'YG_Entertainment',
    'HYBE_',
    '_building_in_',
    '_headquarters',
    '_office_building',

    // TV channel logos (not relevant to article content)
    'SET_India_Logo',
    'Zee_TV_Logo',
    'Star_Plus_Logo',
    'Colors_TV_Logo',
    'Sony_TV_Logo',
    '_channel_logo',
    '_tv_logo',
    '_Logo_%28',  // Logo images with date
  ];

  const urlLower = url.toLowerCase();
  return genericPatterns.some(pattern => urlLower.includes(pattern.toLowerCase()));
}

/**
 * Search Wikipedia for ANY entity (movies, actors, companies, politicians, places, etc.)
 * IMPROVED: Better validation to avoid irrelevant images
 */
async function searchWikipediaForAnyEntity(term: string): Promise<{ url: string; title: string } | null> {
  if (!term || term.length < 3) return null;

  // Skip common Telugu words that won't help find good images
  const skipWords = ['హైదరాబాద్', 'తెలుగు', 'సినిమా', 'చిత్రం', 'అప్డేట్', 'వార్త', 'లేటెస్ట్', 'వీడియో', 'థియేటర్', 'రిలీజ్'];
  if (skipWords.some(w => term.includes(w)) && term.length < 15) {
    // Only skip if the term is JUST the common word
    return null;
  }

  try {
    // Strategy 1: Direct title match (for English terms)
    if (/[a-zA-Z]{3,}/.test(term)) {
      const wikiTitle = term.replace(/\s+/g, '_');
      const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
      const directRes = await fetch(directUrl);
      const directData = await directRes.json();
      const directPages = Object.values(directData.query?.pages || {}) as Array<{ title?: string; pageid?: number; thumbnail?: { source: string } }>;

      // Only accept if it's a real page (has pageid) and image
      if (directPages[0]?.pageid && directPages[0]?.thumbnail?.source) {
        // Validate image URL is not a generic icon
        const imgUrl = directPages[0].thumbnail.source;
        if (!isGenericWikipediaImage(imgUrl)) {
          return { url: imgUrl, title: directPages[0].title || term };
        }
      }
    }

    // Strategy 2: Try with "film" suffix for movies (e.g., "Pushpa film")
    if (/[a-zA-Z]{3,}/.test(term)) {
      const movieSearchTerms = [
        `${term} Telugu film`,
        `${term} Indian film`,
        `${term} actor`,
        `${term} actress`,
      ];

      for (const movieTerm of movieSearchTerms) {
        const movieUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(movieTerm)}&format=json&origin=*&srlimit=1`;
        const movieRes = await fetch(movieUrl);
        const movieData = await movieRes.json();

        const movieResults = movieData.query?.search || [];
        if (movieResults.length > 0) {
          // Validate result title contains our search term (avoid random matches)
          const resultTitle = movieResults[0].title.toLowerCase();
          const searchTermLower = term.toLowerCase();
          if (!resultTitle.includes(searchTermLower) && !searchTermLower.includes(resultTitle.split(' ')[0])) {
            continue; // Skip irrelevant results
          }

          const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(movieResults[0].title)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
          const pageRes = await fetch(pageUrl);
          const pageData = await pageRes.json();
          const pages = Object.values(pageData.query?.pages || {}) as Array<{ thumbnail?: { source: string } }>;

          if (pages[0]?.thumbnail?.source && !isGenericWikipediaImage(pages[0].thumbnail.source)) {
            return { url: pages[0].thumbnail.source, title: movieResults[0].title };
          }
        }
      }
    }

    // Strategy 3: General Wikipedia search API (finds related articles)
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*&srlimit=5`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const results = searchData.query?.search || [];
    for (const result of results) {
      // Get the page image for each search result
      const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
      const pageRes = await fetch(pageUrl);
      const pageData = await pageRes.json();
      const pages = Object.values(pageData.query?.pages || {}) as Array<{ thumbnail?: { source: string } }>;

      // FIXED: Always check for generic images!
      if (pages[0]?.thumbnail?.source && !isGenericWikipediaImage(pages[0].thumbnail.source)) {
        return { url: pages[0].thumbnail.source, title: result.title };
      }
    }
  } catch (e) {
    // Continue
  }

  return null;
}

/**
 * Extract potential search terms from topic
 * Extracts: names, companies, professions, places, organizations
 */
function extractSearchTerms(topic: string): string[] {
  const terms: string[] = [];

  // 1. Text in quotes (movie names, brands, etc.)
  const quoted = topic.match(/['"]([^'"]+)['"]/g);
  if (quoted) {
    terms.push(...quoted.map(q => q.replace(/['"]/g, '')));
  }

  // 2. English words/names (likely person, company, or brand names)
  const englishPhrases = topic.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
  if (englishPhrases) {
    terms.push(...englishPhrases);
  }

  // 3. Known company/brand patterns (extract from Telugu text too)
  const companyPatterns = [
    /Blinkit|బ్లింకిట్/gi,
    /Zomato|జొమాటో/gi,
    /Swiggy|స్విగ్గీ/gi,
    /Amazon|అమెజాన్/gi,
    /Flipkart|ఫ్లిప్‌కార్ట్/gi,
    /Google|గూగుల్/gi,
    /Tesla|టెస్లా/gi,
    /Microsoft|మైక్రోసాఫ్ట్/gi,
    /Apple|ఆపిల్/gi,
    /Netflix|నెట్‌ఫ్లిక్స్/gi,
    /IPL|ఐపీఎల్/gi,
    /BCCI|బీసీసీఐ/gi,
    /TCS|టీసీఎస్/gi,
    /Infosys|ఇన్ఫోసిస్/gi,
    /Wipro|విప్రో/gi,
    /Reliance|రిలయన్స్/gi,
    /Tata|టాటా/gi,
    /Mahindra|మహీంద్రా/gi,
    /Hyundai|హ్యుందాయ్/gi,
  ];

  for (const pattern of companyPatterns) {
    const match = topic.match(pattern);
    if (match) {
      // Add the English version for Wikipedia search
      const englishName = pattern.source.split('|')[0];
      terms.push(englishName);
    }
  }

  // 4. Extract profession/role keywords and map to searchable terms
  const professionMap: Record<string, string> = {
    'రైతు': 'Farmer India',
    'farmer': 'Farmer India',
    'డాక్టర్': 'Doctor India',
    'doctor': 'Doctor medicine',
    'టీచర్': 'Teacher India',
    'teacher': 'Teacher education',
    'ఇంజనీర్': 'Engineer India',
    'engineer': 'Engineer technology',
    'లాయర్': 'Lawyer India',
    'lawyer': 'Lawyer legal',
    'పోలీస్': 'Police India',
    'police': 'Police India',
    'సైనికుడు': 'Indian Army soldier',
    'soldier': 'Indian Army',
    'మంత్రి': 'Minister India government',
    'minister': 'Minister government',
    'ఎమ్మెల్యే': 'MLA India',
    'mla': 'MLA India legislature',
    'ఎంపీ': 'MP India Parliament',
    'mp': 'Member of Parliament India',
    'స్టాక్': 'Stock market India',
    'stock': 'Stock exchange India',
    'షేర్': 'Stock market India',
    'share': 'Stock market trading',
    'క్రికెట్': 'Cricket India',
    'cricket': 'Cricket sport',
    'డెలివరీ': 'Delivery service India',
    'delivery': 'Delivery logistics',
  };

  for (const [keyword, searchTerm] of Object.entries(professionMap)) {
    if (topic.toLowerCase().includes(keyword.toLowerCase())) {
      terms.push(searchTerm);
    }
  }

  // 5. First part before common separators (often the main subject)
  const beforeSeparator = topic.split(/[-–—:|,]/)[0].trim();
  if (beforeSeparator.length > 3 && beforeSeparator.length < 50) {
    terms.push(beforeSeparator);
  }

  // 6. All English words combined (for compound terms)
  const allEnglish = topic.match(/[a-zA-Z]+/g);
  if (allEnglish && allEnglish.length > 0) {
    terms.push(allEnglish.join(' '));
  }

  // 7. First two words (often the subject)
  const firstTwo = topic.split(/\s+/).slice(0, 2).join(' ');
  if (firstTwo.length > 3) {
    terms.push(firstTwo);
  }

  // Remove duplicates and empty strings, prioritize longer terms
  return [...new Set(terms)]
    .filter(t => t && t.length > 2)
    .sort((a, b) => b.length - a.length);
}

/**
 * Detect category from topic and return Wikipedia-searchable term
 */
function detectCategoryWithWikiTerm(topic: string): { category: string; wikiTerms: string[] } {
  const topicLower = topic.toLowerCase();

  // Cricket/IPL
  if (/cricket|ipl|క్రికెట్|ఐపీఎల్|match|wicket|runs|bowling|batting|t20|odi|test match/i.test(topicLower)) {
    return { category: 'cricket', wikiTerms: ['Cricket', 'Indian Premier League', 'Cricket in India'] };
  }

  // Sports (non-cricket)
  if (/sports|game|player|team|tournament|football|tennis|badminton|hockey|kabaddi|స్పోర్ట్స్/i.test(topicLower)) {
    return { category: 'sports', wikiTerms: ['Sport in India', 'Indian sports', 'Sports'] };
  }

  // Movies/Cinema
  if (/movie|film|cinema|release|box\s*office|సినిమా|మూవీ|tollywood|bollywood|ott|trailer|teaser/i.test(topicLower)) {
    return { category: 'movie', wikiTerms: ['Telugu cinema', 'Tollywood', 'Indian cinema'] };
  }

  // Politics/Government
  if (/politics|minister|government|election|party|రాజకీయం|మంత్రి|ఎన్నిక|ముఖ్యమంత్రి|ప్రధాని|parliament|assembly/i.test(topicLower)) {
    return { category: 'politics', wikiTerms: ['Politics of India', 'Indian Parliament', 'Government of India'] };
  }

  // Business/Finance
  if (/business|stock|share|market|investment|company|షేర్|మార్కెట్|పెట్టుబడి|startup|economy/i.test(topicLower)) {
    return { category: 'business', wikiTerms: ['Bombay Stock Exchange', 'Economy of India', 'Business'] };
  }

  // Technology
  if (/tech|technology|software|app|mobile|internet|ai|టెక్నాలజీ|సాఫ్ట్‌వేర్|digital|computer/i.test(topicLower)) {
    return { category: 'technology', wikiTerms: ['Information technology in India', 'Technology', 'Software industry in India'] };
  }

  // Health/Medical
  if (/health|medical|hospital|doctor|medicine|ఆరోగ్యం|వైద్యం|డాక్టర్|covid|disease|treatment/i.test(topicLower)) {
    return { category: 'health', wikiTerms: ['Healthcare in India', 'Medicine', 'Health'] };
  }

  // Education
  if (/education|school|college|university|student|exam|విద్య|పరీక్ష|విద్యార్థి|teacher|learning/i.test(topicLower)) {
    return { category: 'education', wikiTerms: ['Education in India', 'University', 'Education'] };
  }

  // Agriculture/Farmers
  if (/farmer|agriculture|crop|farming|రైతు|వ్యవసాయం|పంట|harvest|seeds|irrigation/i.test(topicLower)) {
    return { category: 'agriculture', wikiTerms: ['Agriculture in India', 'Farming in India', 'Indian agriculture'] };
  }

  // Wedding/Marriage
  if (/wedding|marriage|పెళ్లి|వివాహం|bride|groom|engagement|reception/i.test(topicLower)) {
    return { category: 'wedding', wikiTerms: ['Hindu wedding', 'Indian wedding', 'Marriage in India'] };
  }

  // Food/Cuisine
  if (/food|recipe|restaurant|cuisine|ఆహారం|వంట|biryani|dosa|curry|cooking/i.test(topicLower)) {
    return { category: 'food', wikiTerms: ['Indian cuisine', 'Telugu cuisine', 'South Indian cuisine'] };
  }

  // Travel/Tourism
  if (/travel|tourism|trip|vacation|temple|tourist|ప్రయాణం|టూరిజం|గుడి|beach|hill station/i.test(topicLower)) {
    return { category: 'travel', wikiTerms: ['Tourism in India', 'Temples of India', 'Travel'] };
  }

  // Religion/Festivals
  if (/festival|temple|god|పండుగ|దేవుడు|puja|diwali|holi|dasara|sankranti|worship/i.test(topicLower)) {
    return { category: 'religion', wikiTerms: ['Hinduism', 'Indian festivals', 'Hindu temple'] };
  }

  // Crime/Legal
  if (/crime|police|court|law|arrest|నేరం|పోలీసు|కోర్టు|murder|theft|case/i.test(topicLower)) {
    return { category: 'crime', wikiTerms: ['Law enforcement in India', 'Supreme Court of India', 'Crime in India'] };
  }

  // Weather/Environment
  if (/weather|rain|storm|climate|వాతావరణం|వర్షం|flood|drought|temperature|monsoon/i.test(topicLower)) {
    return { category: 'weather', wikiTerms: ['Climate of India', 'Monsoon', 'Weather'] };
  }

  // Delivery/E-commerce
  if (/delivery|ecommerce|online|order|డెలివరీ|ఆర్డర్|shipping|courier/i.test(topicLower)) {
    return { category: 'ecommerce', wikiTerms: ['E-commerce in India', 'Online shopping', 'Delivery'] };
  }

  // Beauty/Fashion
  if (/beauty|fashion|style|makeup|బ్యూటీ|ఫ్యాషన్|dress|clothing|model/i.test(topicLower)) {
    return { category: 'fashion', wikiTerms: ['Fashion in India', 'Indian fashion', 'Beauty'] };
  }

  // Music/Entertainment
  if (/music|song|singer|concert|సంగీతం|పాట|album|concert|dance/i.test(topicLower)) {
    return { category: 'music', wikiTerms: ['Music of India', 'Indian music industry', 'Tollywood music'] };
  }

  // Real Estate/Property
  if (/property|real estate|house|apartment|land|ఇల్లు|భూమి|flat|construction/i.test(topicLower)) {
    return { category: 'realestate', wikiTerms: ['Real estate in India', 'Housing in India', 'Construction'] };
  }

  // Default: Entertainment/General
  return { category: 'entertainment', wikiTerms: ['Entertainment', 'Indian entertainment', 'Hyderabad'] };
}

/**
 * Detect category from topic for better image search (backward compatible)
 */
function detectCategory(topic: string): string {
  return detectCategoryWithWikiTerm(topic).category;
}

/**
 * Generate Telugu content structure
 */
export interface TeluguContent {
  title: string;
  titleTe: string;
  excerpt: string;
  bodyTe: string;
  tags: string[];
  entityType: 'actor' | 'actress' | 'director' | 'movie' | 'event';
  wikiTitle: string;
}

/**
 * Telugu content paragraph templates
 */
const PARAGRAPH_TEMPLATES = {
  fanExcitement: (actorTe: string, movie: string) =>
    `తెలుగు సినీ ప్రేక్షకులు ఎంతో ఆత్రంగా ఎదురుచూస్తున్న క్షణం వచ్చేసింది! ${actorTe} మరోసారి తన అభిమానులను థ్రిల్ చేయడానికి సిద్ధమవుతున్నారు. '${movie}' సినిమా భారతీయ సినిమా చరిత్రలో కొత్త రికార్డులు నెలకొల్పబోతోంది.`,

  movieDetails: (director: string, details: string) =>
    `${director} దర్శకత్వంలో వస్తున్న ఈ సినిమా ${details}. భారీ బడ్జెట్‌తో, వరల్డ్-క్లాస్ టెక్నికల్ టీమ్‌తో ఈ సినిమా తయారవుతోంది.`,

  actorLegacy: (actorTe: string, recentHits: string) =>
    `${actorTe} ఇటీవల ${recentHits} లాంటి హిట్లు అందించారు. ఆయన స్టార్ పవర్ ఇప్పటికీ ఎంత బలంగా ఉందో నిరూపిస్తున్నారు. డాన్స్, స్టైల్ మరియు యాక్టింగ్ స్కిల్స్ అన్నీ అసమానం.`,

  expectations: (movie: string) =>
    `'${movie}' బాక్సాఫీస్ వద్ద భారీ వసూళ్లు రాబడుతుందని అంచనా. అభిమానులు ఇప్పటి నుండే థియేటర్లలో సెలబ్రేషన్స్ కోసం ప్లాన్ చేస్తున్నారు. ఫస్ట్ డే ఫస్ట్ షో టిక్కెట్ల కోసం పోటీ ఉంటుందని ఖాయం.`,

  success: (actorTe: string, movie: string, collection: string) =>
    `${actorTe} '${movie}' సినిమా బాక్సాఫీస్ వద్ద సంచలనం సృష్టించింది. ${collection} వసూళ్లు రాబట్టింది. అన్ని రికార్డులు బద్దలు కొట్టింది.`,
};

export { PARAGRAPH_TEMPLATES };
