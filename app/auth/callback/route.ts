import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", requestUrl.origin));
    }
    const { data: allowed, error: allowlistError } = await supabase.rpc(
      "is_discord_login_allowed"
    );
    if (allowlistError || !allowed) {
      await supabase.auth.signOut();
      const reason = allowlistError ? "whitelist_check_failed" : "not_whitelisted";
      return NextResponse.redirect(new URL(`/login?error=${reason}`, requestUrl.origin));
    }
    const { data: role, error: accessError } = await supabase.rpc(
      "provision_current_user_access"
    );
    if (accessError || !role) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=access_not_configured", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
