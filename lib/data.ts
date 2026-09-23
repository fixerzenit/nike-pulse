import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeDemo } from "./demo";
import type { Response } from "./validation";
import { demoEnabled, service } from "./supabase/server";
import { hasResultsAccess } from "./results-access";
const file = path.join(process.cwd(), "work", "demo-responses.json");
let queue: Promise<void> = Promise.resolve();
export async function demoRows(): Promise<Response[]> {
  if (!demoEnabled()) throw Error("Demo disabled");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return makeDemo();
  }
}
export async function saveDemo(row: Response) {
  const task = queue.then(async () => {
    const rows = await demoRows();
    if (!rows.some((r) => r.session_id === row.session_id)) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(
        file,
        JSON.stringify([...rows, { ...row, is_synthetic: true }]),
      );
    }
  });
  queue = task.catch(() => {});
  await task;
}
export async function readResponses(token: string): Promise<Response[]> {
  if (!hasResultsAccess(token)) throw Error("Unauthorized");
  return readDashboardResponses();
}
export async function readDashboardResponses(): Promise<Response[]> {
  if (demoEnabled()) return demoRows();
  const db = service();
  const all: Response[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db
      .from("survey_responses")
      .select("*,brand_tier_rankings(brand,tier)")
      .order("created_at", { ascending: false })
      .range(start, start + 499);
    if (error) throw Error("Could not load responses");
    all.push(
      ...data.map(
        (r) =>
          ({
            ...r,
            brand_tiers: Object.fromEntries(
              r.brand_tier_rankings.map(
                (t: { brand: string; tier: string }) => [t.brand, t.tier],
              ),
            ),
          }) as Response,
      ),
    );
    if (data.length < 500) break;
  }
  return all;
}
