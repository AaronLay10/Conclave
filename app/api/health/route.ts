import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "rok-events-command",
    supabaseConfigured: isSupabaseConfigured(),
    timestamp: new Date().toISOString()
  });
}
