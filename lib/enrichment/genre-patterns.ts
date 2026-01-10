/**
 * Genre Patterns Module
 * 
 * Contains pattern data for director and hero genre associations,
 * era defaults, and mood-to-genre mappings.
 * 
 * Used by safe-classification.ts for multi-signal consensus genre derivation.
 */

// ============================================================
// HERO/ACTOR GENRE ASSOCIATIONS
// ============================================================

/**
 * Maps actors/heroes to their typical genres based on career patterns.
 * Weight: 0.10 in consensus calculation
 * Total: 100+ entries for comprehensive coverage
 */
export const ACTOR_GENRE_MAP: Record<string, string[]> = {
  // ============================================================
  // LEGENDARY ERA (Pre-1980) - Golden Age Heroes
  // ============================================================
  'N.T. Rama Rao': ['Drama', 'Mythological', 'Action'],
  'NTR': ['Drama', 'Mythological', 'Action'],
  'Nandamuri Taraka Rama Rao': ['Drama', 'Mythological', 'Action'],
  'Akkineni Nageswara Rao': ['Drama', 'Romance', 'Family'],
  'ANR': ['Drama', 'Romance', 'Family'],
  'Sobhan Babu': ['Romance', 'Drama', 'Family'],
  'Krishna': ['Action', 'Cowboy', 'Drama'],
  'Superstar Krishna': ['Action', 'Cowboy', 'Drama'],
  'Ghattamaneni Krishna': ['Action', 'Cowboy', 'Drama'],
  'Krishnam Raju': ['Action', 'Drama', 'Historical'],
  'Rebel Star Krishnam Raju': ['Action', 'Drama', 'Historical'],
  'Nagabhushanam': ['Drama', 'Mythological', 'Historical'],
  'S. V. Ranga Rao': ['Drama', 'Mythological', 'Historical'],
  'Relangi': ['Comedy', 'Drama', 'Family'],
  'Padmanabham': ['Comedy', 'Drama', 'Family'],
  'Haranath': ['Drama', 'Romance', 'Action'],
  'Jamuna': ['Drama', 'Romance', 'Family'],
  'Savitri': ['Drama', 'Romance', 'Family'],
  'Mahanati Savitri': ['Drama', 'Romance', 'Family'],
  'Kanchana': ['Drama', 'Romance', 'Family'],
  'Sharada': ['Drama', 'Romance', 'Family'],
  'Vanisri': ['Drama', 'Romance', 'Family'],
  'Jayalalitha': ['Drama', 'Romance', 'Family'],
  'Jayasudha': ['Drama', 'Romance', 'Family'],
  'Sridevi': ['Drama', 'Romance', 'Fantasy'],
  'Jaya Prada': ['Drama', 'Romance', 'Family'],
  
  // ============================================================
  // SUPERSTAR ERA (1980s-2000s)
  // ============================================================
  'Chiranjeevi': ['Action', 'Drama', 'Comedy'],
  'Megastar Chiranjeevi': ['Action', 'Drama', 'Comedy'],
  'Konidela Chiranjeevi': ['Action', 'Drama', 'Comedy'],
  'Nagarjuna': ['Action', 'Romance', 'Drama'],
  'Akkineni Nagarjuna': ['Action', 'Romance', 'Drama'],
  'King Nagarjuna': ['Action', 'Romance', 'Drama'],
  'Venkatesh': ['Drama', 'Comedy', 'Family'],
  'Victory Venkatesh': ['Drama', 'Comedy', 'Family'],
  'Daggubati Venkatesh': ['Drama', 'Comedy', 'Family'],
  'Balakrishna': ['Action', 'Drama', 'Mythological'],
  'Nandamuri Balakrishna': ['Action', 'Drama', 'Mythological'],
  'NBK': ['Action', 'Drama', 'Mythological'],
  'Mohan Babu': ['Action', 'Drama', 'Comedy'],
  'Manchu Mohan Babu': ['Action', 'Drama', 'Comedy'],
  'Srikanth': ['Action', 'Drama', 'Romance'],
  'Jagapathi Babu': ['Drama', 'Action', 'Romance'],
  'Suman': ['Action', 'Drama', 'Romance'],
  'Rajasekhar': ['Action', 'Drama', 'Romance'],
  'Daggubati Raja': ['Action', 'Drama', 'Romance'],
  'Suresh': ['Drama', 'Action', 'Romance'],
  'Sai Kumar': ['Action', 'Drama', 'Crime'],
  'Uttej': ['Comedy', 'Drama', 'Action'],
  'Sivaji': ['Drama', 'Action', 'Comedy'],
  'Tanikella Bharani': ['Drama', 'Comedy', 'Family'],
  
  // ============================================================
  // CURRENT GENERATION (2000s-Present) - Star Heroes
  // ============================================================
  'Pawan Kalyan': ['Action', 'Drama', 'Mass'],
  'Power Star Pawan Kalyan': ['Action', 'Drama', 'Mass'],
  'Konidela Pawan Kalyan': ['Action', 'Drama', 'Mass'],
  'Mahesh Babu': ['Action', 'Romance', 'Commercial'],
  'Prince Mahesh Babu': ['Action', 'Romance', 'Commercial'],
  'Ghattamaneni Mahesh Babu': ['Action', 'Romance', 'Commercial'],
  'Prabhas': ['Action', 'Drama', 'Historical'],
  'Rebel Star Prabhas': ['Action', 'Drama', 'Historical'],
  'Allu Arjun': ['Action', 'Dance', 'Commercial'],
  'Stylish Star Allu Arjun': ['Action', 'Dance', 'Commercial'],
  'Bunny': ['Action', 'Dance', 'Commercial'],
  'Ram Charan': ['Action', 'Drama', 'Commercial'],
  'Mega Power Star Ram Charan': ['Action', 'Drama', 'Commercial'],
  'Jr. NTR': ['Action', 'Drama', 'Mass'],
  'Jr NTR': ['Action', 'Drama', 'Mass'],
  'Young Tiger NTR': ['Action', 'Drama', 'Mass'],
  'N. T. Rama Rao Jr.': ['Action', 'Drama', 'Mass'],
  'Ravi Teja': ['Action', 'Comedy', 'Mass'],
  'Mass Maharaja Ravi Teja': ['Action', 'Comedy', 'Mass'],
  
  // ============================================================
  // YOUNG HEROES (2010s-Present)
  // ============================================================
  'Nani': ['Drama', 'Romance', 'Comedy'],
  'Natural Star Nani': ['Drama', 'Romance', 'Comedy'],
  'Ghanta Naveen Babu': ['Drama', 'Romance', 'Comedy'],
  'Vijay Deverakonda': ['Drama', 'Romance', 'Action'],
  'Rowdy Vijay Deverakonda': ['Drama', 'Romance', 'Action'],
  'Sharwanand': ['Drama', 'Romance', 'Family'],
  'Naga Chaitanya': ['Romance', 'Drama', 'Comedy'],
  'Rana Daggubati': ['Action', 'Drama', 'Historical'],
  'Nithin': ['Romance', 'Comedy', 'Drama'],
  'Nithiin': ['Romance', 'Comedy', 'Drama'],
  'Ram Pothineni': ['Action', 'Romance', 'Commercial'],
  'Energetic Star Ram': ['Action', 'Romance', 'Commercial'],
  'Varun Tej': ['Action', 'Drama', 'Sports'],
  'Mega Prince Varun Tej': ['Action', 'Drama', 'Sports'],
  'Sai Dharam Tej': ['Action', 'Drama', 'Family'],
  'Bellamkonda Sai Sreenivas': ['Action', 'Romance', 'Commercial'],
  'Sundeep Kishan': ['Action', 'Drama', 'Thriller'],
  'Sushanth': ['Romance', 'Comedy', 'Drama'],
  'Sudheer Babu': ['Action', 'Sports', 'Drama'],
  'Akhil Akkineni': ['Romance', 'Action', 'Drama'],
  'Raj Tarun': ['Romance', 'Comedy', 'Drama'],
  'Naveen Polishetty': ['Comedy', 'Drama', 'Romance'],
  'Vishwak Sen': ['Drama', 'Comedy', 'Romance'],
  'Adivi Sesh': ['Thriller', 'Action', 'Drama'],
  'Teja Sajja': ['Fantasy', 'Action', 'Drama'],
  'Naga Shaurya': ['Romance', 'Drama', 'Sports'],
  'Sandeep Kishan': ['Action', 'Thriller', 'Drama'],
  'Nikhil Siddhartha': ['Horror', 'Thriller', 'Romance'],
  'Siddhu Jonnalagadda': ['Comedy', 'Action', 'Drama'],
  
  // ============================================================
  // HEROINES (Leading Ladies)
  // ============================================================
  'Samantha Ruth Prabhu': ['Romance', 'Drama', 'Action'],
  'Samantha': ['Romance', 'Drama', 'Action'],
  'Pooja Hegde': ['Romance', 'Commercial', 'Dance'],
  'Rashmika Mandanna': ['Romance', 'Comedy', 'Drama'],
  'Kajal Aggarwal': ['Romance', 'Commercial', 'Action'],
  'Tamanna Bhatia': ['Romance', 'Commercial', 'Dance'],
  'Tammannaah': ['Romance', 'Commercial', 'Dance'],
  'Anushka Shetty': ['Action', 'Drama', 'Historical'],
  'Shruti Haasan': ['Romance', 'Action', 'Drama'],
  'Keerthy Suresh': ['Drama', 'Romance', 'Biography'],
  'Rakul Preet Singh': ['Romance', 'Commercial', 'Drama'],
  'Nayanthara': ['Drama', 'Horror', 'Action'],
  'Trisha': ['Romance', 'Drama', 'Thriller'],
  'Trisha Krishnan': ['Romance', 'Drama', 'Thriller'],
  'Genelia': ['Romance', 'Comedy', 'Drama'],
  'Ileana D\'Cruz': ['Romance', 'Commercial', 'Drama'],
  'Sai Pallavi': ['Drama', 'Romance', 'Dance'],
  'Krithi Shetty': ['Romance', 'Drama', 'Family'],
  'Sreeleela': ['Dance', 'Romance', 'Commercial'],
  'Pooja Bhalekar': ['Action', 'Thriller', 'Drama'],
  
  // ============================================================
  // CHARACTER ACTORS & COMEDIANS
  // ============================================================
  'Rajendra Prasad': ['Comedy', 'Drama', 'Family'],
  'Sunil': ['Comedy', 'Drama', 'Action'],
  'Brahmanandam': ['Comedy', 'Family', 'Drama'],
  'M. S. Narayana': ['Comedy', 'Drama', 'Family'],
  'Ali': ['Comedy', 'Drama', 'Family'],
  'Vennela Kishore': ['Comedy', 'Romance', 'Drama'],
  'Priyadarshi': ['Comedy', 'Drama', 'Romance'],
  'Satya': ['Comedy', 'Action', 'Drama'],
  'Saptagiri': ['Comedy', 'Drama', 'Family'],
  'Posani Krishna Murali': ['Comedy', 'Drama', 'Action'],
  'Prakash Raj': ['Drama', 'Action', 'Villain'],
  'Nassar': ['Drama', 'Action', 'Historical'],
  'Murali Sharma': ['Drama', 'Action', 'Crime'],
  'Nasser': ['Drama', 'Historical', 'Action'],
};

// ============================================================
// DIRECTOR GENRE ASSOCIATIONS
// ============================================================

/**
 * Maps directors to their typical genres based on filmography.
 * Weight: 0.15 in consensus calculation
 * Total: 60+ entries for comprehensive coverage
 */
export const DIRECTOR_GENRE_MAP: Record<string, string[]> = {
  // ============================================================
  // LEGENDARY DIRECTORS (Pre-1990)
  // ============================================================
  'K. Raghavendra Rao': ['Drama', 'Romance', 'Family'],
  'K Raghavendra Rao': ['Drama', 'Romance', 'Family'],
  'Raghavendra Rao': ['Drama', 'Romance', 'Family'],
  'K. Vishwanath': ['Drama', 'Musical', 'Art'],
  'K Vishwanath': ['Drama', 'Musical', 'Art'],
  'Kasinathuni Viswanath': ['Drama', 'Musical', 'Art'],
  'Bapu': ['Drama', 'Mythological', 'Comedy'],
  'Sattiraju Lakshmi Narayana': ['Drama', 'Mythological', 'Comedy'],
  'Singeetam Srinivasa Rao': ['Fantasy', 'Comedy', 'Musical'],
  'Singeetam': ['Fantasy', 'Comedy', 'Musical'],
  'Dasari Narayana Rao': ['Drama', 'Social', 'Family'],
  'Dasari': ['Drama', 'Social', 'Family'],
  'B. Vittalacharya': ['Mythological', 'Fantasy', 'Drama'],
  'Vittalacharya': ['Mythological', 'Fantasy', 'Drama'],
  'K.S. Sethumadhavan': ['Drama', 'Family', 'Social'],
  'T. Krishna': ['Drama', 'Action', 'Family'],
  'Vijaya Nirmala': ['Drama', 'Romance', 'Family'],
  'B.N. Reddy': ['Drama', 'Historical', 'Musical'],
  'L.V. Prasad': ['Drama', 'Romance', 'Comedy'],
  'P. Pullaiah': ['Drama', 'Mythological', 'Historical'],
  'Gudavalli Ramabrahmam': ['Drama', 'Social', 'Historical'],
  'A. Kodandarami Reddy': ['Action', 'Drama', 'Commercial'],
  'Kodandarami Reddy': ['Action', 'Drama', 'Commercial'],
  'Relangi Narasimha Rao': ['Comedy', 'Drama', 'Family'],
  'Jandhyala': ['Comedy', 'Drama', 'Family'],
  'Jandhyala Subramanya Sastry': ['Comedy', 'Drama', 'Family'],
  'E.V.V. Satyanarayana': ['Comedy', 'Drama', 'Family'],
  'EVV Satyanarayana': ['Comedy', 'Drama', 'Family'],
  'S.V. Krishna Reddy': ['Comedy', 'Fantasy', 'Family'],
  'Muthyala Subbaiah': ['Comedy', 'Drama', 'Family'],
  
  // ============================================================
  // MASS/COMMERCIAL DIRECTORS (1990s-2010s)
  // ============================================================
  'S.S. Rajamouli': ['Action', 'Fantasy', 'Historical'],
  'SS Rajamouli': ['Action', 'Fantasy', 'Historical'],
  'Rajamouli': ['Action', 'Fantasy', 'Historical'],
  'Puri Jagannadh': ['Action', 'Mass', 'Drama'],
  'Puri': ['Action', 'Mass', 'Drama'],
  'Boyapati Srinu': ['Action', 'Mass', 'Drama'],
  'Boyapati Sreenu': ['Action', 'Mass', 'Drama'],
  'Srinu Vaitla': ['Comedy', 'Action', 'Commercial'],
  'V.V. Vinayak': ['Action', 'Mass', 'Commercial'],
  'VV Vinayak': ['Action', 'Mass', 'Commercial'],
  'Surender Reddy': ['Action', 'Thriller', 'Commercial'],
  'Surendar Reddy': ['Action', 'Thriller', 'Commercial'],
  'Gopichand Malineni': ['Action', 'Mass', 'Commercial'],
  'Harish Shankar': ['Action', 'Mass', 'Commercial'],
  'Bobby': ['Action', 'Commercial', 'Mass'],
  'Meher Ramesh': ['Action', 'Mass', 'Drama'],
  'B. Gopal': ['Action', 'Drama', 'Romance'],
  'Teja': ['Drama', 'Romance', 'Action'],
  'Krishna Vamsi': ['Drama', 'Romance', 'Family'],
  'Gunasekhar': ['Historical', 'Drama', 'Action'],
  'Gunasekhar Gunnana': ['Historical', 'Drama', 'Action'],
  
  // ============================================================
  // NEW WAVE DIRECTORS (2010s-Present)
  // ============================================================
  'Trivikram Srinivas': ['Comedy', 'Drama', 'Romance'],
  'Trivikram': ['Comedy', 'Drama', 'Romance'],
  'Sukumar': ['Action', 'Drama', 'Thriller'],
  'Sukumar Bandreddi': ['Action', 'Drama', 'Thriller'],
  'Koratala Siva': ['Action', 'Drama', 'Social'],
  'Vamshi Paidipally': ['Action', 'Drama', 'Commercial'],
  'Anil Ravipudi': ['Comedy', 'Commercial', 'Family'],
  'Sagar K. Chandra': ['Thriller', 'Crime', 'Drama'],
  'Venkatesh Maha': ['Drama', 'Social', 'Art'],
  'Maruthi': ['Comedy', 'Romance', 'Drama'],
  'Kishore Tirumala': ['Romance', 'Drama', 'Comedy'],
  'Sriram Venu': ['Romance', 'Comedy', 'Drama'],
  'Hanu Raghavapudi': ['Romance', 'Historical', 'Drama'],
  'Merlapaka Gandhi': ['Comedy', 'Romance', 'Drama'],
  'Parasuram': ['Comedy', 'Romance', 'Drama'],
  'Siva Nirvana': ['Drama', 'Romance', 'Family'],
  'Rahul Sankrityan': ['Action', 'Drama', 'Thriller'],
  'Krish Jagarlamudi': ['Historical', 'Biography', 'Drama'],
  'Krish': ['Historical', 'Biography', 'Drama'],
  'Deva Katta': ['Action', 'Drama', 'Social'],
  'Nandini Reddy': ['Romance', 'Comedy', 'Drama'],
  
  // ============================================================
  // CONTENT-DRIVEN DIRECTORS
  // ============================================================
  'Sekhar Kammula': ['Drama', 'Romance', 'Social'],
  'Shekar Kammula': ['Drama', 'Romance', 'Social'],
  'Nag Ashwin': ['Drama', 'Sci-Fi', 'Historical'],
  'Sandeep Reddy Vanga': ['Drama', 'Romance', 'Action'],
  'Sandeep Vanga': ['Drama', 'Romance', 'Action'],
  'Prashanth Varma': ['Horror', 'Thriller', 'Fantasy'],
  'Prashant Varma': ['Horror', 'Thriller', 'Fantasy'],
  'Venky Kudumula': ['Comedy', 'Romance', 'Commercial'],
  'Buchi Babu Sana': ['Drama', 'Sports', 'Action'],
  'Ajay Bhupathi': ['Thriller', 'Crime', 'Drama'],
  'Vivek Athreya': ['Drama', 'Romance', 'Thriller'],
  'Tharun Bhascker': ['Comedy', 'Drama', 'Romance'],
  'Tharun Bhascker Dhaassyam': ['Comedy', 'Drama', 'Romance'],
  
  // ============================================================
  // HORROR/THRILLER SPECIALISTS
  // ============================================================
  'Ram Gopal Varma': ['Horror', 'Thriller', 'Crime'],
  'RGV': ['Horror', 'Thriller', 'Crime'],
  'Ashwin Gangaraju': ['Horror', 'Thriller', 'Mystery'],
  'Kiran Korrapati': ['Horror', 'Thriller', 'Drama'],
  'G. Ashok': ['Horror', 'Thriller', 'Drama'],
  'Praveen Sattaru': ['Thriller', 'Action', 'Drama'],
  'Sudheer Varma': ['Thriller', 'Crime', 'Action'],
  'Indraganti Mohana Krishna': ['Drama', 'Romance', 'Comedy'],
  'Mohan Krishna Indraganti': ['Drama', 'Romance', 'Comedy'],
  
  // ============================================================
  // YOUNG DIRECTORS (2020s)
  // ============================================================
  'Jathi Ratnalu Anudeep': ['Comedy', 'Drama', 'Mass'],
  'Anudeep KV': ['Comedy', 'Drama', 'Mass'],
  'Sailesh Kolanu': ['Thriller', 'Drama', 'Crime'],
  'Sailesh': ['Thriller', 'Drama', 'Crime'],
  'Venky Atluri': ['Drama', 'Romance', 'Sports'],
  'Santhosh Narayanan': ['Drama', 'Music', 'Romance'],
  'Anand Deverakonda': ['Drama', 'Romance', 'Comedy'],
  'Bhanu Shankar Lankella': ['Comedy', 'Drama', 'Action'],
};

// ============================================================
// ERA-BASED DEFAULT GENRES
// ============================================================

/**
 * Default genres by decade when other signals are insufficient.
 * Used as fallback with low confidence.
 * Based on Telugu cinema trends in each era.
 */
export const ERA_DEFAULTS: Record<string, string[]> = {
  '1930s': ['Drama', 'Mythological'],
  '1940s': ['Drama', 'Mythological', 'Social'],
  '1950s': ['Drama', 'Mythological', 'Romance'],
  '1960s': ['Drama', 'Romance', 'Family'],
  '1970s': ['Drama', 'Action', 'Romance'],
  '1980s': ['Action', 'Drama', 'Comedy'],
  '1990s': ['Action', 'Romance', 'Drama'],
  '2000s': ['Action', 'Romance', 'Comedy'],
  '2010s': ['Action', 'Drama', 'Commercial'],
  '2020s': ['Action', 'Drama', 'Thriller'],
};

/**
 * Specific year ranges for more precise defaults.
 * Returns the most likely primary genre based on Telugu cinema history.
 */
export const YEAR_GENRE_DEFAULTS: Record<string, string> = {
  // Golden Age - Mythological dominance
  '1931-1950': 'Mythological',
  // ANR-NTR era - Drama dominance
  '1951-1965': 'Drama',
  // Romance wave
  '1966-1975': 'Romance',
  // Action era begins
  '1976-1985': 'Action',
  // Chiranjeevi action dominance
  '1986-1995': 'Action',
  // Multi-starrers and action
  '1996-2005': 'Action',
  // Commercial cinema rises
  '2006-2015': 'Commercial',
  // Content-driven + Pan-India
  '2016-2030': 'Action',
};

// ============================================================
// MOOD TO GENRE MAPPING
// ============================================================

/**
 * Maps mood tags to likely primary genres.
 * Weight: 0.20 in consensus calculation
 * Comprehensive mapping for all common mood tags.
 */
export const MOOD_GENRE_MAP: Record<string, string[]> = {
  // Positive moods
  'feel-good': ['Comedy', 'Family', 'Romance'],
  'light-hearted': ['Comedy', 'Family'],
  'heartwarming': ['Drama', 'Family', 'Romance'],
  'uplifting': ['Drama', 'Sports', 'Biography'],
  'cheerful': ['Comedy', 'Family'],
  'fun': ['Comedy', 'Action'],
  'entertaining': ['Commercial', 'Action', 'Comedy'],
  'wholesome': ['Family', 'Drama'],
  
  // Intense moods
  'dark-intense': ['Thriller', 'Horror', 'Crime'],
  'dark': ['Horror', 'Thriller', 'Crime'],
  'intense': ['Action', 'Thriller', 'Drama'],
  'edge-of-seat': ['Action', 'Thriller'],
  'gripping': ['Thriller', 'Crime', 'Mystery'],
  'suspenseful': ['Thriller', 'Mystery', 'Crime'],
  'nail-biting': ['Thriller', 'Action'],
  'tense': ['Thriller', 'Crime', 'Drama'],
  
  // Emotional moods
  'emotional': ['Drama', 'Romance', 'Family'],
  'touching': ['Drama', 'Romance', 'Family'],
  'tearjerker': ['Drama', 'Romance'],
  'melancholic': ['Drama', 'Romance'],
  'bittersweet': ['Drama', 'Romance'],
  'poignant': ['Drama', 'Biography'],
  'sentimental': ['Romance', 'Family', 'Drama'],
  
  // Intellectual moods
  'thought-provoking': ['Drama', 'Social'],
  'cerebral': ['Thriller', 'Mystery', 'Sci-Fi'],
  'philosophical': ['Drama', 'Art'],
  'mind-bending': ['Thriller', 'Sci-Fi', 'Mystery'],
  
  // Romance moods
  'romantic': ['Romance', 'Drama'],
  'love-story': ['Romance', 'Drama'],
  'passionate': ['Romance', 'Drama'],
  
  // Action/Adventure moods
  'action-packed': ['Action', 'Thriller'],
  'adrenaline': ['Action', 'Thriller'],
  'thrilling': ['Action', 'Thriller', 'Adventure'],
  'exciting': ['Action', 'Adventure'],
  'adventurous': ['Adventure', 'Action', 'Fantasy'],
  
  // Other moods
  'patriotic': ['War', 'Historical', 'Drama'],
  'nostalgic': ['Drama', 'Family'],
  'informative': ['Documentary', 'Biography'],
  'melodious': ['Musical', 'Romance'],
  'engaging': ['Drama', 'Action'],
  'imaginative': ['Fantasy', 'Sci-Fi'],
  'futuristic': ['Sci-Fi', 'Fantasy'],
  'inspirational': ['Drama', 'Biography', 'Sports'],
  'motivational': ['Sports', 'Biography', 'Drama'],
  'scary': ['Horror', 'Thriller'],
  'creepy': ['Horror', 'Mystery'],
  'quirky': ['Comedy', 'Drama'],
  'satirical': ['Comedy', 'Drama', 'Social'],
  'mass-masala': ['Commercial', 'Action', 'Mass'],
  'masala': ['Commercial', 'Action'],
  'family-entertainer': ['Family', 'Comedy', 'Drama'],
};

// ============================================================
// AUDIENCE FIT TO GENRE MAPPING
// ============================================================

/**
 * Maps audience fit signals to likely primary genres.
 * Weight: 0.15 in consensus calculation
 * Expanded for all audience categories.
 */
export const AUDIENCE_FIT_GENRE_MAP: Record<string, string[]> = {
  // Age-based
  'kids_friendly': ['Animation', 'Family', 'Comedy'],
  'family_watch': ['Family', 'Drama', 'Comedy'],
  'adult_themes': ['Drama', 'Thriller', 'Crime'],
  'mature_content': ['Drama', 'Romance', 'Thriller'],
  
  // Social setting
  'date_movie': ['Romance', 'Comedy', 'Drama'],
  'group_watch': ['Action', 'Comedy', 'Thriller'],
  'solo_watch': ['Drama', 'Thriller', 'Art'],
  'party_movie': ['Comedy', 'Action'],
  
  // Content type
  'discussion_worthy': ['Drama', 'Social', 'Biography'],
  'rewatchable': ['Comedy', 'Action', 'Romance'],
  'cult_classic': ['Action', 'Comedy', 'Horror'],
  'comfort_watch': ['Comedy', 'Family', 'Romance'],
  
  // Target audience
  'youth_appeal': ['Romance', 'Comedy', 'Action'],
  'mass_appeal': ['Action', 'Commercial', 'Mass'],
  'class_appeal': ['Drama', 'Art', 'Romance'],
  'universal': ['Family', 'Drama', 'Comedy'],
};

// ============================================================
// PRIMARY GENRE HIERARCHY
// ============================================================

/**
 * Canonical list of primary genres in priority order.
 * When multiple genres tie, prefer earlier in this list.
 */
export const PRIMARY_GENRE_PRIORITY: string[] = [
  'Action',
  'Drama',
  'Romance',
  'Comedy',
  'Thriller',
  'Horror',
  'Family',
  'Historical',
  'Fantasy',
  'Sci-Fi',
  'Mythological',
  'Crime',
  'Mystery',
  'War',
  'Biography',
  'Sports',
  'Musical',
  'Documentary',
  'Animation',
  'Art',
  'Social',
  'Commercial',
  'Mass',
];

// ============================================================
// GENRE NORMALIZATION
// ============================================================

/**
 * Normalizes genre strings to canonical form.
 */
export const GENRE_ALIASES: Record<string, string> = {
  'action': 'Action',
  'drama': 'Drama',
  'romance': 'Romance',
  'romantic': 'Romance',
  'comedy': 'Comedy',
  'thriller': 'Thriller',
  'horror': 'Horror',
  'family': 'Family',
  'historical': 'Historical',
  'period': 'Historical',
  'history': 'Historical',
  'fantasy': 'Fantasy',
  'sci-fi': 'Sci-Fi',
  'science fiction': 'Sci-Fi',
  'scifi': 'Sci-Fi',
  'mythological': 'Mythological',
  'mythology': 'Mythological',
  'crime': 'Crime',
  'mystery': 'Mystery',
  'war': 'War',
  'biography': 'Biography',
  'biographical': 'Biography',
  'biopic': 'Biography',
  'sports': 'Sports',
  'sport': 'Sports',
  'musical': 'Musical',
  'music': 'Musical',
  'documentary': 'Documentary',
  'animation': 'Animation',
  'animated': 'Animation',
  'art': 'Art',
  'art house': 'Art',
  'social': 'Social',
  'commercial': 'Commercial',
  'mass': 'Mass',
  'masala': 'Mass',
  'adventure': 'Action',
  'suspense': 'Thriller',
  'psychological': 'Thriller',
};

/**
 * Normalize a genre string to its canonical form.
 */
export function normalizeGenre(genre: string): string {
  const lower = genre.toLowerCase().trim();
  return GENRE_ALIASES[lower] || genre;
}

/**
 * Find matching genre patterns for an actor name (fuzzy match).
 */
export function findActorGenres(actorName: string): string[] | null {
  if (!actorName) return null;
  
  const lowerName = actorName.toLowerCase();
  
  for (const [actor, genres] of Object.entries(ACTOR_GENRE_MAP)) {
    if (lowerName.includes(actor.toLowerCase()) || actor.toLowerCase().includes(lowerName)) {
      return genres;
    }
  }
  
  return null;
}

/**
 * Find matching genre patterns for a director name (fuzzy match).
 */
export function findDirectorGenres(directorName: string): string[] | null {
  if (!directorName) return null;
  
  const lowerName = directorName.toLowerCase();
  
  for (const [director, genres] of Object.entries(DIRECTOR_GENRE_MAP)) {
    if (lowerName.includes(director.toLowerCase()) || director.toLowerCase().includes(lowerName)) {
      return genres;
    }
  }
  
  return null;
}

/**
 * Get era default genres for a given year.
 */
export function getEraGenres(year: number | null): string[] {
  if (!year) return ['Drama'];
  
  const decade = `${Math.floor(year / 10) * 10}s`;
  return ERA_DEFAULTS[decade] || ['Drama'];
}

