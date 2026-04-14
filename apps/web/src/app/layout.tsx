import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'WonderWaltz — Walt Disney World Trip Planner',
  description:
    'The smartest way to plan your Walt Disney World visit. Personalized day-by-day itineraries powered by live wait times.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
