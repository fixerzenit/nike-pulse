import { NextResponse } from "next/server";
import { submissionSchema, toResponse } from "@/lib/validation";
import { configured, demoEnabled, service } from "@/lib/supabase/server";
import { saveDemo } from "@/lib/data";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Next may rewrite request.url to localhost behind its internal proxy.
  // Browser-controlled Origin must match the incoming Host instead.
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const body = await request.text();
    if (body.length > 20000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const parsed = submissionSchema.safeParse(JSON.parse(body));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Please check your answers", issues: parsed.error.flatten() },
        { status: 400 },
      );
    const row = toResponse(parsed.data, demoEnabled());
    if (demoEnabled()) await saveDemo(row);
    else {
      if (!configured())
        return NextResponse.json(
          { error: "The survey is not accepting responses yet." },
          { status: 503 },
        );
      const { error } = await service().rpc("submit_survey", { payload: row });
      if (error) {
        console.error("Submission failed", error.code);
        return NextResponse.json(
          { error: "Could not save. Please try again." },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not process submission. Please retry." },
      { status: 400 },
    );
  }
}
