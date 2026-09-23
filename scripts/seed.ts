import { writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { makeDemo } from "../lib/demo";
const rows = makeDemo(100);
async function main() {
  if (process.argv.includes("--supabase")) {
    if (process.env.SEED_SYNTHETIC !== "true")
      throw Error(
        "Set SEED_SYNTHETIC=true and use a separate development Supabase project.",
      );
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw Error("Supabase server credentials required.");
    const db = createClient(url, key, { auth: { persistSession: false } });
    for (const row of rows) {
      const { error } = await db.rpc("submit_survey", { payload: row });
      if (error) throw error;
    }
    console.log("100 synthetic responses seeded. Re-running is idempotent.");
  } else {
    await mkdir("work", { recursive: true });
    await writeFile("work/demo-responses.json", JSON.stringify(rows, null, 2));
    console.log(
      "Created 100 clearly marked synthetic responses in work/demo-responses.json.",
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
