/**
 * Translation Service
 * 
 * Provides English to Telugu translation capabilities for synopsis enrichment.
 * Uses multiple translation backends with fallback strategy.
 * 
 * Confidence Tiers:
 * - Telugu Wikipedia (direct): 0.95 (High)
 * - English synopsis translated: 0.80-0.85 (High)
 * - Wikidata Telugu: 0.70 (Medium)
 * - Generated basic: 0.30 (Low - DO NOT COUNT as enriched)
 */

// ============================================================
// TYPES
// ============================================================

export interface TranslationResult {
  text: string;
  source: string;
  confidence: number;
  language: string;
}

export interface TranslationOptions {
  maxLength?: number;
  includeSourceAttribution?: boolean;
}

// ============================================================
// CONFIDENCE TIERS
// ============================================================

export const CONFIDENCE_TIERS = {
  TELUGU_WIKIPEDIA: 0.95,
  ENGLISH_WIKIPEDIA_TRANSLATED: 0.85,
  TMDB_OVERVIEW_TRANSLATED: 0.80,
  WIKIDATA_TELUGU: 0.70,
  CINEMA_NEWS: 0.65,
  BASIC_GENERATED: 0.30,
} as const;

export const HIGH_CONFIDENCE_THRESHOLD = 0.65;

// ============================================================
// TELUGU CINEMA VOCABULARY
// ============================================================

/**
 * Common Telugu cinema terms for generating basic synopsis.
 */
export const TELUGU_GENRE_TERMS: Record<string, string> = {
  'Action': 'యాక్షన్',
  'Drama': 'డ్రామా',
  'Comedy': 'కామెడీ',
  'Romance': 'రొమాంటిక్',
  'Thriller': 'థ్రిల్లర్',
  'Horror': 'హారర్',
  'Family': 'ఫ్యామిలీ',
  'Adventure': 'అడ్వెంచర్',
  'Fantasy': 'ఫాంటసీ',
  'Historical': 'చారిత్రక',
  'Mythological': 'పౌరాణిక',
  'Crime': 'క్రైమ్',
  'Mystery': 'మిస్టరీ',
  'Biography': 'బయోగ్రఫీ',
  'Sports': 'స్పోర్ట్స్',
  'Musical': 'సంగీత',
  'War': 'యుద్ధ',
  'Social': 'సామాజిక',
};

/**
 * Common Telugu cinema phrases.
 */
export const TELUGU_PHRASES = {
  isATeluguFilm: 'ఒక తెలుగు సినిమా',
  releasedIn: 'విడుదలైన',
  directedBy: 'దర్శకత్వం వహించిన',
  starring: 'నటించిన',
  thisFilmBelongsTo: 'ఈ సినిమా',
  genreCategory: 'ప్రక్రియకు చెందినది',
  film: 'సినిమా',
  year: 'సంవత్సరంలో',
};

// ============================================================
// GOOGLE TRANSLATE API (if available)
// ============================================================

/**
 * Translate text using Google Cloud Translation API.
 * Requires GOOGLE_TRANSLATE_API_KEY environment variable.
 */
export async function translateWithGoogle(
  text: string,
  targetLang: string = 'te',
  sourceLang: string = 'en'
): Promise<TranslationResult | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  try {
    const url = `https://translation.googleapis.com/language/translate/v2`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        key: apiKey,
        format: 'text',
      }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const translatedText = data.data?.translations?.[0]?.translatedText;
    
    if (!translatedText) {
      return null;
    }
    
    return {
      text: translatedText,
      source: 'google_translate',
      confidence: CONFIDENCE_TIERS.TMDB_OVERVIEW_TRANSLATED,
      language: targetLang,
    };
  } catch (error) {
    console.error('Google Translate error:', error);
    return null;
  }
}

// ============================================================
// GROQ LLM TRANSLATION (High quality, fast)
// ============================================================

/**
 * Translate text using Groq's LLM API.
 * Requires GROQ_API_KEY environment variable.
 * Uses llama-3.3-70b-versatile for high-quality Telugu translation.
 * Falls back to smaller models if primary fails.
 */
export async function translateWithGroq(
  text: string,
  targetLang: string = 'te'
): Promise<TranslationResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  // Model fallback chain (newest to oldest, large to small)
  const GROQ_MODELS = [
    'llama-3.3-70b-versatile',    // Primary - newest large model
    'llama-3.1-8b-instant',       // Fast fallback
    'mixtral-8x7b-32768',         // Alternative large model
    'llama3-70b-8192',            // Legacy large model
  ];
  
  const languageNames: Record<string, string> = {
    'te': 'Telugu (తెలుగు)',
    'hi': 'Hindi (हिंदी)',
    'ta': 'Tamil (தமிழ்)',
    'kn': 'Kannada (ಕನ್ನಡ)',
  };
  
  const targetLanguageName = languageNames[targetLang] || targetLang;
  
  // Try each model in fallback chain
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are an expert translator specializing in Indian cinema. Translate the following text to ${targetLanguageName}. 
Maintain the essence and style of movie descriptions. 
Use natural ${targetLanguageName} that a native speaker would use.
Only output the translated text, nothing else.`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 1500,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText).error || {};
        
        // Check if model is decommissioned or rate limited - try next model
        if (errorData.code === 'model_decommissioned' || 
            errorData.code === 'rate_limit_exceeded' ||
            response.status === 429) {
          console.warn(`Groq model ${model} unavailable, trying fallback...`);
          continue; // Try next model
        }
        
        console.error('Groq API error:', response.status, errorText);
        continue; // Try next model for any error
      }
      
      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim();
      
      if (!translatedText) {
        continue; // Try next model
      }
      
      return {
        text: translatedText,
        source: `groq_llm_${model.split('-')[0]}`,
        confidence: model.includes('70b') ? 0.78 : 0.72, // Slightly lower for smaller models
        language: targetLang,
      };
    } catch (error) {
      console.warn(`Groq model ${model} error:`, error);
      continue; // Try next model
    }
  }
  
  // All models failed
  console.error('All Groq models failed for translation');
  return null;
}

// ============================================================
// LIBRE TRANSLATE (Free alternative)
// ============================================================

/**
 * Translate text using LibreTranslate (free, self-hostable).
 * Requires LIBRE_TRANSLATE_URL environment variable.
 */
export async function translateWithLibre(
  text: string,
  targetLang: string = 'te',
  sourceLang: string = 'en'
): Promise<TranslationResult | null> {
  const baseUrl = process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.com';
  
  try {
    const response = await fetch(`${baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
      }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.translatedText) {
      return null;
    }
    
    return {
      text: data.translatedText,
      source: 'libre_translate',
      confidence: CONFIDENCE_TIERS.TMDB_OVERVIEW_TRANSLATED * 0.95, // Slightly lower than Google
      language: targetLang,
    };
  } catch (error) {
    // LibreTranslate might not be available
    return null;
  }
}

// ============================================================
// BASIC TELUGU SYNOPSIS GENERATOR
// ============================================================

export interface BasicSynopsisParams {
  titleTe?: string | null;
  titleEn: string;
  year: number;
  genres?: string[] | null;
  director?: string | null;
  hero?: string | null;
}

/**
 * Generate a basic Telugu synopsis when no better source is available.
 * Returns LOW confidence (0.30) - should NOT count as "enriched".
 */
export function generateBasicTeluguSynopsis(params: BasicSynopsisParams): TranslationResult {
  const { titleTe, titleEn, year, genres, director, hero } = params;
  const title = titleTe || titleEn;
  
  let synopsis = `${title} అనేది ${year}లో ${TELUGU_PHRASES.releasedIn} ${TELUGU_PHRASES.isATeluguFilm}.`;
  
  // Add genre information
  if (genres && genres.length > 0) {
    const teluguGenres = genres
      .map(g => TELUGU_GENRE_TERMS[g])
      .filter(Boolean)
      .slice(0, 2);
    
    if (teluguGenres.length > 0) {
      synopsis += ` ${TELUGU_PHRASES.thisFilmBelongsTo} ${teluguGenres.join(', ')} ${TELUGU_PHRASES.genreCategory}.`;
    }
  }
  
  // Add director if available
  if (director) {
    synopsis += ` ${director} ${TELUGU_PHRASES.directedBy} ఈ చిత్రం.`;
  }
  
  // Add hero if available
  if (hero) {
    synopsis += ` ${hero} ముఖ్య పాత్రలో ${TELUGU_PHRASES.starring}.`;
  }
  
  return {
    text: synopsis,
    source: 'generated_basic',
    confidence: CONFIDENCE_TIERS.BASIC_GENERATED,
    language: 'te',
  };
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

/**
 * Translate English synopsis to Telugu using available services.
 * Falls back through multiple translation backends:
 * 1. Google Translate (highest quality, API key required)
 * 2. Groq LLM (good quality, fast, API key required)
 * 3. LibreTranslate (free fallback)
 */
export async function translateToTelugu(
  englishText: string,
  options: TranslationOptions = {}
): Promise<TranslationResult | null> {
  const { maxLength = 1000 } = options;
  
  // Truncate if too long
  let text = englishText;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }
  
  // Try Google Translate first (highest quality)
  const googleResult = await translateWithGoogle(text);
  if (googleResult) {
    return googleResult;
  }
  
  // Try Groq LLM (good quality, fast)
  const groqResult = await translateWithGroq(text, 'te');
  if (groqResult) {
    return groqResult;
  }
  
  // Try LibreTranslate as fallback
  const libreResult = await translateWithLibre(text);
  if (libreResult) {
    return libreResult;
  }
  
  // No translation available
  return null;
}

// ============================================================
// TELUGU WIKIPEDIA FETCHER (Enhanced)
// ============================================================

/**
 * Fetch Telugu content from Telugu Wikipedia.
 * Returns HIGH confidence (0.95) when successful.
 */
export async function fetchTeluguWikipediaSynopsis(
  titleEn: string,
  titleTe: string | null,
  year: number
): Promise<TranslationResult | null> {
  try {
    const titlesToTry = [titleTe, titleEn].filter(Boolean);
    
    for (const title of titlesToTry) {
      const wikiTitle = title!.replace(/ /g, '_');
      
      const patterns = [
        `${wikiTitle}_(${year}_సినిమా)`,
        `${wikiTitle}_(సినిమా)`,
        `${wikiTitle}_(${year}_film)`,
        wikiTitle,
      ];
      
      for (const pattern of patterns) {
        const apiUrl = `https://te.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
        
        const response = await fetch(apiUrl, {
          headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' },
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.extract && data.extract.length > 50) {
          let synopsis = data.extract.replace(/\s+/g, ' ').trim();
          
          if (synopsis.length > 1000) {
            synopsis = synopsis.substring(0, 997) + '...';
          }
          
          return {
            text: synopsis,
            source: 'telugu_wikipedia',
            confidence: CONFIDENCE_TIERS.TELUGU_WIKIPEDIA,
            language: 'te',
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Telugu Wikipedia error:', error);
    return null;
  }
}

// ============================================================
// ENGLISH WIKIPEDIA TRANSLATION
// ============================================================

/**
 * Fetch English Wikipedia summary and translate to Telugu.
 * Returns HIGH confidence (0.85) when successful.
 */
export async function fetchAndTranslateEnglishWikipedia(
  titleEn: string,
  year: number
): Promise<TranslationResult | null> {
  try {
    const patterns = [
      `${titleEn.replace(/ /g, '_')}_(${year}_film)`,
      `${titleEn.replace(/ /g, '_')}_(Telugu_film)`,
      `${titleEn.replace(/ /g, '_')}_(film)`,
      titleEn.replace(/ /g, '_'),
    ];
    
    for (const pattern of patterns) {
      const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.extract && data.extract.length > 100) {
        // Translate the English extract to Telugu
        const translated = await translateToTelugu(data.extract);
        
        if (translated) {
          return {
            text: translated.text,
            source: 'english_wikipedia_translated',
            confidence: CONFIDENCE_TIERS.ENGLISH_WIKIPEDIA_TRANSLATED,
            language: 'te',
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('English Wikipedia translation error:', error);
    return null;
  }
}

// ============================================================
// WIKIDATA TELUGU DESCRIPTION
// ============================================================

/**
 * Fetch Telugu description from Wikidata.
 * Returns MEDIUM confidence (0.70) when successful.
 */
export async function fetchWikidataTeluguDescription(
  wikidataId: string
): Promise<TranslationResult | null> {
  if (!wikidataId) return null;
  
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&languages=te&props=descriptions|labels&format=json`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const entity = data.entities?.[wikidataId];
    
    if (entity) {
      const teluguDesc = entity.descriptions?.te?.value;
      const teluguLabel = entity.labels?.te?.value;
      
      if (teluguDesc && teluguDesc.length > 20) {
        return {
          text: teluguDesc,
          source: 'wikidata_telugu',
          confidence: CONFIDENCE_TIERS.WIKIDATA_TELUGU,
          language: 'te',
        };
      }
      
      if (teluguLabel) {
        return {
          text: `${teluguLabel} ${TELUGU_PHRASES.isATeluguFilm}.`,
          source: 'wikidata_label',
          confidence: CONFIDENCE_TIERS.BASIC_GENERATED + 0.1, // Slightly better than pure generated
          language: 'te',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Wikidata error:', error);
    return null;
  }
}

// ============================================================
// COMBINED SYNOPSIS ENRICHMENT
// ============================================================

export interface SynopsisEnrichmentParams {
  titleEn: string;
  titleTe?: string | null;
  year: number;
  wikidataId?: string | null;
  englishSynopsis?: string | null;
  genres?: string[] | null;
  director?: string | null;
  hero?: string | null;
}

/**
 * Enrich Telugu synopsis using all available sources.
 * Returns best result with confidence score.
 */
export async function enrichTeluguSynopsis(
  params: SynopsisEnrichmentParams,
  rateLimitMs: number = 300
): Promise<TranslationResult> {
  const { titleEn, titleTe, year, wikidataId, englishSynopsis, genres, director, hero } = params;
  
  // 1. Try Telugu Wikipedia first (highest confidence)
  const teluguWiki = await fetchTeluguWikipediaSynopsis(titleEn, titleTe || null, year);
  if (teluguWiki) {
    return teluguWiki;
  }
  await new Promise(r => setTimeout(r, rateLimitMs));
  
  // 2. Try translating English synopsis (if available)
  if (englishSynopsis && englishSynopsis.length > 50) {
    const translated = await translateToTelugu(englishSynopsis);
    if (translated) {
      return {
        ...translated,
        source: 'english_synopsis_translated',
        confidence: CONFIDENCE_TIERS.TMDB_OVERVIEW_TRANSLATED,
      };
    }
    await new Promise(r => setTimeout(r, rateLimitMs));
  }
  
  // 3. Try English Wikipedia and translate
  const englishWikiTranslated = await fetchAndTranslateEnglishWikipedia(titleEn, year);
  if (englishWikiTranslated) {
    return englishWikiTranslated;
  }
  await new Promise(r => setTimeout(r, rateLimitMs));
  
  // 4. Try Wikidata Telugu description
  if (wikidataId) {
    const wikidata = await fetchWikidataTeluguDescription(wikidataId);
    if (wikidata) {
      return wikidata;
    }
    await new Promise(r => setTimeout(r, rateLimitMs));
  }
  
  // 5. Fall back to basic generated (LOW confidence)
  return generateBasicTeluguSynopsis({
    titleTe,
    titleEn,
    year,
    genres,
    director,
    hero,
  });
}

