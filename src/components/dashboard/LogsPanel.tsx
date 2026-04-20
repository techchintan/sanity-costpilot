"use client";

import { Terminal, Trash2 } from "lucide-react";

interface LogsPanelProps {
  logs: string[];
  onClear?: () => void;
}

export function LogsPanel({ logs, onClear }: LogsPanelProps) {
  if (logs.length === 0) return null;

  return (
    <div className="flex items-start gap-3">
      <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Activity</span>
          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
        <pre className="mt-1 max-h-32 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
          {logs.map((log, idx) => (
            <div key={idx} className="py-0.5 hover:text-foreground">
              {log}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
