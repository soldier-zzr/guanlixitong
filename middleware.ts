import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const publicPaths = new Set(["/login", "/api/session/login", "/api/health", "/favicon.ico"]);
const staticAssetPattern = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/branding") ||
    staticAssetPattern.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  if (!sessionUserId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "请先登录" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
