import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WonderWaltz — Walt Disney World Trip Planner',
  description:
    'The smartest way to plan your Walt Disney World visit. Personalized day-by-day itineraries powered by live wait times.',
};

const DISCLAIMER =
  'WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          <p>{DISCLAIMER}</p>
          <p className="mt-1">
            Wait time data provided by{' '}
            <a
              href="https://queue-times.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              queue-times.com
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
