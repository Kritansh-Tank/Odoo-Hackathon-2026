'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, Sun, Moon, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import { useState } from 'react';
import type { Notification } from '@/types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/drivers': 'Driver & Safety Profiles',
  '/trips': 'Trip Management',
  '/maintenance': 'Maintenance',
  '/fuel-expenses': 'Fuel & Expenses',
  '/reports': 'Reports & Analytics',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, unreadCount, setUnreadCount, profile } = useAppStore();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : pathname.startsWith(path)
  )?.[1] || 'TransitOps';

  // Load unread count + recent notifications
  useEffect(() => {
    if (!profile) return;

    const loadNotifs = async () => {
      const { data, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('recipient_id', profile.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (count !== null) setUnreadCount(count);
      if (data) setRecentNotifs(data as Notification[]);
    };

    loadNotifs();

    // Realtime subscription
    const channel = supabase
      .channel('topbar-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${profile.id}`,
      }, () => {
        loadNotifs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);
    setUnreadCount(0);
    setRecentNotifs([]);
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-3 flex-shrink-0"
      style={{
        background: 'var(--color-bg-base)',
        height: 64,
      }}
    >
      {/* Page title */}
      <div>
        <h1 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm w-10 h-10 p-0"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="btn btn-ghost btn-sm w-10 h-10 p-0 relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full text-black"
                style={{ background: 'var(--color-amber-500)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 animate-scale-in"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-strong)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs"
                    style={{ color: 'var(--color-amber-400)' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {recentNotifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>All caught up!</p>
                </div>
              ) : (
                <div>
                  {recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-amber-500)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {n.title}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {n.message}
                          </div>
                          <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-disabled)' }}>
                            {formatRelative(n.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-amber-400)' }}
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar + logout */}
        {profile && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
              }}
              title={profile.full_name}
            >
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn btn-ghost btn-sm w-10 h-10 p-0"
              title="Sign Out"
              style={{ color: 'var(--color-danger)' }}
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
