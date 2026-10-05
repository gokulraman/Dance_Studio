export function rupees(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Must match the payments.method check constraint.
export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

export const WHOLE_NUMBER = /^\d+$/;

// Same rule as the database: E.164, e.g. +919876543210.
export const PHONE = /^\+[1-9][0-9]{7,14}$/;

// A bare 10-digit number is treated as Indian; anything else must already include its country code.
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  if (!compact) return null;
  return /^\d{10}$/.test(compact) ? `+91${compact}` : compact;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// V1 is India-only and IST has no daylight saving, so a fixed +05:30 offset matches the studio's "today".
export function studioToday() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export function clockTime(time: string) {
  return time.slice(0, 5);
}

export function shortDate(isoDate: string | null) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expiring_soon: { label: 'Expiring soon', tone: 'warn' },
  expires_today: { label: 'Expires today', tone: 'warn' },
  recently_expired: { label: 'Recently expired', tone: 'bad' },
  expired: { label: 'Expired', tone: 'bad' },
  inactive: { label: 'Inactive', tone: 'bad' },
  awaiting_activation: { label: 'Awaiting activation', tone: 'info' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
  new: { label: 'New', tone: 'neutral' },
};

export function statusInfo(status: string) {
  return STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
}
