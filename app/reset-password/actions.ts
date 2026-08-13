"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");

  if (typeof password !== "string" || password.length < 8) {
    redirect("/reset-password?error=Password%20must%20be%20at%20least%208%20characters.");
  }
  if (password !== confirmation) {
    redirect("/reset-password?error=Passwords%20do%20not%20match.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);

  await supabase.auth.signOut();
  redirect("/login?message=Password%20saved.%20You%20can%20now%20sign%20in%20with%20email%20and%20password.");
}
