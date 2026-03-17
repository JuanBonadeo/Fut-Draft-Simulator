import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto grid max-w-5xl gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-card p-8 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.24em] text-accent">Protected route</p>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-white">
                Welcome, {session.user.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                La sesión está validada del lado del servidor con Better Auth y Prisma.
              </p>
            </div>
            <SignOutButton />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-muted">User id</p>
            <p className="mt-3 break-all font-mono text-sm text-white">{session.user.id}</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-muted">Email</p>
            <p className="mt-3 break-all text-sm text-white">{session.user.email}</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-muted">Session expires</p>
            <p className="mt-3 text-sm text-white">
              {new Date(session.session.expiresAt).toLocaleString()}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}