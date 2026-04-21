import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '../../../../components/marketing/Icon';
import { Section } from '../../../../components/marketing/Section';

const GUIDES: Record<
  string,
  {
    title: string;
    eyebrow: string;
    lede: string;
    description: string;
    sections: Array<{ id: string; title: string }>;
    body: 'rope-drop' | 'stub';
  }
> = {
  'rope-drop-strategy': {
    title: 'The best WDW rope drop strategy for 2026.',
    eyebrow: 'Strategy · 8 min read',
    lede: "If you only do one thing right on a Walt Disney World day, do the first hour right. Here's what 2026 rope drop actually looks like — and the small rituals that give you a 90-minute head start on the park.",
    description:
      'A field-tested rope drop strategy for Walt Disney World in 2026: what it means, why it works, the routine that saves 90 minutes, and when to skip it.',
    sections: [
      { id: 'what', title: "What 'rope drop' actually means" },
      { id: 'why', title: 'Why it still works in 2026' },
      { id: 'how', title: 'The routine that saves 90 minutes' },
      { id: 'per', title: 'Per-park openers worth the alarm' },
      { id: 'skip', title: 'When to skip rope drop entirely' },
    ],
    body: 'rope-drop',
  },
  'wdw-with-toddlers': {
    title: 'Walt Disney World with toddlers — a planning guide.',
    eyebrow: 'Planning · 10 min read',
    lede: 'The trip still works with a two-year-old. It just has a different shape — shorter mornings, real naps, earlier dinners, and fewer rides per day. This guide gives you that shape.',
    description:
      'A realistic Walt Disney World trip plan for families traveling with toddlers. What to expect, what to drop, and how to keep the day kind to everyone.',
    sections: [],
    body: 'stub',
  },
  'lightning-lane-multi-vs-single': {
    title: 'Lightning Lane Multi Pass vs. Single Pass — what is worth it?',
    eyebrow: 'Strategy · 6 min read',
    lede: 'Disney changed the pay-to-skip system again. Here is a clear frame for when Multi Pass saves you real time, when Single Pass is worth it, and when to skip both.',
    description:
      'A plain-language comparison of Lightning Lane Multi Pass and Single Pass for Walt Disney World, with concrete rules for when each is worth the money.',
    sections: [],
    body: 'stub',
  },
  'first-time-packing-list': {
    title: 'First-time WDW packing list.',
    eyebrow: 'Packing · 5 min read',
    lede: 'The unglamorous items you will actually use at Walt Disney World, the wardrobe rules that matter in Florida summers, and the one thing every first-timer forgets.',
    description:
      'A practical Walt Disney World packing list for first-time visitors. The essentials, the surprises, and what you really need from the hotel.',
    sections: [],
    body: 'stub',
  },
};

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const guide = GUIDES[slug];
  if (!guide) return { title: 'Guide not found — WonderWaltz' };
  return {
    title: `${guide.title.replace(/\.$/, '')} — WonderWaltz`,
    description: guide.description,
  };
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  return (
    <>
      <Section bg="cream" padY={80}>
        <div className="ww-container-narrow" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Link
              href="/guides"
              style={{
                padding: 0,
                color: 'var(--ww-muted-fg)',
                fontSize: 13,
                fontFamily: 'var(--ww-font-mono)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              ← All guides
            </Link>
          </div>
          <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
            {guide.eyebrow}
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 68px)', lineHeight: 1.05, marginBottom: 24 }}>
            {guide.title}
          </h1>
          <p
            style={{
              fontSize: 20,
              color: 'var(--ww-muted-fg)',
              lineHeight: 1.55,
              marginBottom: 32,
              maxWidth: 640,
            }}
          >
            {guide.lede}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              paddingBottom: 32,
              borderBottom: '1px solid var(--ww-muted)',
            }}
          >
            <div
              style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--ww-muted)' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>The WonderWaltz team</div>
              <div className="ww-mono" style={{ fontSize: 12, color: 'var(--ww-muted-fg)' }}>
                Updated April 2026
              </div>
            </div>
          </div>
        </div>
      </Section>

      {guide.body === 'rope-drop' ? (
        <RopeDropBody sections={guide.sections} />
      ) : (
        <StubBody title={guide.title} />
      )}

      <Section bg="cream" padY={80}>
        <div className="ww-eyebrow" style={{ marginBottom: 20 }}>
          Related guides
        </div>
        <div
          className="ww-rel-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {Object.entries(GUIDES)
            .filter(([s]) => s !== slug)
            .slice(0, 3)
            .map(([s, g]) => (
              <Link
                key={s}
                href={`/guides/${s}`}
                className="ww-card ww-card-hover"
                style={{ display: 'block', textDecoration: 'none', height: '100%' }}
              >
                <div
                  style={{
                    height: 120,
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
                    <circle cx="50" cy="40" r={18} fill="var(--ww-gold)" opacity="0.5" />
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
                <h3 style={{ fontSize: 18, lineHeight: 1.25, marginBottom: 0 }}>{g.title}</h3>
              </Link>
            ))}
        </div>
        <style>{`@media (max-width: 820px) { .ww-rel-grid { grid-template-columns: 1fr !important; } }`}</style>
      </Section>
    </>
  );
}

function StubBody({ title }: { title: string }) {
  return (
    <Section bg="white" padY={80}>
      <div
        className="ww-container-narrow"
        style={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--ww-navy)',
        }}
      >
        <p style={{ fontSize: 18, color: 'var(--ww-muted-fg)' }}>
          This guide is being written. &quot;{title.replace(/\.$/, '')}&quot; will be the second
          long-form piece we publish — we keep our guide list short and solid rather than shipping a
          dozen shallow listicles.
        </p>
        <p>
          In the meantime, the app itself encodes a lot of what we would say here. The wizard asks
          the questions that matter; the plan respects the answers.
        </p>
        <div
          className="ww-card"
          style={{
            background: 'var(--ww-navy)',
            color: 'var(--ww-cream)',
            padding: 32,
            marginTop: 16,
            borderColor: 'var(--ww-navy)',
          }}
        >
          <h3 style={{ color: 'var(--ww-cream)', fontSize: 22, marginBottom: 10 }}>
            Want the guidance inside the app?
          </h3>
          <p
            style={{
              color: 'color-mix(in oklab, var(--ww-cream) 80%, transparent)',
              marginBottom: 20,
            }}
          >
            WonderWaltz picks the opener, the route, and the Lightning Lane slot — every day of your
            trip.
          </p>
          <a href="#" className="ww-btn ww-btn-accent">
            <Icon name="apple" size={16} /> Get the app
          </a>
        </div>
      </div>
    </Section>
  );
}

function RopeDropBody({ sections }: { sections: Array<{ id: string; title: string }> }) {
  return (
    <Section bg="white" padY={64}>
      <div className="ww-container-narrow" style={{ padding: 0 }}>
        {/* Hero illustration */}
        <div
          style={{
            height: 300,
            borderRadius: 20,
            background: 'var(--ww-cream)',
            border: '1px solid var(--ww-muted)',
            marginBottom: 48,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg viewBox="0 0 760 300" width="100%" height="100%" aria-hidden>
            <circle cx="380" cy="340" r="140" fill="var(--ww-gold)" opacity="0.25" />
            <circle cx="380" cy="340" r="180" fill="var(--ww-gold)" opacity="0.15" />
            <circle cx="380" cy="340" r="230" fill="var(--ww-gold)" opacity="0.08" />
            <path
              d="M 0 220 Q 380 160, 760 220"
              stroke="var(--ww-navy)"
              strokeWidth="3"
              fill="none"
            />
            <circle cx="380" cy="340" r="90" fill="var(--ww-gold)" />
            {[140, 200, 260, 520, 580, 620].map((x) => (
              <g key={x}>
                <circle cx={x} cy={215} r="3" fill="var(--ww-navy)" />
                <rect x={x - 1} y={215} width="2" height="10" fill="var(--ww-navy)" />
              </g>
            ))}
          </svg>
        </div>

        <div
          className="ww-article-grid"
          style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40 }}
        >
          <aside>
            <div className="ww-eyebrow" style={{ marginBottom: 14, fontSize: 11 }}>
              Table of contents
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                position: 'sticky',
                top: 96,
              }}
            >
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    style={{
                      fontSize: 13,
                      color: i === 0 ? 'var(--ww-navy)' : 'var(--ww-muted-fg)',
                      textDecoration: 'none',
                      borderLeft:
                        i === 0 ? '2px solid var(--ww-gold)' : '2px solid var(--ww-muted)',
                      paddingLeft: 12,
                      display: 'block',
                      lineHeight: 1.5,
                    }}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <article style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--ww-navy)' }}>
            <h2 id="what" style={{ fontSize: 30, marginBottom: 16, marginTop: 0 }}>
              What &quot;rope drop&quot; actually means
            </h2>
            <p style={{ marginBottom: 20 }}>
              Rope drop is the quiet ritual of being at a park turnstile 45 minutes before official
              open. It&apos;s how the people who know the parks best start every day — not because
              they&apos;re obsessed, but because the math is unbeatable. The first 90 minutes of a
              park day is when wait times are a fraction of what they&apos;ll be at 11 AM.
            </p>
            <p style={{ marginBottom: 32 }}>
              In 2026, with Early Entry benefits for resort guests and Lightning Lane Multi Pass
              pacing, the specific moves have shifted. The principle hasn&apos;t.
            </p>

            <h2 id="why" style={{ fontSize: 30, marginBottom: 16 }}>
              Why it still works in 2026
            </h2>
            <p style={{ marginBottom: 20 }}>
              Three rides in the first hour take roughly the same time as one ride at 2 PM.
              You&apos;re trading a little sleep for a lot of park.
            </p>
            <div
              style={{
                background: 'var(--ww-cream)',
                borderLeft: '3px solid var(--ww-gold)',
                padding: '20px 24px',
                margin: '24px 0',
                borderRadius: 6,
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--ww-font-display)',
                  fontSize: 22,
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  margin: 0,
                  color: 'var(--ww-navy)',
                }}
              >
                &quot;The first hour after the rope drops is the cheapest ride-time of the day.
                It&apos;s a 3-for-1.&quot;
              </p>
            </div>

            <h2 id="how" style={{ fontSize: 30, marginBottom: 16 }}>
              The routine that saves 90 minutes
            </h2>
            <ol
              style={{
                paddingLeft: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginBottom: 32,
              }}
            >
              {(
                [
                  [
                    'Wake up an hour before you think you should.',
                    'Breakfast is allowed to be a granola bar.',
                  ],
                  [
                    'Be at the turnstile 45 minutes early.',
                    'Hotel transport is slower than you expect.',
                  ],
                  [
                    'Walk, don’t run, to the furthest ride first.',
                    'Everyone else runs to the closest one.',
                  ],
                  [
                    'Circle back for the second and third.',
                    'By now the crowds are catching up — but you’re ahead.',
                  ],
                ] as const
              ).map(([t, d], i) => (
                <li key={t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: 'var(--ww-navy)',
                      color: 'var(--ww-cream)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'var(--ww-font-mono)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 17, marginBottom: 2 }}>{t}</div>
                    <div style={{ fontSize: 15, color: 'var(--ww-muted-fg)' }}>{d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <h2 id="per" style={{ fontSize: 30, marginBottom: 16 }}>
              Per-park openers worth the alarm
            </h2>
            <p style={{ marginBottom: 20 }}>
              Every park has one ride where rope drop is the difference between a 20-minute standby
              and a 110-minute regret. In the app, we flag these per day based on your party and the
              forecast — because the &quot;right&quot; opener depends on whether you have a
              5-year-old with you.
            </p>

            <h2 id="skip" style={{ fontSize: 30, marginBottom: 16 }}>
              When to skip rope drop entirely
            </h2>
            <p style={{ marginBottom: 20 }}>
              If your party includes a light sleeper, a jet-lagged grandparent, or a toddler
              who&apos;d rather start at 10 AM — skip it. A good afternoon with a rested family
              beats a good morning with a miserable one. The app adjusts.
            </p>

            <div
              className="ww-card"
              style={{
                background: 'var(--ww-navy)',
                color: 'var(--ww-cream)',
                padding: 32,
                marginTop: 48,
                borderColor: 'var(--ww-navy)',
              }}
            >
              <h3 style={{ color: 'var(--ww-cream)', fontSize: 22, marginBottom: 10 }}>
                Want this done for you?
              </h3>
              <p
                style={{
                  color: 'color-mix(in oklab, var(--ww-cream) 80%, transparent)',
                  marginBottom: 20,
                }}
              >
                WonderWaltz picks the opener, the route, and the Lightning Lane slot — every day of
                your trip.
              </p>
              <a href="#" className="ww-btn ww-btn-accent">
                <Icon name="apple" size={16} /> Get the app
              </a>
            </div>
          </article>
        </div>
        <style>{`
          @media (max-width: 820px) {
            .ww-article-grid { grid-template-columns: 1fr !important; }
            .ww-article-grid aside { display: none; }
          }
        `}</style>
      </div>
    </Section>
  );
}
