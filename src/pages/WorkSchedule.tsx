import { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, AlertCircle, MessageCircle, Edit, ChevronDown, ChevronUp, Settings, Search, LayoutGrid, List, CalendarPlus, MapPin, GripVertical } from 'lucide-react';
import type { Apartment, ApartmentStatus, Location, Booking } from '@/types';
import { isDepartureActive, formatDate, SOURCE_LABELS } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/context/I18nContext';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/Modal';
import { StatusModal, archiveBooking } from '@/components/StatusModal';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { GroupWhatsAppModal } from '@/components/GroupWhatsAppModal';
import { BookingModal } from '@/components/BookingModal';
import { ManageModal } from '@/components/ManageModal';
import { ExtendModal } from '@/components/ExtendModal';
import { ApartmentDetailModal } from '@/components/ApartmentDetailModal';

interface ScheduleProps {
  apartments: Apartment[];
  locations: Location[];
  bookings: Booking[];
}

export function WorkSchedule({ apartments, locations, bookings }: ScheduleProps) {
  const { triggerRefresh } = useApp();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [statusModal, setStatusModal] = useState<Apartment | null>(null);
  const [whatsappModal, setWhatsappModal] = useState<{ apt: Apartment; booking: Booking } | null>(null);
  const [groupWhatsappOpen, setGroupWhatsappOpen] = useState(false);
  const [bookingModal, setBookingModal] = useState<{ apt: Apartment | null; editing: boolean } | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState<Apartment | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState<Apartment | null>(null);
  const [detailModal, setDetailModal] = useState<Apartment | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const filtered = useMemo(() => {
    if (!search) return apartments;
    const q = search.toLowerCase();
    return apartments.filter(
      (apt) =>
        apt.name.toLowerCase().includes(q) ||
        (apt.current_booking?.guest_name ?? '').toLowerCase().includes(q)
    );
  }, [apartments, search]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickCheckout = async (apt: Apartment) => {
    if (!apt.current_booking || !apt.current_booking_id) return;
    setCheckoutLoading(apt.id);
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
      setCheckoutLoading(null);
      setConfirmCheckout(null);
    }
  };

  const handleReorder = async (aptId: string, targetIdx: number) => {
    const sorted = [...apartments];
    const fromIdx = sorted.findIndex((a) => a.id === aptId);
    if (fromIdx < 0 || fromIdx === targetIdx) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(targetIdx, 0, moved);
    const updates = sorted.map((apt, i) => ({
      id: apt.id,
      display_order: i,
    }));
    await Promise.all(
      updates.map((u) =>
        supabase.from('apartments').update({ display_order: u.display_order }).eq('id', u.id)
      )
    );
    triggerRefresh();
  };

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback((aptId: string) => {
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setDraggedId(aptId);
    }, 400);
  }, []);

  const handleDragStart = (e: React.DragEvent, aptId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', aptId);
    setDraggedId(aptId);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData('text/plain') || draggedId;
    if (aptId) handleReorder(aptId, targetIdx);
    setDraggedId(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverIdx(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('work_schedule')}</h1>
          <p className="text-sm text-slate-400 mt-1">{apartments.length} {t('total_apartments')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setGroupWhatsappOpen(true)} className="btn-success">
            <MessageCircle size={18} />
            <span className="hidden sm:inline">واتساب الجروبات</span>
          </button>
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button onClick={() => setManageOpen(true)} className="btn-secondary">
            <Settings size={18} />
          </button>
          <button onClick={() => setBookingModal({ apt: null, editing: false })} className="btn-primary">
            <Plus size={18} />
            <span className="hidden sm:inline">{t('new_booking')}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pr-10"
          placeholder={t('search') + ' ' + t('apt_name') + '/' + t('guest_name')}
        />
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map((apt, idx) => {
            const expanded = expandedRows.has(apt.id);
            const locName = apt.location?.name ?? 'بدون موقع';
            const departureActive = apt.current_booking && isDepartureActive(apt.current_booking.check_out);

            let rowClass = 'card overflow-hidden';
            if (departureActive) rowClass += ' row-red pulse-red';
            else if (apt.status === 'occupied') rowClass += ' row-occupied';
            else if (apt.status === 'not_ready') rowClass += ' row-gray';
            else if (apt.status === 'maintenance') rowClass += ' row-yellow';

            return (
              <div
                key={apt.id}
                className={rowClass}
                draggable={draggedId === apt.id}
                onDragStart={(e) => handleDragStart(e, apt.id)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIdx(null)}
                style={{
                  opacity: draggedId === apt.id ? 0.5 : 1,
                  transform: dragOverIdx === idx && draggedId !== apt.id ? 'translateY(2px)' : 'none',
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <div
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none select-none px-0.5"
                    onPointerDown={() => startLongPress(apt.id)}
                    onPointerUp={clearLongPress}
                    onPointerMove={clearLongPress}
                    onPointerCancel={clearLongPress}
                    title="اسحب لإعادة الترتيب"
                  >
                    <GripVertical size={16} />
                  </div>

                  <button
                    onClick={() => apt.current_booking && toggleRow(apt.id)}
                    className="text-slate-400"
                    disabled={!apt.current_booking}
                  >
                    {apt.current_booking && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{apt.name}</h3>
                      <span className="text-xs font-extrabold text-indigo-900 shrink-0">{locName}</span>
                    </div>
                    {apt.current_booking ? (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {apt.current_booking.guest_name}
                        </p>
                        {apt.current_booking.guest_phone && (
                          <p className="text-sm font-extrabold text-blue-900 truncate" dir="ltr">
                            {apt.current_booking.guest_phone}
                          </p>
                        )}
                        <span className="text-xs font-extrabold text-rose-800" dir="ltr">
                          {formatDate(apt.current_booking.check_in)} → {formatDate(apt.current_booking.check_out)}
                        </span>
                        {apt.current_booking.source && (
                          <span className={`badge text-[10px] font-extrabold px-2 py-0.5 ${
                            apt.current_booking.source === 'airbnb' ? 'bg-airbnb text-white' :
                            apt.current_booking.source === 'gathern' ? 'bg-purple-600 text-white' :
                            'bg-whatsapp text-black'
                          }`}>
                            {SOURCE_LABELS[apt.current_booking.source]}
                          </span>
                        )}
                      </div>
                    ) : apt.maintenance_note ? (
                      <p className="text-xs text-orange-600 mt-0.5 truncate">{apt.maintenance_note}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">—</p>
                    )}
                  </div>

                  {apt.status === 'occupied' ? (
                    <span className="badge bg-emerald-600 text-white shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {t('occupied')}
                    </span>
                  ) : apt.status === 'not_ready' ? (
                    <span className="badge bg-slate-400 text-white shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {t('not_ready')}
                    </span>
                  ) : apt.status === 'ready' ? (
                    <span className="badge bg-sky-600 text-white shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {t('ready')}
                    </span>
                  ) : (
                    <span className="badge bg-orange-600 text-white shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {t('maintenance')}
                    </span>
                  )}

                  <div className="flex gap-1 shrink-0">
                    {apt.current_booking?.guest_phone && (
                      <button
                        onClick={() => setWhatsappModal({ apt, booking: apt.current_booking! })}
                        className="p-1.5 rounded-lg text-whatsapp-dark hover:bg-whatsapp/10 transition-colors"
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setStatusModal(apt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>

                {expanded && apt.current_booking && (
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 animate-slide-down">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      {apt.current_booking.source === 'whatsapp' && apt.current_booking.payment_method && (
                        <DetailItem
                          label={t('payment_method')}
                          value={({ cash: t('cash'), bank_transfer: t('bank_transfer'), visa: t('visa'), mada: t('mada') } as Record<string, string>)[apt.current_booking.payment_method] ?? '—'}
                        />
                      )}
                      {apt.current_booking.source === 'whatsapp' && apt.current_booking.total_price != null && (
                        <DetailItem label={t('total_price')} value={`${apt.current_booking.total_price} ر.س`} />
                      )}
                      {apt.current_booking.source === 'whatsapp' && apt.current_booking.balance > 0 && (
                        <DetailItem label={t('balance')} value={`${apt.current_booking.balance} ر.س`} />
                      )}
                      {apt.current_booking.notes && (
                        <DetailItem label={t('notes')} value={apt.current_booking.notes} />
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setConfirmCheckout(apt)} className="btn-danger flex-1">
                        <AlertCircle size={16} />
                        خروج الضيف وأرشفة
                      </button>
                      <button onClick={() => setExtendModal(apt)} className="btn bg-sky-100 text-sky-700 hover:bg-sky-200">
                        <CalendarPlus size={16} />
                        تمديد
                      </button>
                      <button onClick={() => setBookingModal({ apt, editing: true })} className="btn-secondary">
                        <Edit size={16} />
                        {t('edit_booking')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-slate-400">{t('no_apartments')}</p>
            </div>
          )}
        </div>
      ) : (
        <GridView
          apartments={filtered}
          onCardClick={(apt) => setDetailModal(apt)}
          draggedId={draggedId}
          dragOverIdx={dragOverIdx}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          t={t}
        />
      )}

      {confirmCheckout && (
        <Modal isOpen onClose={() => setConfirmCheckout(null)} title="تأكيد الخروج" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-700 text-center font-semibold">
              هل أنت متأكد من رغبتك في تسجيل الخروج وتأكيد هذه الخطوة؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCheckout(null)} className="btn-secondary flex-1">إلغاء</button>
              <button
                onClick={() => handleQuickCheckout(confirmCheckout)}
                disabled={checkoutLoading === confirmCheckout.id}
                className="btn-danger flex-1"
              >
                {checkoutLoading === confirmCheckout.id ? '...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {statusModal && (
        <StatusModal isOpen={!!statusModal} onClose={() => setStatusModal(null)} apartment={statusModal} />
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
      {groupWhatsappOpen && (
        <GroupWhatsAppModal
          isOpen={groupWhatsappOpen}
          onClose={() => setGroupWhatsappOpen(false)}
          apartments={apartments}
          locations={locations}
        />
      )}
      <BookingModal
        isOpen={!!bookingModal}
        onClose={() => { setBookingModal(null); triggerRefresh(); }}
        apartment={bookingModal?.apt ?? null}
        apartments={apartments}
        locations={locations}
        bookings={bookings}
        editingBooking={bookingModal?.editing && bookingModal.apt?.current_booking ? {
          id: bookingModal.apt.current_booking.id,
          guest_name: bookingModal.apt.current_booking.guest_name,
          guest_phone: bookingModal.apt.current_booking.guest_phone,
          source: bookingModal.apt.current_booking.source,
          check_in: bookingModal.apt.current_booking.check_in,
          check_out: bookingModal.apt.current_booking.check_out,
          total_price: bookingModal.apt.current_booking.total_price,
          balance: bookingModal.apt.current_booking.balance,
          paid: bookingModal.apt.current_booking.paid,
          payment_method: bookingModal.apt.current_booking.payment_method,
          notes: bookingModal.apt.current_booking.notes,
          apartment_id: bookingModal.apt.id,
        } : null}
      />
      <ManageModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        apartments={apartments}
        locations={locations}
      />
      <ExtendModal
        isOpen={!!extendModal}
        onClose={() => setExtendModal(null)}
        apartment={extendModal}
        bookings={bookings}
      />
      {detailModal && (
        <ApartmentDetailModal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          apartment={detailModal}
          apartments={apartments}
          locations={locations}
          bookings={bookings}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{value}</p>
    </div>
  );
}

const STATUS_ORDER: ApartmentStatus[] = ['occupied', 'ready', 'maintenance', 'not_ready'];

const CARD_STYLE: Record<ApartmentStatus, { bg: string; border: string; text: string }> = {
  occupied:    { bg: 'bg-emerald-500 hover:bg-emerald-600',  border: 'border-emerald-600',  text: 'text-white' },
  ready:       { bg: 'bg-sky-500 hover:bg-sky-600',          border: 'border-sky-600',      text: 'text-white' },
  maintenance: { bg: 'bg-orange-500 hover:bg-orange-600',     border: 'border-orange-600',   text: 'text-white' },
  not_ready:   { bg: 'bg-slate-400 hover:bg-slate-500',         border: 'border-slate-500',    text: 'text-white' },
};

function GridView({
  apartments,
  onCardClick,
  draggedId,
  dragOverIdx,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  t,
}: {
  apartments: Apartment[];
  onCardClick: (apt: Apartment) => void;
  draggedId: string | null;
  dragOverIdx: number | null;
  onDragStart: (e: React.DragEvent, aptId: string) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  t: (k: string) => string;
}) {
  const grouped = useMemo(() => {
    const map: Record<ApartmentStatus, Apartment[]> = { occupied: [], ready: [], maintenance: [], not_ready: [] };
    for (const apt of apartments) {
      map[apt.status].push(apt);
    }
    return map;
  }, [apartments]);

  const aptIndex = useCallback((id: string) => apartments.findIndex((a) => a.id === id), [apartments]);

  if (apartments.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-400">{t('no_apartments')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        const style = CARD_STYLE[status];
        return (
          <div key={status}>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {group.map((apt) => {
                const realIdx = aptIndex(apt.id);
                return (
                  <ApartmentCard
                    key={apt.id}
                    apt={apt}
                    style={style}
                    realIdx={realIdx}
                    draggedId={draggedId}
                    dragOverIdx={dragOverIdx}
                    onClick={() => onCardClick(apt)}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApartmentCard({
  apt, style, realIdx, draggedId, dragOverIdx, onClick, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  apt: Apartment;
  style: typeof CARD_STYLE[ApartmentStatus];
  realIdx: number;
  draggedId: string | null;
  dragOverIdx: number | null;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, aptId: string) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}) {
  const booking = apt.current_booking ?? null;
  const departureActive = booking && isDepartureActive(booking.check_out);
  const isDragged = draggedId === apt.id;
  const isDragOver = dragOverIdx === realIdx && !isDragged;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, apt.id)}
      onDragOver={(e) => onDragOver(e, realIdx)}
      onDrop={(e) => onDrop(e, realIdx)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        opacity: isDragged ? 0.5 : 1,
        transform: isDragOver ? 'scale(1.05)' : 'none',
        transition: isDragOver ? 'transform 150ms ease-out' : 'transform 200ms ease-out',
      }}
      className={`relative ${departureActive ? 'bg-red-500 hover:bg-red-600 border-red-600' : `${style.bg} ${style.border}`} ${style.text} rounded-xl border-2 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 overflow-hidden group aspect-[3/4] flex flex-col justify-between p-2`}
    >
      {departureActive && (
        <div className="absolute top-1 left-1 flex items-center justify-center w-4 h-4 rounded-full bg-white text-red-600 animate-pulse">
          <AlertCircle size={10} />
        </div>
      )}

      {/* top: location */}
      <div className="flex items-center gap-1 mt-2.5">
        <MapPin size={10} className="shrink-0 opacity-80" />
        <span className="text-[10px] font-bold truncate opacity-90">{apt.location?.name ?? '—'}</span>
      </div>

      {/* center: apartment number/name */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold leading-none">{apt.apt_number ?? apt.name}</span>
        {apt.apt_number && apt.name !== apt.apt_number && (
          <span className="text-[9px] font-bold mt-1 opacity-80 truncate w-full text-center">{apt.name}</span>
        )}
      </div>

      {/* bottom: spacer to keep card layout balanced */}
      <div className="h-1" />
    </div>
  );
}
