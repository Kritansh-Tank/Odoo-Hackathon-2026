'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Trip } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const schema = z.object({
  actual_distance: z.number().positive('Must be > 0'),
  fuel_consumed: z.number().positive('Must be > 0'),
  revenue: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CompleteTripModal({ trip, onClose, onSuccess }: {
  trip: Trip;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { ratePerKm } = useAppStore();
  const [completing, setCompleting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      actual_distance: trip.planned_distance,
      fuel_consumed: 0,
      revenue: trip.planned_distance * ratePerKm,
    },
  });

  const actualDistance = watch('actual_distance');
  const fuelConsumed = watch('fuel_consumed');
  const efficiency = fuelConsumed > 0 ? (actualDistance / fuelConsumed).toFixed(1) : '—';

  const onSubmit = async (data: FormData) => {
    setCompleting(true);
    const res = await fetch(`/api/trips/${trip.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) toast.error(result.error);
    else { toast.success(`Trip ${trip.trip_number} completed! ✅`); onSuccess(); }
    setCompleting(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-content"
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <CheckCircle size={16} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Complete Trip</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{trip.trip_number} · {trip.source} → {trip.destination}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost w-8 h-8 p-0" style={{ padding: 0 }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Actual Distance (km) *</label>
              <input type="number" className={`input ${errors.actual_distance ? 'input-error' : ''}`} {...register('actual_distance', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Fuel Consumed (L) *</label>
              <input type="number" className={`input ${errors.fuel_consumed ? 'input-error' : ''}`} step="0.1" {...register('fuel_consumed', { valueAsNumber: true })} />
            </div>
          </div>

          {fuelConsumed > 0 && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="text-sm" style={{ color: '#22c55e' }}>⛽ Fuel Efficiency: <strong>{efficiency} km/L</strong></span>
            </div>
          )}

          <div>
            <label className="label">Trip Revenue (₹) — Auto-calculated, editable</label>
            <input type="number" className="input" {...register('revenue', { valueAsNumber: true })} />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Based on ₹{ratePerKm}/km × {actualDistance}km = ₹{(actualDistance * ratePerKm).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="label">Completion Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Any issues or notes…" {...register('notes')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={completing} className="btn btn-primary flex-1">
              {completing ? <Loader2 size={16} className="animate-spin" /> : '✅ Mark Complete'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
