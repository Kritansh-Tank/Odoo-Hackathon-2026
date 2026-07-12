'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Car, Users, Route, Wrench, TrendingUp, AlertTriangle,
  Plus, Fuel, BarChart3,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardKPIs, Trip, DriverWithExpiry } from '@/types';
import { formatDate, formatRelative, getTripStatusClass, getLicenseDaysUntilExpiry } from '@/lib/utils';
import { calculateFleetUtilization } from '@/lib/business-rules';
import KPICard from '@/components/dashboard/KPICard';
import FleetGauge3D from '@/components/dashboard/FleetGauge3D';



export default function DashboardPage() {
  const supabase = createClient();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [expiringDrivers, setExpiringDrivers] = useState<DriverWithExpiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();

    // Realtime: refresh on vehicle/trip changes
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, loadDashboard)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        vehiclesRes,
        driversRes,
        tripsRes,
        expiringRes,
      ] = await Promise.all([
        supabase.from('vehicles').select('status'),
        supabase.from('drivers').select('status'),
        supabase.from('trips')
          .select('*, vehicle:vehicles(name, registration_number), driver:drivers(name)')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('drivers_expiry_status').select('*').lte('days_until_expiry', 30).order('days_until_expiry'),
      ]);

      const vehicles = vehiclesRes.data || [];
      const drivers = driversRes.data || [];
      const trips = tripsRes.data || [];

      const totalVehicles = vehicles.length;
      const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
      const vehiclesOnTrip = vehicles.filter(v => v.status === 'On Trip').length;
      const vehiclesInShop = vehicles.filter(v => v.status === 'In Shop').length;
      const vehiclesRetired = vehicles.filter(v => v.status === 'Retired').length;

      const driversOnDuty = drivers.filter(d => d.status === 'On Trip').length;

      const activeTrips = trips.filter((t: Trip) => t.status === 'Dispatched').length;
      const pendingTrips = trips.filter((t: Trip) => t.status === 'Draft').length;

      const expiring = (expiringRes.data || []) as DriverWithExpiry[];

      setKpis({
        totalVehicles,
        availableVehicles,
        vehiclesOnTrip,
        vehiclesInShop,
        vehiclesRetired,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        totalDrivers: drivers.length,
        fleetUtilization: calculateFleetUtilization(
          vehiclesOnTrip,
          totalVehicles - vehiclesRetired
        ),
        expiringLicenses: expiring.filter(d => d.days_until_expiry >= 0).length,
        expiredLicenses: expiring.filter(d => d.days_until_expiry < 0).length,
      });

      setRecentTrips(trips as Trip[]);
      setExpiringDrivers(expiring.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const utilizationData = kpis ? [
    { status: 'Available', count: kpis.availableVehicles, color: '#22c55e' },
    { status: 'On Trip', count: kpis.vehiclesOnTrip, color: '#3b82f6' },
    { status: 'In Shop', count: kpis.vehiclesInShop, color: '#f59e0b' },
    { status: 'Retired', count: kpis.vehiclesRetired, color: '#6b7280' },
  ] : [];

  return (
    <div className="space-y-6 animate-fadein">
      {/* License expiry alerts */}
      {kpis && (kpis.expiredLicenses > 0 || kpis.expiringLicenses > 0) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          {kpis.expiredLicenses > 0 && (
            <div className="alert alert-danger mb-2">
              <AlertTriangle size={16} />
              <span>
                <strong>{kpis.expiredLicenses} driver license{kpis.expiredLicenses > 1 ? 's' : ''} have expired.</strong>
                {' '}These drivers cannot be assigned to trips.{' '}
                <Link href="/drivers" className="underline font-semibold">View drivers →</Link>
              </span>
            </div>
          )}
          {kpis.expiringLicenses > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={16} />
              <span>
                <strong>{kpis.expiringLicenses} driver license{kpis.expiringLicenses > 1 ? 's' : ''}</strong> expiring within 30 days.{' '}
                <Link href="/drivers" className="underline font-semibold">Send reminders →</Link>
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* KPI Row 1 — Vehicles */}
      <div>
        <div className="section-label mb-3">Fleet Overview</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Vehicles', value: kpis?.totalVehicles ?? 0, icon: Car, color: '#9090b0', subtitle: 'All registered', href: '/vehicles' },
            { label: 'Available', value: kpis?.availableVehicles ?? 0, icon: Car, color: '#22c55e', subtitle: 'Ready to dispatch', href: '/vehicles?status=Available' },
            { label: 'On Trip', value: kpis?.vehiclesOnTrip ?? 0, icon: Route, color: '#3b82f6', subtitle: 'Currently active', href: '/trips?status=Dispatched' },
            { label: 'In Shop', value: kpis?.vehiclesInShop ?? 0, icon: Wrench, color: '#f59e0b', subtitle: 'Under maintenance', href: '/maintenance' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <KPICard {...card} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* KPI Row 2 — Trips & Drivers */}
      <div>
        <div className="section-label mb-3">Operations</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Trips', value: kpis?.activeTrips ?? 0, icon: Route, color: '#3b82f6', subtitle: 'Dispatched', href: '/trips?status=Dispatched' },
            { label: 'Pending Trips', value: kpis?.pendingTrips ?? 0, icon: Route, color: '#9090b0', subtitle: 'Draft / awaiting', href: '/trips?status=Draft' },
            { label: 'Drivers On Duty', value: kpis?.driversOnDuty ?? 0, icon: Users, color: '#22c55e', subtitle: 'Currently driving', href: '/drivers?status=On+Trip' },
            { label: 'Fleet Utilization', value: `${kpis?.fleetUtilization ?? 0}%`, icon: TrendingUp, color: '#f59e0b', subtitle: 'Active vehicle %', href: '/reports' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 4) * 0.07, duration: 0.4 }}
            >
              <KPICard {...card} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet utilization 3D gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-1"
        >
          <div className="card h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Fleet Status
              </h3>
              <Link href="/reports" className="text-xs" style={{ color: 'var(--color-amber-400)' }}>
                Full report →
              </Link>
            </div>
            <FleetGauge3D
              utilization={kpis?.fleetUtilization ?? 0}
              segments={utilizationData}
            />
          </div>
        </motion.div>

        {/* Recent trips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="card h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Recent Trips
              </h3>
              <Link href="/trips" className="text-xs" style={{ color: 'var(--color-amber-400)' }}>
                View all →
              </Link>
            </div>

            {recentTrips.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon"><Route size={20} /></div>
                <div className="empty-state-title">No trips yet</div>
                <div className="empty-state-desc">Create your first trip to get started</div>
                <Link href="/trips" className="btn btn-primary btn-sm mt-2">
                  <Plus size={14} /> Create Trip
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-[var(--color-bg-hover)]"
                    style={{ border: '1px solid transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-amber-400)' }}
                    >
                      {trip.trip_number?.slice(-4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {trip.source} → {trip.destination}
                        </span>
                        <span className={`badge badge-sm ${getTripStatusClass(trip.status)}`}>
                          {trip.status}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {(trip.vehicle as { name?: string })?.name} · {(trip.driver as { name?: string })?.name} · {formatRelative(trip.created_at)}
                      </div>
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {trip.planned_distance} km
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Expiring licenses alert section */}
      {expiringDrivers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-warning)' }}>
              <AlertTriangle size={16} />
              License Expiry Watch
            </h3>
            <Link href="/drivers" className="text-xs" style={{ color: 'var(--color-amber-400)' }}>
              Manage drivers →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {expiringDrivers.map((driver) => {
              const days = getLicenseDaysUntilExpiry(driver.license_expiry_date);
              const isExpired = days < 0;
              return (
                <div
                  key={driver.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: isExpired ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: isExpired ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    {driver.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {driver.name}
                    </div>
                    <div className="text-[11px]" style={{ color: isExpired ? '#ef4444' : '#f59e0b' }}>
                      {isExpired ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="section-label col-span-full">Quick Actions</div>
        {[
          { href: '/vehicles?new=1', icon: Car, label: 'Add Vehicle', color: '#22c55e' },
          { href: '/trips?new=1', icon: Route, label: 'Create Trip', color: '#3b82f6' },
          { href: '/maintenance?new=1', icon: Wrench, label: 'Log Maintenance', color: '#f59e0b' },
          { href: '/fuel-expenses?new=1', icon: Fuel, label: 'Log Fuel', color: '#8b5cf6' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card flex items-center gap-3 hover:border-amber-500/30 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${action.color}20` }}
            >
              <action.icon size={18} style={{ color: action.color }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {action.label}
            </span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
