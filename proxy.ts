import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com; media-src 'self' blob: data: https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CSRF Protection for state-changing API requests
  if (pathname.startsWith("/api") && MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (
          host &&
          originUrl.host !== host &&
          !originUrl.host.includes("localhost") &&
          !originUrl.host.includes("127.0.0.1")
        ) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Forbidden: Cross-site request rejected (Origin mismatch)." },
              { status: 403 }
            )
          );
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Forbidden: Invalid Origin header." },
            { status: 403 }
          )
        );
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (
          host &&
          refererUrl.host !== host &&
          !refererUrl.host.includes("localhost") &&
          !refererUrl.host.includes("127.0.0.1")
        ) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Forbidden: Cross-site request rejected (Referer mismatch)." },
              { status: 403 }
            )
          );
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Forbidden: Invalid Referer header." },
            { status: 403 }
          )
        );
      }
    }
  }

  const token = request.cookies.get("th_auth_token")?.value;

  // Safely extract token payload and expiration
  const getPayload = (tokenStr?: string) => {
    if (!tokenStr) return null;
    const parts = tokenStr.split(".");
    if (parts.length !== 2) return null;
    try {
      const base64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      const parsed = JSON.parse(json);
      if (!parsed.sub || !parsed.role) return null;
      if (parsed.exp && typeof parsed.exp === "number" && Date.now() > parsed.exp) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const payload = getPayload(token);

  // 2. Guard /admin routes (Head Tutor only)
  if (pathname.startsWith("/admin")) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/admin");
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    if (payload.role !== "HEAD_TUTOR") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/tutor", request.url)));
    }
  }

  // 3. Guard /tutor routes (Head Tutor or Tutor)
  if (pathname.startsWith("/tutor")) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/tutor");
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    if (payload.role !== "HEAD_TUTOR" && payload.role !== "TUTOR") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/student", request.url)));
    }
  }

  // 4. Guard /student routes
  if (pathname.startsWith("/student")) {
    // If arriving via magic link with query key, let client page complete exchange
    if (request.nextUrl.searchParams.has("key")) {
      return applySecurityHeaders(NextResponse.next());
    }
    if (!payload) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export { proxy as middleware };

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg)$).*)",
  ],
};

