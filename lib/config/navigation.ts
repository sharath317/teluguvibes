/**
 * Navigation Configuration
 * Defines site navigation structure, categories, and menu sections
 */

export interface NavItem {
  id: string;
  href: string;
  label: string;
  labelTe?: string;
  emoji?: string;
  icon?: string;
  description?: string;
  descriptionTe?: string;
  isHot?: boolean;
  isNew?: boolean;
}

export interface MenuSection {
  id: string;
  title: string;
  titleTe?: string;
  emoji?: string;
  items: NavItem[];
}

export interface CategoryMeta {
  id: string;
  href: string;
  label: string;
  labelTe: string;
  description: string;
  descriptionTe: string;
  color: string;
  bgColor?: string;
  icon?: string;
  gradient?: string;
  glowColor?: string;
  // Alternative structure used by some code
  name?: {
    en: string;
    te: string;
  };
}

// Category metadata for main sections
export const CATEGORY_META: Record<string, CategoryMeta> = {
  news: {
    id: 'news',
    href: '/category/news',
    label: 'News',
    labelTe: 'వార్తలు',
    description: 'Latest Telugu cinema news',
    descriptionTe: 'తాజా తెలుగు సినిమా వార్తలు',
    color: '#eab308',
  },
  movies: {
    id: 'movies',
    href: '/reviews',
    label: 'Movies',
    labelTe: 'సినిమాలు',
    description: 'Movie reviews and ratings',
    descriptionTe: 'సినిమా సమీక్షలు మరియు రేటింగ్‌లు',
    color: '#ef4444',
  },
  gossip: {
    id: 'gossip',
    href: '/category/gossip',
    label: 'Gossip',
    labelTe: 'గాసిప్',
    description: 'Celebrity gossip and rumors',
    descriptionTe: 'సెలబ్రిటీ గాసిప్ మరియు వదంతులు',
    color: '#ec4899',
  },
  photos: {
    id: 'photos',
    href: '/photos',
    label: 'Photos',
    labelTe: 'ఫోటోలు',
    description: 'Photo galleries',
    descriptionTe: 'ఫోటో గ్యాలరీలు',
    color: '#8b5cf6',
  },
  videos: {
    id: 'videos',
    href: '/videos',
    label: 'Videos',
    labelTe: 'వీడియోలు',
    description: 'Video content',
    descriptionTe: 'వీడియో కంటెంట్',
    color: '#06b6d4',
  },
  hot: {
    id: 'hot',
    href: '/hot',
    label: 'Hot',
    labelTe: 'హాట్',
    description: 'Trending hot content',
    descriptionTe: 'ట్రెండింగ్ హాట్ కంటెంట్',
    color: '#f97316',
  },
  editorial: {
    id: 'editorial',
    href: '/editorial',
    label: 'Editorial',
    labelTe: 'ఎడిటోరియల్',
    description: 'In-depth articles and analysis',
    descriptionTe: 'లోతైన వ్యాసాలు మరియు విశ్లేషణ',
    color: '#22c55e',
  },
  stories: {
    id: 'stories',
    href: '/category/stories',
    label: 'Stories',
    labelTe: 'కథలు',
    description: 'Feature stories',
    descriptionTe: 'ఫీచర్ కథలు',
    color: '#3b82f6',
  },
  quizzes: {
    id: 'quizzes',
    href: '/quizzes',
    label: 'Quizzes',
    labelTe: 'క్విజ్‌లు',
    description: 'Fun movie quizzes',
    descriptionTe: 'సరదా సినిమా క్విజ్‌లు',
    color: '#a855f7',
  },
  memes: {
    id: 'memes',
    href: '/memes',
    label: 'Memes',
    labelTe: 'మీమ్స్',
    description: 'Telugu movie memes',
    descriptionTe: 'తెలుగు సినిమా మీమ్స్',
    color: '#f59e0b',
  },
  'web-series': {
    id: 'web-series',
    href: '/web-series',
    label: 'Web Series',
    labelTe: 'వెబ్ సిరీస్',
    description: 'OTT web series',
    descriptionTe: 'OTT వెబ్ సిరీస్',
    color: '#14b8a6',
  },
  jobs: {
    id: 'jobs',
    href: '/jobs',
    label: 'Jobs',
    labelTe: 'ఉద్యోగాలు',
    description: 'Industry job listings',
    descriptionTe: 'పరిశ్రమ ఉద్యోగ జాబితాలు',
    color: '#64748b',
  },
  astrology: {
    id: 'astrology',
    href: '/astrology',
    label: 'Astrology',
    labelTe: 'జ్యోతిషం',
    description: 'Daily horoscopes',
    descriptionTe: 'రోజువారీ జాతకాలు',
    color: '#6366f1',
  },
};

// More menu sections (collapsible groups)
export const MORE_MENU_SECTIONS: MenuSection[] = [
  {
    id: 'entertainment',
    title: 'Entertainment',
    titleTe: 'వినోదం',
    emoji: '🎬',
    items: [
      { id: 'stories', href: '/category/stories', label: 'Stories', labelTe: 'కథలు' },
      { id: 'quizzes', href: '/quizzes', label: 'Quizzes', labelTe: 'క్విజ్‌లు' },
      { id: 'memes', href: '/memes', label: 'Memes', labelTe: 'మీమ్స్' },
      { id: 'web-series', href: '/web-series', label: 'Web Series', labelTe: 'వెబ్ సిరీస్' },
      { id: 'trailers', href: '/trailers', label: 'Trailers', labelTe: 'ట్రైలర్లు' },
      { id: 'audio-songs', href: '/audio', label: 'Audio Songs', labelTe: 'ఆడియో పాటలు' },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    titleTe: 'జీవనశైలి',
    emoji: '✨',
    items: [
      { id: 'astrology', href: '/astrology', label: 'Astrology', labelTe: 'జ్యోతిషం' },
      { id: 'horoscope', href: '/horoscope', label: 'Daily Horoscope', labelTe: 'రోజువారీ రాశిఫలాలు' },
      { id: 'health', href: '/health', label: 'Health Tips', labelTe: 'ఆరోగ్య చిట్కాలు' },
      { id: 'recipes', href: '/recipes', label: 'Recipes', labelTe: 'వంటకాలు' },
    ],
  },
  {
    id: 'news',
    title: 'News & Updates',
    titleTe: 'వార్తలు',
    emoji: '📰',
    items: [
      { id: 'breaking', href: '/breaking', label: 'Breaking News', labelTe: 'బ్రేకింగ్ న్యూస్' },
      { id: 'crime', href: '/category/crime', label: 'Crime', labelTe: 'క్రైమ్' },
      { id: 'viral', href: '/viral', label: 'Viral News', labelTe: 'వైరల్' },
      { id: 'tech', href: '/tech', label: 'Technology', labelTe: 'టెక్నాలజీ' },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    titleTe: 'సేవలు',
    emoji: '💼',
    items: [
      { id: 'jobs', href: '/jobs', label: 'Jobs', labelTe: 'ఉద్యోగాలు' },
      { id: 'education', href: '/education', label: 'Education', labelTe: 'విద్య' },
      { id: 'govt-schemes', href: '/govt-schemes', label: 'Govt Schemes', labelTe: 'ప్రభుత్వ పథకాలు' },
    ],
  },
];

// Category bar items for horizontal navigation
export const CATEGORY_BAR: NavItem[] = [
  { id: 'movies', href: '/reviews', label: 'Movies', labelTe: 'సినిమాలు', emoji: '🎬' },
  { id: 'gossip', href: '/category/gossip', label: 'Gossip', labelTe: 'గాసిప్', emoji: '🌶️' },
  { id: 'entertainment', href: '/category/entertainment', label: 'Entertainment', labelTe: 'వినోదం', emoji: '🎭' },
  { id: 'sports', href: '/category/sports', label: 'Sports', labelTe: 'స్పోర్ట్స్', emoji: '🏆' },
  { id: 'politics', href: '/category/politics', label: 'Politics', labelTe: 'రాజకీయాలు', emoji: '🗳️' },
  { id: 'hot', href: '/hot', label: 'Hot', labelTe: 'హాట్', emoji: '🔥' },
  { id: 'videos', href: '/videos', label: 'Videos', labelTe: 'వీడియోలు', emoji: '📹' },
  { id: 'photos', href: '/photos', label: 'Photos', labelTe: 'ఫోటోలు', emoji: '📸' },
];

// More menu items (flat list for dropdown)
export const MORE_MENU: NavItem[] = [
  { id: 'astrology', href: '/astrology', label: 'Astrology', labelTe: 'జ్యోతిషం', emoji: '🔮' },
  { id: 'stories', href: '/category/stories', label: 'Stories', labelTe: 'కథలు', emoji: '📖' },
  { id: 'quizzes', href: '/quizzes', label: 'Quizzes', labelTe: 'క్విజ్‌లు', emoji: '❓' },
  { id: 'memes', href: '/memes', label: 'Memes', labelTe: 'మీమ్స్', emoji: '😂' },
  { id: 'web-series', href: '/web-series', label: 'Web Series', labelTe: 'వెబ్ సిరీస్', emoji: '📺' },
  { id: 'jobs', href: '/jobs', label: 'Jobs', labelTe: 'ఉద్యోగాలు', emoji: '💼' },
];

// Extended category colors for categories not explicitly defined
const EXTENDED_CATEGORY_COLORS: Record<string, { color: string; glowColor: string }> = {
  entertainment: { color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.3)' },
  sports: { color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)' },
  politics: { color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.3)' },
  trending: { color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.3)' },
  crime: { color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)' },
  viral: { color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.3)' },
  breaking: { color: '#dc2626', glowColor: 'rgba(220, 38, 38, 0.3)' },
};

// Default category metadata
const DEFAULT_CATEGORY_META: CategoryMeta = {
  id: 'default',
  href: '/',
  label: 'General',
  labelTe: 'జనరల్',
  description: 'General content',
  descriptionTe: 'సాధారణ కంటెంట్',
  color: '#6366f1',
  glowColor: 'rgba(99, 102, 241, 0.3)',
};

/**
 * Get category metadata by ID (always returns valid metadata)
 */
export function getCategoryMeta(categoryId: string): CategoryMeta {
  const baseMeta = CATEGORY_META[categoryId];
  
  if (baseMeta) {
    // Add glowColor and bgColor if not present
    const extendedColors = EXTENDED_CATEGORY_COLORS[categoryId];
    return {
      ...baseMeta,
      glowColor: extendedColors?.glowColor || `${baseMeta.color}4D`, // 30% opacity
      bgColor: baseMeta.bgColor || `${baseMeta.color}1A`, // 10% opacity for background
    };
  }
  
  // Check extended colors for categories not in CATEGORY_META
  const extendedColors = EXTENDED_CATEGORY_COLORS[categoryId];
  if (extendedColors) {
    return {
      ...DEFAULT_CATEGORY_META,
      id: categoryId,
      href: `/category/${categoryId}`,
      label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      labelTe: categoryId,
      color: extendedColors.color,
      glowColor: extendedColors.glowColor,
      bgColor: `${extendedColors.color}1A`, // 10% opacity for background
    };
  }
  
  // Final fallback
  return {
    ...DEFAULT_CATEGORY_META,
    id: categoryId || 'default',
    href: categoryId ? `/category/${categoryId}` : '/',
    bgColor: `${DEFAULT_CATEGORY_META.color}1A`, // 10% opacity for background
  };
}

/**
 * Get localized label for a nav item
 */
export function getLocalizedLabel(item: NavItem, lang: 'en' | 'te' = 'en'): string {
  return lang === 'te' && item.labelTe ? item.labelTe : item.label;
}

/**
 * Get localized section title
 */
export function getLocalizedSectionTitle(section: MenuSection, lang: 'en' | 'te' = 'en'): string {
  return lang === 'te' && section.titleTe ? section.titleTe : section.title;
}

/**
 * Get all main navigation items
 */
export function getMainNavItems(): NavItem[] {
  return [
    { id: 'news', href: '/category/news', label: 'News', labelTe: 'వార్తలు' },
    { id: 'movies', href: '/reviews', label: 'Movies', labelTe: 'సినిమాలు' },
    { id: 'gossip', href: '/category/gossip', label: 'Gossip', labelTe: 'గాసిప్' },
    { id: 'photos', href: '/photos', label: 'Photos', labelTe: 'ఫోటోలు' },
    { id: 'videos', href: '/videos', label: 'Videos', labelTe: 'వీడియోలు' },
    { id: 'hot', href: '/hot', label: 'Hot', labelTe: 'హాట్' },
  ];
}

