import Link from 'next/link';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link
      href="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        color: 'var(--ww-navy)',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        {/* Concentric arcs = wonder; curving ribbon = waltz */}
        <circle cx="20" cy="20" r="18" fill="var(--ww-navy)" />
        <path
          d="M8 24 Q 14 10, 20 20 T 32 16"
          stroke="var(--ww-gold)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="8" cy="24" r="2" fill="var(--ww-gold)" />
        <circle cx="32" cy="16" r="2" fill="var(--ww-cream)" />
      </svg>
      <span
        style={{
          fontFamily: 'var(--ww-font-display)',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}
      >
        WonderWaltz
      </span>
    </Link>
  );
}
