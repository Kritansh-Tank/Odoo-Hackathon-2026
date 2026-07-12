'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Car, Edit, Trash2, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Vehicle, VehicleStatus, VehicleType } from '@/types';
import {
  formatCurrency, formatKm, getVehicleStatusClass, VEHICLE_TYPES, DEFAULT_REGIONS, debounce,
} from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import VehicleFormModal from '@/components/vehicles/VehicleFormModal';
import { toast } from 'sonner';

type SortKey = 'name' | 'registration_number' | 'odometer' | 'acquisition_cost' | 'status';

export default function VehiclesPage() {
  const supabase = createClient();
  const { vehicleFilters, setVehicleFilters } = useAppStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | undefined>();
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('vehicles').select('*').order(sortBy, { ascending: sortOrder === 'asc' });

    if (vehicleFilters.search) {
      query = query.or(`name.ilike.%${vehicleFilters.search}%,registration_number.ilike.%${vehicleFilters.search}%,model.ilike.%${vehicleFilters.search}%`);
    }
    if (vehicleFilters.status && vehicleFilters.status !== 'all') {
      query = query.eq('status', vehicleFilters.status);
    }
    if (vehicleFilters.type && vehicleFilters.type !== 'all') {
      query = query.eq('type', vehicleFilters.type);
    }
    if (vehicleFilters.region) {
      query = query.eq('region', vehicleFilters.region);
    }

    const { data, error } = await query;
    if (error) toast.error('Failed to load vehicles');
    else setVehicles(data as Vehicle[]);
    setLoading(false);
  }, [vehicleFilters, sortBy, sortOrder]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const debouncedSearch = useCallback(
    debounce((val: string) => setVehicleFilters({ search: val }), 300),
    []
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  };

  const deleteVehicle = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) toast.error('Failed to delete vehicle');
    else { toast.success(`${name} deleted`); loadVehicles(); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
    return sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="space-y-4 animate-fadein">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Registry</h1>
          <p className="page-subtitle">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => { setEditVehicle(undefined); setShowModal(true); }} className="btn btn-primary">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input pl-8"
              placeholder="Search by name, registration, model…"
              defaultValue={vehicleFilters.search}
              onChange={e => debouncedSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto min-w-[140px]"
            value={vehicleFilters.status}
            onChange={e => setVehicleFilters({ status: e.target.value as VehicleStatus | 'all' })}
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
          <select
            className="input w-auto min-w-[120px]"
            value={vehicleFilters.type}
            onChange={e => setVehicleFilters({ type: e.target.value as VehicleType | 'all' })}
          >
            <option value="all">All Types</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="input w-auto min-w-[120px]"
            value={vehicleFilters.region}
            onChange={e => setVehicleFilters({ region: e.target.value })}
          >
            <option value="">All Regions</option>
            {DEFAULT_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="cursor-pointer" onClick={() => handleSort('registration_number')}>
                <div className="flex items-center gap-1">Reg. Number <SortIcon col="registration_number" /></div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Vehicle <SortIcon col="name" /></div>
              </th>
              <th>Type</th>
              <th>Max Load</th>
              <th className="cursor-pointer" onClick={() => handleSort('odometer')}>
                <div className="flex items-center gap-1">Odometer <SortIcon col="odometer" /></div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('acquisition_cost')}>
                <div className="flex items-center gap-1">Acq. Cost <SortIcon col="acquisition_cost" /></div>
              </th>
              <th>Region</th>
              <th className="cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-20 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Car size={20} /></div>
                    <div className="empty-state-title">No vehicles found</div>
                    <div className="empty-state-desc">Adjust your filters or add a new vehicle</div>
                  </div>
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <motion.tr
                  key={v.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={v.status === 'Retired' ? 'opacity-50' : ''}
                >
                  <td>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-amber-400)' }}>
                      {v.registration_number}
                    </span>
                  </td>
                  <td>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{v.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{v.model}</div>
                  </td>
                  <td><span className="text-xs">{v.type}</span></td>
                  <td><span className="font-mono text-xs">{v.max_load_capacity} kg</span></td>
                  <td><span className="font-mono text-xs">{formatKm(v.odometer)}</span></td>
                  <td><span className="text-xs">{formatCurrency(v.acquisition_cost)}</span></td>
                  <td><span className="text-xs">{v.region}</span></td>
                  <td>
                    <span className={`badge ${getVehicleStatusClass(v.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {v.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link href={`/vehicles/${v.id}`} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="View details">
                        <FileText size={13} />
                      </Link>
                      <button onClick={() => { setEditVehicle(v); setShowModal(true); }} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Edit">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => deleteVehicle(v.id, v.name)} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Delete" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <VehicleFormModal
          vehicle={editVehicle}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadVehicles(); }}
        />
      )}
    </div>
  );
}
