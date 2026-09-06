import { NextResponse, type NextRequest } from "next/server";

// Note: Next 16 renamed this file convention to "proxy" but "middleware" still
// works. We keep the name for now to minimise diff; migrate in a follow-up.
//
// This proxy does NOT call auth() — that would pull Prisma + bcrypt into the
// edge runtime bundle, which the edge runtime does not support. Instead we
// do a cheap cookie-presence check here and let each dashboard page/action
// call getSessionUser() (Node runtime) for the real check.

const PUBLIC: RegExp[] = [
  /^\/login/,
  /^\/accept-invite/,
  /^\/reset-password/,
  /^\/p\//, // Public proposal viewer — token-gated inside the page
  /^\/api\/auth/,
  /^\/api\/health/,
  /^\/api\/notifications/, // auth check happens inside the route
  /^\/_next/,
  /^\/favicon\.ico/,
  /^\/apple-icon/,
  /^\/icon/,
];

const SESSION_COOKIE_CANDIDATES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  // Legacy fallback while LEGACY_AUTH=on and the old cookie may still be present
  "eventbot_session",
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const hasSession = SESSION_COOKIE_CANDIDATES.some((name) => Boolean(req.cookies.get(name)?.value));
  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("returnTo", `${pathname}${search || ""}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
