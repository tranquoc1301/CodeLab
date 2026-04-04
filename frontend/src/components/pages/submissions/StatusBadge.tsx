import { memo } from "react";
import { getStatusConfig } from "@/config/status";
import { cn } from "@/lib/utils";
import { COPY } from "@/config";

interface StatusBadgeProps {
  status: string | null;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const iconConfig = getStatusConfig(status);
  const Icon = iconConfig.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        iconConfig.class,
      )}
    >
      <Icon className="h-3 w-3" />
      {status || COPY.PROBLEM.UNKNOWN_STATUS}
    </span>
  );
});
