import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemo } from "../lib/demo";
import { submissionSchema } from "../lib/validation";
import {
  mean,
  median,
  filteredDataset,
  csv,
  distribution,
  weightedMean,
  weightedShare,
} from "../lib/analytics";
const rows = makeDemo();
test("synthetic sample has all four quadrants and validates", () => {
  assert.equal(rows.length, 100);
  for (const r of rows)
    assert.equal(submissionSchema.safeParse(r).success, true);
  for (const [c, p] of [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])
    assert.ok(
      rows.some(
        (r) =>
          r.culture_score > 5 === c && r.product_innovation_score > 5 === p,
      ),
    );
});
test("rejects invalid ranges, incomplete tiers and inconsistent quick answers", () => {
  assert.equal(
    submissionSchema.safeParse({ ...rows[0], culture_score: 11 }).success,
    false,
  );
  assert.equal(
    submissionSchema.safeParse({ ...rows[0], brand_tiers: { Nike: "S" } })
      .success,
    false,
  );
  assert.equal(
    submissionSchema.safeParse({
      ...rows[0],
      work_field: "Other",
      work_field_other: "",
      ceo_change: "",
    }).success,
    true,
  );
  assert.equal(
    submissionSchema.safeParse({
      ...rows[0],
      priority_weakness: "not selected",
    }).success,
    false,
  );
  assert.equal(
    submissionSchema.safeParse({
      ...rows[0],
      recent_purchase_brand: "No recent purchase",
      recent_purchase_reason: "Design / style",
    }).success,
    false,
  );
});
test("weighted view gives Creative and Fashion a modest, explicit influence", () => {
  const sample = [
    { ...rows[0], work_field: "Creative / Design" as const, culture_score: 10 },
    { ...rows[1], work_field: "Sport" as const, culture_score: 0 },
  ];
  assert.equal(
    weightedMean(sample, "base", (r) => r.culture_score),
    5,
  );
  assert.ok(
    Math.abs(
      (weightedMean(sample, "weighted", (r) => r.culture_score) || 0) - 60 / 11,
    ) < 0.0001,
  );
  assert.equal(
    weightedShare(sample, "base", (r) => r.culture_score === 10),
    50,
  );
  assert.ok(
    weightedShare(sample, "weighted", (r) => r.culture_score === 10) > 50,
  );
});
test("filter intersections are immutable and empty analytics safe", () => {
  const before = JSON.stringify(rows);
  const filtered = filteredDataset(rows, {
    age_group: ["18–24"],
    country_name: ["Italy"],
  });
  assert.ok(
    filtered.every(
      (r) => r.age_group === "18–24" && r.country_name === "Italy",
    ),
  );
  assert.equal(JSON.stringify(rows), before);
  assert.equal(mean([]), null);
  assert.equal(median([3, 1, 2, 4]), 2.5);
  assert.equal(
    distribution([]).reduce((s, d) => s + d.count, 0),
    0,
  );
});
test("CSV contains tiers, handles line breaks and neutralizes formulas", () => {
  const out = csv([{ ...rows[0], ceo_change: '=SUM(1,2)\n"test"' }]);
  assert.ok(out.includes("tier_nike"));
  assert.ok(!out.includes("tier_vans"));
  assert.ok(out.includes("'=SUM"));
  assert.ok(out.includes('""test""'));
  assert.equal(csv([], true).split("\r\n").length, 1);
});
