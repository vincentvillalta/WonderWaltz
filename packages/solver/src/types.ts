/**
 * Pure TypeScript solver contract types. Zero runtime deps, zero decorators.
 *
 * These mirror (structurally) the DTO shapes frozen in apps/api/src/shared/dto
 * as of plan 03-03 — FullDayPlanDto + PlanItemDto — but carry no NestJS /
 * class-transformer / class-validator coupling. The API layer maps
 * `DayPlan` → `FullDayPlanDto` at the controller boundary.
 *
 * See .planning/phases/03-engine/03-CONTEXT.md for decision context.
 */

// ───────────────────────────────────────────────────────────────────────
// Inputs
// ───────────────────────────────────────────────────────────────────────

export type AgeBracket = '0-2' | '3-6' | '7-9' | '10-13' | '14-17' | '18+';

export type Mobility = 'none' | 'reduced' | 'ecv';

export type SensoryProfile = 'none' | 'low' | 'high';

export type BudgetTier = 'pixie' | 'fairy' | 'royal';

export type LightningLaneType = 'multi_pass' | 'single_pass';

export type PlanItemType = 'attraction' | 'dining' | 'show' | 'break' | 'walk' | 'll_reminder';

export type PlanItemKind = PlanItemType; // alias for discoverability

export type SolverGuest = {
  id: string;
  ageBracket: AgeBracket;
  heightInches?: number;
  mobility: Mobility;
  sensory: SensoryProfile;
  dietary: string[];
  hasDas?: boolean;
};

export type TableServiceReservation = {
  attractionRefId?: string;
  venueName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
};

export type SolverPreferences = {
  budgetTier: BudgetTier;
  /** Ordered — position conveys priority (first = highest). */
  mustDoAttractionIds: string[];
  preferredShows: string[];
  tableServiceReservations: TableServiceReservation[];
  /** Free-text mobility notes forwarded from the trip request. */
  mobilityNotes?: string;
};

export type SolverTrip = {
  id: string;
  userId: string;
  resortId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive)
  partySize: number;
  budgetTier: BudgetTier;
  hasDas: boolean;
  lodgingType?: string;
};

// ─── Catalog refs (solver consumes structural data; loading is the API's job) ──

export type CatalogAttraction = {
  id: string;
  parkId: string;
  name: string;
  tags: string[];
  baselineWaitMinutes: number;
  lightningLaneType: LightningLaneType | null;
  isHeadliner: boolean;
  heightRequirementInches?: number;
  durationMinutes: number;
  /** Optional geo coords for walking-graph resolution. */
  lat?: number;
  lng?: number;
};

export type CatalogDining = {
  id: string;
  parkId: string;
  name: string;
  cuisineTags: string[];
  tableService: boolean;
  durationMinutes: number;
};

export type CatalogShow = {
  id: string;
  parkId: string;
  name: string;
  durationMinutes: number;
  /** Canonical show times in HH:MM (park-local). */
  showtimes: string[];
};

export type WalkingEdge = {
  fromNodeId: string;
  toNodeId: string;
  parkId: string;
  walkSeconds: number;
};

/**
 * Raw walking-graph edge bundle carried inside the catalog. The precomputed
 * Floyd-Warshall shape used at solve-time lives in `./walkingGraph.ts` as
 * the distinct `WalkingGraph` type — kept separate so the catalog stays a
 * plain serializable snapshot (no `Map` instances).
 */
export type CatalogWalkingGraph = {
  edges: WalkingEdge[];
};

export type SolverCatalog = {
  attractions: CatalogAttraction[];
  dining: CatalogDining[];
  shows: CatalogShow[];
  walkingGraph: CatalogWalkingGraph;
};

// ─── Volatile inputs (excluded from hash per CONTEXT.md) ───────────────────

export type ForecastConfidence = 'low' | 'medium' | 'high';

export type ForecastBucket = {
  attractionId: string;
  /** ISO 8601 start of bucket (e.g., 15-min or hourly). */
  bucketStart: string;
  predictedWaitMinutes: number;
  confidence: ForecastConfidence;
};

export type SolverForecasts = {
  buckets: ForecastBucket[];
};

export type WeatherDay = {
  date: string; // YYYY-MM-DD
  highF: number;
  lowF: number;
  precipitationProbability: number; // 0..1
  summary: string;
};

export type SolverWeather = {
  days: WeatherDay[];
};

export type CrowdBucket = 'light' | 'moderate' | 'heavy' | 'peak';

export type CrowdCalendarEntry = {
  date: string; // YYYY-MM-DD
  parkId: string;
  bucket: CrowdBucket;
  reason?: string;
};

export type SolverCrowdCalendar = {
  entries: CrowdCalendarEntry[];
};

// ─── Top-level input ───────────────────────────────────────────────────────

export type SolverInput = {
  trip: SolverTrip;
  guests: SolverGuest[];
  preferences: SolverPreferences;
  /** First date the solver plans for (inclusive), YYYY-MM-DD. */
  dateStart: string;
  /** Last date the solver plans for (inclusive), YYYY-MM-DD. */
  dateEnd: string;
  catalog: SolverCatalog;
  // Volatile — excluded from solver_input_hash.
  forecasts: SolverForecasts;
  weather: SolverWeather;
  crowdCalendar: SolverCrowdCalendar;
};

// ───────────────────────────────────────────────────────────────────────
// Outputs
// ───────────────────────────────────────────────────────────────────────

export type PlanItem = {
  id: string;
  type: PlanItemType;
  refId?: string;
  name: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  waitMinutes?: number;
  lightningLaneType?: LightningLaneType | null;
  notes?: string;
};

export type DayPlan = {
  dayIndex: number;
  date: string; // YYYY-MM-DD
  parkId: string;
  items: PlanItem[];
  warnings: string[];
};

// ───────────────────────────────────────────────────────────────────────
// Scoring (exposed for snapshot tests + future tuning)
// ───────────────────────────────────────────────────────────────────────

export type Score = {
  enjoymentWeight: number;
  timeCost: number;
  waitCost: number;
  walkCost: number;
  total: number;
};

export type Resource = {
  /** Stable resource ref (attraction ID, show ID, etc.). */
  refId: string;
  kind: PlanItemType;
  durationMinutes: number;
  parkId: string;
};
