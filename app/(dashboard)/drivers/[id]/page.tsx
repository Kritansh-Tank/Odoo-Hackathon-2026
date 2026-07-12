'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Edit, Mail, Shield, Star, Route, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Driver, Trip, DriverWithExpiry } from '@/types';
import {
  formatDate, formatRelative, getTripStatusClass,
  getDriverStatusClass, getLicenseDaysUntilExpiry,
} from '@/lib/utils';
import DriverFormModal from '@/components/drivers/DriverFormModal';
import { toast } from 'sonner';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [driver, setDriver] = useState<DriverWithExpiry | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const load = async () => {
    const [dRes, tRes] = await Promise.all([
      supabase.from('drivers_expiry_status').select('*').eq('id', id).single(),
      supabase.from('trips')
        .select('*, vehicle:vehicles(name, registration_number)')
        .eq('driver_id', id)
        .order('created_at', { ascending: false }),
    ]);
    if (dRes.error || !dRes.data) { router.push('/drivers'); return; }
    setDriver(dRes.data as DriverWithExpiry);
    setTrips((tRes.data || []) as Trip[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const sendReminder = async () => {
    if (!driver) return;
    setSendingReminder(true);
    const res = await fetch('/api/ai/license-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_name: driver.name,
        license_number: driver.license_number,
        expiry_date: formatDate(driver.license_expiry_date),
        days_until_expiry: driver.days_until_expiry,
      }),
    });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else toast.success(`License reminder sent ✓`);
    setSendingReminder(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-48 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!driver) return null;

  const days = driver.days_until_expiry;
  const isExpired = days < 0;
  const isExpiringSoon = days >= 0 && days <= 30;
  const completedTrips = trips.filter(t => t.status === 'Completed').length;
  const totalRevenue = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.revenue || 0), 0);
  const totalDistance = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.actual_distance || 0), 0);

  return (
    <div className="space-y-6 animate-fadein max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/drivers" className="btn btn-ghost btn-sm mt-1">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{driver.name}</h1>
            <span className={`badge ${getDriverStatusClass(driver.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {driver.status}
            </span>
            <span className={`badge ${isExpired ? 'badge-suspended' : isExpiringSoon ? 'badge-in-shop' : 'badge-available'}`}>
              {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days}d until expiry`}
            </span>
          </div>
          <p className="page-subtitle">{driver.license_category} License · {driver.license_number}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn btn-secondary btn-sm">
            <Edit size={14} /> Edit
          </button>
          {(isExpired || isExpiringSoon) && (
            <button onClick={sendReminder} disabled={sendingReminder} className="btn btn-primary btn-sm">
              {sendingReminder ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Send Reminder
            </button>
          )}
        </div>
      </div>

      {/* License expiry alert */}
      {(isExpired || isExpiringSoon) && (
        <div className={`alert ${isExpired ? 'alert-danger' : 'alert-warning'}`}>
          <Shield size={16} />
          <span className="text-sm">
            {isExpired
              ? `License expired ${Math.abs(days)} days ago. This driver cannot be assigned to any trip.`
              : `License expires in ${days} days on ${formatDate(driver.license_expiry_date)}. Send a reminder now.`}
          </span>
        </div>
      )}

      {/* Info card */}
      <div className="card grid grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { label: 'Safety Score', value: `${driver.safety_score}/100`, note: driver.safety_score >= 90 ? '⭐ Excellent' : driver.safety_score >= 75 ? '✅ Good' : '⚠️ Needs attention' },
          { label: 'License Expiry', value: formatDate(driver.license_expiry_date), note: driver.license_status },
          { label: 'Contact', value: driver.contact_number, note: 'Primary' },
          { label: 'Address', value: driver.address || '—', note: 'Location' },
          { label: 'Completed Trips', value: String(completedTrips), note: `${trips.length} total` },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, note: `${totalDistance.toLocaleString()} km` },
        ].map(item => (
          <div key={item.label}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{item.label}</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{item.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.note}</div>
          </div>
        ))}
      </div>

      {/* Safety score bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Star size={16} style={{ color: '#f59e0b' }} /> Safety Score
          </h3>
          <span className="text-2xl font-bold" style={{
            color: driver.safety_score >= 90 ? '#22c55e' : driver.safety_score >= 75 ? '#f59e0b' : '#ef4444'
          }}>
            {driver.safety_score}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${driver.safety_score}%`,
              background: driver.safety_score >= 90 ? '#22c55e' : driver.safety_score >= 75 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>0 — Poor</span>
          <span className="text-xs" style={{ color: '#f59e0b' }}>75 — Good</span>
          <span className="text-xs" style={{ color: '#22c55e' }}>90+ — Excellent</span>
        </div>
      </div>

      {/* Trip history */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Trip History ({trips.length})
        </h3>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead><tr><th>Trip #</th><th>Route</th><th>Vehicle</th><th>Distance</th><th>Revenue</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {trips.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state py-6"><div className="empty-state-title">No trips yet</div></div></td></tr>
              ) : trips.map(t => (
                <tr key={t.id}>
                  <td><Link href={`/trips/${t.id}`} className="font-mono text-xs" style={{ color: 'var(--color-amber-400)' }}>{t.trip_number}</Link></td>
                  <td><span className="text-xs">{t.source} → {t.destination}</span></td>
                  <td><span className="text-xs">{(t.vehicle as { name?: string })?.name}</span></td>
                  <td><span className="text-xs font-mono">{t.actual_distance || t.planned_distance} km</span></td>
                  <td><span className="text-xs">{t.revenue ? `₹${t.revenue.toLocaleString()}` : '—'}</span></td>
                  <td><span className={`badge ${getTripStatusClass(t.status)}`}>{t.status}</span></td>
                  <td><span className="text-xs">{formatRelative(t.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEdit && (
        <DriverFormModal
          driver={driver}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
