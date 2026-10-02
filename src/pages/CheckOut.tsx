import { useState, useMemo } from 'react';
import { DoorOpen, ArrowLeft, MessageCircle, Phone, AlertCircle, CheckCircle, CalendarPlus } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { Apartment, Location, Booking } from '@/types';
import { isDepartureToday, isDepartureActive, formatDate, SOURCE_LABELS } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/context/I18nContext';
import { supabase } from '@/lib/supabase';
import { archiveBooking } from '@/components/StatusModal';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { ExtendModal } from '@/components/ExtendModal';

interface CheckOutProps {
  apartments: Apartment[];
  locations: Location[];
  bookings: Booking[];
}

export function CheckOut({ apartments, bookings }: CheckOutProps) {
  const { triggerRefresh } = useApp();
  const { t } = useI18n();
  const [whatsappModal, setWhatsappModal] = useState<{ apt: Apartment; booking: Booking } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<Apartment | null>(null);
  const [extendModal, setExtendModal] = useState<Apartment | null>(null);

  const departuresToday = useMemo(() => {
    return apartments.filter((apt) => {
      if (!apt.current_booking) return false;
      return isDepartureToday(apt.current_booking.check_out) || isDepartureActive(apt.current_booking.check_out);
    });
  }, [apartments]);

  const handleConfirm = async (apt: Apartment) => {
    if (!apt.current_booking || !apt.current_booking_id) return;
    setConfirming(apt.id);
    setConfirmModal(null);
    try {
      await archiveBooking(apt.current_booking, apt);
      await supabase
        .from('apartments')
        .update({ status: 'not_ready', current_booking_id: null })
        .eq('id', apt.id);
      triggerRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <DoorOpen size={24} className="text-slate-400" />
          {t('checkout')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {departuresToday.length} {t('departures_today')}
        </p>
      </div>

      {departuresToday.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-slate-400">{t('no_departures')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {departuresToday.map((apt) => {
            const booking = apt.current_booking!;
            const locName = apt.location?.name ?? 'بدون موقع';
            const departureActive = isDepartureActive(booking.check_out);
            const isToday = isDepartureToday(booking.check_out);

            return (
              <div
                key={apt.id}
                className={`card p-4 ${departureActive ? 'ring-2 ring-red-400' : ''}`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{apt.name}</h3>
                      <span className="text-xs text-slate-400">{locName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">{booking.guest_name}</span>
                      {booking.source && (
                        <span className={`badge text-[10px] ${
                          booking.source === 'airbnb' ? 'bg-airbnb/10 text-airbnb' :
                          booking.source === 'gathern' ? 'bg-purple-100 text-purple-700' :
                          'bg-whatsapp/10 text-whatsapp-dark'
                        }`}>
                          {SOURCE_LABELS[booking.source]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{t('check_out')}: {formatDate(booking.check_out)}</span>
                      {booking.balance > 0 && (
                        <span className="text-red-600 font-semibold">
                          {t('balance')}: {booking.balance} ر.س
                        </span>
                      )}
                    </div>
                  </div>

                  {isToday && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold">
                      <AlertCircle size={14} />
                      {t('departures_today')}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {booking.guest_phone && (
                      <>
                        <a
                          href="https://wa.me/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl text-whatsapp-dark hover:bg-whatsapp/10 transition-colors"
                          title={t('whatsapp')}
                        >
                          <MessageCircle size={18} />
                        </a>
                        <a
                          href={`tel:${booking.guest_phone}`}
                          className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                          title={t('guest_phone')}
                        >
                          <Phone size={18} />
                        </a>
                        <button
                          onClick={() => setWhatsappModal({ apt, booking })}
                          className="p-2.5 rounded-xl text-whatsapp-dark hover:bg-whatsapp/10 transition-colors"
                          title={t('whatsapp_templates')}
                        >
                          <MessageCircle size={18} className="opacity-60" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExtendModal(apt)}
                      className="btn bg-sky-100 text-sky-700 hover:bg-sky-200 px-3 py-2.5 text-sm"
                      title="تمديد الإقامة"
                    >
                      <CalendarPlus size={18} />
                      <span className="hidden sm:inline mr-1">تمديد</span>
                    </button>
                    <button
                      onClick={() => setConfirmModal(apt)}
                      disabled={confirming === apt.id}
                      className="btn-danger px-3 py-2.5 text-sm"
                      title={t('confirm_checkout')}
                    >
                      {confirming === apt.id ? '...' : <ArrowLeft size={20} />}
                      <span className="hidden sm:inline mr-1">{t('confirm_checkout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {whatsappModal && (
        <WhatsAppModal
          isOpen={!!whatsappModal}
          onClose={() => setWhatsappModal(null)}
          apartment={whatsappModal.apt}
          booking={whatsappModal.booking}
          location={whatsappModal.apt.location ?? null}
        />
      )}

      {confirmModal && (
        <Modal isOpen onClose={() => setConfirmModal(null)} title="تأكيد الخروج" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 text-center font-semibold">
              هل أنت متأكد من رغبتك في تسجيل الخروج وتأكيد هذه الخطوة؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal(null)} className="btn-secondary flex-1">إلغاء</button>
              <button
                onClick={() => handleConfirm(confirmModal)}
                disabled={confirming === confirmModal.id}
                className="btn-danger flex-1"
              >
                {confirming === confirmModal.id ? '...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {extendModal && (
        <ExtendModal
          isOpen={!!extendModal}
          onClose={() => setExtendModal(null)}
          apartment={extendModal}
          bookings={bookings}
        />
      )}
    </div>
  );
}
