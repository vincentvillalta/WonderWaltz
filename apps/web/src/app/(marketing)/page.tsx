import Link from 'next/link';
import { Icon, type IconName } from '../../components/marketing/Icon';
import { Reveal } from '../../components/marketing/Reveal';
import { Section } from '../../components/marketing/Section';
import { HeroRibbon } from '../../components/marketing/HeroRibbon';
import { PlanTimeline } from '../../components/marketing/PlanTimeline';

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section
        style={{
          background: 'var(--ww-cream)',
          padding: '72px 0 96px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          aria-hidden
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 700,
            height: 700,
            opacity: 0.5,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              cx="350"
              cy="350"
              r={60 + i * 45}
              fill="none"
              stroke="var(--ww-navy)"
              strokeWidth="0.8"
              opacity={0.15 - i * 0.02}
            />
          ))}
        </svg>

        <div className="ww-container">
          <div
            className="ww-hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.05fr 1fr',
              gap: 56,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                className="ww-eyebrow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'var(--ww-white)',
                  border: '1px solid var(--ww-muted)',
                  borderRadius: 999,
                  marginBottom: 28,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--ww-gold)',
                  }}
                />
                Unofficial fan app · iOS
              </div>
              <h1
                style={{ fontSize: 'clamp(44px, 6vw, 76px)', lineHeight: 1.02, marginBottom: 24 }}
              >
                A Walt Disney World
                <br />
                day that{' '}
                <em
                  style={{
                    fontStyle: 'italic',
                    fontFamily: 'var(--ww-font-display)',
                    color: 'var(--ww-navy)',
                    position: 'relative',
                    display: 'inline-block',
                  }}
                >
                  actually flows.
                  <svg
                    style={{ position: 'absolute', bottom: -8, left: 0, width: '100%', height: 10 }}
                    viewBox="0 0 200 10"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M 2 7 Q 50 0, 100 5 T 198 4"
                      stroke="var(--ww-gold)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </em>
              </h1>
              <p
                style={{
                  fontSize: 20,
                  lineHeight: 1.55,
                  color: 'var(--ww-muted-fg)',
                  maxWidth: 540,
                  marginBottom: 36,
                }}
              >
                Answer a few questions. Get a day-by-day plan that respects your family&apos;s
                rhythm — rope drop for the thrill-seekers, a real lunch, a quiet afternoon reset,
                and a front-row spot for the fireworks.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
                <a
                  href="#"
                  className="ww-btn ww-btn-accent"
                  style={{ minHeight: 52, padding: '0 26px', fontSize: 16 }}
                >
                  <Icon name="apple" size={18} /> Download on App Store
                </a>
                <Link
                  href="/how-it-works"
                  className="ww-btn ww-btn-secondary"
                  style={{ minHeight: 52, padding: '0 22px', fontSize: 15 }}
                >
                  See how it works <Icon name="arrow" size={16} />
                </Link>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <MiniStat icon="clock" label="Plans in 90 seconds" />
                <MiniStat icon="accessibility" label="DAS + mobility aware" />
                <MiniStat icon="cloud" label="Offline-ready" />
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <HeroRibbon />
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            .ww-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          }
        `}</style>
      </section>

      {/* Reviewers strip */}
      <section
        style={{
          background: 'var(--ww-white)',
          borderTop: '1px solid var(--ww-muted)',
          borderBottom: '1px solid var(--ww-muted)',
          padding: '36px 0',
        }}
      >
        <div
          className="ww-container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <p
            className="ww-mono"
            style={{
              fontSize: 12,
              color: 'var(--ww-muted-fg)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Reviewed by people who actually walked the miles
          </p>
          <div
            style={{
              display: 'flex',
              gap: 40,
              flexWrap: 'wrap',
              alignItems: 'center',
              opacity: 0.55,
            }}
          >
            {['The Chatty Planner', 'Parkside Post', 'TouringNerd', 'Family Trip Diaries'].map(
              (n) => (
                <span
                  key={n}
                  style={{
                    fontFamily: 'var(--ww-font-display)',
                    fontSize: 18,
                    fontStyle: 'italic',
                    color: 'var(--ww-navy)',
                  }}
                >
                  {n}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* How it works mini */}
      <Section bg="cream" padY={120}>
        <Reveal>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'end',
              gap: 24,
              marginBottom: 56,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
                How it works
              </div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', marginBottom: 14 }}>
                From a handful of questions to a plan you can actually walk.
              </h2>
              <p style={{ color: 'var(--ww-muted-fg)', fontSize: 17, lineHeight: 1.6 }}>
                No spreadsheets. No 40-tab planning sessions. Four steps and you&apos;re packing.
              </p>
            </div>
            <Link href="/how-it-works" className="ww-btn ww-btn-ghost">
              See it in detail <Icon name="arrow" size={16} />
            </Link>
          </div>
        </Reveal>
        <div
          className="ww-how-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
        >
          {(
            [
              {
                n: '01',
                t: 'Tell us your trip',
                d: "Dates, travelers' ages in brackets, mobility needs, thrill tolerance, must-dos.",
              },
              {
                n: '02',
                t: 'We assemble the day',
                d: 'Rides, meals, rest breaks, Lightning Lane pacing. Weather and crowd forecasts baked in.',
              },
              {
                n: '03',
                t: 'Rethink anything',
                d: 'Swap a ride, kill an afternoon, add a date night. The plan reflows without breaking.',
              },
              {
                n: '04',
                t: 'Walk in with confidence',
                d: 'Offline mode for weak park Wi-Fi. Gentle narration for what’s next, never pushy.',
              },
            ] as const
          ).map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="ww-card ww-card-hover" style={{ height: '100%' }}>
                <div
                  className="ww-mono"
                  style={{
                    fontSize: 12,
                    color: 'var(--ww-gold-600)',
                    letterSpacing: '0.1em',
                    marginBottom: 20,
                  }}
                >
                  STEP {s.n}
                </div>
                <h3 style={{ fontSize: 22, marginBottom: 10 }}>{s.t}</h3>
                <p style={{ color: 'var(--ww-muted-fg)', fontSize: 15, lineHeight: 1.55 }}>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .ww-how-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 560px) { .ww-how-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* Plan mockup */}
      <Section bg="white" padY={120}>
        <div
          className="ww-plan-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
        >
          <Reveal>
            <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
              The shape of a day
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 46px)', marginBottom: 20 }}>
              Not a to-do list. A rhythm.
            </h2>
            <p
              style={{
                color: 'var(--ww-muted-fg)',
                fontSize: 17,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Morning thrill rides while lines are short. A sit-down lunch before you&apos;re
              hangry. A 90-minute reset when the 3 PM sugar crash hits. Dinner, then one last ride
              under the lights. We plan around humans, not against them.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {[
                'Lightning Lane windows slotted, not squeezed',
                'Meals timed to 45-min early-off-peak windows',
                'Rest breaks built in, not an afterthought',
                'Evening show in a spot you can actually see',
              ].map((t) => (
                <li key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'color-mix(in oklab, var(--ww-gold) 30%, transparent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Icon name="check" size={13} color="var(--ww-navy)" />
                  </span>
                  <span style={{ fontSize: 16 }}>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="ww-card" style={{ padding: 28, background: 'var(--ww-cream)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    className="ww-mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--ww-muted-fg)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    TUE · DAY 2
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontFamily: 'var(--ww-font-display)',
                      marginTop: 2,
                    }}
                  >
                    Magic Kingdom focus
                  </div>
                </div>
                <div className="ww-mono" style={{ fontSize: 11, color: 'var(--ww-muted-fg)' }}>
                  72°F · low crowds
                </div>
              </div>
              <PlanTimeline />
            </div>
          </Reveal>
        </div>
        <style>{`
          @media (max-width: 900px) { .ww-plan-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* Feature grid */}
      <Section bg="cream" padY={120}>
        <Reveal>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 64,
              maxWidth: 640,
              margin: '0 auto 64px',
            }}
          >
            <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
              What&apos;s in the app
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Everything you&apos;d hire a trip-planning friend for.
            </h2>
          </div>
        </Reveal>
        <div
          className="ww-feat-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {(
            [
              {
                icon: 'compass',
                t: 'Personalized plans',
                d: 'Ages, interests, mobility, thrill tolerance — all folded in from the start. Not a one-size-fits-all template.',
              },
              {
                icon: 'sparkle',
                t: 'Whimsical narration',
                d: 'A gentle, knowing voice walks you through the day. Turns down or off when you just want the list.',
              },
              {
                icon: 'cloud',
                t: 'Offline-ready',
                d: 'Park Wi-Fi is famously flaky. Your plan, maps, and timings work without a signal.',
              },
              {
                icon: 'clock',
                t: 'Weather-aware',
                d: 'Thunderstorm forecast? Indoor rides float up. Cool morning? We push outdoor blocks earlier.',
              },
              {
                icon: 'accessibility',
                t: 'Accessibility-first',
                d: 'DAS awareness, mobility-friendly routing, sensory-sensitive pacing. Real considerations, not a checkbox.',
              },
              {
                icon: 'luggage',
                t: 'Packing list',
                d: 'Generated from your party, the forecast, and the rides you’re planning. Including the thing you’d forget.',
              },
            ] as Array<{ icon: IconName; t: string; d: string }>
          ).map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 80}>
              <div className="ww-card ww-card-hover" style={{ height: '100%' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'color-mix(in oklab, var(--ww-gold) 20%, transparent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <Icon name={f.icon} size={22} color="var(--ww-navy)" />
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>{f.t}</h3>
                <p style={{ color: 'var(--ww-muted-fg)', fontSize: 15, lineHeight: 1.6 }}>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .ww-feat-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 560px) { .ww-feat-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* Pricing tease */}
      <Section bg="white" padY={120}>
        <div
          className="ww-card"
          style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--ww-muted)' }}
        >
          <div
            className="ww-price-inner"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                padding: '56px 56px',
                background: 'var(--ww-navy)',
                color: 'var(--ww-cream)',
              }}
            >
              <div
                className="ww-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ww-gold-100)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 18,
                }}
              >
                Pricing
              </div>
              <h2
                style={{
                  color: 'var(--ww-cream)',
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  marginBottom: 18,
                }}
              >
                <em style={{ fontStyle: 'italic' }}>$9.99</em> per trip. No subscription. Ever.
              </h2>
              <p
                style={{
                  color: 'color-mix(in oklab, var(--ww-cream) 80%, transparent)',
                  fontSize: 17,
                  lineHeight: 1.6,
                  marginBottom: 28,
                  maxWidth: 440,
                }}
              >
                Day 1 is free to explore. Unlock the rest of your trip once, use it without limits,
                come back next year and pay again. That&apos;s it.
              </p>
              <Link href="/pricing" className="ww-btn ww-btn-accent" style={{ minHeight: 48 }}>
                See what&apos;s included <Icon name="arrow" size={16} />
              </Link>
            </div>
            <div
              style={{
                padding: '56px',
                background: 'var(--ww-cream)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div className="ww-eyebrow" style={{ marginBottom: 20 }}>
                Included when you unlock
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {[
                  'All days of your trip, not just day one',
                  'Unlimited rethinks — swap, skip, add',
                  'Offline plan + park maps',
                  'Packing list tailored to your party',
                  'Lightning Lane pacing assistant',
                ].map((t) => (
                  <li key={t} style={{ display: 'flex', gap: 12, fontSize: 16 }}>
                    <Icon name="check" color="var(--ww-gold-600)" size={20} /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 820px) { .ww-price-inner { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* Testimonial placeholders */}
      <Section bg="cream" padY={120}>
        <Reveal>
          <div style={{ marginBottom: 56, maxWidth: 620 }}>
            <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
              From the folks on the ground
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 46px)' }}>
              Real families. Real miles. Real feedback.
            </h2>
          </div>
        </Reveal>
        <div
          className="ww-test-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                className="ww-card"
                style={{ height: '100%', minHeight: 220, display: 'flex', flexDirection: 'column' }}
              >
                <svg
                  width="28"
                  height="22"
                  viewBox="0 0 28 22"
                  fill="none"
                  style={{ marginBottom: 16 }}
                  aria-hidden
                >
                  <path
                    d="M6 2 Q 2 2, 2 8 Q 2 14, 8 14 L 10 14 L 10 20 L 2 20"
                    stroke="var(--ww-gold)"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M20 2 Q 16 2, 16 8 Q 16 14, 22 14 L 24 14 L 24 20 L 16 20"
                    stroke="var(--ww-gold)"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <div
                  className="ww-placeholder"
                  style={{ minHeight: 80, marginBottom: 16, fontSize: 11 }}
                >
                  testimonial slot — add when reviewed
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: 'var(--ww-muted)',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Reviewer name</div>
                    <div className="ww-mono" style={{ fontSize: 11, color: 'var(--ww-muted-fg)' }}>
                      role / publication
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .ww-test-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* Final CTA */}
      <Section bg="cream" padY={80}>
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            border: '1px dashed color-mix(in oklab, var(--ww-gold) 100%, transparent)',
            borderRadius: 20,
            background: 'var(--ww-white)',
          }}
        >
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', marginBottom: 14 }}>
            Your trip is close. The plan should be too.
          </h2>
          <p style={{ color: 'var(--ww-muted-fg)', fontSize: 17, marginBottom: 28 }}>
            Day 1 is free. Give it 90 seconds.
          </p>
          <a href="#" className="ww-btn ww-btn-accent" style={{ minHeight: 52, padding: '0 28px' }}>
            <Icon name="apple" size={18} /> Start planning
          </a>
        </div>
      </Section>
    </>
  );
}

function MiniStat({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        color: 'var(--ww-muted-fg)',
      }}
    >
      <Icon name={icon} size={16} color="var(--ww-gold-600)" /> {label}
    </div>
  );
}
