import { test, expect } from "@playwright/test";
import { makeDemo } from "../../lib/demo";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
const token = readFileSync(".env.local", "utf8").match(
  /^RESULTS_ACCESS_TOKEN=([a-f0-9]{64})$/m,
)?.[1];
if (!token)
  throw Error("Set RESULTS_ACCESS_TOKEN in .env.local for browser tests");
const resultsPath = `/results/${token}`;
async function setScore(page: Page, label: string, score: number) {
  const slider = page.getByRole("slider", { name: label, exact: true });
  await slider.focus();
  if (score === 10) await page.keyboard.press("End");
  else {
    await page.keyboard.press("Home");
    for (let i = 0; i < score; i++) await page.keyboard.press("ArrowRight");
  }
  await expect(slider).toHaveValue(String(score));
}
test("the public dashboard opens without login; old admin routes and invalid links stay hidden", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start", exact: false }),
  ).toBeVisible();
  for (const path of [
    "/admin",
    "/admin/login",
    "/admin/responses",
    "/results/wrong",
    "/results/wrong/responses",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Nike, today." }),
  ).toBeVisible();
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "PUBLIC DASHBOARD",
  );
  expect((await request.get("/dashboard/responses")).status()).toBe(200);
  await page.goto(resultsPath);
  await expect(page.getByText("Demo data · Synthetic")).toBeVisible();
  const response = await request.get(resultsPath);
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect((await request.post("/api/responses", { data: {} })).status()).toBe(
    400,
  );
  expect((await request.get("/api/responses")).status()).toBe(405);
});
test("mobile survey completes, resumes, keyboard tier placement, appears in public dashboard and exports", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What does Nike",
  );
  await page.screenshot({ path: "work/survey-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Start", exact: false }).click();
  await page.getByRole("button", { name: /18–24/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Search for your country").fill("Italy");
  await page.getByRole("button", { name: "Italy", exact: false }).click();
  await page.reload();
  await expect(page.getByText("Selected: Italy")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Creative \/ Design/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const label of ["Sport", "Sneakers", "Fashion / style", "Pop culture"])
    await setScore(page, label, 10);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("What is your overall perception of Nike today?"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Compared with 3–5 years ago, how has your perception of Nike changed?",
    ),
  ).toBeVisible();
  await setScore(page, "What is your overall perception of Nike today?", 10);
  await setScore(
    page,
    "Compared with 3–5 years ago, how has your perception of Nike changed?",
    5,
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "buying sneakers",
  );
  for (const brand of [
    "Nike",
    "adidas",
    "New Balance",
    "ASICS",
    "Salomon",
    "On",
    "Hoka",
    "Puma",
    "Under Armour",
    "Reebok",
  ]) {
    const b = page.getByRole("button", { name: brand, exact: true });
    await b.focus();
    await page.keyboard.press("Enter");
    const tier = page.getByRole("button", {
      name: "Place selected brand in A: Strong consideration",
      exact: true,
    });
    await tier.focus();
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 10; i++)
    await page.locator(".chips").first().locator("button").nth(i).click();
  await expect(
    page.locator(".chips").first().locator('button[aria-pressed="true"]'),
  ).toHaveCount(10);
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 10; i++)
    await page.locator(".chips").first().locator("button").nth(i).click();
  await expect(
    page.locator(".chips").first().locator('button[aria-pressed="true"]'),
  ).toHaveCount(10);
  await page
    .getByRole("group", { name: "Most important weakness" })
    .getByRole("button", { name: /Performance products/ })
    .click();
  await page.getByRole("button", { name: "Continue" }).click();
  await setScore(page, "How culturally relevant does Nike feel today?", 0);
  await page.getByRole("button", { name: "Continue" }).click();
  await setScore(page, "How innovative do Nike products feel today?", 10);
  await page.getByRole("button", { name: "Continue" }).click();
  await setScore(
    page,
    "How likely are you to consider Nike for your next sneaker purchase?",
    10,
  );
  await setScore(
    page,
    "How likely are you to consider Nike for your next apparel purchase?",
    0,
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /In the last 3 months/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("group", { name: "Brand bought most recently" })
    .getByRole("button", { name: "Nike", exact: false })
    .click();
  await page
    .getByRole("group", { name: "Main purchase reason" })
    .getByRole("button", { name: /Comfort \/ fit/ })
    .click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const label of [
    "Performance",
    "Innovation",
    "Who is Nike for?",
    "What drives Nike?",
  ]) {
    await setScore(page, label, 10);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("group", { name: "Nike used to feel…" })
    .getByRole("button", { name: "Bold" })
    .click();
  await page
    .getByRole("group", { name: "Today it feels…" })
    .getByRole("button", { name: "Innovative" })
    .click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your one change").fill("E2E: improve durability.");
  await page.getByRole("button", { name: "Finish", exact: false }).click();
  await expect(page).toHaveURL(/thank-you/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("nike-pulse-unfinished-v1.4"),
    ),
  ).toBeNull();
  await page.goto("/dashboard");
  await expect(page.getByText("Demo data · Synthetic")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByPlaceholder("Search words, country, work or response ID…")
    .fill("E2E: improve durability.");
  await expect(
    page.getByText("E2E: improve durability.", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByPlaceholder("Search words, country, work or response ID…")
    .fill("");
  await expect(page.locator("#matrix .recharts-surface")).toBeVisible();
  await expect(page.locator("#decisions")).toBeVisible();
  await page.getByRole("button", { name: "Weighted", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Weighted", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Base", exact: true }).click();
  await page.screenshot({
    path: "work/dashboard-desktop.png",
    fullPage: false,
  });
  await page.locator(".filters summary").filter({ hasText: "Age" }).click();
  await page.getByLabel("18–24", { exact: true }).check();
  await expect(page.locator(".filter-top")).toContainText("of");
  const filteredCount = await page
    .locator(".metric strong")
    .first()
    .innerText();
  expect(Number(filteredCount)).toBeLessThan(101);
  await page.locator(".filters summary").filter({ hasText: "Age" }).click();
  await page.getByLabel("From date").fill("2099-01-01");
  await expect(page.getByText("No responses in this view.")).toBeVisible();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .first()
    .click();
  await expect(page.getByText("No responses in this view.")).not.toBeVisible();
  await page.getByText("Export data ↓", { exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Filtered responses/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("nike-filtered.csv");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("Export data ↓", { exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const mobileNav = await page.locator(".sidebar").boundingBox();
  const mobileContent = await page.locator(".admin-main").boundingBox();
  expect(mobileNav).not.toBeNull();
  expect(mobileContent).not.toBeNull();
  expect(mobileContent!.y).toBeGreaterThanOrEqual(
    mobileNav!.y + mobileNav!.height,
  );
  await page.screenshot({ path: "work/dashboard-mobile.png", fullPage: false });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("duplicate session submission is idempotent", async ({ request }) => {
  const r = { ...makeDemo()[0], session_id: crypto.randomUUID() };
  expect((await request.post("/api/responses", { data: r })).ok()).toBe(true);
  expect((await request.post("/api/responses", { data: r })).ok()).toBe(true);
});
