import { getErrorLabelConfig, getErrorDetailLabel } from "@/shared/config/error-labels";

interface ErrorLabelBadgeProps {
  label: string;
  detail?: string | null;
}

export function ErrorLabelBadge({ label, detail }: ErrorLabelBadgeProps) {
  const config = getErrorLabelConfig(label);
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border ${config.borderColor} ${config.bgColor} px-3 py-1.5`}>
      <Icon className={`h-4 w-4 shrink-0 ${config.color}`} aria-hidden />
      <span className={`text-sm font-semibold ${config.color}`}>
        {config.label}
      </span>
      {detail && (
        <>
          <span className={`${config.color} opacity-50`}>·</span>
          <span className={`text-sm ${config.color} opacity-80`}>
            {getErrorDetailLabel(detail)}
          </span>
        </>
      )}
    </div>
  );
}
