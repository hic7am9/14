import { useState, useRef } from 'react';
import { Download, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/context/I18nContext';
import { useApp } from '@/context/AppContext';
import type { Apartment, Booking, GuestArchive, Location } from '@/types';

interface BackupData {
  version: number;
  exported_at: string;
  locations: Location[];
  apartments: Apartment[];
  bookings: Booking[];
  guests_archive: GuestArchive[];
}

export function BackupRestore() {
  const { t } = useI18n();
  const { triggerRefresh } = useApp();
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setStatus('working');
    setMessage(t('backup_exporting'));
    try {
      const [locRes, aptRes, bookRes, archRes] = await Promise.all([
        supabase.from('locations').select('*'),
        supabase.from('apartments').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('guests_archive').select('*'),
      ]);

      if (locRes.error || aptRes.error || bookRes.error || archRes.error) {
        throw new Error('fetch failed');
      }

      const backup: BackupData = {
        version: 1,
        exported_at: new Date().toISOString(),
        locations: locRes.data ?? [],
        apartments: aptRes.data ?? [],
        bookings: bookRes.data ?? [],
        guests_archive: archRes.data ?? [],
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setMessage(t('backup_success'));
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setMessage(t('backup_error'));
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleImport = async (file: File) => {
    setStatus('working');
    setMessage(t('backup_importing'));
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;

      if (!backup.locations || !backup.apartments || !backup.bookings) {
        throw new Error('invalid backup file');
      }

      // Import order matters: locations -> apartments -> bookings -> archive
      // Use upsert to handle both new and existing IDs
      if (backup.locations.length > 0) {
        const { error } = await supabase.from('locations').upsert(backup.locations, { onConflict: 'id' });
        if (error) throw error;
      }

      // Strip nested relations before insert
      const apartments = backup.apartments.map(({ ...apt }) => {
        delete (apt as Record<string, unknown>).location;
        delete (apt as Record<string, unknown>).current_booking;
        return apt;
      });
      if (apartments.length > 0) {
        const { error } = await supabase.from('apartments').upsert(apartments, { onConflict: 'id' });
        if (error) throw error;
      }

      const bookings = backup.bookings.map(({ ...bk }) => {
        delete (bk as Record<string, unknown>).apartment;
        return bk;
      });
      if (bookings.length > 0) {
        const { error } = await supabase.from('bookings').upsert(bookings, { onConflict: 'id' });
        if (error) throw error;
      }

      if (backup.guests_archive && backup.guests_archive.length > 0) {
        const { error } = await supabase.from('guests_archive').upsert(backup.guests_archive, { onConflict: 'id' });
        if (error) throw error;
      }

      triggerRefresh();
      setStatus('success');
      setMessage(t('backup_success'));
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setMessage(t('backup_error'));
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm(t('backup_confirm_restore'))) {
        handleImport(file);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleExport}
        disabled={status === 'working'}
        className="btn-secondary"
      >
        {status === 'working' ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        {t('export_backup')}
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'working'}
        className="btn-secondary"
      >
        <Upload size={18} />
        {t('import_backup')}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onFileChange}
        className="hidden"
      />

      {status === 'success' && (
        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 animate-fade-in">
          <CheckCircle2 size={16} />
          {message}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500 animate-fade-in">
          <AlertCircle size={16} />
          {message}
        </div>
      )}
    </div>
  );
}
