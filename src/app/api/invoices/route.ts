import { NextResponse } from "next/server";
import { fetchOrbPortalInvoicesAllPages } from "@/lib/orb-portal";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.ORB_PORTAL_TOKEN || process.env.INVOICE_PORTAL_TOKEN || "";
  const cookie = process.env.ORB_PORTAL_COOKIE || "";
  if (!token || !cookie) {
    return new NextResponse("Missing ORB_PORTAL_TOKEN (or INVOICE_PORTAL_TOKEN) and ORB_PORTAL_COOKIE", {
      status: 400,
    });
  }

  const userAgent =
    process.env.ORB_PORTAL_USER_AGENT ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const acceptLanguage = process.env.ORB_PORTAL_ACCEPT_LANGUAGE || "en-GB,en-US;q=0.9,en;q=0.8";

  try {
    const payload = await fetchOrbPortalInvoicesAllPages({
      token,
      cookie,
      userAgent,
      acceptLanguage,
    });
    return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return new NextResponse(message, { status: 502 });
  }
}

