"use client";

import { RefreshCw, AlertCircle } from "lucide-react";

interface ControlPanelProps {
  loading: boolean;
  error: string;
  onFetch: () => void;
}

export function ControlPanel({ loading, error, onFetch }: ControlPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Control Panel</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetch invoice data and calculate cost analytics
        </p>
      </div>

      <button
        onClick={onFetch}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-70"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Processing..." : "Fetch & Calculate"}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
