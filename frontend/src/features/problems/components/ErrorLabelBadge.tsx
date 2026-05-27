import { AlertCircle } from "lucide-react";

interface ErrorLabelBadgeProps {
  label: string;
  detail?: string | null;
}

const LABEL_DISPLAY: Record<string, string> = {
  logic_calculation_error: "Logic & Calculation",
  complexity_error: "Complexity & TLE",
  memory_reference_error: "Memory & Reference",
  recursion_error: "Recursion",
  algorithm_design_error: "Algorithm Design",
  boundary_condition_error: "Boundary & Edge Case",
};

export function ErrorLabelBadge({ label, detail }: ErrorLabelBadgeProps) {
  const displayName = LABEL_DISPLAY[label] ?? label;

  return (
    <div className="flex items-center gap-2 text-sm">
      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        {displayName}
      </span>
      {detail && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground/70">
            {detail}
          </span>
        </>
      )}
    </div>
  );
}
