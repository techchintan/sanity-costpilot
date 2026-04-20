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

// Generate colors for months
const MONTH_COLORS = [
  "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#a855f7",
];

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
  const [chartType, setChartType] = useState<"total" | "monthly">("monthly");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Prepare chart data from pivot rows - all projects with cumulative total
  const chartData = useMemo(() => {
    const processed = data
      .map((row) => {
        const total = parseFloat(String(row.total || "0").replace(/[^0-9.-]/g, ""));
        const projectName = row.projectName || row.projectId || "Unknown";
        return {
          name: projectName,
          fullName: projectName,
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

  // Extract month columns from data
  const monthColumns = useMemo(() => {
    const months: string[] = [];
    if (data.length > 0) {
      const sampleRow = data[0];
      for (const key of Object.keys(sampleRow)) {
        if (key !== "projectId" && key !== "projectName" && key !== "total") {
          months.push(key);
        }
      }
    }
    return months.sort();
  }, [data]);

  // Prepare monthly breakdown chart data - shows each project with stacked months
  const monthlyChartData = useMemo(() => {
    return data
      .map((row) => {
        const projectName = row.projectName || row.projectId || "Unknown";
        const monthData: Record<string, number | string> = {
          name: projectName,
          fullName: projectName,
        };
        
        let projectTotal = 0;
        for (const month of monthColumns) {
          const value = parseFloat(String(row[month] || "0").replace(/[^0-9.-]/g, ""));
          monthData[month] = isNaN(value) ? 0 : value;
          projectTotal += isNaN(value) ? 0 : value;
        }
        monthData.total = projectTotal;
        
        return monthData;
      })
      .filter((item) => (item.total as number) > 0)
      .sort((a, b) => (b.total as number) - (a.total as number));
  }, [data, monthColumns]);

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
                {/* Chart Type Toggle */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">View:</span>
                  <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
                    <button
                      onClick={() => setChartType("monthly")}
                      className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                        chartType === "monthly"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Monthly Breakdown
                    </button>
                    <button
                      onClick={() => setChartType("total")}
                      className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                        chartType === "total"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Total Cost
                    </button>
                  </div>
                </div>

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

                {/* Charts */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div style={{ width: "100%", height: 400, minHeight: 400 }}>
                    <ResponsiveContainer width="100%" height={400}>
                      {chartType === "monthly" ? (
                        /* Monthly Stacked Bar Chart */
                        <ComposedChart
                          data={monthlyChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="hsl(var(--border))" 
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            tickFormatter={formatCompact}
                            width={70}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const item = payload[0]?.payload;
                              if (!item) return null;
                              return (
                                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg max-w-xs">
                                  <p className="mb-2 text-xs font-semibold text-foreground">
                                    {item.fullName}
                                  </p>
                                  <div className="space-y-1 text-[11px] max-h-48 overflow-auto">
                                    {monthColumns.map((month, idx) => {
                                      const value = item[month] as number;
                                      if (!value || value === 0) return null;
                                      return (
                                        <div key={month} className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-1.5">
                                            <span 
                                              className="inline-block h-2 w-2 rounded-sm" 
                                              style={{ backgroundColor: MONTH_COLORS[idx % MONTH_COLORS.length] }}
                                            />
                                            <span className="text-muted-foreground">{month}:</span>
                                          </div>
                                          <span className="font-medium text-foreground">
                                            {formatCurrency(value)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex items-center justify-between gap-4 border-t border-border pt-1 mt-1">
                                      <span className="font-medium text-muted-foreground">Total:</span>
                                      <span className="font-bold text-foreground">
                                        {formatCurrency(item.total as number)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          {monthColumns.map((month, idx) => (
                            <Bar
                              key={month}
                              dataKey={month}
                              stackId="months"
                              fill={MONTH_COLORS[idx % MONTH_COLORS.length]}
                              radius={idx === monthColumns.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                          ))}
                        </ComposedChart>
                      ) : (
                        /* Total Cost Chart */
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="hsl(var(--border))" 
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
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
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const item = payload[0]?.payload;
                              if (!item) return null;
                              return (
                                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
                                  <p className="mb-1.5 text-xs font-semibold text-foreground">
                                    {item.fullName}
                                  </p>
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Cost:</span>
                                      <span className="font-medium" style={{ color: CHART_COLORS.primary }}>
                                        {formatCurrency(item.cost)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Cumulative:</span>
                                      <span className="font-medium" style={{ color: CHART_COLORS.secondary }}>
                                        {formatCurrency(item.cumulative)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Share:</span>
                                      <span className="font-medium text-foreground">{item.percentage}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="cumulative"
                            fill={CHART_COLORS.secondary}
                            fillOpacity={0.15}
                            stroke={CHART_COLORS.secondary}
                            strokeWidth={2}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="cost"
                            fill={CHART_COLORS.primary}
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                          />
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
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4">
                  {chartType === "monthly" ? (
                    /* Monthly Legend */
                    monthColumns.map((month, idx) => (
                      <div key={month} className="flex items-center gap-1.5">
                        <span 
                          className="inline-block h-3 w-3 rounded-sm" 
                          style={{ backgroundColor: MONTH_COLORS[idx % MONTH_COLORS.length] }} 
                        />
                        <span className="text-xs text-muted-foreground">{month}</span>
                      </div>
                    ))
                  ) : (
                    /* Total Cost Legend */
                    <>
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-block h-3 w-3 rounded-sm" 
                          style={{ backgroundColor: CHART_COLORS.primary }} 
                        />
                        <span className="text-sm text-muted-foreground">Project Cost</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-block h-3 w-3 rounded-sm" 
                          style={{ backgroundColor: CHART_COLORS.secondary, opacity: 0.5 }} 
                        />
                        <span className="text-sm text-muted-foreground">Cumulative Total</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-block h-0.5 w-5 rounded-full" 
                          style={{ 
                            backgroundColor: CHART_COLORS.line,
                            backgroundImage: `repeating-linear-gradient(90deg, ${CHART_COLORS.line} 0, ${CHART_COLORS.line} 3px, transparent 3px, transparent 6px)`
                          }} 
                        />
                        <span className="text-sm text-muted-foreground">Average Cost</span>
                      </div>
                    </>
                  )}
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
