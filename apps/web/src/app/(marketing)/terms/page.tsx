import type { Metadata } from 'next';
import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms — WonderWaltz',
  description: 'Terms of service for the WonderWaltz trip-planning app.',
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of service" updated="April 2026 (draft)">
      <p
        style={{
          padding: '14px 18px',
          background: 'var(--ww-cream-deep)',
          border: '1px dashed color-mix(in oklab, var(--ww-navy) 25%, transparent)',
          borderRadius: 12,
          fontSize: 14,
          color: 'var(--ww-muted-fg)',
        }}
      >
        Draft pending legal review. This is a good-faith placeholder describing how the app is
        intended to work — not the final, enforceable contract. That will live here before launch.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>What the app is</h2>
      <p>
        WonderWaltz is a trip-planning tool. We give you a recommended itinerary based on the
        information you provide and data we source from public park feeds. We are not a travel
        agency, a booking service, or a Disney-authorized representative.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>Your purchases</h2>
      <p>
        Trip unlocks are one-time consumable purchases processed through the Apple App Store. They
        unlock full itinerary access for a single trip. Refunds are handled by Apple per App Store
        policy.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>What we do not promise</h2>
      <p>
        Queue times, weather, and park hours come from third-party sources and can change without
        notice. We plan against the best available data, but we cannot guarantee the park will
        cooperate.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>Liability</h2>
      <p>
        We are not liable for missed experiences, changed Disney policies, weather, or acts of
        actual dragons. Your trip is yours.
      </p>
    </LegalPage>
  );
}
