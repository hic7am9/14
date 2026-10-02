import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { Apartment, ApartmentStatus, Booking, PaymentMethod } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment | null;
}

export async function archiveBooking(booking: Booking, apartment: Apartment) {
  const locName = apartment.location?.name ?? null;
  const { error } = await supabase.from('guests_archive').insert({
    apartment_id: apartment.id,
    apartment_name: apartment.name,
    apartment_number: apartment.apt_number,
    location_name: locName,
    guest_name: booking.guest_name,
    guest_phone: booking.guest_phone,
    guest_email: booking.guest_email,
    source: booking.source,
    check_in: booking.check_in,
    check_out: booking.check_out,
    total_price: booking.total_price,
    balance: booking.balance,
    paid: booking.paid,
    payment_method: booking.payment_method,
    notes: booking.notes,
  });
  if (error) console.error('archive error', error);
  await supabase.from('bookings').update({ archived: true }).eq('id', booking.id);
}

export async function restoreFromArchive(archiveId: string, apartment: Apartment) {
  const { data: archived, error: fetchErr } = await supabase
    .from('guests_archive')
    .select('*')
    .eq('id', archiveId)
    .single();
  if (fetchErr || !archived) return;

  const { data: newBooking, error: insertErr } = await supabase
    .from('bookings')
    .insert({
      apartment_id: apartment.id,
      guest_name: archived.guest_name,
      guest_phone: archived.guest_phone,
      guest_email: archived.guest_email,
      source: archived.source ?? 'airbnb',
      check_in: archived.check_in,
      check_out: archived.check_out,
      total_price: archived.total_price,
      balance: archived.balance ?? 0,
      paid: archived.paid ?? false,
      payment_method: archived.payment_method as PaymentMethod | null,
      notes: archived.notes,
      archived: false,
    })
    .select('id')
    .single();
  if (insertErr || !newBooking) return;

  await supabase
    .from('apartments')
    .update({ status: 'occupied' as ApartmentStatus, current_booking_id: newBooking.id })
    .eq('id', apartment.id);

  await supabase.from('guests_archive').delete().eq('id', archiveId);
}

export function StatusModal({ isOpen, onClose, apartment }: StatusModalProps) {
  const { triggerRefresh } = useApp();
  const [status, setStatus] = useState<ApartmentStatus>('ready');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (apartment) {
      setStatus(apartment.status);
      setNote(apartment.maintenance_note ?? '');
    }
  }, [apartment]);

  const handleSave = async () => {
    if (!apartment) return;
    setSaving(true);
    try {
      const updates: Partial<Apartment> = {
        status,
        maintenance_note: status === 'maintenance' ? note : null,
      };

      const { error } = await supabase.from('apartments').update(updates).eq('id', apartment.id);
      if (error) throw error;
      triggerRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!apartment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تغيير حالة: ${apartment.name}`} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STATUS_LABELS) as ApartmentStatus[]).map((s) => {
            const colors = STATUS_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  status === s
                    ? `${colors.badge} border-current`
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>

        {status === 'maintenance' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ملاحظة الصيانة</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input" rows={3} placeholder="اكتب سبب الصيانة..." />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? '...' : 'حفظ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
