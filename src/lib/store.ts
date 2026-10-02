import type { Apartment, Booking, GuestArchive, Location } from '@/types';

const STORAGE_KEY = 'pms_data_v1';

interface DBShape {
  locations: Location[];
  apartments: Apartment[];
  bookings: Booking[];
  guests_archive: GuestArchive[];
}

const EMPTY_DB: DBShape = {
  locations: [],
  apartments: [],
  bookings: [],
  guests_archive: [],
};

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function nowISO(): string {
  return new Date().toISOString();
}

export function loadDB(): DBShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedIfEmpty();
    const parsed = JSON.parse(raw) as DBShape;
    return {
      locations: parsed.locations ?? [],
      apartments: parsed.apartments ?? [],
      bookings: parsed.bookings ?? [],
      guests_archive: parsed.guests_archive ?? [],
    };
  } catch {
    return { ...EMPTY_DB };
  }
}

export function saveDB(db: DBShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save DB', err);
  }
}

function seedIfEmpty(): DBShape {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return loadDB();

  const db: DBShape = {
    locations: [
      { id: uid(), name: 'الحي الدبلوماسي', display_order: 1, created_at: nowISO() },
      { id: uid(), name: 'الملقا', display_order: 2, created_at: nowISO() },
    ],
    apartments: [],
    bookings: [],
    guests_archive: [],
  };
  saveDB(db);
  return db;
}

export interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface SingleResult<T> {
  data: T | null;
  error: { message: string } | null;
}

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert';
type Comparable = string | number | boolean | null | undefined;

class QueryBuilder<T extends { id: string }> {
  private _op: Op = 'select';
  private _table: keyof DBShape;
  private _filters: { col: string; val: unknown }[] = [];
  private _order: { col: string; ascending: boolean }[] = [];
  private _payload: object | object[] | null = null;
  private _wantsReturn = false;
  private _wantsSingle = false;
  private _onConflict = 'id';

  constructor(table: keyof DBShape) {
    this._table = table;
  }

  select(_cols?: string): this {
    if (this._op === 'insert' || this._op === 'update' || this._op === 'upsert') {
      this._wantsReturn = true;
    } else {
      this._op = 'select';
    }
    return this;
  }

  insert(data: object): this {
    this._op = 'insert';
    this._payload = data;
    return this;
  }

  update(data: object): this {
    this._op = 'update';
    this._payload = data;
    return this;
  }

  delete(): this {
    this._op = 'delete';
    return this;
  }

  upsert(
    data: object | object[],
    options?: { onConflict?: string },
  ): this {
    this._op = 'upsert';
    this._payload = data;
    if (options?.onConflict) this._onConflict = options.onConflict;
    return this;
  }

  onConflict(col: string): this {
    this._onConflict = col;
    return this;
  }

  eq(col: string, val: unknown): this {
    this._filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this._order.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }

  single(): Promise<SingleResult<T>> {
    this._wantsSingle = true;
    return this._execute().then((res) => ({
      data: (res.data?.[0] as T) ?? null,
      error: res.error,
    }));
  }

  private expandRelations(row: Record<string, unknown>): Record<string, unknown> {
    const db = loadDB();
    if (this._table === 'apartments') {
      const locId = row.location_id as string | null;
      row.location = locId ? db.locations.find((l) => l.id === locId) ?? null : null;
      const cbId = row.current_booking_id as string | null;
      row.current_booking = cbId ? db.bookings.find((b) => b.id === cbId) ?? null : null;
    }
    if (this._table === 'bookings') {
      const aptId = row.apartment_id as string | null;
      row.apartment = aptId ? db.apartments.find((a) => a.id === aptId) ?? null : null;
    }
    return row;
  }

  private matches(row: Record<string, unknown>): boolean {
    return this._filters.every((f) => row[f.col] === f.val);
  }

  private sorted(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    if (this._order.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const o of this._order) {
        const av = a[o.col] as Comparable | undefined;
        const bv = b[o.col] as Comparable | undefined;
        if (av === bv) continue;
        if (av == null) return o.ascending ? -1 : 1;
        if (bv == null) return o.ascending ? 1 : -1;
        const cmp = av < bv ? -1 : 1;
        return o.ascending ? cmp : -cmp;
      }
      return 0;
    });
  }

  then<TResult1 = QueryResult<T>>(
    onFulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
  ): Promise<TResult1> {
    return this._execute().then(onFulfilled);
  }

  private _execute(): Promise<QueryResult<T>> {
    return new Promise((resolve) => {
      try {
        const db = loadDB();
        const tableRows = db[this._table] as unknown as Record<string, unknown>[];

        if (this._op === 'select') {
          let rows = tableRows.filter((r) => this.matches(r));
          rows = this.sorted(rows);
          if (this._table === 'apartments' || this._table === 'bookings') {
            rows = rows.map((r) => this.expandRelations({ ...r }));
          }
          resolve({ data: rows as unknown as T[], error: null });
          return;
        }

        if (this._op === 'insert') {
          const payload = this._payload as Record<string, unknown>;
          const newRow: Record<string, unknown> = {
            ...payload,
            id: payload.id ?? uid(),
            created_at: payload.created_at ?? nowISO(),
          };
          (db[this._table] as unknown as Record<string, unknown>[]).push(newRow);
          saveDB(db);
          if (this._wantsReturn) {
            resolve({ data: [newRow] as unknown as T[], error: null });
          } else {
            resolve({ data: null, error: null });
          }
          return;
        }

        if (this._op === 'upsert') {
          const arr = db[this._table] as unknown as Record<string, unknown>[];
          const payload = this._payload;
          const items = (Array.isArray(payload) ? payload : [payload]).filter(Boolean) as Record<string, unknown>[];
          for (const item of items) {
            const existingIdx = arr.findIndex((r) => r[this._onConflict] === item[this._onConflict]);
            if (existingIdx >= 0) {
              arr[existingIdx] = { ...arr[existingIdx], ...item };
            } else {
              arr.push({ ...item, id: item.id ?? uid(), created_at: item.created_at ?? nowISO() });
            }
          }
          saveDB(db);
          resolve({ data: null, error: null });
          return;
        }

        if (this._op === 'update') {
          const updated: Record<string, unknown>[] = [];
          for (const row of tableRows) {
            if (this.matches(row)) {
              Object.assign(row, this._payload);
              updated.push({ ...row });
            }
          }
          saveDB(db);
          if (this._wantsReturn) {
            resolve({ data: updated as unknown as T[], error: null });
          } else {
            resolve({ data: null, error: null });
          }
          return;
        }

        if (this._op === 'delete') {
          const remaining = tableRows.filter((r) => !this.matches(r));
          (db[this._table] as unknown) = remaining;
          saveDB(db);
          resolve({ data: null, error: null });
          return;
        }

        resolve({ data: null, error: null });
      } catch (err) {
        resolve({
          data: null,
          error: { message: err instanceof Error ? err.message : 'Unknown error' },
        });
      }
    });
  }
}

export function from<T extends { id: string }>(table: keyof DBShape): QueryBuilder<T> {
  return new QueryBuilder<T>(table);
}

export function exportAllData(): DBShape {
  return loadDB();
}

export function importAllData(data: DBShape): void {
  saveDB(data);
}
