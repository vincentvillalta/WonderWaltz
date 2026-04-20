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
          <h1>Trip {id.slice(0, 8)}…</h1>
          <p className="admin-mono">{id}</p>
        </div>
        <Link href="/admin/trips" className="admin-back-link">
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
          <p className="admin-empty">No guests.</p>
        )}
      </Section>

      <Section title="Preferences">
        {prefs ? <KeyValueGrid obj={prefs} /> : <p className="admin-empty">None.</p>}
      </Section>

      <Section title={`Plans (${plans?.length ?? 0})`}>
        {plans && plans.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {plans.map((p) => {
              const pid = str(p['id']);
              const when = str(p['generated_at'] ?? p['created_at'] ?? '');
              return (
                <li key={pid} style={{ padding: '4px 0' }}>
                  <Link
                    href={`/admin/plans/${pid}`}
                    className="admin-cell-uuid--link"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                  >
                    v{str(p['version'])} · {str(p['status'])} · {pid.slice(0, 8)}…
                  </Link>
                  <span style={{ color: '#71717a', fontSize: 12, marginLeft: 8 }}>
                    {when.slice(0, 19).replace('T', ' ')}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="admin-empty">No plans yet.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-card">
      <div className="admin-card__head">{title}</div>
      <div className="admin-card__body">{children}</div>
    </section>
  );
}

function KeyValueGrid({ obj }: { obj: Record<string, unknown> }) {
  return (
    <dl className="admin-kv">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{renderVal(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function SimpleTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(rows[0] ?? {});
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} style={{ fontFamily: 'ui-monospace, monospace' }}>
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
