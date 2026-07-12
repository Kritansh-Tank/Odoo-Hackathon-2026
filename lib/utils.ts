import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(dateStr: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, fmt);
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | Date): string {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a');
}

export function formatRelative(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return String(dateStr);
  }
}

// Currency formatting
export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Number formatting
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('en-IN')} km`;
}

export function formatKmL(efficiency: number): string {
  return `${efficiency.toFixed(1)} km/L`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Safety score color
export function getSafetyScoreClass(score: number): string {
  if (score >= 90) return 'score-excellent';
  if (score >= 75) return 'score-good';
  if (score >= 60) return 'score-fair';
  return 'score-poor';
}

export function getSafetyScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#84cc16';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

// Status badge class
export function getVehicleStatusClass(status: string): string {
  const map: Record<string, string> = {
    Available: 'badge-available',
    'On Trip': 'badge-on-trip',
    'In Shop': 'badge-in-shop',
    Retired: 'badge-retired',
  };
  return map[status] || 'badge-retired';
}

export function getDriverStatusClass(status: string): string {
  const map: Record<string, string> = {
    Available: 'badge-available',
    'On Trip': 'badge-on-trip',
    'Off Duty': 'badge-off-duty',
    Suspended: 'badge-suspended',
  };
  return map[status] || 'badge-off-duty';
}

export function getTripStatusClass(status: string): string {
  const map: Record<string, string> = {
    Draft: 'badge-draft',
    Dispatched: 'badge-dispatched',
    Completed: 'badge-completed',
    Cancelled: 'badge-cancelled',
  };
  return map[status] || 'badge-draft';
}

export function getMaintenanceStatusClass(status: string): string {
  const map: Record<string, string> = {
    Open: 'badge-open',
    'In Progress': 'badge-in-progress',
    Closed: 'badge-closed',
  };
  return map[status] || 'badge-open';
}

export function getRiskLevelClass(level: string): string {
  const map: Record<string, string> = {
    Low: 'badge-risk-low',
    Medium: 'badge-risk-medium',
    High: 'badge-risk-high',
  };
  return map[level] || 'badge-risk-low';
}

// Truncate text
export function truncate(str: string, len = 40): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

// Generate CSV
export function arrayToCsv(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return '';
  const keys = headers || Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map((row) =>
    keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Role display
export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    fleet_manager: 'Fleet Manager',
    driver: 'Driver',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  };
  return map[role] || role;
}

export function getRoleColor(role: string): string {
  const map: Record<string, string> = {
    admin: '#ef4444',
    fleet_manager: '#f59e0b',
    driver: '#3b82f6',
    safety_officer: '#22c55e',
    financial_analyst: '#8b5cf6',
  };
  return map[role] || '#9090b0';
}

// Notification icon
export function getNotificationIcon(type: string): string {
  const map: Record<string, string> = {
    trip_dispatched: '🚛',
    trip_completed: '✅',
    trip_cancelled: '❌',
    maintenance_created: '🔧',
    maintenance_closed: '✅',
    license_expiring: '⚠️',
    license_expired: '🚨',
    fuel_logged: '⛽',
    expense_added: '💰',
    user_role_changed: '👤',
  };
  return map[type] || '🔔';
}

// Color for utilization gauge
export function getUtilizationColor(percentage: number): string {
  if (percentage >= 80) return '#22c55e';
  if (percentage >= 50) return '#f59e0b';
  return '#ef4444';
}

// Debounce — uses `any` internally so typed callbacks like (v: string) => void work
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

// Parse regions from settings string
export function parseRegions(settingValue: string): string[] {
  return settingValue.split(',').map((r) => r.trim()).filter(Boolean);
}

// Re-export from business-rules for convenience
export { getLicenseDaysUntilExpiry } from '@/lib/business-rules';

// Vehicle types list
export const VEHICLE_TYPES = ['Truck', 'Van', 'Car', 'Bus', 'Motorcycle', 'Other'] as const;
export const LICENSE_CATEGORIES = ['LMV', 'HMV', 'HGMV', 'MGV', 'MC', 'MCWG', 'Transport'] as const;
export const MAINTENANCE_TYPES = [
  'Oil Change',
  'Tire Replacement',
  'Brake Service',
  'Engine Repair',
  'Battery Replacement',
  'AC Service',
  'Wheel Alignment',
  'Insurance Renewal',
  'Fitness Certificate',
  'Permit Renewal',
  'General Service',
  'Other',
] as const;
export const EXPENSE_TYPES = ['Toll', 'Parking', 'Loading', 'Other'] as const;
export const DEFAULT_REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const;
