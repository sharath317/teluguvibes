/**
 * SEED DATA FOR TELUGU PORTAL
 * 
 * Provides realistic Telugu entertainment data for:
 * - Testing templates
 * - Populating database
 * - Image fetching
 * - Content comparison
 */

// ============================================================
// CELEBRITY DATABASE
// ============================================================

export interface Celebrity {
  id: string;
  name: string;
  nameTe: string;
  alias?: string;
  aliasTe?: string;
  type: 'actor' | 'actress' | 'director' | 'music_director' | 'producer';
  category: 'top_star' | 'star' | 'rising' | 'legend';
  wikiTitle: string;
  tmdbId?: number;
  socialHandles?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  recentWork: string[];
  upcomingWork: string[];
  imageSearchTerms: string[];
  birthDate?: string;
  birthPlace?: string;
  debutMovie?: string;
  specialities: string[];
}

export const CELEBRITIES: Celebrity[] = [
  // TOP STARS
  {
    id: 'allu-arjun',
    name: 'Allu Arjun',
    nameTe: 'అల్లు అర్జున్',
    alias: 'Stylish Star',
    aliasTe: 'స్టైలిష్ స్టార్',
    type: 'actor',
    category: 'top_star',
    wikiTitle: 'Allu_Arjun',
    tmdbId: 93320,
    socialHandles: {
      instagram: 'alaboratory',
      twitter: 'alaboratory',
    },
    recentWork: ['Pushpa: The Rise', 'Ala Vaikunthapurramuloo'],
    upcomingWork: ['Pushpa 2: The Rule', 'Icon'],
    imageSearchTerms: ['Allu Arjun', 'Pushpa actor', 'Stylish Star Telugu'],
    birthDate: '1983-04-08',
    birthPlace: 'Chennai',
    debutMovie: 'Gangotri',
    specialities: ['dance', 'style', 'mass_appeal'],
  },
  {
    id: 'prabhas',
    name: 'Prabhas',
    nameTe: 'ప్రభాస్',
    alias: 'Rebel Star',
    aliasTe: 'రెబెల్ స్టార్',
    type: 'actor',
    category: 'top_star',
    wikiTitle: 'Prabhas',
    tmdbId: 136532,
    socialHandles: {
      instagram: 'actorprabhas',
    },
    recentWork: ['Salaar', 'Adipurush', 'Radhe Shyam'],
    upcomingWork: ['Raja Saab', 'Spirit', 'Salaar 2'],
    imageSearchTerms: ['Prabhas', 'Baahubali actor', 'Rebel Star Telugu'],
    birthDate: '1979-10-23',
    birthPlace: 'Chennai',
    debutMovie: 'Eeswar',
    specialities: ['pan_india', 'mass_hero', 'romantic'],
  },
  {
    id: 'ram-charan',
    name: 'Ram Charan',
    nameTe: 'రామ్ చరణ్',
    alias: 'Mega Power Star',
    aliasTe: 'మెగా పవర్ స్టార్',
    type: 'actor',
    category: 'top_star',
    wikiTitle: 'Ram_Charan',
    tmdbId: 127853,
    socialHandles: {
      instagram: 'alaboratory',
      twitter: 'AlwaysRamCharan',
    },
    recentWork: ['RRR', 'Acharya'],
    upcomingWork: ['Game Changer', 'RC16'],
    imageSearchTerms: ['Ram Charan', 'RRR actor', 'Mega Power Star'],
    birthDate: '1985-03-27',
    birthPlace: 'Chennai',
    debutMovie: 'Chirutha',
    specialities: ['dance', 'action', 'mass_appeal'],
  },
  {
    id: 'jr-ntr',
    name: 'Jr NTR',
    nameTe: 'జూనియర్ ఎన్టీఆర్',
    alias: 'Young Tiger',
    aliasTe: 'యంగ్ టైగర్',
    type: 'actor',
    category: 'top_star',
    wikiTitle: 'N._T._Rama_Rao_Jr.',
    tmdbId: 240563,
    socialHandles: {
      instagram: 'jaboratory',
      twitter: 'taboratory',
    },
    recentWork: ['RRR', 'Devara Part 1'],
    upcomingWork: ['War 2', 'NTR31'],
    imageSearchTerms: ['Jr NTR', 'NTR actor', 'Young Tiger Telugu'],
    birthDate: '1983-05-20',
    birthPlace: 'Hyderabad',
    debutMovie: 'Ninnu Choodalani',
    specialities: ['mass_dialogues', 'dance', 'emotion'],
  },
  {
    id: 'mahesh-babu',
    name: 'Mahesh Babu',
    nameTe: 'మహేష్ బాబు',
    alias: 'Super Star',
    aliasTe: 'సూపర్ స్టార్',
    type: 'actor',
    category: 'top_star',
    wikiTitle: 'Mahesh_Babu',
    tmdbId: 87013,
    socialHandles: {
      instagram: 'uraboratory',
      twitter: 'uraboratory',
    },
    recentWork: ['Guntur Kaaram', 'Sarkaru Vaari Paata'],
    upcomingWork: ['SSMB29', 'SSMB30'],
    imageSearchTerms: ['Mahesh Babu', 'Super Star Telugu', 'Prince Mahesh'],
    birthDate: '1975-08-09',
    birthPlace: 'Chennai',
    debutMovie: 'Rajakumarudu',
    specialities: ['style', 'dialogue_delivery', 'romance'],
  },
  
  // TOP ACTRESSES
  {
    id: 'samantha',
    name: 'Samantha Ruth Prabhu',
    nameTe: 'సమంత',
    type: 'actress',
    category: 'top_star',
    wikiTitle: 'Samantha_Ruth_Prabhu',
    tmdbId: 1182007,
    socialHandles: {
      instagram: 'samaboratory',
    },
    recentWork: ['Kushi', 'Shaakuntalam', 'Yashoda'],
    upcomingWork: ['Citadel India'],
    imageSearchTerms: ['Samantha Ruth Prabhu', 'Samantha actress'],
    birthDate: '1987-04-28',
    birthPlace: 'Chennai',
    debutMovie: 'Ye Maaya Chesave',
    specialities: ['acting', 'dance', 'glamour'],
  },
  {
    id: 'rashmika',
    name: 'Rashmika Mandanna',
    nameTe: 'రష్మిక మందన్న',
    alias: 'National Crush',
    aliasTe: 'నేషనల్ క్రష్',
    type: 'actress',
    category: 'top_star',
    wikiTitle: 'Rashmika_Mandanna',
    tmdbId: 1631221,
    socialHandles: {
      instagram: 'rashmaboratory',
    },
    recentWork: ['Animal', 'Pushpa', 'Varisu'],
    upcomingWork: ['Pushpa 2', 'The Girlfriend'],
    imageSearchTerms: ['Rashmika Mandanna', 'National Crush India'],
    birthDate: '1996-04-05',
    birthPlace: 'Virajpet',
    debutMovie: 'Kirik Party',
    specialities: ['expressions', 'dance', 'cute_looks'],
  },
  {
    id: 'pooja-hegde',
    name: 'Pooja Hegde',
    nameTe: 'పూజా హెగ్డే',
    type: 'actress',
    category: 'star',
    wikiTitle: 'Pooja_Hegde',
    tmdbId: 1314315,
    socialHandles: {
      instagram: 'poojaboratory',
    },
    recentWork: ['Kisi Ka Bhai Kisi Ki Jaan', 'Radhe Shyam'],
    upcomingWork: ['Deva'],
    imageSearchTerms: ['Pooja Hegde', 'Pooja Hegde actress'],
    birthDate: '1990-10-13',
    birthPlace: 'Mumbai',
    debutMovie: 'Mugamoodi',
    specialities: ['glamour', 'dance', 'expressions'],
  },
  {
    id: 'sai-pallavi',
    name: 'Sai Pallavi',
    nameTe: 'సాయి పల్లవి',
    type: 'actress',
    category: 'star',
    wikiTitle: 'Sai_Pallavi',
    tmdbId: 1446247,
    recentWork: ['Virupaksha', 'Gargi', 'Shyam Singha Roy'],
    upcomingWork: ['Thandel'],
    imageSearchTerms: ['Sai Pallavi', 'Sai Pallavi actress'],
    birthDate: '1992-05-09',
    birthPlace: 'Kotagiri',
    debutMovie: 'Premam',
    specialities: ['natural_acting', 'folk_dance', 'simplicity'],
  },
  {
    id: 'keerthy-suresh',
    name: 'Keerthy Suresh',
    nameTe: 'కీర్తి సురేష్',
    type: 'actress',
    category: 'star',
    wikiTitle: 'Keerthy_Suresh',
    tmdbId: 1369761,
    recentWork: ['Dasara', 'Siren'],
    upcomingWork: ['Baby John'],
    imageSearchTerms: ['Keerthy Suresh', 'Keerthy Suresh actress'],
    birthDate: '1992-10-17',
    birthPlace: 'Chennai',
    debutMovie: 'Geethaanjali',
    specialities: ['acting', 'national_award', 'expressions'],
  },
  
  // DIRECTORS
  {
    id: 'rajamouli',
    name: 'SS Rajamouli',
    nameTe: 'ఎస్.ఎస్. రాజమౌళి',
    type: 'director',
    category: 'top_star',
    wikiTitle: 'S._S._Rajamouli',
    recentWork: ['RRR', 'Baahubali 2'],
    upcomingWork: ['SSMB29'],
    imageSearchTerms: ['SS Rajamouli', 'Rajamouli director'],
    birthDate: '1973-10-10',
    birthPlace: 'Raichur',
    debutMovie: 'Student No. 1',
    specialities: ['visual_grandeur', 'epic_storytelling', 'vfx'],
  },
  {
    id: 'sukumar',
    name: 'Sukumar',
    nameTe: 'సుకుమార్',
    type: 'director',
    category: 'star',
    wikiTitle: 'Sukumar_(director)',
    recentWork: ['Pushpa: The Rise', 'Rangasthalam'],
    upcomingWork: ['Pushpa 2: The Rule'],
    imageSearchTerms: ['Sukumar director', 'Pushpa director'],
    birthDate: '1970-01-11',
    birthPlace: 'Rajamahendravaram',
    debutMovie: 'Arya',
    specialities: ['realistic_storytelling', 'rural_backdrop', 'mass_elements'],
  },
  {
    id: 'trivikram',
    name: 'Trivikram Srinivas',
    nameTe: 'త్రివిక్రమ్ శ్రీనివాస్',
    alias: 'Guruji',
    aliasTe: 'గురూజీ',
    type: 'director',
    category: 'star',
    wikiTitle: 'Trivikram_Srinivas',
    recentWork: ['Guntur Kaaram', 'Ala Vaikunthapurramuloo'],
    upcomingWork: [],
    imageSearchTerms: ['Trivikram Srinivas', 'Trivikram director'],
    birthDate: '1971-11-07',
    birthPlace: 'Bhimavaram',
    debutMovie: 'Nuvve Nuvve',
    specialities: ['dialogues', 'family_drama', 'comedy'],
  },
];

// ============================================================
// MOVIE DATABASE
// ============================================================

export interface Movie {
  id: string;
  name: string;
  nameTe: string;
  year: number;
  status: 'released' | 'upcoming' | 'shooting' | 'announced';
  heroId: string;
  hero: string;
  heroTe: string;
  heroineId?: string;
  heroine?: string;
  heroineTe?: string;
  directorId: string;
  director: string;
  directorTe: string;
  musicDirector?: string;
  producer?: string;
  productionHouse?: string;
  genres: string[];
  boxOffice?: string;
  rating?: number;
  imageSearchTerms: string[];
}

export const MOVIES: Movie[] = [
  {
    id: 'pushpa-2',
    name: 'Pushpa 2: The Rule',
    nameTe: 'పుష్ప 2: ది రూల్',
    year: 2024,
    status: 'released',
    heroId: 'allu-arjun',
    hero: 'Allu Arjun',
    heroTe: 'అల్లు అర్జున్',
    heroineId: 'rashmika',
    heroine: 'Rashmika Mandanna',
    heroineTe: 'రష్మిక మందన్న',
    directorId: 'sukumar',
    director: 'Sukumar',
    directorTe: 'సుకుమార్',
    musicDirector: 'Devi Sri Prasad',
    producer: 'Mythri Movie Makers',
    productionHouse: 'Mythri Movie Makers',
    genres: ['action', 'drama', 'crime'],
    boxOffice: '1800+ Cr',
    rating: 8.2,
    imageSearchTerms: ['Pushpa 2', 'Pushpa The Rule', 'Allu Arjun Pushpa'],
  },
  {
    id: 'game-changer',
    name: 'Game Changer',
    nameTe: 'గేమ్ చేంజర్',
    year: 2025,
    status: 'released',
    heroId: 'ram-charan',
    hero: 'Ram Charan',
    heroTe: 'రామ్ చరణ్',
    heroineId: 'kiara-advani',
    heroine: 'Kiara Advani',
    heroineTe: 'కియారా అద్వానీ',
    directorId: 'shankar',
    director: 'Shankar',
    directorTe: 'శంకర్',
    musicDirector: 'Thaman',
    productionHouse: 'Sri Venkateswara Creations',
    genres: ['political', 'action', 'thriller'],
    imageSearchTerms: ['Game Changer', 'Ram Charan Game Changer'],
  },
  {
    id: 'devara',
    name: 'Devara Part 1',
    nameTe: 'దేవర పార్ట్ 1',
    year: 2024,
    status: 'released',
    heroId: 'jr-ntr',
    hero: 'Jr NTR',
    heroTe: 'జూనియర్ ఎన్టీఆర్',
    heroineId: 'janhvi-kapoor',
    heroine: 'Janhvi Kapoor',
    heroineTe: 'జాన్వీ కపూర్',
    directorId: 'koratala-siva',
    director: 'Koratala Siva',
    directorTe: 'కొరటాల శివ',
    musicDirector: 'Anirudh',
    productionHouse: 'NTR Arts',
    genres: ['action', 'drama'],
    boxOffice: '500+ Cr',
    rating: 7.5,
    imageSearchTerms: ['Devara', 'NTR Devara', 'Devara Part 1'],
  },
  {
    id: 'raja-saab',
    name: 'Raja Saab',
    nameTe: 'రాజా సాబ్',
    year: 2025,
    status: 'upcoming',
    heroId: 'prabhas',
    hero: 'Prabhas',
    heroTe: 'ప్రభాస్',
    directorId: 'maruthi',
    director: 'Maruthi',
    directorTe: 'మారుతి',
    musicDirector: 'Thaman',
    productionHouse: 'People Media Factory',
    genres: ['horror', 'comedy', 'romance'],
    imageSearchTerms: ['Raja Saab', 'Prabhas Raja Saab'],
  },
  {
    id: 'ssmb29',
    name: 'SSMB29',
    nameTe: 'ఎస్ఎస్ఎంబి29',
    year: 2026,
    status: 'shooting',
    heroId: 'mahesh-babu',
    hero: 'Mahesh Babu',
    heroTe: 'మహేష్ బాబు',
    directorId: 'rajamouli',
    director: 'SS Rajamouli',
    directorTe: 'ఎస్.ఎస్. రాజమౌళి',
    productionHouse: 'KVN Productions',
    genres: ['adventure', 'action'],
    imageSearchTerms: ['SSMB29', 'Mahesh Babu Rajamouli'],
  },
  {
    id: 'kushi',
    name: 'Kushi',
    nameTe: 'కుషి',
    year: 2023,
    status: 'released',
    heroId: 'vijay-deverakonda',
    hero: 'Vijay Deverakonda',
    heroTe: 'విజయ్ దేవరకొండ',
    heroineId: 'samantha',
    heroine: 'Samantha',
    heroineTe: 'సమంత',
    directorId: 'shiva-nirvana',
    director: 'Shiva Nirvana',
    directorTe: 'శివ నిర్వాణ',
    musicDirector: 'Hesham Abdul Wahab',
    genres: ['romance', 'comedy', 'drama'],
    boxOffice: '150+ Cr',
    rating: 7.0,
    imageSearchTerms: ['Kushi movie', 'Vijay Samantha Kushi'],
  },
];

// ============================================================
// EVENT TEMPLATES
// ============================================================

export interface EventTemplate {
  type: string;
  typeTe: string;
  category: 'movie' | 'personal' | 'award' | 'social' | 'viral';
  templates: {
    en: string;
    te: string;
  }[];
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'photoshoot',
    typeTe: 'ఫోటోషూట్',
    category: 'viral',
    templates: [
      { en: 'latest photoshoot goes viral', te: 'లేటెస్ట్ ఫోటోషూట్ వైరల్' },
      { en: 'new look revealed', te: 'కొత్త లుక్ వెల్లడి' },
      { en: 'stunning photos released', te: 'అద్భుతమైన ఫోటోలు విడుదల' },
      { en: 'magazine cover shoot', te: 'మ్యాగజైన్ కవర్ షూట్' },
    ],
  },
  {
    type: 'movie_update',
    typeTe: 'మూవీ అప్‌డేట్',
    category: 'movie',
    templates: [
      { en: 'shooting update revealed', te: 'షూటింగ్ అప్‌డేట్ వెల్లడి' },
      { en: 'first look released', te: 'ఫస్ట్ లుక్ విడుదల' },
      { en: 'teaser announcement', te: 'టీజర్ ప్రకటన' },
      { en: 'trailer drops', te: 'ట్రైలర్ విడుదల' },
      { en: 'release date announced', te: 'విడుదల తేదీ ప్రకటన' },
    ],
  },
  {
    type: 'box_office',
    typeTe: 'బాక్సాఫీస్',
    category: 'movie',
    templates: [
      { en: 'breaks all records', te: 'అన్ని రికార్డులు బద్దలు' },
      { en: 'crosses 500 crores', te: '500 కోట్లు దాటింది' },
      { en: 'creates box office history', te: 'బాక్సాఫీస్ చరిత్ర సృష్టించింది' },
      { en: 'highest grosser', te: 'అత్యధిక వసూళ్లు సాధించింది' },
    ],
  },
  {
    type: 'award',
    typeTe: 'అవార్డ్',
    category: 'award',
    templates: [
      { en: 'wins best actor award', te: 'బెస్ట్ యాక్టర్ అవార్డ్ గెలుచుకున్నారు' },
      { en: 'receives national award', te: 'జాతీయ అవార్డ్ అందుకున్నారు' },
      { en: 'honored at film festival', te: 'ఫిల్మ్ ఫెస్టివల్‌లో సన్మానం' },
      { en: 'lifetime achievement award', te: 'జీవిత సాఫల్య పురస్కారం' },
    ],
  },
  {
    type: 'birthday',
    typeTe: 'పుట్టినరోజు',
    category: 'personal',
    templates: [
      { en: 'celebrates birthday in style', te: 'పుట్టినరోజు స్టైల్‌గా సెలబ్రేట్' },
      { en: 'fans celebrate birthday', te: 'ఫ్యాన్స్ పుట్టినరోజు వేడుకలు' },
      { en: 'birthday wishes pour in', te: 'పుట్టినరోజు శుభాకాంక్షలు' },
    ],
  },
  {
    type: 'social_media',
    typeTe: 'సోషల్ మీడియా',
    category: 'social',
    templates: [
      { en: 'post goes viral', te: 'పోస్ట్ వైరల్' },
      { en: 'breaks internet', te: 'ఇంటర్నెట్ షేక్' },
      { en: 'fans react', te: 'ఫ్యాన్స్ రియాక్షన్' },
      { en: 'trending on social media', te: 'సోషల్ మీడియాలో ట్రెండింగ్' },
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get celebrity by ID
 */
export function getCelebrityById(id: string): Celebrity | undefined {
  return CELEBRITIES.find(c => c.id === id);
}

/**
 * Get celebrity by name
 */
export function getCelebrityByName(name: string): Celebrity | undefined {
  const nameLower = name.toLowerCase();
  return CELEBRITIES.find(c => 
    c.name.toLowerCase().includes(nameLower) ||
    c.nameTe.includes(name)
  );
}

/**
 * Get movie by ID
 */
export function getMovieById(id: string): Movie | undefined {
  return MOVIES.find(m => m.id === id);
}

/**
 * Get movies by celebrity
 */
export function getMoviesByCelebrity(celebrityId: string): Movie[] {
  return MOVIES.filter(m => 
    m.heroId === celebrityId || 
    m.heroineId === celebrityId ||
    m.directorId === celebrityId
  );
}

/**
 * Get random event template
 */
export function getRandomEventTemplate(type?: string): EventTemplate {
  if (type) {
    return EVENT_TEMPLATES.find(e => e.type === type) || EVENT_TEMPLATES[0];
  }
  return EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
}

/**
 * Generate random content scenario
 */
export function generateRandomScenario(): {
  celebrity: Celebrity;
  movie: Movie | undefined;
  event: EventTemplate;
} {
  const celebrity = CELEBRITIES[Math.floor(Math.random() * CELEBRITIES.length)];
  const movies = getMoviesByCelebrity(celebrity.id);
  const movie = movies.length > 0 ? movies[Math.floor(Math.random() * movies.length)] : undefined;
  const event = getRandomEventTemplate();
  
  return { celebrity, movie, event };
}

/**
 * Get all image search terms for a scenario
 */
export function getImageSearchTerms(celebrity: Celebrity, movie?: Movie): string[] {
  const terms: string[] = [...celebrity.imageSearchTerms];
  
  if (movie) {
    terms.push(...movie.imageSearchTerms);
  }
  
  if (celebrity.alias) {
    terms.push(celebrity.alias);
  }
  
  return [...new Set(terms)];
}

export default {
  CELEBRITIES,
  MOVIES,
  EVENT_TEMPLATES,
  getCelebrityById,
  getCelebrityByName,
  getMovieById,
  getMoviesByCelebrity,
  getRandomEventTemplate,
  generateRandomScenario,
  getImageSearchTerms,
};






