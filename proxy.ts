import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  // 1. Guard /admin routes (Head Tutor only)
  if (pathname.startsWith("/admin")) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(loginUrl);
    }
    if (payload.role !== "HEAD_TUTOR") {
      return NextResponse.redirect(new URL("/tutor", request.url));
    }
  }

  // 2. Guard /tutor routes (Head Tutor or Tutor)
  if (pathname.startsWith("/tutor")) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", "/tutor");
      return NextResponse.redirect(loginUrl);
    }
    if (payload.role !== "HEAD_TUTOR" && payload.role !== "TUTOR") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
  }

  // 3. Guard /student routes
  if (pathname.startsWith("/student")) {
    // If arriving via magic link with query key, let client page complete exchange
    if (request.nextUrl.searchParams.has("key")) {
      return NextResponse.next();
    }
    if (!payload) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export { proxy as middleware };

export const config = {
  matcher: ["/admin/:path*", "/tutor/:path*", "/student/:path*"],
};
