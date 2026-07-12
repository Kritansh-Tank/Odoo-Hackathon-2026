import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(*), driver:drivers(*)')
    .eq('id', id)
    .single();

  if (error || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (!['Draft', 'Dispatched'].includes(trip.status)) {
    return NextResponse.json({ error: 'Cannot cancel a completed or already cancelled trip' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const wasDispatched = trip.status === 'Dispatched';

  // Business Rule 8: Only revert vehicle/driver if trip was dispatched
  await supabase.from('trips').update({ status: 'Cancelled', cancelled_at: now, updated_at: now }).eq('id', id);

  if (wasDispatched) {
    await Promise.all([
      supabase.from('vehicles').update({ status: 'Available', updated_at: now }).eq('id', trip.vehicle.id),
      supabase.from('drivers').update({ status: 'Available', updated_at: now }).eq('id', trip.driver.id),
    ]);
  }

  return NextResponse.json({ success: true });
}
