'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, DollarSign, Bell, Palette, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { getRoleLabel, getRoleColor } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

const TABS = ['General', 'Users', 'Notifications', 'Appearance'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const supabase = createClient();
  const { profile, ratePerKm, setRatePerKm, licenseExpiryWarningDays, setLicenseExpiryWarningDays, theme, toggleTheme } = useAppStore();
  const [tab, setTab] = useState<Tab>('General');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localRate, setLocalRate] = useState(ratePerKm);
  const [localWarningDays, setLocalWarningDays] = useState(licenseExpiryWarningDays);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (tab === 'Users' && isAdmin) {
      setLoadingUsers(true);
      supabase.from('profiles').select('*').order('created_at').then(({ data }) => {
        setUsers((data || []) as Profile[]);
        setLoadingUsers(false);
      });
    }
  }, [tab, isAdmin]);

  const saveSettings = async () => {
    setSavingSettings(true);
    await Promise.all([
      supabase.from('system_settings').update({ value: String(localRate) }).eq('key', 'rate_per_km'),
      supabase.from('system_settings').update({ value: String(localWarningDays) }).eq('key', 'license_expiry_warning_days'),
    ]);
    setRatePerKm(localRate);
    setLicenseExpiryWarningDays(localWarningDays);
    toast.success('Settings saved');
    setSavingSettings(false);
  };

  const changeRole = async (userId: string, newRole: Profile['role']) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { toast.error(error.message); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast.success('Role updated');
  };

  return (
    <div className="space-y-4 animate-fadein max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure TransitOps for your organization</p>
        </div>
      </div>

      <div className="tab-nav w-auto inline-flex">
        {TABS.map(t => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'General' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-6">
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>System Configuration</h3>

          <div>
            <label className="label">Revenue Rate (₹ per km)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className="input max-w-xs"
                value={localRate}
                onChange={e => setLocalRate(Number(e.target.value))}
                min={0}
                disabled={!isAdmin}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Used for auto-calculating trip revenue
              </span>
            </div>
          </div>

          <div>
            <label className="label">License Expiry Warning (days before)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className="input max-w-xs"
                value={localWarningDays}
                onChange={e => setLocalWarningDays(Number(e.target.value))}
                min={1}
                max={90}
                disabled={!isAdmin}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Show warning this many days before expiry
              </span>
            </div>
          </div>

          {isAdmin && (
            <button onClick={saveSettings} disabled={savingSettings} className="btn btn-primary">
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          )}
        </motion.div>
      )}

      {/* Users */}
      {tab === 'Users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            User Management {!isAdmin && <span className="text-xs ml-2" style={{ color: 'var(--color-danger)' }}>(Admin only)</span>}
          </h3>

          {!isAdmin ? (
            <div className="alert alert-warning">
              <span>Only Admins can manage user roles.</span>
            </div>
          ) : loadingUsers ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: getRoleColor(u.role) + '20', color: getRoleColor(u.role) }}
                  >
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{u.full_name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.email}</div>
                  </div>
                  {u.id === profile?.id ? (
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-amber-400)' }}>
                      You
                    </span>
                  ) : (
                    <select
                      className="input text-xs flex-shrink-0"
                      style={{ width: '160px' }}
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value as Profile['role'])}
                    >
                      <option value="driver">Driver (Employee)</option>
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="safety_officer">Safety Officer</option>
                      <option value="financial_analyst">Financial Analyst</option>
                      <option value="admin">Administrator</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Notifications */}
      {tab === 'Notifications' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notification Settings</h3>
          {[
            { label: 'Trip dispatched notifications', description: 'Get notified when a trip is dispatched' },
            { label: 'Trip completed notifications', description: 'Get notified when a trip is completed' },
            { label: 'Maintenance updates', description: 'Alerts for maintenance status changes' },
            { label: 'License expiry reminders', description: 'Email alerts for expiring driver licenses' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 rounded-full peer peer-checked:bg-amber-500 bg-gray-600 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </motion.div>
      )}

      {/* Appearance */}
      {tab === 'Appearance' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Appearance</h3>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Theme</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Currently: {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</div>
            </div>
            <button onClick={toggleTheme} className="btn btn-secondary btn-sm">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

