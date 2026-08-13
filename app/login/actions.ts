"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function requiredField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function loginRedirect(kind: "error" | "message", value: string) {
  redirect(`/login?${kind}=${encodeURIComponent(value)}`);
}

function emailErrorMessage(message: string) {
  return message.toLowerCase().includes("rate limit")
    ? "Email limit reached. Please wait for the quota to reset (usually within an hour), then try once more."
    : message;
}

export async function login(formData: FormData) {
  const email = requiredField(formData, "email");
  const password = requiredField(formData, "password");
  if (!email || !password) loginRedirect("error", "Email and password are required.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) loginRedirect("error", error.message);
  redirect("/");
}

export async function signup(formData: FormData) {
  const email = requiredField(formData, "email");
  const password = requiredField(formData, "password");
  if (!email || password.length < 8) loginRedirect("error", "Use a valid email and a password of at least 8 characters.");

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) loginRedirect("error", emailErrorMessage(error.message));
  if (data.user && data.user.identities?.length === 0) {
    loginRedirect("message", "This email already has an account. Use a magic link or set a password below.");
  }
  if (data.session) redirect("/");
  loginRedirect("message", "Check your email to confirm your account.");
}

export async function sendMagicLink(formData: FormData) {
  const email = requiredField(formData, "email");
  if (!email) loginRedirect("error", "Enter your email address.");

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });
  if (error) loginRedirect("error", emailErrorMessage(error.message));
  loginRedirect("message", "Magic link sent. Open it to access your account and optionally set a password.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = requiredField(formData, "email");
  if (!email) loginRedirect("error", "Enter your email address.");

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) loginRedirect("error", emailErrorMessage(error.message));
  loginRedirect("message", "Password setup email sent. Open it to choose a password for this account.");
}
