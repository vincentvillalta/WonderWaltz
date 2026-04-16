/**
 * SOLV-04/SOLV-08: Shared ResourcePool for LLMP, LLSP, and DAS.
 *
 * Each pool tracks capacity and allocated return windows.
 * Pool kinds share the same allocate() interface — DAS is modeled as
 * an LL-equivalent resource.
 *
 * Pure — no randomness, no side effects, no I/O.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type ResourceKind = 'LLMP' | 'LLSP' | 'DAS';

export type ReturnWindow = {
  rideId: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
};

// ─── ResourcePool ──────────────────────────────────────────────────────────

/**
 * Tracks capacity and allocations for a single resource kind (LLMP, LLSP, or DAS).
 * Immutable capacity; allocations decrement remaining count.
 */
export class ResourcePool {
  readonly kind: ResourceKind;
  readonly capacityPerDay: number;
  private readonly allocations: Map<string, ReturnWindow> = new Map();

  constructor(kind: ResourceKind, capacityPerDay: number) {
    this.kind = kind;
    this.capacityPerDay = capacityPerDay;
  }

  /** Returns the number of remaining allocations available. */
  get remaining(): number {
    return this.capacityPerDay - this.allocations.size;
  }

  /** Returns all current allocations. */
  getAllocations(): ReadonlyMap<string, ReturnWindow> {
    return this.allocations;
  }

  /**
   * Attempt to allocate a return window for the given ride.
   * Returns the ReturnWindow on success, or null if capacity exhausted
   * or ride already allocated in this pool.
   *
   * @param rideId - Attraction ID to allocate for
   * @param bookingTime - ISO 8601 time of booking (return window starts 90min later)
   */
  allocate(rideId: string, bookingTime: string): ReturnWindow | null {
    if (this.remaining <= 0) return null;
    if (this.allocations.has(rideId)) return null;

    const returnWindow = computeReturnWindow(rideId, bookingTime);
    this.allocations.set(rideId, returnWindow);
    return returnWindow;
  }
}

// ─── Return window computation ─────────────────────────────────────────────

/** Fixed 90-minute offset for pre-park return windows. */
const RETURN_WINDOW_OFFSET_MINUTES = 90;

/** Compute a 90-min return window from booking time (timezone-naive). */
function computeReturnWindow(rideId: string, bookingTime: string): ReturnWindow {
  const match = bookingTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) throw new Error(`Invalid ISO string: ${bookingTime}`);

  const [, datePrefix, hh, mm] = match as [string, string, string, string, string];
  const bookingMinutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  const returnStartMin = bookingMinutes + RETURN_WINDOW_OFFSET_MINUTES;
  const returnEndMin = returnStartMin + RETURN_WINDOW_OFFSET_MINUTES;

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${datePrefix}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  return {
    rideId,
    start: formatTime(returnStartMin),
    end: formatTime(returnEndMin),
  };
}
