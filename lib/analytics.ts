import type { Response } from "./validation";
import {
  brands,
  legacyBrands,
  previousBrands,
  tiers,
  type LegacyBrand,
  type Tier,
} from "./survey-config";
export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export const median = (v: number[]) => {
  const a = [...v].sort((x, y) => x - y);
  return a.length
    ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2
    : null;
};
export const percentage = (n: number, total: number) =>
  total ? (100 * n) / total : 0;
export type WeightMode = "base" | "weighted";
export const responseWeight = (r: Response, mode: WeightMode) =>
  mode === "weighted" &&
  (r.work_field === "Creative / Design" || r.work_field === "Fashion")
    ? 1.2
    : 1;
export const weightedCount = (
  rows: Response[],
  mode: WeightMode,
  predicate: (r: Response) => boolean = () => true,
) =>
  rows.reduce(
    (sum, row) => sum + (predicate(row) ? responseWeight(row, mode) : 0),
    0,
  );
export const weightedMean = (
  rows: Response[],
  mode: WeightMode,
  value: (r: Response) => number | undefined | null,
) => {
  const eligible = rows.filter((r) => typeof value(r) === "number");
  const total = weightedCount(eligible, mode);
  return total
    ? eligible.reduce(
        (sum, row) => sum + Number(value(row)) * responseWeight(row, mode),
        0,
      ) / total
    : null;
};
export const weightedShare = (
  rows: Response[],
  mode: WeightMode,
  predicate: (r: Response) => boolean,
) =>
  percentage(weightedCount(rows, mode, predicate), weightedCount(rows, mode));
export const weightedDistribution = (
  rows: Response[],
  mode: WeightMode,
  value: (r: Response) => number,
  min = 0,
  max = 10,
) =>
  Array.from({ length: max - min + 1 }, (_, i) => ({
    value: i + min,
    count: weightedCount(rows, mode, (r) => value(r) === i + min),
  }));
export const cultureProductGap = (r: Response) =>
  r.culture_score - r.product_innovation_score;
export const distribution = (values: number[], min = 0, max = 10) =>
  Array.from({ length: max - min + 1 }, (_, i) => ({
    value: i + min,
    count: values.filter((x) => x === i + min).length,
  }));
export function groupBy<T>(
  rows: T[],
  key: (row: T) => string,
): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((out, row) => {
    (out[key(row)] ??= []).push(row);
    return out;
  }, {});
}
const tierFor = (r: Response, brand: LegacyBrand) =>
  (r.brand_tiers as Record<string, Tier | undefined>)[brand];
export const tierAverage = (
  rows: Response[],
  brand: LegacyBrand,
  mode: WeightMode = "base",
) =>
  weightedMean(rows, mode, (r) => {
    const tier = tierFor(r, brand);
    return tier === undefined ? undefined : 4 - tiers.indexOf(tier);
  });
export type Filters = Record<string, string[]>;
export function filteredDataset(
  rows: Response[],
  filters: Filters,
  from = "",
  to = "",
) {
  return rows.filter(
    (r) =>
      (!from || r.completed_at.slice(0, 10) >= from) &&
      (!to || r.completed_at.slice(0, 10) <= to) &&
      Object.entries(filters).every(
        ([k, v]) => !v.length || v.includes(String(r[k as keyof Response])),
      ),
  );
}
export const crossTabulation = (
  rows: Response[],
  a: keyof Response,
  b: keyof Response,
) =>
  Object.entries(groupBy(rows, (r) => String(r[a]))).map(([label, items]) => ({
    label,
    counts: Object.fromEntries(
      Object.entries(groupBy(items, (r) => String(r[b]))).map(([key, v]) => [
        key,
        v.length,
      ]),
    ),
  }));
const stop = new Set(
  "a an and are as at be been but by for from had has have i in is it its just me more my of on or our so that the their them there these they this to too used very was were what with would nike today feel feels one not".split(
    " ",
  ),
);
export function words(
  rows: Response[],
  key: "nike_used_to_feel" | "nike_today_feels" | "ceo_change",
  mode: WeightMode = "base",
) {
  const counts: Record<string, number> = {};
  rows.forEach((r) =>
    r[key]
      .toLocaleLowerCase()
      .normalize("NFKC")
      .match(/[\p{L}]{3,}/gu)
      ?.forEach((w) => {
        if (!stop.has(w))
          counts[w] = (counts[w] || 0) + responseWeight(r, mode);
      }),
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}
const csvCell = (v: unknown) => {
  const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
  return (
    '"' + (/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  );
};
export function csv(rows: Response[], brandOnly = false) {
  const exportBrands = rows.every((r) => r.survey_version === "1.0")
    ? legacyBrands.slice(0, 8)
    : rows.every((r) => r.survey_version === "1.1")
      ? legacyBrands
      : rows.every((r) => r.survey_version === "1.2")
        ? previousBrands
        : rows.every(
              (r) => r.survey_version === "1.3" || r.survey_version === "1.4",
            )
          ? brands
          : [...new Set([...legacyBrands, ...brands])];
  const headers = brandOnly
    ? ["response_id", "brand", "tier", "tier_score"]
    : [
        "id",
        "session_id",
        "survey_version",
        "created_at",
        "completed_at",
        "completion_seconds",
        "is_synthetic",
        "age_group",
        "country_code",
        "country_name",
        "work_field",
        "work_field_other",
        "interest_sport",
        "interest_sneakers",
        "interest_fashion",
        "interest_pop_culture",
        "overall_perception",
        "perception_change",
        "perception_change_reasons",
        "perception_change_other",
        "nike_strengths",
        "nike_weaknesses",
        "priority_weakness",
        "culture_score",
        "product_innovation_score",
        "culture_product_gap",
        "purchase_consideration",
        "apparel_purchase_consideration",
        "last_nike_purchase",
        "recent_purchase_brand",
        "recent_purchase_reason",
        "tension_performance_lifestyle",
        "tension_innovator_follower",
        "tension_athletes_everyone",
        "tension_fresh_familiar",
        "tension_product_marketing",
        "tension_setting_following_culture",
        "attribute_performance",
        "attribute_innovation",
        "attribute_lifestyle",
        "attribute_for_athletes",
        "attribute_for_normal_people",
        "attribute_product_led",
        "attribute_culture_led",
        "attribute_audience",
        "attribute_focus",
        "nike_used_to_feel",
        "nike_today_feels",
        "ceo_change",
        ...exportBrands.map(
          (b) => "tier_" + b.toLowerCase().replaceAll(" ", "_"),
        ),
      ];
  const data = brandOnly
    ? rows.flatMap((r) =>
        exportBrands
          .filter((b) => tierFor(r, b) !== undefined)
          .map((b) => [
            r.id,
            b,
            tierFor(r, b),
            4 - tiers.indexOf(tierFor(r, b)!),
          ]),
      )
    : rows.map((r) =>
        headers.map((h) =>
          h.startsWith("tier_")
            ? tierFor(
                r,
                exportBrands.find(
                  (b) => "tier_" + b.toLowerCase().replaceAll(" ", "_") === h,
                )!,
              )
            : r[h as keyof Response],
        ),
      );
  return (
    "\uFEFF" +
    [headers, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}
