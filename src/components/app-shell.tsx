"use client";

import {
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ReceiptIndianRupee,
  Search,
  Settings,
  Sun,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canViewSettings } from "@/lib/roles";
import { cn } from "@/lib/utils";

import { logout } from "@/app/(app)/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobsheet", icon: ClipboardList },
  { href: "/sales", label: "Sales", icon: ReceiptIndianRupee },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings, settingsOnly: true },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  brand: { name: string; logoUrl: string | null };
  user: { name: string; role: string; initials: string };
};

export function AppShell({ children, brand, user }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const active = NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const showSettings = canViewSettings(user.role);
  const navItems = NAV.filter(
    (item) => !("settingsOnly" in item) || showSettings,
  );

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="bg-background min-h-svh">
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
          "border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r transition-transform lg:translate-x-0 print:hidden",
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

        <nav
          aria-label="Main"
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2"
        >
          {navItems.map((item) => {
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
      </aside>

      <div className="flex min-w-0 flex-col lg:pl-60 print:pl-0">
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

          <h1 className="shrink-0 text-sm font-semibold">
            {active?.label ?? `${brand.name} Admin`}
          </h1>

          <form
            action="/search"
            method="get"
            role="search"
            className="ml-auto hidden w-full max-w-xs min-w-0 sm:block"
          >
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                name="q"
                maxLength={60}
                placeholder="Search clients, jobs, sales…"
                aria-label="Universal search"
                className="pl-9"
              />
            </div>
          </form>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="ml-auto sm:hidden"
          >
            <Link href="/search" aria-label="Universal search">
              <Search className="size-4" aria-hidden />
            </Link>
          </Button>

          <div className="flex items-center gap-1">
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

            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-controls="user-menu"
                onClick={() => setMenuOpen((current) => !current)}
                className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 flex items-center gap-2 rounded-md p-1.5 outline-none focus-visible:ring-[3px]"
              >
                <span className="sr-only">Account menu</span>
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
                  {user.initials}
                </span>
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block truncate text-sm font-medium">
                    {user.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs capitalize">
                    {user.role}
                  </span>
                </span>
                <ChevronDown
                  className="text-muted-foreground hidden size-4 md:block"
                  aria-hidden
                />
              </button>

              {menuOpen ? (
                <div
                  id="user-menu"
                  className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-2 w-56 rounded-md border p-1 shadow-md"
                >
                  <div className="border-b px-2.5 py-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="text-muted-foreground truncate text-xs capitalize">
                      {user.role}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm"
                  >
                    <UserRound className="size-4" aria-hidden />
                    My profile
                  </Link>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Logout
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
