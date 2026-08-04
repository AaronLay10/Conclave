import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership, getCurrentUser } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function CommandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, membership] = await Promise.all([getCurrentUser(), getCurrentMembership()]);

  if (isSupabaseConfigured() && !user) {
    redirect("/login");
  }

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataName = metadata?.full_name ?? metadata?.name;
  const userName =
    typeof metadataName === "string" && metadataName.trim().length > 0
      ? metadataName
      : user?.email?.split("@")[0] ?? "Event Director";

  return (
    <AppShell
      userName={userName}
      role={membership?.role ?? "viewer"}
      allianceName={membership?.alliance_name ?? null}
      allianceTag={membership?.alliance_tag ?? null}
    >
      {children}
    </AppShell>
  );
}
