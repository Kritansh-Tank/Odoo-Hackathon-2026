import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/types';

interface AppState {
  // Auth
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Notifications badge
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;

  // Global settings cache
  ratePerKm: number;
  setRatePerKm: (rate: number) => void;

  licenseExpiryWarningDays: number;
  setLicenseExpiryWarningDays: (days: number) => void;

  // Table preferences
  vehicleFilters: {
    search: string;
    status: string;
    type: string;
    region: string;
  };
  setVehicleFilters: (filters: Partial<AppState['vehicleFilters']>) => void;

  tripFilters: {
    search: string;
    status: string;
  };
  setTripFilters: (filters: Partial<AppState['tripFilters']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      profile: null,
      setProfile: (profile) => set({ profile }),

      // UI
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Theme
      theme: 'dark',
      toggleTheme: () =>
        set((s) => {
          const newTheme = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        }),

      // Notifications
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),
      decrementUnread: () =>
        set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),

      // Settings
      ratePerKm: 15,
      setRatePerKm: (rate) => set({ ratePerKm: rate }),

      licenseExpiryWarningDays: 30,
      setLicenseExpiryWarningDays: (days) => set({ licenseExpiryWarningDays: days }),

      // Filters
      vehicleFilters: { search: '', status: 'all', type: 'all', region: '' },
      setVehicleFilters: (filters) =>
        set((s) => ({ vehicleFilters: { ...s.vehicleFilters, ...filters } })),

      tripFilters: { search: '', status: 'all' },
      setTripFilters: (filters) =>
        set((s) => ({ tripFilters: { ...s.tripFilters, ...filters } })),
    }),
    {
      name: 'transitops-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        ratePerKm: state.ratePerKm,
        licenseExpiryWarningDays: state.licenseExpiryWarningDays,
      }),
    }
  )
);
