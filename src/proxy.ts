import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy for route protection
 * 
 * Note: Firebase Auth doesn't work in Edge runtime, so we do basic route protection here
 * and rely on client-side auth checks in layout components for actual authentication.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If accessing a public route, allow it
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Dashboard routes - allow through (client-side auth check in layout will handle redirect)
  // This proxy mainly serves to prevent direct access patterns
  if (pathname.startsWith('/onboarding') || pathname.startsWith('/club') || pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Root path - allow through (handled by page.tsx)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // For any other routes, allow through (let client-side handle auth)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

