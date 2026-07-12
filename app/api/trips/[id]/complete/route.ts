import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { actual_distance, fuel_consumed, revenue, notes } = body;

  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(*), driver:drivers(*)')
    .eq('id', id)
    .single();

  if (tripError || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.status !== 'Dispatched') return NextResponse.json({ error: 'Only dispatched trips can be completed' }, { status: 400 });

  const now = new Date().toISOString();

  const [tripUpdate, vehicleUpdate, driverUpdate] = await Promise.all([
    supabase.from('trips').update({
      status: 'Completed',
      actual_distance,
      fuel_consumed,
      revenue,
      notes: notes || trip.notes,
      completed_at: now,
      updated_at: now,
    }).eq('id', id),
    supabase.from('vehicles').update({
      status: 'Available',
      odometer: (trip.vehicle.odometer || 0) + actual_distance,
      updated_at: now,
    }).eq('id', trip.vehicle.id),
    supabase.from('drivers').update({ status: 'Available', updated_at: now }).eq('id', trip.driver.id),
  ]);

  if (tripUpdate.error || vehicleUpdate.error || driverUpdate.error) {
    return NextResponse.json({ error: 'Failed to complete trip' }, { status: 500 });
  }

  // Auto log fuel entry
  if (fuel_consumed > 0) {
    await supabase.from('fuel_logs').insert({
      vehicle_id: trip.vehicle.id,
      trip_id: id,
      liters: fuel_consumed,
      cost: fuel_consumed * 100, // Default ₹100/L estimate
      date: now.split('T')[0],
      odometer_reading: (trip.vehicle.odometer || 0) + actual_distance,
    });
  }

  // Notification
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('notifications').insert({
      recipient_id: user.id,
      type: 'trip_completed',
      title: 'Trip Completed',
      message: `${trip.trip_number}: ${trip.source} → ${trip.destination} completed. ${actual_distance}km driven.`,
      link: `/trips/${id}`,
    });
  }

  return NextResponse.json({ success: true });
}
