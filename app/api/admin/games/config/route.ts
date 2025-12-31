/**
 * ADMIN GAMES CONFIG API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('game_admin_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ config: data || null });
  } catch (error) {
    console.error('Failed to fetch game config:', error);
    return NextResponse.json({ config: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Upsert config
    const { error } = await supabase
      .from('game_admin_config')
      .upsert({
        ...config,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save game config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
