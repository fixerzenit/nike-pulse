import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { makeDemo } from "../lib/demo";
const origin = "http://127.0.0.1:3001";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      ALLOW_DEV_DEMO: "true",
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
      RESULTS_ACCESS_TOKEN: "",
    },
  },
);
async function main() {
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(origin);
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(ready, "Production server starts");
    for (const path of [
      "/admin",
      "/admin/login",
      "/admin/responses",
      "/results/" + "a".repeat(64),
      "/results/" + "a".repeat(64) + "/responses",
    ]) {
      const r = await fetch(origin + path);
      assert.equal(r.status, 404, `${path} must stay hidden`);
    }
    assert.ok(
      !(await (await fetch(origin)).text()).includes("Development demo"),
    );
    const post = await fetch(origin + "/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(makeDemo()[0]),
    });
    assert.equal(post.status, 503);
    const cross = await fetch(origin + "/api/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: "{}",
    });
    assert.equal(cross.status, 403);
    console.log(
      "PASS: production hides old dashboard routes, rejects missing results secret, disables demo and rejects unconfigured writes.",
    );
  } finally {
    server.kill("SIGTERM");
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
