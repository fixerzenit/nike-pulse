import { notFound } from "next/navigation";
import { hasResultsAccess } from "@/lib/results-access";
import { demoEnabled } from "@/lib/supabase/server";
import { readResponses } from "@/lib/data";
import Dashboard from "@/components/admin/Dashboard";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function Responses({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!hasResultsAccess(token)) notFound();
  return (
    <Dashboard
      initialRows={await readResponses(token)}
      demo={demoEnabled()}
      resultsPath={`/results/${token}`}
      raw
    />
  );
}
