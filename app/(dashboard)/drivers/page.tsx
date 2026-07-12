'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Edit, Trash2, Mail, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DriverWithExpiry, DriverStatus } from '@/types';
import {
  getDriverStatusClass, getSafetyScoreColor, LICENSE_CATEGORIES, debounce, formatDate,
} from '@/lib/utils';
import { getLicenseDaysUntilExpiry } from '@/lib/business-rules';
import DriverFormModal from '@/components/drivers/DriverFormModal';
import { toast } from 'sonner';

export default function DriversPage() {
  const supabase = createClient();
  const [drivers, setDrivers] = useState<DriverWithExpiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState<DriverWithExpiry | undefined>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('drivers_expiry_status').select('*').order('name', { ascending: sortOrder === 'asc' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,license_number.ilike.%${search}%,contact_number.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (licenseFilter === 'expiring') query = query.gte('days_until_expiry', 0).lte('days_until_expiry', 30);
    if (licenseFilter === 'expired') query = query.lt('days_until_expiry', 0);
    if (licenseFilter === 'valid') query = query.gt('days_until_expiry', 30);

    const { data } = await query;
    setDrivers((data || []) as DriverWithExpiry[]);
    setLoading(false);
  }, [search, statusFilter, licenseFilter, sortOrder]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const debouncedSearch = useCallback(debounce((v: string) => setSearch(v), 300), []);

  const deleteDriver = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) toast.error('Failed to delete driver');
    else { toast.success(`${name} deleted`); loadDrivers(); }
  };

  const sendLicenseReminder = async (driver: DriverWithExpiry) => {
    setSendingEmail(driver.id);
    try {
      const res = await fetch('/api/ai/license-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driver.id,
          driver_name: driver.name,
          license_number: driver.license_number,
          expiry_date: driver.license_expiry_date,
          days_until_expiry: driver.days_until_expiry,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Reminder sent to ${driver.name}`);
      else toast.error(data.error || 'Failed to send reminder');
    } catch {
      toast.error('Network error sending reminder');
    }
    setSendingEmail(null);
  };

  return (
    <div className="space-y-4 animate-fadein">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver & Safety Profiles</h1>
          <p className="page-subtitle">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => { setEditDriver(undefined); setShowModal(true); }} className="btn btn-primary">
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by name, license, contact…"
              onChange={e => debouncedSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto min-w-[140px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value as DriverStatus | 'all')}>
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
          <select className="input w-auto min-w-[140px]" value={licenseFilter} onChange={e => setLicenseFilter(e.target.value as typeof licenseFilter)}>
            <option value="all">All Licenses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon (30d)</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>
                <button className="flex items-center gap-1" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                  Driver {sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </th>
              <th>License</th>
              <th>Category</th>
              <th>Expiry</th>
              <th>Contact</th>
              <th>Safety Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton h-4 w-20 rounded" /></td>)}</tr>
              ))
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={20} /></div>
                    <div className="empty-state-title">No drivers found</div>
                    <div className="empty-state-desc">Adjust filters or add a new driver</div>
                  </div>
                </td>
              </tr>
            ) : (
              drivers.map((d) => {
                const days = d.days_until_expiry;
                const isExpired = days < 0;
                const isExpiring = days >= 0 && days <= 30;
                const scoreColor = getSafetyScoreColor(d.safety_score);
                return (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={d.status === 'Suspended' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-amber-400)' }}>
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{d.name}</div>
                          {d.address && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{d.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--color-amber-400)' }}>{d.license_number}</span></td>
                    <td><span className="text-xs">{d.license_category}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {(isExpired || isExpiring) && (
                          <AlertTriangle size={12} style={{ color: isExpired ? 'var(--color-danger)' : 'var(--color-warning)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div className="text-xs" style={{ color: isExpired ? 'var(--color-danger)' : isExpiring ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                            {formatDate(d.license_expiry_date)}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            {isExpired ? `${Math.abs(days)}d expired` : `${days}d left`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-xs">{d.contact_number}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-[60px] progress-bar">
                          <div className="progress-fill" style={{ width: `${d.safety_score}%`, background: scoreColor }} />
                        </div>
                        <span className="text-xs font-semibold w-8" style={{ color: scoreColor }}>{d.safety_score}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getDriverStatusClass(d.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {(isExpired || isExpiring) && (
                          <button
                            onClick={() => sendLicenseReminder(d)}
                            disabled={sendingEmail === d.id}
                            className="btn btn-sm btn-ghost w-7 h-7 p-0"
                            title="Send license reminder email"
                            style={{ color: 'var(--color-warning)' }}
                          >
                            <Mail size={13} />
                          </button>
                        )}
                        <button onClick={() => { setEditDriver(d); setShowModal(true); }} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Edit">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteDriver(d.id, d.name)} className="btn btn-ghost btn-sm w-7 h-7 p-0" title="Delete" style={{ color: 'var(--color-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <DriverFormModal
          driver={editDriver}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadDrivers(); }}
        />
      )}
    </div>
  );
}

