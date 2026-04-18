import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service-role key — bypasses RLS.
 * NEVER import this from a client component. The `server-only` import
 * guarantees a build error if that happens.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL           → https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY          → service role secret (NOT the anon key)
 */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached !== null) return cached;

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** List of public tables the admin dashboard knows how to browse. */
export const ADMIN_TABLES = [
  'users',
  'trips',
  'guests',
  'trip_preferences',
  'trip_park_days',
  'plans',
  'plan_days',
  'plan_items',
  'packing_list_items',
  'narrative_day_cache',
  'parks',
  'attractions',
  'dining',
  'shows',
  'resorts',
  'walking_graph',
  'wait_times_history',
  'crowd_calendar',
  'entitlements',
  'iap_events',
  'push_tokens',
  'affiliate_items',
  'llm_costs',
  'llm_cost_incidents',
] as const;

export type AdminTable = (typeof ADMIN_TABLES)[number];

export function isAdminTable(name: string): name is AdminTable {
  return (ADMIN_TABLES as readonly string[]).includes(name);
}
