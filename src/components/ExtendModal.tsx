import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { CalendarPlus } from 'lucide-react';
import type { Apartment, BookingSource, Booking, PaymentMethod } from '@/types';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/context/I18nContext';

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment | null;
  bookings: Booking[];
}

export function ExtendModal({ isOpen, onClose, apartment, bookings }: ExtendModalProps) {
  const { triggerRefresh } = useApp();
  const { t } = useI18n();
  const [newCheckOut, setNewCheckOut] = useState('');
  const [source, setSource] = useState<BookingSource>('airbnb');
  const [totalPrice, setTotalPrice] = useState('');
  const [balance, setBalance] = useState('');
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapBooking, setOverlapBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (isOpen && apartment?.current_booking) {
      const b = apartment.current_booking;
      setNewCheckOut(b.check_out);
      setSource(b.source);
      setTotalPrice(b.total_price?.toString() ?? '');
      setBalance(b.balance?.toString() ?? '');
      setPaid(b.paid);
      setPaymentMethod(b.payment_method ?? '');
      setError('');
      setOverlapBooking(null);
    }
  }, [isOpen, apartment]);

  if (!apartment?.current_booking) return null;

  const currentBooking = apartment.current_booking;
  const currentCheckOut = currentBooking.check_out;
  const isWhatsapp = source === 'whatsapp';

  const handleSubmit = async () => {
    if (!newCheckOut) {
      setError('يرجى تحديد تاريخ الخروج الجديد');
      return;
    }
    if (newCheckOut <= currentCheckOut) {
      setError('تاريخ الخروج الجديد يجب أن يكون بعد التاريخ الحالي');
      return;
    }

    const overlapping = bookings.find(
      (b) =>
        b.apartment_id === apartment.id &&
        !b.archived &&
        b.id !== currentBooking.id &&
        b.check_in < newCheckOut &&
        b.check_out > currentCheckOut
    );
    if (overlapping) {
      setOverlapBooking(overlapping);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { error: e } = await supabase
        .from('bookings')
        .update({
          check_out: newCheckOut,
          source,
          balance: isWhatsapp && balance ? parseFloat(balance) : 0,
          paid: isWhatsapp ? paid : true,
          total_price: isWhatsapp && totalPrice ? parseFloat(totalPrice) : null,
          payment_method: isWhatsapp && paymentMethod ? paymentMethod : null,
        })
        .eq('id', currentBooking.id);
      if (e) throw e;
      triggerRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReplace = async () => {
    const overlap = overlapBooking;
    setOverlapBooking(null);
    setSaving(true);
    try {
      if (overlap) {
        await supabase.from('bookings').update({ archived: true }).eq('id', overlap.id);
      }
      const { error: e } = await supabase
        .from('bookings')
        .update({
          check_out: newCheckOut,
          source,
          balance: isWhatsapp && balance ? parseFloat(balance) : 0,
          paid: isWhatsapp ? paid : true,
          total_price: isWhatsapp && totalPrice ? parseFloat(totalPrice) : null,
          payment_method: isWhatsapp && paymentMethod ? paymentMethod : null,
        })
        .eq('id', currentBooking.id);
      if (e) throw e;
      triggerRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const sourceButtons: { val: BookingSource; label: string; activeClass: string }[] = [
    { val: 'airbnb', label: 'Airbnb', activeClass: 'bg-airbnb text-white' },
    { val: 'gathern', label: t('gathern'), activeClass: 'bg-purple-600 text-white' },
    { val: 'whatsapp', label: t('whatsapp'), activeClass: 'bg-whatsapp text-black' },
  ];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="تمديد إقامة الضيف" size="sm">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-semibold">الضيف</span>
              <span className="font-bold text-slate-900">{currentBooking.guest_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-slate-500 font-semibold">تاريخ الخروج الحالي</span>
              <span className="font-bold text-slate-900" dir="ltr">{currentCheckOut}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">تاريخ الخروج الجديد *</label>
            <input
              type="date"
              value={newCheckOut}
              onChange={(e) => setNewCheckOut(e.target.value)}
              className="input"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('source')}</label>
            <div className="flex gap-2">
              {sourceButtons.map((btn) => (
                <button
                  key={btn.val}
                  onClick={() => setSource(btn.val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    source === btn.val ? btn.activeClass : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {isWhatsapp && (
            <div className="space-y-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('total_price')}</label>
                  <input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} className="input" placeholder="0" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('balance')}</label>
                  <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="input" placeholder="0" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('payment_method')}</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')} className="input">
                  <option value="">اختر</option>
                  <option value="cash">{t('cash')}</option>
                  <option value="bank_transfer">{t('bank_transfer')}</option>
                  <option value="visa">{t('visa')}</option>
                  <option value="mada">{t('mada')}</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">{t('paid')}</span>
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
              <CalendarPlus size={18} />
              {saving ? '...' : 'تمديد'}
            </button>
          </div>
        </div>
      </Modal>

      {overlapBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 text-center">تأكيد استبدال الحجز</h3>
            <p className="text-sm text-slate-600 text-center">
              يوجد حجز آخر لهذه الشقة للضيف <span className="font-bold">{overlapBooking.guest_name}</span> من <span className="font-bold">{overlapBooking.check_in}</span> إلى <span className="font-bold">{overlapBooking.check_out}</span>.
              <br />
              هل تريد الاستمرار مع استبدال الحجز المتعارض؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setOverlapBooking(null)} className="btn-secondary flex-1">لا</button>
              <button onClick={handleConfirmReplace} disabled={saving} className="btn-danger flex-1">
                {saving ? '...' : 'نعم، استبدال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
