import { NextResponse, type NextRequest } from 'next/server';

// Local-only admin dashboard. Blocks /admin/* from anywhere except loopback.
// Prevents accidental exposure if this app is ever deployed.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function middleware(req: NextRequest): NextResponse {
  const url = new URL(req.url);
  const host = url.hostname;
  if (!LOOPBACK_HOSTS.has(host)) {
    return new NextResponse('Admin is local-only.', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
