import { demoEnabled } from "@/lib/supabase/server";
import { readDashboardResponses } from "@/lib/data";
import Dashboard from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicDashboard() {
  return (
    <Dashboard
      initialRows={await readDashboardResponses()}
      demo={demoEnabled()}
      resultsPath="/dashboard"
      publicAccess
    />
  );
}
