"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(result.error.message || "Unable to create the account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleGoogleSignUp() {
    setError(null);

    startTransition(async () => {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      if (result?.error) {
        setError(result.error.message || "Google sign-up is not available yet.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-card p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-accent">Create account</p>
          <h1 className="text-3xl font-semibold text-white">Sign up</h1>
          <p className="text-sm leading-6 text-muted">
            Crea un usuario con Better Auth y guárdalo en Neon vía Prisma.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleEmailSignUp}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Full name</span>
            <input
              required
              name="name"
              type="text"
              placeholder="Ada Lovelace"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/55 focus:bg-white/8"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Email</span>
            <input
              required
              name="email"
              type="email"
              placeholder="you@team.com"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/55 focus:bg-white/8"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Password</span>
            <input
              required
              minLength={8}
              name="password"
              type="password"
              placeholder="At least 8 characters"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-accent/55 focus:bg-white/8"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted">
          <span className="h-px flex-1 bg-white/10" />
          Or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isPending}
          className="w-full rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-accent hover:text-accent-strong">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}