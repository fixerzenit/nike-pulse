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
  attributes,
  feelingOptions,
  VERSION,
} from "./survey-config";
import { type Response, submissionSchema, toResponse } from "./validation";
export function makeDemo(count = 100): Response[] {
  let seed = 20260922;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
  const n = (max: number) => 1 + Math.floor(rand() * max);
  const score = () => Math.floor(rand() * 11);
  const choose = <T>(a: readonly T[], max: number) => {
    const pool = [...a];
    const selected: T[] = [];
    const size = n(max);
    for (let j = 0; j < size; j++)
      selected.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return selected;
  };
  return Array.from({ length: count }, (_, i) => {
    const high = i % 4 < 2;
    const culture = high ? 6 + Math.floor(rand() * 5) : Math.floor(rand() * 5);
    const product =
      i % 2 === 0 ? 6 + Math.floor(rand() * 5) : Math.floor(rand() * 5);
    const change = score();
    const weaknesses = choose(categories, 6);
    const recentBrand = pick(recentPurchaseBrands);
    const input = submissionSchema.parse({
      session_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      survey_version: VERSION,
      started_at: new Date(Date.UTC(2026, 8, 1 + (i % 21), 12)).toISOString(),
      age_group: pick(ages),
      country_code: pick([
        "IT",
        "FR",
        "DE",
        "GB",
        "ES",
        "NL",
        "SE",
        "US",
        "JP",
        "PT",
      ]),
      work_field: pick(fields),
      work_field_other: "Hospitality",
      interest_sport: score(),
      interest_sneakers: score(),
      interest_fashion: score(),
      interest_pop_culture: score(),
      overall_perception: score(),
      perception_change: change,
      perception_change_reasons: change === 5 ? [] : choose(reasons, 4),
      perception_change_other: "Personal experience",
      brand_tiers: Object.fromEntries(brands.map((b) => [b, pick(tiers)])),
      nike_strengths: choose(categories, 6),
      nike_weaknesses: weaknesses,
      priority_weakness: pick(weaknesses),
      culture_score: culture,
      product_innovation_score: product,
      purchase_consideration: score(),
      apparel_purchase_consideration: score(),
      last_nike_purchase: pick(purchases),
      recent_purchase_brand: recentBrand,
      recent_purchase_reason:
        recentBrand === "No recent purchase" ? "" : pick(purchaseReasons),
      ...Object.fromEntries(attributes.map(({ key }) => [key, score()])),
      nike_used_to_feel: pick(feelingOptions),
      nike_today_feels: pick(feelingOptions),
      ceo_change: pick([
        "Make everyday shoes more durable.",
        "Bring back bolder product design.",
        "Focus on accessible prices.",
        "Invest in local sport communities.",
        "Keep pushing performance innovation.",
        "Make sizing more consistent.",
      ]),
    });
    const r = toResponse(input, true);
    r.created_at = input.started_at;
    r.completion_seconds = 180 + Math.floor(rand() * 120);
    r.completed_at = new Date(
      Date.parse(input.started_at) + r.completion_seconds * 1000,
    ).toISOString();
    return r;
  });
}
