'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, LayoutDashboard, Car, Users, Route, Wrench,
  Fuel, BarChart3, Bell, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

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
  const { sidebarCollapsed, toggleSidebar, profile, unreadCount } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex fixed left-0 top-0 h-screen flex-col z-40 overflow-hidden"
      style={{
        background: 'var(--color-bg-sidebar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center px-3 py-4" style={{ minHeight: 64 }}>
        {sidebarCollapsed ? (
          /* Collapsed (64px): ONLY the expand chevron, full-width centred */
          <button
            onClick={toggleSidebar}
            className="w-full h-9 flex items-center justify-center rounded-lg cursor-pointer border"
            style={{
              background: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        ) : (
          /* Expanded (240px): truck + name left, collapse chevron right */
          <>
            <div
              className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Truck size={16} className="text-black" />
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <div className="font-bold text-sm whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                TransitOps
              </div>
              <div className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                Fleet Platform
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 w-6 h-6 rounded-full flex cursor-pointer items-center justify-center border ml-2"
              style={{
                background: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={12} />
            </button>
          </>
        )}
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


    </motion.aside>
  );
}
