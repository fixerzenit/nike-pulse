import { NextResponse } from "next/server";
import {
  cookieName,
  dashboardSession,
  matchesDashboardPassword,
  sessionSeconds,
} from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected)
    return NextResponse.json(
      { error: "Dashboard access is not configured yet." },
      { status: 503 },
    );
  try {
    const body = await request.json();
    if (
      typeof body.password !== "string" ||
      !matchesDashboardPassword(body.password, expected)
    )
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    const session = dashboardSession(expected);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/dashboard",
      maxAge: sessionSeconds,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not process login." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/dashboard",
    maxAge: 0,
  });
  return response;
}
