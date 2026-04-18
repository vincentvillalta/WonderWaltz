import Link from 'next/link';
import { supabaseAdmin, ADMIN_TABLES } from '../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function tableCount(name: string): Promise<number | null> {
  try {
    const { count, error } = await supabaseAdmin()
      .from(name)
      .select('*', { count: 'exact', head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export default async function AdminHome() {
  const counts = await Promise.all(
    ADMIN_TABLES.map(async (t) => ({ name: t, count: await tableCount(t) })),
  );

  const interestingTables = new Set(['trips', 'plans', 'users', 'llm_costs']);

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-neutral-600 text-sm mt-1">
          Click a table for the full row browser. Highlighted tables have drill-down views.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        {counts.map(({ name, count }) => (
          <Link
            key={name}
            href={`/admin/${name}`}
            className={`block rounded border bg-white p-4 hover:border-neutral-400 transition-colors ${
              interestingTables.has(name) ? 'border-blue-400' : 'border-neutral-200'
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-neutral-500">{name}</div>
            <div className="mt-1 text-2xl font-mono">
              {count === null ? <span className="text-red-500">err</span> : count.toLocaleString()}
            </div>
          </Link>
        ))}
      </section>

      <section className="border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">Quick links</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <li>
            <Link href="/admin/trips" className="text-blue-700 hover:underline">
              → All trips
            </Link>
          </li>
          <li>
            <Link href="/admin/plans" className="text-blue-700 hover:underline">
              → All plans
            </Link>
          </li>
          <li>
            <Link href="/admin/llm_costs" className="text-blue-700 hover:underline">
              → LLM cost ledger
            </Link>
          </li>
          <li>
            <Link href="/admin/attractions" className="text-blue-700 hover:underline">
              → Attraction catalog
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
