import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "./lib/constants";

const PUBLIC_PATHS = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow public pages through without a token
  if (PUBLIC_PATHS.includes(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    });
    // If already logged in, skip login/register and go straight to app
    if (token) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      return NextResponse.redirect(new URL(`${base}/annotate`, request.url));
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return NextResponse.redirect(new URL(`${base}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/annotate", "/api/:path*", "/login", "/register"],
};
