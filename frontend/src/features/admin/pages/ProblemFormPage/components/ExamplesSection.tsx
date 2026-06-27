import { FileText, Plus, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/utils";

import type { ProblemFormValues } from "../schema";

interface ExamplesSectionProps {
  form: UseFormReturn<ProblemFormValues>;
  fields: { id: string }[];
  append: (value: { example_text: string; images: string[] }) => void;
  remove: (index: number) => void;
}

export function ExamplesSection({ form, fields, append, remove }: ExamplesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Examples
            {fields.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {fields.length}
              </Badge>
            )}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ example_text: "", images: [] })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No examples yet. Click &quot;Add&quot; to add one.
          </p>
        )}
        {fields.map((field, index) => {
          const error = form.formState.errors.examples?.[index];
          return (
            <div key={field.id} className="relative rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Example {index + 1}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder={"Input: nums = [2,7,11,15], target = 9\\nOutput: [0,1]\\nExplanation: ..."}
                rows={4}
                className={cn(error?.example_text && "border-destructive")}
                {...form.register(`examples.${index}.example_text`)}
              />
              {error?.example_text && (
                <p className="text-xs text-destructive">{error.example_text.message}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
