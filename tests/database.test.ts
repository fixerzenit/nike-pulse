import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { makeDemo } from "../lib/demo";
import { categories, legacyBrands, reasons } from "../lib/survey-config";

test("private-link database denies client reads; service writes remain atomic and idempotent", async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;",
  );
  await db.exec(await readFile("supabase/migrations/20260922000101_research.sql", "utf8"));
  await db.exec(
    await readFile("supabase/migrations/20260922000102_link_only_results.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20260922000103_survey_v1_1.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20260922000104_survey_v1_2.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20260922000105_survey_v1_3.sql", "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/20260922000106_survey_v1_4.sql", "utf8"),
  );
  const row = makeDemo()[0];
  await db.exec("set role service_role");
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(row),
  ]);
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(row),
  ]);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.survey_responses",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.brand_tier_rankings",
      )
    ).rows[0].n,
    10,
  );
  await assert.rejects(
    db.query("select public.submit_survey($1::jsonb)", [
      JSON.stringify({
        ...row,
        session_id: crypto.randomUUID(),
        id: crypto.randomUUID(),
        culture_score: 11,
      }),
    ]),
  );
  const unrestricted = {
    ...row,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    perception_change: 3,
    perception_change_reasons: [...reasons],
    perception_change_other: "Every reason",
    nike_strengths: [...categories],
    nike_weaknesses: [...categories],
    culture_score: 0,
    product_innovation_score: 10,
    interest_sport: 0,
    attribute_performance: 0,
  };
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(unrestricted),
  ]);
  const optionalText = {
    ...row,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    work_field: "Other",
    work_field_other: "",
    perception_change: 3,
    perception_change_reasons: ["Other"],
    perception_change_other: "",
    ceo_change: "",
  };
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(optionalText),
  ]);
  await assert.rejects(
    db.query("select public.submit_survey($1::jsonb)", [
      JSON.stringify({
        ...row,
        id: crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        priority_weakness: "not a selected weakness",
      }),
    ]),
  );
  await assert.rejects(
    db.query("select public.submit_survey($1::jsonb)", [
      JSON.stringify({
        ...row,
        session_id: crypto.randomUUID(),
        id: crypto.randomUUID(),
        brand_tiers: { Nike: "S" },
      }),
    ]),
  );
  const legacyV11 = {
    ...row,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    survey_version: "1.1",
    brand_tiers: Object.fromEntries(
      legacyBrands.map((b) => [
        b,
        row.brand_tiers[b as keyof typeof row.brand_tiers] || "B",
      ]),
    ),
    interest_sport: 3,
    interest_sneakers: 3,
    interest_fashion: 3,
    interest_pop_culture: 3,
    overall_perception: 4,
    perception_change: 4,
    perception_change_reasons: [],
    perception_change_other: "",
    culture_score: 4,
    product_innovation_score: 4,
    attribute_performance: 4,
    attribute_innovation: 4,
    attribute_lifestyle: 4,
    attribute_for_athletes: 4,
    attribute_for_normal_people: 4,
    attribute_product_led: 4,
    attribute_culture_led: 4,
    nike_used_to_feel: "Bold",
    nike_today_feels: "Innovative",
  } as Record<string, unknown>;
  const previousV12 = {
    ...legacyV11,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    survey_version: "1.2",
    brand_tiers: Object.fromEntries(
      legacyBrands.slice(0, 10).map((b) => [b, "B"]),
    ),
    interest_sport: 0,
    interest_sneakers: 0,
    interest_fashion: 0,
    interest_pop_culture: 0,
    overall_perception: 0,
    perception_change: 5,
    perception_change_reasons: [],
    culture_score: 0,
    product_innovation_score: 0,
    attribute_performance: 0,
    attribute_innovation: 0,
    attribute_lifestyle: 0,
    attribute_for_athletes: 0,
    attribute_for_normal_people: 0,
    attribute_product_led: 0,
    attribute_culture_led: 0,
  };
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(previousV12),
  ]);
  const previousV13 = {
    ...row,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    survey_version: "1.3",
    priority_weakness: null,
    recent_purchase_brand: null,
    recent_purchase_reason: null,
  };
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(previousV13),
  ]);
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(legacyV11),
  ]);
  const legacy = {
    ...legacyV11,
    id: crypto.randomUUID(),
    session_id: crypto.randomUUID(),
    survey_version: "1.0",
    brand_tiers: Object.fromEntries(
      Object.entries(legacyV11.brand_tiers as Record<string, string>).slice(
        0,
        8,
      ),
    ),
  } as Record<string, unknown>;
  delete legacy.apparel_purchase_consideration;
  for (const key of Object.keys(legacy))
    if (key.startsWith("attribute_")) delete legacy[key];
  await db.query("select public.submit_survey($1::jsonb)", [
    JSON.stringify(legacy),
  ]);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.brand_tier_rankings where response_id = $1",
        [legacy.id],
      )
    ).rows[0].n,
    8,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role; set role ${role}`);
    await assert.rejects(db.query("select * from public.survey_responses"));
    await assert.rejects(db.query("select * from public.brand_tier_rankings"));
    await assert.rejects(
      db.query("select public.submit_survey($1::jsonb)", [JSON.stringify(row)]),
    );
  }
  await db.exec("reset role; set role service_role");
  assert.equal(
    (await db.query("select * from public.survey_responses")).rows.length,
    7,
  );
  await db.close();
});
