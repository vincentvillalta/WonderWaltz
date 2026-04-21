import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/marketing/Icon';
import { Reveal } from '../../../components/marketing/Reveal';
import { Section } from '../../../components/marketing/Section';
import { PlanTimeline } from '../../../components/marketing/PlanTimeline';

export const metadata: Metadata = {
  title: 'How it works — WonderWaltz',
  description:
    'Four steps. A short wizard, a real plan, unlimited rethinks, offline-ready. No spreadsheets, no 40-tab planning sessions.',
};

const STEPS: Array<{ n: string; t: string; d: string; right: ReactNode }> = [
  {
    n: '01',
    t: 'Tell us your trip',
    d: 'A short wizard — no login required to start. Dates, hotel area, ages in brackets (never exact birth years), thrill tolerance, mobility, sensory notes, must-do rides, deal-breakers. The whole thing takes about 90 seconds.',
    right: <WizardMock />,
  },
  {
    n: '02',
    t: 'We build the days',
    d: 'Queue-time forecasts from queue-times.com. Weather from NWS. Park hours and special events from themeparks.wiki. We sequence rides to minimize walking and waiting, slot Lightning Lane windows where they save the most time, build in a real lunch and a real reset, and protect evening shows.',
    right: <PlanBuildMock />,
  },
  {
    n: '03',
    t: 'Rethink anything',
    d: "Don't like a ride? Swap it. Kid hit a wall at 2 PM? Tap “reset”. Date-night dinner? The plan reflows around it — Lightning Lane windows recalculate, rest blocks shift, nothing breaks. Rethinks are unlimited.",
    right: <RethinkMock />,
  },
  {
    n: '04',
    t: 'Walk in with confidence',
    d: "The day is on your phone, online or off. A soft, optional narrator tells you what's next and why. When you're done, tap done. When you're ahead, we surprise you with something to do with the extra twenty minutes.",
    right: <WalkMock />,
  },
];

export default function HowItWorks() {
  return (
    <>
      <Section bg="cream" padY={96}>
        <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
          How it works
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', maxWidth: 860, marginBottom: 24 }}>
          Four steps. One good day, then another.
        </h1>
        <p style={{ fontSize: 20, color: 'var(--ww-muted-fg)', lineHeight: 1.55, maxWidth: 640 }}>
          Here&apos;s the whole shape of it — wizard, plan, walk. No hidden complexity. No
          &quot;upgrade for the good stuff.&quot;
        </p>
      </Section>

      {STEPS.map((step, i) => (
        <Section key={step.n} bg={i % 2 === 0 ? 'white' : 'cream'} padY={100}>
          <Reveal>
            <div
              className="ww-step-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 64,
                alignItems: 'center',
              }}
            >
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div
                  className="ww-mono"
                  style={{
                    fontSize: 12,
                    color: 'var(--ww-gold-600)',
                    letterSpacing: '0.14em',
                    marginBottom: 14,
                  }}
                >
                  STEP {step.n}
                </div>
                <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', marginBottom: 18 }}>{step.t}</h2>
                <p style={{ fontSize: 17, color: 'var(--ww-muted-fg)', lineHeight: 1.65 }}>
                  {step.d}
                </p>
              </div>
              <div style={{ order: i % 2 === 0 ? 1 : 0 }}>{step.right}</div>
            </div>
          </Reveal>
          <style>{`
            @media (max-width: 900px) {
              .ww-step-grid {
                grid-template-columns: 1fr !important;
                gap: 28px !important;
              }
              .ww-step-grid > * { order: 0 !important; }
            }
          `}</style>
        </Section>
      ))}

      <Section bg="white" padY={100}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', marginBottom: 18 }}>
            Ready to see your trip?
          </h2>
          <a href="#" className="ww-btn ww-btn-accent" style={{ minHeight: 52, padding: '0 28px' }}>
            <Icon name="apple" size={18} /> Download on App Store
          </a>
        </div>
      </Section>
    </>
  );
}

// ─── Mock illustrations for each step ──────────────────────────────

function WizardMock() {
  const rows: Array<readonly [string, string, boolean]> = [
    ['Adults (18+)', '2', true],
    ['Teens (12–17)', '1', true],
    ['Children (6–11)', '0', false],
    ['Little ones (0–5)', '1', true],
  ];
  return (
    <div className="ww-card" style={{ padding: 28, background: 'var(--ww-cream)' }}>
      <div className="ww-eyebrow" style={{ marginBottom: 18 }}>
        Question 3 of 7
      </div>
      <h3 style={{ fontSize: 22, marginBottom: 6 }}>Who&apos;s traveling with you?</h3>
      <p style={{ fontSize: 13, color: 'var(--ww-muted-fg)', marginBottom: 20 }}>
        Ages in brackets — we don&apos;t need exact birthdays.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([label, count, on]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderRadius: 10,
              background: on ? 'var(--ww-white)' : 'transparent',
              border: on ? '1px solid var(--ww-gold)' : '1px solid var(--ww-muted)',
            }}
          >
            <span style={{ fontSize: 15 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: '1px solid var(--ww-muted)',
                  background: 'var(--ww-white)',
                }}
                aria-label="Decrease"
              >
                <Icon name="minus" size={14} />
              </button>
              <span
                className="ww-mono"
                style={{ minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: 600 }}
              >
                {count}
              </span>
              <button
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: '1px solid var(--ww-muted)',
                  background: 'var(--ww-white)',
                }}
                aria-label="Increase"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 22,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 4,
                borderRadius: 2,
                background: i < 3 ? 'var(--ww-gold)' : 'var(--ww-muted)',
              }}
            />
          ))}
        </div>
        <button
          className="ww-btn ww-btn-primary"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}
        >
          Next <Icon name="arrow" size={14} />
        </button>
      </div>
    </div>
  );
}

function PlanBuildMock() {
  return (
    <div className="ww-card" style={{ padding: 28, background: 'var(--ww-cream)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <div>
          <div
            className="ww-mono"
            style={{ fontSize: 11, color: 'var(--ww-muted-fg)', letterSpacing: '0.08em' }}
          >
            BUILDING DAY 2
          </div>
          <div style={{ fontSize: 18, fontFamily: 'var(--ww-font-display)', marginTop: 2 }}>
            Magic Kingdom
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: 'color-mix(in oklab, var(--ww-park-epcot) 18%, transparent)',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--ww-navy)',
            fontWeight: 500,
          }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ww-park-ak)' }}
          />{' '}
          Low crowds
        </div>
      </div>
      <PlanTimeline />
      <div
        style={{
          marginTop: 18,
          padding: 14,
          background: 'var(--ww-white)',
          border: '1px solid var(--ww-muted)',
          borderRadius: 10,
          display: 'flex',
          gap: 10,
        }}
      >
        <Icon name="sparkle" color="var(--ww-gold-600)" />
        <p
          style={{
            fontSize: 13,
            color: 'var(--ww-muted-fg)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Morning rope drop saves ~90 min of waiting. Rest block from 11:15 fits your
          5-year-old&apos;s usual wall.
        </p>
      </div>
    </div>
  );
}

function RethinkMock() {
  const opts = [
    { t: 'Swap for something calmer', s: 'Boat ride, carousel, dark ride', active: true },
    { t: 'Replace with rest break', s: 'Back to the hotel pool', active: false },
    { t: 'Move to another day', s: 'Day 3 has a gap', active: false },
  ];
  return (
    <div className="ww-card" style={{ padding: 28, background: 'var(--ww-cream)' }}>
      <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
        Rethink this block
      </div>
      <div
        style={{
          padding: 14,
          background: 'var(--ww-white)',
          border: '1px solid var(--ww-muted)',
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 6, height: 36, borderRadius: 3, background: 'var(--ww-park-mk)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Afternoon ride block</div>
            <div className="ww-mono" style={{ fontSize: 11, color: 'var(--ww-muted-fg)' }}>
              2:45 PM · 75 min
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map((opt) => (
          <button
            key={opt.t}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderRadius: 10,
              background: opt.active
                ? 'color-mix(in oklab, var(--ww-gold) 15%, var(--ww-white))'
                : 'var(--ww-white)',
              border: opt.active ? '1px solid var(--ww-gold)' : '1px solid var(--ww-muted)',
              textAlign: 'left',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{opt.t}</div>
              <div style={{ fontSize: 12, color: 'var(--ww-muted-fg)' }}>{opt.s}</div>
            </div>
            {opt.active && <Icon name="check" color="var(--ww-gold-600)" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function WalkMock() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="ww-device" style={{ maxWidth: 280, width: '100%' }}>
        <div
          className="ww-device-screen"
          style={{
            padding: '24px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div className="ww-mono" style={{ fontSize: 10, color: 'var(--ww-muted-fg)' }}>
              TUE · 11:14 AM
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: 'var(--ww-muted-fg)',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: 'var(--ww-park-ak)',
                }}
              />{' '}
              Offline
            </div>
          </div>
          <div>
            <div className="ww-eyebrow" style={{ marginBottom: 4, fontSize: 10 }}>
              UP NEXT · 11:15
            </div>
            <div
              style={{
                fontFamily: 'var(--ww-font-display)',
                fontSize: 22,
                lineHeight: 1.15,
              }}
            >
              Rest block, back to the hotel
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: 'var(--ww-cream-deep)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ww-navy)', lineHeight: 1.5 }}>
              &quot;You&apos;ve walked 4.1 miles already. Take the monorail, eat a proper lunch, let
              the 5-year-old watch something with air conditioning.&quot;
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <div className="ww-eyebrow" style={{ marginBottom: 8, fontSize: 10 }}>
              LATER TODAY
            </div>
            <PlanTimeline compact animate={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
