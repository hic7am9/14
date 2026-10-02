export type ApartmentStatus = 'occupied' | 'ready' | 'not_ready' | 'maintenance';

export type BookingSource = 'airbnb' | 'gathern' | 'whatsapp' | 'direct';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'visa' | 'mada';

export const AIRBNB_ACCOUNTS = ['hic7am.skills@gmail.com', 'hic7am1998@gmail.com'] as const;
export type AirbnbAccount = typeof AIRBNB_ACCOUNTS[number];

export interface Location {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface Apartment {
  id: string;
  location_id: string | null;
  name: string;
  apt_number: string | null;
  unit_type: string | null;
  building_number: string | null;
  floor_number: string | null;
  maps_url: string | null;
  airbnb_account: string | null;
  display_order: number;
  status: ApartmentStatus;
  maintenance_note: string | null;
  current_booking_id: string | null;
  created_at: string;
  updated_at: string;
  location?: Location | null;
  current_booking?: Booking | null;
}

export interface Booking {
  id: string;
  apartment_id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  source: BookingSource;
  check_in: string;
  check_out: string;
  total_price: number | null;
  balance: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  apartment?: Apartment | null;
}

export interface GuestArchive {
  id: string;
  apartment_id: string | null;
  apartment_name: string | null;
  apartment_number: string | null;
  location_name: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  source: string | null;
  check_in: string | null;
  check_out: string | null;
  total_price: number | null;
  balance: number | null;
  paid: boolean | null;
  payment_method: string | null;
  notes: string | null;
  rating: number | null;
  archived_at: string;
}

export interface Cleaner {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export interface CleanerAssignment {
  id: string;
  cleaner_id: string;
  apartment_id: string;
  created_at: string;
}
