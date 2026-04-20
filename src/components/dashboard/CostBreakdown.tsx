"use client";

import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  FolderKanban,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

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

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  trend: "up" | "down" | "neutral";
  trendValue: number;
}

export function CostBreakdown({
  invoiceCount,
  totalCost,
  projectCount,
  detailRowsCount,
  summaryRows,
  loading = false,
}: CostBreakdownProps) {
  // Calculate cost breakdown by project (top 5)
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
      .slice(0, 5);
    
    const total = sorted.reduce((acc, p) => acc + p.total, 0);
    const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    
    return sorted.map((p, i) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name,
      value: p.total,
      percentage: total > 0 ? (p.total / total) * 100 : 0,
      color: colors[i % colors.length],
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Skeleton loader */}
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-12 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Total Cost Section */}
        <div className="lg:col-span-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Cost</h3>
          </div>
          
          <div className="mb-4">
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(totalCost)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {monthlyTrend.trend === "up" ? (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <ArrowUpRight className="h-4 w-4" />
                  {monthlyTrend.percentage.toFixed(1)}%
                </span>
              ) : monthlyTrend.trend === "down" ? (
                <span className="flex items-center gap-1 text-sm text-accent">
                  <ArrowDownRight className="h-4 w-4" />
                  {monthlyTrend.percentage.toFixed(1)}%
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">No trend data</span>
              )}
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold text-foreground">{invoiceCount}</p>
                <p className="text-xs text-muted-foreground">Invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold text-foreground">{projectCount}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Distribution Section */}
        <div className="lg:col-span-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Layers className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Top Projects</h3>
            </div>
          </div>

          {projectBreakdown.length > 0 ? (
            <div className="space-y-3">
              {projectBreakdown.map((project, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium truncate max-w-[140px]">
                      {project.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(project.value)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${project.percentage}%`,
                        backgroundColor: project.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">No project data</p>
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="lg:col-span-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <TrendingUp className="h-4 w-4 text-secondary-foreground" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Key Metrics</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Avg Cost/Project</p>
              <p className="text-lg font-semibold text-foreground">
                {projectCount > 0 ? formatCurrency(totalCost / projectCount) : "$0.00"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Detail Rows</p>
              <p className="text-lg font-semibold text-foreground">
                {detailRowsCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Avg/Invoice</p>
              <p className="text-lg font-semibold text-foreground">
                {invoiceCount > 0 ? formatCurrency(totalCost / invoiceCount) : "$0.00"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Data Points</p>
              <p className="text-lg font-semibold text-foreground">
                {summaryRows.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
