import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PlanDay = {
  id: string;
  day_index: number;
  park_id: string;
  date: string;
  narrative_intro: string | null;
};

type PlanItem = {
  id: string;
  plan_day_id: string;
  item_type: string;
  ref_id: string | null;
  name: string;
  start_time: string;
  end_time: string;
  wait_minutes: number | null;
  sort_index: number;
  lightning_lane_type: string | null;
  notes: string | null;
  narrative_tip: string | null;
};

export default async function PlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const sb = supabaseAdmin();

  const planRes = await sb.from('plans').select('*').eq('id', id).maybeSingle();
  const plan = planRes.data as Record<string, unknown> | null;
  if (!plan) notFound();

  const [daysRes, itemsRes, parksRes] = await Promise.all([
    sb.from('plan_days').select('*').eq('plan_id', id).order('day_index'),
    sb
      .from('plan_items')
      .select('*, plan_days!inner(plan_id)')
      .eq('plan_days.plan_id', id)
      .order('sort_index'),
    sb.from('parks').select('id, name'),
  ]);
  const days = daysRes.data as PlanDay[] | null;
  const items = itemsRes.data as PlanItem[] | null;
  const parksList = parksRes.data as Array<{ id: string; name: string }> | null;

  const parkName = new Map<string, string>();
  for (const p of parksList ?? []) {
    parkName.set(p.id, p.name);
  }

  const itemsByDay = new Map<string, PlanItem[]>();
  for (const it of items ?? []) {
    const arr = itemsByDay.get(it.plan_day_id) ?? [];
    arr.push(it);
    itemsByDay.set(it.plan_day_id, arr);
  }

  const planRow = plan;
  const warnings = parseWarnings(planRow['warnings']);

  // Item-type → color for the timeline pills.
  const typeColors: Record<string, string> = {
    attraction: 'bg-blue-100 text-blue-800',
    dining: 'bg-amber-100 text-amber-800',
    meal: 'bg-amber-100 text-amber-800',
    show: 'bg-purple-100 text-purple-800',
    break: 'bg-neutral-200 text-neutral-700',
    rest: 'bg-neutral-200 text-neutral-700',
    ll_reminder: 'bg-green-100 text-green-800',
    walk: 'bg-neutral-100 text-neutral-500',
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Plan v{String(planRow['version'])} · {String(planRow['status'])}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">{id}</p>
          {typeof planRow['trip_id'] === 'string' && (
            <p className="text-xs text-neutral-600 mt-0.5">
              trip:{' '}
              <Link
                href={`/admin/trips/${planRow['trip_id']}`}
                className="text-blue-700 hover:underline font-mono"
              >
                {planRow['trip_id'].slice(0, 8)}…
              </Link>
            </p>
          )}
        </div>
        <Link href="/admin/plans" className="text-blue-700 text-sm hover:underline">
          ← all plans
        </Link>
      </header>

      {warnings.length > 0 && (
        <section className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <h2 className="font-medium text-amber-900">Warnings ({warnings.length})</h2>
          <ul className="mt-1 list-disc list-inside text-amber-800">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {days?.map((day) => {
        const dayItems = itemsByDay.get(day.id) ?? [];
        return (
          <section key={day.id} className="rounded border border-neutral-200 bg-white">
            <header className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 flex items-baseline justify-between">
              <h2 className="text-sm font-medium">
                Day {day.day_index} · {day.date} · {parkName.get(day.park_id) ?? day.park_id}
              </h2>
              <span className="text-xs text-neutral-500">{dayItems.length} items</span>
            </header>
            {day.narrative_intro && (
              <p className="px-4 py-3 text-sm text-neutral-700 italic border-b border-neutral-100">
                {day.narrative_intro}
              </p>
            )}
            <ol className="divide-y divide-neutral-100">
              {dayItems.length === 0 ? (
                <li className="px-4 py-3 text-sm text-neutral-500">No items.</li>
              ) : (
                dayItems.map((it) => (
                  <li key={it.id} className="px-4 py-2 flex items-start gap-3 text-sm">
                    <div className="w-20 shrink-0 font-mono text-xs text-neutral-600">
                      {it.start_time}–{it.end_time}
                    </div>
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase shrink-0 ${
                        typeColors[it.item_type] ?? 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {it.item_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium truncate">{it.name}</span>
                        {it.wait_minutes !== null && (
                          <span className="text-xs text-neutral-500 tabular-nums">
                            wait {it.wait_minutes}m
                          </span>
                        )}
                        {it.lightning_lane_type && (
                          <span className="text-xs text-green-700">
                            LL · {it.lightning_lane_type}
                          </span>
                        )}
                      </div>
                      {it.notes && <div className="text-xs text-amber-700 mt-0.5">{it.notes}</div>}
                      {it.narrative_tip && (
                        <div className="text-xs text-neutral-600 mt-0.5 italic">
                          {it.narrative_tip}
                        </div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function parseWarnings(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* ignore */
    }
  }
  return [];
}
