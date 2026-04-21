'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { Icon } from './Icon';

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/guides', label: 'Guides' },
  { href: '/faq', label: 'FAQ' },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', on, { passive: true });
    on();
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: scrolled
            ? 'color-mix(in oklab, var(--ww-cream) 92%, transparent)'
            : 'var(--ww-cream)',
          backdropFilter: scrolled ? 'saturate(140%) blur(8px)' : 'none',
          borderBottom: '1px solid var(--ww-muted)',
          height: 'var(--ww-nav-h)',
          transition: 'background 200ms ease',
        }}
      >
        <div
          className="ww-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <Logo />
          <div className="ww-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: '8px 0',
                    fontFamily: 'var(--ww-font-sans)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: active ? 'var(--ww-navy)' : 'var(--ww-muted-fg)',
                    borderBottom: active ? '2px solid var(--ww-gold)' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'color 200ms, border-color 200ms',
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="ww-btn ww-btn-accent"
              style={{ minHeight: 40, padding: '0 18px', fontSize: 14 }}
            >
              Get the app
            </Link>
          </div>
          <button
            className="ww-mobile-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              padding: 8,
            }}
          >
            <Icon name={mobileOpen ? 'x' : 'menu'} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--ww-nav-h)',
            left: 0,
            right: 0,
            zIndex: 49,
            background: 'var(--ww-cream)',
            borderBottom: '1px solid var(--ww-muted)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: '14px 0',
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--ww-navy)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--ww-muted)',
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/" className="ww-btn ww-btn-accent" style={{ marginTop: 12 }}>
            Get the app
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .ww-nav-links { display: none !important; }
          .ww-mobile-toggle {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
