"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(result.error.message || "Unable to sign in.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleGoogleSignIn() {
    setError(null);

    startTransition(async () => {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      if (result?.error) {
        setError(result.error.message || "Google sign-in is not available yet.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-card p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-accent">Access</p>
          <h1 className="text-3xl font-semibold text-white">Sign in</h1>
          <p className="text-sm leading-6 text-muted">
            Usa email y password o entra con Google una vez configures tus credenciales.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleEmailSignIn}>
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
            {isPending ? "Signing in..." : "Sign in with email"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted">
          <span className="h-px flex-1 bg-white/10" />
          Or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending}
          className="w-full rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-muted">
          No account yet?{" "}
          <Link href="/sign-up" className="font-semibold text-accent hover:text-accent-strong">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}