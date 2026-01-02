/**
 * Dynamic Sitemap Generation
 * 
 * Generates sitemap.xml with:
 * - All movie review pages
 * - Category pages
 * - Static pages
 * - Celebrity pages
 * 
 * Updates automatically with database changes.
 */

import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://teluguvarttalu.com';

// Supabase client for data fetching
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase credentials not available for sitemap generation');
    return null;
  }
  
  return createClient(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseClient();
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/hot`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/celebrities`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ];

  // Category pages
  const categories = [
    'gossip', 'sports', 'entertainment', 'politics', 'technology',
    'health', 'business', 'crime', 'education', 'lifestyle'
  ];
  
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${BASE_URL}/category/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Dynamic movie review pages
  let moviePages: MetadataRoute.Sitemap = [];
  
  if (supabase) {
    try {
      const { data: movies } = await supabase
        .from('movies')
        .select('slug, updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(5000); // Limit to prevent huge sitemaps
      
      if (movies) {
        moviePages = movies.map(movie => ({
          url: `${BASE_URL}/reviews/${movie.slug}`,
          lastModified: movie.updated_at ? new Date(movie.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));
      }
    } catch (error) {
      console.error('Error fetching movies for sitemap:', error);
    }
  }

  // Dynamic post pages
  let postPages: MetadataRoute.Sitemap = [];
  
  if (supabase) {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(2000);
      
      if (posts) {
        postPages = posts.map(post => ({
          url: `${BASE_URL}/post/${post.slug}`,
          lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }));
      }
    } catch (error) {
      console.error('Error fetching posts for sitemap:', error);
    }
  }

  // Story pages
  let storyPages: MetadataRoute.Sitemap = [];
  
  if (supabase) {
    try {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1000);
      
      if (stories) {
        storyPages = stories.map(story => ({
          url: `${BASE_URL}/stories/${story.id}`,
          lastModified: story.updated_at ? new Date(story.updated_at) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        }));
      }
    } catch (error) {
      console.error('Error fetching stories for sitemap:', error);
    }
  }

  return [
    ...staticPages,
    ...categoryPages,
    ...moviePages,
    ...postPages,
    ...storyPages,
  ];
}

