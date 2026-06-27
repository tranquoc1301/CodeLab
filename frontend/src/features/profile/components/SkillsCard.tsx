import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { SkillStat } from "@/shared/types";

export function SkillsCard({ skills }: { skills: SkillStat[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Skills</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-sm"
              >
                {skill.slug}
                <span className="text-xs tabular-nums text-muted-foreground">
                  ×{skill.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
