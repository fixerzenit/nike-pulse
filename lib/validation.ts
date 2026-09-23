import { z } from "zod";
import {
  ages,
  fields,
  brands,
  tiers,
  categories,
  reasons,
  purchases,
  recentPurchaseBrands,
  purchaseReasons,
  VERSION,
  feelingOptions,
  type LegacyBrand,
  type Tier,
} from "./survey-config";
import { countries } from "./countries";
const scale = z.number().int().min(0).max(10);
const selections = <T extends string>(values: readonly T[]) =>
  z
    .array(z.enum(values as [T, ...T[]]))
    .min(1)
    .max(values.length)
    .refine((a) => new Set(a).size === a.length, "Choose each option once");
export const submissionSchema = z
  .object({
    session_id: z.uuid(),
    survey_version: z.literal(VERSION),
    started_at: z.iso.datetime(),
    age_group: z.enum(ages),
    country_code: z
      .string()
      .refine((c) => countries.some((x) => x.code === c), "Select a country"),
    work_field: z.enum(fields),
    work_field_other: z.string().trim().max(80).default(""),
    interest_sport: scale,
    interest_sneakers: scale,
    interest_fashion: scale,
    interest_pop_culture: scale,
    overall_perception: scale,
    perception_change: scale,
    perception_change_reasons: z
      .array(z.enum(reasons))
      .max(reasons.length)
      .default([]),
    perception_change_other: z.string().trim().max(80).default(""),
    brand_tiers: z.record(z.enum(brands), z.enum(tiers)),
    nike_strengths: selections(categories),
    nike_weaknesses: selections(categories),
    priority_weakness: z.enum(categories),
    culture_score: scale,
    product_innovation_score: scale,
    purchase_consideration: scale,
    apparel_purchase_consideration: scale,
    last_nike_purchase: z.enum(purchases),
    recent_purchase_brand: z.enum(recentPurchaseBrands),
    recent_purchase_reason: z.union([z.enum(purchaseReasons), z.literal("")]),
    attribute_performance: scale,
    attribute_innovation: scale,
    attribute_audience: scale,
    attribute_focus: scale,
    nike_used_to_feel: z.enum(feelingOptions),
    nike_today_feels: z.enum(feelingOptions),
    ceo_change: z.string().trim().max(180).default(""),
  })
  .superRefine((a, ctx) => {
    if (!a.nike_weaknesses.includes(a.priority_weakness))
      ctx.addIssue({
        code: "custom",
        path: ["priority_weakness"],
        message: "Choose one selected weakness",
      });
    if (
      (a.recent_purchase_brand === "No recent purchase") !==
      (a.recent_purchase_reason === "")
    )
      ctx.addIssue({
        code: "custom",
        path: ["recent_purchase_reason"],
        message: "Choose the main reason for your purchase",
      });
    if (a.perception_change !== 5 && !a.perception_change_reasons.length)
      ctx.addIssue({
        code: "custom",
        path: ["perception_change_reasons"],
        message: "Choose a reason",
      });
    if (
      new Set(a.perception_change_reasons).size !==
      a.perception_change_reasons.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["perception_change_reasons"],
        message: "Duplicate reason",
      });
  });
export type Submission = z.infer<typeof submissionSchema>;
export type Response = Omit<
  Submission,
  | "survey_version"
  | "brand_tiers"
  | "priority_weakness"
  | "recent_purchase_brand"
  | "recent_purchase_reason"
> & {
  survey_version: "1.0" | "1.1" | "1.2" | "1.3" | typeof VERSION;
  priority_weakness?: Submission["priority_weakness"];
  recent_purchase_brand?: Submission["recent_purchase_brand"];
  recent_purchase_reason?: Submission["recent_purchase_reason"];
  brand_tiers: Partial<Record<LegacyBrand, Tier>>;
  attribute_lifestyle?: number;
  attribute_for_athletes?: number;
  attribute_for_normal_people?: number;
  attribute_product_led?: number;
  attribute_culture_led?: number;
  id: string;
  created_at: string;
  completed_at: string;
  completion_seconds: number;
  country_name: string;
  culture_product_gap: number;
  is_synthetic: boolean;
};
export function toResponse(input: Submission, synthetic = false): Response {
  const now = new Date().toISOString();
  return {
    ...input,
    perception_change_reasons:
      input.perception_change === 5 ? [] : input.perception_change_reasons,
    perception_change_other:
      input.perception_change === 5 ||
      !input.perception_change_reasons.includes("Other")
        ? ""
        : input.perception_change_other,
    work_field_other:
      input.work_field === "Other" ? input.work_field_other : "",
    id: input.session_id,
    created_at: now,
    completed_at: now,
    completion_seconds: Math.max(
      0,
      Math.min(
        86400,
        Math.round((Date.now() - Date.parse(input.started_at)) / 1000),
      ),
    ),
    country_name: countries.find((c) => c.code === input.country_code)!.name,
    culture_product_gap: input.culture_score - input.product_innovation_score,
    is_synthetic: synthetic,
  };
}
