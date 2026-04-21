import type { Metadata } from 'next';
import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Accessibility — WonderWaltz',
  description:
    'How WonderWaltz approaches accessibility in the app and on the web — WCAG 2.2 AA, DAS awareness, mobility and sensory considerations.',
};

export default function AccessibilityPage() {
  return (
    <LegalPage eyebrow="Legal" title="Accessibility" updated="April 2026">
      <p>
        We target WCAG 2.2 AA for both the iOS app and this marketing site. Color contrast, focus
        indicators, touch-target sizes, and keyboard navigation are checked on every release.
      </p>
      <h2 style={{ fontSize: 24, marginTop: 16 }}>In the app</h2>
      <ul
        style={{
          paddingLeft: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          margin: 0,
        }}
      >
        <li>VoiceOver navigates every screen without stuck elements.</li>
        <li>
          Dynamic Type scales cleanly through accessibility-5; no critical text clips or truncates.
        </li>
        <li>Reduced motion disables the scroll-linked animations.</li>
        <li>DAS, mobility, and sensory flags in the wizard drive real plan changes.</li>
      </ul>
      <h2 style={{ fontSize: 24, marginTop: 16 }}>On this site</h2>
      <p>
        The marketing site respects <code>prefers-reduced-motion</code>, uses focus-visible
        indicators, and is readable on screen readers. If something isn&apos;t working for you, tell
        us in Settings → Contact and we&apos;ll fix it.
      </p>
    </LegalPage>
  );
}
