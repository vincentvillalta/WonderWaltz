/**
 * WDW Catalog Seed Script — idempotent upsert
 *
 * Run: DATABASE_URL="..." pnpm --filter @wonderwaltz/db tsx scripts/seed-catalog.ts
 *
 * Idempotency test (SC-3 from VALIDATION.md):
 * Run twice: tsx scripts/seed-catalog.ts && tsx scripts/seed-catalog.ts
 * Row counts must be identical after both runs.
 */
import { createDb } from '../src/index.js';
import { parks, attractions, dining, shows, resorts, walkingGraph } from '../src/schema/catalog.js';
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '../../../content/wdw');

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const db = createDb(DATABASE_URL);

function loadYaml<T>(filename: string): T[] {
  const content = readFileSync(resolve(CONTENT_DIR, filename), 'utf8');
  const data = parse(content) as Record<string, T[]>;
  const key = Object.keys(data).find((k) => k !== 'content_version');
  if (!key) throw new Error(`No data key found in ${filename}`);
  return data[key]!;
}

async function seedParks() {
  const data = loadYaml<{
    id: string;
    name: string;
    queue_times_id: number;
    themeparks_wiki_id: string;
    timezone: string;
    latitude: number;
    longitude: number;
  }>('parks.yaml');

  let count = 0;
  for (const park of data) {
    await db
      .insert(parks)
      .values({
        externalId: park.id,
        name: park.name,
        queueTimesId: park.queue_times_id,
        themeparksWikiId: park.themeparks_wiki_id,
        timezone: park.timezone,
        latitude: park.latitude,
        longitude: park.longitude,
      })
      .onConflictDoUpdate({
        target: parks.externalId,
        set: {
          name: park.name,
          queueTimesId: park.queue_times_id,
          themeparksWikiId: park.themeparks_wiki_id,
          timezone: park.timezone,
          latitude: park.latitude,
          longitude: park.longitude,
        },
      });
    count++;
  }
  console.log(`Parks: ${count} upserted`);
}

async function seedAttractions() {
  const data = loadYaml<{
    id: string;
    park_id: string;
    name: string;
    queue_times_id?: number;
    height_req_cm?: number | null;
    attraction_type: string;
    tags: string[];
    latitude?: number;
    longitude?: number;
  }>('attractions.yaml');

  // Build park externalId → uuid map
  const parkRows = await db.query.parks.findMany();
  const parkMap = new Map(parkRows.map((p) => [p.externalId, p.id]));

  let count = 0;
  for (const attraction of data) {
    const parkId = parkMap.get(attraction.park_id);
    if (!parkId) {
      console.warn(`Park not found for attraction ${attraction.id}: ${attraction.park_id}`);
      continue;
    }
    await db
      .insert(attractions)
      .values({
        externalId: attraction.id,
        parkId,
        name: attraction.name,
        queueTimesId: attraction.queue_times_id ?? null,
        heightReqCm: attraction.height_req_cm ?? null,
        attractionType: attraction.attraction_type,
        tags: attraction.tags,
      })
      .onConflictDoUpdate({
        target: attractions.externalId,
        set: {
          name: attraction.name,
          queueTimesId: attraction.queue_times_id ?? null,
          heightReqCm: attraction.height_req_cm ?? null,
          attractionType: attraction.attraction_type,
          tags: attraction.tags,
        },
      });
    count++;
  }
  console.log(`Attractions: ${count} upserted`);
}

async function seedResorts() {
  const data = loadYaml<{
    id: string;
    name: string;
    tier: string;
    is_on_property: boolean;
  }>('resorts.yaml');

  let count = 0;
  for (const resort of data) {
    await db
      .insert(resorts)
      .values({
        externalId: resort.id,
        name: resort.name,
        tier: resort.tier,
        isOnProperty: resort.is_on_property ?? true,
      })
      .onConflictDoUpdate({
        target: resorts.externalId,
        set: { name: resort.name, tier: resort.tier },
      });
    count++;
  }
  console.log(`Resorts: ${count} upserted`);
}

async function seedShows() {
  const data = loadYaml<{
    id: string;
    park_id: string;
    name: string;
    show_type: string;
  }>('shows.yaml');

  const parkRows = await db.query.parks.findMany();
  const parkMap = new Map(parkRows.map((p) => [p.externalId, p.id]));

  let count = 0;
  for (const show of data) {
    const parkId = parkMap.get(show.park_id);
    if (!parkId) continue;
    await db
      .insert(shows)
      .values({ externalId: show.id, parkId, name: show.name, showType: show.show_type })
      .onConflictDoUpdate({
        target: shows.externalId,
        set: { name: show.name, showType: show.show_type },
      });
    count++;
  }
  console.log(`Shows: ${count} upserted`);
}

async function seedDining() {
  const data = loadYaml<{
    id: string;
    park_id?: string;
    resort_id?: string;
    name: string;
    dining_type: string;
    cuisine_tags: string[];
  }>('dining.yaml');

  const parkRows = await db.query.parks.findMany();
  const parkMap = new Map(parkRows.map((p) => [p.externalId, p.id]));
  const resortRows = await db.query.resorts.findMany();
  const resortMap = new Map(resortRows.map((r) => [r.externalId, r.id]));

  let count = 0;
  for (const item of data) {
    await db
      .insert(dining)
      .values({
        externalId: item.id,
        parkId: item.park_id ? (parkMap.get(item.park_id) ?? null) : null,
        resortId: item.resort_id ? (resortMap.get(item.resort_id) ?? null) : null,
        name: item.name,
        diningType: item.dining_type,
        cuisineTags: item.cuisine_tags ?? [],
      })
      .onConflictDoUpdate({
        target: dining.externalId,
        set: { name: item.name, diningType: item.dining_type },
      });
    count++;
  }
  console.log(`Dining: ${count} upserted`);
}

async function seedWalkingGraph() {
  const data = loadYaml<{
    from: string;
    to: string;
    walking_seconds: number;
    park_id: string;
  }>('walking_graph.yaml');

  const parkRows = await db.query.parks.findMany();
  const parkMap = new Map(parkRows.map((p) => [p.externalId, p.id]));

  let count = 0;
  for (const edge of data) {
    const parkId = parkMap.get(edge.park_id);
    if (!parkId) continue;
    await db
      .insert(walkingGraph)
      .values({
        fromNodeId: edge.from,
        toNodeId: edge.to,
        walkingSeconds: edge.walking_seconds,
        parkId,
      })
      .onConflictDoNothing(); // Walking graph edges are immutable — don't update
    count++;
  }
  console.log(`Walking graph: ${count} edges upserted`);
}

async function main() {
  console.log('Seeding WDW catalog...');
  // Order matters: parks first (attractions FK → parks)
  await seedParks();
  await seedResorts();
  await seedAttractions();
  await seedShows();
  await seedDining();
  await seedWalkingGraph();
  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
