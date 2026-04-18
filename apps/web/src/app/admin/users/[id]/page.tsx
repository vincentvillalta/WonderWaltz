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
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User {email ?? id.slice(0, 8) + '…'}</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">{id}</p>
        </div>
        <Link href="/admin/users" className="text-blue-700 text-sm hover:underline">
          ← all users
        </Link>
      </header>

      <section className="rounded border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium mb-2">Profile</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {Object.entries(user).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-neutral-500">{k}</dt>
              <dd className="font-mono break-all">{str(v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium">
          Trips ({trips?.length ?? 0})
        </h2>
        {trips && trips.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {trips.map((t) => {
              const tid = str(t['id']);
              const name = str(t['name']) || 'Untitled';
              return (
                <li key={tid} className="px-4 py-2 text-sm">
                  <Link href={`/admin/trips/${tid}`} className="text-blue-700 hover:underline">
                    {name}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-500">
                    {str(t['start_date'])} → {str(t['end_date'])} · {str(t['plan_status'])}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-4 text-sm text-neutral-500">No trips.</p>
        )}
      </section>

      {entitlements && entitlements.length > 0 && (
        <section className="rounded border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium mb-2">Entitlements ({entitlements.length})</h2>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(entitlements, null, 2)}</pre>
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
