import Link from 'next/link';
import { Logo } from './Logo';
import { Icon } from './Icon';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--ww-cream)',
        borderTop: '1px solid var(--ww-muted)',
        marginTop: 120,
      }}
    >
      <div className="ww-container" style={{ padding: '72px 24px 40px' }}>
        <div
          className="ww-footer-grid"
          style={{
            display: 'grid',
            gap: 48,
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
          }}
        >
          <div>
            <Logo />
            <p
              style={{
                color: 'var(--ww-muted-fg)',
                marginTop: 16,
                fontSize: 15,
                maxWidth: 320,
                lineHeight: 1.6,
              }}
            >
              Day-by-day Walt Disney World itineraries that flow with your trip, not against it.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <a
                href="#"
                className="ww-btn ww-btn-secondary"
                style={{ minHeight: 42, fontSize: 13 }}
              >
                <Icon name="apple" size={16} /> App Store
              </a>
            </div>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: '/how-it-works', label: 'How it works' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/guides', label: 'Guides' },
              { href: '/faq', label: 'FAQ' },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
              { href: '/disclaimer', label: 'Disclaimer' },
              { href: '/accessibility', label: 'Accessibility' },
            ]}
          />
          <div>
            <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
              Attribution
            </div>
            <p
              className="ww-mono"
              style={{
                fontSize: 12,
                color: 'var(--ww-muted-fg)',
                lineHeight: 1.7,
              }}
            >
              Queue times from queue-times.com
              <br />
              Park data from themeparks.wiki
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--ww-muted)',
            marginTop: 56,
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <p
            className="ww-mono"
            style={{
              fontSize: 11,
              color: 'var(--ww-muted-fg)',
              maxWidth: 720,
              lineHeight: 1.7,
            }}
          >
            Unofficial fan app. Not affiliated with, endorsed by, or sponsored by The Walt Disney
            Company. "Walt Disney World" is a registered trademark of its owner; used here for
            descriptive purposes only.
          </p>
          <p className="ww-mono" style={{ fontSize: 11, color: 'var(--ww-muted-fg)' }}>
            © {new Date().getFullYear()} WonderWaltz
          </p>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .ww-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .ww-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <div className="ww-eyebrow" style={{ marginBottom: 14 }}>
        {title}
      </div>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          style={{
            display: 'block',
            padding: '6px 0',
            fontSize: 14,
            color: 'var(--ww-navy)',
            textDecoration: 'none',
          }}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
