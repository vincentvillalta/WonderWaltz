/**
 * Shared helpers for canonical fixture inputs.
 * Deterministic forecastFn and base park catalog data.
 */

import type {
  CatalogAttraction,
  CatalogDining,
  CatalogShow,
  WalkingEdge,
  SolverGuest,
} from '../types.js';

// ─── Canonical parks ────────────────────────────────────────────────────────

export const PARKS = {
  mk: 'mk',
  epcot: 'epcot',
  dhs: 'dhs',
  ak: 'ak',
} as const;

// ─── MK Attractions ────────────────────────────────────────────────────────

export const MK_ATTRACTIONS: CatalogAttraction[] = [
  {
    id: 'mk-space-mountain',
    parkId: 'mk',
    name: 'Space Mountain',
    tags: ['thrill', 'roller-coaster', 'dark', 'indoor'],
    baselineWaitMinutes: 55,
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
    heightRequirementInches: 44,
    durationMinutes: 6,
  },
  {
    id: 'mk-seven-dwarfs',
    parkId: 'mk',
    name: 'Seven Dwarfs Mine Train',
    tags: ['family', 'roller-coaster'],
    baselineWaitMinutes: 80,
    lightningLaneType: 'single_pass',
    isHeadliner: true,
    heightRequirementInches: 38,
    durationMinutes: 4,
  },
  {
    id: 'mk-pirates',
    parkId: 'mk',
    name: 'Pirates of the Caribbean',
    tags: ['family', 'dark', 'water', 'indoor'],
    baselineWaitMinutes: 25,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 12,
  },
  {
    id: 'mk-haunted-mansion',
    parkId: 'mk',
    name: 'Haunted Mansion',
    tags: ['family', 'dark', 'indoor'],
    baselineWaitMinutes: 30,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 9,
  },
  {
    id: 'mk-its-a-small-world',
    parkId: 'mk',
    name: "it's a small world",
    tags: ['family', 'indoor', 'gentle'],
    baselineWaitMinutes: 15,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 11,
  },
  {
    id: 'mk-jungle-cruise',
    parkId: 'mk',
    name: 'Jungle Cruise',
    tags: ['family', 'outdoor'],
    baselineWaitMinutes: 35,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 10,
  },
  {
    id: 'mk-buzz-lightyear',
    parkId: 'mk',
    name: 'Buzz Lightyear Space Ranger Spin',
    tags: ['family', 'indoor', 'interactive', 'shooter'],
    baselineWaitMinutes: 20,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 5,
  },
  {
    id: 'mk-dumbo',
    parkId: 'mk',
    name: 'Dumbo the Flying Elephant',
    tags: ['family', 'gentle', 'outdoor'],
    baselineWaitMinutes: 25,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 3,
  },
  {
    id: 'mk-barnstormer',
    parkId: 'mk',
    name: 'The Barnstormer',
    tags: ['family', 'roller-coaster', 'outdoor'],
    baselineWaitMinutes: 20,
    lightningLaneType: null,
    isHeadliner: false,
    heightRequirementInches: 35,
    durationMinutes: 2,
  },
  {
    id: 'mk-peter-pan',
    parkId: 'mk',
    name: "Peter Pan's Flight",
    tags: ['family', 'dark', 'indoor', 'gentle'],
    baselineWaitMinutes: 50,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 4,
  },
];

// ─── EPCOT Attractions ─────────────────────────────────────────────────────

export const EPCOT_ATTRACTIONS: CatalogAttraction[] = [
  {
    id: 'epcot-guardians',
    parkId: 'epcot',
    name: 'Guardians of the Galaxy: Cosmic Rewind',
    tags: ['thrill', 'roller-coaster', 'dark', 'indoor'],
    baselineWaitMinutes: 70,
    lightningLaneType: 'single_pass',
    isHeadliner: true,
    heightRequirementInches: 42,
    durationMinutes: 5,
  },
  {
    id: 'epcot-test-track',
    parkId: 'epcot',
    name: 'Test Track',
    tags: ['thrill', 'fast', 'outdoor'],
    baselineWaitMinutes: 50,
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
    heightRequirementInches: 40,
    durationMinutes: 6,
  },
  {
    id: 'epcot-frozen',
    parkId: 'epcot',
    name: 'Frozen Ever After',
    tags: ['family', 'water', 'indoor'],
    baselineWaitMinutes: 45,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 5,
  },
  {
    id: 'epcot-ratatouille',
    parkId: 'epcot',
    name: "Remy's Ratatouille Adventure",
    tags: ['family', '4d', 'indoor'],
    baselineWaitMinutes: 40,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 5,
  },
  {
    id: 'epcot-spaceship-earth',
    parkId: 'epcot',
    name: 'Spaceship Earth',
    tags: ['family', 'indoor', 'gentle'],
    baselineWaitMinutes: 20,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 15,
  },
  {
    id: 'epcot-living-seas',
    parkId: 'epcot',
    name: 'The Seas with Nemo & Friends',
    tags: ['family', 'indoor', 'gentle'],
    baselineWaitMinutes: 10,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 6,
  },
];

// ─── DHS Attractions ───────────────────────────────────────────────────────

export const DHS_ATTRACTIONS: CatalogAttraction[] = [
  {
    id: 'dhs-rise-resistance',
    parkId: 'dhs',
    name: 'Star Wars: Rise of the Resistance',
    tags: ['thrill', 'dark', 'indoor', 'immersive'],
    baselineWaitMinutes: 90,
    lightningLaneType: 'single_pass',
    isHeadliner: true,
    heightRequirementInches: 40,
    durationMinutes: 18,
  },
  {
    id: 'dhs-tron',
    parkId: 'dhs',
    name: 'TRON Lightcycle / Run',
    tags: ['thrill', 'roller-coaster', 'fast', 'indoor'],
    baselineWaitMinutes: 75,
    lightningLaneType: 'single_pass',
    isHeadliner: true,
    heightRequirementInches: 48,
    durationMinutes: 4,
  },
  {
    id: 'dhs-rock-n-roller-coaster',
    parkId: 'dhs',
    name: "Rock 'n' Roller Coaster",
    tags: ['thrill', 'roller-coaster', 'dark', 'fast', 'loud', 'indoor'],
    baselineWaitMinutes: 60,
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
    heightRequirementInches: 48,
    durationMinutes: 3,
  },
  {
    id: 'dhs-tower-of-terror',
    parkId: 'dhs',
    name: 'Tower of Terror',
    tags: ['thrill', 'drop', 'dark', 'indoor'],
    baselineWaitMinutes: 55,
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
    heightRequirementInches: 40,
    durationMinutes: 5,
  },
  {
    id: 'dhs-slinky-dog',
    parkId: 'dhs',
    name: 'Slinky Dog Dash',
    tags: ['family', 'roller-coaster', 'outdoor'],
    baselineWaitMinutes: 65,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    heightRequirementInches: 38,
    durationMinutes: 3,
  },
  {
    id: 'dhs-smugglers-run',
    parkId: 'dhs',
    name: 'Millennium Falcon: Smugglers Run',
    tags: ['thrill', 'simulator', 'indoor', 'immersive'],
    baselineWaitMinutes: 45,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    heightRequirementInches: 38,
    durationMinutes: 7,
  },
  {
    id: 'dhs-toy-story-mania',
    parkId: 'dhs',
    name: 'Toy Story Mania!',
    tags: ['family', 'indoor', 'interactive', 'shooter'],
    baselineWaitMinutes: 35,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 7,
  },
];

// ─── AK Attractions ────────────────────────────────────────────────────────

export const AK_ATTRACTIONS: CatalogAttraction[] = [
  {
    id: 'ak-flight-passage',
    parkId: 'ak',
    name: 'Avatar Flight of Passage',
    tags: ['thrill', 'simulator', '3d', 'indoor'],
    baselineWaitMinutes: 80,
    lightningLaneType: 'single_pass',
    isHeadliner: true,
    heightRequirementInches: 44,
    durationMinutes: 6,
  },
  {
    id: 'ak-expedition-everest',
    parkId: 'ak',
    name: 'Expedition Everest',
    tags: ['thrill', 'roller-coaster', 'outdoor'],
    baselineWaitMinutes: 50,
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
    heightRequirementInches: 44,
    durationMinutes: 5,
  },
  {
    id: 'ak-kilimanjaro',
    parkId: 'ak',
    name: 'Kilimanjaro Safaris',
    tags: ['family', 'outdoor'],
    baselineWaitMinutes: 35,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 22,
  },
  {
    id: 'ak-navi-river',
    parkId: 'ak',
    name: "Na'vi River Journey",
    tags: ['family', 'water', 'indoor', 'gentle'],
    baselineWaitMinutes: 40,
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
    durationMinutes: 5,
  },
  {
    id: 'ak-dinosaur',
    parkId: 'ak',
    name: 'DINOSAUR',
    tags: ['thrill', 'dark', 'indoor'],
    baselineWaitMinutes: 25,
    lightningLaneType: null,
    isHeadliner: false,
    heightRequirementInches: 40,
    durationMinutes: 4,
  },
];

// ─── Shows ──────────────────────────────────────────────────────────────────

export const ALL_SHOWS: CatalogShow[] = [
  {
    id: 'mk-happily-ever-after',
    parkId: 'mk',
    name: 'Happily Ever After',
    durationMinutes: 18,
    showtimes: ['20:00'],
  },
  {
    id: 'epcot-harmonious',
    parkId: 'epcot',
    name: 'EPCOT Harmonious',
    durationMinutes: 20,
    showtimes: ['21:00'],
  },
  {
    id: 'dhs-fantasmic',
    parkId: 'dhs',
    name: 'Fantasmic!',
    durationMinutes: 30,
    showtimes: ['20:00'],
  },
  {
    id: 'ak-rivers-of-light',
    parkId: 'ak',
    name: 'Rivers of Light',
    durationMinutes: 15,
    showtimes: ['19:30'],
  },
];

// ─── Dining ─────────────────────────────────────────────────────────────────

export const ALL_DINING: CatalogDining[] = [
  {
    id: 'mk-be-our-guest',
    parkId: 'mk',
    name: 'Be Our Guest Restaurant',
    cuisineTags: ['french'],
    tableService: true,
    durationMinutes: 60,
    accommodates: ['vegetarian', 'gluten_free'],
  },
  {
    id: 'mk-cosmic-ray',
    parkId: 'mk',
    name: "Cosmic Ray's Starlight Cafe",
    cuisineTags: ['american'],
    tableService: false,
    durationMinutes: 30,
    accommodates: ['vegetarian'],
  },
  {
    id: 'epcot-space220',
    parkId: 'epcot',
    name: 'Space 220',
    cuisineTags: ['american'],
    tableService: true,
    durationMinutes: 75,
    accommodates: ['vegetarian', 'gluten_free', 'vegan'],
  },
  {
    id: 'dhs-50s-prime-time',
    parkId: 'dhs',
    name: "50's Prime Time Cafe",
    cuisineTags: ['american'],
    tableService: true,
    durationMinutes: 60,
    accommodates: ['vegetarian'],
  },
  {
    id: 'ak-tusker-house',
    parkId: 'ak',
    name: 'Tusker House Restaurant',
    cuisineTags: ['african'],
    tableService: true,
    durationMinutes: 60,
    accommodates: ['vegetarian', 'vegan'],
  },
];

// ─── Walking Graph ──────────────────────────────────────────────────────────

function buildParkEdges(parkId: string, attractionIds: string[]): WalkingEdge[] {
  const edges: WalkingEdge[] = [];
  // Connect entrance to first attraction
  edges.push({
    fromNodeId: 'entrance',
    toNodeId: attractionIds[0],
    parkId,
    walkSeconds: 300, // 5 min from entrance
  });
  // Connect attractions linearly
  for (let i = 0; i < attractionIds.length - 1; i++) {
    edges.push({
      fromNodeId: attractionIds[i],
      toNodeId: attractionIds[i + 1],
      parkId,
      walkSeconds: 120 + (i % 3) * 60, // 2-4 min between rides
    });
  }
  return edges;
}

export const ALL_WALKING_EDGES: WalkingEdge[] = [
  ...buildParkEdges(
    'mk',
    MK_ATTRACTIONS.map((a) => a.id),
  ),
  ...buildParkEdges(
    'epcot',
    EPCOT_ATTRACTIONS.map((a) => a.id),
  ),
  ...buildParkEdges(
    'dhs',
    DHS_ATTRACTIONS.map((a) => a.id),
  ),
  ...buildParkEdges(
    'ak',
    AK_ATTRACTIONS.map((a) => a.id),
  ),
];

// ─── Helper to build full catalog ───────────────────────────────────────────

export function buildCatalog(parkIds?: string[]) {
  const allAttractions = [
    ...MK_ATTRACTIONS,
    ...EPCOT_ATTRACTIONS,
    ...DHS_ATTRACTIONS,
    ...AK_ATTRACTIONS,
  ];
  const filter = parkIds ? (a: { parkId: string }) => parkIds.includes(a.parkId) : () => true;

  return {
    attractions: allAttractions.filter(filter),
    dining: ALL_DINING.filter(filter),
    shows: ALL_SHOWS.filter(filter),
    walkingGraph: {
      edges: ALL_WALKING_EDGES.filter((e) => !parkIds || parkIds.includes(e.parkId)),
    },
  };
}

// ─── Shared guest builders ──────────────────────────────────────────────────

export function adultGuest(id: string, overrides?: Partial<SolverGuest>): SolverGuest {
  return {
    id,
    ageBracket: '18+',
    mobility: 'none',
    sensory: 'none',
    dietary: [],
    ...overrides,
  };
}

export function childGuest(
  id: string,
  ageBracket: SolverGuest['ageBracket'],
  overrides?: Partial<SolverGuest>,
): SolverGuest {
  return {
    id,
    ageBracket,
    mobility: 'none',
    sensory: 'none',
    dietary: [],
    ...overrides,
  };
}
