export type OrbInvoicePayload = { data?: unknown[]; next_page?: number | null; total?: number } & Record<
  string,
  unknown
>;

export async function fetchOrbPortalInvoicesAllPages(opts: {
  token: string;
  cookie: string;
  userAgent?: string;
  acceptLanguage?: string;
  log?: (line: string) => void;
}): Promise<{ data: unknown[] }> {
  const { token, cookie, userAgent, acceptLanguage, log } = opts;

  const all: unknown[] = [];
  const seen = new Set<string>();

  let page = 1;
  // Fetch until next_page is null. If Orb ever misbehaves and loops, we'll detect it via seenPages.
  const seenPages = new Set<number>();
  // Keep limit constant. Orb defaults are fine, but we set 20 to match portal UI behavior.
  const limit = 20;

  while (true) {
    if (seenPages.has(page)) {
      throw new Error(`Orb portal pagination loop detected at page ${page}`);
    }
    seenPages.add(page);

    const url = `https://portal.withorb.com/api/v1/invoices/customer?limit=${encodeURIComponent(
      String(limit)
    )}&page=${encodeURIComponent(String(page))}&token=${encodeURIComponent(token)}`;

    log?.(`[portal] page=${page} GET`);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json, text/plain, */*",
        cookie,
        referer: `https://portal.withorb.com/view?token=${encodeURIComponent(token)}`,
        ...(userAgent ? { "user-agent": userAgent } : {}),
        ...(acceptLanguage ? { "accept-language": acceptLanguage } : {}),
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Orb portal request failed (${res.status}). Body: ${text.slice(0, 500)}`);
    }

    const payload = JSON.parse(text) as OrbInvoicePayload;
    const invoices = Array.isArray(payload.data) ? payload.data : [];
    for (const inv of invoices) {
      const obj = inv && typeof inv === "object" ? (inv as Record<string, unknown>) : null;
      const key =
        (obj &&
          (obj["id"] ||
            obj["invoice_id"] ||
            obj["invoiceId"] ||
            obj["invoice_number"] ||
            obj["invoiceNumber"])) ??
        JSON.stringify(inv);
      if (seen.has(String(key))) continue;
      seen.add(String(key));
      all.push(inv);
    }

    const next = payload.next_page ? Number(payload.next_page) : null;
    log?.(`[portal] page=${page} invoices=${invoices.length} next_page=${next ?? "none"} total=${payload.total ?? "?"}`);
    if (!next) break;
    page = next;
  }

  return { data: all };
}

