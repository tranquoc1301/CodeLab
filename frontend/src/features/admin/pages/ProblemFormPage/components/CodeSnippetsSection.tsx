import { Code2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/utils";

import type { ProblemFormValues } from "../schema";
import { LANGUAGE_LABELS, type LanguageValue } from "../constants";

interface CodeSnippetsSectionProps {
  form: UseFormReturn<ProblemFormValues>;
  fields: { id: string; language: string; code: string }[];
  filledCount: number;
  totalCount: number;
}

export function CodeSnippetsSection({
  form,
  fields,
  filledCount,
  totalCount,
}: CodeSnippetsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code2 className="h-5 w-5" />
          Starter Code
          {fields.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filledCount}/{totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Starter code shown to users when they open the problem. One snippet per language.
        </p>

        {fields.map((field, index) => {
          const error = form.formState.errors.code_snippets?.[index];
          const lang = field.language as LanguageValue;
          const hasCode = !!field.code;
          return (
            <div key={field.id} className="relative rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={hasCode ? "default" : "secondary"}>
                    {LANGUAGE_LABELS[lang] ?? lang}
                  </Badge>
                  {!hasCode && (
                    <span className="text-xs text-muted-foreground">Empty</span>
                  )}
                </div>
              </div>
              <Textarea
                placeholder={`Paste ${LANGUAGE_LABELS[lang] ?? lang} starter code here...`}
                rows={8}
                className={cn(
                  "font-mono text-sm",
                  error?.code && "border-destructive",
                )}
                {...form.register(`code_snippets.${index}.code`)}
              />
              {error?.code && (
                <p className="text-xs text-destructive">{error.code.message}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
