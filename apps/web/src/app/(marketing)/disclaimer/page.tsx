import type { Metadata } from 'next';
import { LegalPage } from '../../../components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Disclaimer — WonderWaltz',
  description:
    'WonderWaltz is an unofficial fan app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.',
};

export default function DisclaimerPage() {
  return (
    <LegalPage eyebrow="Legal" title="Disclaimer" updated="April 2026">
      <p>
        <strong>WonderWaltz is an unofficial fan app.</strong> It is not affiliated with, endorsed
        by, or sponsored by The Walt Disney Company, Walt Disney Parks and Resorts U.S., Inc., or
        any of their subsidiaries.
      </p>
      <p>
        &quot;Walt Disney World,&quot; &quot;Magic Kingdom,&quot; &quot;EPCOT,&quot; &quot;
        Disney&apos;s Hollywood Studios,&quot; &quot;Disney&apos;s Animal Kingdom,&quot;
        &quot;Lightning Lane,&quot; and related marks are trademarks of their owners. We refer to
        them here only descriptively — because those are the parks and services we help you plan
        around. We do not claim any affiliation or right to those marks.
      </p>
      <p>
        Illustrations, typography, and visual design in this site are original work. We do not use
        Disney fonts, silhouettes, castle imagery, or character references. Any resemblance to
        Disney materials is coincidental and unintended.
      </p>
      <p>
        Queue times are sourced from queue-times.com under their published terms. Park hours and
        schedules are sourced from themeparks.wiki. Weather data comes from the National Weather
        Service. Attributions appear on every page of this site and in the app.
      </p>
      <p>
        If you are a trademark owner and believe this site or the app is using your mark improperly,
        please contact us and we will respond promptly.
      </p>
    </LegalPage>
  );
}
