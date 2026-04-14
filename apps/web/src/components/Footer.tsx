import { ATTRIBUTION } from '@wonderwaltz/content';

const DISCLAIMER =
  'WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.';

export function Footer() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <p>{DISCLAIMER}</p>
      <p className="mt-1">{ATTRIBUTION}</p>
    </footer>
  );
}
