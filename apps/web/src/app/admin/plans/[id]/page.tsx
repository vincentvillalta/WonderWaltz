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

  return (
    <div>
      <header
        className="admin-page-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <div>
          <h1>
            Plan v{String(planRow['version'])} · {String(planRow['status'])}
          </h1>
          <p className="admin-mono">{id}</p>
          {typeof planRow['trip_id'] === 'string' && (
            <p style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
              trip:{' '}
              <Link
                href={`/admin/trips/${planRow['trip_id']}`}
                className="admin-cell-uuid--link"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              >
                {planRow['trip_id'].slice(0, 8)}…
              </Link>
            </p>
          )}
        </div>
        <Link href="/admin/plans" className="admin-back-link">
          ← all plans
        </Link>
      </header>

      {warnings.length > 0 && (
        <div className="admin-warn" style={{ marginBottom: 16 }}>
          <h2>Warnings ({warnings.length})</h2>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {days?.map((day) => {
        const dayItems = itemsByDay.get(day.id) ?? [];
        return (
          <section key={day.id} className="admin-day">
            <header className="admin-day__head">
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
                Day {day.day_index} · {day.date} · {parkName.get(day.park_id) ?? day.park_id}
              </h2>
              <span style={{ fontSize: 12, color: '#71717a' }}>{dayItems.length} items</span>
            </header>
            {day.narrative_intro && <p className="admin-day__intro">{day.narrative_intro}</p>}
            <ol className="admin-day__items">
              {dayItems.length === 0 ? (
                <li className="admin-empty">No items.</li>
              ) : (
                dayItems.map((it) => (
                  <li key={it.id}>
                    <div className="admin-day__time">
                      {it.start_time}–{it.end_time}
                    </div>
                    <span className={`admin-day__pill admin-pill--${it.item_type || 'default'}`}>
                      {it.item_type}
                    </span>
                    <div className="admin-day__body">
                      <div className="admin-day__row1">
                        <span className="admin-day__name">{it.name}</span>
                        {it.wait_minutes !== null && (
                          <span className="admin-day__wait">wait {it.wait_minutes}m</span>
                        )}
                        {it.lightning_lane_type && (
                          <span className="admin-day__ll">LL · {it.lightning_lane_type}</span>
                        )}
                      </div>
                      {it.notes && <div className="admin-day__note">{it.notes}</div>}
                      {it.narrative_tip && <div className="admin-day__tip">{it.narrative_tip}</div>}
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
