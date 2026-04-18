import Link from 'next/link';

/** UUID shape, used to auto-link to drill-down pages for known tables. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LINKABLE_COLUMNS: Record<string, string> = {
  trip_id: 'trips',
  plan_id: 'plans',
  user_id: 'users',
  park_id: 'parks',
  attraction_id: 'attractions',
  ref_id: '', // polymorphic — leave unlinked
};

export function RowCell({
  columnName,
  value,
  tableName,
  isIdColumn,
}: {
  columnName: string;
  value: unknown;
  tableName: string;
  isIdColumn: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-neutral-400">∅</span>;
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-green-700' : 'text-neutral-500'}>{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="tabular-nums">{value.toLocaleString()}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-neutral-400">[]</span>;
    return (
      <span className="text-xs text-neutral-700">
        [{value.length}]{' '}
        {value
          .slice(0, 3)
          .map((v) => String(v))
          .join(', ')}
        {value.length > 3 ? '…' : ''}
      </span>
    );
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return (
      <span className="text-xs text-neutral-700" title={JSON.stringify(value, null, 2)}>
        {json.length > 80 ? json.slice(0, 77) + '…' : json}
      </span>
    );
  }
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  // UUID: link to the matching table if we know one
  if (UUID_RE.test(str)) {
    const linkTable = isIdColumn ? tableName : (LINKABLE_COLUMNS[columnName] ?? null);
    if (linkTable) {
      return (
        <Link
          href={`/admin/${linkTable}/${str}`}
          className="text-blue-700 hover:underline font-mono text-xs"
        >
          {str.slice(0, 8)}…
        </Link>
      );
    }
    return <span className="font-mono text-xs text-neutral-600">{str.slice(0, 8)}…</span>;
  }
  // ISO date-time
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    return <span className="text-xs text-neutral-700">{str.slice(0, 19).replace('T', ' ')}</span>;
  }
  if (str.length > 80) {
    return (
      <span title={str} className="text-xs">
        {str.slice(0, 77)}…
      </span>
    );
  }
  return <span>{str}</span>;
}
