import { NextResponse } from "next/server";
import { fetchSanityProjectsMap } from "@/lib/sanity-projects";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.SANITY_AUTH_TOKEN || "";
  if (!token) {
    return NextResponse.json({}, { headers: { "cache-control": "no-store" } });
  }

  try {
    const map = await fetchSanityProjectsMap({ token });
    return NextResponse.json(map, { headers: { "cache-control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sanity proxy error";
    return new NextResponse(message, { status: 502 });
  }
}

