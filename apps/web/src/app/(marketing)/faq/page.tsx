'use client';

import { useState } from 'react';
import { Icon } from '../../../components/marketing/Icon';
import { Section } from '../../../components/marketing/Section';

const FAQS = [
  {
    q: 'Is this app affiliated with Disney?',
    a: 'No. WonderWaltz is an unofficial, independent fan app. We are not affiliated with, endorsed by, or sponsored by The Walt Disney Company. We do not use Disney trademarks in our branding, and our illustrations are original work — no castles, no mouse silhouettes, no Disney-font pastiche. We refer to "Walt Disney World" only descriptively, because that is the park we help you plan.',
  },
  {
    q: 'Does it work with Lightning Lane Multi Pass?',
    a: "Yes. The app schedules around your Lightning Lane selections, suggests windows that maximize saved time, and reflows the rest of the day when you book a new slot. We update pacing logic as Disney's systems evolve.",
  },
  {
    q: 'What about accessibility — DAS, mobility, sensory needs?',
    a: 'Accessibility is in the wizard, not an afterthought. We ask about mobility (wheelchair, slow walker, needs frequent rest), sensory considerations (loud shows, dark rides, crowds), and DAS eligibility. Plans reflect these — routing adjusts, sensory-sensitive blocks get flagged, rest breaks come more often.',
  },
  {
    q: 'What data do you store about my family?',
    a: "Ages in brackets only — never exact birthdays, never individual names tied to ages. Trip dates, must-dos, and mobility notes are stored for your active trip and deleted after. We're GDPR and CCPA compliant, and for children under 13 we follow COPPA strictly.",
  },
  {
    q: 'Where does the queue-time data come from?',
    a: 'Queue times are from queue-times.com (with attribution in the footer of every page). Park hours and event schedules are from themeparks.wiki. Weather from the National Weather Service. All real-time, all cross-checked.',
  },
  {
    q: 'What happens if I do not have signal in the park?',
    a: 'The app works offline. Your plan, park maps, and all the guidance downloads when you open the app, and stays useful without a signal. When you reconnect, we re-sync queue times in the background.',
  },
  {
    q: 'Can I plan for a Disneyland trip?',
    a: 'Not yet. v1 is Walt Disney World only. Disneyland (and Walt Disney World with Android) are next.',
  },
  {
    q: 'Why is it $9.99 per trip and not a subscription?',
    a: 'Because trips end. Charging you $5/month for eight months before your August trip feels wrong. Pay once when the trip is coming up, use it fully, come back next year.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <Section bg="cream" padY={96}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
            FAQ
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginBottom: 20 }}>
            The questions people actually ask.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--ww-muted-fg)', lineHeight: 1.55 }}>
            Short answers. If you want longer, get in touch.
          </p>
        </div>
      </Section>

      <Section bg="white" padY={60}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} style={{ borderBottom: '1px solid var(--ww-muted)' }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    padding: '24px 0',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--ww-font-display)',
                      fontSize: 22,
                      letterSpacing: '-0.01em',
                      color: 'var(--ww-navy)',
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: isOpen ? 'var(--ww-gold)' : 'var(--ww-cream)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 200ms',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    <Icon name="plus" size={16} color="var(--ww-navy)" />
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: isOpen ? 400 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 320ms var(--ww-ease), padding 320ms var(--ww-ease)',
                    paddingBottom: isOpen ? 24 : 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: 16,
                      color: 'var(--ww-muted-fg)',
                      lineHeight: 1.7,
                      maxWidth: 680,
                    }}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
