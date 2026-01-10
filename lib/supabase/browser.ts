'use client';

/**
 * Supabase Browser Client
 * Client-side Supabase instance for browser operations
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Create or return existing browser Supabase client
 */
export function createBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Get the browser client (alias for createBrowserClient)
 */
export function getBrowserClient(): SupabaseClient {
  return createBrowserClient();
}
