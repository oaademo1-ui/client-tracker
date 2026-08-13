import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const callbackError = request.nextUrl.searchParams.get("error_description");
  const safeNext = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/reset-password?source=email-link";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }

  const message = callbackError || "Unable to complete sign-in. The email link may be expired or already used.";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
}
