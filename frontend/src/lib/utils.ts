export const money = (n: number | undefined | null, currency = '₹'): string => {
  const num = Number(n) || 0;
  return `${currency}${Math.abs(num).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
};

export const moneyFull = (n: number | undefined | null, currency = '₹'): string => {
  const num = Number(n) || 0;
  return `${currency}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (d: string | Date | undefined | null): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatShortDate = (d: string | Date | undefined | null): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const today = new Date();
  const diff = today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0);
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === -1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/** Days between two dates (inclusive of both ends) */
export const daysBetween = (start: Date | string, end: Date | string): number => {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
};

/** Days from today to end date (0 if passed) */
export const daysRemaining = (end: Date | string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((e.getTime() - today.getTime()) / 86_400_000));
};

/** Days elapsed from start to today */
export const daysElapsed = (start: Date | string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - s.getTime()) / 86_400_000));
};

export type BudgetStatus = 'healthy' | 'watch' | 'critical' | 'exceeded';

export const getBudgetStatus = (spent: number, total: number): BudgetStatus => {
  if (total <= 0) return 'healthy';
  const pct = (spent / total) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'watch';
  return 'healthy';
};

export const budgetStatusLabel: Record<BudgetStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  critical: 'Critical',
  exceeded: 'Exceeded',
};

export const budgetStatusColor: Record<BudgetStatus, string> = {
  healthy: '#22c55e',
  watch: '#f59e0b',
  critical: '#ef4444',
  exceeded: '#dc2626',
};

export const budgetStatusBg: Record<BudgetStatus, string> = {
  healthy: 'rgba(34,197,94,0.15)',
  watch: 'rgba(245,158,11,0.15)',
  critical: 'rgba(239,68,68,0.15)',
  exceeded: 'rgba(220,38,38,0.15)',
};

export const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

export const pct = (part: number, total: number, cap = 100): number => {
  if (!total || total <= 0) return 0;
  return clamp(Math.round((part / total) * 1000) / 10, 0, cap);
};
