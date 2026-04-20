"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Table2,
} from "lucide-react";

interface ProjectCostViewProps {
  data: Record<string, string>[];
  columns: { key: string; label: string; align?: "left" | "right" }[];
  onDownload?: () => void;
  loading?: boolean;
}

const CHART_COLORS = {
  primary: "#0ea5e9",
  secondary: "#22c55e",
  accent: "#f59e0b",
  line: "#8b5cf6",
};

export function ProjectCostView({
  data,
  columns,
  onDownload,
  loading = false,
}: ProjectCostViewProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Prepare chart data from pivot rows - all projects with cumulative total
  const chartData = useMemo(() => {
    const processed = data
      .map((row) => {
        const total = parseFloat(String(row.total || "0").replace(/[^0-9.-]/g, ""));
        return {
          name: (row.projectName || row.projectId || "Unknown").slice(0, 10),
          fullName: row.projectName || row.projectId || "Unknown",
          cost: isNaN(total) ? 0 : total,
          projectId: row.projectId,
        };
      })
      .filter((item) => item.cost > 0)
      .sort((a, b) => b.cost - a.cost);

    // Add cumulative cost and average line
    let cumulative = 0;
    const totalCost = processed.reduce((sum, item) => sum + item.cost, 0);
    const average = processed.length > 0 ? totalCost / processed.length : 0;

    return processed.map((item) => {
      cumulative += item.cost;
      return {
        ...item,
        cumulative,
        average: Math.round(average * 100) / 100,
        percentage: totalCost > 0 ? Math.round((item.cost / totalCost) * 100) : 0,
      };
    });
  }, [data]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalCost = chartData.reduce((sum, item) => sum + item.cost, 0);
    const maxCost = chartData.length > 0 ? Math.max(...chartData.map((d) => d.cost)) : 0;
    const avgCost = chartData.length > 0 ? totalCost / chartData.length : 0;
    return { totalCost, maxCost, avgCost, count: chartData.length };
  }, [chartData]);

  // Table filtering and sorting
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = data;

    if (q) {
      result = data.filter((row) =>
        Object.values(row).some((v) => String(v || "").toLowerCase().includes(q))
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey] ?? "";
        const bVal = b[sortKey] ?? "";
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-96 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Project Cost Breakdown</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed cost analysis with cumulative trend
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "chart"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Chart</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {onDownload && (
            <button
              onClick={onDownload}
              disabled={!data.length}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {viewMode === "chart" ? (
          /* Chart View */
          <div>
            {chartData.length > 0 ? (
              <div>
                {/* Summary Stats */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total Cost
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {formatCurrency(summaryStats.totalCost)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Highest Project
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {formatCurrency(summaryStats.maxCost)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Average Cost
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {formatCurrency(summaryStats.avgCost)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total Projects
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {summaryStats.count}
                    </p>
                  </div>
                </div>

                {/* ComposedChart */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div style={{ width: "100%", height: 400, minHeight: 400 }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="hsl(var(--border))" 
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={formatCompact}
                          width={70}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={formatCompact}
                          width={70}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                            padding: "12px",
                          }}
                          labelStyle={{ 
                            color: "hsl(var(--foreground))", 
                            fontWeight: 600,
                            marginBottom: "8px",
                          }}
                          formatter={(value: number, name: string) => {
                            const label = name === "cost" ? "Project Cost" : 
                                          name === "cumulative" ? "Cumulative Total" : 
                                          name === "average" ? "Average Line" : name;
                            return [formatCurrency(value), label];
                          }}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              const item = payload[0].payload;
                              return `${item.fullName} (${item.percentage}%)`;
                            }
                            return label;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          iconType="circle"
                          formatter={(value) => {
                            const labels: Record<string, string> = {
                              cost: "Project Cost",
                              cumulative: "Cumulative Total",
                              average: "Average Line",
                            };
                            return <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{labels[value] || value}</span>;
                          }}
                        />
                        {/* Area for cumulative */}
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumulative"
                          fill={CHART_COLORS.secondary}
                          fillOpacity={0.15}
                          stroke={CHART_COLORS.secondary}
                          strokeWidth={2}
                        />
                        {/* Bars for individual costs */}
                        <Bar
                          yAxisId="left"
                          dataKey="cost"
                          fill={CHART_COLORS.primary}
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        />
                        {/* Line for average */}
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="average"
                          stroke={CHART_COLORS.line}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend Description */}
                <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chart Legend</p>
                  <div className="flex flex-wrap items-center justify-start gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
                      <span className="font-medium text-foreground">Project Cost</span>
                      <span className="text-muted-foreground">(left axis)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: CHART_COLORS.secondary, opacity: 0.6 }} />
                      <span className="font-medium text-foreground">Cumulative Total</span>
                      <span className="text-muted-foreground">(right axis)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <div className="h-0.5 w-3 rounded" style={{ backgroundColor: CHART_COLORS.line }} />
                        <div className="mx-0.5 h-0.5 w-1 rounded" style={{ backgroundColor: CHART_COLORS.line }} />
                        <div className="h-0.5 w-3 rounded" style={{ backgroundColor: CHART_COLORS.line }} />
                      </div>
                      <span className="font-medium text-foreground">Average Cost</span>
                      <span className="text-muted-foreground">(dashed line)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No project data available
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click &quot;Fetch &amp; Calculate&quot; to load data
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div>
            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-max text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                        onClick={() => handleSort(col.key)}
                      >
                        <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                          <span>{col.label}</span>
                          {sortKey === col.key && (
                            sortDir === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length > 0 ? (
                    filteredData.map((row, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-muted/50">
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 ${
                              col.align === "right" ? "text-right font-mono" : "text-left"
                            } ${col.key === "projectId" ? "font-mono text-xs text-muted-foreground" : "text-foreground"}`}
                          >
                            {row[col.key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        {data.length === 0
                          ? "No data available. Click \"Fetch & Calculate\" to load data."
                          : "No results found for your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {data.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {filteredData.length} of {data.length} projects
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
