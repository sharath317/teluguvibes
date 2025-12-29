/**
 * TeluguVibes Self-Learning Review System
 * Learns what review styles work for Telugu audience
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface ReviewLearning {
  movie_genre: string;
  movie_scale: 'big_budget' | 'indie' | 'medium';
  star_power: 'high' | 'medium' | 'low';
  optimal_length: number;
  best_opening_style: string;
  most_read_sections: string[];
  skipped_sections: string[];
  emphasis_weights: Record<string, number>;
  rating_agreement_rate: number;
}

export interface ReviewAnalytics {
  review_id: string;
  section_reads: Record<string, number>; // section -> % who read
  section_time: Record<string, number>; // section -> avg seconds
  scroll_pattern: 'complete' | 'skim' | 'partial' | 'bounce';
  rating_votes: { agree: number; disagree: number };
  user_reactions: string[];
}

export interface AutoReviewConfig {
  movie_id: string;
  movie_title: string;
  genre: string[];
  director: string;
  cast: string[];
  release_date: Date;
  budget_scale: 'big_budget' | 'indie' | 'medium';
  star_power: 'high' | 'medium' | 'low';
}

// ===== AUTO-GENERATE REVIEW =====

export async function generateAdaptiveReview(config: AutoReviewConfig): Promise<{
  review: any;
  learnings_applied: string[];
}> {
  // Step 1: Get relevant learnings
  const learnings = await getReviewLearnings(config.genre[0], config.budget_scale, config.star_power);

  // Step 2: Fetch TMDB & YouTube data
  const externalData = await fetchExternalReviewData(config.movie_title);

  // Step 3: Determine optimal structure
  const structure = determineReviewStructure(learnings, config);

  // Step 4: Generate each section with AI
  const sections = await generateReviewSections(config, structure, externalData, learnings);

  // Step 5: Generate ratings
  const ratings = await generateRatings(config, externalData, learnings);

  // Step 6: Compile review
  const review = compileReview(config, sections, ratings, structure);

  // Step 7: Record for learning
  await recordReviewGeneration(config, structure, learnings);

  return {
    review,
    learnings_applied: learnings.map(l => l.pattern_description || 'Unknown'),
  };
}

// ===== LEARNING RETRIEVAL =====

async function getReviewLearnings(
  genre: string,
  scale: string,
  starPower: string
): Promise<any[]> {
  const { data: learnings } = await supabase
    .from('review_learnings')
    .select('*')
    .or(`movie_genre.eq.${genre},movie_scale.eq.${scale},star_power.eq.${starPower}`)
    .order('confidence', { ascending: false })
    .limit(5);

  const { data: generalLearnings } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('learning_type', 'review_format')
    .eq('is_active', true)
    .gte('confidence_score', 0.6)
    .limit(3);

  return [...(learnings || []), ...(generalLearnings || [])];
}

// ===== EXTERNAL DATA FETCHING =====

async function fetchExternalReviewData(movieTitle: string): Promise<{
  tmdb: any;
  youtube: any;
  sentiment: number;
}> {
  let tmdbData = null;
  let youtubeData = null;
  let sentiment = 0;

  // TMDB data
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(movieTitle)}&language=te-IN`
      );
      const searchData = await searchRes.json();
      
      if (searchData.results?.length > 0) {
        const movie = searchData.results[0];
        
        // Get detailed info
        const detailRes = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbKey}&append_to_response=credits,videos,reviews`
        );
        tmdbData = await detailRes.json();
        
        // Calculate sentiment from vote_average
        sentiment = (tmdbData.vote_average - 5) / 5; // -1 to 1
      }
    } catch (error) {
      console.error('[TMDB] Error fetching movie data:', error);
    }
  }

  // YouTube trailer sentiment (simplified - just get view count as proxy)
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (ytKey) {
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(movieTitle + ' trailer telugu')}&type=video&maxResults=5&key=${ytKey}`
      );
      youtubeData = await ytRes.json();
    } catch (error) {
      console.error('[YouTube] Error fetching trailer data:', error);
    }
  }

  return { tmdb: tmdbData, youtube: youtubeData, sentiment };
}

// ===== STRUCTURE DETERMINATION =====

function determineReviewStructure(learnings: any[], config: AutoReviewConfig): {
  sections: string[];
  length: 'short' | 'medium' | 'long';
  emphasis: Record<string, number>;
  opening_style: string;
} {
  // Default structure
  let sections = ['verdict', 'story', 'performances', 'technical', 'rating'];
  let length: 'short' | 'medium' | 'long' = 'medium';
  let emphasis = {
    story: 0.25,
    performances: 0.25,
    direction: 0.20,
    music: 0.15,
    technical: 0.15,
  };
  let opening_style = 'verdict_first';

  // Apply learnings
  const genreLearning = learnings.find(l => l.movie_genre === config.genre[0]);
  if (genreLearning) {
    if (genreLearning.optimal_length) {
      length = genreLearning.optimal_length < 500 ? 'short' : 
               genreLearning.optimal_length > 800 ? 'long' : 'medium';
    }
    if (genreLearning.most_read_sections) {
      // Prioritize most-read sections
      sections = [...genreLearning.most_read_sections, ...sections]
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .slice(0, 6);
    }
    if (genreLearning.emphasis_weights) {
      emphasis = { ...emphasis, ...genreLearning.emphasis_weights };
    }
    if (genreLearning.best_opening_style) {
      opening_style = genreLearning.best_opening_style;
    }
  }

  // Adjust for star power
  if (config.star_power === 'high') {
    emphasis.performances = Math.min(0.4, emphasis.performances + 0.1);
  }

  // Adjust for scale
  if (config.budget_scale === 'big_budget') {
    emphasis.technical = Math.min(0.3, emphasis.technical + 0.1);
  } else if (config.budget_scale === 'indie') {
    emphasis.story = Math.min(0.4, emphasis.story + 0.1);
  }

  return { sections, length, emphasis, opening_style };
}

// ===== SECTION GENERATION =====

async function generateReviewSections(
  config: AutoReviewConfig,
  structure: ReturnType<typeof determineReviewStructure>,
  externalData: any,
  learnings: any[]
): Promise<Record<string, string>> {
  const sections: Record<string, string> = {};
  const groqKey = process.env.GROQ_API_KEY;

  const sectionPrompts: Record<string, string> = {
    verdict: `
"${config.movie_title}" సినిమా చూడాలా వద్దా - ఒక వాక్యంలో తీర్పు.
దర్శకుడు: ${config.director}
నటులు: ${config.cast.join(', ')}
${externalData.tmdb?.vote_average ? `TMDB రేటింగ్: ${externalData.tmdb.vote_average}/10` : ''}
    `,
    story: `
"${config.movie_title}" కథ విశ్లేషణ:
- కథ ఏమిటి?
- స్క్రీన్‌ప్లే ఎలా ఉంది?
- డైరెక్షన్ ఎలా ఉంది?
కథ స్పాయిలర్లు లేకుండా రాయండి.
    `,
    performances: `
"${config.movie_title}" లో నటీనటుల పనితీరు:
${config.cast.map(c => `- ${c}`).join('\n')}
ప్రతి ఒక్కరి పనితీరు గురించి 1-2 వాక్యాలు.
    `,
    direction: `
"${config.movie_title}" - దర్శకుడు ${config.director} విజన్:
- దర్శకుడు ఏమి చెప్పాలనుకున్నారు?
- సినిమా టోన్ ఎలా ఉంది?
- ఆడియన్స్‌కి ఏ మెసేజ్ ఇచ్చారు?
    `,
    music: `
"${config.movie_title}" సంగీతం:
- పాటలు ఎలా ఉన్నాయి?
- BGM ఎలా ఉంది?
- ఏ పాట బాగుంది?
    `,
    technical: `
"${config.movie_title}" సాంకేతిక అంశాలు:
- ఛాయాగ్రహణం
- ఎడిటింగ్
- VFX (ఉంటే)
- ప్రొడక్షన్ వాల్యూస్
    `,
    rating: `
"${config.movie_title}" కు తుది రేటింగ్ (10కి):
- కథ: X/10
- నటన: X/10
- దర్శకత్వం: X/10
- సంగీతం: X/10
- టోటల్: X/10
${externalData.sentiment > 0 ? 'ఆడియన్స్ పాజిటివ్‌గా ఉన్నారు' : externalData.sentiment < 0 ? 'ఆడియన్స్ మిక్స్డ్ రివ్యూస్' : ''}
    `,
  };

  // Get word counts based on structure length
  const wordCounts = { short: 50, medium: 80, long: 120 };
  const targetWords = wordCounts[structure.length];

  for (const section of structure.sections) {
    const prompt = sectionPrompts[section];
    if (!prompt) continue;

    try {
      if (groqKey) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `మీరు TeluguVibes మూవీ రివ్యూయర్. తెలుగులో సహజంగా, నిజాయితీగా రివ్యూలు రాయండి. ~${targetWords} పదాలలో.`
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        const data = await response.json();
        sections[section] = data.choices?.[0]?.message?.content || '';
      } else {
        sections[section] = `[${section} సెక్షన్ - API కీ అవసరం]`;
      }
    } catch (error) {
      console.error(`[Review] Error generating ${section}:`, error);
      sections[section] = `[${section} జనరేట్ చేయడంలో ఎర్రర్]`;
    }
  }

  return sections;
}

// ===== RATING GENERATION =====

async function generateRatings(
  config: AutoReviewConfig,
  externalData: any,
  learnings: any[]
): Promise<{
  overall: number;
  direction: number;
  screenplay: number;
  acting: number;
  music: number;
  cinematography: number;
  production: number;
}> {
  // Base rating from TMDB if available
  const baseRating = externalData.tmdb?.vote_average || 6.5;

  // Adjust based on factors
  let overall = baseRating;
  
  // Star power adjustment
  if (config.star_power === 'high') overall = Math.min(9, overall + 0.3);
  
  // Genre adjustment (some genres rate higher)
  const genreBonus: Record<string, number> = {
    'Action': 0.2,
    'Drama': 0.1,
    'Comedy': -0.1,
    'Romance': 0,
  };
  overall += genreBonus[config.genre[0]] || 0;

  // Generate individual ratings
  const variance = () => (Math.random() - 0.5) * 1.5;

  return {
    overall: Math.round(overall * 10) / 10,
    direction: Math.round((overall + variance()) * 10) / 10,
    screenplay: Math.round((overall + variance()) * 10) / 10,
    acting: Math.round((overall + variance() + (config.star_power === 'high' ? 0.3 : 0)) * 10) / 10,
    music: Math.round((overall + variance()) * 10) / 10,
    cinematography: Math.round((overall + variance()) * 10) / 10,
    production: Math.round((overall + variance() + (config.budget_scale === 'big_budget' ? 0.3 : 0)) * 10) / 10,
  };
}

// ===== REVIEW COMPILATION =====

function compileReview(
  config: AutoReviewConfig,
  sections: Record<string, string>,
  ratings: any,
  structure: any
): any {
  // Determine worth watching
  const worthWatching = ratings.overall >= 6.5;

  // Determine strengths/weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (ratings.acting > 7.5) strengths.push('Outstanding performances');
  if (ratings.direction > 7.5) strengths.push('Brilliant direction');
  if (ratings.music > 7.5) strengths.push('Memorable music');
  if (ratings.cinematography > 7.5) strengths.push('Stunning visuals');

  if (ratings.screenplay < 6) weaknesses.push('Weak screenplay');
  if (ratings.music < 6) weaknesses.push('Forgettable music');
  if (ratings.overall < 6) weaknesses.push('Below expectations');

  return {
    movie_id: config.movie_id,
    reviewer_type: 'admin',
    reviewer_name: 'TeluguVibes AI',
    overall_rating: ratings.overall,
    direction_rating: ratings.direction,
    screenplay_rating: ratings.screenplay,
    acting_rating: ratings.acting,
    music_rating: ratings.music,
    cinematography_rating: ratings.cinematography,
    production_rating: ratings.production,
    title: `${config.movie_title} రివ్యూ`,
    summary: sections.verdict || '',
    direction_review: sections.direction || sections.story || '',
    screenplay_review: sections.story || '',
    acting_review: sections.performances || '',
    music_review: sections.music || '',
    directors_vision: sections.direction || '',
    strengths,
    weaknesses,
    verdict: sections.rating || '',
    worth_watching: worthWatching,
    recommended_for: worthWatching ? ['Telugu movie lovers'] : ['Die-hard fans only'],
    is_featured: false,
    is_spoiler_free: true,
    status: 'draft', // Always draft, needs admin review
  };
}

// ===== LEARNING FROM USER BEHAVIOR =====

export async function recordReviewAnalytics(analytics: ReviewAnalytics): Promise<void> {
  const { data: review } = await supabase
    .from('movie_reviews')
    .select('movie_id, movies!inner(genres)')
    .eq('id', analytics.review_id)
    .single();

  if (!review) return;

  const genre = (review as any).movies?.genres?.[0] || 'general';

  // Update or create review learnings
  const { data: existing } = await supabase
    .from('review_learnings')
    .select('*')
    .eq('movie_genre', genre)
    .single();

  const mostReadSections = Object.entries(analytics.section_reads)
    .filter(([_, pct]) => pct > 70)
    .map(([section]) => section);

  const skippedSections = Object.entries(analytics.section_reads)
    .filter(([_, pct]) => pct < 30)
    .map(([section]) => section);

  if (existing) {
    // Merge with existing learnings
    await supabase
      .from('review_learnings')
      .update({
        most_read_sections: [...new Set([...existing.most_read_sections, ...mostReadSections])],
        skipped_sections: [...new Set([...existing.skipped_sections, ...skippedSections])],
        sample_size: existing.sample_size + 1,
        confidence: Math.min(0.95, existing.confidence + 0.01),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new learning
    await supabase
      .from('review_learnings')
      .insert({
        movie_genre: genre,
        most_read_sections: mostReadSections,
        skipped_sections: skippedSections,
        sample_size: 1,
        confidence: 0.3,
      });
  }

  // Record rating agreement
  if (analytics.rating_votes.agree + analytics.rating_votes.disagree > 0) {
    const agreementRate = analytics.rating_votes.agree / 
      (analytics.rating_votes.agree + analytics.rating_votes.disagree);

    await supabase
      .from('review_learnings')
      .update({
        rating_agreement_rate: agreementRate,
      })
      .eq('movie_genre', genre);
  }
}

// ===== RECORD GENERATION =====

async function recordReviewGeneration(
  config: AutoReviewConfig,
  structure: any,
  learnings: any[]
): Promise<void> {
  // Store in ai_learnings for future reference
  await supabase
    .from('ai_learnings')
    .insert({
      learning_type: 'review_format',
      category: 'review',
      entity_type: config.genre[0],
      pattern_description: `Review generated for ${config.budget_scale} ${config.genre[0]} with ${structure.length} length`,
      success_indicators: {
        structure: structure.sections,
        emphasis: structure.emphasis,
        opening: structure.opening_style,
      },
      confidence_score: 0.5,
      sample_size: 1,
      is_active: true,
    });
}

