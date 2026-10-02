import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Apartment, Location, Booking, GuestArchive } from '@/types';

export type ViewName = 'dashboard' | 'schedule' | 'checkout' | 'archive';

interface DataCache {
  locations: Location[];
  apartments: Apartment[];
  bookings: Booking[];
  archive: GuestArchive[];
}

interface AppContextValue {
  view: ViewName;
  setView: (v: ViewName) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  data: DataCache;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const EMPTY: DataCache = { locations: [], apartments: [], bookings: [], archive: [] };

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewName>('schedule');
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<DataCache>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Single combined fetch — much faster than 4 separate round-trips
  const loadAll = useCallback(async (key: number, isInitial: boolean) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [locRes, aptRes, bookRes, archRes] = await Promise.all([
        supabase.from('locations').select('*').order('display_order').order('name'),
        supabase.from('apartments')
          .select('*, location:locations(*), current_booking:bookings!current_booking_id(*)')
          .order('display_order', { ascending: true }),
        supabase.from('bookings').select('*, apartment:apartments(*)').order('check_in', { ascending: false }),
        supabase.from('guests_archive').select('*').order('archived_at', { ascending: false }),
      ]);

      if (key !== refreshKey) return; // stale response

      const anyError = locRes.error || aptRes.error || bookRes.error || archRes.error;
      if (anyError) {
        console.error('Data load error:', { locRes, aptRes, bookRes, archRes });
      }

      setData({
        locations: locRes.data ?? [],
        apartments: (aptRes.data ?? []) as Apartment[],
        bookings: (bookRes.data ?? []) as Booking[],
        archive: (archRes.data ?? []) as GuestArchive[],
      });
    } catch (err) {
      console.error('loadAll failed:', err);
      if (isInitial) setError('تعذر تحميل البيانات. تحقق من الاتصال.');
    } finally {
      if (isInitial || key === refreshKey) setLoading(false);
    }
  }, [refreshKey]);

  // This ref-based approach avoids stale closure issues
  const refreshKeyRef = useRef(refreshKey);
  refreshKeyRef.current = refreshKey;

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  if (firstLoad.current) {
    firstLoad.current = false;
    Promise.resolve().then(() => loadAllRef.current(refreshKeyRef.current, true));
  }

  // Re-fetch on manual refresh only (not on view change)
  const lastRefresh = useRef(0);
  if (refreshKey !== lastRefresh.current) {
    lastRefresh.current = refreshKey;
    if (refreshKey > 0) {
      Promise.resolve().then(() => loadAllRef.current(refreshKey, false));
    }
  }

  return (
    <AppContext.Provider value={{ view, setView, refreshKey, triggerRefresh, data, loading, error }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
