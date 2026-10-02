import { from } from '@/lib/store';
import type { Apartment, Booking, GuestArchive, Location } from '@/types';

type TableMap = {
  locations: Location;
  apartments: Apartment;
  bookings: Booking;
  guests_archive: GuestArchive;
};

type TableNames = keyof TableMap;

function typedFrom<T extends TableNames>(table: T) {
  return from<TableMap[T]>(table);
}

/**
 * Drop-in replacement for the Supabase client.
 * All reads/writes go to localStorage so the app works fully offline.
 */
export const supabase = {
  from: typedFrom,
};
