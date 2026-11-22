import "server-only";

import { assertOk, unwrap } from "@/lib/data/errors";
import { createClient } from "@/lib/supabase/server";

export const SERVICE_CENTER_MODES = [
  "autonomous",
  "single_brand",
  "multi_brand",
] as const;

export type ServiceCenterMode = (typeof SERVICE_CENTER_MODES)[number];

export const DEFAULT_SERVICE_TYPE_NAME = "Repair / Service";

export function normalizeServiceCenterMode(
  value: string | undefined,
): ServiceCenterMode {
  return SERVICE_CENTER_MODES.includes(value as ServiceCenterMode)
    ? (value as ServiceCenterMode)
    : "autonomous";
}

export type BrandRow = {
  id: number;
  name: string;
  code: string | null;
  is_authorized: boolean;
  authorized_no: string | null;
  support_phone: string | null;
  support_email: string | null;
  is_active: boolean;
};

export type ServiceTypeRow = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type ServiceCenterConfig = {
  mode: ServiceCenterMode;
  brands: BrandRow[];
  serviceTypes: ServiceTypeRow[];
  defaultServiceTypeId: number | null;
  defaultBrandId: number | null;
};

const BRAND_COLUMNS =
  "id, name, code, is_authorized, authorized_no, support_phone, support_email, is_active";
const SERVICE_TYPE_COLUMNS = "id, name, sort_order, is_active";

export async function getServiceCenterConfig(): Promise<ServiceCenterConfig> {
  const supabase = await createClient();
  const [modeRes, brandsRes, typesRes] = await Promise.all([
    supabase
      .from("system_info")
      .select("meta_value")
      .eq("meta_field", "service_center_mode")
      .maybeSingle(),
    supabase.from("brands").select(BRAND_COLUMNS).order("name"),
    supabase
      .from("service_types")
      .select(SERVICE_TYPE_COLUMNS)
      .order("sort_order")
      .order("name"),
  ]);

  const brands = unwrap(brandsRes, "serviceCenter.brands");
  const serviceTypes = unwrap(typesRes, "serviceCenter.types");
  assertOk(modeRes, "serviceCenter.mode");

  const mode = normalizeServiceCenterMode(modeRes.data?.meta_value);
  const authorized = brands.filter(
    (brand) => brand.is_authorized && brand.is_active,
  );
  const defaultServiceType =
    serviceTypes.find((type) => type.name === DEFAULT_SERVICE_TYPE_NAME) ??
    serviceTypes.find((type) => type.is_active) ??
    serviceTypes[0];

  return {
    mode,
    brands,
    serviceTypes,
    defaultServiceTypeId: defaultServiceType?.id ?? null,
    defaultBrandId:
      mode === "single_brand" ? (authorized[0]?.id ?? null) : null,
  };
}

export async function listBrands(): Promise<BrandRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase.from("brands").select(BRAND_COLUMNS).order("name"),
    "serviceCenter.brands",
  );
}

export async function listServiceTypes(): Promise<ServiceTypeRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("service_types")
      .select(SERVICE_TYPE_COLUMNS)
      .order("sort_order")
      .order("name"),
    "serviceCenter.types",
  );
}

export type BrandInput = {
  name: string;
  code: string | null;
  isAuthorized: boolean;
  authorizedNo: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
};

export async function createBrand(input: BrandInput) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("brands")
      .insert({
        name: input.name,
        code: input.code,
        is_authorized: input.isAuthorized,
        authorized_no: input.authorizedNo,
        support_phone: input.supportPhone,
        support_email: input.supportEmail,
        is_active: true,
      })
      .select("id")
      .single(),
    "serviceCenter.createBrand",
  );
}

export async function updateBrand(id: number, input: BrandInput) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("brands")
      .update({
        name: input.name,
        code: input.code,
        is_authorized: input.isAuthorized,
        authorized_no: input.authorizedNo,
        support_phone: input.supportPhone,
        support_email: input.supportEmail,
        date_updated: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single(),
    "serviceCenter.updateBrand",
  );
}

/** Deactivate only — hard delete would orphan historical jobs (plan §7/R16). */
export async function setBrandActive(id: number, isActive: boolean) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("brands")
      .update({ is_active: isActive, date_updated: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single(),
    "serviceCenter.setBrandActive",
  );
}

export async function createServiceType(name: string, sortOrder: number) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("service_types")
      .insert({ name, sort_order: sortOrder, is_active: true })
      .select("id")
      .single(),
    "serviceCenter.createType",
  );
}

/** Deactivate only — never delete a type used by historical jobs. */
export async function setServiceTypeActive(id: number, isActive: boolean) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("service_types")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("id")
      .single(),
    "serviceCenter.setTypeActive",
  );
}
