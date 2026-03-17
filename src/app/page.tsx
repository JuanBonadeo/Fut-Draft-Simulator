import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl flex-col justify-between gap-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-accent">
              Starter kit
            </p>
            <h1 className="text-lg font-semibold text-white">Hackathon Template</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 hover:border-accent/60 hover:text-white"
          >
            Dashboard
          </Link>
        </header>

        <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Next.js + Prisma + Better Auth
            </div>

            <div className="space-y-5">
              <h2 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Arranca con auth real sobre Neon sin inflar el esquema.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-muted">
                Este template deja listo App Router, Tailwind, Prisma y Better Auth
                con email/password y Google. El modelo de datos se mantiene en lo
                esencial para poder iterar rápido.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(110,231,200,0.2)] hover:bg-accent-strong"
              >
                Create account
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-card-strong p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-muted">Auth methods</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Email/password + Google
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-muted">Database</p>
                <p className="mt-2 text-2xl font-semibold text-white">Neon PostgreSQL</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-muted">Schema size</p>
                <p className="mt-2 text-2xl font-semibold text-white">4 Prisma models</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
