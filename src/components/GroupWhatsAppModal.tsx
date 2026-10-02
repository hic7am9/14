import { useState } from 'react';
import { Copy, Send, MapPin, UserCheck } from 'lucide-react';
import { Modal } from './Modal';
import type { Apartment, Location } from '@/types';
import { copyToClipboard, sendWhatsApp, sendWhatsAppText } from '@/lib/whatsapp';

interface GroupWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  locations: Location[];
}

const AREA_NAMES = ['جدة', 'الخبر', 'المروة', 'الواحة'];
const GROUP_PHONE = '0554363516';

function isDepartureTomorrow(checkOutDate: string): boolean {
  const now = new Date();
  const checkout = new Date(checkOutDate);
  const nightBefore = new Date(checkout);
  nightBefore.setHours(19, 0, 0, 0);
  nightBefore.setDate(nightBefore.getDate() - 1);
  return now >= nightBefore && now < checkout;
}

export function GroupWhatsAppModal({ isOpen, onClose, apartments, locations }: GroupWhatsAppModalProps) {
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [sendMode, setSendMode] = useState<'choose' | 'group'>('choose');

  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  const buildMessage = (area: string): string => {
    const areaApartments = apartments.filter((apt) => {
      const locName = apt.location_id ? locMap.get(apt.location_id) : null;
      return locName === area;
    });

    if (area === 'الواحة') {
      return [
        'طلب موعد تنظيف',
        'الاسم: سامر بامفلح',
        'رقم العميل: 12',
        'نوع الوحدة: استديو',
        'رقم العمارة: 88A',
        'الدور : 6',
        'رقم الشقة: 2',
        'وقت الخروج : 12:00 PM',
        'وقت دخول الضيف الجديد اذا وجد: [وقت الدخول إن وجد]',
        'اللوكيشن:',
        'https://maps.app.goo.gl/RmuSwSrfion9EiLy5?g_st=ic',
      ].join('\n');
    }

    const departing = areaApartments.filter(
      (apt) => apt.current_booking && isDepartureTomorrow(apt.current_booking.check_out)
    );

    if (departing.length === 0) {
      return `تقرير الخروج غداً - ${area}:\nلا توجد مغادرات غداً`;
    }

    const lines = [`تقرير الخروج غداً - ${area}:`];
    for (const apt of departing) {
      lines.push(`• شقة ${apt.apt_number ?? apt.name} - ${apt.name}`);
    }
    return lines.join('\n');
  };

  const message = selectedArea ? buildMessage(selectedArea) : '';
  const hasDepartures = selectedArea && selectedArea !== 'الواحة'
    ? apartments.some((apt) => {
        const locName = apt.location_id ? locMap.get(apt.location_id) : null;
        return locName === selectedArea && apt.current_booking && isDepartureTomorrow(apt.current_booking.check_out);
      })
    : true;

  const handleCopy = () => {
    copyToClipboard(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (sendMode === 'group') {
      sendWhatsApp(GROUP_PHONE, message);
    } else {
      sendWhatsAppText(message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="واتساب الجروبات" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AREA_NAMES.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-semibold transition-all ${
                selectedArea === area
                  ? 'bg-whatsapp text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MapPin size={18} />
              {area}
            </button>
          ))}
        </div>

        {selectedArea && (
          <>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                {message}
              </pre>
            </div>

            {selectedArea !== 'الواحة' && !hasDepartures && (
              <p className="text-xs text-amber-600 text-center">
                لا توجد شقق بمغادرة غداً في هذه المنطقة
              </p>
            )}

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">وجهة الإرسال</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSendMode('choose')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    sendMode === 'choose' ? 'bg-whatsapp text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  اختيار من الواتساب
                </button>
                <button
                  onClick={() => setSendMode('group')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    sendMode === 'group' ? 'bg-whatsapp text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  إرسال للجروب
                </button>
              </div>
              {sendMode === 'choose' && (
                <p className="text-xs text-slate-400 mt-1.5 text-center">سيفتح الواتساب لتختار المُستلم بنفسك</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-secondary flex-1">
                {copied ? <UserCheck size={18} /> : <Copy size={18} />}
                {copied ? 'تم النسخ' : 'نسخ النص'}
              </button>
              <button onClick={handleSend} className="btn-success flex-1">
                <Send size={18} />
                إرسال للواتساب
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
