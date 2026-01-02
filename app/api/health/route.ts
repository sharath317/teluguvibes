import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * System Health API
 * 
 * Returns comprehensive health status:
 * - Database connectivity
 * - Table counts
 * - Pipeline status
 * - Last ingestion times
 * - Error rates
 */

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheck[];
  summary: {
    totalMovies: number;
    totalReviews: number;
    orphanCount: number;
    lastUpdated: string | null;
  };
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Missing Supabase credentials',
      };
    }

    // Simple connectivity check
    const { error } = await supabase.from('movies').select('id').limit(1);
    const latency = Date.now() - startTime;

    if (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error.message,
        latencyMs: latency,
      };
    }

    return {
      name: 'database',
      status: latency < 1000 ? 'healthy' : 'degraded',
      message: latency < 1000 ? 'Connected' : 'Slow response',
      latencyMs: latency,
    };
  } catch (err) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

async function checkMoviesTable(): Promise<HealthCheck & { count: number; lastUpdated: string | null }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        name: 'movies',
        status: 'unhealthy',
        message: 'No database connection',
        count: 0,
        lastUpdated: null,
      };
    }

    const { count, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (countError) {
      return {
        name: 'movies',
        status: 'unhealthy',
        message: countError.message,
        count: 0,
        lastUpdated: null,
      };
    }

    // Get last updated
    const { data: lastMovie } = await supabase
      .from('movies')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const movieCount = count || 0;
    
    return {
      name: 'movies',
      status: movieCount > 1000 ? 'healthy' : 'degraded',
      message: `${movieCount.toLocaleString()} published movies`,
      count: movieCount,
      lastUpdated: lastMovie?.updated_at || null,
      details: { count: movieCount },
    };
  } catch (err) {
    return {
      name: 'movies',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      count: 0,
      lastUpdated: null,
    };
  }
}

async function checkReviewsTable(): Promise<HealthCheck & { count: number }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        name: 'reviews',
        status: 'unhealthy',
        message: 'No database connection',
        count: 0,
      };
    }

    const { count, error: countError } = await supabase
      .from('movie_reviews')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return {
        name: 'reviews',
        status: 'unhealthy',
        message: countError.message,
        count: 0,
      };
    }

    const reviewCount = count || 0;
    
    return {
      name: 'reviews',
      status: reviewCount > 500 ? 'healthy' : 'degraded',
      message: `${reviewCount.toLocaleString()} reviews`,
      count: reviewCount,
      details: { count: reviewCount },
    };
  } catch (err) {
    return {
      name: 'reviews',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      count: 0,
    };
  }
}

async function checkOrphans(): Promise<HealthCheck & { count: number }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        name: 'orphans',
        status: 'unhealthy',
        message: 'No database connection',
        count: 0,
      };
    }

    const { count, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null)
      .eq('is_published', true);

    if (countError) {
      return {
        name: 'orphans',
        status: 'unhealthy',
        message: countError.message,
        count: 0,
      };
    }

    const orphanCount = count || 0;
    
    return {
      name: 'orphans',
      status: orphanCount === 0 ? 'healthy' : orphanCount < 100 ? 'degraded' : 'unhealthy',
      message: orphanCount === 0 ? 'No orphan records' : `${orphanCount} orphan records`,
      count: orphanCount,
      details: { count: orphanCount },
    };
  } catch (err) {
    return {
      name: 'orphans',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      count: 0,
    };
  }
}

export async function GET() {
  try {
    const startTime = Date.now();

    // Run all health checks in parallel
    const [dbCheck, moviesCheck, reviewsCheck, orphansCheck] = await Promise.all([
      checkDatabase(),
      checkMoviesTable(),
      checkReviewsTable(),
      checkOrphans(),
    ]);

    const checks = [dbCheck, moviesCheck, reviewsCheck, orphansCheck];

    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    
    const overallStatus: HealthResponse['status'] = 
      hasUnhealthy ? 'unhealthy' : 
      hasDegraded ? 'degraded' : 
      'healthy';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
      summary: {
        totalMovies: moviesCheck.count,
        totalReviews: reviewsCheck.count,
        orphanCount: orphansCheck.count,
        lastUpdated: moviesCheck.lastUpdated,
      },
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: [{
        name: 'system',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      }],
      summary: {
        totalMovies: 0,
        totalReviews: 0,
        orphanCount: 0,
        lastUpdated: null,
      },
    } as HealthResponse, { status: 503 });
  }
}

