import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/marketing/Icon';
import { Section } from '../../../components/marketing/Section';

export const metadata: Metadata = {
  title: 'Pricing — WonderWaltz',
  description:
    '$9.99 per trip. No subscription. Day 1 is free to explore; unlock the rest once and use it until your trip is done.',
};

export default function Pricing() {
  return (
    <>
      <Section bg="cream" padY={96}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(44px, 6vw, 76px)', marginBottom: 20 }}>
            One price. Per trip. Forever.
          </h1>
          <p style={{ fontSize: 20, color: 'var(--ww-muted-fg)', lineHeight: 1.55 }}>
            No subscriptions to forget about. No tiers. No upsells inside the park. Pay once when
            you&apos;re ready, use it until your trip is done.
          </p>
        </div>
      </Section>

      <Section bg="white" padY={60}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 4,
              background: 'var(--ww-cream)',
              borderRadius: 999,
              border: '1px solid var(--ww-muted)',
            }}
          >
            <span
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'var(--ww-white)',
                boxShadow: 'var(--ww-shadow-sm)',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--ww-navy)',
              }}
            >
              Walt Disney World
            </span>
            <span
              aria-disabled
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'transparent',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--ww-muted-fg)',
                cursor: 'not-allowed',
              }}
            >
              Disneyland (coming soon)
            </span>
          </div>
        </div>

        <div
          className="ww-price-cards"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
          {/* Free tier */}
          <div className="ww-card" style={{ padding: 36, height: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 28 }}>Day 1</h3>
              <div
                style={{
                  fontFamily: 'var(--ww-font-display)',
                  fontSize: 44,
                  color: 'var(--ww-navy)',
                }}
              >
                Free
              </div>
            </div>
            <p
              style={{
                color: 'var(--ww-muted-fg)',
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              See exactly what the app feels like with a full Day 1 plan — no credit card, no email
              wall.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 28,
              }}
            >
              <PriceRow>Full Day 1 itinerary</PriceRow>
              <PriceRow>Wizard + plan preview</PriceRow>
              <PriceRow>Lightning Lane pacing for Day 1</PriceRow>
              <PriceRow muted>Offline, rethinks, packing list</PriceRow>
              <PriceRow muted>Days 2 through the end of your trip</PriceRow>
            </ul>
            <a href="#" className="ww-btn ww-btn-secondary" style={{ width: '100%' }}>
              <Icon name="apple" size={16} /> Start with Day 1
            </a>
          </div>

          {/* Paid tier */}
          <div
            className="ww-card"
            style={{
              padding: 36,
              height: '100%',
              background: 'var(--ww-navy)',
              color: 'var(--ww-cream)',
              borderColor: 'var(--ww-navy)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg
              aria-hidden
              style={{
                position: 'absolute',
                top: -80,
                right: -80,
                width: 260,
                height: 260,
                opacity: 0.18,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <circle
                  key={i}
                  cx="130"
                  cy="130"
                  r={40 + i * 30}
                  fill="none"
                  stroke="#e8b547"
                  strokeWidth="1"
                />
              ))}
            </svg>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <h3 style={{ color: 'var(--ww-cream)', fontSize: 28 }}>Full trip</h3>
                <div
                  style={{
                    fontFamily: 'var(--ww-font-display)',
                    fontSize: 44,
                    color: 'var(--ww-gold)',
                  }}
                >
                  $9.99
                </div>
              </div>
              <p
                style={{
                  color: 'color-mix(in oklab, var(--ww-cream) 75%, transparent)',
                  fontSize: 15,
                  lineHeight: 1.6,
                  marginBottom: 28,
                }}
              >
                One-time unlock for this trip. Not a subscription. Come back next year and pay it
                again — or don&apos;t.
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                <PriceRow dark>Every day of your trip</PriceRow>
                <PriceRow dark>Unlimited rethinks &amp; swaps</PriceRow>
                <PriceRow dark>Offline mode + offline maps</PriceRow>
                <PriceRow dark>Lightning Lane pacing every day</PriceRow>
                <PriceRow dark>Packing list tailored to your party</PriceRow>
                <PriceRow dark>Weather-reactive re-planning</PriceRow>
              </ul>
              <a href="#" className="ww-btn ww-btn-accent" style={{ width: '100%' }}>
                <Icon name="apple" size={16} /> Unlock the whole trip — $9.99
              </a>
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 820px) { .ww-price-cards { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      <Section bg="cream" padY={80}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', marginBottom: 14 }}>
            Why not a subscription?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ww-muted-fg)', lineHeight: 1.65 }}>
            Because you don&apos;t go every month. A trip is a thing that ends. Charging you in
            February for a trip in August feels wrong. Pay when you need it, use it until you fly
            home, and we&apos;ll be here next time.
          </p>
        </div>
      </Section>
    </>
  );
}

function PriceRow({
  children,
  muted = false,
  dark = false,
}: {
  children: ReactNode;
  muted?: boolean;
  dark?: boolean;
}) {
  const checkColor = dark ? 'var(--ww-gold)' : 'var(--ww-gold-600)';
  return (
    <li
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        fontSize: 15,
        opacity: muted ? 0.45 : 1,
        color: dark ? 'color-mix(in oklab, var(--ww-cream) 92%, transparent)' : 'var(--ww-navy)',
        textDecoration: muted ? 'line-through' : 'none',
      }}
    >
      <Icon
        name={muted ? 'x' : 'check'}
        color={muted ? (dark ? 'var(--ww-cream)' : 'var(--ww-muted-fg)') : checkColor}
        size={18}
      />
      {children}
    </li>
  );
}
