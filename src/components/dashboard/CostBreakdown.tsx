"use client";

import { useMemo } from "react";
import {
  DollarSign,
  FileText,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface CostBreakdownProps {
  invoiceCount: number;
  totalCost: number;
  projectCount: number;
  detailRowsCount: number;
  summaryRows: Array<{
    projectId: string;
    projectName?: string;
    month: string;
    total: number;
  }>;
  loading?: boolean;
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];

export function CostBreakdown({
  invoiceCount,
  totalCost,
  projectCount,
  summaryRows,
  loading = false,
}: CostBreakdownProps) {
  // Calculate cost breakdown by project (top 6)
  const projectBreakdown = useMemo(() => {
    const projectTotals: Record<string, { name: string; total: number }> = {};
    for (const row of summaryRows) {
      const id = row.projectId;
      const name = row.projectName || row.projectId;
      const value = typeof row.total === "number" && !isNaN(row.total) ? row.total : 0;
      if (!projectTotals[id]) {
        projectTotals[id] = { name, total: 0 };
      }
      projectTotals[id].total += value;
    }

    const sorted = Object.values(projectTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return sorted.map((p, i) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + "..." : p.name,
      value: isNaN(p.total) ? 0 : p.total,
      color: COLORS[i % COLORS.length],
    }));
  }, [summaryRows]);

  // Calculate monthly trend
  const monthlyTrend = useMemo(() => {
    const monthTotals: Record<string, number> = {};
    for (const row of summaryRows) {
      const value = typeof row.total === "number" && !isNaN(row.total) ? row.total : 0;
      monthTotals[row.month] = (monthTotals[row.month] || 0) + value;
    }

    const months = Object.keys(monthTotals).sort();
    if (months.length < 2) return { trend: "neutral" as const, percentage: 0 };

    const current = monthTotals[months[months.length - 1]] || 0;
    const previous = monthTotals[months[months.length - 2]] || 0;

    if (previous === 0) return { trend: "neutral" as const, percentage: 0 };

    const change = ((current - previous) / previous) * 100;
    return {
      trend: change >= 0 ? ("up" as const) : ("down" as const),
      percentage: Math.abs(change),
    };
  }, [summaryRows]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) return "$0.00";
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-primary">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
    if (!payload) return null;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-12 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-64 w-64 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const hasChartData = projectBreakdown.length > 0 && projectBreakdown.some(p => p.value > 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Total Cost Section */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Total Cost</h3>
          </div>

          <div className="mb-6">
            <p className="text-4xl font-bold text-foreground tracking-tight">
              {formatCurrency(totalCost)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {monthlyTrend.trend === "up" ? (
                <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-medium text-destructive">
                  <ArrowUpRight className="h-4 w-4" />
                  {monthlyTrend.percentage.toFixed(1)}%
                </span>
              ) : monthlyTrend.trend === "down" ? (
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-sm font-medium text-accent">
                  <ArrowDownRight className="h-4 w-4" />
                  {monthlyTrend.percentage.toFixed(1)}%
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-sm text-muted-foreground">
                  No trend data
                </span>
              )}
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{invoiceCount}</p>
                <p className="text-sm text-muted-foreground">Invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <FolderKanban className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{projectCount}</p>
                <p className="text-sm text-muted-foreground">Projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Chart Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Project Cost Breakdown</h3>
          </div>

          {hasChartData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {projectBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FolderKanban className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No project data available</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click &quot;Fetch &amp; Calculate&quot; to load data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
