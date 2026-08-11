import TrackerApp from "./tracker-app";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <TrackerApp userId={user.id} userEmail={user.email ?? "Signed in"} />;
}
