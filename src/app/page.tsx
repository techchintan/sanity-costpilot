"use client";

import { useMemo, useState } from "react";
import type { DetailRow, SummaryRow } from "@/lib/invoice-analysis";
import {
  aggregateByProjectMonth,
  applySanityProjectMap,
  buildPivotByProjectId,
  extractInvoiceRows,
  extractInvoices,
} from "@/lib/invoice-analysis";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [invoiceCount, setInvoiceCount] = useState(0);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [pivotRows, setPivotRows] = useState<Record<string, string>[]>([]);

  const filteredPivot = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = pivotRows;
    if (q) {
      rows = rows.filter((r) =>
        [r.projectId, r.projectName].some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => String(a.projectId).localeCompare(String(b.projectId)));
  }, [pivotRows, search]);

  const pivotMonths = useMemo(() => {
    const keys = new Set<string>();
    for (const row of pivotRows) {
      for (const k of Object.keys(row)) {
        if (k === "projectId" || k === "projectName" || k === "total") continue;
        keys.add(k);
      }
    }
    return Array.from(keys).sort();
  }, [pivotRows]);

  function log(line: string) {
    setLogs((prev) => [...prev.slice(-250), `[${new Date().toISOString().slice(11, 19)}] ${line}`]);
  }

  async function fetchAndCalculate() {
    setError("");
    setLoading(true);
    setLogs([]);
    try {
      log("Fetching invoices (proxy)...");
      const invRes = await fetch(
        "/api/invoices",
        { headers: { accept: "application/json" } }
      );
      if (!invRes.ok) throw new Error(await invRes.text());
      const payload = await invRes.json();
      const invoices = extractInvoices(payload);
      setInvoiceCount(invoices.length);
      log(`Fetched ${invoices.length} invoices`);

      log("Calculating detail rows...");
      const details = invoices.flatMap((inv) => extractInvoiceRows(inv, "dollars"));
      setDetailRows(details);
      log(`Detail rows: ${details.length}`);

      log("Loading Sanity project map...");
      const sanityRes = await fetch("/api/sanity-projects", { headers: { accept: "application/json" } });
      if (!sanityRes.ok) throw new Error(await sanityRes.text());
      const sanityMap = (await sanityRes.json()) as Record<string, string>;
      const mappedCount = Object.keys(sanityMap).length;
      log(`Sanity projects: ${mappedCount}`);
      applySanityProjectMap(details, sanityMap);

      log("Aggregating...");
      const summary = aggregateByProjectMonth(details);
      setSummaryRows(summary);
      const pivot = buildPivotByProjectId(summary);
      setPivotRows(pivot);
      log(`Summary rows: ${summary.length}, pivot rows: ${pivot.length}`);
      log("Done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows: Array<Record<string, string>>) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
      const values = headers.map((h) => {
        const text = String(row[h] ?? "");
        if (text.includes(",") || text.includes('"') || text.includes("\n")) return `"${text.replace(/"/g, '""')}"`;
        return text;
      });
      lines.push(values.join(","));
    }
    return `${lines.join("\n")}\n`;
  }

  function downloadPivot() {
    downloadCsv("cost.csv", toCsv(pivotRows));
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-lg font-semibold">Invoice analysis</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Fetches invoices via server-side proxy and renders project/month totals.
            </p>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">View</span>
                  <input
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value="Pivot"
                    readOnly
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Download</span>
                  <button
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                    disabled={!pivotRows.length}
                    onClick={downloadPivot}
                    type="button"
                  >
                    Download pivot CSV
                  </button>
                </label>
              </div>

              <button
                className="mt-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                disabled={loading}
                onClick={fetchAndCalculate}
              >
                {loading ? "Working..." : "Fetch & Calculate"}
              </button>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <div>Invoices: {invoiceCount}</div>
                <div>Detail rows: {detailRows.length}</div>
                <div>Summary rows: {summaryRows.length}</div>
                <div>Projects: {new Set(summaryRows.map((r) => r.projectId)).size}</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                <div className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">Logs</div>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap">{logs.join("\n")}</pre>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid gap-3 md:grid-cols-1">
              <input
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Search projectId / name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
                <table className="min-w-max w-full text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300">
                    <tr>
                      <th className="px-3 py-2 font-medium">projectId</th>
                      <th className="px-3 py-2 font-medium">projectName</th>
                      {pivotMonths.map((m) => (
                        <th key={m} className="px-3 py-2 font-medium text-right">
                          {m}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium text-right">total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPivot.map((r) => (
                      <tr key={r.projectId} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-3 py-2 font-mono text-xs">{r.projectId}</td>
                        <td className="px-3 py-2">{r.projectName}</td>
                        {pivotMonths.map((m) => (
                          <td key={m} className="px-3 py-2 text-right font-mono text-xs">
                            {r[m] ?? "0.00"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-mono text-xs">{r.total ?? "0.00"}</td>
                      </tr>
                    ))}

                    {!filteredPivot.length ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400"
                          colSpan={pivotMonths.length + 3}
                        >
                          No rows yet. Click “Fetch & Calculate”.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
