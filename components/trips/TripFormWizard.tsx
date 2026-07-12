'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Route, Car, Users, Bot, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import ModalPortal from '@/components/ui/ModalPortal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { Vehicle, Driver, DispatchRiskAssessment } from '@/types';
import { validateCargoWeight, isVehicleDispatchable, isDriverDispatchable, getVehicleDispatchBlockReason, getDriverDispatchBlockReason } from '@/lib/business-rules';
import { formatCurrency, formatKm } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const schema = z.object({
  source: z.string().min(1, 'Required'),
  destination: z.string().min(1, 'Required'),
  vehicle_id: z.string().min(1, 'Select a vehicle'),
  driver_id: z.string().min(1, 'Select a driver'),
  cargo_weight: z.number().positive('Must be > 0'),
  planned_distance: z.number().positive('Must be > 0'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ['Route', 'Assign', 'AI Review', 'Dispatch'];

export default function TripFormWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const supabase = createClient();
  const { ratePerKm } = useAppStore();
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [aiRisk, setAiRisk] = useState<DispatchRiskAssessment | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [cargoError, setCargoError] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cargo_weight: 0, planned_distance: 0 },
  });

  const vehicleId = watch('vehicle_id');
  const cargoWeight = watch('cargo_weight');

  // Load available vehicles and drivers
  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*').eq('status', 'Available').order('name'),
      supabase.from('drivers').select('*').eq('status', 'Available').order('name'),
    ]).then(([vRes, dRes]) => {
      setVehicles((vRes.data || []) as Vehicle[]);
      // Filter out expired license drivers
      const today = new Date();
      const validDrivers = (dRes.data || []).filter((d: Driver) => new Date(d.license_expiry_date) >= today);
      setDrivers(validDrivers as Driver[]);
    });
  }, []);

  // Update selected vehicle when picker changes
  useEffect(() => {
    const v = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(v || null);
    if (v && cargoWeight > 0) {
      const result = validateCargoWeight(cargoWeight, v);
      setCargoError(result.valid ? '' : result.message || '');
    }
  }, [vehicleId, cargoWeight, vehicles]);

  const goToAiStep = async () => {
    if (!selectedVehicle || !selectedDriver) {
      toast.error('Select vehicle and driver first');
      return;
    }
    setStep(2);
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/dispatch-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: selectedDriver.name,
          driver_safety_score: selectedDriver.safety_score,
          license_expiry_date: selectedDriver.license_expiry_date,
          vehicle_name: selectedVehicle.name,
          vehicle_registration: selectedVehicle.registration_number,
          vehicle_odometer: selectedVehicle.odometer,
          cargo_weight: watch('cargo_weight'),
          max_load_capacity: selectedVehicle.max_load_capacity,
          planned_distance: watch('planned_distance'),
          source: watch('source'),
          destination: watch('destination'),
        }),
      });
      const data = await res.json();
      setAiRisk(data.assessment);
    } catch {
      setAiRisk({ risk: 'Low', score: 80, summary: 'AI assessment unavailable.', recommendations: [] });
    }
    setLoadingAi(false);
  };

  const onDispatch = async (formData: FormData) => {
    if (cargoError) { toast.error(cargoError); return; }
    setDispatching(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Create trip first
    const { data: tripData, error: createError } = await supabase
      .from('trips')
      .insert({
        source: formData.source,
        destination: formData.destination,
        vehicle_id: formData.vehicle_id,
        driver_id: formData.driver_id,
        cargo_weight: formData.cargo_weight,
        planned_distance: formData.planned_distance,
        notes: formData.notes,
        ai_risk_level: aiRisk?.risk,
        ai_risk_summary: aiRisk?.summary,
        ai_risk_recommendations: aiRisk?.recommendations || [],
        created_by: user?.id,
        trip_number: '',
      })
      .select()
      .single();

    if (createError) {
      toast.error(createError.message);
      setDispatching(false);
      return;
    }

    // Dispatch it
    const res = await fetch(`/api/trips/${tripData.id}/dispatch`, { method: 'POST' });
    const dispatchData = await res.json();

    if (dispatchData.error) {
      toast.error(dispatchData.error);
      // Delete the just-created draft
      await supabase.from('trips').delete().eq('id', tripData.id);
    } else {
      toast.success(`Trip ${tripData.trip_number} dispatched! 🚛`);
      onSuccess();
    }
    setDispatching(false);
  };

  const riskColors = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
  const riskColor = aiRisk ? riskColors[aiRisk.risk] : '#9090b0';

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-content"
        style={{ maxWidth: 600 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <Route size={16} style={{ color: '#3b82f6' }} />
            </div>
            <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create & Dispatch Trip</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost w-8 h-8 p-0" style={{ padding: 0 }}><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-4 gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold`}
                  style={{
                    background: i < step ? '#22c55e' : i === step ? 'var(--color-amber-500)' : 'var(--color-bg-elevated)',
                    color: i <= step ? '#000' : 'var(--color-text-muted)',
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium" style={{ color: i === step ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onDispatch)}>
          <div className="px-6 py-5">
            {/* STEP 0 — Route */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Source *</label>
                    <input className={`input ${errors.source ? 'input-error' : ''}`} placeholder="Mumbai" {...register('source')} />
                    {errors.source && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.source.message}</p>}
                  </div>
                  <div>
                    <label className="label">Destination *</label>
                    <input className={`input ${errors.destination ? 'input-error' : ''}`} placeholder="Pune" {...register('destination')} />
                    {errors.destination && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.destination.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Planned Distance (km) *</label>
                    <input type="number" className={`input ${errors.planned_distance ? 'input-error' : ''}`} placeholder="150" {...register('planned_distance', { valueAsNumber: true })} />
                    {errors.planned_distance && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.planned_distance.message}</p>}
                  </div>
                  <div>
                    <label className="label">Cargo Weight (kg) *</label>
                    <input type="number" className={`input ${cargoError ? 'input-error' : ''}`} placeholder="200" {...register('cargo_weight', { valueAsNumber: true })} />
                    {cargoError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{cargoError}</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input resize-none" rows={2} placeholder="Special instructions…" {...register('notes')} />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-primary">
                    Next: Assign <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Assign */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Vehicle selector */}
                <div>
                  <label className="label">Select Vehicle * (only Available shown)</label>
                  {vehicles.length === 0 ? (
                    <div className="alert alert-warning"><AlertTriangle size={14} /> No vehicles available for dispatch</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {vehicles.map(v => {
                        const isSelected = watch('vehicle_id') === v.id;
                        const cargoOk = cargoWeight === 0 || validateCargoWeight(cargoWeight, v).valid;
                        return (
                          <div
                            key={v.id}
                            onClick={() => { setValue('vehicle_id', v.id); setSelectedVehicle(v); }}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                            style={{
                              border: `1px solid ${isSelected ? 'var(--color-amber-500)' : 'var(--color-border)'}`,
                              background: isSelected ? 'rgba(245,158,11,0.08)' : 'var(--color-bg-elevated)',
                            }}
                          >
                            <Car size={16} style={{ color: isSelected ? 'var(--color-amber-400)' : 'var(--color-text-muted)' }} />
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{v.name}</div>
                              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {v.registration_number} · {v.type} · Max {v.max_load_capacity}kg
                                {!cargoOk && cargoWeight > 0 && (
                                  <span style={{ color: 'var(--color-danger)' }}> · ⚠️ Overweight!</span>
                                )}
                              </div>
                            </div>
                            {isSelected && <CheckCircle size={16} style={{ color: 'var(--color-amber-400)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.vehicle_id && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.vehicle_id.message}</p>}
                </div>

                {/* Driver selector */}
                <div>
                  <label className="label">Select Driver * (only Available with valid license shown)</label>
                  {drivers.length === 0 ? (
                    <div className="alert alert-warning"><AlertTriangle size={14} /> No drivers available</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {drivers.map(d => {
                        const isSelected = watch('driver_id') === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => { setValue('driver_id', d.id); setSelectedDriver(d); }}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                            style={{
                              border: `1px solid ${isSelected ? 'var(--color-amber-500)' : 'var(--color-border)'}`,
                              background: isSelected ? 'rgba(245,158,11,0.08)' : 'var(--color-bg-elevated)',
                            }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-amber-400)' }}>
                              {d.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{d.name}</div>
                              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                Score: {d.safety_score}/100 · {d.license_category} · Expires {new Date(d.license_expiry_date).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            {isSelected && <CheckCircle size={16} style={{ color: 'var(--color-amber-400)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.driver_id && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.driver_id.message}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(0)} className="btn btn-secondary flex-1">← Back</button>
                  <button
                    type="button"
                    onClick={goToAiStep}
                    disabled={!selectedVehicle || !selectedDriver}
                    className="btn btn-primary flex-1"
                  >
                    AI Review <Bot size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — AI Review */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={16} style={{ color: 'var(--color-amber-400)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    AI Dispatch Risk Assessment
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-amber-400)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    Powered by Groq
                  </span>
                </div>

                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-amber-400)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Analyzing trip risk factors…</p>
                  </div>
                ) : aiRisk ? (
                  <div className="space-y-4">
                    {/* Risk level card */}
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: `${riskColor}08`,
                        border: `1px solid ${riskColor}25`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Risk Level</div>
                          <div className="text-2xl font-black" style={{ color: riskColor }}>
                            {aiRisk.risk === 'Low' ? '🟢' : aiRisk.risk === 'Medium' ? '🟡' : '🔴'} {aiRisk.risk} Risk
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Risk Score</div>
                          <div className="text-2xl font-black" style={{ color: riskColor }}>{aiRisk.score}/100</div>
                        </div>
                      </div>
                      <div className="progress-bar mb-2">
                        <div className="progress-fill" style={{ width: `${aiRisk.score}%`, background: riskColor }} />
                      </div>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{aiRisk.summary}</p>
                    </div>

                    {/* Recommendations */}
                    {aiRisk.recommendations.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>RECOMMENDATIONS</div>
                        <div className="space-y-1.5">
                          {aiRisk.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              <span style={{ color: 'var(--color-amber-400)', flexShrink: 0, marginTop: 1 }}>→</span>
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trip summary */}
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                      <div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Vehicle</div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedVehicle?.name}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Driver</div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedDriver?.name}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Route</div>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{watch('source')} → {watch('destination')}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Est. Revenue</div>
                        <div className="text-sm font-medium" style={{ color: '#22c55e' }}>
                          ₹{(watch('planned_distance') * ratePerKm).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {aiRisk && (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1">← Back</button>
                    <button
                      type="submit"
                      disabled={dispatching}
                      className="btn btn-primary flex-1"
                      style={aiRisk.risk === 'High' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}}
                    >
                      {dispatching ? <Loader2 size={16} className="animate-spin" /> :
                        aiRisk.risk === 'High' ? '⚠️ Dispatch Anyway' : '🚛 Dispatch Now'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </form>
      </motion.div>
      </div>
    </ModalPortal>
  );
}
