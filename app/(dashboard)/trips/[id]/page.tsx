'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Route, Car, Users, Bot, CheckCircle,
  X, MapPin, Package, Fuel, DollarSign, Calendar, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Trip, Vehicle, Driver } from '@/types';
import {
  formatDate, formatDateTime, formatCurrency, formatRelative,
  getTripStatusClass,
} from '@/lib/utils';
import CompleteTripModal from '@/components/trips/CompleteTripModal';
import { toast } from 'sonner';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, vehicle:vehicles(*), driver:drivers(*)')
      .eq('id', id)
      .single();
    if (error || !data) { router.push('/trips'); return; }
    setTrip(data as Trip);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const cancelTrip = async () => {
    if (!trip || !confirm(`Cancel trip ${trip.trip_number}?`)) return;
    setCancelling(true);
    const res = await fetch(`/api/trips/${trip.id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else { toast.success('Trip cancelled'); load(); }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!trip) return null;

  const vehicle = trip.vehicle as Vehicle;
  const driver = trip.driver as Driver;
  const riskColors = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
  const riskColor = trip.ai_risk_level ? riskColors[trip.ai_risk_level] : '#9090b0';
  const revenue = trip.revenue || 0;
  const distance = trip.actual_distance || trip.planned_distance;

  return (
    <div className="space-y-6 animate-fadein max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/trips" className="btn btn-ghost btn-sm mt-1">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{trip.trip_number}</h1>
            <span className={`badge ${getTripStatusClass(trip.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {trip.status}
            </span>
            {trip.ai_risk_level && (
              <span className="badge" style={{
                background: `${riskColor}15`,
                color: riskColor,
                borderColor: `${riskColor}30`,
              }}>
                🤖 {trip.ai_risk_level} Risk
              </span>
            )}
          </div>
          <p className="page-subtitle">{trip.source} → {trip.destination}</p>
        </div>
        <div className="flex gap-2">
          {trip.status === 'Dispatched' && (
            <>
              <button onClick={() => setShowComplete(true)} className="btn btn-primary btn-sm">
                <CheckCircle size={14} /> Complete
              </button>
              <button
                onClick={cancelTrip}
                disabled={cancelling}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-danger)' }}
              >
                <X size={14} /> Cancel
              </button>
            </>
          )}
          {trip.status === 'Draft' && (
            <button
              onClick={cancelTrip}
              disabled={cancelling}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-danger)' }}
            >
              <X size={14} /> Cancel Trip
            </button>
          )}
        </div>
      </div>

      {/* Main info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route & Cargo */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Route size={16} style={{ color: '#3b82f6' }} /> Route Details
          </h3>
          <div className="space-y-3">
            {[
              { label: 'From', value: trip.source, icon: MapPin },
              { label: 'To', value: trip.destination, icon: MapPin },
              { label: 'Planned Distance', value: `${trip.planned_distance} km`, icon: Route },
              { label: 'Actual Distance', value: trip.actual_distance ? `${trip.actual_distance} km` : '—', icon: Route },
              { label: 'Cargo Weight', value: `${trip.cargo_weight} kg`, icon: Package },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <item.icon size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle & Driver */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Car size={16} style={{ color: '#22c55e' }} /> Assignment
          </h3>
          <div className="space-y-3">
            {vehicle && [
              { label: 'Vehicle', value: vehicle.name || '—', icon: Car },
              { label: 'Registration', value: (vehicle as Vehicle & { registration_number: string }).registration_number || '—', icon: Car },
              { label: 'Driver', value: driver?.name || '—', icon: Users },
              { label: 'License', value: driver?.license_number || '—', icon: Users },
              { label: 'Safety Score', value: driver ? `${driver.safety_score}/100` : '—', icon: Users },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <item.icon size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial & Fuel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: formatCurrency(revenue), color: '#22c55e', icon: DollarSign },
          { label: 'Fuel Used', value: trip.fuel_consumed ? `${trip.fuel_consumed} L` : '—', color: '#f59e0b', icon: Fuel },
          { label: 'Fuel Efficiency', value: trip.fuel_consumed && trip.actual_distance ? `${(trip.actual_distance / trip.fuel_consumed).toFixed(1)} km/L` : '—', color: '#3b82f6', icon: Fuel },
          { label: 'Cost/km', value: trip.actual_distance ? `₹${(revenue / trip.actual_distance).toFixed(0)}` : '—', color: '#8b5cf6', icon: DollarSign },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text-primary)' }}>Timeline</h3>
        <div className="space-y-3">
          {[
            { label: 'Created', value: formatDateTime(trip.created_at), icon: Calendar, color: '#9090b0' },
            { label: 'Dispatched', value: trip.dispatched_at ? formatDateTime(trip.dispatched_at) : '—', icon: Route, color: '#3b82f6' },
            { label: 'Completed', value: trip.completed_at ? formatDateTime(trip.completed_at) : '—', icon: CheckCircle, color: '#22c55e' },
            { label: 'Cancelled', value: trip.cancelled_at ? formatDateTime(trip.cancelled_at) : '—', icon: X, color: '#ef4444' },
          ].filter(item => item.value !== '—').map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}>
                <item.icon size={12} style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Risk Assessment */}
      {trip.ai_risk_level && trip.ai_risk_summary && (
        <div
          className="card"
          style={{
            borderColor: `${riskColor}30`,
            background: `${riskColor}05`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bot size={16} style={{ color: 'var(--color-amber-400)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              AI Risk Assessment
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${riskColor}20`, color: riskColor, border: `1px solid ${riskColor}30` }}>
              {trip.ai_risk_level} Risk
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>{trip.ai_risk_summary}</p>
          {Array.isArray(trip.ai_risk_recommendations) && trip.ai_risk_recommendations.length > 0 && (
            <div className="space-y-1.5">
              {(trip.ai_risk_recommendations as string[]).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-amber-400)', flexShrink: 0 }}>→</span>
                  {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {trip.notes && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Notes</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{trip.notes}</p>
        </div>
      )}

      {showComplete && (
        <CompleteTripModal
          trip={trip}
          onClose={() => setShowComplete(false)}
          onSuccess={() => { setShowComplete(false); load(); }}
        />
      )}
    </div>
  );
}
