import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const sb = supabaseAdmin();

  const [userRes, tripsRes, entsRes] = await Promise.all([
    sb.from('users').select('*').eq('id', id).maybeSingle(),
    sb
      .from('trips')
      .select('id, name, start_date, end_date, plan_status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    sb.from('entitlements').select('*').eq('user_id', id),
  ]);
  const user = userRes.data as Record<string, unknown> | null;
  const trips = tripsRes.data as Record<string, unknown>[] | null;
  const entitlements = entsRes.data as Record<string, unknown>[] | null;

  if (!user) notFound();

  const email = typeof user['email'] === 'string' ? user['email'] : null;

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
          <h1>User {email ?? id.slice(0, 8) + '…'}</h1>
          <p className="admin-mono">{id}</p>
        </div>
        <Link href="/admin/users" className="admin-back-link">
          ← all users
        </Link>
      </header>

      <section className="admin-card">
        <div className="admin-card__head">Profile</div>
        <div className="admin-card__body">
          <dl className="admin-kv">
            {Object.entries(user).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{k}</dt>
                <dd>{str(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__head">Trips ({trips?.length ?? 0})</div>
        <div>
          {trips && trips.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {trips.map((t) => {
                const tid = str(t['id']);
                const name = str(t['name']) || 'Untitled';
                return (
                  <li
                    key={tid}
                    style={{
                      padding: '8px 16px',
                      borderBottom: '1px solid #f1f1f2',
                      fontSize: 13,
                    }}
                  >
                    <Link href={`/admin/trips/${tid}`} className="admin-cell-uuid--link">
                      {name}
                    </Link>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#71717a' }}>
                      {str(t['start_date'])} → {str(t['end_date'])} · {str(t['plan_status'])}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="admin-empty">No trips.</p>
          )}
        </div>
      </section>

      {entitlements && entitlements.length > 0 && (
        <section className="admin-card">
          <div className="admin-card__head">Entitlements ({entitlements.length})</div>
          <div className="admin-card__body">
            <pre
              style={{
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(entitlements, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}
