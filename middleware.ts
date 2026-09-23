import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user?.id);
  const locked = Boolean(req.auth?.passwordActionRequired);
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/login-language");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const lang = req.nextUrl.searchParams.get("lang");
    if (lang === "en" || lang === "he") {
      response.cookies.set("login_lang", lang, { path: "/", sameSite: "lax" });
      response.cookies.set("login_lang_pinned", "1", { path: "/", sameSite: "lax" });
    }
    return response;
  };

  if (pathname.startsWith("/api/cron")) return next();

  if (!signedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  const allowedWhenLocked =
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/session-sync") ||
    pathname.startsWith("/api/auth");
  if (signedIn && locked && !allowedWhenLocked) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl.origin));
  }

  if (signedIn && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL(locked ? "/change-password" : "/dashboard", req.nextUrl.origin));
  }

  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
