'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Car } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { Vehicle } from '@/types';
import { VEHICLE_TYPES, DEFAULT_REGIONS } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  registration_number: z.string().min(1, 'Required').max(20),
  name: z.string().min(1, 'Required').max(100),
  model: z.string().min(1, 'Required').max(100),
  type: z.enum(['Truck', 'Van', 'Car', 'Bus', 'Motorcycle', 'Other']),
  max_load_capacity: z.number().positive('Must be > 0'),
  odometer: z.number().min(0),
  acquisition_cost: z.number().positive('Must be > 0'),
  region: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  vehicle?: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VehicleFormModal({ vehicle, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const isEdit = !!vehicle;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: vehicle ? {
      registration_number: vehicle.registration_number,
      name: vehicle.name,
      model: vehicle.model,
      type: vehicle.type,
      max_load_capacity: vehicle.max_load_capacity,
      odometer: vehicle.odometer,
      acquisition_cost: vehicle.acquisition_cost,
      region: vehicle.region,
      notes: vehicle.notes || '',
    } : {
      type: 'Van',
      max_load_capacity: 0,
      odometer: 0,
      acquisition_cost: 0,
      region: 'Central',
    },
  });

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (isEdit) {
      const { error } = await supabase
        .from('vehicles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', vehicle.id);
      if (error) {
        if (error.code === '23505') toast.error('Registration number already exists');
        else toast.error(error.message);
        return;
      }
      toast.success(`${data.name} updated`);
    } else {
      const { error } = await supabase
        .from('vehicles')
        .insert({ ...data, status: 'Available', created_by: user?.id });
      if (error) {
        if (error.code === '23505') toast.error('Registration number already exists');
        else toast.error(error.message);
        return;
      }
      toast.success(`${data.name} registered`);
    }
    onSuccess();
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="modal-content"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <Car size={16} style={{ color: '#22c55e' }} />
              </div>
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {isEdit ? 'Edit Vehicle' : 'Register Vehicle'}
              </h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm w-8 h-8 p-0">
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Registration Number *</label>
                <input className={`input ${errors.registration_number ? 'input-error' : ''}`} placeholder="MH-01-AB-1234" {...register('registration_number')} />
                {errors.registration_number && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.registration_number.message}</p>}
              </div>
              <div>
                <label className="label">Vehicle Name *</label>
                <input className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Van-05" {...register('name')} />
                {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Model *</label>
                <input className={`input ${errors.model ? 'input-error' : ''}`} placeholder="Tata Ace 2023" {...register('model')} />
                {errors.model && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.model.message}</p>}
              </div>
              <div>
                <label className="label">Type *</label>
                <select className="input" {...register('type')}>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Max Load (kg) *</label>
                <input type="number" className={`input ${errors.max_load_capacity ? 'input-error' : ''}`} placeholder="500" {...register('max_load_capacity', { valueAsNumber: true })} />
                {errors.max_load_capacity && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.max_load_capacity.message}</p>}
              </div>
              <div>
                <label className="label">Odometer (km)</label>
                <input type="number" className="input" placeholder="0" {...register('odometer', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="label">Acq. Cost (₹) *</label>
                <input type="number" className={`input ${errors.acquisition_cost ? 'input-error' : ''}`} placeholder="850000" {...register('acquisition_cost', { valueAsNumber: true })} />
                {errors.acquisition_cost && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.acquisition_cost.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Region *</label>
              <select className="input" {...register('region')}>
                {DEFAULT_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} placeholder="Any additional notes…" {...register('notes')} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Save Changes' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
