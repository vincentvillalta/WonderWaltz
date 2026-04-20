import Link from 'next/link';

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
    return <span className="admin-cell-null">∅</span>;
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'admin-cell-true' : 'admin-cell-false'}>{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="admin-cell-num">{value.toLocaleString()}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="admin-cell-null">[]</span>;
    return (
      <span className="admin-cell-array">
        [{value.length}]{' '}
        {value
          .slice(0, 3)
          .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
          .join(', ')}
        {value.length > 3 ? '…' : ''}
      </span>
    );
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return (
      <span className="admin-cell-json" title={JSON.stringify(value, null, 2)}>
        {json.length > 80 ? json.slice(0, 77) + '…' : json}
      </span>
    );
  }
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (UUID_RE.test(str)) {
    const linkTable = isIdColumn ? tableName : (LINKABLE_COLUMNS[columnName] ?? null);
    if (linkTable) {
      return (
        <Link href={`/admin/${linkTable}/${str}`} className="admin-cell-uuid admin-cell-uuid--link">
          {str.slice(0, 8)}…
        </Link>
      );
    }
    return <span className="admin-cell-uuid">{str.slice(0, 8)}…</span>;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    return <span className="admin-cell-time">{str.slice(0, 19).replace('T', ' ')}</span>;
  }
  if (str.length > 80) {
    return (
      <span title={str} className="admin-cell-trunc">
        {str.slice(0, 77)}…
      </span>
    );
  }
  return <span>{str}</span>;
}
