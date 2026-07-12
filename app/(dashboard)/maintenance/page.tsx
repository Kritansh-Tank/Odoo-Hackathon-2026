'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Wrench, Edit, X, Loader2, AlertTriangle, CheckCircle, Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceLog, MaintenanceStatus, Vehicle } from '@/types';
import { getMaintenanceStatusClass, formatDate, formatCurrency, MAINTENANCE_TYPES } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const formSchema = z.object({
  vehicle_id: z.string().min(1, 'Select a vehicle'),
  maintenance_type: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  cost: z.number().min(0),
  technician: z.string().optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Critical']),
  start_date: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof formSchema>;

const PRIORITY_COLORS = { Low: '#9090b0', Normal: '#3b82f6', High: '#f59e0b', Critical: '#ef4444' };

export default function MaintenancePage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<(MaintenanceLog & { vehicle?: Vehicle })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeForm, setCloseForm] = useState<{ id: string; log: MaintenanceLog & { vehicle?: Vehicle } } | null>(null);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cost: 0,
      priority: 'Normal',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('maintenance_logs')
      .select('*, vehicle:vehicles(name, registration_number, status)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (search) query = query.ilike('description', `%${search}%`);

    const { data } = await query;
    setLogs((data || []) as (MaintenanceLog & { vehicle?: Vehicle })[]);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('vehicles').select('id, name, registration_number, status').order('name')
      .then(({ data }) => setVehicles((data || []) as Vehicle[]));
  }, []);

  const onCreate = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('maintenance_logs').insert({
      ...data, status: 'Open', created_by: user?.id,
    });

    if (error) { toast.error(error.message); return; }

    // Rule 9: Auto-set vehicle to In Shop
    await supabase.from('vehicles').update({ status: 'In Shop', updated_at: new Date().toISOString() })
      .eq('id', data.vehicle_id);

    toast.success('Maintenance log created. Vehicle marked as In Shop.');
    setShowModal(false);
    reset();
    load();
  };

  const closeMaintenance = async (log: MaintenanceLog & { vehicle?: Vehicle }, endDate: string, finalCost: number) => {
    setClosingId(log.id);

    // Get AI summary first
    setLoadingAi(true);
    let summary = '';
    try {
      const res = await fetch('/api/ai/maintenance-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: log.vehicle?.name || 'Unknown',
          registration_number: (log.vehicle as Vehicle & { registration_number: string })?.registration_number || '',
          maintenance_type: log.maintenance_type,
          description: log.description,
          technician: log.technician || 'N/A',
          start_date: log.start_date,
          end_date: endDate,
          cost: finalCost,
        }),
      });
      const data = await res.json();
      summary = data.summary || '';
    } catch { /* continue without summary */ }
    setLoadingAi(false);

    const { error } = await supabase.from('maintenance_logs').update({
      status: 'Closed',
      end_date: endDate,
      cost: finalCost,
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    }).eq('id', log.id);

    if (error) { toast.error('Failed to close maintenance'); setClosingId(null); return; }

    // Rule 10: Restore vehicle to Available (unless Retired)
    const vehicleId = log.vehicle_id;
    const { data: vehicleData } = await supabase.from('vehicles').select('status').eq('id', vehicleId).single();
    if (vehicleData?.status !== 'Retired') {
      await supabase.from('vehicles').update({ status: 'Available', updated_at: new Date().toISOString() }).eq('id', vehicleId);
    }

    toast.success('Maintenance closed. Vehicle restored to Available.');
    setCloseForm(null);
    setClosingId(null);
    load();
  };

  return (
    <div className="space-y-4 animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">{logs.length} maintenance record{logs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> New Maintenance
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search description…" onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto min-w-[140px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value as MaintenanceStatus | 'all')}>
          <option value="all">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Description</th>
              <th>Priority</th>
              <th>Technician</th>
              <th>Start Date</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j}><div className="skeleton h-4 w-20 rounded" /></td>)}</tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Wrench size={20} /></div>
                  <div className="empty-state-title">No maintenance records</div>
                </div>
              </td></tr>
            ) : (
              logs.map(log => (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{(log.vehicle as Vehicle & { name: string })?.name}</div>
                    <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{(log.vehicle as Vehicle & { registration_number: string })?.registration_number}</div>
                  </td>
                  <td><span className="text-xs">{log.maintenance_type}</span></td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.description}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: PRIORITY_COLORS[log.priority] }}>
                      {log.priority}
                    </span>
                  </td>
                  <td><span className="text-xs">{log.technician || '—'}</span></td>
                  <td><span className="text-xs">{formatDate(log.start_date)}</span></td>
                  <td><span className="text-xs">{formatCurrency(log.cost)}</span></td>
                  <td>
                    <span className={`badge ${getMaintenanceStatusClass(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {log.status === 'Open' && (
                        <>
                          <button
                            onClick={() => supabase.from('maintenance_logs').update({ status: 'In Progress', updated_at: new Date().toISOString() }).eq('id', log.id).then(() => load())}
                            className="btn btn-ghost btn-sm text-xs px-2 h-7"
                            style={{ color: '#3b82f6' }}
                          >
                            Start
                          </button>
                          <button
                            onClick={() => setCloseForm({ id: log.id, log })}
                            className="btn btn-ghost btn-sm text-xs px-2 h-7"
                            style={{ color: '#22c55e' }}
                          >
                            Close
                          </button>
                        </>
                      )}
                      {log.status === 'In Progress' && (
                        <button
                          onClick={() => setCloseForm({ id: log.id, log })}
                          className="btn btn-ghost btn-sm text-xs px-2 h-7"
                          style={{ color: '#22c55e' }}
                        >
                          <CheckCircle size={13} /> Close
                        </button>
                      )}
                      {log.ai_summary && (
                        <div className="tooltip" data-tooltip="AI Summary available">
                          <Bot size={13} style={{ color: 'var(--color-amber-400)' }} />
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <Wrench size={16} style={{ color: 'var(--color-amber-400)' }} />
                </div>
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create Maintenance Record</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm w-8 h-8 p-0"><X size={16} /></button>
            </div>

            <div className="alert alert-warning mx-6 mt-4">
              <AlertTriangle size={14} />
              <span className="text-xs">Creating this record will automatically set the vehicle status to <strong>In Shop</strong></span>
            </div>

            <form onSubmit={handleSubmit(onCreate)} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle *</label>
                  <select className={`input ${errors.vehicle_id ? 'input-error' : ''}`} {...register('vehicle_id')}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.status})</option>
                    ))}
                  </select>
                  {errors.vehicle_id && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.vehicle_id.message}</p>}
                </div>
                <div>
                  <label className="label">Maintenance Type *</label>
                  <select className="input" {...register('maintenance_type')}>
                    <option value="">Select type…</option>
                    {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea className={`input resize-none ${errors.description ? 'input-error' : ''}`} rows={2} placeholder="Describe the issue or work required…" {...register('description')} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" {...register('priority')}>
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="label">Estimated Cost (₹)</label>
                  <input type="number" className="input" {...register('cost', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Start Date *</label>
                  <input type="date" className="input" {...register('start_date')} />
                </div>
              </div>

              <div>
                <label className="label">Technician</label>
                <input className="input" placeholder="Technician name or workshop" {...register('technician')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Record'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Close Maintenance Modal */}
      {closeForm && (
        <CloseMaintenanceModal
          log={closeForm.log}
          onClose={() => setCloseForm(null)}
          onSubmit={closeMaintenance}
          loading={!!closingId || loadingAi}
        />
      )}
    </div>
  );
}

function CloseMaintenanceModal({ log, onClose, onSubmit, loading }: {
  log: MaintenanceLog & { vehicle?: Vehicle };
  onClose: () => void;
  onSubmit: (log: MaintenanceLog & { vehicle?: Vehicle }, endDate: string, finalCost: number) => void;
  loading: boolean;
}) {
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [finalCost, setFinalCost] = useState(log.cost);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Close Maintenance</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm w-8 h-8 p-0"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="alert alert-info">
            <Bot size={14} />
            <span className="text-xs">Groq AI will generate a professional maintenance summary on close.</span>
          </div>
          <div>
            <label className="label">Completion Date</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Final Cost (₹)</label>
            <input type="number" className="input" value={finalCost} onChange={e => setFinalCost(Number(e.target.value))} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => onSubmit(log, endDate, finalCost)}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Generating AI Summary…</> : '✅ Close Maintenance'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


