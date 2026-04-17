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
import {
  Sidebar,
  Header,
  MetricCard,
  CostChart,
  DataTable,
  LogsPanel,
  ControlPanel,
} from "@/components/dashboard";
import {
  FileText,
  DollarSign,
  FolderKanban,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const [invoiceCount, setInvoiceCount] = useState(0);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [pivotRows, setPivotRows] = useState<Record<string, string>[]>([]);

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

  const chartData = useMemo(() => {
    const monthTotals: Record<string, number> = {};
    for (const row of summaryRows) {
      const month = row.month;
      monthTotals[month] = (monthTotals[month] || 0) + row.total;
    }
    return Object.entries(monthTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }, [summaryRows]);

  const topProjectsData = useMemo(() => {
    const projectTotals: Record<string, number> = {};
    for (const row of summaryRows) {
      const name = row.projectName || row.projectId;
      projectTotals[name] = (projectTotals[name] || 0) + row.total;
    }
    return Object.entries(projectTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.slice(0, 15), value }));
  }, [summaryRows]);

  const totalCost = useMemo(() => {
    return summaryRows.reduce((acc, row) => acc + row.total, 0);
  }, [summaryRows]);

  const projectCount = useMemo(() => {
    return new Set(summaryRows.map((r) => r.projectId)).size;
  }, [summaryRows]);

  const tableColumns = useMemo(() => {
    const base = [
      { key: "projectId", label: "Project ID", align: "left" as const },
      { key: "projectName", label: "Project Name", align: "left" as const },
    ];
    const monthCols = pivotMonths.map((m) => ({
      key: m,
      label: m,
      align: "right" as const,
    }));
    return [...base, ...monthCols, { key: "total", label: "Total", align: "right" as const }];
  }, [pivotMonths]);

  function log(line: string) {
    setLogs((prev) => [
      ...prev.slice(-250),
      `[${new Date().toISOString().slice(11, 19)}] ${line}`,
    ]);
  }

  function clearLogs() {
    setLogs([]);
  }

  async function fetchAndCalculate() {
    setError("");
    setLoading(true);
    setLogs([]);
    try {
      log("Fetching invoices (proxy)...");
      const invRes = await fetch("/api/invoices", {
        headers: { accept: "application/json" },
      });
      if (!invRes.ok) throw new Error(await invRes.text());
      const payload = await invRes.json();
      const invoices = extractInvoices(payload);
      setInvoiceCount(invoices.length);
      log(`Fetched ${invoices.length} invoices`);

      log("Calculating detail rows...");
      const details = invoices.flatMap((inv) =>
        extractInvoiceRows(inv, "dollars")
      );
      setDetailRows(details);
      log(`Detail rows: ${details.length}`);

      log("Loading Sanity project map...");
      const sanityRes = await fetch("/api/sanity-projects", {
        headers: { accept: "application/json" },
      });
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
        if (text.includes(",") || text.includes('"') || text.includes("\n"))
          return `"${text.replace(/"/g, '""')}"`;
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
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <Header sidebarCollapsed={sidebarCollapsed} />

      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Cost Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor and analyze your Sanity project costs across all invoices
            </p>
          </div>

          {/* Metric Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Invoices"
              value={invoiceCount}
              icon={FileText}
              iconColor="bg-primary"
              loading={loading}
            />
            <MetricCard
              title="Total Cost"
              value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              iconColor="bg-accent"
              loading={loading}
            />
            <MetricCard
              title="Projects"
              value={projectCount}
              icon={FolderKanban}
              iconColor="bg-secondary"
              loading={loading}
            />
            <MetricCard
              title="Detail Rows"
              value={detailRows.length}
              icon={TrendingUp}
              iconColor="bg-muted"
              loading={loading}
            />
          </div>

          {/* Charts and Control Panel */}
          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CostChart
                data={chartData}
                type="area"
                title="Monthly Cost Trend"
                description="Total costs aggregated by month across all projects"
                loading={loading && chartData.length === 0}
              />
            </div>
            <div className="space-y-6">
              <ControlPanel
                loading={loading}
                error={error}
                onFetch={fetchAndCalculate}
              />
              <LogsPanel logs={logs} onClear={clearLogs} />
            </div>
          </div>

          {/* Top Projects Chart */}
          {topProjectsData.length > 0 && (
            <div className="mb-6">
              <CostChart
                data={topProjectsData}
                type="bar"
                title="Top Projects by Cost"
                description="Highest cost projects across all billing periods"
              />
            </div>
          )}

          {/* Data Table */}
          <DataTable
            data={pivotRows}
            columns={tableColumns}
            title="Project Cost Breakdown"
            description="Detailed cost analysis by project and month"
            searchPlaceholder="Search projects..."
            onDownload={pivotRows.length > 0 ? downloadPivot : undefined}
            loading={loading && pivotRows.length === 0}
          />
        </div>
      </main>
    </div>
  );
}
