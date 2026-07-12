import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(*), driver:drivers(*)')
    .eq('id', id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  if (trip.status !== 'Draft') {
    return NextResponse.json({ error: `Cannot dispatch a trip with status: ${trip.status}` }, { status: 400 });
  }

  // Re-validate business rules server-side
  const vehicle = trip.vehicle;
  const driver = trip.driver;

  if (!vehicle || vehicle.status !== 'Available') {
    return NextResponse.json({ error: `Vehicle ${vehicle?.name} is not available (status: ${vehicle?.status})` }, { status: 400 });
  }

  if (!driver || driver.status !== 'Available') {
    return NextResponse.json({ error: `Driver ${driver?.name} is not available (status: ${driver?.status})` }, { status: 400 });
  }

  if (new Date(driver.license_expiry_date) < new Date()) {
    return NextResponse.json({ error: `Driver ${driver.name}'s license has expired` }, { status: 400 });
  }

  if (trip.cargo_weight > vehicle.max_load_capacity) {
    return NextResponse.json({
      error: `Cargo weight (${trip.cargo_weight}kg) exceeds vehicle max capacity (${vehicle.max_load_capacity}kg)`
    }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Atomic updates
  const [tripUpdate, vehicleUpdate, driverUpdate] = await Promise.all([
    supabase.from('trips').update({
      status: 'Dispatched',
      dispatched_at: now,
      updated_at: now,
    }).eq('id', id),
    supabase.from('vehicles').update({ status: 'On Trip', updated_at: now }).eq('id', vehicle.id),
    supabase.from('drivers').update({ status: 'On Trip', updated_at: now }).eq('id', driver.id),
  ]);

  if (tripUpdate.error || vehicleUpdate.error || driverUpdate.error) {
    return NextResponse.json({ error: 'Failed to dispatch trip' }, { status: 500 });
  }

  // Send notifications
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('notifications').insert({
      recipient_id: user.id,
      type: 'trip_dispatched',
      title: 'Trip Dispatched',
      message: `${trip.trip_number}: ${trip.source} → ${trip.destination} is now underway.`,
      link: `/trips/${id}`,
    });
  }

  return NextResponse.json({ success: true, trip_number: trip.trip_number });
}
