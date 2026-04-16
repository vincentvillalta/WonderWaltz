/**
 * SOLV-09: Park hours resolution with on-property Early Entry + EEH.
 *
 * Adjustments:
 * - On-property (value | moderate | deluxe | deluxe_villa): open -= 30min (Early Entry)
 * - Deluxe or Deluxe-Villa on eligible EEH nights: close += 2h (Extended Evening Hours)
 * - Off-property: no adjustments
 *
 * Pure — no randomness, no side effects, no I/O.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type LodgingType = 'off_property' | 'value' | 'moderate' | 'deluxe' | 'deluxe_villa';

export type BaseHours = {
  /** ISO 8601 datetime string for park open. */
  open: string;
  /** ISO 8601 datetime string for park close. */
  close: string;
};

export type ResolveParkHoursInput = {
  /** YYYY-MM-DD date for the park day. */
  date: string;
  /** Park ID (e.g., 'mk', 'epcot'). */
  parkId: string;
  /** Guest lodging type. */
  lodgingType: LodgingType;
  /** Base operating hours from parks.yaml or ingestion. */
  baseHours: BaseHours;
  /** Dates with Extended Evening Hours eligibility (YYYY-MM-DD). */
  eehNights: string[];
};

export type ResolvedParkHours = {
  open: string;
  close: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

/** Early Entry: 30 minutes before park open for on-property guests. */
const EARLY_ENTRY_MINUTES = 30;

/** Extended Evening Hours: 2 hours after park close for deluxe guests. */
const EEH_EXTENSION_MINUTES = 120;

/** Lodging types eligible for Early Entry (all on-property). */
const EARLY_ENTRY_ELIGIBLE: ReadonlySet<LodgingType> = new Set([
  'value',
  'moderate',
  'deluxe',
  'deluxe_villa',
]);

/** Lodging types eligible for Extended Evening Hours. */
const EEH_ELIGIBLE: ReadonlySet<LodgingType> = new Set(['deluxe', 'deluxe_villa']);

// ─── Time helpers (timezone-naive) ─────────────────────────────────────────

function parseIso(iso: string): { datePrefix: string; minutes: number } {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) throw new Error(`Invalid ISO string: ${iso}`);
  const [, datePrefix, hh, mm] = match;
  return { datePrefix, minutes: parseInt(hh, 10) * 60 + parseInt(mm, 10) };
}

function buildIso(datePrefix: string, minutes: number): string {
  // Handle midnight+ (next day) gracefully.
  if (minutes >= 24 * 60) {
    const nextDay = incrementDate(datePrefix);
    const adjustedMin = minutes - 24 * 60;
    const h = Math.floor(adjustedMin / 60);
    const m = adjustedMin % 60;
    return `${nextDay}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${datePrefix}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** Increment a YYYY-MM-DD date by 1 day. */
function incrementDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d + 1));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ─── Main function ─────────────────────────────────────────────────────────

/**
 * Resolves effective park hours based on lodging type and EEH eligibility.
 *
 * - On-property guests get 30 minutes Early Entry before park open.
 * - Deluxe/Deluxe-Villa guests get 2 extra hours on EEH nights.
 * - Off-property guests get no adjustments.
 */
export function resolveParkHours(input: ResolveParkHoursInput): ResolvedParkHours {
  const { date, lodgingType, baseHours, eehNights } = input;

  const parsedOpen = parseIso(baseHours.open);
  const parsedClose = parseIso(baseHours.close);

  let openMinutes = parsedOpen.minutes;
  let closeMinutes = parsedClose.minutes;
  const closeDatePrefix = parsedClose.datePrefix;

  // Early Entry: -30min for on-property guests.
  if (EARLY_ENTRY_ELIGIBLE.has(lodgingType)) {
    openMinutes -= EARLY_ENTRY_MINUTES;
  }

  // Extended Evening Hours: +2h for deluxe/deluxe_villa on eligible nights.
  if (EEH_ELIGIBLE.has(lodgingType) && eehNights.includes(date)) {
    closeMinutes += EEH_EXTENSION_MINUTES;
  }

  return {
    open: buildIso(parsedOpen.datePrefix, openMinutes),
    close: buildIso(closeDatePrefix, closeMinutes),
  };
}
