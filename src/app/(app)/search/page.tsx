import {
  ArrowRight,
  ClipboardList,
  ReceiptIndianRupee,
  Search as SearchIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveSearchInput } from "@/components/ui/live-search-input";
import { getGlobalSearch } from "@/lib/data/search";
import { formatIST } from "@/lib/date";
import { clientInitials } from "@/lib/domain/client";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Search" };

function moreHref(base: string, term: string) {
  return `${base}?q=${encodeURIComponent(term)}`;
}

function ResultSection({
  icon: Icon,
  title,
  total,
  href,
  children,
}: {
  icon: LucideIcon;
  title: string;
  total: number;
  href: string;
  children: React.ReactNode;
}) {
  if (!total) return null;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          {title}
          <Badge variant="outline" className="tabular-nums">
            {total}
          </Badge>
        </CardTitle>
        {total > 8 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              Sab dekhein
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <ul className="divide-y">{children}</ul>
    </Card>
  );
}

function EmptyState({ term }: { term: string }) {
  return (
    <Card className="gap-3 py-16">
      <CardContent className="grid place-items-center gap-3 px-4 text-center">
        <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
          <SearchIcon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium">
            {term ? "Kuch nahi mila" : "Search shuru karein"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {term
              ? `"${term}" ke liye koi client, job ya sale nahi mili.`
              : "Client ka naam, phone, job code, item ya sale code likhein."}
          </p>
        </div>
        {term ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={moreHref("/clients", term)}>Clients mein</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={moreHref("/jobs", term)}>Jobs mein</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={moreHref("/sales", term)}>Sales mein</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const results = await getGlobalSearch(q);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="text-muted-foreground text-sm">Universal</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Search</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Clients, jobs aur sales — ek hi jagah.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-3">
          <form
            action="/search"
            method="get"
            role="search"
            className="flex items-center gap-2"
          >
            <LiveSearchInput
              defaultValue={q}
              autoFocus={!q}
              placeholder="Client, phone, job code, item ya sale code…"
              ariaLabel="Search everything"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {q ? (
        results.total ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">
                {results.total}
              </span>{" "}
              result{results.total === 1 ? "" : "s"} &ldquo;{q}&rdquo; ke liye.
            </p>

            <ResultSection
              icon={Users}
              title="Clients"
              total={results.clients.total}
              href={moreHref("/clients", q)}
            >
              {results.clients.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/clients/${row.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3"
                  >
                    <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {clientInitials(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {row.contact}
                        {row.address ? ` · ${row.address}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-muted-foreground text-xs">Due</p>
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          row.due > 0 && "text-destructive",
                          row.due < 0 && "text-success",
                        )}
                      >
                        {formatINR(row.due, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ResultSection>

            <ResultSection
              icon={ClipboardList}
              title="Jobs"
              total={results.jobs.total}
              href={moreHref("/jobs", q)}
            >
              {results.jobs.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/jobs/${row.id}`}
                    className="hover:bg-muted/50 block px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.item}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {row.clientName} · {row.code}
                        </p>
                      </div>
                      <JobStatusBadge status={row.status} />
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
                      <span>
                        {row.mechanicName} ·{" "}
                        {formatIST(row.dateCreated, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="text-foreground font-semibold tabular-nums">
                        {formatINR(row.amount, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ResultSection>

            <ResultSection
              icon={ReceiptIndianRupee}
              title="Sales"
              total={results.sales.total}
              href={moreHref("/sales", q)}
            >
              {results.sales.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/sales/${row.id}`}
                    className="hover:bg-muted/50 flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.saleCode}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {row.clientName} ·{" "}
                        {formatIST(row.dateCreated, {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatINR(row.totalAmount, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {row.paymentMode}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ResultSection>
          </div>
        ) : (
          <EmptyState term={q} />
        )
      ) : (
        <EmptyState term="" />
      )}
    </div>
  );
}
