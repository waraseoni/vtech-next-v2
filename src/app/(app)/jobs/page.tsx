import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiveSearchInput } from "@/components/ui/live-search-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { listBrands, listServiceTypes } from "@/lib/data/service-center";
import { getJobsPage, getMechanicOptions } from "@/lib/data/jobs";
import { formatIST } from "@/lib/date";
import {
  JOB_STATUS_LABELS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Jobsheet" };

const PAGE_SIZE = 25;

type JobsSearch = {
  q?: string;
  status?: number;
  mechanic?: number;
  brand?: number;
  type?: number;
  untagged?: boolean;
  from?: string;
  to?: string;
  page?: number;
};

function jobsHref(params: JobsSearch): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (typeof params.status === "number") {
    search.set("status", String(params.status));
  }
  if (params.mechanic) search.set("mechanic", String(params.mechanic));
  if (params.brand) search.set("brand", String(params.brand));
  if (params.type) search.set("type", String(params.type));
  if (params.untagged) search.set("untagged", "1");
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  return formatIST(value, { day: "2-digit", month: "short" });
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusRaw =
    typeof params.status === "string" ? Number(params.status) : NaN;
  const status = isJobStatus(statusRaw) ? statusRaw : undefined;
  const mechanicRaw =
    typeof params.mechanic === "string" ? Number(params.mechanic) : NaN;
  const mechanic =
    Number.isSafeInteger(mechanicRaw) && mechanicRaw > 0
      ? mechanicRaw
      : undefined;
  const brandRaw =
    typeof params.brand === "string" ? Number(params.brand) : NaN;
  const brand =
    Number.isSafeInteger(brandRaw) && brandRaw > 0 ? brandRaw : undefined;
  const typeRaw = typeof params.type === "string" ? Number(params.type) : NaN;
  const serviceType =
    Number.isSafeInteger(typeRaw) && typeRaw > 0 ? typeRaw : undefined;
  const untagged = params.untagged === "1";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const [data, mechanics, brands, serviceTypes] = await Promise.all([
    getJobsPage({
      search: q,
      status,
      mechanicId: mechanic,
      brandId: brand,
      serviceTypeId: serviceType,
      untaggedOnly: untagged,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getMechanicOptions(),
    listBrands(),
    listServiceTypes(),
  ]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const end = start + data.rows.length - 1;
  const filtered = Boolean(
    q ||
    status !== undefined ||
    mechanic ||
    brand ||
    serviceType ||
    untagged ||
    from ||
    to,
  );
  const coveragePct = data.coverage.total
    ? Math.round((data.coverage.tagged / data.coverage.total) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Repairs</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Jobsheet
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Intl.NumberFormat("en-IN").format(data.total)} jobs
            {filtered ? " filter ke saath" : ""}.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Brand-tagged:{" "}
            {new Intl.NumberFormat("en-IN").format(data.coverage.tagged)} /{" "}
            {new Intl.NumberFormat("en-IN").format(data.coverage.total)} jobs (
            {coveragePct}%) · Untagged (legacy):{" "}
            <Link
              href={jobsHref({
                q,
                status,
                mechanic,
                type: serviceType,
                from,
                to,
                untagged: true,
              })}
              className="underline"
            >
              {new Intl.NumberFormat("en-IN").format(data.coverage.untagged)}
            </Link>
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="size-4" aria-hidden />
            New job
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          asChild
          size="sm"
          variant={status === undefined ? "default" : "outline"}
        >
          <Link
            href={jobsHref({
              q,
              mechanic,
              brand,
              type: serviceType,
              untagged,
              from,
              to,
            })}
          >
            All
          </Link>
        </Button>
        {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => {
          const code = Number(value) as JobStatus;
          return (
            <Button
              key={value}
              asChild
              size="sm"
              variant={status === code ? "default" : "outline"}
              className="shrink-0"
            >
              <Link
                href={jobsHref({
                  q,
                  mechanic,
                  brand,
                  type: serviceType,
                  untagged,
                  from,
                  to,
                  status: code,
                })}
              >
                {label}
              </Link>
            </Button>
          );
        })}
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-4 py-3">
          <form
            action="/jobs"
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_130px_130px_auto] lg:items-end"
          >
            {status !== undefined ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
            <div className="grid gap-1.5">
              <label htmlFor="jobs-q" className="text-muted-foreground text-xs">
                Search
              </label>
              <LiveSearchInput
                id="jobs-q"
                defaultValue={q}
                placeholder="Job id, code, item, serial ya fault"
                ariaLabel="Search jobs"
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-mechanic"
                className="text-muted-foreground text-xs"
              >
                Mechanic
              </label>
              <SearchableSelect
                id="jobs-mechanic"
                name="mechanic"
                defaultValue={mechanic ? String(mechanic) : ""}
                placeholder="All"
                options={[
                  { value: "", label: "All" },
                  ...mechanics.map((item) => ({
                    value: String(item.id),
                    label: `${item.firstname} ${item.lastname}`.trim(),
                  })),
                ]}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-brand"
                className="text-muted-foreground text-xs"
              >
                Brand
              </label>
              <Select
                id="jobs-brand"
                name="brand"
                defaultValue={brand ? String(brand) : ""}
                disabled={untagged}
              >
                <option value="">All (incl. untagged)</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-type"
                className="text-muted-foreground text-xs"
              >
                Service type
              </label>
              <Select
                id="jobs-type"
                name="type"
                defaultValue={serviceType ? String(serviceType) : ""}
              >
                <option value="">All</option>
                {serviceTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="text-muted-foreground flex items-center gap-2 pb-2 text-xs">
              <input
                type="checkbox"
                name="untagged"
                value="1"
                defaultChecked={untagged}
                className="accent-primary size-4"
              />
              Untagged (legacy)
            </label>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-from"
                className="text-muted-foreground text-xs"
              >
                From
              </label>
              <Input
                id="jobs-from"
                type="date"
                name="from"
                defaultValue={from}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-to"
                className="text-muted-foreground text-xs"
              >
                To
              </label>
              <Input id="jobs-to" type="date" name="to" defaultValue={to} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Filter
              </Button>
              {filtered ? (
                <Button asChild variant="ghost">
                  <Link href="/jobs">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        {data.rows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-16 text-center">
            <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
              <ClipboardList className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">Koi job nahi mila</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Filter badlein ya nayi job banayein.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/jobs/new">New job</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {data.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/jobs/${row.id}`}
                    className="hover:bg-muted/50 block px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap gap-1">
                          {row.brandName ? (
                            <Badge variant="outline">{row.brandName}</Badge>
                          ) : null}
                          {row.serviceTypeName ? (
                            <Badge variant="secondary">
                              {row.serviceTypeName}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-sm font-medium">
                          {row.item}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {row.clientName} · {row.code}
                        </p>
                      </div>
                      <JobStatusBadge status={row.status} />
                    </div>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                      <span>
                        {row.mechanicName} · {shortDate(row.dateCreated)}
                      </span>
                      <span className="text-foreground font-semibold tabular-nums">
                        {formatINR(row.amount, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                    <th className="px-5 py-3 font-medium">Job</th>
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Item / fault</th>
                    <th className="hidden px-3 py-3 font-medium lg:table-cell">
                      Mechanic
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="hidden px-3 py-3 font-medium xl:table-cell">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/40 border-b last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/jobs/${row.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.jobId ? `#${row.jobId}` : "—"}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {row.code}
                        </p>
                      </td>
                      <td className="max-w-40 px-3 py-3">
                        {row.clientId ? (
                          <Link
                            href={`/clients/${row.clientId}`}
                            className="block truncate hover:underline"
                          >
                            {row.clientName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </td>
                      <td className="max-w-64 px-3 py-3">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          {row.brandName ? (
                            <Badge variant="outline">{row.brandName}</Badge>
                          ) : (
                            <Badge variant="warning">Untagged</Badge>
                          )}
                          {row.serviceTypeName ? (
                            <Badge variant="secondary">
                              {row.serviceTypeName}
                            </Badge>
                          ) : null}
                          {row.serialNo ? (
                            <span className="text-muted-foreground text-xs">
                              S/N {row.serialNo}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate font-medium">{row.item}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {row.fault}
                        </p>
                      </td>
                      <td className="text-muted-foreground hidden px-3 py-3 lg:table-cell">
                        {row.mechanicName}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatINR(row.amount, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3">
                        <JobStatusBadge status={row.status} />
                      </td>
                      <td className="text-muted-foreground hidden px-3 py-3 text-xs xl:table-cell">
                        {shortDate(row.dateCreated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing{" "}
                <span className="text-foreground font-medium">
                  {start}–{end}
                </span>{" "}
                of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild={data.page > 1}
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                >
                  {data.page > 1 ? (
                    <Link
                      href={jobsHref({
                        q,
                        status,
                        mechanic,
                        brand,
                        type: serviceType,
                        untagged,
                        from,
                        to,
                        page: data.page - 1,
                      })}
                    >
                      Previous
                    </Link>
                  ) : (
                    "Previous"
                  )}
                </Button>
                <Badge variant="outline" className="tabular-nums">
                  {data.page} / {totalPages}
                </Badge>
                <Button
                  asChild={data.page < totalPages}
                  variant="outline"
                  size="sm"
                  disabled={data.page >= totalPages}
                >
                  {data.page < totalPages ? (
                    <Link
                      href={jobsHref({
                        q,
                        status,
                        mechanic,
                        brand,
                        type: serviceType,
                        untagged,
                        from,
                        to,
                        page: data.page + 1,
                      })}
                    >
                      Next
                    </Link>
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
