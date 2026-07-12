'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { DriverWithExpiry } from '@/types';
import { LICENSE_CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Required').max(100),
  license_number: z.string().min(1, 'Required').max(50),
  license_category: z.string().min(1, 'Required'),
  license_expiry_date: z.string().min(1, 'Required'),
  contact_number: z.string().min(10, 'Min 10 digits').max(15),
  safety_score: z.number().min(0).max(100),
  status: z.enum(['Available', 'On Trip', 'Off Duty', 'Suspended']),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  driver?: DriverWithExpiry;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriverFormModal({ driver, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const isEdit = !!driver;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: driver ? {
      name: driver.name,
      license_number: driver.license_number,
      license_category: driver.license_category,
      license_expiry_date: driver.license_expiry_date,
      contact_number: driver.contact_number,
      safety_score: driver.safety_score,
      status: driver.status,
      address: driver.address || '',
      notes: driver.notes || '',
    } : {
      license_category: 'LMV',
      safety_score: 100,
      status: 'Available',
    },
  });

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (isEdit) {
      const { error } = await supabase
        .from('drivers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', driver.id);
      if (error) {
        if (error.code === '23505') toast.error('License number already exists');
        else toast.error(error.message);
        return;
      }
      toast.success(`${data.name} updated`);
    } else {
      const { error } = await supabase
        .from('drivers')
        .insert({ ...data, created_by: user?.id });
      if (error) {
        if (error.code === '23505') toast.error('License number already exists');
        else toast.error(error.message);
        return;
      }
      toast.success(`${data.name} added`);
    }
    onSuccess();
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-content"
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Users size={16} style={{ color: '#3b82f6' }} />
              </div>
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {isEdit ? 'Edit Driver' : 'Add Driver'}
              </h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost w-8 h-8 p-0" style={{ padding: 0 }}><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Alex Johnson" {...register('name')} />
                {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Contact Number *</label>
                <input className={`input ${errors.contact_number ? 'input-error' : ''}`} placeholder="+91 9876543210" {...register('contact_number')} />
                {errors.contact_number && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.contact_number.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">License Number *</label>
                <input className={`input ${errors.license_number ? 'input-error' : ''}`} placeholder="DL-0120110012345" {...register('license_number')} />
                {errors.license_number && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.license_number.message}</p>}
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input" {...register('license_category')}>
                  {LICENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Expiry Date *</label>
                <input type="date" className={`input ${errors.license_expiry_date ? 'input-error' : ''}`} {...register('license_expiry_date')} />
                {errors.license_expiry_date && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.license_expiry_date.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Safety Score (0-100)</label>
                <input type="number" min={0} max={100} className="input" {...register('safety_score', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" {...register('status')}>
                  <option value="Available">Available</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input className="input" placeholder="City, State" {...register('address')} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Save Changes' : 'Add Driver'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
