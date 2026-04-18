import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

export default async function TripDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const sb = supabaseAdmin();

  const [tripRes, guestsRes, prefsRes, plansRes] = await Promise.all([
    sb.from('trips').select('*').eq('id', id).maybeSingle(),
    sb.from('guests').select('*').eq('trip_id', id),
    sb.from('trip_preferences').select('*').eq('trip_id', id).maybeSingle(),
    sb
      .from('plans')
      .select('id, version, status, generated_at, created_at')
      .eq('trip_id', id)
      .order('version', { ascending: false }),
  ]);

  const trip = tripRes.data as Row | null;
  const guests = guestsRes.data as Row[] | null;
  const prefs = prefsRes.data as Row | null;
  const plans = plansRes.data as Row[] | null;

  if (!trip) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trip {id.slice(0, 8)}…</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">{id}</p>
        </div>
        <Link href="/admin/trips" className="text-blue-700 text-sm hover:underline">
          ← all trips
        </Link>
      </header>

      <Section title="Trip">
        <KeyValueGrid obj={trip} />
      </Section>

      <Section title={`Guests (${guests?.length ?? 0})`}>
        {guests && guests.length > 0 ? (
          <SimpleTable rows={guests} />
        ) : (
          <p className="text-sm text-neutral-500">No guests.</p>
        )}
      </Section>

      <Section title="Preferences">
        {prefs ? <KeyValueGrid obj={prefs} /> : <p className="text-sm text-neutral-500">None.</p>}
      </Section>

      <Section title={`Plans (${plans?.length ?? 0})`}>
        {plans && plans.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {plans.map((p) => {
              const pid = str(p['id']);
              const when = str(p['generated_at'] ?? p['created_at'] ?? '');
              return (
                <li key={pid}>
                  <Link
                    href={`/admin/plans/${pid}`}
                    className="text-blue-700 hover:underline font-mono"
                  >
                    v{str(p['version'])} · {str(p['status'])} · {pid.slice(0, 8)}…
                  </Link>
                  <span className="text-neutral-500 text-xs ml-2">
                    {when.slice(0, 19).replace('T', ' ')}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No plans yet.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-neutral-200 bg-white">
      <h2 className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function KeyValueGrid({ obj }: { obj: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-neutral-500">{k}</dt>
          <dd className="font-mono break-all">{renderVal(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function SimpleTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-neutral-100 text-left">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-2 py-1 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-neutral-50">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1 whitespace-nowrap font-mono">
                  {renderVal(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (Array.isArray(v)) return v.length === 0 ? '[]' : JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}
