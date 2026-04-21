import type { Metadata } from 'next';
import Link from 'next/link';
import { Section } from '../../../components/marketing/Section';

export const metadata: Metadata = {
  title: 'Guides — WonderWaltz',
  description:
    'Strategy, packing, and planning guides for Walt Disney World trips. Written by people who actually walked the miles.',
};

const GUIDES = [
  {
    slug: 'rope-drop-strategy',
    title: 'The best WDW rope drop strategy for 2026',
    eyebrow: 'Strategy · 8 min read',
    blurb:
      'The first 90 minutes of a park day is a 3-for-1 on ride time. Here is how to get it right.',
  },
  {
    slug: 'wdw-with-toddlers',
    title: 'Walt Disney World with toddlers — a planning guide',
    eyebrow: 'Planning · 10 min read',
    blurb:
      'The trip still works with a two-year-old. It just has a different shape. Here is the shape.',
  },
  {
    slug: 'lightning-lane-multi-vs-single',
    title: 'Lightning Lane Multi Pass vs. Single Pass — what is worth it?',
    eyebrow: 'Strategy · 6 min read',
    blurb: 'A clear frame for when to pay extra and when to skip. No hype, no Disney-blog speak.',
  },
  {
    slug: 'first-time-packing-list',
    title: 'First-time WDW packing list',
    eyebrow: 'Packing · 5 min read',
    blurb:
      'The unglamorous items you will actually use. Plus the one thing every first-timer forgets.',
  },
];

export default function GuidesIndex() {
  return (
    <>
      <Section bg="cream" padY={96}>
        <div style={{ maxWidth: 760 }}>
          <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
            Guides
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginBottom: 20 }}>
            Planning reading, written by people who walked the miles.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--ww-muted-fg)', lineHeight: 1.55 }}>
            Practical notes for the people who don&apos;t want to watch a 45-minute YouTube primer
            before their trip. Updated for 2026.
          </p>
        </div>
      </Section>

      <Section bg="white" padY={80}>
        <div
          className="ww-rel-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="ww-card ww-card-hover"
              style={{ display: 'block', textDecoration: 'none', height: '100%' }}
            >
              <div
                style={{
                  height: 140,
                  borderRadius: 8,
                  background: 'var(--ww-cream-deep)',
                  border: '1px solid var(--ww-muted)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 100 60" width="60%" height="60" aria-hidden>
                  <circle cx="50" cy="40" r={20} fill="var(--ww-gold)" opacity="0.5" />
                  <path
                    d="M 10 40 Q 50 20, 90 40"
                    stroke="var(--ww-navy)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </div>
              <div
                className="ww-mono"
                style={{ fontSize: 11, color: 'var(--ww-muted-fg)', marginBottom: 8 }}
              >
                {g.eyebrow.toUpperCase()}
              </div>
              <h3 style={{ fontSize: 20, lineHeight: 1.25, marginBottom: 8 }}>{g.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ww-muted-fg)', lineHeight: 1.55 }}>
                {g.blurb}
              </p>
            </Link>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .ww-rel-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 560px) { .ww-rel-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>
    </>
  );
}
