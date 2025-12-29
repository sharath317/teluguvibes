/**
 * Individual Dedication Admin API
 * Approve, reject, or delete dedications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT: Update dedication (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: any = {};

  if (body.status) {
    updateData.status = body.status;

    // If approving, set/update expiry
    if (body.status === 'approved') {
      const hours = body.display_duration_hours || 24;
      updateData.expires_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }
  }

  if (body.is_premium !== undefined) {
    updateData.is_premium = body.is_premium;
  }

  if (body.moderation_notes) {
    updateData.moderation_notes = body.moderation_notes;
  }

  if (body.animation_type) {
    updateData.animation_type = body.animation_type;
  }

  const { data, error } = await supabase
    .from('dedications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update dedication' }, { status: 500 });
  }

  return NextResponse.json({ dedication: data });
}

// DELETE: Delete dedication
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('dedications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete dedication' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
