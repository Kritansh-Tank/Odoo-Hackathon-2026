'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Car, Wrench, Fuel, Route, Edit, BarChart3,
  MapPin, DollarSign, Gauge, Calendar, FileText, TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Vehicle, MaintenanceLog, FuelLog, Trip } from '@/types';
import {
  formatCurrency, formatKm, formatDate, formatRelative,
  getVehicleStatusClass, getTripStatusClass, getMaintenanceStatusClass,
  formatCurrency as fmtCur,
} from '@/lib/utils';
import { calculateVehicleROI } from '@/lib/business-rules';
import VehicleFormModal from '@/components/vehicles/VehicleFormModal';
import { toast } from 'sonner';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'fuel' | 'trips'>('trips');

  const load = async () => {
    setLoading(true);
    const [vRes, mRes, fRes, tRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('id', id).single(),
      supabase.from('maintenance_logs').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('fuel_logs').select('*').eq('vehicle_id', id).order('date', { ascending: false }),
      supabase.from('trips').select('*, driver:drivers(name)').eq('vehicle_id', id).order('created_at', { ascending: false }),
    ]);

    if (vRes.error || !vRes.data) { router.push('/vehicles'); return; }
    setVehicle(vRes.data as Vehicle);
    setMaintenance((mRes.data || []) as MaintenanceLog[]);
    setFuelLogs((fRes.data || []) as FuelLog[]);
    setTrips((tRes.data || []) as Trip[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const retireVehicle = async () => {
    if (!vehicle || !confirm(`Mark ${vehicle.name} as Retired? This cannot be undone.`)) return;
    await supabase.from('vehicles').update({ status: 'Retired', updated_at: new Date().toISOString() }).eq('id', id);
    toast.success(`${vehicle.name} marked as Retired`);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-48 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  // Derived stats
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((s, f) => s + f.liters, 0);
  const totalMaintenanceCost = maintenance.filter(m => m.status === 'Closed').reduce((s, m) => s + m.cost, 0);
  const totalRevenue = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.revenue || 0), 0);
  const totalDistance = trips.filter(t => t.status === 'Completed').reduce((s, t) => s + (t.actual_distance || 0), 0);
  const completedTrips = trips.filter(t => t.status === 'Completed').length;
  const roi = calculateVehicleROI(totalRevenue, totalMaintenanceCost, totalFuelCost, vehicle.acquisition_cost);
  const fuelEfficiency = totalFuelLiters > 0 && totalDistance > 0 ? (totalDistance / totalFuelLiters).toFixed(1) : '—';

  return (
    <div className="space-y-6 animate-fadein">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/vehicles" className="btn btn-ghost btn-sm mt-1">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{vehicle.name}</h1>
            <span className={`badge ${getVehicleStatusClass(vehicle.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {vehicle.status}
            </span>
          </div>
          <p className="page-subtitle">{vehicle.registration_number} · {vehicle.model} · {vehicle.type}</p>
        </div>
        <div className="flex gap-2">
          {vehicle.status !== 'Retired' && (
            <>
              <button onClick={() => setShowEdit(true)} className="btn btn-secondary btn-sm">
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={retireVehicle}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-danger)' }}
              >
                Retire
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Max Load Capacity', value: `${vehicle.max_load_capacity.toLocaleString()} kg`, icon: Gauge },
            { label: 'Odometer', value: formatKm(vehicle.odometer), icon: MapPin },
            { label: 'Acquisition Cost', value: formatCurrency(vehicle.acquisition_cost), icon: DollarSign },
            { label: 'Region', value: vehicle.region, icon: MapPin },
          ].map(item => (
            <div key={item.label}>
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {vehicle.notes && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{vehicle.notes}</p>
          </div>
        )}
      </div>

      {/* Performance stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#22c55e', icon: TrendingUp },
          { label: 'Completed Trips', value: String(completedTrips), color: '#3b82f6', icon: Route },
          { label: 'Fuel Efficiency', value: `${fuelEfficiency} km/L`, color: '#f59e0b', icon: Fuel },
          { label: 'Vehicle ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`, color: roi >= 0 ? '#22c55e' : '#ef4444', icon: BarChart3 },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-nav w-auto inline-flex">
        {(['trips', 'maintenance', 'fuel'] as const).map(tab => (
          <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1 text-[10px]">
              ({tab === 'trips' ? trips.length : tab === 'maintenance' ? maintenance.length : fuelLogs.length})
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'trips' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Trip #</th><th>Route</th><th>Driver</th><th>Distance</th><th>Revenue</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {trips.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-title">No trips yet</div></div></td></tr>
              ) : trips.map(t => (
                <tr key={t.id}>
                  <td><Link href={`/trips/${t.id}`} className="font-mono text-xs" style={{ color: 'var(--color-amber-400)' }}>{t.trip_number}</Link></td>
                  <td><div className="text-xs">{t.source} → {t.destination}</div></td>
                  <td><span className="text-xs">{(t.driver as { name?: string })?.name}</span></td>
                  <td><span className="text-xs font-mono">{t.actual_distance || t.planned_distance} km</span></td>
                  <td><span className="text-xs">{formatCurrency(t.revenue || 0)}</span></td>
                  <td><span className={`badge ${getTripStatusClass(t.status)}`}>{t.status}</span></td>
                  <td><span className="text-xs">{formatRelative(t.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Type</th><th>Description</th><th>Cost</th><th>Start Date</th><th>Status</th></tr></thead>
            <tbody>
              {maintenance.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">No maintenance records</div></div></td></tr>
              ) : maintenance.map(m => (
                <tr key={m.id}>
                  <td><span className="text-xs">{m.maintenance_type}</span></td>
                  <td><span className="text-xs">{m.description}</span></td>
                  <td><span className="text-xs">{formatCurrency(m.cost)}</span></td>
                  <td><span className="text-xs">{formatDate(m.start_date)}</span></td>
                  <td><span className={`badge ${getMaintenanceStatusClass(m.status)}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Date</th><th>Liters</th><th>Cost</th><th>Station</th><th>Odometer</th></tr></thead>
            <tbody>
              {fuelLogs.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">No fuel records</div></div></td></tr>
              ) : fuelLogs.map(f => (
                <tr key={f.id}>
                  <td><span className="text-xs">{formatDate(f.date)}</span></td>
                  <td><span className="text-xs font-mono">{f.liters} L</span></td>
                  <td><span className="text-xs">{formatCurrency(f.cost)}</span></td>
                  <td><span className="text-xs">{f.station || '—'}</span></td>
                  <td><span className="text-xs font-mono">{f.odometer_reading ? `${f.odometer_reading} km` : '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && (
        <VehicleFormModal
          vehicle={vehicle}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
