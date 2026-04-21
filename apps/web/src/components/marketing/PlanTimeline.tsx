const DAY = [
  { t: '9:00', dur: 2, label: 'morning ride block', color: 'mk' },
  { t: '11:15', dur: 1, label: 'rest + snack', color: 'muted' },
  { t: '12:30', dur: 2, label: 'lunch reservation', color: 'gold' },
  { t: '2:45', dur: 1, label: 'Lightning Lane slot', color: 'epcot' },
  { t: '4:00', dur: 2, label: 'afternoon block', color: 'ak' },
  { t: '6:15', dur: 1, label: 'dinner', color: 'gold' },
  { t: '8:30', dur: 2, label: 'evening show', color: 'hs' },
] as const;

const PALETTE: Record<(typeof DAY)[number]['color'], string> = {
  mk: 'var(--ww-park-mk)',
  epcot: 'var(--ww-park-epcot)',
  hs: 'var(--ww-park-hs)',
  ak: 'var(--ww-park-ak)',
  gold: 'var(--ww-gold)',
  muted: 'var(--ww-muted)',
};

export function PlanTimeline({
  compact = false,
  animate = true,
}: {
  compact?: boolean;
  animate?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
      {DAY.map((b, i) => (
        <div
          key={i}
          className={animate ? 'ww-plan-row' : ''}
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr',
            gap: 12,
            alignItems: 'center',
            animationDelay: `${i * 0.08}s`,
          }}
        >
          <div
            className="ww-mono"
            style={{
              fontSize: compact ? 10 : 11,
              color: 'var(--ww-muted-fg)',
              letterSpacing: '0.04em',
              textAlign: 'right',
            }}
          >
            {b.t}
          </div>
          <div
            style={{
              height: compact ? 20 + b.dur * 6 : 26 + b.dur * 10,
              background: PALETTE[b.color],
              borderRadius: 8,
              position: 'relative',
              opacity: b.color === 'muted' ? 0.7 : 0.95,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 2px, transparent 2px 14px)',
                opacity: 0.4,
              }}
            />
            {!compact && (
              <span
                style={{
                  fontSize: 12,
                  color: b.color === 'gold' || b.color === 'muted' ? 'var(--ww-navy)' : '#fff',
                  fontWeight: 500,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {b.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
