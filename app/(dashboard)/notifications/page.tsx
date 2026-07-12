'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';
import { formatRelative, getNotificationIcon } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const supabase = createClient();
  const { profile, setUnreadCount } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('recipient_id', profile.id).eq('read', false);
    setUnreadCount(0);
    load();
    toast.success('All notifications marked as read');
  };

  const deleteAll = async () => {
    if (!profile || !confirm('Delete all notifications?')) return;
    await supabase.from('notifications').delete().eq('recipient_id', profile.id);
    setNotifications([]);
    setUnreadCount(0);
    toast.success('Notifications cleared');
  };

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(Math.max(0, notifications.filter(n => !n.read).length - 1));
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4 animate-fadein max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="btn btn-secondary btn-sm">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button onClick={deleteAll} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={14} /> Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card py-16 text-center">
          <Bell size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <div className="empty-state-title">You&apos;re all caught up!</div>
          <div className="empty-state-desc text-center mx-auto max-w-xs">Notifications from trips, maintenance, and license alerts will appear here</div>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !n.read && markOneRead(n.id)}
              className="card cursor-pointer transition-all"
              style={{
                borderColor: n.read ? 'var(--color-border)' : 'rgba(245,158,11,0.3)',
                background: n.read ? 'var(--color-bg-card)' : 'rgba(245,158,11,0.04)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'var(--color-bg-elevated)' }}
                >
                  {getNotificationIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{n.title}</span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-amber-500)' }} />
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{n.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{formatRelative(n.created_at)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

