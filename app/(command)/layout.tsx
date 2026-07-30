import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function CommandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login");
  }

  const userName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Event Director";

  return <AppShell userName={userName}>{children}</AppShell>;
}
