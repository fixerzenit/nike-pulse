import { demoEnabled } from "@/lib/supabase/server";
import { readDashboardResponses } from "@/lib/data";
import { hasDashboardAccess } from "@/lib/dashboard-auth";
import Dashboard from "@/components/admin/Dashboard";
import DashboardLogin from "@/components/admin/DashboardLogin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicResponses() {
  if (!(await hasDashboardAccess())) return <DashboardLogin />;
  return (
    <Dashboard
      initialRows={await readDashboardResponses()}
      demo={demoEnabled()}
      resultsPath="/dashboard"
      raw
      passwordProtected
    />
  );
}
