import "server-only";
import { cookies } from "next/headers";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const cookieName = "nike_dashboard_access";
const sessionSeconds = 60 * 60 * 24 * 7;

function signature(password: string, expiresAt: string) {
  return createHmac("sha256", password).update(expiresAt).digest("hex");
}

export function matchesDashboardPassword(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function dashboardSession(password: string) {
  const expiresAt = String(Date.now() + sessionSeconds * 1000);
  return {
    value: `${expiresAt}.${signature(password, expiresAt)}`,
    maxAge: sessionSeconds,
  };
}

export async function hasDashboardAccess() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return false;
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const [expiresAt, suppliedSignature, extra] = value.split(".");
  if (
    extra !== undefined ||
    !/^\d{13}$/.test(expiresAt || "") ||
    !/^[a-f0-9]{64}$/.test(suppliedSignature || "")
  )
    return false;
  const expiration = Number(expiresAt);
  if (
    expiration <= Date.now() ||
    expiration > Date.now() + sessionSeconds * 1000 + 60_000
  )
    return false;
  return timingSafeEqual(
    Buffer.from(suppliedSignature, "hex"),
    Buffer.from(signature(password, expiresAt), "hex"),
  );
}

export { cookieName, sessionSeconds };
