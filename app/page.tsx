import Survey from "@/components/survey/Survey";
import { demoEnabled } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Survey demo={demoEnabled()} />;
}
