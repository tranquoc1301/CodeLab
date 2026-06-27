import { Code2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/utils";

import type { ProblemFormValues } from "../schema";
import { LANGUAGE_LABELS, type LanguageValue } from "../constants";

interface ProblemDriversSectionProps {
  form: UseFormReturn<ProblemFormValues>;
  fields: { id: string; language: string; driver_code: string }[];
  filledCount: number;
  totalCount: number;
}

export function ProblemDriversSection({
  form,
  fields,
  filledCount,
  totalCount,
}: ProblemDriversSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code2 className="h-5 w-5" />
          Problem Drivers
          {fields.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filledCount}/{totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Execution drivers used by the judge. Each language has a prefix (imports/setup) and a driver (test harness/main).
        </p>

        {fields.map((field, index) => {
          const error = form.formState.errors.problem_drivers?.[index];
          const lang = field.language as LanguageValue;
          const hasDriver = !!field.driver_code;
          return (
            <div key={field.id} className="relative rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={hasDriver ? "default" : "secondary"}>
                    {LANGUAGE_LABELS[lang] ?? lang}
                  </Badge>
                  {!hasDriver && (
                    <span className="text-xs text-muted-foreground">Empty</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prefix code (imports / setup)</Label>
                <Textarea
                  placeholder={`Paste ${LANGUAGE_LABELS[lang] ?? lang} prefix code here...`}
                  rows={4}
                  className={cn(
                    "font-mono text-sm",
                    error?.prefix_code && "border-destructive",
                  )}
                  {...form.register(`problem_drivers.${index}.prefix_code`)}
                />
                {error?.prefix_code && (
                  <p className="text-xs text-destructive">{error.prefix_code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Driver code (test harness / main)</Label>
                <Textarea
                  placeholder={`Paste ${LANGUAGE_LABELS[lang] ?? lang} driver code here...`}
                  rows={8}
                  className={cn(
                    "font-mono text-sm",
                    error?.driver_code && "border-destructive",
                  )}
                  {...form.register(`problem_drivers.${index}.driver_code`)}
                />
                {error?.driver_code && (
                  <p className="text-xs text-destructive">{error.driver_code.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
