"use client";

import {
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ReceiptIndianRupee,
  Settings,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { logout } from "@/app/(app)/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobsheet", icon: ClipboardList },
  { href: "/sales", label: "Sales", icon: ReceiptIndianRupee },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  brand: { name: string; logoUrl: string | null };
  user: { name: string; role: string; initials: string };
};

export function AppShell({ children, brand, user }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const active = NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div className="bg-background min-h-svh lg:grid lg:grid-cols-[240px_1fr]">
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden print:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r transition-transform lg:static lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg">
              {brand.logoUrl ? (
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  width={64}
                  height={64}
                  unoptimized
                  className="size-8 object-cover"
                />
              ) : (
                <Wrench className="size-4" aria-hidden />
              )}
            </span>
            <span className="truncate">{brand.name}</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 px-2 py-2">
          {NAV.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-sidebar-border border-t p-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
              {user.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur print:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>

          <h1 className="text-sm font-semibold">
            {active?.label ?? `${brand.name} Admin`}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="hidden size-4 dark:block" />
              <Moon className="size-4 dark:hidden" />
            </Button>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
