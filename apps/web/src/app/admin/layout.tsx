import Link from 'next/link';
import { ADMIN_TABLES } from '../../lib/supabase-admin';

export const metadata = {
  title: 'WonderWaltz Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen font-mono text-sm">
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-950 text-neutral-100 overflow-y-auto">
        <div className="p-4 border-b border-neutral-800">
          <Link href="/admin" className="font-semibold text-base tracking-tight">
            WW / admin
          </Link>
          <p className="text-[11px] text-neutral-500 mt-1">local-only · service-role</p>
        </div>
        <nav className="p-2">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-500">
            tables
          </div>
          <ul>
            {ADMIN_TABLES.map((t) => (
              <li key={t}>
                <Link
                  href={`/admin/${t}`}
                  className="block px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 bg-neutral-50 text-neutral-900 overflow-x-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
