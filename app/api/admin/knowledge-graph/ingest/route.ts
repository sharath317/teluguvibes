/**
 * API Route: Trigger Knowledge Graph Ingestion
 * POST /api/admin/knowledge-graph/ingest
 */

import { NextResponse } from 'next/server';
import { runFullIngestion, ingestTeluguActors, ingestLegendaryActors } from '@/lib/knowledge-graph/wikidata-ingestion';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'full' } = body;

    let result;

    switch (type) {
      case 'actors':
        result = await ingestTeluguActors();
        break;
      case 'legendary':
        result = await ingestLegendaryActors();
        break;
      case 'full':
      default:
        result = await runFullIngestion();
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Knowledge graph ingestion failed:', error);
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Telugu Cinema Knowledge Graph Ingestion API',
    endpoints: {
      'POST /api/admin/knowledge-graph/ingest': 'Trigger ingestion',
      'POST body': { type: 'full | actors | legendary' },
    },
  });
}








