import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="bg-primary text-primary-foreground hidden flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="bg-primary-foreground/15 grid size-10 place-items-center rounded-xl">
            <Wrench className="size-5" aria-hidden />
          </span>
          V-Tech
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Service desk, done right.
          </h1>
          <p className="text-primary-foreground/80">
            Jobsheets, sales, clients, attendance aur business settings — sab ek
            hi fast admin panel me.
          </p>
        </div>
        <p className="text-primary-foreground/60 text-sm">
          Built for the V-Tech service team.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
              <Wrench className="size-4" aria-hidden />
            </span>
            <span className="text-lg font-semibold">V-Tech</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            Admin sign in
          </h2>
          <p className="text-muted-foreground mt-1 mb-8 text-sm">
            Staff account se login karein.
          </p>

          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
