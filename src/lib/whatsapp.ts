import type { Apartment, Booking, Location } from '@/types';
import { whatsappLink, formatDateShort } from '@/lib/utils';

interface TemplateContext {
  apartment: Apartment;
  booking: Booking;
  location: Location | null;
  nextBooking?: Booking | null;
}

export function buildCleaningRequest({ apartment, booking, nextBooking }: TemplateContext): string {
  const lines = [
    'طلب موعد تنظيف',
    `الاسم: ${booking.guest_name}`,
    `رقم العميل: ${booking.guest_phone ?? ''}`,
    `نوع الوحدة: ${apartment.unit_type ?? ''}`,
    `رقم العمارة: ${apartment.building_number ?? ''}`,
    `الدور: ${apartment.floor_number ?? ''}`,
    `رقم الشقة: ${apartment.apt_number ?? ''}`,
    `وقت الخروج: ${booking.check_out ? formatDateShort(booking.check_out) : ''}`,
    `وقت دخول الضيف الجديد اذا وجد: ${nextBooking?.check_in ? formatDateShort(nextBooking.check_in) : 'لا يوجد'}`,
    'اللوكيشن:',
    apartment.maps_url ?? '',
  ];
  return lines.join('\n');
}

export function buildImmediateCheckoutAlert({ apartment, location }: TemplateContext): string {
  const locationName = location?.name ?? '';
  const aptNo = apartment.apt_number ?? apartment.name;
  return `${locationName} (${aptNo}) تم خروج العميل ✅`;
}

export function buildCheckoutFollowup({ apartment, location }: TemplateContext): string {
  const locationApt = `${location?.name ?? ''} - ${apartment.name}`;
  return [
    'السلام عليكم ورحمة الله وبركاته',
    'كيف حالك 🌹',
    `بكلمك بخصوص الشقة ${locationApt}`,
    'هل تم مغادرة الشقة ؟',
  ].join('\n');
}

export function buildDailyReportMultiCity(
  departures: { apartment: Apartment; booking: Booking; location: Location | null }[]
): string {
  const byCity = new Map<string, { apartment: Apartment; booking: Booking }[]>();
  for (const d of departures) {
    const cityName = d.location?.name ?? 'غير محدد';
    if (!byCity.has(cityName)) byCity.set(cityName, []);
    byCity.get(cityName)!.push({ apartment: d.apartment, booking: d.booking });
  }
  const lines: string[] = [];
  for (const [city, items] of byCity) {
    lines.push(`📍 ${city}`);
    for (const item of items) {
      const sourceLabel = item.booking.source === 'airbnb' ? 'Airbnb' : item.booking.source === 'gathern' ? 'جَذرِن' : 'واتساب';
      lines.push(`• الشقة (${item.apartment.name}) حجز من ${sourceLabel}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function buildDailyReportSingleNeighborhood(
  neighborhood: string,
  departures: { apartment: Apartment; booking: Booking; location: Location | null }[]
): string {
  const lines: string[] = [`📍 ${neighborhood}`];
  for (const d of departures) {
    const aptNo = d.apartment.apt_number ?? d.apartment.name;
    const suffix = d.apartment.status === 'not_ready' ? ' تم خروج العميل ✅' : '';
    lines.push(`• ${neighborhood} (${aptNo}) خروج بكره${suffix}`);
  }
  return lines.join('\n');
}

export function sendWhatsApp(phone: string, text: string) {
  const url = phone ? whatsappLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url;
}

export function sendWhatsAppText(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url;
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
