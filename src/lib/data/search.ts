import "server-only";

import { getClientsPage, type ClientListItem } from "@/lib/data/clients";
import { getJobsPage, type JobListItem } from "@/lib/data/jobs";
import { getSalesPage, type SaleListItem } from "@/lib/data/sales";

const PER_SECTION = 8;

export type GlobalSearchResults = {
  term: string;
  clients: { rows: ClientListItem[]; total: number };
  jobs: { rows: JobListItem[]; total: number };
  sales: { rows: SaleListItem[]; total: number };
  total: number;
};

const EMPTY: GlobalSearchResults = {
  term: "",
  clients: { rows: [], total: 0 },
  jobs: { rows: [], total: 0 },
  sales: { rows: [], total: 0 },
  total: 0,
};

export async function getGlobalSearch(
  term: string,
): Promise<GlobalSearchResults> {
  const search = term.trim().slice(0, 60);
  if (!search) return EMPTY;

  const [clients, jobs, sales] = await Promise.all([
    getClientsPage({ search, pageSize: PER_SECTION }),
    getJobsPage({ search, pageSize: PER_SECTION }),
    getSalesPage({ search, pageSize: PER_SECTION }),
  ]);

  return {
    term: search,
    clients: {
      rows: clients.rows.slice(0, PER_SECTION),
      total: clients.total,
    },
    jobs: { rows: jobs.rows.slice(0, PER_SECTION), total: jobs.total },
    sales: { rows: sales.rows.slice(0, PER_SECTION), total: sales.total },
    total: clients.total + jobs.total + sales.total,
  };
}
