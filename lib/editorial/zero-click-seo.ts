/**
 * TeluguVibes Zero-Click SEO Optimization
 * Optimize content to be QUOTED by search AI
 *
 * Even if users don't click, TeluguVibes gets cited
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface CitationBlock {
  id?: string;
  post_id: string;
  question: string;
  answer: string;
  answer_te?: string;
  schema_type: 'QAPage' | 'FAQPage' | 'HowTo' | 'Review' | 'NewsArticle';
  schema_json?: any;
}

export interface AnswerSummary {
  post_id: string;
  summary: string;
  summary_te?: string;
  target_query?: string;
}

export interface AuthorEntity {
  author_id: string;
  name: string;
  name_te?: string;
  bio?: string;
  expertise?: string[];
  credentials?: string[];
  profile_image?: string;
  social_links?: Record<string, string>;
}

// ===== CITATION BLOCKS =====

/**
 * Generate citation-friendly Q&A blocks for a post
 */
export async function generateCitationBlocks(postId: string): Promise<CitationBlock[]> {
  const { data: post } = await supabase
    .from('posts')
    .select('title, body, category')
    .eq('id', postId)
    .single();

  if (!post) return [];

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return [];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You create citation-friendly Q&A blocks for SEO.
Each answer must:
- Be 40-60 words
- Start with the direct answer (no preamble)
- Be factual and structured
- Use simple, quotable phrasing
- Be in Telugu (English names OK)

Generate 2-3 Q&A pairs that AI search engines would cite.
Output JSON: [{ "question": "...", "answer": "...", "schema_type": "QAPage|FAQPage" }]`
          },
          {
            role: 'user',
            content: `Title: ${post.title}
Category: ${post.category}
Content: ${post.body?.slice(0, 1000)}...

Generate citation blocks:`
          }
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const blocks = JSON.parse(jsonMatch[0]);

        const citationBlocks: CitationBlock[] = [];

        for (const block of blocks) {
          // Generate full schema
          const schemaJson = generateQASchema(block.question, block.answer, post.title);

          const { data: inserted } = await supabase
            .from('citation_blocks')
            .insert({
              post_id: postId,
              question: block.question,
              answer: block.answer,
              answer_te: block.answer, // Already in Telugu
              schema_type: block.schema_type || 'QAPage',
              schema_json: schemaJson,
            })
            .select()
            .single();

          if (inserted) {
            citationBlocks.push(inserted);
          }
        }

        return citationBlocks;
      }
    } catch (e) {
      console.error('Failed to parse citation blocks:', e);
    }
  } catch (error) {
    console.error('Citation block generation failed:', error);
  }

  return [];
}

/**
 * Generate Schema.org QAPage markup
 */
function generateQASchema(question: string, answer: string, articleTitle: string): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    'mainEntity': {
      '@type': 'Question',
      'name': question,
      'text': question,
      'answerCount': 1,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': answer,
        'dateCreated': new Date().toISOString(),
        'author': {
          '@type': 'Organization',
          'name': 'TeluguVibes',
          'url': 'https://teluguvibes.com'
        }
      }
    },
    'about': {
      '@type': 'Article',
      'name': articleTitle
    }
  };
}

/**
 * Get citation blocks for a post
 */
export async function getCitationBlocks(postId: string): Promise<CitationBlock[]> {
  const { data } = await supabase
    .from('citation_blocks')
    .select('*')
    .eq('post_id', postId);

  return data || [];
}

// ===== ANSWER SUMMARIES =====

/**
 * Generate answer-first summary (40-60 words)
 */
export async function generateAnswerSummary(postId: string): Promise<AnswerSummary | null> {
  const { data: post } = await supabase
    .from('posts')
    .select('title, body, category')
    .eq('id', postId)
    .single();

  if (!post) return null;

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // Fallback: Extract first paragraph
    const firstPara = post.body?.split('\n\n')[0]?.slice(0, 300) || '';
    return {
      post_id: postId,
      summary: firstPara,
      target_query: post.title,
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You create citation-friendly answer summaries.
Rules:
- Exactly 40-60 words
- Start with the direct answer (no "In this article..." or similar)
- Factual, structured phrasing
- Optimized for AI search citations
- In Telugu (English names OK)

Output JSON: { "summary": "...", "target_query": "likely search query" }`
          },
          {
            role: 'user',
            content: `Title: ${post.title}
Content: ${post.body?.slice(0, 800)}...

Generate answer summary:`
          }
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);

      const summary: AnswerSummary = {
        post_id: postId,
        summary: parsed.summary,
        summary_te: parsed.summary,
        target_query: parsed.target_query || post.title,
      };

      // Store summary
      await supabase
        .from('answer_summaries')
        .upsert({
          post_id: postId,
          summary: summary.summary,
          summary_te: summary.summary_te,
          target_query: summary.target_query,
          word_count: summary.summary.split(/\s+/).length,
          ai_generated: true,
        }, {
          onConflict: 'post_id'
        });

      return summary;
    } catch {
      console.error('Failed to parse summary');
    }
  } catch (error) {
    console.error('Summary generation failed:', error);
  }

  return null;
}

// ===== AUTHOR ENTITIES =====

/**
 * Create or update author entity
 */
export async function upsertAuthorEntity(author: AuthorEntity): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('author_entities')
    .upsert({
      author_id: author.author_id,
      name: author.name,
      name_te: author.name_te,
      bio: author.bio,
      expertise: author.expertise || [],
      credentials: author.credentials || [],
      profile_image: author.profile_image,
      social_links: author.social_links || {},
      same_as: Object.values(author.social_links || {}),
    }, {
      onConflict: 'author_id'
    });

  return { success: !error };
}

/**
 * Get author schema for JSON-LD
 */
export async function getAuthorSchema(authorId: string): Promise<any> {
  const { data } = await supabase
    .rpc('get_author_schema', { p_author_id: authorId });

  return data;
}

// ===== FULL POST SCHEMA =====

/**
 * Generate complete Schema.org markup for a post
 */
export async function generatePostSchema(postId: string, authorId?: string): Promise<any[]> {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return [];

  const schemas: any[] = [];

  // 1. NewsArticle Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': post.title,
    'description': post.excerpt || post.body?.slice(0, 160),
    'image': post.image_url,
    'datePublished': post.published_at || post.created_at,
    'dateModified': post.updated_at,
    'author': {
      '@type': 'Organization',
      'name': 'TeluguVibes',
      'url': 'https://teluguvibes.com'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'TeluguVibes',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://teluguvibes.com/logo.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `https://teluguvibes.com/post/${post.slug}`
    }
  };

  // Add author if available
  if (authorId) {
    const authorSchema = await getAuthorSchema(authorId);
    if (authorSchema) {
      articleSchema.author = authorSchema;
    }
  }

  schemas.push(articleSchema);

  // 2. Add Q&A schemas from citation blocks
  const citationBlocks = await getCitationBlocks(postId);
  for (const block of citationBlocks) {
    if (block.schema_json) {
      schemas.push(block.schema_json);
    }
  }

  // 3. Category-specific schema
  if (post.category === 'entertainment' || post.category === 'gossip') {
    // Check if about a person
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('*')
      .ilike('name_en', `%${post.title.split(' ')[0]}%`)
      .limit(1)
      .single();

    if (celebrity) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Person',
        'name': celebrity.name_en,
        'alternateName': celebrity.name_te,
        'birthDate': celebrity.birth_date,
        'deathDate': celebrity.death_date,
        'image': celebrity.profile_image,
        'description': celebrity.short_bio,
        'jobTitle': celebrity.occupation,
      });
    }
  }

  return schemas;
}

// ===== CITATION TRACKING =====

/**
 * Record when content is cited
 */
export async function recordCitation(
  postId: string,
  source: string,
  query?: string,
  snippetText?: string
): Promise<void> {
  // Update citation block if applicable
  const { data: citationBlock } = await supabase
    .from('citation_blocks')
    .select('id, cited_by')
    .eq('post_id', postId)
    .limit(1)
    .single();

  if (citationBlock) {
    const citedBy = [...(citationBlock.cited_by || []), source];

    await supabase
      .from('citation_blocks')
      .update({
        was_cited: true,
        cited_by: [...new Set(citedBy)],
        citation_date: new Date().toISOString(),
        citation_context: snippetText?.slice(0, 500),
      })
      .eq('id', citationBlock.id);
  }

  // Record in schema_performance
  await supabase
    .from('schema_performance')
    .insert({
      post_id: postId,
      citation_block_id: citationBlock?.id,
      event_type: 'ai_overview_citation',
      source,
      query,
      snippet_text: snippetText,
      event_date: new Date().toISOString().split('T')[0],
    });

  // Update author citation count
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (post?.author_id) {
    await supabase.rpc('update_author_stats');
  }
}

/**
 * Get citation analytics
 */
export async function getCitationAnalytics(days: number = 30): Promise<{
  totalCitations: number;
  citedPosts: number;
  topSources: { source: string; count: number }[];
  topQueries: { query: string; count: number }[];
}> {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: performance } = await supabase
    .from('schema_performance')
    .select('*')
    .eq('event_type', 'ai_overview_citation')
    .gte('event_date', sinceDate);

  if (!performance || performance.length === 0) {
    return {
      totalCitations: 0,
      citedPosts: 0,
      topSources: [],
      topQueries: [],
    };
  }

  // Aggregate
  const sourceCounts = new Map<string, number>();
  const queryCounts = new Map<string, number>();
  const postIds = new Set<string>();

  for (const p of performance) {
    postIds.add(p.post_id);

    if (p.source) {
      sourceCounts.set(p.source, (sourceCounts.get(p.source) || 0) + 1);
    }
    if (p.query) {
      queryCounts.set(p.query, (queryCounts.get(p.query) || 0) + 1);
    }
  }

  return {
    totalCitations: performance.length,
    citedPosts: postIds.size,
    topSources: Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topQueries: Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

// ===== SEO OPTIMIZATION CHECK =====

/**
 * Check if post is optimized for zero-click
 */
export async function checkZeroClickOptimization(postId: string): Promise<{
  score: number;
  checks: { name: string; passed: boolean; recommendation?: string }[];
}> {
  const checks: { name: string; passed: boolean; recommendation?: string }[] = [];

  // Check answer summary
  const { data: summary } = await supabase
    .from('answer_summaries')
    .select('summary, word_count')
    .eq('post_id', postId)
    .single();

  checks.push({
    name: 'Answer Summary (40-60 words)',
    passed: !!summary && (summary.word_count || 0) >= 40 && (summary.word_count || 0) <= 60,
    recommendation: !summary
      ? 'Generate an answer-first summary'
      : (summary.word_count || 0) < 40
        ? 'Summary too short, aim for 40-60 words'
        : (summary.word_count || 0) > 60
          ? 'Summary too long, trim to 40-60 words'
          : undefined,
  });

  // Check citation blocks
  const { count: citationCount } = await supabase
    .from('citation_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  checks.push({
    name: 'Citation Blocks (Q&A)',
    passed: (citationCount || 0) >= 2,
    recommendation: (citationCount || 0) < 2
      ? 'Add at least 2 Q&A citation blocks'
      : undefined,
  });

  // Check human POV
  const { data: pov } = await supabase
    .from('human_pov')
    .select('is_approved')
    .eq('post_id', postId)
    .single();

  checks.push({
    name: 'Human POV',
    passed: !!pov?.is_approved,
    recommendation: !pov
      ? 'Add human editorial perspective'
      : !pov.is_approved
        ? 'POV needs approval'
        : undefined,
  });

  // Check schema markup
  const { data: citationBlocks } = await supabase
    .from('citation_blocks')
    .select('schema_json')
    .eq('post_id', postId);

  const hasSchema = citationBlocks?.some(c => c.schema_json);
  checks.push({
    name: 'Schema.org Markup',
    passed: !!hasSchema,
    recommendation: !hasSchema ? 'Generate Schema.org Q&A markup' : undefined,
  });

  // Calculate score
  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return { score, checks };
}
