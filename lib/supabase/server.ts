import "server-only";
import { createClient } from "@supabase/supabase-js";

export const serverKey = () =>
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const configured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serverKey());
export const demoEnabled = () =>
  process.env.NODE_ENV === "development" &&
  process.env.ALLOW_DEV_DEMO === "true" &&
  !configured();
export function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
