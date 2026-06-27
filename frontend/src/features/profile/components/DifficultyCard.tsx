import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { DifficultyStats, ProfileStatsResponse } from "@/shared/types";

const COLORS = {
  easy: "hsl(142, 71%, 45%)",
  medium: "hsl(38, 92%, 50%)",
  hard: "hsl(0, 84%, 60%)",
} as const;

function Donut({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? solved / total : 0;
  return (
    <div
      className="h-24 w-24 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${pct * 360}deg, hsl(var(--muted)) 0deg)`,
        maskImage: "radial-gradient(transparent 55%, black 57%)",
        WebkitMaskImage: "radial-gradient(transparent 55%, black 57%)",
      }}
    />
  );
}

function DiffRow({
  label,
  stats,
  color,
}: {
  label: string;
  stats: DifficultyStats;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="tabular-nums text-foreground">
        {stats.solved}/{stats.total}
      </span>
    </div>
  );
}

export function DifficultyCard({ data }: { data: ProfileStatsResponse }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Solved</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5 pt-0">
        <div className="relative flex shrink-0 items-center justify-center">
          <Donut solved={data.total_solved} total={data.total_problems} />
          <div className="absolute flex flex-col items-center leading-none">
            <span className="text-xl font-semibold tabular-nums">{data.total_solved}</span>
            <span className="text-xs text-muted-foreground">/{data.total_problems}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <DiffRow label="Easy" stats={data.easy} color={COLORS.easy} />
          <DiffRow label="Med." stats={data.medium} color={COLORS.medium} />
          <DiffRow label="Hard" stats={data.hard} color={COLORS.hard} />
        </div>
      </CardContent>
    </Card>
  );
}
