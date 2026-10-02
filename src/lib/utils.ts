import type { ApartmentStatus, BookingSource, PaymentMethod } from '@/types';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export { sanitizePhone, whatsappLink } from './phone';

export const STATUS_LABELS: Record<ApartmentStatus, string> = {
  occupied: 'مشغولة',
  ready: 'جاهز',
  not_ready: 'غير جاهز',
  maintenance: 'صيانة',
};

export const STATUS_COLORS: Record<ApartmentStatus, { bg: string; text: string; badge: string; row: string }> = {
  occupied: { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-600 text-white', row: '' },
  ready: { bg: 'bg-sky-600', text: 'text-white', badge: 'bg-sky-600 text-white', row: '' },
  not_ready: { bg: 'bg-slate-400', text: 'text-white', badge: 'bg-slate-400 text-white', row: 'bg-slate-100' },
  maintenance: { bg: 'bg-orange-600', text: 'text-white', badge: 'bg-orange-600 text-white', row: 'bg-orange-100' },
};

export const SOURCE_LABELS: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  gathern: 'جَذرِن',
  whatsapp: 'واتساب',
  direct: 'مباشر',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'كاش',
  bank_transfer: 'تحويل بنكي',
  visa: 'فيزا',
  mada: 'مدى',
};

export function isDepartureActive(checkOutDate: string): boolean {
  const now = new Date();
  const checkout = new Date(checkOutDate);
  const nightBefore = new Date(checkout);
  nightBefore.setHours(19, 0, 0, 0);
  nightBefore.setDate(nightBefore.getDate() - 1);
  const checkoutEnd = new Date(checkout);
  checkoutEnd.setHours(16, 0, 0, 0);
  return now >= nightBefore && now <= checkoutEnd;
}

export function isDepartureTomorrow(checkOutDate: string): boolean {
  const now = new Date();
  const checkout = new Date(checkOutDate);
  const nightBefore = new Date(checkout);
  nightBefore.setHours(19, 0, 0, 0);
  nightBefore.setDate(nightBefore.getDate() - 1);
  return now >= nightBefore && now < checkout;
}

export function isDepartureToday(checkOutDate: string): boolean {
  const today = new Date();
  const checkout = new Date(checkOutDate);
  return (
    today.getFullYear() === checkout.getFullYear() &&
    today.getMonth() === checkout.getMonth() &&
    today.getDate() === checkout.getDate()
  );
}

export function getHijriDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString('ar-SA');
  }
}

export function getGregorianDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
