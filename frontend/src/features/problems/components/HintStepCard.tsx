import type { HintResponse } from "@/shared/types";
import { HINT_STAGE_LABELS } from "@/shared/config/error-labels";

interface HintStepCardProps {
  hint: HintResponse;
  index: number;
}

export function HintStepCard({ hint, index }: HintStepCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">
            {HINT_STAGE_LABELS[hint.stage] ?? hint.stage}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Mức {index + 1}/3
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {hint.cards.map((card) => (
          <div
            key={`${hint.stage}-${card.label}`}
            className="rounded-lg border border-border/50 bg-background p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {card.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
