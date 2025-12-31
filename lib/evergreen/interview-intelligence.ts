/**
 * INTERVIEW INTELLIGENCE ENGINE
 *
 * One-time extraction of insights from interviews.
 * Never reprocesses the same interview twice.
 *
 * WHY THIS APPROACH:
 * - Process once, store forever
 * - Hash-based deduplication (same interview = same hash)
 * - Structured insights for "What X said about Y" queries
 * - No video processing - text only (captions, transcripts, articles)
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface InterviewSource {
  source_url: string;
  source_type: 'youtube' | 'news' | 'podcast';
  title: string;
  published_date?: string;
  interviewer?: string;
  interviewee_name: string;
  transcript: string;
}

interface ExtractedInsight {
  insight_type: 'opinion' | 'controversy' | 'career_reflection' | 'trivia' | 'quote' | 'revelation';
  content_te: string;
  content_en?: string;
  topic: string;
  related_celebrity_name?: string;
  related_movie_title?: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'controversial';
  importance_score: number;
  is_quotable: boolean;
}

/**
 * Check if interview has already been processed
 * Uses URL + content hash for deduplication
 */
export async function isInterviewProcessed(sourceUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from('interview_sources')
    .select('id, is_processed')
    .eq('source_url', sourceUrl)
    .single();

  return data?.is_processed === true;
}

/**
 * Create content hash for deduplication
 */
function createContentHash(content: string): string {
  // Simple hash using built-in crypto
  const encoder = new TextEncoder();
  const data = encoder.encode(content.substring(0, 5000)); // First 5000 chars
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Process an interview and extract insights
 * This runs ONCE per interview, results are cached permanently
 */
export async function processInterview(source: InterviewSource): Promise<ExtractedInsight[]> {
  console.log(`🎙️ Processing interview: ${source.title}`);

  // Check if already processed
  const alreadyProcessed = await isInterviewProcessed(source.source_url);
  if (alreadyProcessed) {
    console.log(`⏭️ Interview already processed, skipping: ${source.source_url}`);
    return [];
  }

  // Create hash for deduplication
  const contentHash = createContentHash(source.transcript);

  // Check if same content exists with different URL
  const { data: existingHash } = await supabase
    .from('interview_sources')
    .select('id')
    .eq('source_hash', contentHash)
    .single();

  if (existingHash) {
    console.log(`⏭️ Same content already exists (different URL), skipping`);
    return [];
  }

  // Find celebrity in our database
  const { data: celebrity } = await supabase
    .from('celebrities')
    .select('id, name_en')
    .or(`name_en.ilike.%${source.interviewee_name}%,name_te.ilike.%${source.interviewee_name}%`)
    .limit(1)
    .single();

  // Register the interview source
  const { data: interviewRecord, error: insertError } = await supabase
    .from('interview_sources')
    .insert({
      source_url: source.source_url,
      source_type: source.source_type,
      source_hash: contentHash,
      title: source.title,
      published_date: source.published_date,
      interviewer: source.interviewer,
      interviewee_id: celebrity?.id,
      interviewee_name: source.interviewee_name,
      is_processed: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to register interview:', insertError);
    return [];
  }

  // Extract insights using AI
  const insights = await extractInsightsWithAI(source.transcript, source.interviewee_name);

  // Store insights
  for (const insight of insights) {
    // Find related celebrity if mentioned
    let relatedCelebId = null;
    if (insight.related_celebrity_name) {
      const { data: relatedCeleb } = await supabase
        .from('celebrities')
        .select('id')
        .ilike('name_en', `%${insight.related_celebrity_name}%`)
        .limit(1)
        .single();
      relatedCelebId = relatedCeleb?.id;
    }

    // Find related movie if mentioned
    let relatedMovieId = null;
    if (insight.related_movie_title) {
      const { data: relatedMovie } = await supabase
        .from('movies')
        .select('id')
        .or(`title_en.ilike.%${insight.related_movie_title}%,title_te.ilike.%${insight.related_movie_title}%`)
        .limit(1)
        .single();
      relatedMovieId = relatedMovie?.id;
    }

    await supabase.from('interview_insights').insert({
      interview_id: interviewRecord.id,
      celebrity_id: celebrity?.id,
      insight_type: insight.insight_type,
      content_te: insight.content_te,
      content_en: insight.content_en,
      topic: insight.topic,
      related_celebrity_id: relatedCelebId,
      related_movie_id: relatedMovieId,
      sentiment: insight.sentiment,
      importance_score: insight.importance_score,
      is_quotable: insight.is_quotable,
    });
  }

  // Mark as processed
  await supabase
    .from('interview_sources')
    .update({ is_processed: true, processed_at: new Date().toISOString() })
    .eq('id', interviewRecord.id);

  console.log(`✅ Extracted ${insights.length} insights from interview`);

  return insights;
}

/**
 * AI-powered insight extraction
 */
async function extractInsightsWithAI(transcript: string, intervieweeName: string): Promise<ExtractedInsight[]> {
  // Limit transcript size to avoid token limits
  const truncatedTranscript = transcript.substring(0, 8000);

  const prompt = `You are an entertainment journalist analyzing a Telugu celebrity interview.

INTERVIEWEE: ${intervieweeName}

TRANSCRIPT:
${truncatedTranscript}

Extract the most interesting insights from this interview. For each insight, provide:

1. insight_type: one of [opinion, controversy, career_reflection, trivia, quote, revelation]
2. content_te: The insight in Telugu (translate if needed)
3. content_en: The insight in English
4. topic: What the insight is about
5. related_celebrity_name: If they mentioned another celebrity by name
6. related_movie_title: If they mentioned a specific movie
7. sentiment: positive, negative, neutral, or controversial
8. importance_score: 1-100 (how newsworthy is this?)
9. is_quotable: true if this is a memorable quote

Focus on:
- Controversial statements
- Career revelations
- Rare trivia
- Strong opinions about other celebrities/movies
- Industry insights

Return as JSON array. Extract 3-7 insights maximum.

IMPORTANT: Return ONLY valid JSON, no markdown.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';

    // Parse JSON (handle potential markdown wrapping)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '');
    }

    const insights: ExtractedInsight[] = JSON.parse(cleanJson);
    return insights;
  } catch (error) {
    console.error('AI insight extraction failed:', error);
    return [];
  }
}

/**
 * Get insights for a specific celebrity
 */
export async function getCelebrityInsights(celebrityId: string, limit: number = 10) {
  const { data } = await supabase
    .from('interview_insights')
    .select(`
      *,
      interview_sources (title, source_url, published_date)
    `)
    .eq('celebrity_id', celebrityId)
    .order('importance_score', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get "What X said about Y" insights
 */
export async function getInsightsAbout(
  aboutCelebrityId?: string,
  aboutMovieId?: string,
  topic?: string
) {
  let query = supabase
    .from('interview_insights')
    .select(`
      *,
      celebrities (name_en, name_te),
      interview_sources (title, source_url)
    `)
    .order('importance_score', { ascending: false })
    .limit(20);

  if (aboutCelebrityId) {
    query = query.eq('related_celebrity_id', aboutCelebrityId);
  }
  if (aboutMovieId) {
    query = query.eq('related_movie_id', aboutMovieId);
  }
  if (topic) {
    query = query.ilike('topic', `%${topic}%`);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Get controversial insights (for trending section)
 */
export async function getControversialInsights(limit: number = 5) {
  const { data } = await supabase
    .from('interview_insights')
    .select(`
      *,
      celebrities (name_en, name_te, image_url),
      interview_sources (title, source_url)
    `)
    .eq('insight_type', 'controversy')
    .order('importance_score', { ascending: false })
    .limit(limit);

  return data || [];
}
