import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { Apartment, BookingSource, PaymentMethod, Location, Booking } from '@/types';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/context/I18nContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment | null;
  apartments: Apartment[];
  locations: Location[];
  bookings: Booking[];
  editingBooking?: {
    id: string;
    guest_name: string;
    guest_phone: string | null;
    source: BookingSource;
    check_in: string;
    check_out: string;
    total_price: number | null;
    balance: number;
    paid: boolean;
    payment_method: PaymentMethod | null;
    notes: string | null;
    apartment_id: string;
  } | null;
}

export function BookingModal({ isOpen, onClose, apartment, apartments, locations, bookings, editingBooking }: BookingModalProps) {
  const { triggerRefresh } = useApp();
  const { t } = useI18n();
  const [selectedApt, setSelectedApt] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [source, setSource] = useState<BookingSource>('airbnb');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [balance, setBalance] = useState('');
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapBooking, setOverlapBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingBooking) {
        setSelectedApt(editingBooking.apartment_id);
        setGuestName(editingBooking.guest_name);
        setGuestPhone(editingBooking.guest_phone ?? '');
        setSource(editingBooking.source);
        setCheckIn(editingBooking.check_in);
        setCheckOut(editingBooking.check_out);
        setTotalPrice(editingBooking.total_price?.toString() ?? '');
        setBalance(editingBooking.balance?.toString() ?? '');
        setPaid(editingBooking.paid);
        setPaymentMethod(editingBooking.payment_method ?? '');
        setNotes(editingBooking.notes ?? '');
      } else {
        setSelectedApt(apartment?.id ?? '');
        setGuestName('');
        setGuestPhone('');
        setSource('airbnb');
        setCheckIn('');
        setCheckOut('');
        setTotalPrice('');
        setBalance('');
        setPaid(false);
        setPaymentMethod('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, apartment, editingBooking]);

  const isWhatsapp = source === 'whatsapp';

  const handleSubmit = async () => {
    if (!selectedApt || !guestName || !checkIn || !checkOut) {
      setError('يرجى تعبئة الحقول المطلوبة');
      return;
    }

    const overlapping = bookings.find(
      (b) =>
        b.apartment_id === selectedApt &&
        !b.archived &&
        b.id !== editingBooking?.id &&
        b.check_in < checkOut &&
        b.check_out > checkIn
    );
    if (overlapping) {
      setOverlapBooking(overlapping);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const baseData = {
        apartment_id: selectedApt,
        guest_name: guestName,
        guest_phone: guestPhone || null,
        source,
        check_in: checkIn,
        check_out: checkOut,
        notes: notes || null,
        balance: isWhatsapp && balance ? parseFloat(balance) : 0,
        paid: isWhatsapp ? paid : true,
        total_price: isWhatsapp && totalPrice ? parseFloat(totalPrice) : null,
        payment_method: isWhatsapp && paymentMethod ? paymentMethod : null,
      };

      if (editingBooking) {
        const { error: e } = await supabase
          .from('bookings')
          .update(baseData)
          .eq('id', editingBooking.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase
          .from('bookings')
          .insert(baseData)
          .select('id')
          .single();
        if (e) throw e;
        if (data) {
          await supabase
            .from('apartments')
            .update({ status: 'occupied', current_booking_id: data.id })
            .eq('id', selectedApt);
        }
      }
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
      const baseData = {
        apartment_id: selectedApt,
        guest_name: guestName,
        guest_phone: guestPhone || null,
        source,
        check_in: checkIn,
        check_out: checkOut,
        notes: notes || null,
        balance: isWhatsapp && balance ? parseFloat(balance) : 0,
        paid: isWhatsapp ? paid : true,
        total_price: isWhatsapp && totalPrice ? parseFloat(totalPrice) : null,
        payment_method: isWhatsapp && paymentMethod ? paymentMethod : null,
      };

      if (editingBooking) {
        const { error: e } = await supabase
          .from('bookings')
          .update(baseData)
          .eq('id', editingBooking.id);
        if (e) throw e;
        if (overlap) {
          await supabase
            .from('bookings')
            .update({ archived: true })
            .eq('id', overlap.id);
        }
      } else {
        const { data, error: e } = await supabase
          .from('bookings')
          .insert(baseData)
          .select('id')
          .single();
        if (e) throw e;
        if (data) {
          await supabase
            .from('apartments')
            .update({ status: 'occupied', current_booking_id: data.id })
            .eq('id', selectedApt);
          if (overlap) {
            await supabase
              .from('bookings')
              .update({ archived: true })
              .eq('id', overlap.id);
          }
        }
      }
      triggerRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const aptLocation = (id: string) => locations.find((l) => l.id === apartments.find((a) => a.id === id)?.location_id)?.name ?? '';

  const sourceButtons: { val: BookingSource; label: string; activeClass: string }[] = [
    { val: 'airbnb', label: 'Airbnb', activeClass: 'bg-airbnb text-white' },
    { val: 'gathern', label: t('gathern'), activeClass: 'bg-purple-600 text-white' },
    { val: 'whatsapp', label: t('whatsapp'), activeClass: 'bg-whatsapp text-black' },
    { val: 'direct', label: t('direct_booking'), activeClass: 'bg-slate-700 text-white' },
  ];

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={editingBooking ? t('edit_booking') : t('new_booking')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('apt_name')} *</label>
          <select value={selectedApt} onChange={(e) => setSelectedApt(e.target.value)} className="input">
            <option value="">اختر الشقة</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {aptLocation(a.id) ? `- ${aptLocation(a.id)}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('guest_name')} *</label>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input" placeholder={t('guest_name')} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('guest_phone')}</label>
            <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="input" placeholder="05xxxxxxxx" dir="ltr" />
          </div>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('check_in')} *</label>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('check_out')} *</label>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" dir="ltr" />
          </div>
        </div>

        {/* Payment fields only for WhatsApp */}
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

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('notes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} placeholder={t('notes')} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? '...' : editingBooking ? t('save') : t('new_booking')}
          </button>
        </div>
      </div>

    </Modal>

      {overlapBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 text-center">تأكيد استبدال الحجز</h3>
            <p className="text-sm text-slate-600 text-center">
              يوجد حجز حالي لهذه الشقة للضيف <span className="font-bold">{overlapBooking.guest_name}</span> من <span className="font-bold">{overlapBooking.check_in}</span> إلى <span className="font-bold">{overlapBooking.check_out}</span>.
              <br />
              هل تريد استبدال الحجز الموجود بحجزك الجديد؟
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
