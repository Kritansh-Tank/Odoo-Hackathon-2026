'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
  href?: string;
}

export default function KPICard({ label, value, icon: Icon, color, subtitle, href }: KPICardProps) {
  const content = (
    <div className="kpi-card group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: `${color}18` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{
          background: `${color}12`,
          color,
          border: `1px solid ${color}25`,
        }}>
          Live
        </span>
      </div>

      <div className="stat-number" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      {subtitle && (
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:no-underline">{content}</Link>;
  }
  return content;
}
