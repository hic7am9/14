import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { Apartment, ApartmentStatus, Location } from '@/types';
import { AIRBNB_ACCOUNTS } from '@/types';
import { STATUS_LABELS } from '@/lib/utils';
import { Trash2, Plus, MapPin, Mail } from 'lucide-react';

interface ManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  locations: Location[];
}

export function ManageModal({ isOpen, onClose, apartments, locations }: ManageModalProps) {
  const { triggerRefresh } = useApp();
  const [tab, setTab] = useState<'apartments' | 'locations'>('apartments');

  // Apartment form
  const [editApt, setEditApt] = useState<Apartment | null>(null);
  const [aptName, setAptName] = useState('');
  const [aptNumber, setAptNumber] = useState('');
  const [aptLocation, setAptLocation] = useState('');
  const [unitType, setUnitType] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [floorNo, setFloorNo] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [airbnbAccount, setAirbnbAccount] = useState('');
  const [savingApt, setSavingApt] = useState(false);
  const [aptError, setAptError] = useState('');

  // Location form
  const [newLocation, setNewLocation] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    if (isOpen && editApt) {
      setAptName(editApt.name);
      setAptNumber(editApt.apt_number ?? '');
      setAptLocation(editApt.location_id ?? '');
      setUnitType(editApt.unit_type ?? '');
      setBuildingNo(editApt.building_number ?? '');
      setFloorNo(editApt.floor_number ?? '');
      setMapsUrl(editApt.maps_url ?? '');
      setAirbnbAccount(editApt.airbnb_account ?? '');
    } else if (isOpen && !editApt) {
      setAptName(''); setAptNumber(''); setAptLocation(''); setUnitType('');
      setBuildingNo(''); setFloorNo(''); setMapsUrl(''); setAirbnbAccount('');
    }
  }, [isOpen, editApt]);

  const saveApartment = async () => {
    if (!aptName) return;
    setSavingApt(true);
    setAptError('');
    try {
      if (editApt) {
        const { error } = await supabase
          .from('apartments')
          .update({
            name: aptName, apt_number: aptNumber || null, location_id: aptLocation || null,
            unit_type: unitType || null, building_number: buildingNo || null,
            floor_number: floorNo || null, maps_url: mapsUrl || null,
            airbnb_account: airbnbAccount || null,
          })
          .eq('id', editApt.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('apartments')
          .insert({
            name: aptName, apt_number: aptNumber || null, location_id: aptLocation || null,
            unit_type: unitType || null, building_number: buildingNo || null,
            floor_number: floorNo || null, maps_url: mapsUrl || null,
            airbnb_account: airbnbAccount || null,
            status: 'ready' as ApartmentStatus,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (!data) throw new Error('لم يتم حفظ الشقة');
      }
      setEditApt(null);
      triggerRefresh();
      onClose();
    } catch (err) {
      console.error('saveApartment error:', err);
      setAptError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSavingApt(false);
    }
  };

  const deleteApartment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشقة؟ سيتم حذف جميع الحجوزات المرتبطة بها.')) return;
    const { error } = await supabase.from('apartments').delete().eq('id', id);
    if (error) { console.error(error); return; }
    triggerRefresh();
  };

  const addLocation = async () => {
    if (!newLocation) return;
    setSavingLoc(true);
    const { error } = await supabase
      .from('locations')
      .insert({ name: newLocation, display_order: locations.length + 1 });
    if (error) { console.error(error); }
    else { setNewLocation(''); triggerRefresh(); }
    setSavingLoc(false);
  };

  const deleteLocation = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموقع؟')) return;
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) { console.error(error); return; }
    triggerRefresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة الشقق والمواقع" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('apartments')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'apartments' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            الشقق ({apartments.length})
          </button>
          <button
            onClick={() => setTab('locations')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'locations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            المواقع ({locations.length})
          </button>
        </div>

        {tab === 'apartments' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">
                {editApt ? 'تعديل شقة' : 'إضافة شقة جديدة'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={aptName} onChange={(e) => setAptName(e.target.value)} className="input" placeholder="اسم الشقة *" />
                <input value={aptNumber} onChange={(e) => setAptNumber(e.target.value)} className="input" placeholder="رقم الشقة" />
                <select value={aptLocation} onChange={(e) => setAptLocation(e.target.value)} className="input">
                  <option value="">اختر الموقع</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="input">
                  <option value="">نوع الوحدة</option>
                  <option value="استديو">استديو</option>
                  <option value="شقة غرفة وصالة">شقة غرفة وصالة</option>
                  <option value="شقة غرفتين وصالة">شقة غرفتين وصالة</option>
                  <option value="شقة ثلاث غرف وصالة">شقة ثلاث غرف وصالة</option>
                  <option value="دبلكس">دبلكس</option>
                  <option value="فيلا">فيلا</option>
                </select>
                <input value={buildingNo} onChange={(e) => setBuildingNo(e.target.value)} className="input" placeholder="رقم العمارة" />
                <input value={floorNo} onChange={(e) => setFloorNo(e.target.value)} className="input" placeholder="الدور" />
              </div>
              <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} className="input" placeholder="رابط الموقع على خرائط جوجل" dir="ltr" />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">حساب Airbnb المرتبط</label>
                <select value={airbnbAccount} onChange={(e) => setAirbnbAccount(e.target.value)} className="input">
                  <option value="">بدون ربط بحساب Airbnb</option>
                  {AIRBNB_ACCOUNTS.map((acc) => <option key={acc} value={acc}>{acc}</option>)}
                </select>
              </div>
              {aptError && (
                <p className="text-sm text-red-500 font-semibold">{aptError}</p>
              )}
              <div className="flex gap-2">
                {editApt && <button onClick={() => setEditApt(null)} className="btn-secondary flex-1">إلغاء التعديل</button>}
                <button onClick={saveApartment} disabled={savingApt} className="btn-primary flex-1">
                  {savingApt ? 'جاري الحفظ...' : editApt ? 'حفظ التعديل' : 'إضافة'}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {apartments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{apt.name}</p>
                    <p className="text-xs text-slate-400">
                      {apt.location?.name ?? 'بدون موقع'} · {STATUS_LABELS[apt.status]}
                    </p>
                    {apt.airbnb_account && (
                      <p className="text-[10px] text-airbnb flex items-center gap-1 mt-0.5">
                        <Mail size={10} />
                        {apt.airbnb_account}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditApt(apt)} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs font-semibold">
                      تعديل
                    </button>
                    <button onClick={() => deleteApartment(apt.id)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {apartments.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">لا توجد شقق مضافة</p>
              )}
            </div>
          </div>
        )}

        {tab === 'locations' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">إضافة موقع جديد</h3>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addLocation(); }}
                className="input"
                placeholder="اسم الموقع / المدينة"
              />
              <button onClick={addLocation} disabled={savingLoc || !newLocation.trim()} className="btn-primary w-full">
                <Plus size={18} />
                {savingLoc ? '...' : 'إضافة الموقع'}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-900">{loc.name}</span>
                    <span className="text-xs text-slate-400">
                      ({apartments.filter((a) => a.location_id === loc.id).length} شقة)
                    </span>
                  </div>
                  <button onClick={() => deleteLocation(loc.id)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {locations.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">لا توجد مواقع</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
