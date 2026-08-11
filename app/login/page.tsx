import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { login, sendMagicLink, signup } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error, message } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f1f0eb] px-4 py-10 text-[#22231f]">
      <section className="w-full max-w-md rounded-2xl border border-[#deded8] bg-[#fdfdfb] p-7 shadow-[0_18px_60px_rgba(35,35,30,.09)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[#20211e] text-sm font-semibold text-white">CT</div>
          <div><h1 className="text-lg font-semibold tracking-tight">Client Tracker</h1><p className="text-xs text-[#85867f]">Your team workspace</p></div>
        </div>
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">Welcome back</h2>
        <p className="mt-2 text-sm leading-6 text-[#72746c]">Sign in to manage your private task board.</p>

        {error && <p role="alert" className="mt-5 rounded-lg border border-[#e2b4b4] bg-[#fff4f2] px-4 py-3 text-sm text-[#8d3535]">{error}</p>}
        {message && <p className="mt-5 rounded-lg border border-[#b9d4c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#356348]">{message}</p>}

        <form className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">Email</span><input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">Password</span><input name="password" type="password" autoComplete="current-password" minLength={8} required placeholder="At least 8 characters" /></label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button formAction={login} className="button-primary">Sign in</button>
            <button formAction={signup} className="button-secondary">Create account</button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[.12em] text-[#9a9b94]"><span className="h-px flex-1 bg-[#e1e1db]" />or<span className="h-px flex-1 bg-[#e1e1db]" /></div>

        <form action={sendMagicLink} className="space-y-3">
          <label className="block text-xs font-semibold text-[#5b5d55]"><span className="mb-1.5 block">Email for magic link</span><input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <button className="button-secondary w-full">Email me a magic link</button>
        </form>
      </section>
    </main>
  );
}
