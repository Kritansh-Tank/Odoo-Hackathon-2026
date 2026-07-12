'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, LayoutDashboard, Car, Users, Route, Wrench,
  Fuel, BarChart3, Bell, Settings, ChevronLeft, ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/vehicles', icon: Car, label: 'Vehicles' },
  { href: '/drivers', icon: Users, label: 'Drivers' },
  { href: '/trips', icon: Route, label: 'Trips' },
  { href: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { href: '/fuel-expenses', icon: Fuel, label: 'Fuel & Expenses' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, profile, unreadCount } = useAppStore();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen flex flex-col z-40 overflow-hidden"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 py-5"
        style={{ borderBottom: '1px solid var(--color-border)', minHeight: 64 }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          <Truck size={16} className="text-black" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-3 overflow-hidden whitespace-nowrap"
            >
              <div className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                TransitOps
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Fleet Platform
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const isNotif = href === '/notifications';
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-item ${active ? 'active' : ''}`}
              title={sidebarCollapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} />
                {isNotif && unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full text-black"
                    style={{ background: 'var(--color-amber-500)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap text-sm"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Profile & signout */}
      <div
        className="px-2 py-3 space-y-1"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {/* Profile */}
        <AnimatePresence>
          {!sidebarCollapsed && profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 rounded-lg mb-1"
              style={{ background: 'var(--color-bg-elevated)' }}
            >
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {profile.full_name}
              </div>
              <div className="text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                {profile.role.replace('_', ' ')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="sidebar-item w-full"
          title={sidebarCollapsed ? 'Sign Out' : undefined}
          style={{ color: 'var(--color-danger)' }}
        >
          <LogOut size={18} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm whitespace-nowrap"
              >
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center z-50 border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
