import { NextResponse } from "next/server";
import { buildStrataPreview } from "@/lib/strata";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "inteligencia artificial";
  const yearStart = Number(searchParams.get("yearStart") ?? "2006");
  const yearEnd = Number(searchParams.get("yearEnd") ?? `${new Date().getFullYear()}`);

  const data = buildStrataPreview({
    query,
    yearStart: Number.isFinite(yearStart) ? yearStart : 2006,
    yearEnd: Number.isFinite(yearEnd) ? yearEnd : new Date().getFullYear(),
  });

  return NextResponse.json({
    ok: true,
    data,
  });
}
