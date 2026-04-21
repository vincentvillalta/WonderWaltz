import type { Metadata } from 'next';
import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy — WonderWaltz',
  description:
    'How WonderWaltz handles your data: what we collect, what we do not, how long we keep it, and your rights under GDPR, CCPA, and COPPA.',
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="April 2026 (draft)">
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
        Draft pending legal review. This page will be replaced with the final privacy policy before
        public launch. The framing below describes the practices the app is being built against.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>What we collect</h2>
      <p>
        We collect the minimum necessary to produce a trip plan: trip dates, travelers&apos; ages in
        brackets (never exact birth dates), mobility and accessibility flags, meal preferences, and
        the must-do rides you select. We store an anonymous account ID so your plan syncs across
        devices.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>What we do not collect</h2>
      <p>
        We do not collect individual names tied to ages, precise locations outside of park queue
        matching, payment information (purchases go through Apple), or any information we have no
        use for. Crash reports are anonymized and strip any trip-identifying data.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>Children&apos;s data (COPPA)</h2>
      <p>
        The app stores ages in bracket form only — &quot;children (6–11)&quot;, not &quot;Emma, age
        7&quot;. We do not create child-specific accounts or solicit any personal information from
        anyone under 13.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>Your rights (GDPR, CCPA)</h2>
      <p>
        You can export or delete your data at any time from Settings → Privacy in the app. Deletion
        is processed within 30 days. EU and California residents have additional rights under GDPR
        and CCPA respectively, including the right to object to processing; contact us via the
        Settings screen to invoke them.
      </p>

      <h2 style={{ fontSize: 24, marginTop: 16 }}>Data retention</h2>
      <p>
        Trip data is kept until you delete the trip or the account. Aggregated, anonymized telemetry
        (what features are used, crash rates) is kept indefinitely.
      </p>
    </LegalPage>
  );
}
