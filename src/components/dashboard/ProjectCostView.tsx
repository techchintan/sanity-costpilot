"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

const CHART_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

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

  // Prepare chart data from pivot rows
  const chartData = useMemo(() => {
    return data
      .map((row) => {
        const total = parseFloat(String(row.total || "0").replace(/[^0-9.-]/g, ""));
        return {
          name: row.projectName || row.projectId || "Unknown",
          value: isNaN(total) ? 0 : total,
          projectId: row.projectId,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  // Calculate total for percentage
  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  // Pie chart data with percentages
  const pieData = useMemo(() => {
    const top7 = chartData.slice(0, 7);
    const othersValue = chartData.slice(7).reduce((sum, item) => sum + item.value, 0);
    
    const result = top7.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0",
    }));

    if (othersValue > 0) {
      result.push({
        name: "Others",
        value: othersValue,
        projectId: "others",
        percentage: totalValue > 0 ? ((othersValue / totalValue) * 100).toFixed(1) : "0",
      });
    }

    return result;
  }, [chartData, totalValue]);

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
        <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
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
            Detailed cost analysis by project
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
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Bar Chart */}
                <div>
                  <h4 className="mb-4 text-sm font-medium text-muted-foreground">
                    Top Projects by Cost
                  </h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          width={120}
                          tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                          formatter={(value: number) => [formatCurrency(value), "Cost"]}
                        />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div>
                  <h4 className="mb-4 text-sm font-medium text-muted-foreground">
                    Cost Distribution
                  </h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percentage }) =>
                            `${name.length > 10 ? `${name.slice(0, 10)}...` : name} (${percentage}%)`
                          }
                          labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Cost"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
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
