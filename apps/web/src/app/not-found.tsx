import Link from 'next/link';

/**
 * Root-level 404. Shared across marketing + admin. Keeps its own minimal
 * chrome so it works without the marketing layout wrapper.
 */
export default function NotFound() {
  return (
    <div
      className="ww-marketing"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div className="ww-eyebrow" style={{ marginBottom: 12 }}>
          404
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginBottom: 18 }}>
          This attraction isn&apos;t on any map.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--ww-muted-fg)',
            lineHeight: 1.55,
            marginBottom: 28,
          }}
        >
          The page you&apos;re looking for isn&apos;t here. Try the plan, the pricing, or head back
          to the landing.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="ww-btn ww-btn-accent">
            Back to landing
          </Link>
          <Link href="/how-it-works" className="ww-btn ww-btn-secondary">
            How it works
          </Link>
        </div>
      </div>
    </div>
  );
}
