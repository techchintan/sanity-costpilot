"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, TrendingUp, Layers, FileText } from "lucide-react";

interface SummaryRow {
  projectId: string;
  projectName: string;
  month: string;
  total: number;
}

interface ProjectCostChartProps {
  summaryRows: SummaryRow[];
  invoiceCount: number;
  projectCount: number;
  totalCost: number;
  loading?: boolean;
}

const COLORS = [
  "#0ea5e9", // sky-500
  "#06b6d4", // cyan-500
  "#14b8a6", // teal-500
  "#10b981", // emerald-500
  "#22c55e", // green-500
  "#84cc16", // lime-500
  "#eab308", // yellow-500
  "#f97316", // orange-500
];

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return "$0.00";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number; percent?: number } }>;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-primary">{formatCurrency(data.value)}</p>
        {data.percent !== undefined && (
          <p className="text-xs text-muted-foreground">
            {(data.percent * 100).toFixed(1)}% of total
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function ProjectCostChart({
  summaryRows,
  invoiceCount,
  projectCount,
  totalCost,
  loading = false,
}: ProjectCostChartProps) {
  // Calculate project totals for pie chart
  const projectData = useMemo(() => {
    const projectTotals: Record<string, { name: string; value: number }> = {};
    
    for (const row of summaryRows) {
      const name = row.projectName || row.projectId;
      const value = typeof row.total === "number" && !isNaN(row.total) ? row.total : 0;
      
      if (!projectTotals[name]) {
        projectTotals[name] = { name, value: 0 };
      }
      projectTotals[name].value += value;
    }

    const sorted = Object.values(projectTotals)
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);

    // Take top 7 and group rest as "Others"
    if (sorted.length > 7) {
      const top7 = sorted.slice(0, 7);
      const othersValue = sorted.slice(7).reduce((sum, p) => sum + p.value, 0);
      return [...top7, { name: "Others", value: othersValue }];
    }

    return sorted;
  }, [summaryRows]);

  // Calculate monthly totals for bar chart
  const monthlyData = useMemo(() => {
    const monthTotals: Record<string, number> = {};
    
    for (const row of summaryRows) {
      const value = typeof row.total === "number" && !isNaN(row.total) ? row.total : 0;
      monthTotals[row.month] = (monthTotals[row.month] || 0) + value;
    }

    return Object.entries(monthTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([name, value]) => ({
        name: name.slice(5), // Show only MM part from YYYY-MM
        value: isNaN(value) ? 0 : value,
      }));
  }, [summaryRows]);

  // Add percent to project data for tooltip
  const projectDataWithPercent = useMemo(() => {
    const total = projectData.reduce((sum, p) => sum + p.value, 0);
    return projectData.map((p) => ({
      ...p,
      percent: total > 0 ? p.value / total : 0,
    }));
  }, [projectData]);

  const hasData = projectData.length > 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header with Stats */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Project Cost Breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cost distribution across projects and monthly trends
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalCost)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2">
            <Layers className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Projects</p>
              <p className="text-sm font-semibold text-foreground">
                {projectCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Invoices</p>
              <p className="text-sm font-semibold text-foreground">
                {invoiceCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
          <div className="text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No cost data available
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Fetch &amp; Calculate&quot; to load project data
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donut Chart - Project Distribution */}
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Cost by Project
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectDataWithPercent}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectDataWithPercent.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">
                        {value.length > 12 ? `${value.slice(0, 12)}...` : value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart - Monthly Trend */}
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Monthly Cost Trend
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) =>
                      value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium text-foreground">
                              Month {payload[0].payload.name}
                            </p>
                            <p className="text-sm text-primary">
                              {formatCurrency(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((_, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={
                          index === monthlyData.length - 1
                            ? "hsl(var(--primary))"
                            : "hsl(var(--primary) / 0.5)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
