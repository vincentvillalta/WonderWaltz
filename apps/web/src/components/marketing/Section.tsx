import type { CSSProperties, ReactNode } from 'react';

const BG_MAP = {
  cream: 'var(--ww-cream)',
  white: 'var(--ww-white)',
  deep: 'var(--ww-cream-deep)',
  navy: 'var(--ww-navy)',
} as const;

export function Section({
  children,
  bg = 'cream',
  padY = 120,
  style = {},
}: {
  children: ReactNode;
  bg?: keyof typeof BG_MAP;
  padY?: number;
  style?: CSSProperties;
}) {
  return (
    <section style={{ background: BG_MAP[bg], padding: `${padY}px 0`, ...style }}>
      <div className="ww-container">{children}</div>
    </section>
  );
}
