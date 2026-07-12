'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Fuel, DollarSign, X, Loader2, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { FuelLog, Expense, Vehicle, Trip } from '@/types';
import { formatCurrency, formatDate, EXPENSE_TYPES } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const fuelSchema = z.object({
  vehicle_id: z.string().min(1, 'Required'),
  trip_id: z.string().optional(),
  liters: z.number().positive('Must be > 0'),
  cost: z.number().positive('Must be > 0'),
  date: z.string().min(1, 'Required'),
  odometer_reading: z.number().optional(),
  station: z.string().optional(),
});

const expenseSchema = z.object({
  vehicle_id: z.string().optional(),
  trip_id: z.string().optional(),
  type: z.enum(['Toll', 'Parking', 'Loading', 'Other']),
  description: z.string().optional(),
  amount: z.number().positive('Must be > 0'),
  date: z.string().min(1, 'Required'),
});

type FuelData = z.infer<typeof fuelSchema>;
type ExpenseData = z.infer<typeof expenseSchema>;

export default function FuelExpensesPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelLogs, setFuelLogs] = useState<(FuelLog & { vehicle?: Vehicle })[]>([]);
  const [expenses, setExpenses] = useState<(Expense & { vehicle?: Vehicle })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [totalFuelCost, setTotalFuelCost] = useState(0);
  const [totalExpenseCost, setTotalExpenseCost] = useState(0);
  const [totalFuelLiters, setTotalFuelLiters] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [fuelRes, expenseRes, vehicleRes, tripRes] = await Promise.all([
      supabase.from('fuel_logs').select('*, vehicle:vehicles(name, registration_number)').order('date', { ascending: false }),
      supabase.from('expenses').select('*, vehicle:vehicles(name, registration_number)').order('date', { ascending: false }),
      supabase.from('vehicles').select('id, name, registration_number').order('name'),
      supabase.from('trips').select('id, trip_number, source, destination').eq('status', 'Dispatched').order('created_at', { ascending: false }),
    ]);

    const fuel = (fuelRes.data || []) as (FuelLog & { vehicle?: Vehicle })[];
    const exp = (expenseRes.data || []) as (Expense & { vehicle?: Vehicle })[];

    setFuelLogs(fuel);
    setExpenses(exp);
    setVehicles((vehicleRes.data || []) as Vehicle[]);
    setTrips((tripRes.data || []) as Trip[]);
    setTotalFuelCost(fuel.reduce((s, f) => s + f.cost, 0));
    setTotalFuelLiters(fuel.reduce((s, f) => s + f.liters, 0));
    setTotalExpenseCost(exp.reduce((s, e) => s + e.amount, 0));
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const fuelForm = useForm<FuelData>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], liters: 0, cost: 0 },
  });

  const expenseForm = useForm<ExpenseData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], amount: 0, type: 'Toll' },
  });

  const onFuelSubmit = async (data: FuelData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('fuel_logs').insert({ ...data, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Fuel log added');
    setShowFuelModal(false);
    fuelForm.reset();
    loadAll();
  };

  const onExpenseSubmit = async (data: ExpenseData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('expenses').insert({ ...data, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Expense added');
    setShowExpenseModal(false);
    expenseForm.reset();
    loadAll();
  };

  return (
    <div className="space-y-4 animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fuel & Expenses</h1>
          <p className="page-subtitle">Track operational costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFuelModal(true)} className="btn btn-primary">
            <Fuel size={16} /> Log Fuel
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn btn-secondary">
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Fuel Cost', value: formatCurrency(totalFuelCost), color: '#f59e0b', icon: Fuel },
          { label: 'Total Fuel (L)', value: `${totalFuelLiters.toFixed(1)} L`, color: '#3b82f6', icon: Fuel },
          { label: 'Other Expenses', value: formatCurrency(totalExpenseCost), color: '#8b5cf6', icon: DollarSign },
        ].map(card => (
          <div key={card.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{card.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-nav w-64">
        <button className={`tab-item ${tab === 'fuel' ? 'active' : ''}`} onClick={() => setTab('fuel')}>
          Fuel Logs ({fuelLogs.length})
        </button>
        <button className={`tab-item ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>
          Expenses ({expenses.length})
        </button>
      </div>

      {/* Tables */}
      {tab === 'fuel' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th><th>Date</th><th>Liters</th><th>Cost</th><th>Efficiency</th><th>Odometer</th><th>Station</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-title">No fuel logs yet</div></div></td></tr>
              ) : fuelLogs.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{(f.vehicle as Vehicle & { name: string })?.name}</div>
                    <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{(f.vehicle as Vehicle & { registration_number: string })?.registration_number}</div>
                  </td>
                  <td><span className="text-xs">{formatDate(f.date)}</span></td>
                  <td><span className="text-xs font-mono">{f.liters} L</span></td>
                  <td><span className="text-xs">{formatCurrency(f.cost)}</span></td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                      {f.odometer_reading ? '—' : '—'} km/L
                    </span>
                  </td>
                  <td><span className="text-xs font-mono">{f.odometer_reading ? `${f.odometer_reading} km` : '—'}</span></td>
                  <td><span className="text-xs">{f.station || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Vehicle</th><th>Type</th><th>Description</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">No expenses yet</div></div></td></tr>
              ) : expenses.map(e => (
                <tr key={e.id}>
                  <td><span className="text-xs">{(e.vehicle as Vehicle & { name: string })?.name || '—'}</span></td>
                  <td>
                    <span className="badge badge-in-shop text-[11px]">{e.type}</span>
                  </td>
                  <td><span className="text-xs">{e.description || '—'}</span></td>
                  <td><span className="text-xs font-semibold" style={{ color: '#ef4444' }}>{formatCurrency(e.amount)}</span></td>
                  <td><span className="text-xs">{formatDate(e.date)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fuel Modal */}
      {showFuelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFuelModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <Fuel size={16} style={{ color: 'var(--color-amber-400)' }} />
                </div>
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Log Fuel</h2>
              </div>
              <button onClick={() => setShowFuelModal(false)} className="btn btn-ghost btn-sm w-8 h-8 p-0"><X size={16} /></button>
            </div>
            <form onSubmit={fuelForm.handleSubmit(onFuelSubmit)} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle *</label>
                  <select className="input" {...fuelForm.register('vehicle_id')}>
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Trip (optional)</label>
                  <select className="input" {...fuelForm.register('trip_id')}>
                    <option value="">None</option>
                    {trips.map(t => <option key={t.id} value={t.id}>{t.trip_number}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" {...fuelForm.register('date')} />
                </div>
                <div>
                  <label className="label">Liters *</label>
                  <input type="number" step="0.1" className="input" placeholder="0.0" {...fuelForm.register('liters', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Total Cost (₹) *</label>
                  <input type="number" className="input" placeholder="0" {...fuelForm.register('cost', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Odometer Reading (km)</label>
                  <input type="number" className="input" {...fuelForm.register('odometer_reading', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Fuel Station</label>
                  <input className="input" placeholder="HP, IOCL, BPCL…" {...fuelForm.register('station')} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFuelModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={fuelForm.formState.isSubmitting} className="btn btn-primary flex-1">
                  {fuelForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Add Fuel Log'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowExpenseModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                  <DollarSign size={16} style={{ color: '#8b5cf6' }} />
                </div>
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Expense</h2>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="btn btn-ghost btn-sm w-8 h-8 p-0"><X size={16} /></button>
            </div>
            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type *</label>
                  <select className="input" {...expenseForm.register('type')}>
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input type="number" className="input" {...expenseForm.register('amount', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle</label>
                  <select className="input" {...expenseForm.register('vehicle_id')}>
                    <option value="">None</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" {...expenseForm.register('date')} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="Describe the expense…" {...expenseForm.register('description')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={expenseForm.formState.isSubmitting} className="btn btn-primary flex-1">
                  {expenseForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Add Expense'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
