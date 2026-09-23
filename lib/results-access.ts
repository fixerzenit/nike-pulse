import "server-only";
import { timingSafeEqual } from "node:crypto";

// The URL itself is the credential. A missing or malformed token fails closed.
export function hasResultsAccess(token: string): boolean {
  const expected = process.env.RESULTS_ACCESS_TOKEN;
  if (
    !expected ||
    !/^[a-f0-9]{64}$/i.test(expected) ||
    !/^[a-f0-9]{64}$/i.test(token)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(token, "hex"),
    Buffer.from(expected, "hex"),
  );
}
