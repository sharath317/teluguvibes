/**
 * Admin Intelligence API - Trigger Ingestion
 */

import { NextResponse } from 'next/server';
import { runFullIngestion } from '@/lib/intelligence/trend-ingestion';

export async function POST() {
  try {
    const result = await runFullIngestion();
    return NextResponse.json({ 
      success: true, 
      message: 'Ingestion complete',
      ...result 
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ingestion failed' 
    }, { status: 500 });
  }
}

