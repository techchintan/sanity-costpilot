"use client";

import { Terminal, Trash2 } from "lucide-react";

interface LogsPanelProps {
  logs: string[];
  onClear?: () => void;
}

export function LogsPanel({ logs, onClear }: LogsPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Activity Logs</h3>
        </div>
        {onClear && logs.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      <div className="max-h-48 overflow-auto p-4">
        {logs.length > 0 ? (
          <pre className="font-mono text-xs leading-relaxed text-muted-foreground">
            {logs.map((log, idx) => (
              <div key={idx} className="py-0.5 hover:text-foreground">
                {log}
              </div>
            ))}
          </pre>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            No activity yet. Actions will be logged here.
          </p>
        )}
      </div>
    </div>
  );
}
