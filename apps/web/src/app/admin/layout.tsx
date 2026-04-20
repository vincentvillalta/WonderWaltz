import Link from 'next/link';
import { ADMIN_TABLES } from '../../lib/supabase-admin';
import './admin.css';

export const metadata = {
  title: 'WonderWaltz Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__head">
          <Link href="/admin" className="admin-sidebar__brand">
            WW / admin
          </Link>
          <div className="admin-sidebar__tag">local-only · service-role</div>
        </div>
        <nav>
          <div className="admin-sidebar__section-head">tables</div>
          <ul>
            {ADMIN_TABLES.map((t) => (
              <li key={t}>
                <Link href={`/admin/${t}`}>{t}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-main__inner">{children}</div>
      </main>
    </div>
  );
}
