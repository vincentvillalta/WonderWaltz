import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wonderwaltz.app'),
  title: {
    default: 'WonderWaltz — Walt Disney World trip planner',
    template: '%s — WonderWaltz',
  },
  description:
    'Day-by-day Walt Disney World itineraries that flow with your trip, not against it. Personalized, accessibility-aware, offline-ready.',
  openGraph: {
    siteName: 'WonderWaltz',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    // Unofficial fan app disclaimer picked up by Google as the site tagline.
    'apple-mobile-web-app-title': 'WonderWaltz',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
