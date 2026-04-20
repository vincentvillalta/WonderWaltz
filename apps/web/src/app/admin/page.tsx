import Link from 'next/link';
import { supabaseAdmin, ADMIN_TABLES } from '../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FEATURED = new Set(['trips', 'plans', 'users', 'llm_costs']);

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

  return (
    <div>
      <header className="admin-page-head" style={{ marginBottom: 20 }}>
        <h1>Dashboard</h1>
        <p>Click a table for the paginated browser. Highlighted tables have drill-down views.</p>
      </header>

      <div className="admin-stat-grid">
        {counts.map(({ name, count }) => (
          <Link
            key={name}
            href={`/admin/${name}`}
            className={`admin-stat-card ${FEATURED.has(name) ? 'admin-stat-card--featured' : ''}`}
          >
            <div className="admin-stat-card__label">{name}</div>
            <div
              className={`admin-stat-card__value ${count === null ? 'admin-stat-card__value--error' : ''}`}
            >
              {count === null ? 'err' : count.toLocaleString()}
            </div>
          </Link>
        ))}
      </div>

      <section className="admin-quick">
        <h2>Quick links</h2>
        <ul>
          <li>
            <Link href="/admin/trips">→ All trips</Link>
          </li>
          <li>
            <Link href="/admin/plans">→ All plans</Link>
          </li>
          <li>
            <Link href="/admin/llm_costs">→ LLM cost ledger</Link>
          </li>
          <li>
            <Link href="/admin/attractions">→ Attraction catalog</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
