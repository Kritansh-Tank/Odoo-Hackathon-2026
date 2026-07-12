'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/store/useAppStore';
import { createClient } from '@/lib/supabase/client';
import { isRouteAllowed } from '@/lib/business-rules';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, setProfile, sidebarCollapsed } = useAppStore();
  const supabase = createClient();

  const allowed = !profile || isRouteAllowed(profile.role, pathname);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login');
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      <Sidebar />
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ml-0 ${
          sidebarCollapsed ? 'md:ml-[64px]' : 'md:ml-[240px]'
        }`}
      >
        <Topbar />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: 'var(--color-bg-base)' }}
        >
          {allowed ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 max-w-sm mx-auto animate-scale-in">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Access Restricted
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Your account role <strong style={{ color: 'var(--color-text-secondary)' }}>({profile?.role})</strong> is not authorized to access this module.
              </p>
              <Link href="/dashboard" className="btn btn-primary px-6">
                Return to Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

