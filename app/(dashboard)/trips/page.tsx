'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Route, Eye, X, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Trip, TripStatus } from '@/types';
import { getTripStatusClass, formatDate, formatRelative, formatCurrency, formatKm } from '@/lib/utils';
import { debounce } from '@/lib/utils';
import TripFormWizard from '@/components/trips/TripFormWizard';
import CompleteTripModal from '@/components/trips/CompleteTripModal';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const STATUS_TABS: (TripStatus | 'all')[] = ['all', 'Draft', 'Dispatched', 'Completed', 'Cancelled'];

export default function TripsPage() {
  const { profile } = useAppStore();
  const supabase = createClient();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TripStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('trips')
      .select('*, vehicle:vehicles(name, registration_number), driver:drivers(name, contact_number)')
      .order('created_at', { ascending: false });

    if (profile?.role === 'driver') {
      const { data: driverRec } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (driverRec) {
        query = query.eq('driver_id', driverRec.id);
      } else {
        setTrips([]);
        setLoading(false);
        return;
      }
    }

    if (activeTab !== 'all') query = query.eq('status', activeTab);
    if (search) {
      query = query.or(`source.ilike.%${search}%,destination.ilike.%${search}%,trip_number.ilike.%${search}%`);
    }

    const { data } = await query;
    setTrips((data || []) as Trip[]);
    setLoading(false);
  }, [activeTab, search, profile]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const debouncedSearch = useCallback(debounce((v: string) => setSearch(v), 300), []);

  const cancelTrip = async (trip: Trip) => {
    if (!confirm(`Cancel trip ${trip.trip_number}?`)) return;
    const res = await fetch(`/api/trips/${trip.id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else { toast.success('Trip cancelled'); loadTrips(); }
  };

  // Count per status for tab badges
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from('trips').select('status').then(({ data }) => {
      if (!data) return;
      const c: Record<string, number> = { all: data.length };
      data.forEach((t: { status: string }) => { c[t.status] = (c[t.status] || 0) + 1; });
      setCounts(c);
    });
  }, [trips]);

  return (
    <div className="space-y-4 animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Management</h1>
          <p className="page-subtitle">{trips.length} trip{trips.length !== 1 ? 's' : ''} shown</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'fleet_manager') && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={16} /> Create Trip
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="tab-nav">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'all' ? 'All' : tab}
            {counts[tab] ? (
              <span
                className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: activeTab === tab ? 'rgba(0,0,0,0.2)' : 'var(--color-bg-hover)',
                  color: activeTab === tab ? '#000' : 'var(--color-text-muted)',
                }}
              >
                {counts[tab]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          className="input max-w-sm"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Search by route or trip number…"
          onChange={e => debouncedSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Trip #</th>
              <th>Route</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Cargo</th>
              <th>Distance</th>
              <th>AI Risk</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((_, j) => <td key={j}><div className="skeleton h-4 w-16 rounded" /></td>)}</tr>
              ))
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Route size={20} /></div>
                    <div className="empty-state-title">No trips found</div>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm mt-2">
                      <Plus size={14} /> Create First Trip
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <motion.tr key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-amber-400)' }}>
                      {trip.trip_number}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {trip.source}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>→ {trip.destination}</div>
                  </td>
                  <td>
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {(trip.vehicle as { name?: string })?.name}
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {(trip.vehicle as { registration_number?: string })?.registration_number}
                    </div>
                  </td>
                  <td><span className="text-xs">{(trip.driver as { name?: string })?.name}</span></td>
                  <td><span className="text-xs font-mono">{trip.cargo_weight} kg</span></td>
                  <td><span className="text-xs font-mono">{trip.planned_distance} km</span></td>
                  <td>
                    {trip.ai_risk_level ? (
                      <span className={`badge badge-risk-${trip.ai_risk_level.toLowerCase()}`}>
                        {trip.ai_risk_level === 'Low' ? '🟢' : trip.ai_risk_level === 'Medium' ? '🟡' : '🔴'} {trip.ai_risk_level}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  <td>
                    <span className={`badge ${getTripStatusClass(trip.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRelative(trip.created_at)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link href={`/trips/${trip.id}`} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="View"><Eye size={13} /></Link>
                      {(profile?.role === 'admin' || profile?.role === 'fleet_manager') && trip.status === 'Dispatched' && (
                        <>
                          <button onClick={() => setCompleteTrip(trip)} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Complete" style={{ color: '#22c55e' }}>
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => cancelTrip(trip)} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Cancel" style={{ color: 'var(--color-danger)' }}>
                            <X size={13} />
                          </button>
                        </>
                      )}
                      {(profile?.role === 'admin' || profile?.role === 'fleet_manager') && trip.status === 'Draft' && (
                        <button onClick={() => cancelTrip(trip)} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Cancel" style={{ color: 'var(--color-danger)' }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <TripFormWizard
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadTrips(); }}
        />
      )}

      {completeTrip && (
        <CompleteTripModal
          trip={completeTrip}
          onClose={() => setCompleteTrip(null)}
          onSuccess={() => { setCompleteTrip(null); loadTrips(); }}
        />
      )}
    </div>
  );
}

