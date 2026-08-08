import { notFound } from "next/navigation";
import { ArkSignupForm } from "@/components/ark-signup-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ArkRespondPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ark_signup", { p_token: token });
  if (error || !data) notFound();

  return <ArkSignupForm token={token} signup={data} />;
}
