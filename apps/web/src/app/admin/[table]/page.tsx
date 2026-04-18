import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin, isAdminTable } from '../../../lib/supabase-admin';
import { RowCell } from '../../../components/admin/RowCell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 50;

/** Column priorities: known "identity" columns float to the left. */
const LEADING_COLUMNS = ['id', 'name', 'external_id', 'email', 'trip_id', 'plan_id'];
const TRAILING_COLUMNS = ['created_at', 'updated_at'];

function orderColumns(cols: string[]): string[] {
  const set = new Set(cols);
  const leads = LEADING_COLUMNS.filter((c) => set.has(c));
  const trails = TRAILING_COLUMNS.filter((c) => set.has(c));
  const leadSet = new Set(leads);
  const trailSet = new Set(trails);
  const middle = cols.filter((c) => !leadSet.has(c) && !trailSet.has(c)).sort();
  return [...leads, ...middle, ...trails];
}

type RawRow = Record<string, unknown>;

export default async function TableBrowserPage(props: {
  params: Promise<{ table: string }>;
  searchParams: Promise<{ page?: string; orderBy?: string }>;
}) {
  const { table } = await props.params;
  const search = await props.searchParams;
  if (!isAdminTable(table)) notFound();

  const page = Math.max(1, parseInt(search.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Try to order by the most obvious "when" column for freshness.
  // Fall back to id so the query never errors on tables without timestamps.
  const sb = supabaseAdmin();
  const orderBy = search.orderBy ?? 'auto';

  const tryOrders: string[] =
    orderBy === 'auto' ? ['created_at', 'generated_at', 'updated_at', 'id'] : [orderBy];

  let rows: RawRow[] = [];
  let count: number | null = null;
  let usedOrder: string | null = null;
  let fetchError: string | null = null;

  for (const col of tryOrders) {
    const {
      data,
      error,
      count: c,
    } = await sb
      .from(table)
      .select('*', { count: 'exact' })
      .order(col, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!error) {
      rows = (data ?? []) as RawRow[];
      count = c ?? null;
      usedOrder = col;
      break;
    }
    fetchError = error.message;
  }

  if (rows.length === 0 && fetchError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{table}</h1>
        <p className="text-red-600 text-sm">Query failed: {fetchError}</p>
      </div>
    );
  }

  const columns = rows.length > 0 ? orderColumns(Object.keys(rows[0] as object)) : [];

  const totalPages = count != null ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{table}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {count != null ? `${count.toLocaleString()} rows` : 'unknown row count'}
            {usedOrder ? ` · ordered by ${usedOrder} desc` : ''}
          </p>
        </div>
        <Link href="/admin" className="text-blue-700 text-sm hover:underline">
          ← all tables
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Table is empty.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-neutral-100 text-left">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="px-3 py-2 font-medium text-neutral-700 whitespace-nowrap border-b border-neutral-200"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="even:bg-neutral-50 hover:bg-blue-50/40">
                  {columns.map((c) => (
                    <td
                      key={c}
                      className="px-3 py-1.5 align-top whitespace-nowrap border-b border-neutral-100"
                    >
                      <RowCell
                        columnName={c}
                        value={row[c]}
                        tableName={table}
                        isIdColumn={c === 'id'}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="flex items-center justify-between text-xs">
        <div className="text-neutral-500">
          Page {page} of {totalPages} · {rows.length} shown
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/${table}?page=${page - 1}`}
              className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
            >
              ← prev
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/${table}?page=${page + 1}`}
              className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
            >
              next →
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
