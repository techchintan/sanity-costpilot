"use client";

import { RefreshCw, AlertCircle } from "lucide-react";

interface ControlPanelProps {
  loading: boolean;
  error: string;
  onFetch: () => void;
}

export function ControlPanel({ loading, error, onFetch }: ControlPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        onClick={onFetch}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-70"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Processing..." : "Fetch & Calculate"}
      </button>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
