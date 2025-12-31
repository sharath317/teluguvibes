/**
 * ADMIN BULK OPERATIONS API
 *
 * Handles bulk actions on content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBulkAction, undoBulkAction, type BulkActionRequest } from '@/lib/admin/bulk-operations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body as BulkActionRequest;

    if (!action.action || !action.entity_ids || action.entity_ids.length === 0) {
      return NextResponse.json(
        { error: 'action and entity_ids are required' },
        { status: 400 }
      );
    }

    if (!action.entity_type) {
      return NextResponse.json(
        { error: 'entity_type is required' },
        { status: 400 }
      );
    }

    const result = await executeBulkAction(action);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bulk operation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk operation failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const undoToken = searchParams.get('undo_token');

    if (!undoToken) {
      return NextResponse.json(
        { error: 'undo_token is required' },
        { status: 400 }
      );
    }

    const result = await undoBulkAction(undoToken);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Undo failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Undo failed' },
      { status: 500 }
    );
  }
}



