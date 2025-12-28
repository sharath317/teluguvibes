/**
 * Content Rewriter - Restructures news content to make it unique
 * Avoids plagiarism by rewriting and reorganizing text
 */

// Telugu sentence starters for variety
const TELUGU_STARTERS = [
  'ఈ వార్త ప్రకారం',
  'సమాచారం ప్రకారం',
  'వార్తల ప్రకారం',
  'తాజా సమాచారం ప్రకారం',
  'మీడియా రిపోర్ట్స్ ప్రకారం',
  'విశ్వసనీయ వర్గాల ప్రకారం',
];

const TELUGU_CONNECTORS = [
  'అయితే',
  'ఈ నేపథ్యంలో',
  'ఈ క్రమంలో',
  'మరోవైపు',
  'ఇక',
  'అంతేకాకుండా',
  'ఈ విషయంలో',
];

const TELUGU_CLOSERS = [
  'మరిన్ని వివరాలు త్వరలో తెలియనున్నాయి.',
  'ఈ విషయంపై అధికారిక ప్రకటన రావాల్సి ఉంది.',
  'పూర్తి వివరాలు అందుబాటులోకి రానున్నాయి.',
  'ఈ పరిణామాలపై అందరి దృష్టి నిలిచింది.',
];

/**
 * Rewrite title to make it unique
 */
export function rewriteTitle(originalTitle: string): string {
  // Remove common prefixes
  let title = originalTitle
    .replace(/^(Breaking|BREAKING|Latest|LATEST|Exclusive|EXCLUSIVE)[:\s]*/i, '')
    .replace(/^(Watch|Video|Photos?|Pics?)[:\s]*/i, '')
    .trim();

  // If title is in English, add Telugu context
  if (/^[A-Za-z]/.test(title)) {
    // Keep English title but clean it
    title = title.replace(/\s*\|\s*.*$/, ''); // Remove source suffix
    title = title.replace(/\s*-\s*[A-Za-z]+\s*$/, ''); // Remove trailing source
  }

  return title;
}

/**
 * Rewrite content to make it unique and structured
 */
export function rewriteContent(
  originalContent: string,
  title: string,
  category: string
): string {
  // Clean the content
  let content = originalContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/Read more.*$/i, '') // Remove "read more" text
    .replace(/Also read.*$/i, '')
    .replace(/Click here.*$/i, '')
    .replace(/Subscribe.*$/i, '')
    .replace(/Follow us.*$/i, '')
    .trim();

  // If content is too short, expand it
  if (content.length < 100) {
    content = generateExpandedContent(title, category);
  } else {
    // Restructure the content
    content = restructureContent(content, category);
  }

  return content;
}

/**
 * Restructure existing content
 */
function restructureContent(content: string, category: string): string {
  const sentences = content.split(/[.!?।]+/).filter(s => s.trim().length > 10);

  if (sentences.length === 0) {
    return content;
  }

  const starter = TELUGU_STARTERS[Math.floor(Math.random() * TELUGU_STARTERS.length)];
  const connector = TELUGU_CONNECTORS[Math.floor(Math.random() * TELUGU_CONNECTORS.length)];
  const closer = TELUGU_CLOSERS[Math.floor(Math.random() * TELUGU_CLOSERS.length)];

  // Build restructured content
  const parts: string[] = [];

  // Opening
  parts.push(`${starter}, ${sentences[0].trim()}.`);

  // Middle paragraphs
  if (sentences.length > 1) {
    parts.push('');
    parts.push(`${connector}, ${sentences.slice(1, 3).join('. ').trim()}.`);
  }

  if (sentences.length > 3) {
    parts.push('');
    parts.push(sentences.slice(3, 5).join('. ').trim() + '.');
  }

  // Closing
  parts.push('');
  parts.push(closer);

  return parts.join('\n');
}

/**
 * Generate expanded content for short articles
 */
function generateExpandedContent(title: string, category: string): string {
  const starter = TELUGU_STARTERS[Math.floor(Math.random() * TELUGU_STARTERS.length)];
  const closer = TELUGU_CLOSERS[Math.floor(Math.random() * TELUGU_CLOSERS.length)];

  const categoryIntros: Record<string, string> = {
    entertainment: 'సినీ పరిశ్రమలో ఈ వార్త సంచలనం సృష్టిస్తోంది.',
    sports: 'క్రీడా ప్రపంచంలో ఈ వార్త ఆసక్తి రేపుతోంది.',
    politics: 'రాజకీయ వర్గాల్లో ఈ అంశం చర్చనీయాంశంగా మారింది.',
    gossip: 'ఈ వార్త సోషల్ మీడియాలో వైరల్ అవుతోంది.',
    trending: 'ఈ టాపిక్ ప్రస్తుతం ట్రెండింగ్‌లో ఉంది.',
  };

  const intro = categoryIntros[category] || categoryIntros.trending;

  return `${starter}, ${title}.

${intro}

అభిమానులు మరియు ఆసక్తిగల వారు ఈ పరిణామాలను ఆసక్తిగా గమనిస్తున్నారు.

${closer}`;
}

/**
 * Extract key entities from text for image search
 */
export function extractEntities(text: string): {
  celebrities: string[];
  politicians: string[];
  topics: string[];
  context: string;
} {
  const textLower = text.toLowerCase();

  const celebrities: string[] = [];
  const politicians: string[] = [];
  const topics: string[] = [];

  // Celebrity database (includes Telugu script names)
  const celebrityDB: Record<string, string> = {
    // Cricket - English & Telugu
    'dhoni': 'MS Dhoni cricket',
    'ధోని': 'MS Dhoni cricket',
    'kohli': 'Virat Kohli cricket',
    'కోహ్లీ': 'Virat Kohli cricket',
    'virat': 'Virat Kohli cricket',
    'విరాట్': 'Virat Kohli cricket',
    'rohit sharma': 'Rohit Sharma cricket',
    'రోహిత్': 'Rohit Sharma cricket',
    'bumrah': 'Jasprit Bumrah bowling',
    'బుమ్రా': 'Jasprit Bumrah bowling',
    'hardik': 'Hardik Pandya cricket',
    'హార్దిక్': 'Hardik Pandya cricket',
    'rishabh': 'Rishabh Pant cricket',
    'పంత్': 'Rishabh Pant cricket',
    'sachin': 'Sachin Tendulkar cricket',
    'సచిన్': 'Sachin Tendulkar cricket',

    // Tollywood - English & Telugu
    'prabhas': 'Prabhas actor tollywood',
    'ప్రభాస్': 'Prabhas actor tollywood',
    'chiranjeevi': 'Chiranjeevi actor',
    'చిరంజీవి': 'Chiranjeevi actor',
    'mahesh babu': 'Mahesh Babu actor',
    'మహేష్ బాబు': 'Mahesh Babu actor',
    'మహేష్': 'Mahesh Babu actor',
    'allu arjun': 'Allu Arjun actor',
    'అల్లు అర్జున్': 'Allu Arjun actor',
    'bunny': 'Allu Arjun actor',
    'బన్నీ': 'Allu Arjun actor',
    'pawan kalyan': 'Pawan Kalyan actor',
    'పవన్ కళ్యాణ్': 'Pawan Kalyan actor',
    'jr ntr': 'Jr NTR actor',
    'ntr': 'Jr NTR actor tollywood',
    'ఎన్టీఆర్': 'Jr NTR actor',
    'తారక్': 'Jr NTR actor',
    'ram charan': 'Ram Charan actor',
    'రామ్ చరణ్': 'Ram Charan actor',
    'nagarjuna': 'Nagarjuna actor',
    'నాగార్జున': 'Nagarjuna actor',
    'venkatesh': 'Venkatesh actor',
    'వెంకటేష్': 'Venkatesh actor',
    'ravi teja': 'Ravi Teja actor',
    'రవితేజ': 'Ravi Teja actor',
    'balakrishna': 'Balakrishna actor',
    'బాలకృష్ణ': 'Balakrishna actor',
    'balayya': 'Balakrishna actor',
    'బాలయ్య': 'Balakrishna actor',
    'vijay deverakonda': 'Vijay Deverakonda actor',
    'విజయ్ దేవరకొండ': 'Vijay Deverakonda actor',

    // Tollywood Heroines
    'samantha': 'Samantha actress',
    'సమంత': 'Samantha actress',
    'rashmika': 'Rashmika Mandanna actress',
    'రష్మిక': 'Rashmika Mandanna actress',
    'pooja hegde': 'Pooja Hegde actress',
    'పూజా హెగ్డే': 'Pooja Hegde actress',
    'anushka': 'Anushka Shetty actress',
    'అనుష్క': 'Anushka Shetty actress',

    // Bollywood
    'shahrukh': 'Shah Rukh Khan actor',
    'షారుఖ్': 'Shah Rukh Khan actor',
    'srk': 'Shah Rukh Khan actor',
    'salman': 'Salman Khan actor',
    'సల్మాన్': 'Salman Khan actor',
    'aamir': 'Aamir Khan actor',
    'ఆమీర్': 'Aamir Khan actor',
    'amitabh': 'Amitabh Bachchan actor',
    'అమితాబ్': 'Amitabh Bachchan actor',
    'deepika': 'Deepika Padukone actress',
    'దీపికా': 'Deepika Padukone actress',
    'priyanka': 'Priyanka Chopra actress',
    'ప్రియాంక': 'Priyanka Chopra actress',
    'alia': 'Alia Bhatt actress',
    'ఆలియా': 'Alia Bhatt actress',
    'ranveer': 'Ranveer Singh actor',
    'రణ్‌వీర్': 'Ranveer Singh actor',
    'ranbir': 'Ranbir Kapoor actor',
    'రణ్‌బీర్': 'Ranbir Kapoor actor',
    'katrina': 'Katrina Kaif actress',

    // International
    'trump': 'Donald Trump',
    'ట్రంప్': 'Donald Trump',
    'elon musk': 'Elon Musk',
    'ఎలాన్ మస్క్': 'Elon Musk',
  };

  // Politician database (includes Telugu script)
  const politicianDB: Record<string, string> = {
    'modi': 'Narendra Modi politician india',
    'మోదీ': 'Narendra Modi politician india',
    'pm modi': 'Narendra Modi politician india',
    'jagan': 'YS Jagan politician andhra',
    'జగన్': 'YS Jagan politician andhra',
    'ys jagan': 'YS Jagan politician andhra',
    'chandrababu': 'Chandrababu Naidu politician',
    'చంద్రబాబు': 'Chandrababu Naidu politician',
    'cbn': 'Chandrababu Naidu politician',
    'kcr': 'KCR Telangana politician',
    'కేసీఆర్': 'KCR Telangana politician',
    'revanth': 'Revanth Reddy Telangana',
    'రేవంత్': 'Revanth Reddy Telangana',
    'rahul gandhi': 'Rahul Gandhi politician',
    'రాహుల్': 'Rahul Gandhi politician',
    'amit shah': 'Amit Shah politician',
    'అమిత్ షా': 'Amit Shah politician',
    'yogi': 'Yogi Adityanath UP politician',
    'యోగి': 'Yogi Adityanath UP politician',
    'kejriwal': 'Arvind Kejriwal Delhi',
    'mamata': 'Mamata Banerjee Bengal',
    'stalin': 'MK Stalin Tamil Nadu',
  };

  // Topic keywords (includes Telugu)
  const topicDB: Record<string, string> = {
    // Sports
    'ipl': 'IPL cricket stadium',
    'ఐపీఎల్': 'IPL cricket stadium',
    'cricket': 'cricket match india',
    'క్రికెట్': 'cricket match india',
    'bcci': 'BCCI cricket board',
    'world cup': 'cricket world cup trophy',
    'వన్డే': 'ODI cricket match',
    'టెస్ట్': 'test cricket match',
    'champion': 'sports champion trophy',
    'ఛాంపియన్': 'sports champion trophy',

    // Entertainment
    'movie': 'indian cinema film',
    'మూవీ': 'indian cinema film',
    'సినిమా': 'indian cinema film',
    'film': 'tollywood movie set',
    'ఫిల్మ్': 'tollywood movie set',
    'song': 'music concert stage',
    'పాట': 'indian music concert',
    'bigg boss': 'bigg boss reality show',
    'బిగ్ బాస్': 'bigg boss reality show',
    'ott': 'streaming entertainment phone',
    'ఓటీటీ': 'streaming entertainment phone',

    // Money/Finance
    'gold': 'gold jewelry indian',
    'బంగారం': 'gold jewelry indian',
    'గోల్డ్': 'gold jewelry indian',
    'petrol': 'petrol pump india',
    'పెట్రోల్': 'petrol pump india',
    'salary': 'office work professional',
    'జీతం': 'office work professional',
    'loan': 'bank loan finance',
    'లోన్': 'bank loan finance',
    'rupee': 'indian currency rupees',
    'రూపాయి': 'indian currency rupees',
    'laptop': 'laptop computer office',
    'ల్యాప్‌టాప్': 'laptop computer office',

    // Politics/Government
    'election': 'indian election voting booth',
    'ఎన్నికలు': 'indian election voting booth',
    'parliament': 'indian parliament building delhi',
    'పార్లమెంట్': 'indian parliament building delhi',
    'court': 'indian court justice',
    'కోర్ట్': 'indian court justice',

    // Places
    'hyderabad': 'hyderabad india city',
    'హైదరాబాద్': 'hyderabad india city',
    'ayodhya': 'ayodhya ram temple',
    'అయోధ్య': 'ayodhya ram temple',
    'temple': 'hindu temple india',
    'గుడి': 'hindu temple india',
    'దేవాలయం': 'hindu temple india',
    'tirumala': 'tirumala tirupati temple',
    'తిరుమల': 'tirumala tirupati temple',

    // Events
    'wedding': 'indian wedding celebration',
    'పెళ్లి': 'indian wedding celebration',
    'festival': 'indian festival celebration',
    'పండుగ': 'indian festival celebration',
    'diwali': 'diwali festival lights',
    'దీపావళి': 'diwali festival lights',
    'sankranti': 'sankranti festival kites',
    'సంక్రాంతి': 'sankranti festival kites',

    // Weather/Disasters
    'rain': 'monsoon rain india',
    'వర్షం': 'monsoon rain india',
    'flood': 'flood disaster relief',
    'వరదలు': 'flood disaster relief',
    'fire': 'fire emergency rescue',
    'అగ్ని': 'fire emergency rescue',
    'accident': 'road accident india',
    'ప్రమాదం': 'road accident india',

    // Health
    'hospital': 'hospital medical care',
    'హాస్పిటల్': 'hospital medical care',
    'doctor': 'doctor medical professional',
    'డాక్టర్': 'doctor medical professional',

    // Education
    'school': 'school education india',
    'స్కూల్': 'school education india',
    'college': 'college university education',
    'కాలేజీ': 'college university education',
    'scholarship': 'education scholarship student',
    'స్కాలర్‌షిప్': 'education scholarship student',

    // Transport
    'train': 'indian railway train',
    'రైలు': 'indian railway train',
    'airport': 'airport travel flight',
    'విమానం': 'airplane flight travel',
    'car': 'car automobile road',
    'కారు': 'car automobile road',
    'bike': 'motorcycle riding',
    'బైక్': 'motorcycle riding',
  };

  // Check celebrities
  for (const [key, name] of Object.entries(celebrityDB)) {
    if (textLower.includes(key)) {
      celebrities.push(name);
    }
  }

  // Check politicians
  for (const [key, name] of Object.entries(politicianDB)) {
    if (textLower.includes(key)) {
      politicians.push(name);
    }
  }

  // Check topics
  for (const [key, topic] of Object.entries(topicDB)) {
    if (textLower.includes(key)) {
      topics.push(topic);
    }
  }

  // Determine context
  let context = 'news';
  if (celebrities.length > 0) context = 'celebrity';
  else if (politicians.length > 0) context = 'politics';
  else if (topics.length > 0) context = 'topic';

  return { celebrities, politicians, topics, context };
}
