import type { SupabaseClient } from "@supabase/supabase-js";

// Pricing categories a margin can be applied to. This is every surveyor pricing
// category except LABOUR, plus the synthetic BOILER category (the boiler trade
// price is marked up like any other material). Keep in sync with the categories
// seeded in app/api/surveyor/pricing/route.ts.
export const MARGIN_CATEGORIES = [
  "BOILER",
  "FLUE",
  "CYLINDER",
  "SYSTEM",
  "CONTROLS",
  "FILTER",
  "GAS",
  "COPPER",
  "FITTINGS",
  "LAGGING",
  "RAD_VALVES",
  "RADIATORS",
  "CLEAN",
  "ELECTRICAL",
  "CONDENSATE",
  "INHIBITOR",
] as const;

export type MarginCategory = (typeof MARGIN_CATEGORIES)[number];

/** category -> margin percentage (e.g. { COPPER: 20, CONTROLS: 15 }) */
export type MarginMap = Record<string, number>;

/**
 * Load a company's per-category margin percentages. Returns an empty map (i.e.
 * no markup anywhere) if the table doesn't exist yet or the query fails, so the
 * quote calculator keeps working before the migration is applied.
 */
export async function loadCategoryMargins(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MarginMap> {
  const { data, error } = await supabase
    .from("surveyor_category_margins")
    .select("category, margin_percent")
    .eq("company_id", companyId);

  if (error) {
    console.error("loadCategoryMargins failed:", error.message);
    return {};
  }

  const map: MarginMap = {};
  for (const row of data ?? []) {
    map[row.category] = Number(row.margin_percent) || 0;
  }
  return map;
}
