import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { canAccessPage, isAppRole } from "@/lib/access-control";
import { canonicalConclaveUrl } from "@/lib/canonical-url";

export async function updateSession(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const canonicalUrl = canonicalConclaveUrl({
    host: requestHost,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isProduction: process.env.VERCEL_ENV === "production"
  });
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 307);

  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims?.sub);
  if (isAuthenticated && request.nextUrl.pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    const redirect = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  const isPublicPath =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/access-denied" ||
    request.nextUrl.pathname === "/manifest.webmanifest" ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname === "/api/health";

  if (isAuthenticated && !isPublicPath) {
    const { data: allowed, error } = await supabase.rpc(
      "is_discord_login_allowed"
    );
    if (error || !allowed) {
      await supabase.auth.signOut();
      if (request.nextUrl.pathname.startsWith("/api/")) {
        const denied = NextResponse.json(
          { error: "This Discord account is not authorized for Conclave." },
          { status: 403 }
        );
        response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
        return denied;
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "?error=not_whitelisted";
      const denied = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
      return denied;
    }

    if (!request.nextUrl.pathname.startsWith("/api/")) {
      const { data: role, error: accessError } = await supabase.rpc(
        "provision_current_user_access"
      );
      if (accessError || !isAppRole(role) || !canAccessPage(role, request.nextUrl.pathname)) {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/access-denied";
        deniedUrl.search = "";
        const denied = NextResponse.redirect(deniedUrl);
        response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
        return denied;
      }
    }
  }
  return response;
}
