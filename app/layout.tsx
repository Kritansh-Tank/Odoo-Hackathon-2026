import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from 'sonner';
import QueryProvider from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'TransitOps — Smart Transport Operations Platform',
  description:
    'Digitize your transport operations: vehicle registry, driver management, trip dispatch, maintenance, fuel tracking, and analytics.',
  keywords: ['fleet management', 'transport operations', 'logistics', 'dispatch'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Apply saved theme before first paint — no flash, no hydration mismatch */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('transitops-store')||'{}');var t=s.state&&s.state.theme;if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />

        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#0e0e1a',
              border: '1px solid #2d2d4a',
              color: '#f0f0ff',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </body>

    </html>
  );
}

