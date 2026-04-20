/**
 * Prompt composition for the narrative generation pipeline (LLM-02).
 *
 * The cached prefix is byte-stable across builds: it contains the full
 * WDW catalog (attractions, dining, resorts, shows) + BRAND voice guide.
 * Any change to the prefix content changes the Anthropic cache key and
 * invalidates all existing cache hits — the SHA-256 invariant test in
 * prompt-cache-prefix.test.ts guards against accidental drift.
 *
 * The dynamic suffix carries per-trip context: guest data + solver plan items.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as yamlParse } from 'yaml';
import type { NarrativeInput } from './narrative.service.js';

// ─── Path resolution ─────────────────────────────────────────────────

/**
 * Resolves the monorepo root by walking up from the current file until we
 * find a `packages/content/wdw/attractions.yaml`. The runtime layout varies
 * across local dev (tsx/tsc) and Railway/Docker (different WORKDIR nesting),
 * so probing is more robust than hard-coded "N levels up".
 */
function resolveMonorepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    try {
      readFileSync(resolve(dir, 'packages', 'content', 'wdw', 'attractions.yaml'));
      return dir;
    } catch {
      const parent = resolve(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }
  }
  // Fallback: repo root assumed 5 levels up from dist/src/narrative/prompt.js
  return resolve(__dirname, '..', '..', '..', '..', '..');
}

const MONOREPO_ROOT = resolveMonorepoRoot();
const CONTENT_DIR = resolve(MONOREPO_ROOT, 'packages', 'content', 'wdw');
const BRAND_PATH = resolve(MONOREPO_ROOT, 'docs', 'design', 'BRAND.md');

// ─── YAML loaders (sorted by id for byte-stability) ─────────────────

interface YamlAttraction {
  id: string;
  park_id: string;
  name: string;
  tags: string[];
  baseline_wait_minutes: number;
  height_req_cm: number | null;
  lightning_lane_type: string | null;
  is_headliner: boolean;
}

interface YamlDining {
  id: string;
  park_id: string;
  name: string;
  dining_type: string;
  cuisine_tags: string[];
}

interface YamlResort {
  id: string;
  name: string;
  tier: string;
  is_on_property: boolean;
}

interface YamlShow {
  id: string;
  park_id: string;
  name: string;
  show_type: string;
}

function loadAttractions(): YamlAttraction[] {
  const raw = readFileSync(resolve(CONTENT_DIR, 'attractions.yaml'), 'utf-8');
  const doc = yamlParse(raw) as { attractions: YamlAttraction[] };
  return [...doc.attractions].sort((a, b) => a.id.localeCompare(b.id));
}

function loadDining(): YamlDining[] {
  const raw = readFileSync(resolve(CONTENT_DIR, 'dining.yaml'), 'utf-8');
  const doc = yamlParse(raw) as { dining: YamlDining[] };
  return [...doc.dining].sort((a, b) => a.id.localeCompare(b.id));
}

function loadResorts(): YamlResort[] {
  const raw = readFileSync(resolve(CONTENT_DIR, 'resorts.yaml'), 'utf-8');
  const doc = yamlParse(raw) as { resorts: YamlResort[] };
  return [...doc.resorts].sort((a, b) => a.id.localeCompare(b.id));
}

function loadShows(): YamlShow[] {
  const raw = readFileSync(resolve(CONTENT_DIR, 'shows.yaml'), 'utf-8');
  const doc = yamlParse(raw) as { shows: YamlShow[] };
  return [...doc.shows].sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Catalog serialization ───────────────────────────────────────────

function serializeAttractions(attractions: YamlAttraction[]): string {
  return attractions
    .map((a) => {
      const height = a.height_req_cm != null ? `${a.height_req_cm}cm` : 'none';
      const ll = a.lightning_lane_type ?? 'none';
      const headliner = a.is_headliner ? ' [HEADLINER]' : '';
      return `- ${a.id} | ${a.name} | park:${a.park_id} | wait:${a.baseline_wait_minutes}min | height:${height} | LL:${ll} | tags:${a.tags.join(',')}${headliner}`;
    })
    .join('\n');
}

function serializeDining(dining: YamlDining[]): string {
  return dining
    .map(
      (d) =>
        `- ${d.id} | ${d.name} | park:${d.park_id} | type:${d.dining_type} | cuisine:${d.cuisine_tags.join(',')}`,
    )
    .join('\n');
}

function serializeResorts(resorts: YamlResort[]): string {
  return resorts
    .map((r) => `- ${r.id} | ${r.name} | tier:${r.tier} | on_property:${r.is_on_property}`)
    .join('\n');
}

function serializeShows(shows: YamlShow[]): string {
  return shows
    .map((s) => `- ${s.id} | ${s.name} | park:${s.park_id} | type:${s.show_type}`)
    .join('\n');
}

// ─── BRAND voice extraction ──────────────────────────────────────────

function loadBrandVoice(): string {
  const raw = readFileSync(BRAND_PATH, 'utf-8');

  // Extract the "Voice and Tone" section
  const voiceMatch = raw.match(/## Voice and Tone\n([\s\S]*?)(?=\n## |\n---|$)/);
  const voiceSection = voiceMatch?.[1]?.trim() ?? '';

  return voiceSection;
}

// ─── Module-level cache (same process = same bytes) ──────────────────

let _cachedPrefix: string | null = null;

/**
 * Returns the byte-stable cached prefix for Anthropic prompt caching.
 * Contains the full WDW catalog + BRAND voice guide.
 *
 * This value MUST be identical across all invocations in the same process
 * and across builds. The SHA-256 test in prompt-cache-prefix.test.ts
 * enforces this invariant.
 */
export function buildCachedPrefix(): string {
  if (_cachedPrefix !== null) return _cachedPrefix;

  const attractions = loadAttractions();
  const dining = loadDining();
  const resorts = loadResorts();
  const shows = loadShows();
  const brandVoice = loadBrandVoice();

  const catalog = [
    '<CATALOG>',
    '<ATTRACTIONS>',
    serializeAttractions(attractions),
    '</ATTRACTIONS>',
    '<DINING>',
    serializeDining(dining),
    '</DINING>',
    '<RESORTS>',
    serializeResorts(resorts),
    '</RESORTS>',
    '<SHOWS>',
    serializeShows(shows),
    '</SHOWS>',
    '</CATALOG>',
  ].join('\n');

  const toneRules = [
    '<TONE_RULES>',
    '- Warm expert: speaks like a trusted friend who has done the trip fifteen times. Confident, specific, never performative.',
    '- Short sentences: plan content is scannable at a glance. No filler.',
    '- No Disney voice mimicry: never write "pixie dust", "magical moments", or similar corporate Disney vocabulary.',
    '- Park-safe: no trademarked ride names in marketing copy. In-app, ride names come from catalog data.',
    '- Positive constraint: phrase accessibility features as capabilities, not limitations. "Quiet-time friendly" beats "avoids loud attractions".',
    '</TONE_RULES>',
  ].join('\n');

  _cachedPrefix = [catalog, '<BRAND_VOICE>', brandVoice, '</BRAND_VOICE>', toneRules].join('\n');

  return _cachedPrefix;
}

/**
 * Builds the dynamic prompt suffix containing per-trip context.
 * This is NOT cached by Anthropic — it changes every request.
 */
export function buildDynamicPrompt(input: NarrativeInput): string {
  const guestLines = input.guests
    .map(
      (g, i) =>
        `  Guest ${i + 1}: age ${g.ageBracket}${g.preferences ? `, preferences: ${g.preferences.join(', ')}` : ''}`,
    )
    .join('\n');

  const dayBlocks = input.days
    .map((day) => {
      const itemLines = day.items
        .map(
          (item) =>
            `    - planItemId:${item.planItemId} | ${item.attractionName} (${item.attractionId}) | ${item.scheduledStart}-${item.scheduledEnd}`,
        )
        .join('\n');
      return `  Day ${day.dayIndex} (${day.date}) at ${day.park}:\n${itemLines}`;
    })
    .join('\n\n');

  return [
    `<TRIP_CONTEXT>`,
    `Trip: ${input.tripId}`,
    `Budget tier: ${input.budgetTier}`,
    ``,
    `Guests:`,
    guestLines,
    ``,
    `Solver plan:`,
    dayBlocks,
    `</TRIP_CONTEXT>`,
    ``,
    `Write a narrative for this trip plan. For each day, provide:`,
    `1. An intro paragraph (50-800 chars) setting the day's arc.`,
    `2. For each item, a tip (10-400 chars) with timing/strategy advice.`,
    `3. Packing suggestions as packingDelta items (item + reason).`,
    `4. Budget hacks as an array of strings.`,
    ``,
    `IMPORTANT: Only reference planItemIds that appear in the solver plan above.`,
    `Do NOT invent or hallucinate attraction IDs.`,
    ``,
    `Return RAW JSON only — no prose, no explanations, no markdown code fences.`,
    `The very first character of your response must be "{" and the last must be "}".`,
    `Do not wrap the output in \`\`\`json or any other fencing.`,
    ``,
    `Schema:`,
    `{`,
    `  "days": [{ "dayIndex": number, "intro": string, "items": [{ "planItemId": string, "tip": string }] }],`,
    `  "packingDelta": [{ "item": string, "reason": string }],`,
    `  "budgetHacks": [string]`,
    `}`,
  ].join('\n');
}

/**
 * Shapes the Anthropic Messages API payload with cache_control breakpoint.
 *
 * The system prompt is sent as an array of content blocks:
 * 1. The cached prefix block with `cache_control: { type: 'ephemeral' }`
 * 2. (Optional) Additional system instructions without cache_control
 *
 * The dynamic prompt goes in `messages[0]` as the user turn.
 */
export function buildMessagesPayload(opts: {
  model: string;
  cachedPrefix: string;
  dynamicPrompt: string;
  systemSuffix?: string;
}): {
  model: string;
  max_tokens: number;
  system: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  messages: Array<{ role: 'user'; content: string }>;
} {
  const systemBlocks: Array<{
    type: 'text';
    text: string;
    cache_control?: { type: 'ephemeral' };
  }> = [
    {
      type: 'text',
      text: opts.cachedPrefix,
      cache_control: { type: 'ephemeral' },
    },
  ];

  if (opts.systemSuffix) {
    systemBlocks.push({
      type: 'text',
      text: opts.systemSuffix,
    });
  }

  return {
    model: opts.model,
    max_tokens: 4096,
    system: systemBlocks,
    messages: [{ role: 'user', content: opts.dynamicPrompt }],
  };
}
