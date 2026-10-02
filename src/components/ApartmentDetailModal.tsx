import { useState } from 'react';
import { Modal } from './Modal';
import { StatusModal, archiveBooking } from './StatusModal';
import { BookingModal } from './BookingModal';
import { ExtendModal } from './ExtendModal';
import { WhatsAppModal } from './WhatsAppModal';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/context/I18nContext';
import type { Apartment, Location, Booking } from '@/types';
import { formatDate, SOURCE_LABELS, PAYMENT_LABELS, STATUS_LABELS } from '@/lib/utils';
import {
  Edit, MessageCircle, AlertCircle, CalendarPlus, MapPin,
  Hash, Building2, Layers, User, Phone, Mail, Calendar,
  Banknote, CreditCard, FileText, Wrench,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment;
  apartments: Apartment[];
  locations: Location[];
  bookings: Booking[];
}

const STATUS_STYLE: Record<string, { dot: string; pill: string }> = {
  occupied:    { dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-800' },
  ready:       { dot: 'bg-sky-500',     pill: 'bg-sky-100 text-sky-800' },
  not_ready:   { dot: 'bg-amber-400',   pill: 'bg-amber-100 text-amber-800' },
  maintenance: { dot: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-800' },
};

export function ApartmentDetailModal({ isOpen, onClose, apartment, apartments, locations, bookings }: Props) {
  const { triggerRefresh } = useApp();
  const { t } = useI18n();
  const [statusOpen, setStatusOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const booking = apartment.current_booking ?? null;
  const style = STATUS_STYLE[apartment.status] ?? STATUS_STYLE.ready;

  const handleCheckout = async () => {
    if (!booking) return;
    setCheckoutLoading(true);
    try {
      await archiveBooking(booking, apartment);
      await supabase
        .from('apartments')
        .update({ status: 'not_ready', current_booking_id: null })
        .eq('id', apartment.id);
      triggerRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckoutLoading(false);
      setConfirmCheckout(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
        <div className="space-y-5 -mt-2">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{apartment.name}</h2>
              {apartment.location && (
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <MapPin size={14} />
                  <span>{apartment.location.name}</span>
                </div>
              )}
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${style.pill}`}>
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              {STATUS_LABELS[apartment.status]}
            </span>
          </div>

          {/* Apartment Details */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl">
            {apartment.apt_number && (
              <InfoRow icon={Hash} label="رقم الشقة" value={apartment.apt_number} />
            )}
            {apartment.building_number && (
              <InfoRow icon={Building2} label="رقم المبنى" value={apartment.building_number} />
            )}
            {apartment.floor_number && (
              <InfoRow icon={Layers} label="الطابق" value={apartment.floor_number} />
            )}
            {apartment.unit_type && (
              <InfoRow icon={Building2} label="نوع الوحدة" value={apartment.unit_type} />
            )}
            {apartment.maps_url && (
              <div className="col-span-2">
                <a
                  href={apartment.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sky-600 font-semibold hover:underline"
                >
                  <MapPin size={14} />
                  عرض على الخريطة
                </a>
              </div>
            )}
            {apartment.maintenance_note && apartment.status === 'maintenance' && (
              <div className="col-span-2">
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl">
                  <Wrench size={14} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-orange-700 font-medium">{apartment.maintenance_note}</p>
                </div>
              </div>
            )}
          </div>

          {/* Booking Section */}
          {booking ? (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">الحجز الحالي</h3>
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl">
                <InfoRow icon={User}     label={t('guest_name')}     value={booking.guest_name} />
                {booking.guest_phone && (
                  <InfoRow icon={Phone} label={t('phone')} value={booking.guest_phone} dir="ltr" />
                )}
                {booking.guest_email && (
                  <InfoRow icon={Mail}  label="البريد الإلكتروني" value={booking.guest_email} />
                )}
                <div className="col-span-2">
                  <InfoRow
                    icon={Calendar}
                    label="مدة الإقامة"
                    value={`${formatDate(booking.check_in)} ← ${formatDate(booking.check_out)}`}
                    dir="ltr"
                  />
                </div>
                {booking.source && (
                  <InfoRow icon={FileText} label="المصدر" value={SOURCE_LABELS[booking.source]} />
                )}
                {booking.total_price != null && (
                  <InfoRow icon={Banknote} label={t('total_price')} value={`${booking.total_price} ر.س`} />
                )}
                {booking.balance > 0 && (
                  <InfoRow icon={Banknote} label={t('balance')} value={`${booking.balance} ر.س`} highlight />
                )}
                {booking.payment_method && (
                  <InfoRow icon={CreditCard} label={t('payment_method')} value={PAYMENT_LABELS[booking.payment_method]} />
                )}
                {booking.notes && (
                  <div className="col-span-2">
                    <InfoRow icon={FileText} label={t('notes')} value={booking.notes} />
                  </div>
                )}
              </div>

              {/* Booking Actions */}
              <div className="flex gap-2 flex-wrap pt-1">
                {booking.guest_phone && (
                  <button onClick={() => setWhatsappOpen(true)} className="btn-success flex-1">
                    <MessageCircle size={16} />
                    واتساب
                  </button>
                )}
                <button onClick={() => setExtendOpen(true)} className="btn flex-1 bg-sky-100 text-sky-700 hover:bg-sky-200">
                  <CalendarPlus size={16} />
                  تمديد
                </button>
                <button onClick={() => setBookingOpen(true)} className="btn-secondary flex-1">
                  <Edit size={16} />
                  {t('edit_booking')}
                </button>
                <button onClick={() => setConfirmCheckout(true)} className="btn-danger flex-1">
                  <AlertCircle size={16} />
                  خروج وأرشفة
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl">
              <p className="text-sm font-semibold">لا يوجد حجز حالي</p>
            </div>
          )}

          {/* Status Change */}
          <div className="pt-1 border-t border-slate-100">
            <button onClick={() => setStatusOpen(true)} className="btn-secondary w-full">
              <Edit size={16} />
              تغيير حالة الشقة
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Checkout */}
      {confirmCheckout && (
        <Modal isOpen onClose={() => setConfirmCheckout(false)} title="تأكيد الخروج" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-700 text-center font-semibold">
              هل أنت متأكد من تسجيل الخروج وأرشفة الحجز؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCheckout(false)} className="btn-secondary flex-1">إلغاء</button>
              <button onClick={handleCheckout} disabled={checkoutLoading} className="btn-danger flex-1">
                {checkoutLoading ? '...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <StatusModal
        isOpen={statusOpen}
        onClose={() => { setStatusOpen(false); triggerRefresh(); onClose(); }}
        apartment={apartment}
      />

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => { setBookingOpen(false); triggerRefresh(); onClose(); }}
        apartment={apartment}
        apartments={apartments}
        locations={locations}
        bookings={bookings}
        editingBooking={booking ? {
          id: booking.id,
          guest_name: booking.guest_name,
          guest_phone: booking.guest_phone,
          source: booking.source,
          check_in: booking.check_in,
          check_out: booking.check_out,
          total_price: booking.total_price,
          balance: booking.balance,
          paid: booking.paid,
          payment_method: booking.payment_method,
          notes: booking.notes,
          apartment_id: apartment.id,
        } : null}
      />

      <ExtendModal
        isOpen={extendOpen}
        onClose={() => { setExtendOpen(false); triggerRefresh(); }}
        apartment={apartment}
        bookings={bookings}
      />

      {whatsappOpen && booking?.guest_phone && (
        <WhatsAppModal
          isOpen={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          apartment={apartment}
          booking={booking}
          location={apartment.location ?? null}
        />
      )}
    </>
  );
}

function InfoRow({
  icon: Icon, label, value, dir, highlight,
}: {
  icon: typeof User; label: string; value: string; dir?: 'ltr' | 'rtl'; highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mb-0.5">
        <Icon size={11} />
        {label}
      </p>
      <p className={`text-sm font-bold truncate ${highlight ? 'text-red-600' : 'text-slate-800'}`} dir={dir}>
        {value}
      </p>
    </div>
  );
}
