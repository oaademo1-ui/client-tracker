import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string; source?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Open%20the%20password%20setup%20link%20from%20your%20email%20first.");

  const { error, source } = await searchParams;
  const fromMagicLink = source === "magic-link";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f1f0eb] px-4 py-10 text-[#22231f]">
      <section className="w-full max-w-md rounded-2xl border border-[#deded8] bg-[#fdfdfb] p-7 shadow-[0_18px_60px_rgba(35,35,30,.09)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[#20211e] text-sm font-semibold text-white">CT</div>
          <div><h1 className="text-lg font-semibold tracking-tight">Client Tracker</h1><p className="text-xs text-[#85867f]">Secure your account</p></div>
        </div>
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">{fromMagicLink ? "You’re signed in" : "Choose a password"}</h2>
        <p className="mt-2 text-sm leading-6 text-[#72746c]">Set a password for {user.email} so you can use email and password next time. Magic-link sign-in will continue to work too.</p>

        {error && <p role="alert" className="mt-5 rounded-lg border border-[#e2b4b4] bg-[#fff4f2] px-4 py-3 text-sm text-[#8d3535]">{error}</p>}

        <form action={updatePassword} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">New password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" /></label>
          <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">Confirm password</span><input name="confirmation" type="password" autoComplete="new-password" minLength={8} required placeholder="Enter it again" /></label>
          <button className="button-primary w-full">Save password</button>
        </form>
        {fromMagicLink && <Link href="/" className="button-secondary mt-3 w-full">Continue without a password</Link>}
      </section>
    </main>
  );
}
