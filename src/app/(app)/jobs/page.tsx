import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import {
  JobPreviewPanel,
  type JobPreviewData,
} from "@/components/jobs/job-preview-panel";
import { JobsWorkspace } from "@/components/jobs/jobs-workspace";
import { QuickCreateJob } from "@/components/jobs/quick-create-job";
import { ClearDeliveredSpotsButton } from "@/components/jobs/clear-delivered-spots-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiveSearchInput } from "@/components/ui/live-search-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select } from "@/components/ui/select";
import { getSession, isStaffRole } from "@/lib/auth";
import {
  getClientContact,
  getJobSpots,
  getJobStats,
  getStaleJobs,
} from "@/lib/data/job-operations";
import { listBrands, listServiceTypes } from "@/lib/data/service-center";
import {
  getJobDetail,
  getJobFormOptions,
  getJobsPage,
  getMechanicOptions,
} from "@/lib/data/jobs";
import {
  JOB_STATUS_LABELS,
  isJobStatus,
  type JobStatus,
} from "@/lib/constants/status";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Jobsheet" };

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type JobsSearch = {
  q?: string;
  status?: number;
  mechanic?: number;
  brand?: number;
  type?: number;
  untagged?: boolean;
  hideDelivered?: boolean;
  spot?: number;
  size?: number;
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
  if (params.hideDelivered) search.set("hide_delivered", "1");
  if (params.spot) search.set("spot", String(params.spot));
  if (params.size && params.size !== DEFAULT_PAGE_SIZE) {
    search.set("size", String(params.size));
  }
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

function parsePositive(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusRaw =
    typeof params.status === "string" ? Number(params.status) : NaN;
  const status = isJobStatus(statusRaw) ? statusRaw : undefined;
  const mechanic = parsePositive(params.mechanic);
  const brand = parsePositive(params.brand);
  const serviceType = parsePositive(params.type);
  const spot = parsePositive(params.spot);
  const sizeRaw = typeof params.size === "string" ? Number(params.size) : NaN;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : DEFAULT_PAGE_SIZE;
  const untagged = params.untagged === "1";
  const hideDelivered = params.hide_delivered === "1";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const previewRaw = typeof params.preview === "string" ? params.preview : "";
  const previewId = /^\d+$/.test(previewRaw) ? Number(previewRaw) : null;
  const previewParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "preview" && typeof value === "string") {
      previewParams.set(key, value);
    }
  }
  const previewQuery = previewParams.toString();

  const [
    data,
    mechanics,
    brands,
    serviceTypes,
    stats,
    stale,
    spots,
    session,
    formOptions,
  ] = await Promise.all([
    getJobsPage({
      search: q,
      status,
      mechanicId: mechanic,
      brandId: brand,
      serviceTypeId: serviceType,
      untaggedOnly: untagged,
      hideDelivered,
      spotId: spot,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    getMechanicOptions(),
    listBrands(),
    listServiceTypes(),
    getJobStats({
      search: q,
      from: from || undefined,
      to: to || undefined,
      hideDelivered,
      status: status ?? null,
      spotId: spot ?? null,
    }),
    getStaleJobs(),
    getJobSpots(),
    getSession(),
    getJobFormOptions(),
  ]);

  let preview: JobPreviewData | null = null;
  if (previewId) {
    const detail = await getJobDetail(previewId);
    if (detail) {
      const phone = detail.job.clientId
        ? await getClientContact(detail.job.clientId)
        : "";
      preview = {
        id: detail.job.id,
        jobId: detail.job.job_id,
        code: detail.job.code,
        item: detail.job.item,
        fault: detail.job.fault,
        amount: detail.job.amount,
        status: detail.job.status,
        clientName: detail.job.clientName,
        clientContact: phone,
        mechanicName: detail.job.mechanicName,
        brandName: detail.job.brandName,
        serviceTypeName: detail.job.serviceTypeName,
        spot: detail.location
          ? [detail.location.label, detail.location.zone, detail.location.rack]
              .filter(Boolean)
              .join(" / ")
          : detail.job.uniq_id || null,
        dateCreated: detail.job.date_created,
      };
    }
  }

  const canWrite = session ? isStaffRole(session.profile.role) : false;
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
    hideDelivered ||
    spot ||
    from ||
    to,
  );
  const coveragePct = data.coverage.total
    ? Math.round((data.coverage.tagged / data.coverage.total) * 100)
    : 0;
  const baseFilters = {
    q,
    status,
    mechanic,
    brand,
    type: serviceType,
    untagged,
    hideDelivered,
    spot,
    size: pageSize,
    from,
    to,
  };

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
                ...baseFilters,
                brand: undefined,
                untagged: true,
              })}
              className="underline"
            >
              {new Intl.NumberFormat("en-IN").format(data.coverage.untagged)}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickCreateJob
            clients={formOptions.clients.map((client) => ({
              id: client.id,
              name: `${client.firstname} ${client.middlename ?? ""} ${client.lastname}`
                .replace(/\s+/g, " ")
                .trim(),
              contact: client.contact,
            }))}
            mechanics={mechanics.map((mechanic) => ({
              id: mechanic.id,
              name: `${mechanic.firstname} ${mechanic.lastname}`.trim(),
            }))}
          />
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="size-4" aria-hidden />
              New job
            </Link>
          </Button>
        </div>
      </div>

      {canWrite ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "In progress", value: stats.progress },
            { label: "Completed", value: stats.completed },
          ].map((card) => (
            <Card key={card.label} className="gap-0 py-3">
              <CardContent className="px-4">
                <p className="text-muted-foreground text-xs">{card.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {new Intl.NumberFormat("en-IN").format(card.value)}
                </p>
              </CardContent>
            </Card>
          ))}
          <Card className="gap-0 py-3 sm:col-span-2 lg:col-span-4">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 px-4">
              <div>
                <p className="text-muted-foreground text-xs">Total amount</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatINR(stats.totalAmt)}
                </p>
              </div>
              {stale.length ? (
                <Badge variant="warning">
                  7+ din purane {stale.length} jobs
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {stale.length && canWrite ? (
        <Card className="border-warning/40 bg-warning/5 gap-2 py-3">
          <CardContent className="space-y-2 px-4">
            <p className="text-sm font-medium">
              Spot par 7+ din se pade Done/Paid jobs
            </p>
            <div className="flex flex-wrap gap-2">
              {stale.slice(0, 12).map((job) => (
                <Button key={job.id} asChild size="sm" variant="outline">
                  <Link href={`/jobs/${job.id}`}>
                    #{job.jobId ?? job.id} · {job.spot || "spot"}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/bulk">Bulk entry</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/bulk-edit">Bulk edit</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/old">Old job</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/spot-labels">Spot labels</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs/combined-invoice">Combined invoice</Link>
        </Button>
        {canWrite ? <ClearDeliveredSpotsButton /> : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          asChild
          size="sm"
          variant={status === undefined ? "default" : "outline"}
        >
          <Link
            href={jobsHref({
              ...baseFilters,
              status: undefined,
              page: undefined,
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
                  ...baseFilters,
                  status: code,
                  page: undefined,
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
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_130px_130px_130px_130px_120px_120px_auto] lg:items-end"
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
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-spot"
                className="text-muted-foreground text-xs"
              >
                Spot
              </label>
              <Select
                id="jobs-spot"
                name="spot"
                defaultValue={spot ? String(spot) : ""}
              >
                <option value="">All spots</option>
                {spots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({item.occupied})
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
              Untagged
            </label>
            <label className="text-muted-foreground flex items-center gap-2 pb-2 text-xs">
              <input
                type="checkbox"
                name="hide_delivered"
                value="1"
                defaultChecked={hideDelivered}
                className="accent-primary size-4"
              />
              Hide delivered
            </label>
            <div className="grid gap-1.5">
              <label
                htmlFor="jobs-size"
                className="text-muted-foreground text-xs"
              >
                Per page
              </label>
              <Select
                id="jobs-size"
                name="size"
                defaultValue={String(pageSize)}
              >
                {PAGE_SIZES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
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
            <JobsWorkspace
              rows={data.rows}
              spots={spots}
              canWrite={canWrite}
              previewQuery={previewQuery}
            />
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
                      href={jobsHref({ ...baseFilters, page: data.page - 1 })}
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
                      href={jobsHref({ ...baseFilters, page: data.page + 1 })}
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

      {preview ? <JobPreviewPanel job={preview} /> : null}
    </div>
  );
}
