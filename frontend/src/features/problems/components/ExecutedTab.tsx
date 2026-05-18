import type { VerdictResult } from "@/shared/types";

interface ExecutedTabProps {
  verdict: VerdictResult | null;
  isAccepted: boolean;
}

export function ExecutedTab({ verdict, isAccepted }: ExecutedTabProps) {
  if (!verdict) {
    return (
      <p className="text-sm text-muted-foreground">No execution data yet</p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground/80">Execution Details</h4>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-muted/50 rounded-lg border border-border/60">
          <span className="text-muted-foreground block">Status</span>
          <span className={`font-medium ${isAccepted ? "text-success" : "text-destructive"}`}>
            {verdict.status}
          </span>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg border border-border/60">
          <span className="text-muted-foreground block">Runtime</span>
          <span className="font-medium text-foreground">
            {verdict.runtime_ms ?? "N/A"}ms
          </span>
        </div>
      </div>

      {verdict.stdout && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Stdout</span>
          <pre className="p-3 bg-muted/50 rounded-lg border border-border/60 text-xs font-mono text-foreground/80 whitespace-pre-wrap overflow-auto">
            {verdict.stdout}
          </pre>
        </div>
      )}

      {verdict.stderr && (
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Stderr</span>
          <pre className="p-3 bg-destructive/10 rounded-lg border border-destructive/50 text-xs font-mono text-destructive whitespace-pre-wrap overflow-auto">
            {verdict.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}
