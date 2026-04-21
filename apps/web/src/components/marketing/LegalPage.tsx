import type { ReactNode } from 'react';
import { Section } from './Section';

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <Section bg="cream" padY={80}>
        <div className="ww-container-narrow" style={{ padding: 0 }}>
          <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
            {eyebrow}
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', marginBottom: 18 }}>{title}</h1>
          <div className="ww-mono" style={{ fontSize: 12, color: 'var(--ww-muted-fg)' }}>
            Last updated {updated}
          </div>
        </div>
      </Section>
      <Section bg="white" padY={64}>
        <div
          className="ww-container-narrow"
          style={{
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            fontSize: 16,
            lineHeight: 1.75,
            color: 'var(--ww-navy)',
          }}
        >
          {children}
        </div>
      </Section>
    </>
  );
}
